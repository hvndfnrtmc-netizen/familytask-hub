import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { getTasks, getEvents, createEvent, updateEvent, deleteEvent } from '../../utils/api';
import { getState, refreshMembers } from '../../store/family';
import './index.scss';

const MEMBER_COLORS = ['#93c5fd','#f9a8d4','#fcd34d','#86efac','#c4b5fd','#67e8f9','#fda4af','#5eead4'];
const RECURRENCE_LABEL = { daily:'每日', weekly:'每周', weekdays:'工作日', interval:'间隔', custom:'指定星期' };

function pad(n) { return String(n).padStart(2,'0'); }
function getDaysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m)    { return new Date(y,m,1).getDay(); }

export default class Calendar extends Component {
  config = { navigationBarTitleText: '家庭日历' };

  state = {
    tasks:[], events:[], members:[], memberColors:{},
    year: new Date().getFullYear(), month: new Date().getMonth(),
    selectedDate: null, showForm: false, editEvent: null,
    form: { title:'', member_id:'', note:'', recurrence:'none', recurrence_end_date:'' },
  };

  async componentDidShow() {
    await refreshMembers();
    const { members } = getState();
    const mc = {};
    members.forEach((m,i) => { mc[m.id] = MEMBER_COLORS[i % MEMBER_COLORS.length]; });
    const { year, month } = this.state;
    const monthStr = `${year}-${pad(month+1)}`;
    const [tasks, events] = await Promise.all([getTasks(), getEvents(monthStr)]);
    this.setState({ tasks, events, members, memberColors: mc });
  }

  async loadMonth() {
    const { year, month } = this.state;
    const monthStr = `${year}-${pad(month+1)}`;
    const events = await getEvents(monthStr);
    this.setState({ events });
  }

  prevMonth = () => {
    this.setState(s => {
      const m = s.month === 0 ? 11 : s.month - 1;
      const y = s.month === 0 ? s.year - 1 : s.year;
      return { year: y, month: m, selectedDate: null };
    }, this.loadMonth);
  };
  nextMonth = () => {
    this.setState(s => {
      const m = s.month === 11 ? 0 : s.month + 1;
      const y = s.month === 11 ? s.year + 1 : s.year;
      return { year: y, month: m, selectedDate: null };
    }, this.loadMonth);
  };

  openEventForm(ev=null) {
    const form = ev
      ? { title: ev.title, member_id: ev.member_id ? String(ev.member_id) : '', note: ev.note||'', recurrence: ev.recurrence||'none', recurrence_end_date: ev.recurrence_end_date||'' }
      : { title:'', member_id:'', note:'', recurrence:'none', recurrence_end_date:'' };
    this.setState({ showForm:true, editEvent:ev, form });
  }

  setForm = (k,v) => this.setState(s=>({ form:{...s.form,[k]:v} }));

  handleSaveEvent = async () => {
    const { form, editEvent, selectedDate } = this.state;
    if (!form.title) return;
    const data = { ...form, date: selectedDate, member_id: form.member_id||null };
    if (editEvent) await updateEvent(editEvent.id, data);
    else await createEvent(data);
    this.setState({ showForm:false });
    await this.loadMonth();
  };

  handleDeleteEvent = async (id) => {
    await deleteEvent(id);
    await this.loadMonth();
  };

