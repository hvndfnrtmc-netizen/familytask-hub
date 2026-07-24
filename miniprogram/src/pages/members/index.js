import { Component } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { getMembers, createMember, updateMember, deleteMember } from '../../utils/api';
import { getState, refreshMembers, canManage, isAdmin } from '../../store/family';
import './index.scss';

const AVATARS = ['👦','👧','👨','👩','👴','👵','🧒','👶','🐱','🐶','🐻','🦊'];
const ALL_PERMISSIONS = [
  { key: 'create_task',    label: '发布任务',   icon: '📝', roles: ['admin','parent','child'] },
  { key: 'complete_task',  label: '完成任务',   icon: '✅', roles: ['admin','parent','child'] },
  { key: 'approve_task',   label: '审批任务',   icon: '🔍', roles: ['admin','parent'] },
  { key: 'create_reward',  label: '创建奖励',   icon: '🎁', roles: ['admin','parent'] },
  { key: 'approve_reward', label: '审批兑换',   icon: '💰', roles: ['admin','parent'] },
  { key: 'claim_reward',   label: '兑换奖励',   icon: '🛍️', roles: ['admin','child'] },
  { key: 'manage_members', label: '管理成员',   icon: '👥', roles: ['admin'] },
  { key: 'all_settings',   label: '全局设置',   icon: '⚙️', roles: ['admin'] },
];
function effectiveRole(m) { return m.is_admin ? 'admin' : m.role; }
const ROLE_META = {
  admin:  { label: '系统管理员', badge_bg: '#fee2e2', badge_text: '#b91c1c' },
  parent: { label: '家长',       badge_bg: '#f3e8ff', badge_text: '#7c3aed' },
  child:  { label: '孩子',       badge_bg: '#dbeafe', badge_text: '#1d4ed8' },
};

export default class Members extends Component {
  config = { navigationBarTitleText: '家庭成员' };
  state = { members:[], currentMember:null, showForm:false, editTarget:null, expandedId:null,
    form:{ name:'', role:'child', avatar:'👦', is_admin:0 } };

  async componentDidShow() {
    await refreshMembers();
    const { members, currentMember } = getState();
    this.setState({ members, currentMember });
  }

  openForm(m=null) {
    const form = m ? { name:m.name, role:m.role, avatar:m.avatar, is_admin:m.is_admin??0 }
                   : { name:'', role:'child', avatar:'👦', is_admin:0 };
    this.setState({ showForm:true, editTarget:m, form });
  }
  setForm = (k,v) => this.setState(s=>({ form:{...s.form,[k]:v} }));

  handleSave = async () => {
    const { form, editTarget } = this.state;
    if (!form.name) { Taro.showToast({ title:'请填写姓名', icon:'none' }); return; }
    if (editTarget) await updateMember(editTarget.id, form);
    else await createMember(form);
    await refreshMembers();
    const { members } = getState();
    this.setState({ showForm:false, members });
  };

  handleDelete = async (m) => {
    Taro.showModal({ title:'删除成员', content:`确定删除「${m.name}」？相关任务将失去分配。`,
      success: async ({ confirm }) => {
        if (!confirm) return;
        await deleteMember(m.id);
        await refreshMembers();
        const { members } = getState();
        this.setState({ members });
      },
    });
  };

  render() {
    const { members, currentMember, showForm, editTarget, expandedId, form } = this.state;
    return (
      <View className="page">
        <View className="header">
          <Text className="page-title">家庭成员</Text>
          {canManage() && (
            <View className="add-btn" onClick={()=>this.openForm()}><Text>+ 添加</Text></View>
          )}
        </View>

        <ScrollView scrollY className="scroll-area">
          {members.map(m=>{
            const role = effectiveRole(m);
            const meta = ROLE_META[role];
            const isSelf = m.id === currentMember?.id;
            const isExp  = expandedId === m.id;
            const granted = ALL_PERMISSIONS.filter(p=>p.roles.includes(role));
            return (
              <View key={m.id} className={`member-card ${isSelf?'self':''}`}>
                <View className="card-main">
                  <View className="avatar-wrap">
                    <Text className="avatar">{m.avatar}</Text>
                    {m.is_admin ? <Text className="crown">👑</Text> : null}
                  </View>
                  <View className="info">
                    <Text className="member-name">{m.name}</Text>
                    <View className="badge" style={{background:meta.badge_bg}}>
                      <Text style={{color:meta.badge_text, fontSize:'22rpx'}}>{meta.label}</Text>
                    </View>
                  </View>
                  <View className="right-side">
                    <Text className="points">{m.points}</Text>
                    <Text className="pts-label">积分</Text>
                  </View>
                </View>

                {/* 自己：查看权限按钮 */}
                {isSelf && (
                  <View className="perm-btn" onClick={()=>this.setState({expandedId:isExp?null:m.id})}>
                    <Text>{isExp?'▲ 收起权限':'▼ 查看我的权限'}</Text>
                  </View>
                )}
                {isSelf && isExp && (
                  <View className="perm-panel">
                    {granted.map(p=>(
                      <View key={p.key} className="perm-row">
                        <Text className="perm-check">✓</Text>
                        <Text className="perm-icon">{p.icon}</Text>
                        <Text className="perm-label">{p.label}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 管理按钮 */}
                {canManage() && !isSelf && (
                  <View className="card-actions">
                    <View className="action-btn edit" onClick={()=>this.openForm(m)}><Text>编辑</Text></View>
                    <View className="action-btn del"  onClick={()=>this.handleDelete(m)}><Text>删除</Text></View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {showForm && (
          <View className="modal-mask" onClick={()=>this.setState({showForm:false})}>
            <View className="modal" onClick={e=>e.stopPropagation()}>
              <Text className="modal-title">{editTarget?'编辑成员':'添加成员'}</Text>
              <Text className="field-label">姓名</Text>
              <Input className="field-input" value={form.name} placeholder="请输入姓名"
                onInput={e=>this.setForm('name',e.detail.value)} />
              <Text className="field-label">角色</Text>
              <View className="role-chips">
                {['parent','child'].map(r=>(
                  <View key={r} className={`chip ${form.role===r?'active':''}`} onClick={()=>this.setForm('role',r)}>
                    <Text>{r==='parent'?'👨‍👩‍ 家长':'👦 孩子'}</Text>
                  </View>
                ))}
              </View>
              {isAdmin() && (
                <View className="admin-toggle" onClick={()=>this.setForm('is_admin',form.is_admin?0:1)}>
                  <Text className="admin-label">👑 系统管理员</Text>
                  <View className={`toggle ${form.is_admin?'on':''}`}/>
                </View>
              )}
              <Text className="field-label">头像</Text>
              <View className="avatar-grid">
                {AVATARS.map(a=>(
                  <View key={a} className={`avatar-item ${form.avatar===a?'active':''}`}
                    onClick={()=>this.setForm('avatar',a)}>
                    <Text>{a}</Text>
                  </View>
                ))}
              </View>
              <View className="modal-actions">
                <View className="btn-cancel" onClick={()=>this.setState({showForm:false})}><Text>取消</Text></View>
                <View className="btn-confirm" onClick={this.handleSave}><Text>保存</Text></View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }
}
