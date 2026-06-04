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
.work-log {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.work-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(180, 170, 200, 0.2);
  flex-shrink: 0;
}

.work-log-title {
  font-size: 14px;
  font-weight: 600;
  color: #4a3060;
}

.work-log-back {
  padding: 4px 12px;
  border: none;
  background: rgba(200, 190, 220, 0.3);
  color: #6d5080;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.work-log-back:hover {
  background: rgba(200, 190, 220, 0.5);
}

/* 筛选区 */
.work-log-filter {
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(180, 170, 200, 0.12);
  flex-shrink: 0;
}

.work-log-filter-select {
  padding: 3px 8px;
  border: 1px solid rgba(180, 170, 200, 0.4);
  border-radius: 6px;
  font-size: 11px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.7);
}

.work-log-filter-input {
  padding: 3px 6px;
  border: 1px solid rgba(180, 170, 200, 0.4);
  border-radius: 6px;
  font-size: 11px;
  color: #4a3060;
  background: rgba(255, 255, 255, 0.7);
  width: 105px;
}

.work-log-filter-sep {
  font-size: 11px;
  color: #9a80b8;
}

/* 记录列表 */
.work-log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.work-log-empty {
  text-align: center;
  color: #b8a0d0;
  font-size: 13px;
  padding: 30px 0;
}

.work-log-item {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  padding: 8px 10px;
  margin-bottom: 6px;
}

.work-log-item-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.work-log-item-date {
  font-size: 11px;
  color: #9a80b8;
  font-weight: 500;
}

.work-log-item-tag {
  font-size: 11px;
  background: rgba(180, 160, 210, 0.3);
  color: #5d4070;
  padding: 1px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.work-log-item-urgency {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.urgency--urgent { background: rgba(240, 130, 130, 0.25); color: #c0392b; }
.urgency--high   { background: rgba(240, 180, 130, 0.25); color: #c07030; }
.urgency--mid    { background: rgba(200, 200, 140, 0.25); color: #808020; }
.urgency--low    { background: rgba(180, 210, 180, 0.25); color: #508050; }

.work-log-item-content {
  font-size: 11px;
  color: #6d5080;
  line-height: 1.5;
  margin-bottom: 4px;
  word-break: break-all;
}

.work-log-item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.work-log-item-progress {
  font-size: 10px;
  color: #b8a0d0;
}

.work-log-item-del {
  border: none;
  background: none;
  color: #c8b0d8;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
}

.work-log-item-del:hover {
  color: #a080b8;
}
</style>