  render() {
    const { tasks, events, members, memberColors, year, month, selectedDate, showForm, editEvent, form } = this.state;
    const today = new Date().toISOString().split('T')[0];
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay    = getFirstDay(year, month);

    const tasksByDate  = tasks.reduce((a,t) => { if(t.due_date){ (a[t.due_date]=a[t.due_date]??[]).push(t); } return a; },{});
    const eventsByDate = events.reduce((a,e) => { (a[e.date]=a[e.date]??[]).push(e); return a; },{});

    const selEvents  = selectedDate ? (eventsByDate[selectedDate]??[]) : [];
    const selPending = selectedDate ? (tasksByDate[selectedDate]??[]).filter(t=>t.status!=='approved') : [];

    const WEEKDAYS = ['日','一','二','三','四','五','六'];

    return (
      <View className="page">
        {/* 月历 */}
        <View className="calendar-card">
          <View className="cal-nav">
            <Text className="nav-btn" onClick={this.prevMonth}>←</Text>
            <Text className="cal-title">{year} 年 {month+1} 月</Text>
            <Text className="nav-btn" onClick={this.nextMonth}>→</Text>
          </View>
          <View className="weekday-row">
            {WEEKDAYS.map(d=><Text key={d} className="weekday">{d}</Text>)}
          </View>
          <View className="days-grid">
            {Array.from({length:firstDay}).map((_,i)=><View key={`e${i}`} className="day-empty"/>)}
            {Array.from({length:daysInMonth},(_,i)=>{
              const day     = i+1;
              const dateStr = `${year}-${pad(month+1)}-${pad(day)}`;
              const dayEvs  = eventsByDate[dateStr]??[];
              const dayPend = (tasksByDate[dateStr]??[]).filter(t=>t.status!=='approved');
              const isToday = dateStr===today;
              const isSel   = dateStr===selectedDate;
              return (
                <View key={day} className={`day-cell ${isToday?'today':''} ${isSel?'selected':''}`}
                  onClick={()=>this.setState({selectedDate:isSel?null:dateStr})}>
                  <Text className="day-num">{day}</Text>
                  {dayEvs.slice(0,1).map(ev=>(
                    <Text key={ev.id} className="day-ev" style={{background: ev.member_id ? memberColors[ev.member_id]+'33' : '#fed7aa66', color: ev.member_id ? memberColors[ev.member_id] : '#c2410c'}}>
                      {ev.member_avatar?`${ev.member_avatar} `:''}{ev.title}
                    </Text>
                  ))}
                  {dayPend.slice(0,1).map(t=>(
                    <Text key={t.id} className="day-task" style={{background: t.assigned_to ? memberColors[t.assigned_to]+'22' : '#f3f4f6', color: t.assigned_to ? memberColors[t.assigned_to] : '#9ca3af'}}>
                      {t.assigned_avatar?`${t.assigned_avatar} `:''}{t.title}
                    </Text>
                  ))}
                  {(dayEvs.length+dayPend.length)>2 && <Text className="day-more">+{dayEvs.length+dayPend.length-2}</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {/* 选中日详情 */}
        {selectedDate && (
          <ScrollView scrollY className="detail-scroll">
            <View className="detail-header">
              <Text className="detail-date">{selectedDate}</Text>
              <View className="add-ev-btn" onClick={()=>this.openEventForm()}>
                <Text>+ 日程</Text>
              </View>
            </View>

            {selEvents.length>0 && (
              <View className="detail-section">
                <Text className="section-title">📅 日程安排</Text>
                {selEvents.map(ev=>{
                  const col = ev.member_id ? memberColors[ev.member_id] : '#f97316';
                  return (
                    <View key={ev.id} className="ev-row" style={{borderLeftColor:col}}
                      onClick={()=>this.openEventForm(ev)}>
                      <View className="ev-content">
                        <Text className="ev-title">{ev.member_avatar??'👨‍👩‍👧'} {ev.title}</Text>
                        {ev.member_name && <Text className="ev-member">{ev.member_name}</Text>}
                        {ev.recurrence&&ev.recurrence!=='none' && (
                          <Text className="ev-recur">🔁 {ev.recurrence==='interval'?`每${ev.recurrence_days}天`:RECURRENCE_LABEL[ev.recurrence]}</Text>
                        )}
                        {ev.note&&<Text className="ev-note">{ev.note}</Text>}
                      </View>
                      <Text className="ev-del" onClick={e=>{e.stopPropagation();this.handleDeleteEvent(ev.id);}}>✕</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {selPending.length>0 && (
              <View className="detail-section">
                <Text className="section-title">📋 待完成任务</Text>
                {selPending.map(t=>{
                  const col = t.assigned_to ? memberColors[t.assigned_to] : '#9ca3af';
                  return (
                    <View key={t.id} className="task-row-item" style={{borderLeftColor:col}}>
                      <Text className="task-item-title">{t.assigned_avatar??''} {t.title}</Text>
                      <Text className="task-item-pts">+{t.points_value}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {selEvents.length===0&&selPending.length===0&&(
              <Text className="empty-tip">当天暂无安排</Text>
            )}
          </ScrollView>
        )}

        {/* 日程表单 */}
        {showForm && (
          <View className="modal-mask" onClick={()=>this.setState({showForm:false})}>
            <View className="modal" onClick={e=>e.stopPropagation()}>
              <Text className="modal-title">{editEvent?'编辑日程':'添加日程'}</Text>
              <Text className="field-label">标题</Text>
              <input className="field-input" value={form.title} placeholder="日程标题"
                onInput={e=>this.setForm('title',e.detail.value)} />
              <Text className="field-label">关联成员</Text>
              <View className="member-chips">
                <View className={`chip ${!form.member_id?'active':''}`} onClick={()=>this.setForm('member_id','')}>
                  <Text>全家</Text>
                </View>
                {members.map(m=>(
                  <View key={m.id} className={`chip ${form.member_id===String(m.id)?'active':''}`}
                    onClick={()=>this.setForm('member_id',String(m.id))}>
                    <Text>{m.avatar} {m.name}</Text>
                  </View>
                ))}
              </View>
              <Text className="field-label">备注</Text>
              <input className="field-input" value={form.note} placeholder="备注（可选）"
                onInput={e=>this.setForm('note',e.detail.value)} />
              <View className="modal-actions">
                <View className="btn-cancel" onClick={()=>this.setState({showForm:false})}><Text>取消</Text></View>
                <View className="btn-confirm" onClick={this.handleSaveEvent}><Text>保存</Text></View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }
}
