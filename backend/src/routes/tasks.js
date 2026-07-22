const express = require('express');
const db = require('../db/database');
const router = express.Router();

const taskWithMember = `
  SELECT t.*,
    m1.name as assigned_name, m1.avatar as assigned_avatar, m1.role as assigned_role,
    m2.name as creator_name, m2.avatar as creator_avatar
  FROM tasks t
  LEFT JOIN members m1 ON t.assigned_to = m1.id
  LEFT JOIN members m2 ON t.created_by = m2.id
`;

// 根据循环规则和当前 due_date 计算下一个 due_date
function nextDueDate(task) {
  if (!task.due_date || task.recurrence === 'none') return null;

  const base = new Date(task.due_date);
  const inc = d => { const r = new Date(d); r.setDate(r.getDate() + 1); return r; };
  const fmt = d => d.toISOString().split('T')[0];

  if (task.recurrence === 'daily') {
    return fmt(inc(base));
  }

  if (task.recurrence === 'weekly') {
    const next = new Date(base);
    next.setDate(next.getDate() + 7);
    return fmt(next);
  }

  if (task.recurrence === 'weekdays') {
    // 下一个工作日（跳过周六/周日）
    let next = inc(base);
    while (next.getDay() === 0 || next.getDay() === 6) next = inc(next);
    return fmt(next);
  }

  if (task.recurrence === 'custom' && task.recurrence_days) {
    const days = JSON.parse(task.recurrence_days); // [0-6] 周日=0
    if (!days.length) return null;
    let next = inc(base);
    for (let i = 0; i < 7; i++) {
      if (days.includes(next.getDay())) return fmt(next);
      next = inc(next);
    }
    return null;
  }

  return null;
}

router.get('/', (req, res) => {
  const { assigned_to, status, date } = req.query;
  let query = taskWithMember;
  const params = [];
  const conditions = [];

  if (assigned_to) { conditions.push('t.assigned_to = ?'); params.push(assigned_to); }
  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (date) { conditions.push('t.due_date = ?'); params.push(date); }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY t.due_date ASC, t.priority DESC';

  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const b = req.body;
  const title = b.title;
  const description = b.description ?? null;
  const due_date = b.due_date ?? null;
  const priority = b.priority ?? 'medium';
  const assigned_to = b.assigned_to ?? null;
  const created_by = b.created_by ?? null;
  const points_value = b.points_value ?? 10;
  const recurrence = b.recurrence ?? 'none';
  const recurrence_days = b.recurrence_days ?? null;
  const recurrence_end_date = b.recurrence_end_date ?? null;

  if (!title) return res.status(400).json({ error: '任务名称不能为空' });

  const result = db.prepare(
    `INSERT INTO tasks
      (title, description, due_date, priority, assigned_to, created_by, points_value,
       recurrence, recurrence_days, recurrence_end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(title, description, due_date, priority, assigned_to, created_by, points_value,
        recurrence, recurrence_days, recurrence_end_date);

  res.status(201).json(db.prepare(taskWithMember + ' WHERE t.id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  const b2 = req.body;
  const toNull = v => (v === undefined ? null : v);
  db.prepare(
    `UPDATE tasks SET title=?, description=?, due_date=?, priority=?, assigned_to=?,
     points_value=?, recurrence=?, recurrence_days=?, recurrence_end_date=? WHERE id=?`
  ).run(
    b2.title ?? task.title,
    toNull(b2.description) ?? task.description,
    toNull(b2.due_date) ?? task.due_date,
    b2.priority ?? task.priority,
    toNull(b2.assigned_to) ?? task.assigned_to,
    b2.points_value ?? task.points_value,
    b2.recurrence ?? task.recurrence,
    toNull(b2.recurrence_days) ?? task.recurrence_days,
    toNull(b2.recurrence_end_date) ?? task.recurrence_end_date,
    req.params.id
  );
  res.json(db.prepare(taskWithMember + ' WHERE t.id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '任务不存在' });
  res.json({ success: true });
});

router.post('/:id/complete', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  if (task.status !== 'pending') return res.status(400).json({ error: '只有待完成的任务可以标记完成' });
  db.prepare("UPDATE tasks SET status='done' WHERE id=?").run(req.params.id);
  res.json(db.prepare(taskWithMember + ' WHERE t.id = ?').get(req.params.id));
});

router.post('/:id/approve', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  if (task.status !== 'done') return res.status(400).json({ error: '只有已完成的任务可以审批' });

  let nextTask = null;

  db.exec('BEGIN');
  try {
    db.prepare("UPDATE tasks SET status='approved' WHERE id=?").run(req.params.id);
    if (task.assigned_to) {
      db.prepare('UPDATE members SET points = points + ? WHERE id = ?').run(task.points_value, task.assigned_to);
    }

    // 循环任务：自动生成下一条
    if (task.recurrence && task.recurrence !== 'none') {
      const next = nextDueDate(task);
      const withinEnd = !task.recurrence_end_date || (next && next <= task.recurrence_end_date);
      if (next && withinEnd) {
        const result = db.prepare(
          `INSERT INTO tasks
            (title, description, due_date, priority, assigned_to, created_by, points_value,
             recurrence, recurrence_days, recurrence_end_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          task.title, task.description, next, task.priority,
          task.assigned_to, task.created_by, task.points_value,
          task.recurrence, task.recurrence_days, task.recurrence_end_date
        );
        nextTask = result.lastInsertRowid;
      }
    }

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  res.json({
    task: db.prepare(taskWithMember + ' WHERE t.id = ?').get(req.params.id),
    nextTask: nextTask ? db.prepare(taskWithMember + ' WHERE t.id = ?').get(nextTask) : null,
  });
});

module.exports = router;
