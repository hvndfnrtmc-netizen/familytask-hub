import { useState, useEffect } from 'react';
import { getTasks } from '../api';
import { useFamily } from '../context/FamilyContext';

const STATUS_LABEL = { pending: '待完成', done: '待审批', approved: '已完成' };
const STATUS_COLOR = { pending: 'text-blue-600', done: 'text-orange-500', approved: 'text-green-600' };

export default function Dashboard() {
  const { members } = useFamily();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    getTasks().then(setTasks);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.due_date === today);
  const pendingToday = todayTasks.filter(t => t.status === 'pending').length;
  const weekTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date), now = new Date();
    return d >= new Date(now.setDate(now.getDate() - now.getDay())) &&
           d <= new Date(new Date().setDate(new Date().getDate() + (6 - new Date().getDay())));
  });
  const weekRate = weekTasks.length
    ? Math.round(weekTasks.filter(t => t.status === 'approved').length / weekTasks.length * 100)
    : 0;

  const sorted = [...members].sort((a, b) => b.points - a.points);
  const recent = [...tasks].sort((a, b) => b.id - a.id).slice(0, 6);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">家庭总览</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '今日待完成', value: pendingToday, icon: '📋', color: 'bg-blue-50 border-blue-200' },
          { label: '本周完成率', value: `${weekRate}%`, icon: '📈', color: 'bg-green-50 border-green-200' },
          { label: '任务总数', value: tasks.length, icon: '✅', color: 'bg-orange-50 border-orange-200' },
          { label: '家庭成员', value: members.length, icon: '👨‍👩‍👧', color: 'bg-purple-50 border-purple-200' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className={`${color} border rounded-2xl p-4 flex flex-col gap-1`}>
            <span className="text-2xl">{icon}</span>
            <span className="text-2xl font-bold text-gray-800">{value}</span>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">积分排行榜</h3>
          <div className="space-y-3">
            {sorted.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-lg font-bold w-6 text-gray-400">{i + 1}</span>
                <span className="text-2xl">{m.avatar}</span>
                <span className="flex-1 font-medium text-gray-700">{m.name}</span>
                <span className="text-sm text-gray-400">{m.role === 'parent' ? '家长' : '孩子'}</span>
                <span className="font-bold text-primary">{m.points} 分</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">最近任务动态</h3>
          <div className="space-y-2">
            {recent.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <span>{t.assigned_avatar ?? '❓'}</span>
                <span className="flex-1 text-gray-700 truncate">{t.title}</span>
                <span className={`text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
            ))}
            {recent.length === 0 && <p className="text-gray-400 text-sm text-center py-4">暂无任务</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
