const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/', (req, res) => {
  const rewards = db.prepare('SELECT * FROM rewards ORDER BY points_cost ASC').all();
  res.json(rewards);
});

router.post('/', (req, res) => {
  const { title, description, points_cost, icon = '🎁', created_by } = req.body;
  if (!title || !points_cost) return res.status(400).json({ error: '标题和积分不能为空' });
  const result = db.prepare(
    'INSERT INTO rewards (title, description, points_cost, icon, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description, points_cost, icon, created_by);
  res.status(201).json(db.prepare('SELECT * FROM rewards WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(req.params.id);
  if (!reward) return res.status(404).json({ error: '奖励不存在' });
  const { title, description, points_cost, icon } = req.body;
  const orNull = v => (v === '' || v == null) ? null : v;
  db.prepare(
    'UPDATE rewards SET title=?, description=?, points_cost=?, icon=? WHERE id=?'
  ).run(
    title ?? reward.title,
    orNull(description) ?? reward.description,
    points_cost ?? reward.points_cost,
    icon ?? reward.icon,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM rewards WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM rewards WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '奖励不存在' });
  res.json({ success: true });
});

router.get('/claims', (req, res) => {
  const claims = db.prepare(`
    SELECT rc.*, r.title as reward_title, r.icon as reward_icon, r.points_cost,
           m.name as member_name, m.avatar as member_avatar
    FROM reward_claims rc
    JOIN rewards r ON rc.reward_id = r.id
    JOIN members m ON rc.member_id = m.id
    ORDER BY rc.claimed_at DESC
  `).all();
  res.json(claims);
});

router.post('/:id/claim', (req, res) => {
  const { member_id } = req.body;
  if (!member_id) return res.status(400).json({ error: '需要指定成员' });

  const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(req.params.id);
  if (!reward) return res.status(404).json({ error: '奖励不存在' });

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
  if (!member) return res.status(404).json({ error: '成员不存在' });
  if (member.points < reward.points_cost) {
    return res.status(400).json({ error: `积分不足，需要 ${reward.points_cost} 分，当前 ${member.points} 分` });
  }

  const result = db.prepare(
    'INSERT INTO reward_claims (reward_id, member_id) VALUES (?, ?)'
  ).run(req.params.id, member_id);

  res.status(201).json({ id: result.lastInsertRowid, status: 'pending' });
});

router.post('/claims/:id/approve', (req, res) => {
  const claim = db.prepare('SELECT * FROM reward_claims WHERE id = ?').get(req.params.id);
  if (!claim) return res.status(404).json({ error: '兑换记录不存在' });
  if (claim.status !== 'pending') return res.status(400).json({ error: '已审批过' });

  const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(claim.reward_id);

  db.exec('BEGIN');
  try {
    db.prepare("UPDATE reward_claims SET status='approved' WHERE id=?").run(req.params.id);
    db.prepare('UPDATE members SET points = points - ? WHERE id = ?').run(reward.points_cost, claim.member_id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  res.json({ success: true });
});

module.exports = router;
