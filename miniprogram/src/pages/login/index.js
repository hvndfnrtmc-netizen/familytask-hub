import { Component } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button, Image } from '@tarojs/components';
import { wxLogin, getMembers } from '../../utils/api';
import { refreshMembers, setCurrentMember } from '../../store/family';
import './index.scss';

export default class Login extends Component {
  config = { navigationBarTitleText: '欢迎使用 FamLoop' };

  state = { members: [], step: 'login', loading: false };

  handleWxLogin = () => {
    this.setState({ loading: true });
    Taro.login({
      success: async ({ code }) => {
        try {
          const res = await wxLogin(code);
          Taro.setStorageSync('session_token', res.session_token);
          if (res.member_id) {
            // 已绑定成员，直接进入
            await refreshMembers();
            Taro.reLaunch({ url: '/pages/index/index' });
          } else {
            // 未绑定，让用户选择身份
            const members = await getMembers();
            this.setState({ members, step: 'bind', loading: false });
          }
        } catch {
          this.setState({ loading: false });
        }
      },
    });
  };

  handleBind = async (member) => {
    const { bindMember } = await import('../../utils/api');
    await bindMember(member.id);
    setCurrentMember(member);
    Taro.setStorageSync('current_member_id', member.id);
    await refreshMembers();
    Taro.reLaunch({ url: '/pages/index/index' });
  };

  render() {
    const { step, members, loading } = this.state;

    if (step === 'bind') {
      return (
        <View className="login-page">
          <Text className="title">你是哪位家庭成员？</Text>
          <Text className="subtitle">选择你的身份，开始使用 FamLoop</Text>
          <View className="members-grid">
            {members.map(m => (
              <View key={m.id} className="member-card" onClick={() => this.handleBind(m)}>
                <Text className="avatar">{m.avatar}</Text>
                <Text className="name">{m.name}</Text>
                <Text className={`role ${m.role}`}>{m.role === 'parent' ? '家长' : '孩子'}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View className="login-page">
        <View className="logo-area">
          <Text className="logo-emoji">🏡</Text>
          <Text className="app-name">FamLoop</Text>
          <Text className="app-desc">家庭任务，一起完成</Text>
        </View>
        <View className="features">
          <Text className="feature-item">📋 任务分配与积分奖励</Text>
          <Text className="feature-item">📅 家庭日历共享</Text>
          <Text className="feature-item">🎁 积分兑换好礼</Text>
        </View>
        <Button
          className="wx-login-btn"
          openType="getPhoneNumber"
          loading={loading}
          onClick={this.handleWxLogin}>
          微信一键登录
        </Button>
      </View>
    );
  }
}
