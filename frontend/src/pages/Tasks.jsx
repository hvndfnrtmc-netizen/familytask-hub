import { useState, useEffect, useCallback } from 'react';
import { getTasks, createTask } from '../api';
import { useFamily } from '../context/FamilyContext';
import TaskCard from '../components/TaskCard';

const PRIORITIES = [
  { value: 'high', label: '紧急' },
  { value: 'medium', label: '普通' },
  { value: 'low', label: '低优' },
];

// 类别定义：value / label / icon / 色系（用于分组标题）
export const CATEGORIES = [
  { value: 'academic',  label: '学科类',   icon: '📚', color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  { value: 'sport',     label: '体育运动类', icon: '⚽', color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-200' },
  { value: 'art',       label: '艺术文化类', icon: '🎨', color: 'text-purple-600',bg: 'bg-purple-50', border: 'border-purple-200' },
  { value: 'habit',     label: '生活习惯类', icon: '🏠', color: 'text-orange-600',bg: 'bg-orange-50', border: 'border-orange-200' },
  { value: 'other',     label: '其他',      icon: '📌', color: 'text-gray-500',  bg: 'bg-gray-50',   border: 'border-gray-200' },
];

// 预设任务附带推荐类别
const PRESET_TASKS = [
  { title: '洗碗',     icon: '🍽️', points: 10, category: 'habit'    },
  { title: '拖地',     icon: '🧹', points: 15, category: 'habit'    },
  { title: '整理书桌', icon: '📚', points: 10, category: 'habit'    },
  { title: '倒垃圾',   icon: '🗑️', points: 5,  category: 'habit'    },
  { title: '语文',     icon: '📖', points: 20, category: 'academic' },
  { title: '英语',     icon: '🔤', points: 20, category: 'academic' },
  { title: '数学',     icon: '🔢', points: 20, category: 'academic' },
  { title: '科学',     icon: '🔬', points: 20, category: 'academic' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none',     label: '单次',   icon: '1️⃣' },
  { value: 'daily',    label: '每日',   icon: '☀️' },
  { value: 'weekdays', label: '工作日', icon: '💼' },
  { value: 'weekly',   label: '每周',   icon: '📅' },
  { value: 'custom',   label: '自定义', icon: '⚙️' },
];

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

// ── 新建任务表单 ──────────────────────────────────────────────
function TaskForm({ members, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', due_date: '', priority: 'medium',
    assigned_to: '', points_value: 10, category: 'other',
    recurrence: 'none', recurrence_days: [], recurrence_end_date: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const applyPreset = preset => setForm(f => ({
    ...f, title: preset.title, points_value: preset.points, category: preset.category,
  }));

  const toggleDay = day => setForm(f => {
    const days = f.recurrence_days.includes(day)
      ? f.recurrence_days.filter(d => d !== day)
      : [...f.recurrence_days, day].sort();
    return { ...f, recurrence_days: days };
  });

  const handleSubmit = async e => {
    e.preventDefault();
    await onSave({
      ...form,
      recurrence_days: form.recurrence === 'custom' && form.recurrence_days.length
        ? JSON.stringify(form.recurrence_days) : null,
      recurrence_end_date: form.recurrence !== 'none' ? form.recurrence_end_date || null : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-4">
        <h3 className="text-lg font-bold mb-3 text-gray-800">新建任务</h3>

        {/* 预设快速选择 */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-2">快速选择</p>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_TASKS.map(p => (
              <button key={p.title} type="button" onClick={() => applyPreset(p)}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl border text-xs transition-all
                  ${form.title === p.title
                    ? 'border-primary bg-primary/5 text-primary font-semibold'
                    : 'border-gray-100 hover:border-primary/40 hover:bg-orange-50 text-gray-600'}`}>
                <span className="text-lg leading-none">{p.icon}</span>
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="任务名称（可自定义）" value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea placeholder="描述（可选）" value={form.description}
            onChange={e => set('description', e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />

          {/* 类别选择 */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">任务类别</p>
            <div className="grid grid-cols-5 gap-1">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => set('category', c.value)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl border text-xs transition-all
                    ${form.category === c.value
                      ? `${c.border} ${c.bg} ${c.color} font-semibold`
                      : 'border-gray-100 hover:bg-gray-50 text-gray-500'}`}>
                  <span className="text-base leading-none">{c.icon}</span>
                  <span className="leading-tight text-center">{c.label.replace('类', '')}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">分配给…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
            </select>
            <input type="number" min={1} max={100} value={form.points_value}
              onChange={e => set('points_value', Number(e.target.value))}
              placeholder="积分值"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* 循环设置 */}
          <div className="rounded-xl border border-gray-200 p-3 space-y-2.5">
            <p className="text-xs font-medium text-gray-500">🔁 循环设置</p>
            <div className="grid grid-cols-5 gap-1">
              {RECURRENCE_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set('recurrence', opt.value)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl border text-xs transition-all
                    ${form.recurrence === opt.value
                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold'
                      : 'border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 text-gray-600'}`}>
                  <span className="text-base leading-none">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            {form.recurrence === 'custom' && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">选择重复的星期</p>
                <div className="flex gap-1.5">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-all
                        ${form.recurrence_days.includes(i)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-purple-100'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.recurrence !== 'none' && (
              <div>
                <p className="text-xs text-gray-400 mb-1">结束日期（可选，不填则持续循环）</p>
                <input type="date" value={form.recurrence_end_date}
                  onChange={e => set('recurrence_end_date', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
            )}
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

// ── 分组标题行 ───────────────────────────────────────────────
function CategorySection({ cat, tasks, onRefresh }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button onClick={() => setCollapsed(c => !c)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-2 transition-colors ${cat.bg} hover:opacity-80`}>
        <span className="text-lg">{cat.icon}</span>
        <span className={`font-semibold text-sm ${cat.color}`}>{cat.label}</span>
        <span className={`text-xs ml-1 px-1.5 py-0.5 rounded-full bg-white/70 ${cat.color}`}>{tasks.length}</span>
        <span className={`ml-auto text-xs ${cat.color} opacity-60`}>{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {tasks.map(t => <TaskCard key={t.id} task={t} onRefresh={onRefresh} />)}
        </div>
      )}
    </div>
  );
}

// ── 主页面 ──────────────────────────────────────────────────
export default function Tasks() {
  const { members, currentMember, refreshMembers } = useFamily();
  const [tasks, setTasks] = useState([]);
  const [filterMember, setFilterMember] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDone, setShowDone] = useState(false);   // 已完成区域是否展开

  const loadTasks = useCallback(() => {
    const params = {};
    if (filterMember) params.assigned_to = filterMember;
    getTasks(params).then(setTasks);
  }, [filterMember]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleRefresh = () => { loadTasks(); refreshMembers(); };
  const handleCreate = async data => {
    await createTask({ ...data, created_by: currentMember?.id });
    handleRefresh();
  };

  // 分离：待完成（pending + done/待审批）vs 已完成（approved）
  const activeTasks = tasks.filter(t => t.status !== 'approved');
  const doneTasks   = tasks.filter(t => t.status === 'approved');

  // 待完成按类别分组（保持 CATEGORIES 定义顺序，空组不展示）
  const grouped = CATEGORIES.map(cat => ({
    cat,
    tasks: activeTasks.filter(t => (t.category ?? 'other') === cat.value),
  })).filter(g => g.tasks.length > 0);

  return (
    <div className="p-6 space-y-5">
      {/* 顶栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">任务管理</h2>
        <button onClick={() => setShowForm(true)}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
          + 新建任务
        </button>
      </div>

      {/* 成员筛选 */}
      <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
        className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
        <option value="">全部成员</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}
      </select>

      {/* ── 待完成区域 ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-base font-bold text-gray-700">待完成</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
            {activeTasks.length}
          </span>
        </div>

        {grouped.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🎉</div>
            <p>所有任务都已完成！</p>
          </div>
        ) : (
          grouped.map(({ cat, tasks: catTasks }) => (
            <CategorySection key={cat.value} cat={cat} tasks={catTasks} onRefresh={handleRefresh} />
          ))
        )}
      </div>

      {/* ── 已完成区域（可折叠） ── */}
      {doneTasks.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <button onClick={() => setShowDone(v => !v)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
            <span className="font-semibold">已完成</span>
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-xs font-medium">
              {doneTasks.length}
            </span>
            <span className="ml-1 text-xs opacity-60">{showDone ? '▼ 隐藏' : '▶ 展开'}</span>
          </button>

          {showDone && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {doneTasks.map(t => <TaskCard key={t.id} task={t} onRefresh={handleRefresh} />)}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <TaskForm members={members} currentMember={currentMember}
          onClose={() => setShowForm(false)} onSave={handleCreate} />
      )}
    </div>
  );
}
