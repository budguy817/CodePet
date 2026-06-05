<!--
  文件路径: src/components/WorkLog.vue
  工作记录日志组件

  展示所有工作记录，支持按日期 / 日期范围筛选。
-->
<template>
  <div class="work-log">
    <!-- 顶部栏 -->
    <div class="work-log-header">
      <span class="work-log-title">工作记录</span>
      <button class="work-log-back" @click="$emit('back')">返回</button>
    </div>

    <!-- 筛选区 -->
    <div class="work-log-filter">
      <select v-model="filterMode" class="work-log-filter-select">
        <option value="all">全部</option>
        <option value="date">按日期</option>
        <option value="range">日期范围</option>
      </select>

      <template v-if="filterMode === 'date'">
        <input type="date" v-model="filterDate" class="work-log-filter-input" />
      </template>

      <template v-if="filterMode === 'range'">
        <input type="date" v-model="filterStart" class="work-log-filter-input" />
        <span class="work-log-filter-sep">至</span>
        <input type="date" v-model="filterEnd" class="work-log-filter-input" />
      </template>
    </div>

    <!-- 记录列表 -->
    <div class="work-log-list">
      <div v-if="filteredRecords.length === 0" class="work-log-empty">
        暂无工作记录
      </div>

      <div
        v-for="r in filteredRecords"
        :key="r.id"
        class="work-log-item"
      >
        <div class="work-log-item-head">
          <span class="work-log-item-date">{{ r.dateKey }}</span>
          <span class="work-log-item-tag">{{ r.type }}</span>
          <span
            class="work-log-item-urgency"
            :class="'urgency--' + urgencyClass(r.urgency)"
          >{{ r.urgency }}</span>
        </div>
        <div class="work-log-item-content" v-if="r.content">{{ r.content }}</div>
        <div class="work-log-item-foot">
          <span class="work-log-item-progress">{{ r.progress || '未填写进度' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkStore, type WorkRecord } from '@/stores/workStore'
import { urgencyClass } from '@/utils/urgency'

defineEmits<{ back: [] }>()

const workStore = useWorkStore()

// ===== 筛选状态 =====
type FilterMode = 'all' | 'date' | 'range'
const filterMode = ref<FilterMode>('all')
const filterDate = ref<string>('')
const filterStart = ref<string>('')
const filterEnd = ref<string>('')

// ===== 计算属性 =====
const filteredRecords = computed<WorkRecord[]>(() => {
  const all = workStore.records

  if (filterMode.value === 'date' && filterDate.value) {
    return all.filter((r) => r.dateKey === filterDate.value)
  }

  if (filterMode.value === 'range' && filterStart.value && filterEnd.value) {
    return all.filter((r) => r.dateKey >= filterStart.value && r.dateKey <= filterEnd.value)
  }

  // 'all' 或条件不完整时，按日期倒序显示全部
  return [...all].sort((a, b) => b.dateKey.localeCompare(a.dateKey))
})

// ===== 方法（urgencyClass 从 @/utils/urgency 导入） =====
</script>

<style scoped>
/* ========================================
   WorkLog — 夜曲工作室 暗色主题
   ======================================== */

.work-log {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ===== 头部 ===== */
.work-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.work-log-title {
  font-size: 14px;
  font-weight: 600;
  color: #e4e4ec;
}

.work-log-back {
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #6e6e80;
  border-radius: 7px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.work-log-back:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e4e4ec;
}

/* ===== 筛选区 ===== */
.work-log-filter {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.work-log-filter-select {
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  font-size: 11px;
  color: #e4e4ec;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
}

.work-log-filter-select option {
  background: #1a1a2e;
  color: #e4e4ec;
}

.work-log-filter-input {
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  font-size: 11px;
  color: #e4e4ec;
  background: rgba(255, 255, 255, 0.03);
  width: 110px;
  outline: none;
}
.work-log-filter-input:focus {
  border-color: rgba(226, 176, 74, 0.35);
}

.work-log-filter-sep {
  font-size: 11px;
  color: #444456;
}

/* ===== 列表 ===== */
.work-log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px 12px;
}

.work-log-empty {
  text-align: center;
  color: #444456;
  font-size: 13px;
  padding: 40px 0;
}

.work-log-item {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.work-log-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.work-log-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.work-log-item-date {
  font-size: 11px;
  color: #555568;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.work-log-item-tag {
  background: rgba(226, 176, 74, 0.12);
  color: #e2b04a;
  padding: 1px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
}

.work-log-item-urgency {
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 10px;
}

.urgency--urgent { background: rgba(212, 120, 122, 0.15); color: #d4787a; }
.urgency--high   { background: rgba(226, 176, 74, 0.15); color: #e2b04a; }
.urgency--mid    { background: rgba(145, 128, 200, 0.12); color: #9180c8; }
.urgency--low    { background: rgba(110, 184, 154, 0.12); color: #6eb89a; }

.work-log-item-content {
  font-size: 12px;
  color: #a0a0b4;
  line-height: 1.5;
  margin-bottom: 4px;
}

.work-log-item-foot {
  display: flex;
  align-items: center;
  gap: 6px;
}

.work-log-item-progress {
  font-size: 11px;
  color: #555568;
}

.work-log-item-del {
  margin-left: auto;
  border: none;
  background: none;
  color: #444456;
  font-size: 13px;
  cursor: pointer;
  padding: 0 4px;
  transition: color 0.15s;
}

.work-log-item-del:hover {
  color: #d4787a;
}
</style>

.work-log-item-del:hover {
  color: #a080b8;
}
</style>
