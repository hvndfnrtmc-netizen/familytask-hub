import Taro from '@tarojs/taro';
import { getMembers } from '../utils/api';

// 轻量全局状态，用 Taro.getApp() 共享
const state = {
  currentMember: null,
  members: [],
};

export function getState() { return state; }

export function setCurrentMember(m) {
  state.currentMember = m;
  if (m) Taro.setStorageSync('current_member_id', m.id);
}

export async function refreshMembers() {
  const data = await getMembers();
  state.members = data;
  const savedId = Taro.getStorageSync('current_member_id');
  const found = savedId ? data.find(m => m.id === savedId) : null;
  state.currentMember = found ?? data[0] ?? null;
  return data;
}

export function isAdmin()  { return !!state.currentMember?.is_admin; }
export function isParent() { return state.currentMember?.role === 'parent'; }
export function canManage(){ return isAdmin() || isParent(); }
