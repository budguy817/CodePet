<!--
  文件路径: src/components/WorkForm.vue
  新增工作表单

  上下结构排版，可新增多条工作记录。
  表单字段：工作类型、紧急程度、具体内容、工作进度
-->
<template>
  <div class="work-form">
    <div class="work-form-header">
      <button class="work-form-back" @click="$emit('back')">← 返回</button>
      <span class="work-form-title">📝 新增工作</span>
      <span class="work-form-date">{{ dateStr }}</span>
    </div>

    <div class="work-form-body" :class="{ 'work-form-body--locked': isDateCompleted }">
      <!-- 工作类型 -->
      <label class="work-form-label">
        <div class="work-form-label-row">
          <span>工作类型</span>
          <button
            class="work-form-manage-types"
            title="管理工作类型"
            @click="$emit('manageTypes')"
          >
            ⚙️ 管理
          </button>
        </div>
        <select v-model="form.type" class="work-form-select">
          <option value="">请选择</option>
          <option
            v-for="t in workStore.workTypes"
            :key="t.id"
            :value="t.label"
          >
            {{ t.label }}
          </option>
        </select>
      </label>

      <!-- 紧急程度 -->
      <label class="work-form-label">
        紧急程度
        <select v-model="form.urgency" class="work-form-select">
          <option value="">请选择</option>
          <option v-for="u in urgencyLevels" :key="u" :value="u">{{ u }}</option>
        </select>
      </label>

      <!-- 具体内容 -->
      <label class="work-form-label">
        具体内容
        <textarea
          v-model="form.content"
          class="work-form-textarea"
          rows="4"
          placeholder="请输入工作内容..."
        />
      </label>

      <!-- 工作进度 -->
      <label class="work-form-label">
        工作进度
        <input
          v-model="form.progress"
          class="work-form-input"
          placeholder="如：50% / 进行中 / 已完成"
        />
      </label>

      <!-- 每日提醒时间设置 -->
      <div class="work-form-reminder">
        <span class="work-form-reminder-label">⏰ 每日提醒</span>
        <div class="work-form-reminder-controls">
          <input
            type="time"
            :value="workStore.reminderTime"
            class="work-form-time-input"
            @change="handleReminderTimeChange"
          />
          <button
            class="work-form-switch work-form-reminder-switch"
            :class="{ 'work-form-switch--on': workStore.reminderEnabled }"
            @click="toggleReminder"
          />
        </div>
      </div>
    </div>

    <div v-if="!isDateCompleted" class="work-form-footer">
      <button v-if="editingId !== null" class="work-form-btn work-form-btn--cancel" @click="cancelEdit">
        取消编辑
      </button>
      <button class="work-form-btn work-form-btn--submit" @click="handleSubmit">
        {{ editingId !== null ? '保存修改' : '添加' }}
      </button>
    </div>

    <!-- 已添加记录 -->
    <div v-if="records.length > 0" class="work-form-records">
      <div
        v-for="r in records"
        :key="r.id"
        class="work-form-record"
        :class="{ 'work-form-record--editing': editingId === r.id, 'work-form-record--locked': isDateCompleted }"
        @click="!isDateCompleted && editRecord(r)"
      >
        <span class="work-record-tag">{{ r.type }}</span>
        <span class="work-record-urgency" :class="'urgency--' + urgencyClass(r.urgency)">
          {{ r.urgency }}
        </span>
        <span class="work-record-content">{{ r.content }}</span>
        <span class="work-record-progress">{{ r.progress }}</span>
        <button v-if="!isDateCompleted" class="work-record-del" @click.stop="removeRecord(r.id)">✕</button>
      </div>

      <!-- 全部工作已完成 开关 -->
      <label class="work-form-complete">
        <span>全部工作已完成</span>
        <button
          class="work-form-switch"
          :class="{ 'work-form-switch--on': isDateCompleted }"
          @click="toggleAllComplete"
        />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useWorkStore, type WorkRecord } from '@/stores/workStore'

// ===== Props =====
interface Props {
  /** 当前选中的日期 */
  date: Date
}

const props = defineProps<Props>()

// ===== Emits =====
defineEmits<{
  /** 返回上一级 */
  back: []
  /** 打开工作类型管理 */
  manageTypes: []
}>()

// ===== Store =====
const workStore = useWorkStore()

