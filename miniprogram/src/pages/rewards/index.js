import { Component } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { getRewards, createReward, deleteReward, getRewardClaims, claimReward, approveRewardClaim } from '../../utils/api';
import { getState, refreshMembers, canManage, isAdmin, isParent } from '../../store/family';
import './index.scss';

const ICONS = ['🎮','🍕','🎬','💰','🎡','🧸','🍦','📚','🎨','🏆','🎁','⭐'];

export default class Rewards extends Component {
  config = { navigationBarTitleText: '积分商城' };
  state = { rewards:[], claims:[], currentMember:null, showForm:false,
    form:{ title:'', description:'', points_cost:30, icon:'🎁' } };

  async componentDidShow() {
    await refreshMembers();
    const { currentMember } = getState();
    const [rewards, claims] = await Promise.all([getRewards(), getRewardClaims()]);
    this.setState({ rewards, claims, currentMember });
  }

  setForm = (k,v) => this.setState(s=>({ form:{...s.form,[k]:v} }));

  handleCreate = async () => {
    const { form, currentMember } = this.state;
    if (!form.title) { Taro.showToast({ title:'请填写奖励名称', icon:'none' }); return; }
    await createReward({ ...form, created_by: currentMember?.id });
    const rewards = await getRewards();
    this.setState({ showForm:false, rewards });
  };

  handleDelete = async (r) => {
    Taro.showModal({ title:'删除奖励', content:`确定删除「${r.title}」？`,
      success: async ({confirm}) => {
        if (!confirm) return;
        await deleteReward(r.id);
        const rewards = await getRewards();
        this.setState({ rewards });
      }
    });
  };

  handleClaim = async (r) => {
    const { currentMember } = this.state;
    if (!currentMember) return;
    if (currentMember.points < r.points_cost) {
      Taro.showToast({ title:`积分不足，差 ${r.points_cost - currentMember.points} 分`, icon:'none' }); return;
    }
    try {
      await claimReward(r.id, currentMember.id);
      Taro.showToast({ title:'兑换申请已提交！', icon:'success' });
    } catch {}
  };

  handleApproveClaim = async (id) => {
    await approveRewardClaim(id);
    const [claims] = await Promise.all([getRewardClaims()]);
    await refreshMembers();
    const { currentMember } = getState();
    this.setState({ claims, currentMember });
  };

  render() {
    const { rewards, claims, currentMember, showForm, form } = this.state;
    const pendingClaims = claims.filter(c=>c.status==='pending');
    const _isParent = isParent() || isAdmin();

    return (
      <View className="page">
        <View className="header">
          <Text className="page-title">积分商城</Text>
          {canManage() && (
            <View className="add-btn" onClick={()=>this.setState({showForm:true})}><Text>+ 添加</Text></View>
          )}
        </View>

        <ScrollView scrollY className="scroll-area">
          {/* 积分展示（孩子视角） */}
          {currentMember && !_isParent && (
            <View className="points-banner">
              <Text className="points-avatar">{currentMember.avatar}</Text>
              <View>
                <Text className="points-name">{currentMember.name} 的积分</Text>
                <Text className="points-value">{currentMember.points} 分</Text>
              </View>
            </View>
          )}

          {/* 奖励列表 */}
          <View className="rewards-grid">
            {rewards.map(r=>{
              const canClaim = !_isParent && currentMember && currentMember.points >= r.points_cost;
              return (
                <View key={r.id} className="reward-card">
                  <Text className="reward-icon">{r.icon}</Text>
                  <Text className="reward-title">{r.title}</Text>
                  {r.description && <Text className="reward-desc">{r.description}</Text>}
                  <Text className="reward-cost">{r.points_cost} 积分</Text>
                  {!_isParent && (
                    <View className={`claim-btn ${canClaim?'active':'disabled'}`}
                      onClick={()=>canClaim&&this.handleClaim(r)}>
                      <Text>{canClaim?'兑换':`差 ${r.points_cost-(currentMember?.points??0)} 分`}</Text>
                    </View>
                  )}
                  {canManage() && (
                    <View className="del-btn" onClick={()=>this.handleDelete(r)}><Text>删除</Text></View>
                  )}
                </View>
              );
            })}
          </View>

          {/* 待审批兑换（家长/管理员） */}
          {_isParent && pendingClaims.length>0 && (
            <View className="claims-section">
              <Text className="claims-title">待审批兑换 ({pendingClaims.length})</Text>
              {pendingClaims.map(c=>(
                <View key={c.id} className="claim-row">
                  <Text className="claim-icon">{c.reward_icon}</Text>
                  <View className="claim-info">
                    <Text className="claim-reward">{c.reward_title}</Text>
                    <Text className="claim-member">{c.member_avatar} {c.member_name} · {c.points_cost} 积分</Text>
                  </View>
                  <View className="approve-btn" onClick={()=>this.handleApproveClaim(c.id)}>
                    <Text>审批</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {showForm && (
          <View className="modal-mask" onClick={()=>this.setState({showForm:false})}>
            <View className="modal" onClick={e=>e.stopPropagation()}>
              <Text className="modal-title">新建奖励</Text>
              <Text className="field-label">名称</Text>
              <Input className="field-input" value={form.title} placeholder="奖励名称"
                onInput={e=>this.setForm('title',e.detail.value)} />
              <Text className="field-label">所需积分</Text>
              <Input className="field-input" type="number" value={String(form.points_cost)}
                onInput={e=>this.setForm('points_cost',Number(e.detail.value))} />
              <Text className="field-label">图标</Text>
              <View className="icon-grid">
                {ICONS.map(ic=>(
                  <View key={ic} className={`icon-item ${form.icon===ic?'active':''}`}
                    onClick={()=>this.setForm('icon',ic)}>
                    <Text>{ic}</Text>
                  </View>
                ))}
              </View>
              <View className="modal-actions">
                <View className="btn-cancel" onClick={()=>this.setState({showForm:false})}><Text>取消</Text></View>
                <View className="btn-confirm" onClick={this.handleCreate}><Text>创建</Text></View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }
}
