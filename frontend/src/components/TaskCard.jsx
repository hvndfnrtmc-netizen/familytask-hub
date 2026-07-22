import { completeTask, approveTask, deleteTask } from '../api';
import { useFamily } from '../context/FamilyContext';
import { CATEGORIES } from '../pages/Tasks';

const PRIORITY_BADGE = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-600',
};
const PRIORITY_LABEL = { high: '紧急', medium: '普通', low: '低优' };
const STATUS_BADGE = {
  pending: 'bg-blue-100 text-blue-700',
  done:    'bg-orange-100 text-orange-700',
  approved:'bg-green-100 text-green-700',
};
const STATUS_LABEL = { pending: '待完成', done: '待审批', approved: '已完成' };
const RECURRENCE_LABEL = {
  daily: '每日', weekly: '每周', weekdays: '工作日', custom: '自定义',
};

// 类别左侧色条颜色映射
const CAT_BAR = {
  academic: 'bg-blue-400',
  sport:    'bg-green-400',
  art:      'bg-purple-400',
  habit:    'bg-orange-400',
  other:    'bg-gray-300',
};

export default function TaskCard({ task, onRefresh }) {
  const { currentMember, isAdmin, isParent } = useFamily();
  const canApprove = isAdmin || isParent;
  const canDelete  = isAdmin || isParent;
  const cat = CATEGORIES.find(c => c.value === (task.category ?? 'other')) ?? CATEGORIES.at(-1);

  const handleComplete = async () => { await completeTask(task.id); onRefresh(); };
  const handleApprove  = async () => { await approveTask(task.id);  onRefresh(); };
  const handleDelete   = async () => {
    if (confirm(`删除任务「${task.title}」？`)) { await deleteTask(task.id); onRefresh(); }
  };

  const overdue = task.due_date && task.status === 'pending' &&
    new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex
      ${overdue ? 'border-red-200' : 'border-orange-100'} hover:shadow-md transition-shadow`}>

      {/* 左侧类别色条 */}
      <div className={`w-1 shrink-0 ${CAT_BAR[task.category ?? 'other']}`} />

      <div className="flex-1 p-4 flex flex-col gap-2">
        {/* 标题 + 状态 */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-snug flex-1">{task.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE[task.status]}`}>
            {STATUS_LABEL[task.status]}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
        )}

        {/* 元信息行 */}
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          {task.assigned_avatar && (
            <span className="flex items-center gap-1">
              <span>{task.assigned_avatar}</span>
              <span>{task.assigned_name}</span>
            </span>
          )}
          {task.due_date && (
            <span className={overdue ? 'text-red-500 font-semibold' : ''}>
              📅 {task.due_date}
            </span>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 font-medium">
              🔁 {RECURRENCE_LABEL[task.recurrence]}
            </span>
          )}
          <span className="ml-auto font-semibold text-primary">+{task.points_value}分</span>
        </div>

        {/* 操作行 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority]}`}>
            {PRIORITY_LABEL[task.priority]}
          </span>
          <div className="ml-auto flex gap-1">
            {task.status === 'pending' && currentMember?.id === task.assigned_to && (
              <button onClick={handleComplete}
                className="text-xs px-3 py-1 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors">
                完成
              </button>
            )}
            {task.status === 'done' && canApprove && (
              <button onClick={handleApprove}
                className="text-xs px-3 py-1 bg-success text-white rounded-full hover:bg-success-dark transition-colors">
                审批
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete}
                className="text-xs px-2 py-1 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
