import { useState } from 'react';
import { createMember, updateMember, deleteMember } from '../api';
import { useFamily } from '../context/FamilyContext';

const AVATARS = ['👦', '👧', '👨', '👩', '👴', '👵', '🧒', '👶', '🐱', '🐶', '🐻', '🦊'];

function MemberForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    role: initial?.role ?? 'child',
    avatar: initial?.avatar ?? '👦',
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
  const { members, currentMember, refreshMembers } = useFamily();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const isParent = currentMember?.role === 'parent';

  const handleCreate = async data => { await createMember(data); refreshMembers(); };
  const handleUpdate = async data => { await updateMember(editTarget.id, data); refreshMembers(); };
  const handleDelete = async id => {
    if (confirm('删除此成员？相关任务将失去分配信息。')) {
      await deleteMember(id);
      refreshMembers();
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">家庭成员</h2>
        {isParent && (
          <button onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
            + 添加成员
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {members.map(m => (
          <div key={m.id}
            className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col items-center gap-3
              ${m.id === currentMember?.id ? 'border-primary ring-2 ring-primary/20' : 'border-orange-100'}`}>
            <div className="text-5xl">{m.avatar}</div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-800">{m.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block
                ${m.role === 'parent' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {m.role === 'parent' ? '家长' : '孩子'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">{m.points}</span>
              <span className="text-sm text-gray-500 ml-1">积分</span>
            </div>
            {isParent && m.id !== currentMember?.id && (
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
        ))}
      </div>

      {showForm && (
        <MemberForm
          initial={editTarget}
          onClose={() => setShowForm(false)}
          onSave={editTarget ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
}
