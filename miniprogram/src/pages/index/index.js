import { Component } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { getTasks } from '../../utils/api';
import { getState, refreshMembers } from '../../store/family';
import './index.scss';

export default class Index extends Component {
  config = { navigationBarTitleText: 'FamLoop 总览' };
  state = { tasks: [], members: [], currentMember: null };

  async componentDidMount() {
    const token = Taro.getStorageSync('session_token');
    if (!token) { Taro.reLaunch({ url: '/pages/login/index' }); return; }
    await refreshMembers();
    const { members, currentMember } = getState();
    const tasks = await getTasks();
    this.setState({ tasks, members, currentMember });
  }

  async componentDidShow() {
    await refreshMembers();
    const { members, currentMember } = getState();
    const tasks = await getTasks();
    this.setState({ tasks, members, currentMember });
  }

  render() {
    const { tasks, members, currentMember } = this.state;
    const today = new Date().toISOString().split('T')[0];
    const pendingToday = tasks.filter(t => t.due_date === today && t.status === 'pending').length;
    const totalTasks   = tasks.length;
    const approved     = tasks.filter(t => t.status === 'approved').length;
    const weekRate     = totalTasks ? Math.round(approved / totalTasks * 100) : 0;
    const sorted       = [...members].sort((a, b) => b.points - a.points);
    const recent       = [...tasks].sort((a, b) => b.id - a.id).slice(0, 6);

    const STATUS_COLOR = { pending: '#3b82f6', done: '#f97316', approved: '#22c55e' };
    const STATUS_LABEL = { pending: '待完成', done: '待审批', approved: '已完成' };

    return (
      <ScrollView scrollY className="page">
        {/* 顶部问候 */}
        {currentMember && (
          <View className="greeting">
            <Text className="greeting-avatar">{currentMember.avatar}</Text>
            <View>
              <Text className="greeting-name">你好，{currentMember.name}！</Text>
              <Text className="greeting-sub">今天也要加油哦 💪</Text>
            </View>
          </View>
        )}

        {/* 统计卡片 */}
        <View className="stats-grid">
          {[
            { label: '今日待完成', value: pendingToday, icon: '📋', color: '#eff6ff', border: '#bfdbfe' },
            { label: '本周完成率', value: `${weekRate}%`, icon: '📈', color: '#f0fdf4', border: '#bbf7d0' },
            { label: '任务总数',   value: totalTasks,    icon: '✅', color: '#fff7ed', border: '#fed7aa' },
            { label: '家庭成员',   value: members.length,icon: '👨‍👩‍👧', color: '#faf5ff', border: '#e9d5ff' },
          ].map(({ label, value, icon, color, border }) => (
            <View key={label} className="stat-card" style={{ background: color, borderColor: border }}>
              <Text className="stat-icon">{icon}</Text>
              <Text className="stat-value">{value}</Text>
              <Text className="stat-label">{label}</Text>
            </View>
          ))}
        </View>

        {/* 积分排行 */}
        <View className="section">
          <Text className="section-title">积分排行榜</Text>
          {sorted.map((m, i) => (
            <View key={m.id} className="rank-row">
              <Text className="rank-num">{i + 1}</Text>
              <Text className="rank-avatar">{m.avatar}</Text>
              <Text className="rank-name">{m.name}</Text>
              <Text className="rank-role">{m.role === 'parent' ? '家长' : '孩子'}</Text>
              <Text className="rank-points">{m.points} 分</Text>
            </View>
          ))}
        </View>

        {/* 最近动态 */}
        <View className="section">
          <Text className="section-title">最近任务动态</Text>
          {recent.map(t => (
            <View key={t.id} className="activity-row">
              <Text className="activity-avatar">{t.assigned_avatar ?? '❓'}</Text>
              <Text className="activity-title">{t.title}</Text>
              <Text className="activity-status" style={{ color: STATUS_COLOR[t.status] }}>
                {STATUS_LABEL[t.status]}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }
}
