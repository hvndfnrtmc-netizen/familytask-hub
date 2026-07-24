import Taro from '@tarojs/taro';

const BASE = typeof API_BASE !== 'undefined' ? API_BASE : 'https://your-app.railway.app/api';

function getToken() {
  return Taro.getStorageSync('session_token') || '';
}

function request(method, path, data = {}) {
  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${BASE}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'X-Session-Token': getToken(),
      },
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          Taro.showToast({ title: res.data?.error || '请求失败', icon: 'none' });
          reject(res.data);
        }
      },
      fail: err => {
        Taro.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      },
    });
  });
}

export const get  = (path, params = {}) => {
  const qs = Object.entries(params).filter(([,v]) => v !== '' && v != null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return request('GET', qs ? `${path}?${qs}` : path);
};
export const post   = (path, data) => request('POST',   path, data);
export const put    = (path, data) => request('PUT',    path, data);
export const del    = (path)       => request('DELETE', path);

// ── Auth ──
export const wxLogin = (code) => post('/auth/wechat', { code });
export const bindMember = (memberId) => post('/auth/bind', { member_id: memberId });

// ── Members ──
export const getMembers    = ()         => get('/members');
export const createMember  = (data)     => post('/members', data);
export const updateMember  = (id, data) => put(`/members/${id}`, data);
export const deleteMember  = (id)       => del(`/members/${id}`);

// ── Tasks ──
export const getTasks      = (params)   => get('/tasks', params);
export const createTask    = (data)     => post('/tasks', data);
export const updateTask    = (id, data) => put(`/tasks/${id}`, data);
export const deleteTask    = (id)       => del(`/tasks/${id}`);
export const completeTask  = (id)       => post(`/tasks/${id}/complete`);
export const approveTask   = (id)       => post(`/tasks/${id}/approve`).then(r => r.task ?? r);

// ── Events ──
export const getEvents     = (month)    => get('/events', { month });
export const createEvent   = (data)     => post('/events', data);
export const updateEvent   = (id, data) => put(`/events/${id}`, data);
export const deleteEvent   = (id)       => del(`/events/${id}`);

// ── Rewards ──
export const getRewards          = ()    => get('/rewards');
export const createReward        = (data)=> post('/rewards', data);
export const deleteReward        = (id)  => del(`/rewards/${id}`);
export const getRewardClaims     = ()    => get('/rewards/claims');
export const claimReward         = (id, member_id) => post(`/rewards/${id}/claim`, { member_id });
export const approveRewardClaim  = (id)  => post(`/rewards/claims/${id}/approve`);
