const express = require('express');
const db = require('../db/database');
const router = express.Router();

const eventWithMember = `
  SELECT e.*, m.name as member_name, m.avatar as member_avatar
  FROM calendar_events e
  LEFT JOIN members m ON e.member_id = m.id
`;

router.get('/', (req, res) => {
  const { month } = req.query; // 格式 YYYY-MM
  let query = eventWithMember;
  const params = [];
  if (month) {
    query += ' WHERE e.date LIKE ?';
    params.push(`${month}%`);
  }
  query += ' ORDER BY e.date ASC, e.created_at ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { title, date, member_id, note } = req.body;
  if (!title || !date) return res.status(400).json({ error: '标题和日期不能为空' });
  const result = db.prepare(
    'INSERT INTO calendar_events (title, date, member_id, note) VALUES (?, ?, ?, ?)'
  ).run(title, date, member_id ?? null, note ?? null);
  res.status(201).json(
    db.prepare(eventWithMember + ' WHERE e.id = ?').get(result.lastInsertRowid)
  );
});

router.put('/:id', (req, res) => {
  const ev = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id);
  if (!ev) return res.status(404).json({ error: '日程不存在' });
  const { title, date, member_id, note } = req.body;
  db.prepare('UPDATE calendar_events SET title=?, date=?, member_id=?, note=? WHERE id=?').run(
    title ?? ev.title,
    date ?? ev.date,
    member_id !== undefined ? (member_id || null) : ev.member_id,
    note !== undefined ? (note || null) : ev.note,
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
