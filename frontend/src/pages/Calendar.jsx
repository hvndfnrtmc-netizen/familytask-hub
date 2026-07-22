import { useState, useEffect } from 'react';
import { getTasks } from '../api';
import { useFamily } from '../context/FamilyContext';
import TaskCard from '../components/TaskCard';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function Calendar() {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const { refreshMembers } = useFamily();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const loadTasks = () => getTasks().then(setTasks);
  useEffect(() => { loadTasks(); }, []);

  const handleRefresh = () => { loadTasks(); refreshMembers(); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const tasksByDate = tasks.reduce((acc, t) => {
    if (t.due_date) {
      acc[t.due_date] = acc[t.due_date] ?? [];
      acc[t.due_date].push(t);
    }
    return acc;
  }, {});

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const pad = n => String(n).padStart(2, '0');
  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">日历视图</h2>

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
            const day = i + 1;
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const dayTasks = tasksByDate[dateStr] ?? [];
            const isToday = dateStr === today.toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;
            return (
              <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative rounded-xl p-1 min-h-[2.5rem] flex flex-col items-center transition-all
                  ${isToday ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-gray-50'}
                  ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                <span className="text-sm">{day}</span>
                {dayTasks.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayTasks.slice(0, 3).map(t => (
                      <span key={t.id}
                        className={`w-1.5 h-1.5 rounded-full
                          ${t.status === 'approved' ? 'bg-green-400' : t.status === 'done' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">{selectedDate} 的任务 ({selectedTasks.length})</h3>
          {selectedTasks.length === 0
            ? <p className="text-gray-400 text-sm">当天无任务</p>
            : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedTasks.map(t => <TaskCard key={t.id} task={t} onRefresh={handleRefresh} />)}
              </div>
          }
        </div>
      )}
    </div>
  );
}
