const express = require('express');
const https = require('https');
const db = require('../db/database');

const router = express.Router();
const APP_ID     = process.env.WECHAT_APP_ID     || '';
const APP_SECRET = process.env.WECHAT_APP_SECRET || '';

// 用 code 换取微信 openid
function getOpenId(code) {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errcode) reject(new Error(json.errmsg));
          else resolve(json.openid);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function generateToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

// 微信登录：code → openid → 查找/创建 session
router.post('/wechat', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: '缺少 code' });

  try {
    const openid = await getOpenId(code);
    const member = db.prepare('SELECT * FROM members WHERE openid = ?').get(openid);
    const token  = generateToken();

    // 将 token 存入简单内存缓存（生产环境可改 Redis）
    tokenStore.set(token, { openid, member_id: member?.id ?? null });
    setTimeout(() => tokenStore.delete(token), 7 * 24 * 3600 * 1000); // 7天过期

    res.json({
      session_token: token,
      member_id: member?.id ?? null,
      member: member ?? null,
    });
  } catch (e) {
    console.error('微信登录失败', e.message);
    res.status(500).json({ error: '微信登录失败，请重试' });
  }
});

// 绑定：将 openid 绑定到某个家庭成员
router.post('/bind', (req, res) => {
  const token = req.headers['x-session-token'];
  const { member_id } = req.body;
  if (!token || !member_id) return res.status(400).json({ error: '参数缺失' });

  const session = tokenStore.get(token);
  if (!session) return res.status(401).json({ error: '会话已过期，请重新登录' });

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
  if (!member) return res.status(404).json({ error: '成员不存在' });

  db.prepare('UPDATE members SET openid = ? WHERE id = ?').run(session.openid, member_id);
  session.member_id = Number(member_id);

  res.json({ success: true, member });
});

// 获取当前登录成员
router.get('/me', (req, res) => {
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: '未登录' });
  const session = tokenStore.get(token);
  if (!session?.member_id) return res.status(401).json({ error: '未绑定成员' });
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(session.member_id);
  res.json(member ?? null);
});

// 简单内存 token 存储（模块级单例）
const tokenStore = new Map();

module.exports = router;
