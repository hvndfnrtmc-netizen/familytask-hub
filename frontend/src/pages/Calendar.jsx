import { useState, useEffect, useCallback } from 'react';
import { getTasks, getEvents, createEvent, updateEvent, deleteEvent } from '../api';
import { useFamily } from '../context/FamilyContext';

// 每位成员固定颜色（按数组顺序轮流分配，最多支持8人）
const MEMBER_COLORS = [
  { dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700',   bar: 'border-l-blue-400'   },
  { dot: 'bg-pink-400',   badge: 'bg-pink-100 text-pink-700',   bar: 'border-l-pink-400'   },
  { dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700', bar: 'border-l-amber-400'  },
  { dot: 'bg-green-400',  badge: 'bg-green-100 text-green-700', bar: 'border-l-green-400'  },
  { dot: 'bg-purple-400', badge: 'bg-purple-100 text-purple-700',bar: 'border-l-purple-400'},
  { dot: 'bg-cyan-400',   badge: 'bg-cyan-100 text-cyan-700',   bar: 'border-l-cyan-400'   },
  { dot: 'bg-rose-400',   badge: 'bg-rose-100 text-rose-700',   bar: 'border-l-rose-400'   },
  { dot: 'bg-teal-400',   badge: 'bg-teal-100 text-teal-700',   bar: 'border-l-teal-400'   },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const RECURRENCE_OPTIONS = [
  { value: 'none',     label: '单次',   icon: '1️⃣' },
  { value: 'daily',    label: '每日',   icon: '☀️' },
  { value: 'weekdays', label: '工作日', icon: '💼' },
  { value: 'weekly',   label: '每周',   icon: '📅' },
  { value: 'interval', label: '间隔天', icon: '🔢' },
  { value: 'custom',   label: '指定星期', icon: '⚙️' },
];

// 间隔天数预设
const INTERVAL_PRESETS = [2, 3, 4, 5, 6, 10, 14];

const RECURRENCE_LABEL = {
  daily: '每日', weekly: '每周', weekdays: '工作日',
  interval: '间隔', custom: '指定星期',
};

function pad(n) { return String(n).padStart(2, '0'); }
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }

// ── 手动日程表单（新建 & 编辑） ──────────────────────────────
function EventForm({ date, members, memberColorMap, onClose, onSave, initial }) {
  // 回填逻辑：编辑时解析已存字段
  const initForm = () => {
    if (!initial) return {
      title: '', member_id: '', note: '', time: '00:00', end_time: '',
      recurrence: 'none', recurrence_days: [], interval: 2, recurrence_end_date: '',
    };
    const rec = initial.recurrence || 'none';
    let recurrence_days = [];
    let interval = 2;
    if (rec === 'custom' && initial.recurrence_days) {
      try { recurrence_days = JSON.parse(initial.recurrence_days); } catch {}
    } else if (rec === 'interval' && initial.recurrence_days) {
      interval = parseInt(initial.recurrence_days) || 2;
    }
    return {
      title: initial.title || '',
      member_id: initial.member_id ? String(initial.member_id) : '',
      note: initial.note || '',
      time: initial.time || '00:00',
      end_time: initial.end_time || '',
      recurrence: rec,
      recurrence_days,
      interval,
      recurrence_end_date: initial.recurrence_end_date || '',
    };
  };

  const [form, setForm] = useState(initForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = day => setForm(f => {
    const days = f.recurrence_days.includes(day)
      ? f.recurrence_days.filter(d => d !== day)
      : [...f.recurrence_days, day].sort();
    return { ...f, recurrence_days: days };
  });

  const handleSubmit = async e => {
    e.preventDefault();
    let recurrence_days_val = null;
    if (form.recurrence === 'custom' && form.recurrence_days.length)
      recurrence_days_val = JSON.stringify(form.recurrence_days);
    else if (form.recurrence === 'interval')
      recurrence_days_val = String(form.interval);
    await onSave({
      ...form,
      date,
      time: form.time || '00:00',
      end_time: form.end_time || null,
      member_id: form.member_id || null,
      recurrence_days: recurrence_days_val,
      recurrence_end_date: form.recurrence !== 'none' ? form.recurrence_end_date || null : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 my-4">
        <h3 className="text-base font-bold mb-1 text-gray-800">{initial ? '编辑日程' : '添加日程'}</h3>
        <p className="text-xs text-gray-400 mb-4">{date}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="日程标题（如：爸爸上夜班）" value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

          {/* 时间段 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">⏰</span>
            <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <span className="text-xs text-gray-300">—</span>
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
              placeholder="结束（可选）"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* 关联成员 */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">关联成员</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button type="button" onClick={() => set('member_id', '')}
                className={`py-1.5 rounded-xl border text-xs transition-all
                  ${!form.member_id ? 'border-gray-400 bg-gray-50 font-semibold text-gray-700' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                全家
              </button>
              {members.map(m => {
                const col = memberColorMap[m.id];
                const sel = form.member_id === String(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => set('member_id', String(m.id))}
                    className={`py-1.5 rounded-xl border text-xs transition-all flex items-center justify-center gap-1
                      ${sel ? `${col.badge} border-transparent font-semibold` : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                    <span>{m.avatar}</span><span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <textarea placeholder="备注（可选）" value={form.note}
            onChange={e => set('note', e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />

          {/* 循环设置 */}
          <div className="rounded-xl border border-gray-200 p-3 space-y-2.5">
            <p className="text-xs font-medium text-gray-500">🔁 重复方式</p>

            {/* 模式选择：3列×2行 */}
            <div className="grid grid-cols-3 gap-1.5">
              {RECURRENCE_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set('recurrence', opt.value)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs transition-all
                    ${form.recurrence === opt.value
                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold'
                      : 'border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 text-gray-600'}`}>
                  <span className="text-base leading-none shrink-0">{opt.icon}</span>
                  <span className="leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* 间隔天数 */}
            {form.recurrence === 'interval' && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">每隔几天重复一次</p>
                <div className="flex gap-1.5 flex-wrap">
                  {INTERVAL_PRESETS.map(n => (
                    <button key={n} type="button" onClick={() => set('interval', n)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
                        ${form.interval === n
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'bg-gray-100 text-gray-600 border-transparent hover:bg-purple-100'}`}>
                      每{n}天
                    </button>
                  ))}
                  {/* 自定义输入 */}
                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                    <span className="text-xs text-gray-400">每</span>
                    <input
                      type="number" min={2} max={90}
                      value={INTERVAL_PRESETS.includes(form.interval) ? '' : form.interval}
                      placeholder="N"
                      onChange={e => { const v = parseInt(e.target.value); if (v >= 2) set('interval', v); }}
                      className="w-10 text-xs text-center bg-transparent focus:outline-none text-gray-700 font-medium" />
                    <span className="text-xs text-gray-400">天</span>
                  </div>
                </div>
              </div>
            )}

            {/* 指定星期 */}
            {form.recurrence === 'custom' && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">选择每周重复的星期</p>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((label, i) => (
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

            {/* 结束日期 */}
            {form.recurrence !== 'none' && (
              <div>
                <p className="text-xs text-gray-400 mb-1">结束日期（不填则持续重复）</p>
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
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────
export default function Calendar() {
  const { members } = useFamily();
  const [tasks, setTasks]   = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent]   = useState(null); // 正在编辑的日程对象

  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // 成员颜色映射表（稳定，按 members 数组顺序）
  const memberColorMap = Object.fromEntries(
    members.map((m, i) => [m.id, MEMBER_COLORS[i % MEMBER_COLORS.length]])
  );

  const monthStr = `${year}-${pad(month + 1)}`;

  const loadAll = useCallback(() => {
    getTasks().then(setTasks);
    getEvents(monthStr).then(setEvents);
  }, [monthStr]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefresh = () => { loadAll(); };

  const handleSaveEvent = async data => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data);
    } else {
      await createEvent(data);
    }
    setEditingEvent(null);
    loadAll();
  };
  const handleDeleteEvent = async id => {
    await deleteEvent(id);
    loadAll();
  };
  const handleEditEvent = ev => {
    setEditingEvent(ev);
    setShowEventForm(true);
  };

  // 按日期建立索引
  const tasksByDate = tasks.reduce((acc, t) => {
    if (t.due_date) { (acc[t.due_date] = acc[t.due_date] ?? []).push(t); }
    return acc;
  }, {});
  const eventsByDate = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] ?? []).push(e);
    return acc;
  }, {});

  const prevMonth = () => month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDay(year, month);
  const todayStr    = today.toISOString().split('T')[0];

  const selEvents = selectedDate
    ? [...(eventsByDate[selectedDate] ?? [])].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'))
    : [];
  // 只展示未完成任务（pending + done/待审批，排除已完成）
  const selPendingTasks = selectedDate
    ? (tasksByDate[selectedDate] ?? []).filter(t => t.status !== 'approved')
    : [];

  // 按成员分组（未完成任务）
  const pendingByMember = members.map(m => ({
    member: m,
    tasks: selPendingTasks.filter(t => t.assigned_to === m.id),
  })).filter(g => g.tasks.length > 0);
  const unassignedPending = selPendingTasks.filter(t => !t.assigned_to);

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">家庭日历</h2>

      {/* 成员颜色图例 */}
      <div className="flex flex-wrap gap-2">
        {members.map(m => {
          const col = memberColorMap[m.id];
          return (
            <span key={m.id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${col.badge}`}>
              <span>{m.avatar}</span><span>{m.name}</span>
            </span>
          );
        })}
      </div>

      {/* 月历 */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">←</button>
          <span className="font-semibold text-gray-700">{year} 年 {month + 1} 月</span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day        = i + 1;
            const dateStr    = `${year}-${pad(month + 1)}-${pad(day)}`;
            const dayEvents  = eventsByDate[dateStr] ?? [];
            const dayPending = (tasksByDate[dateStr] ?? []).filter(t => t.status !== 'approved');
            const isToday    = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative rounded-xl p-1.5 min-h-[4.5rem] flex flex-col gap-0.5 items-start w-full transition-all text-left
                  ${isToday    ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-gray-50'}
                  ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                {/* 日期数字 */}
                <span className="text-xs self-center w-full text-center">{day}</span>

                {/* 日程：橙色标题 */}
                {dayEvents.slice(0, 2).map(ev => {
                  const col = ev.member_id ? memberColorMap[ev.member_id] : null;
                  return (
                    <span key={ev.id}
                      className={`w-full truncate text-[10px] leading-tight px-1 py-0.5 rounded
                        ${col ? col.badge : 'bg-orange-50 text-orange-600'}`}>
                      {ev.time && ev.time !== '00:00' ? `${ev.time}${ev.end_time ? `–${ev.end_time}` : ''} ` : ''}{ev.member_avatar ? `${ev.member_avatar} ` : ''}{ev.title}
                    </span>
                  );
                })}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-orange-400 px-1">+{dayEvents.length - 2} 日程</span>
                )}

                {/* 未完成任务：按关联人显示对应成员色 */}
                {dayPending.slice(0, 2).map(t => {
                  const col = t.assigned_to ? memberColorMap[t.assigned_to] : null;
                  return (
                    <span key={t.id}
                      className={`w-full truncate text-[10px] leading-tight px-1 py-0.5 rounded
                        ${col ? col.badge : 'bg-gray-100 text-gray-500'}`}>
                      {t.assigned_avatar ? `${t.assigned_avatar} ` : ''}{t.title}
                    </span>
                  );
                })}
                {dayPending.length > 2 && (
                  <span className="text-[9px] text-gray-400 px-1">+{dayPending.length - 2} 任务</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 选中日期详情 */}
      {selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-700">
              {selectedDate}
              <span className="ml-2 text-sm font-normal text-gray-400">
                {selPendingTasks.length} 个待完成 · {selEvents.length} 个日程
              </span>
            </h3>
            <button onClick={() => setShowEventForm(true)}
              className="px-4 py-1.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
              + 添加日程
            </button>
          </div>

          {/* ── 日程安排 ── */}
          {selEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                📅 日程安排
              </p>
              {selEvents.map(ev => {
                const col = ev.member_id ? memberColorMap[ev.member_id] : null;
                return (
                  <div key={ev.id}
                    className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3
                      border-l-4 ${col ? col.bar : 'border-l-gray-200'} border-gray-100
                      hover:shadow-sm transition-shadow cursor-pointer`}
                    onClick={() => handleEditEvent(ev)}>
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      {ev.member_avatar
                        ? <span className="text-base shrink-0">{ev.member_avatar}</span>
                        : <span className="text-sm shrink-0">👨‍👩‍👧</span>}
                      <span className="font-medium text-sm text-gray-800">{ev.title}</span>
                      {ev.time && ev.time !== '00:00' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 font-medium shrink-0">
                          ⏰ {ev.time}{ev.end_time ? ` — ${ev.end_time}` : ''}
                        </span>
                      )}
                      {ev.member_name && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${col?.badge ?? 'bg-gray-100 text-gray-500'}`}>
                          {ev.member_name}
                        </span>
                      )}
                      {ev.recurrence && ev.recurrence !== 'none' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 font-medium shrink-0">
                          🔁 {ev.recurrence === 'interval' ? `每${ev.recurrence_days}天` : RECURRENCE_LABEL[ev.recurrence]}
                        </span>
                      )}
                      {ev.note && <span className="text-xs text-gray-400 truncate">{ev.note}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-gray-300 text-xs px-1">✏️</span>
                      <button onClick={e => { e.stopPropagation(); handleDeleteEvent(ev.id); }}
                        className="text-gray-300 hover:text-red-400 transition-colors text-sm px-1">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 未完成任务清单（按成员分组，轻量列表） ── */}
          {selPendingTasks.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                📋 待完成任务
              </p>

              {pendingByMember.map(({ member, tasks: mTasks }) => {
                const col = memberColorMap[member.id];
                return (
                  <div key={member.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className={`flex items-center gap-2 px-3 py-2 ${col.bg}`}>
                      <span>{member.avatar}</span>
                      <span className={`text-xs font-semibold ${col.color}`}>{member.name}</span>
                      <span className={`text-xs ${col.color} opacity-60`}>({mTasks.length})</span>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {mTasks.map(t => (
                        <li key={t.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0
                            ${t.status === 'done' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                          <span className="flex-1 text-gray-700">{t.title}</span>
                          {t.status === 'done' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 shrink-0">待审批</span>
                          )}
                          <span className="text-xs text-primary font-medium shrink-0">+{t.points_value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {unassignedPending.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500">未分配</span>
                    <span className="text-xs text-gray-400">({unassignedPending.length})</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {unassignedPending.map(t => (
                      <li key={t.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                        <span className="flex-1 text-gray-700">{t.title}</span>
                        <span className="text-xs text-primary font-medium shrink-0">+{t.points_value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {selPendingTasks.length === 0 && selEvents.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">当天暂无安排</p>
          )}
        </div>
      )}

      {showEventForm && selectedDate && (
        <EventForm
          date={selectedDate}
          members={members}
          memberColorMap={memberColorMap}
          initial={editingEvent}
          onClose={() => { setShowEventForm(false); setEditingEvent(null); }}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
