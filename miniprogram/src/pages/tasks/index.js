import { Component } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input, Picker, Button } from '@tarojs/components';
import { getTasks, createTask, updateTask, deleteTask, completeTask, approveTask } from '../../utils/api';
import { getState, refreshMembers, canManage } from '../../store/family';
import './index.scss';

const CATEGORIES = [
  { value: 'academic', label: '学科类',   icon: '📚' },
  { value: 'sport',    label: '体育运动', icon: '⚽' },
  { value: 'art',      label: '艺术文化', icon: '🎨' },
  { value: 'habit',    label: '生活习惯', icon: '🏠' },
  { value: 'other',    label: '其他',     icon: '📌' },
];
const CAT_COLOR = {
  academic: { bg: '#eff6ff', text: '#1d4ed8' },
  sport:    { bg: '#f0fdf4', text: '#15803d' },
  art:      { bg: '#faf5ff', text: '#7c3aed' },
  habit:    { bg: '#fff7ed', text: '#c2410c' },
  other:    { bg: '#f9fafb', text: '#6b7280' },
};
const STATUS_LABEL = { pending: '待完成', done: '待审批', approved: '已完成' };
const STATUS_COLOR = { pending: '#3b82f6', done: '#f97316', approved: '#22c55e' };

export default class Tasks extends Component {
  config = { navigationBarTitleText: '任务管理' };

  state = {
    tasks: [], members: [], currentMember: null,
    showForm: false, editTask: null,
    form: { title: '', category: 'other', assigned_to: '', due_date: '', priority: 'medium', points_value: 10, description: '' },
  };

  async componentDidShow() {
    await refreshMembers();
    const { members, currentMember } = getState();
    const tasks = await getTasks();
    this.setState({ tasks, members, currentMember });
  }

  openForm(task = null) {
    const form = task ? {
      title: task.title, category: task.category ?? 'other',
      assigned_to: task.assigned_to ? String(task.assigned_to) : '',
      due_date: task.due_date ?? '', priority: task.priority ?? 'medium',
      points_value: task.points_value ?? 10, description: task.description ?? '',
    } : { title: '', category: 'other', assigned_to: '', due_date: '', priority: 'medium', points_value: 10, description: '' };
    this.setState({ showForm: true, editTask: task, form });
  }

  setForm = (k, v) => this.setState(s => ({ form: { ...s.form, [k]: v } }));

