import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });

export const getMembers = () => api.get('/members').then(r => r.data);
export const createMember = data => api.post('/members', data).then(r => r.data);
export const updateMember = (id, data) => api.put(`/members/${id}`, data).then(r => r.data);
export const deleteMember = id => api.delete(`/members/${id}`).then(r => r.data);

export const getTasks = (params) => api.get('/tasks', { params }).then(r => r.data);
export const createTask = data => api.post('/tasks', data).then(r => r.data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data).then(r => r.data);
export const deleteTask = id => api.delete(`/tasks/${id}`).then(r => r.data);
export const completeTask = id => api.post(`/tasks/${id}/complete`).then(r => r.data);
export const approveTask = id => api.post(`/tasks/${id}/approve`).then(r => r.data.task ?? r.data);

export const getRewards = () => api.get('/rewards').then(r => r.data);
export const createReward = data => api.post('/rewards', data).then(r => r.data);
export const deleteReward = id => api.delete(`/rewards/${id}`).then(r => r.data);
export const getRewardClaims = () => api.get('/rewards/claims').then(r => r.data);
export const claimReward = (id, member_id) => api.post(`/rewards/${id}/claim`, { member_id }).then(r => r.data);
export const approveRewardClaim = id => api.post(`/rewards/claims/${id}/approve`).then(r => r.data);
