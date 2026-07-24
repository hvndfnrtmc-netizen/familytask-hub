const express = require('express');
const db = require('../db/database');
const router = express.Router();

const eventWithMember = `
  SELECT e.*, m.name as member_name, m.avatar as member_avatar
  FROM calendar_events e
  LEFT JOIN members m ON e.member_id = m.id
`;

// 把一条循环日程展开为指定月份内命中的日期实例
function expandRecurring(ev, monthStr) {
  const [y, mo] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const pad = n => String(n).padStart(2, '0');
  const results = [];

  const start = new Date(ev.date);
  const end   = ev.recurrence_end_date ? new Date(ev.recurrence_end_date) : null;
  const days  = ev.recurrence_days ? JSON.parse(ev.recurrence_days) : [];

  for (let d = 1; d <= daysInMonth; d++) {
    const cur = new Date(`${monthStr}-${pad(d)}`);
    const curStr = `${monthStr}-${pad(d)}`;

    if (cur < start) continue;
    if (end && cur > end) continue;

    let hit = false;
    if (ev.recurrence === 'daily') {
      hit = true;
    } else if (ev.recurrence === 'weekly') {
      const diffDays = Math.round((cur - start) / 86400000);
      hit = diffDays >= 0 && diffDays % 7 === 0;
    } else if (ev.recurrence === 'weekdays') {
      const dow = cur.getDay();
      hit = dow >= 1 && dow <= 5;
    } else if (ev.recurrence === 'custom') {
      hit = days.includes(cur.getDay());
    } else if (ev.recurrence === 'interval') {
      const interval = parseInt(ev.recurrence_days) || 2;
      const diffDays = Math.round((cur - start) / 86400000);
      hit = diffDays >= 0 && diffDays % interval === 0;
    }

    if (hit) {
      results.push({ ...ev, date: curStr, _recurring: true });
    }
  }
  return results;
}

router.get('/', (req, res) => {
  const { month } = req.query; // YYYY-MM
  const allEvents = db.prepare(eventWithMember + ' ORDER BY e.date ASC, e.created_at ASC').all();

  if (!month) return res.json(allEvents);

  const result = [];
  for (const ev of allEvents) {
    if (ev.recurrence && ev.recurrence !== 'none') {
      result.push(...expandRecurring(ev, month));
    } else if (ev.date.startsWith(month)) {
      result.push(ev);
    }
  }
  result.sort((a, b) => a.date.localeCompare(b.date));
  res.json(result);
});

router.post('/', (req, res) => {
  const { title, date, time, member_id, note, recurrence, recurrence_days, recurrence_end_date } = req.body;
  if (!title || !date) return res.status(400).json({ error: '标题和日期不能为空' });
  const orNull = v => (v === '' || v == null) ? null : v;
  const result = db.prepare(
    `INSERT INTO calendar_events (title, date, time, member_id, note, recurrence, recurrence_days, recurrence_end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    title,
    date,
    orNull(time) ?? '00:00',
    orNull(member_id),
    orNull(note),
    recurrence || 'none',
    orNull(recurrence_days),
    orNull(recurrence_end_date)
  );
  res.status(201).json(
    db.prepare(eventWithMember + ' WHERE e.id = ?').get(result.lastInsertRowid)
  );
});

router.put('/:id', (req, res) => {
  const ev = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id);
  if (!ev) return res.status(404).json({ error: '日程不存在' });
  const { title, date, time, member_id, note, recurrence, recurrence_days, recurrence_end_date } = req.body;
  const orNull = v => (v === '' || v == null) ? null : v;
  db.prepare(
    `UPDATE calendar_events SET title=?, date=?, time=?, member_id=?, note=?,
     recurrence=?, recurrence_days=?, recurrence_end_date=? WHERE id=?`
  ).run(
    title ?? ev.title,
    date ?? ev.date,
    orNull(time) ?? ev.time ?? '00:00',
    orNull(member_id) ?? ev.member_id,
    orNull(note) ?? ev.note,
    recurrence || ev.recurrence,
    orNull(recurrence_days) ?? ev.recurrence_days,
    orNull(recurrence_end_date) ?? ev.recurrence_end_date,
    req.params.id
  );
  res.json(db.prepare(eventWithMember + ' WHERE e.id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '日程不存在' });
  res.json({ success: true });
});

module.exports = router;