  handleSubmit = async () => {
    const { form, editTask, currentMember } = this.state;
    if (!form.title) { Taro.showToast({ title: '请填写任务名称', icon: 'none' }); return; }
    const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null };
    if (editTask) {
      await updateTask(editTask.id, payload);
    } else {
      await createTask({ ...payload, created_by: currentMember?.id });
    }
    this.setState({ showForm: false });
    const tasks = await getTasks();
    this.setState({ tasks });
  };

  handleComplete = async (id) => {
    await completeTask(id);
    const tasks = await getTasks();
    await refreshMembers();
    this.setState({ tasks, currentMember: getState().currentMember });
  };

  handleApprove = async (id) => {
    await approveTask(id);
    const tasks = await getTasks();
    await refreshMembers();
    this.setState({ tasks, members: getState().members });
  };

  handleDelete = async (task) => {
    Taro.showModal({
      title: '删除任务', content: `确定删除「${task.title}」？`,
      success: async ({ confirm }) => {
        if (!confirm) return;
        await deleteTask(task.id);
        const tasks = await getTasks();
        this.setState({ tasks });
      },
    });
  };

  render() {
    const { tasks, members, currentMember, showForm, editTask, form } = this.state;
    const active   = tasks.filter(t => t.status !== 'approved');
    const done     = tasks.filter(t => t.status === 'approved');
    const grouped  = CATEGORIES.map(c => ({
      cat: c, tasks: active.filter(t => (t.category ?? 'other') === c.value),
    })).filter(g => g.tasks.length > 0);

    return (
      <View className="page">
        <View className="header">
          <Text className="page-title">任务管理</Text>
          <View className="add-btn" onClick={() => this.openForm()}>
            <Text className="add-btn-text">+ 新建</Text>
          </View>
        </View>

        <ScrollView scrollY className="scroll-area">
          {grouped.map(({ cat, tasks: catTasks }) => {
            const col = CAT_COLOR[cat.value];
            return (
              <View key={cat.value} className="category-section">
                <View className="cat-header" style={{ background: col.bg }}>
                  <Text className="cat-icon">{cat.icon}</Text>
                  <Text className="cat-label" style={{ color: col.text }}>{cat.label}</Text>
                  <Text className="cat-count" style={{ color: col.text }}>({catTasks.length})</Text>
                </View>
                {catTasks.map(t => this.renderTask(t, currentMember, members))}
              </View>
            );
          })}

          {done.length > 0 && (
            <View className="done-section">
              <Text className="done-title">已完成 ({done.length})</Text>
              {done.map(t => this.renderTask(t, currentMember, members))}
            </View>
          )}

          {tasks.length === 0 && (
            <View className="empty"><Text className="empty-emoji">📋</Text><Text>暂无任务</Text></View>
          )}
        </ScrollView>

        {/* 新建/编辑表单 */}
        {showForm && (
          <View className="modal-mask" onClick={() => this.setState({ showForm: false })}>
            <View className="modal" onClick={e => e.stopPropagation()}>
              <Text className="modal-title">{editTask ? '编辑任务' : '新建任务'}</Text>

              <Text className="field-label">任务名称</Text>
              <Input className="field-input" value={form.title} placeholder="请输入任务名称"
                onInput={e => this.setForm('title', e.detail.value)} />

              <Text className="field-label">类别</Text>
              <View className="cat-grid">
                {CATEGORIES.map(c => (
                  <View key={c.value} className={`cat-chip ${form.category === c.value ? 'active' : ''}`}
                    onClick={() => this.setForm('category', c.value)}>
                    <Text>{c.icon} {c.label}</Text>
                  </View>
                ))}
              </View>

              <Text className="field-label">分配给</Text>
              <View className="member-grid">
                <View className={`member-chip ${!form.assigned_to ? 'active' : ''}`}
                  onClick={() => this.setForm('assigned_to', '')}>
                  <Text>不指定</Text>
                </View>
                {members.map(m => (
                  <View key={m.id} className={`member-chip ${form.assigned_to === String(m.id) ? 'active' : ''}`}
                    onClick={() => this.setForm('assigned_to', String(m.id))}>
                    <Text>{m.avatar} {m.name}</Text>
                  </View>
                ))}
              </View>

              <View className="row-fields">
                <View className="half-field">
                  <Text className="field-label">截止日期</Text>
                  <Picker mode="date" value={form.due_date} onChange={e => this.setForm('due_date', e.detail.value)}>
                    <View className="picker-view">
                      <Text>{form.due_date || '选择日期'}</Text>
                    </View>
                  </Picker>
                </View>
                <View className="half-field">
                  <Text className="field-label">积分</Text>
                  <Input className="field-input" type="number" value={String(form.points_value)}
                    onInput={e => this.setForm('points_value', Number(e.detail.value))} />
                </View>
              </View>

              <View className="modal-actions">
                <View className="btn-cancel" onClick={() => this.setState({ showForm: false })}>
                  <Text>取消</Text>
                </View>
                <View className="btn-confirm" onClick={this.handleSubmit}>
                  <Text>保存</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  renderTask(t, currentMember, members) {
    return (
      <View key={t.id} className="task-card" onClick={() => canManage() && this.openForm(t)}>
        <View className="task-row">
          <Text className="task-title">{t.title}</Text>
          <Text className="task-status" style={{ color: STATUS_COLOR[t.status] }}>
            {STATUS_LABEL[t.status]}
          </Text>
        </View>
        <View className="task-meta">
          {t.assigned_avatar && <Text className="meta-item">{t.assigned_avatar} {t.assigned_name}</Text>}
          {t.due_date && <Text className="meta-item">📅 {t.due_date}</Text>}
          <Text className="meta-points">+{t.points_value}分</Text>
        </View>
        <View className="task-actions" onClick={e => e.stopPropagation()}>
          {t.status === 'pending' && currentMember?.id === t.assigned_to && (
            <View className="action-btn primary" onClick={() => this.handleComplete(t.id)}>
              <Text>完成</Text>
            </View>
          )}
          {t.status === 'done' && canManage() && (
            <View className="action-btn success" onClick={() => this.handleApprove(t.id)}>
              <Text>审批</Text>
            </View>
          )}
          {canManage() && (
            <View className="action-btn danger" onClick={() => this.handleDelete(t)}>
              <Text>删除</Text>
            </View>
          )}
        </View>
      </View>
    );
  }
}
