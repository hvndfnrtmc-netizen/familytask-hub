import { useState, useEffect, useCallback } from 'react';
import { getTasks, getEvents, createEvent, deleteEvent } from '../api';
import { useFamily } from '../context/FamilyContext';
import TaskCard from '../components/TaskCard';

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

function pad(n) { return String(n).padStart(2, '0'); }
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }

// ── 手动日程表单 ──────────────────────────────────────────────
function EventForm({ date, members, memberColorMap, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', member_id: '', note: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    await onSave({ ...form, date, member_id: form.member_id || null });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold mb-1 text-gray-800">添加日程</h3>
        <p className="text-xs text-gray-400 mb-4">{date}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="日程标题（如：爸爸上夜班）" value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

          {/* 关联成员（可不选） */}
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

          <textarea placeholder="备注（可选）" value={form.note}
            onChange={e => set('note', e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />

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
  const { members, refreshMembers } = useFamily();
  const [tasks, setTasks]   = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);

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

  const handleRefresh = () => { loadAll(); refreshMembers(); };

  const handleSaveEvent = async data => {
    await createEvent(data);
    loadAll();
  };
  const handleDeleteEvent = async id => {
    await deleteEvent(id);
    loadAll();
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

  const selTasks  = selectedDate ? (tasksByDate[selectedDate]  ?? []) : [];
  const selEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  // 按成员分组展示当天任务
  const tasksByMember = members.map(m => ({
    member: m,
    tasks: selTasks.filter(t => t.assigned_to === m.id),
  })).filter(g => g.tasks.length > 0);
  const unassignedTasks = selTasks.filter(t => !t.assigned_to);

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
            const day     = i + 1;
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const dayTasks  = tasksByDate[dateStr]  ?? [];
            const dayEvents = eventsByDate[dateStr] ?? [];
            const isToday    = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            // 收集该天涉及的成员 id（任务 + 日程）
            const memberIds = [
              ...new Set([
                ...dayTasks.filter(t => t.assigned_to).map(t => t.assigned_to),
                ...dayEvents.filter(e => e.member_id).map(e => e.member_id),
              ])
            ];
            const hasUnassigned = dayTasks.some(t => !t.assigned_to) ||
                                  dayEvents.some(e => !e.member_id);

            return (
              <button key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative rounded-xl p-1 min-h-[3rem] flex flex-col items-center transition-all
                  ${isToday    ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-gray-50'}
                  ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                <span className="text-sm">{day}</span>
                {/* 成员色点 */}
                {(memberIds.length > 0 || hasUnassigned) && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
                    {memberIds.slice(0, 4).map(mid => (
                      <span key={mid}
                        className={`w-1.5 h-1.5 rounded-full ${memberColorMap[mid]?.dot ?? 'bg-gray-300'}`} />
                    ))}
                    {hasUnassigned && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                )}
                {/* 手动日程小标记 */}
                {dayEvents.length > 0 && (
                  <span className="text-[9px] leading-none mt-0.5 text-orange-400 font-bold">
                    {'★'.repeat(Math.min(dayEvents.length, 3))}
                  </span>
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
                {selTasks.length} 个任务 · {selEvents.length} 个日程
              </span>
            </h3>
            <button onClick={() => setShowEventForm(true)}
              className="px-4 py-1.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
              + 添加日程
            </button>
          </div>

          {/* 手动日程列表 */}
          {selEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">日程安排</p>
              {selEvents.map(ev => {
                const col = ev.member_id ? memberColorMap[ev.member_id] : null;
                return (
                  <div key={ev.id}
                    className={`flex items-start gap-3 bg-white rounded-xl border px-4 py-3
                      border-l-4 ${col ? col.bar : 'border-l-gray-200'} border-gray-100`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ev.member_avatar
                          ? <span className="text-base">{ev.member_avatar}</span>
                          : <span className="text-xs text-gray-400">👨‍👩‍👧</span>}
                        <span className="font-medium text-sm text-gray-800">{ev.title}</span>
                        {ev.member_name && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${col?.badge ?? 'bg-gray-100 text-gray-500'}`}>
                            {ev.member_name}
                          </span>
                        )}
                      </div>
                      {ev.note && <p className="text-xs text-gray-400 mt-1">{ev.note}</p>}
                    </div>
                    <button onClick={() => handleDeleteEvent(ev.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm shrink-0">✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 任务按成员分组 */}
          {selTasks.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">任务安排</p>

              {tasksByMember.map(({ member, tasks: mTasks }) => {
                const col = memberColorMap[member.id];
                return (
                  <div key={member.id}>
                    <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl ${col.badge} w-fit`}>
                      <span>{member.avatar}</span>
                      <span className="text-xs font-semibold">{member.name}</span>
                      <span className="text-xs opacity-70">({mTasks.length})</span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mTasks.map(t => <TaskCard key={t.id} task={t} onRefresh={handleRefresh} />)}
                    </div>
                  </div>
                );
              })}

              {unassignedTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-gray-100 w-fit">
                    <span className="text-xs font-semibold text-gray-500">未分配</span>
                    <span className="text-xs text-gray-400">({unassignedTasks.length})</span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unassignedTasks.map(t => <TaskCard key={t.id} task={t} onRefresh={handleRefresh} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {selTasks.length === 0 && selEvents.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">当天暂无安排</p>
          )}
        </div>
      )}

      {showEventForm && selectedDate && (
        <EventForm
          date={selectedDate}
          members={members}
          memberColorMap={memberColorMap}
          onClose={() => setShowEventForm(false)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
