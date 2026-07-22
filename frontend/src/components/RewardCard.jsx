import { claimReward, deleteReward } from '../api';
import { useFamily } from '../context/FamilyContext';

export default function RewardCard({ reward, onRefresh }) {
  const { currentMember } = useFamily();
  const isParent = currentMember?.role === 'parent';
  const canClaim = !isParent && currentMember?.points >= reward.points_cost;

  const handleClaim = async () => {
    try {
      await claimReward(reward.id, currentMember.id);
      alert('兑换申请已提交，等待家长审批！');
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.error ?? '兑换失败');
    }
  };
  const handleDelete = async () => {
    if (confirm(`删除奖励「${reward.title}」？`)) {
      await deleteReward(reward.id);
      onRefresh();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="text-4xl text-center">{reward.icon}</div>
      <div className="text-center">
        <h3 className="font-semibold text-gray-800">{reward.title}</h3>
        {reward.description && <p className="text-xs text-gray-500 mt-1">{reward.description}</p>}
      </div>
      <div className="text-center">
        <span className="text-lg font-bold text-primary">{reward.points_cost}</span>
        <span className="text-sm text-gray-500"> 积分</span>
      </div>
      <div className="flex gap-2 justify-center">
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
  );
}