import { URGENCY_LEVELS } from '@/constants'
import { urgencyClass } from '@/utils/urgency'

// ===== 常量 =====
const urgencyLevels = URGENCY_LEVELS

// ===== 表单数据 =====
const form = reactive({
  type: '',
  urgency: '',
  content: '',
  progress: '',
})

/** 正在编辑的记录 ID（null 表示新增模式） */
const editingId = ref<number | null>(null)

// ===== 记录列表（从 store 获取当前日期的记录） =====
const records = computed(() => workStore.getByDate(dateStr.value))

// ===== 计算属性 =====
const dateStr = computed(() => {
  const d = props.date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

/** 当前日期是否已标记完成 */
const isDateCompleted = computed(() => workStore.isDateCompleted(dateStr.value))

// ===== 方法 =====
const handleSubmit = async (): Promise<void> => {
  if (!form.type || !form.urgency) return

  if (editingId.value !== null) {
    await workStore.removeRecord(editingId.value)
    await workStore.addRecord(props.date, { ...form })
    editingId.value = null
  } else {
    await workStore.addRecord(props.date, { ...form })
  }

  // 重置表单
  form.type = ''
  form.urgency = ''
  form.content = ''
  form.progress = ''
}

/** 点击记录 → 回显到表单编辑 */
const editRecord = (r: WorkRecord): void => {
  editingId.value = r.id
  form.type = r.type
  form.urgency = r.urgency
  form.content = r.content
  form.progress = r.progress
}

/** 取消编辑 */
const cancelEdit = (): void => {
  editingId.value = null
  form.type = ''
  form.urgency = ''
  form.content = ''
  form.progress = ''
}

/** 切换全部完成 */
const toggleAllComplete = async (): Promise<void> => {
  await workStore.setDateCompleted(dateStr.value, !isDateCompleted.value)
}

const removeRecord = (id: number): void => {
  // 如果删除的是正在编辑的记录，取消编辑状态
  if (editingId.value === id) {
    cancelEdit()
  }
  workStore.removeRecord(id)
}

// ===== 提醒时间相关方法 =====

/**
 * 提醒时间变更处理
 * 将原生 time input 的 "HH:MM" 值保存到 workStore
 */
const handleReminderTimeChange = (e: Event): void => {
  const target = e.target as HTMLInputElement
  if (target.value) {
    workStore.setReminderTime(target.value)
  }
}

/**
 * 切换每日提醒开关
 */
const toggleReminder = (): void => {
  workStore.setReminderEnabled(!workStore.reminderEnabled)
}
</script>

<style scoped>
/* ========================================
   WorkForm — 夜曲工作室 暗色主题
   ======================================== */

.work-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ===== 头部 ===== */
.work-form-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.work-form-back {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #6e6e80;
  border-radius: 7px;
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.work-form-back:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e4e4ec;
}

.work-form-title {
  font-size: 14px;
  font-weight: 600;
  color: #e4e4ec;
}

.work-form-date {
  font-size: 11px;
  color: #6e6e80;
  margin-left: auto;
}

/* ===== 表单区 ===== */
.work-form-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.work-form-body--locked {
  opacity: 0.3;
  pointer-events: none;
}

.work-form-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: #6e6e80;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.work-form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.work-form-manage-types {
  border: none;
  background: none;
  color: #6e6e80;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.work-form-manage-types:hover {
  color: #e2b04a;
  background: rgba(226, 176, 74, 0.08);
}

.work-form-select,
.work-form-input {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  font-size: 13px;
  color: #e4e4ec;
  background: rgba(255, 255, 255, 0.03);
  outline: none;
  transition: all 0.2s ease;
}

.work-form-select:focus,
.work-form-input:focus,
.work-form-textarea:focus {
  border-color: rgba(226, 176, 74, 0.35);
  box-shadow: 0 0 0 3px rgba(226, 176, 74, 0.06);
}

.work-form-select {
  cursor: pointer;
}

.work-form-select option {
  background: #1a1a2e;
  color: #e4e4ec;
}

.work-form-textarea {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  font-size: 13px;
  color: #e4e4ec;
  background: rgba(255, 255, 255, 0.03);
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;
}

/* ===== 提醒设置 ===== */
.work-form-reminder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.work-form-reminder-label {
  font-size: 12px;
  color: #8b8b9e;
}

.work-form-reminder-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.work-form-time-input {
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.03);
  color: #e4e4ec;
  font-size: 12px;
  outline: none;
}
.work-form-time-input:focus {
  border-color: rgba(226, 176, 74, 0.35);
}

