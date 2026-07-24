import { useState } from 'react';
import { completeTask, approveTask, deleteTask, updateTask } from '../api';
import { useFamily } from '../context/FamilyContext';
import { CATEGORIES } from '../pages/Tasks';

const PRIORITY_BADGE = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-600',
};
const PRIORITY_LABEL  = { high: '紧急', medium: '普通', low: '低优' };
const STATUS_BADGE    = {
  pending: 'bg-blue-100 text-blue-700',
  done:    'bg-orange-100 text-orange-700',
  approved:'bg-green-100 text-green-700',
};
const STATUS_LABEL    = { pending: '待完成', done: '待审批', approved: '已完成' };
const RECURRENCE_LABEL = {
  daily: '每日', weekly: '每周', weekdays: '工作日', custom: '自定义',
};
const CAT_BAR = {
  academic: 'bg-blue-400', sport: 'bg-green-400',
  art: 'bg-purple-400',    habit: 'bg-orange-400', other: 'bg-gray-300',
};
const PRIORITIES = [
  { value: 'high', label: '紧急' },
  { value: 'medium', label: '普通' },
  { value: 'low', label: '低优' },
];

const POINTS_PRESETS = [5, 10, 15, 20, 30, 50];

// ── 任务编辑弹窗 ──────────────────────────────────────────────
function TaskEditModal({ task, members, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:       task.title       ?? '',
    description: task.description ?? '',
    due_date:    task.due_date    ?? '',
    due_time:    task.due_time    ?? '00:00',
    priority:    task.priority    ?? 'medium',
    assigned_to: task.assigned_to ? String(task.assigned_to) : '',
    points_value:task.points_value ?? 10,
    category:    task.category    ?? 'other',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    await updateTask(task.id, {
      ...form,
      assigned_to: form.assigned_to || null,
      due_date:    form.due_date    || null,
      due_time:    form.due_time    || '00:00',
    });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-4">
        <h3 className="text-base font-bold mb-4 text-gray-800">编辑任务</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="任务名称" value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

          <textarea placeholder="描述（可选）" value={form.description}
            onChange={e => set('description', e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />

          {/* 分配给谁：头像选择 */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">分配给</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button type="button" onClick={() => set('assigned_to', '')}
                className={`py-1.5 rounded-xl border text-xs transition-all
                  ${!form.assigned_to
                    ? 'border-primary bg-primary/5 font-semibold text-primary'
                    : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                不指定
              </button>
              {members.map(m => (
                <button key={m.id} type="button"
                  onClick={() => set('assigned_to', String(m.id))}
                  className={`py-1.5 rounded-xl border text-xs flex items-center justify-center gap-1 transition-all
                    ${form.assigned_to === String(m.id)
                      ? 'border-primary bg-primary/5 font-semibold text-primary'
                      : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                  <span>{m.avatar}</span><span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* 类别 */}
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>

          {/* 积分 */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">任务积分</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {POINTS_PRESETS.map(p => (
                <button key={p} type="button" onClick={() => set('points_value', p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
                    ${form.points_value === p
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-100 text-gray-600 border-transparent hover:bg-orange-100'}`}>
                  {p}分
                </button>
              ))}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5">
                <input
                  type="number" min={1} max={999}
                  value={POINTS_PRESETS.includes(form.points_value) ? '' : form.points_value}
                  placeholder="自定义"
                  onChange={e => { const v = parseInt(e.target.value); if (v >= 1) set('points_value', v); }}
                  className="w-14 text-xs text-center bg-transparent focus:outline-none text-gray-700 font-medium placeholder:text-gray-400" />
                <span className="text-xs text-gray-400">分</span>
              </div>
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

// ── 任务卡片 ──────────────────────────────────────────────────
export default function TaskCard({ task, onRefresh }) {
  const { currentMember, isAdmin, isParent, members } = useFamily();
  const canApprove = isAdmin || isParent;
  const canDelete  = isAdmin || isParent;
  const canEdit    = isAdmin || isParent;
  const cat = CATEGORIES.find(c => c.value === (task.category ?? 'other')) ?? CATEGORIES.at(-1);

  const [showEdit, setShowEdit] = useState(false);

  const handleComplete = async () => { await completeTask(task.id); onRefresh(); };
  const handleApprove  = async () => { await approveTask(task.id);  onRefresh(); };
  const handleDelete   = async e => {
    e.stopPropagation();
    if (confirm(`删除任务「${task.title}」？`)) { await deleteTask(task.id); onRefresh(); }
  };

  const overdue = task.due_date && task.status === 'pending' &&
    new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <>
      <div
        onClick={() => canEdit && setShowEdit(true)}
        className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex
          ${overdue ? 'border-red-200' : 'border-orange-100'}
          ${canEdit ? 'cursor-pointer hover:shadow-md hover:border-primary/30' : 'hover:shadow-md'}
          transition-all`}>

        <div className={`w-1 shrink-0 ${CAT_BAR[task.category ?? 'other']}`} />

        <div className="flex-1 p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-800 text-sm leading-snug flex-1">{task.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE[task.status]}`}>
              {STATUS_LABEL[task.status]}
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            {task.assigned_avatar && (
              <span className="flex items-center gap-1">
                <span>{task.assigned_avatar}</span>
                <span>{task.assigned_name}</span>
              </span>
            )}
            {task.due_date && (
              <span className={overdue ? 'text-red-500 font-semibold' : ''}>
                📅 {task.due_date}{task.due_time && task.due_time !== '00:00' ? ` ${task.due_time}` : ''}
              </span>
            )}
            {task.recurrence && task.recurrence !== 'none' && (
              <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 font-medium">
                🔁 {RECURRENCE_LABEL[task.recurrence]}
              </span>
            )}
            <span className="ml-auto font-semibold text-primary">+{task.points_value}分</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority]}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            <div className="ml-auto flex gap-1" onClick={e => e.stopPropagation()}>
              {task.status === 'pending' && currentMember?.id === task.assigned_to && (
                <button onClick={handleComplete}
                  className="text-xs px-3 py-1 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors">
                  完成
                </button>
              )}
              {task.status === 'done' && canApprove && (
                <button onClick={e => { e.stopPropagation(); handleApprove(); }}
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

      {showEdit && (
        <TaskEditModal
          task={task}
          members={members}
          onClose={() => setShowEdit(false)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
