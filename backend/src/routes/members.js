const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/', (req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY role DESC, name').all();
  res.json(members);
});

router.post('/', (req, res) => {
  const { name, role = 'child', avatar = '👤' } = req.body;
  if (!name) return res.status(400).json({ error: '姓名不能为空' });
  const result = db.prepare(
    'INSERT INTO members (name, role, avatar) VALUES (?, ?, ?)'
  ).run(name, role, avatar);
  res.status(201).json(db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, role, avatar } = req.body;
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: '成员不存在' });
  db.prepare('UPDATE members SET name=?, role=?, avatar=? WHERE id=?').run(
    name ?? member.name,
    role ?? member.role,
    avatar ?? member.avatar,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '成员不存在' });
  res.json({ success: true });
});

module.exports = router;
