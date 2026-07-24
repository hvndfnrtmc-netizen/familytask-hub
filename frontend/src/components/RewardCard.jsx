import { useState } from 'react';
import { claimReward, deleteReward, updateReward } from '../api';
import { useFamily } from '../context/FamilyContext';

const ICONS = ['🎮', '🍕', '🎬', '💰', '🎡', '🧸', '🍦', '📚', '🎨', '🏆', '🎁', '⭐'];

const POINTS_PRESETS = [10, 20, 30, 50, 100, 200];

function RewardEditModal({ reward, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: reward.title,
    description: reward.description ?? '',
    points_cost: reward.points_cost,
    icon: reward.icon,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    await updateReward(reward.id, form);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold mb-4 text-gray-800">编辑奖励</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="奖励名称" value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

          <textarea placeholder="描述（可选）" value={form.description}
            onChange={e => set('description', e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />

          {/* 积分预设 */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">所需积分</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {POINTS_PRESETS.map(p => (
                <button key={p} type="button" onClick={() => set('points_cost', p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
                    ${form.points_cost === p
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-100 text-gray-600 border-transparent hover:bg-orange-100'}`}>
                  {p}分
                </button>
              ))}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5">
                <input
                  type="number" min={1} max={9999}
                  value={POINTS_PRESETS.includes(form.points_cost) ? '' : form.points_cost}
                  placeholder="自定义"
                  onChange={e => { const v = parseInt(e.target.value); if (v >= 1) set('points_cost', v); }}
                  className="w-14 text-xs text-center bg-transparent focus:outline-none text-gray-700 font-medium placeholder:text-gray-400" />
                <span className="text-xs text-gray-400">分</span>
              </div>
            </div>
          </div>

          {/* 图标选择 */}
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
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RewardCard({ reward, onRefresh }) {
  const { currentMember } = useFamily();
  const isParent = currentMember?.role === 'parent';
  const canClaim = !isParent && currentMember?.points >= reward.points_cost;
  const [showEdit, setShowEdit] = useState(false);

  const handleClaim = async () => {
    try {
      await claimReward(reward.id, currentMember.id);
      alert('兑换申请已提交，等待家长审批！');
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.error ?? '兑换失败');
    }
  };

  const handleDelete = async e => {
    e.stopPropagation();
    if (confirm(`删除奖励「${reward.title}」？`)) {
      await deleteReward(reward.id);
      onRefresh();
    }
  };

  return (
    <>
      <div
        onClick={() => isParent && setShowEdit(true)}
        className={`bg-white rounded-2xl shadow-sm border border-orange-100 p-4 flex flex-col gap-3
          hover:shadow-md transition-shadow
          ${isParent ? 'cursor-pointer hover:border-primary/30' : ''}`}>
        <div className="text-4xl text-center">{reward.icon}</div>
        <div className="text-center">
          <h3 className="font-semibold text-gray-800">{reward.title}</h3>
          {reward.description && <p className="text-xs text-gray-500 mt-1">{reward.description}</p>}
        </div>
        <div className="text-center">
          <span className="text-lg font-bold text-primary">{reward.points_cost}</span>
          <span className="text-sm text-gray-500"> 积分</span>
        </div>
        <div className="flex gap-2 justify-center" onClick={e => e.stopPropagation()}>
          {!isParent && (
            <button onClick={handleClaim} disabled={!canClaim}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${canClaim ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {canClaim ? '兑换' : `差 ${reward.points_cost - (currentMember?.points ?? 0)} 分`}
            </button>
          )}
          {isParent && (
            <button onClick={handleDelete}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors">
              删除
            </button>
          )}
        </div>
      </div>

      {showEdit && (
        <RewardEditModal
          reward={reward}
          onClose={() => setShowEdit(false)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
