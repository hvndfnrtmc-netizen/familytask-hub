const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/familytask.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

function seed() {
  const row = db.prepare('SELECT COUNT(*) as n FROM members').get();
  if (row.n > 0) return;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const insertMember = db.prepare(
    'INSERT INTO members (name, role, avatar, points) VALUES (?, ?, ?, ?)'
  );
  const p1 = insertMember.run('爸爸', 'parent', '👨', 0).lastInsertRowid;
  const p2 = insertMember.run('妈妈', 'parent', '👩', 0).lastInsertRowid;
  const c1 = insertMember.run('好婆', 'child', '👦', 30).lastInsertRowid;
  const c2 = insertMember.run('Terry', 'child', '👧', 50).lastInsertRowid;

  const insertTask = db.prepare(
    `INSERT INTO tasks (title, description, due_date, priority, status, assigned_to, created_by, points_value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertTask.run('打扫客厅', '用吸尘器清洁地毯和沙发', today, 'medium', 'pending', c1, p1, 15);
  insertTask.run('洗碗', '饭后洗碗并擦干', today, 'high', 'done', c2, p2, 10);
  insertTask.run('倒垃圾', '把各房间垃圾袋送到门口', tomorrow, 'low', 'pending', c1, p1, 5);
  insertTask.run('整理书架', '按类别整理书籍', tomorrow, 'medium', 'approved', c2, p1, 20);
  insertTask.run('擦窗户', '清洁所有窗户玻璃', today, 'low', 'pending', c1, p2, 25);

  const insertReward = db.prepare(
    'INSERT INTO rewards (title, description, points_cost, icon, created_by) VALUES (?, ?, ?, ?, ?)'
  );
  insertReward.run('看一小时游戏', '可以玩一小时游戏', 30, '🎮', p1);
  insertReward.run('选择今天的晚餐', '自己选今晚吃什么', 20, '🍕', p2);
  insertReward.run('零花钱 5 元', '获得 5 元零花钱', 50, '💰', p1);
  insertReward.run('周末外出游玩', '家庭外出活动一次', 100, '🎡', p1);
}

seed();

module.exports = db;
