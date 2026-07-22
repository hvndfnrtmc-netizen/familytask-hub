import { useState } from 'react';
import { createMember, updateMember, deleteMember } from '../api';
import { useFamily } from '../context/FamilyContext';

const AVATARS = ['👦', '👧', '👨', '👩', '👴', '👵', '🧒', '👶', '🐱', '🐶', '🐻', '🦊'];

// 权限定义：每种角色拥有哪些权限
const ALL_PERMISSIONS = [
  { key: 'create_task',    label: '发布任务',     icon: '📝', roles: ['admin', 'parent', 'child'] },
  { key: 'complete_task',  label: '完成任务',     icon: '✅', roles: ['admin', 'parent', 'child'] },
  { key: 'approve_task',   label: '审批任务',     icon: '🔍', roles: ['admin', 'parent'] },
  { key: 'create_reward',  label: '创建奖励',     icon: '🎁', roles: ['admin', 'parent'] },
  { key: 'approve_reward', label: '审批兑换',     icon: '💰', roles: ['admin', 'parent'] },
  { key: 'claim_reward',   label: '兑换奖励',     icon: '🛍️', roles: ['admin', 'child'] },
  { key: 'manage_members', label: '管理成员',     icon: '👥', roles: ['admin'] },
  { key: 'delete_task',    label: '删除任务',     icon: '🗑️', roles: ['admin', 'parent'] },
  { key: 'all_settings',   label: '全局设置',     icon: '⚙️', roles: ['admin'] },
];

function getEffectiveRole(member) {
  if (member.is_admin) return 'admin';
  if (member.role === 'parent') return 'parent';
  return 'child';
}

const ROLE_META = {
  admin:  { label: '系统管理员', badge: 'bg-red-100 text-red-700',    desc: '拥有所有权限，可管理全部成员与设置' },
  parent: { label: '家长',       badge: 'bg-purple-100 text-purple-700', desc: '可发布/审批任务，管理奖励' },
  child:  { label: '孩子',       badge: 'bg-blue-100 text-blue-700',   desc: '可完成任务、兑换积分奖励' },
};

function PermissionPanel({ member }) {
  const role = getEffectiveRole(member);
  const meta = ROLE_META[role];
  const granted = ALL_PERMISSIONS.filter(p => p.roles.includes(role));
  const denied  = ALL_PERMISSIONS.filter(p => !p.roles.includes(role));

  return (
    <div className="mt-3 w-full text-left space-y-3">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
        {role === 'admin' && '👑 '}{meta.label}
      </div>
      <p className="text-xs text-gray-400">{meta.desc}</p>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">拥有权限</p>
        <div className="grid grid-cols-1 gap-1">
          {granted.map(p => (
            <div key={p.key} className="flex items-center gap-2 text-xs text-gray-700">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs shrink-0">✓</span>
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function MemberForm({ initial, onClose, onSave, canSetAdmin }) {
  const [form, setForm] = useState({
    name:     initial?.name     ?? '',
    role:     initial?.role     ?? 'child',
    avatar:   initial?.avatar   ?? '👦',
    is_admin: initial?.is_admin ?? 0,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    await onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">
          {initial ? '编辑成员' : '添加成员'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="姓名" value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

          <select value={form.role} onChange={e => set('role', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="parent">家长</option>
            <option value="child">孩子</option>
          </select>

          {canSetAdmin && (
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={!!form.is_admin}
                onChange={e => set('is_admin', e.target.checked ? 1 : 0)}
                className="w-4 h-4 accent-red-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">系统管理员</span>
                <p className="text-xs text-gray-400">拥有全部权限</p>
              </div>
              <span className="ml-auto text-lg">👑</span>
            </label>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-2">选择头像</p>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map(a => (
                <button key={a} type="button" onClick={() => set('avatar', a)}
                  className={`text-2xl p-1 rounded-xl transition-all
                    ${form.avatar === a ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'hover:bg-gray-100'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">取消</button>
            <button type="submit"
              className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Members() {
  const { members, currentMember, isAdmin, isParent, refreshMembers } = useFamily();
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null); // 哪张卡片展开权限面板

  const canManage = isAdmin || isParent;

  const handleCreate = async data => { await createMember(data); refreshMembers(); };
  const handleUpdate = async data => { await updateMember(editTarget.id, data); refreshMembers(); };
  const handleDelete = async id => {
    if (confirm('删除此成员？相关任务将失去分配信息。')) {
      await deleteMember(id);
      refreshMembers();
    }
  };

  const toggleExpand = id =>
    setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">家庭成员</h2>
        {canManage && (
          <button onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
            + 添加成员
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {members.map(m => {
          const isSelf     = m.id === currentMember?.id;
          const role       = getEffectiveRole(m);
          const roleMeta   = ROLE_META[role];
          const isExpanded = expandedId === m.id;

          return (
            <div key={m.id}
              className={`bg-white rounded-2xl shadow-sm border flex flex-col transition-all
                ${isSelf ? 'border-primary ring-2 ring-primary/20' : 'border-orange-100'}`}>

              {/* 卡片主体 */}
              <div className="p-5 flex flex-col items-center gap-3">
                {/* 管理员皇冠角标 */}
                <div className="relative">
                  <div className="text-5xl">{m.avatar}</div>
                  {m.is_admin ? (
                    <span className="absolute -top-1 -right-1 text-base">👑</span>
                  ) : null}
                </div>

                <div className="text-center">
                  <h3 className="font-semibold text-gray-800">{m.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${roleMeta.badge}`}>
                    {roleMeta.label}
                  </span>
                </div>

                <div className="text-center">
                  <span className="text-2xl font-bold text-primary">{m.points}</span>
                  <span className="text-sm text-gray-500 ml-1">积分</span>
                </div>

                {/* 查看权限按钮（仅当前登录者自己） */}
                {isSelf && (
                  <button onClick={() => toggleExpand(m.id)}
                    className="w-full text-xs py-1.5 rounded-xl border border-gray-200 text-gray-500
                      hover:border-primary/40 hover:text-primary transition-colors">
                    {isExpanded ? '▲ 收起权限' : '▼ 查看我的权限'}
                  </button>
                )}

                {/* 管理按钮（管理员/家长可操作其他人） */}
                {canManage && !isSelf && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditTarget(m); setShowForm(true); }}
                      className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">
                      编辑
                    </button>
                    <button onClick={() => handleDelete(m.id)}
                      className="text-sm px-3 py-1 text-gray-400 hover:text-red-500 transition-colors">
                      删除
                    </button>
                  </div>
                )}
              </div>

              {/* 权限面板（展开时显示） */}
              {isSelf && isExpanded && (
                <div className="border-t border-gray-100 px-5 pb-5">
                  <PermissionPanel member={m} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <MemberForm
          initial={editTarget}
          canSetAdmin={isAdmin}
          onClose={() => setShowForm(false)}
          onSave={editTarget ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
}