/* ===== 底部按钮 ===== */
.work-form-footer {
  padding: 0 16px 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.work-form-btn {
  padding: 7px 20px;
  border: none;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
}

.work-form-btn--submit {
  background: linear-gradient(135deg, rgba(226, 176, 74, 0.85), rgba(201, 154, 58, 0.85));
  color: #12121d;
  box-shadow: 0 2px 8px rgba(226, 176, 74, 0.15);
}

.work-form-btn--submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(226, 176, 74, 0.25);
}

.work-form-btn--cancel {
  background: rgba(255, 255, 255, 0.04);
  color: #8b8b9e;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.work-form-btn--cancel:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e4e4ec;
}

/* ===== 记录列表 ===== */
.work-form-records {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.work-form-record {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.work-form-record:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.work-form-record--editing {
  background: rgba(145, 128, 200, 0.1);
  border-color: rgba(145, 128, 200, 0.3);
  box-shadow: 0 0 12px rgba(145, 128, 200, 0.1);
}

.work-form-record--locked {
  cursor: default;
  opacity: 0.5;
}

.work-form-record--locked:hover {
  background: rgba(255, 255, 255, 0.025);
  border-color: rgba(255, 255, 255, 0.04);
}

.work-record-tag {
  background: rgba(226, 176, 74, 0.12);
  color: #e2b04a;
  padding: 2px 8px;
  border-radius: 5px;
  font-weight: 500;
  font-size: 11px;
  white-space: nowrap;
}

.work-record-urgency {
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 10px;
  white-space: nowrap;
}

.urgency--urgent { background: rgba(212, 120, 122, 0.15); color: #d4787a; }
.urgency--high   { background: rgba(226, 176, 74, 0.15); color: #e2b04a; }
.urgency--mid    { background: rgba(145, 128, 200, 0.12); color: #9180c8; }
.urgency--low    { background: rgba(110, 184, 154, 0.12); color: #6eb89a; }

.work-record-content {
  flex: 1;
  color: #a0a0b4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-record-progress {
  color: #555568;
  white-space: nowrap;
  font-size: 11px;
}

.work-record-del {
  border: none;
  background: none;
  color: #444456;
  font-size: 13px;
  cursor: pointer;
  padding: 0 2px;
  transition: color 0.15s;
}

.work-record-del:hover {
  color: #d4787a;
}

/* ===== 全部完成开关 ===== */
.work-form-complete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 4px;
  margin-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  font-weight: 500;
  color: #a0a0b4;
  cursor: pointer;
}

.work-form-switch {
  width: 40px;
  height: 22px;
  border: none;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  position: relative;
  transition: all 0.25s ease;
}

.work-form-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #6e6e80;
  transition: all 0.25s ease;
}

.work-form-switch--on {
  background: rgba(110, 184, 154, 0.3);
}

.work-form-switch--on::after {
  background: #6eb89a;
  left: 20px;
}

.work-form-reminder-switch {
  width: 36px;
  height: 20px;
  border-radius: 10px;
}

.work-form-reminder-switch::after {
  width: 16px;
  height: 16px;
}
</style>
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}

.work-form-switch--on {
  background: #7ec880;
}

.work-form-switch--on::after {
  transform: translateX(18px);
}

/* ========================================
   每日提醒时间设置
   ======================================== */

.work-form-reminder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px dashed rgba(180, 170, 200, 0.3);
}

.work-form-reminder-label {
  font-size: 11px;
  font-weight: 500;
  color: #6d5080;
}

.work-form-reminder-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.work-form-time-input {
  padding: 4px 8px;
  border: 1px solid rgba(180, 170, 200, 0.4);
  border-radius: 6px;
  font-size: 12px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.7);
  outline: none;
  width: 90px;
  font-family: inherit;
  transition: border-color 0.15s;
}

.work-form-time-input:focus {
  border-color: #b89ad8;
}

.work-form-reminder-switch {
  width: 36px;
  height: 20px;
  border-radius: 10px;
}

.work-form-reminder-switch::after {
  width: 16px;
  height: 16px;
  top: 1.5px;
  left: 1.5px;
}

.work-form-reminder-switch.work-form-switch--on::after {
  transform: translateX(16px);
}
</style>
