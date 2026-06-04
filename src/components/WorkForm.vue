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
        工作类型
        <select v-model="form.type" class="work-form-select">
          <option value="">请选择</option>
          <option v-for="t in workTypes" :key="t" :value="t">{{ t }}</option>
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
}>()

// ===== Store =====
const workStore = useWorkStore()

import { WORK_TYPES, URGENCY_LEVELS } from '@/constants'
import { urgencyClass } from '@/utils/urgency'

// ===== 常量 =====
const workTypes = WORK_TYPES
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
</script>

<style scoped>
.work-form {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.6);
}

.work-form-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(180, 170, 200, 0.2);
}

.work-form-back {
  padding: 3px 10px;
  border: none;
  background: rgba(200, 190, 220, 0.3);
  color: #6d5080;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
}

.work-form-back:hover {
  background: rgba(200, 190, 220, 0.5);
}

.work-form-title {
  font-size: 14px;
  font-weight: 600;
  color: #4a3060;
}

.work-form-date {
  font-size: 11px;
  color: #9a80b8;
}

/* 表单区 */
.work-form-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.work-form-body--locked {
  opacity: 0.45;
  pointer-events: none;
}

.work-form-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #6d5080;
}

.work-form-select,
.work-form-input {
  padding: 6px 10px;
  border: 1px solid rgba(180, 170, 200, 0.4);
  border-radius: 8px;
  font-size: 12px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.7);
  outline: none;
  transition: border-color 0.15s;
}

.work-form-select:focus,
.work-form-input:focus,
.work-form-textarea:focus {
  border-color: #b89ad8;
}

.work-form-textarea {
  padding: 6px 10px;
  border: 1px solid rgba(180, 170, 200, 0.4);
  border-radius: 8px;
  font-size: 12px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.7);
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.work-form-footer {
  padding: 0 14px 10px;
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.work-form-btn {
  padding: 6px 18px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.work-form-btn--submit {
  background: #b89ad8;
  color: #fff;
}

.work-form-btn--submit:hover {
  background: #a080c8;
}

.work-form-btn--cancel {
  background: rgba(200, 190, 220, 0.35);
  color: #7d6090;
}

.work-form-btn--cancel:hover {
  background: rgba(200, 190, 220, 0.55);
}

/* 记录列表 */
.work-form-records {
  flex: 1;
  overflow-y: auto;
  padding: 0 14px 10px;
  border-top: 1px solid rgba(180, 170, 200, 0.15);
}

.work-form-record {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.12s;
}

.work-form-record:hover {
  background: rgba(220, 210, 240, 0.4);
}

.work-form-record--editing {
  background: rgba(200, 180, 230, 0.45);
  box-shadow: inset 0 0 0 1.5px #b89ad8;
}

.work-form-record--locked {
  cursor: default;
  opacity: 0.7;
}

.work-form-record--locked:hover {
  background: rgba(255, 255, 255, 0.7);
}

.work-record-tag {
  background: rgba(180, 160, 210, 0.3);
  color: #5d4070;
  padding: 1px 8px;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
}

.work-record-urgency {
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 10px;
  white-space: nowrap;
}

.urgency--urgent { background: rgba(240, 130, 130, 0.25); color: #c0392b; }
.urgency--high   { background: rgba(240, 180, 130, 0.25); color: #c07030; }
.urgency--mid    { background: rgba(200, 200, 140, 0.25); color: #808020; }
.urgency--low    { background: rgba(180, 210, 180, 0.25); color: #508050; }

.work-record-content {
  flex: 1;
  color: #6d5080;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-record-progress {
  color: #9a80b8;
  white-space: nowrap;
}

.work-record-del {
  border: none;
  background: none;
  color: #c8b0d8;
  font-size: 12px;
  cursor: pointer;
  padding: 0 2px;
}

.work-record-del:hover {
  color: #a080b8;
}

/* 全部完成开关 */
.work-form-complete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 4px;
  margin-top: 8px;
  border-top: 1px solid rgba(180, 170, 200, 0.2);
  font-size: 12px;
  font-weight: 500;
  color: #4a3060;
  cursor: pointer;
}

.work-form-switch {
  width: 40px;
  height: 22px;
  border: none;
  border-radius: 11px;
  background: rgba(180, 170, 200, 0.4);
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}

.work-form-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
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
</style>
