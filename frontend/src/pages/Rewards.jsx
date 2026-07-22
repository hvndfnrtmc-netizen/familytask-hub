import { useState, useEffect, useCallback } from 'react';
import { getRewards, createReward, getRewardClaims, approveRewardClaim } from '../api';
import { useFamily } from '../context/FamilyContext';
import RewardCard from '../components/RewardCard';

const ICONS = ['🎮', '🍕', '🎬', '💰', '🎡', '🧸', '🍦', '📚', '🎨', '🏆', '🎁', '⭐'];

function RewardForm({ currentMember, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', points_cost: 30, icon: '🎁' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    await onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">新建奖励</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="奖励名称" value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea placeholder="描述（可选）" value={form.description}
            onChange={e => set('description', e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="number" min={1} required placeholder="所需积分" value={form.points_cost}
            onChange={e => set('points_cost', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <div>
            <p className="text-xs text-gray-500 mb-2">选择图标</p>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => set('icon', icon)}
                  className={`text-2xl p-1 rounded-xl transition-all
                    ${form.icon === icon ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'hover:bg-gray-100'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">取消</button>
            <button type="submit"
              className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Rewards() {
  const { currentMember, refreshMembers } = useFamily();
  const [rewards, setRewards] = useState([]);
  const [claims, setClaims] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const isParent = currentMember?.role === 'parent';

  const load = useCallback(() => {
    getRewards().then(setRewards);
    getRewardClaims().then(setClaims);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { load(); refreshMembers(); };

  const handleCreate = async data => {
    await createReward({ ...data, created_by: currentMember?.id });
    load();
  };

  const handleApproveClaim = async id => {
    await approveRewardClaim(id);
    handleRefresh();
  };

  const pendingClaims = claims.filter(c => c.status === 'pending');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">积分商城</h2>
        {isParent && (
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
            + 新建奖励
          </button>
        )}
      </div>

      {!isParent && currentMember && (
        <div className="bg-gradient-to-r from-primary to-orange-400 text-white rounded-2xl p-4 flex items-center gap-3">
          <span className="text-3xl">{currentMember.avatar}</span>
          <div>
            <p className="text-sm opacity-90">{currentMember.name} 当前积分</p>
            <p className="text-3xl font-bold">{currentMember.points} 分</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rewards.map(r => <RewardCard key={r.id} reward={r} onRefresh={handleRefresh} />)}
        {rewards.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🎁</div>
            <p>暂无奖励</p>
          </div>
        )}
      </div>

      {isParent && pendingClaims.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">待审批兑换 ({pendingClaims.length})</h3>
          <div className="space-y-2">
            {pendingClaims.map(c => (
              <div key={c.id}
                className="bg-white border border-orange-100 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">{c.reward_icon}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{c.reward_title}</span>
                  <div className="text-xs text-gray-500">
                    {c.member_avatar} {c.member_name} · {c.points_cost} 积分
                  </div>
                </div>
                <button onClick={() => handleApproveClaim(c.id)}
                  className="px-4 py-1.5 bg-success text-white rounded-xl text-sm font-medium hover:bg-success-dark transition-colors">
                  审批
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <RewardForm currentMember={currentMember}
          onClose={() => setShowForm(false)} onSave={handleCreate} />
      )}
    </div>
  );
}
