<!--
  文件路径: src/components/Workspace.vue
  工作台主组件

  左右两栏布局：
  - 左侧 2/3：日历组件
  - 右侧 1/3：工作记录入口 / 工作记录日志
-->
<template>
  <div class="workspace" :style="{ background: currentSkin }">
    <!-- 左侧：日历 -->
    <div class="workspace-left">
      <!-- 顶部返回栏（可拖拽窗口） -->
      <div class="workspace-topbar" @mousedown="onTopbarMouseDown">
        <button class="workspace-back-btn" @click="handleClose">← 返回桌宠</button>
        <SkinPicker v-model="currentSkin" />
      </div>
      <Calendar @day-dblclick="onDayDblClick" />
    </div>

    <!-- 右侧：根据状态切换 -->
    <div class="workspace-right">
      <!-- 工作提醒横幅（当天有未完成工作时展示） -->
      <Transition name="reminder-banner-fade">
        <div
          v-if="showReminderBanner"
          class="workspace-reminder-banner"
          @click="handleReminderBannerClick"
        >
          <span class="workspace-reminder-banner-icon">⏰</span>
          <span class="workspace-reminder-banner-text">今天的工作还没有完成，去处理~</span>
          <span class="workspace-reminder-banner-arrow">→</span>
        </div>
      </Transition>

      <!-- 右侧菜单 -->
      <div v-if="currentView === 'menu'" class="workspace-menu">
        <button class="workspace-menu-btn" @click="currentView = 'worklog'">
          📋 工作记录
        </button>
      </div>

      <!-- 新增工作表单 -->
      <WorkForm
        v-else-if="currentView === 'workform'"
        :date="selectedWorkDate"
        @back="currentView = 'menu'"
      />

      <!-- 工作记录日志 -->
      <WorkLog v-else @back="currentView = 'menu'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'
import { usePetStore } from '@/stores/petStore'
import { useCursorEvents } from '@/composables/useCursorEvents'
import { useWorkReminder } from '@/composables/useWorkReminder'
import { DEFAULT_SKIN } from '@/constants'
import Calendar from './Calendar.vue'
import WorkLog from './WorkLog.vue'
import WorkForm from './WorkForm.vue'
import SkinPicker from './SkinPicker.vue'

const petStore = usePetStore()
const appWindow = getCurrentWindow()
const { setIgnoreCursorEvents } = useCursorEvents()

// ===== 皮肤管理 =====
const SKIN_KEY = 'codepet-workspace-skin'
const currentSkin = ref<string>(
  localStorage.getItem(SKIN_KEY) || DEFAULT_SKIN
)

// 皮肤变更时持久化
watch(currentSkin, (val) => {
  localStorage.setItem(SKIN_KEY, val)
})

type RightView = 'menu' | 'worklog' | 'workform'

/** 右侧面板当前视图 */
const currentView = ref<RightView>('menu')
/** 当前选中的工作日期 */
const selectedWorkDate = ref<Date>(new Date())

// ===== 窗口拖拽（工作台模式下的自定义标题栏拖拽） =====
let isDragging = false
let dragStartX = 0
let dragStartY = 0

const onTopbarMouseDown = async (e: MouseEvent): Promise<void> => {
  isDragging = true
  dragStartX = e.screenX
  dragStartY = e.screenY
  document.addEventListener('mousemove', onTopbarMouseMove)
  document.addEventListener('mouseup', onTopbarMouseUp)
}

const onTopbarMouseMove = async (e: MouseEvent): Promise<void> => {
  if (!isDragging) return
  const dx = e.screenX - dragStartX
  const dy = e.screenY - dragStartY
  const pos = await appWindow.outerPosition()
  await appWindow.setPosition(new PhysicalPosition(pos.x + dx, pos.y + dy))
  dragStartX = e.screenX
  dragStartY = e.screenY
}

const onTopbarMouseUp = (): void => {
  isDragging = false
  document.removeEventListener('mousemove', onTopbarMouseMove)
  document.removeEventListener('mouseup', onTopbarMouseUp)
}

/** 关闭工作台，返回桌宠 */
const handleClose = (): void => {
  petStore.closeSubWindow()
}

/** 日历双击 → 打开工作表单 */
const onDayDblClick = (date: Date): void => {
  selectedWorkDate.value = date
  currentView.value = 'workform'
}

// ===== 工作提醒横幅 =====
/** 是否显示工作提醒横幅 */
const showReminderBanner = ref<boolean>(false)

/**
 * 提醒触发回调（由 useWorkReminder 在到达提醒时间时调用）
 * 在工作台模式下，展示右侧顶部横幅提醒
 */
const onReminderTrigger = (): void => {
  showReminderBanner.value = true
}

// 注册工作提醒
useWorkReminder(onReminderTrigger, 'Workspace')

/**
 * 点击横幅 → 跳转到今天的工作表单
 */
const handleReminderBannerClick = (): void => {
  showReminderBanner.value = false
  // 导航到今天的工作表单
  selectedWorkDate.value = new Date()
  currentView.value = 'workform'
}

// ===== 待跳转日期监听（从桌宠提醒"去处理"进入时触发） =====
// immediate: true 确保 Workspace 挂载时如果 pendingWorkDate 已设置（在挂载前由 Pet 设置），
// 也能立即触发跳转，不会因为 watch 只监听"变化"而漏掉初始值。
watch(
  () => petStore.pendingWorkDate,
  (date) => {
    if (date !== null) {
      // 清除待跳转状态（避免重复触发）
      petStore.setPendingWorkDate(null)
      // 跳转到指定日期的工作表单
      selectedWorkDate.value = date
      currentView.value = 'workform'
      // 同时关闭提醒横幅（如果正在显示）
      showReminderBanner.value = false
    }
  },
  { immediate: true }
)

// 工作台启动时确保鼠标事件正常接收
onMounted(() => {
  setIgnoreCursorEvents(false)
})
</script>

<style scoped>
.workspace {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 0;
  background: rgba(245, 242, 250, 0.95);
  pointer-events: auto;
}

/* 左侧日历区 2/3 */
.workspace-left {
  flex: 2;
  padding: 10px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 顶部返回栏（可拖拽窗口） */
.workspace-topbar {
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
}

.workspace-back-btn {
  padding: 4px 14px;
  border: none;
  background: rgba(200, 190, 220, 0.3);
  color: #6d5080;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.workspace-back-btn:hover {
  background: rgba(200, 190, 220, 0.55);
}

/* 右侧面板区 1/3 */
.workspace-right {
  flex: 1;
  min-width: 0;
  border-left: 1px solid rgba(180, 170, 200, 0.25);
  display: flex;
  flex-direction: column;
}

/* 右侧菜单 */
.workspace-menu {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
}

.workspace-menu-btn {
  padding: 10px 24px;
  border: none;
  background: rgba(200, 190, 220, 0.3);
  color: #5d4070;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.workspace-menu-btn:hover {
  background: rgba(200, 190, 220, 0.55);
  transform: translateY(-1px);
}

/* ========================================
   工作提醒横幅
   ======================================== */

.workspace-reminder-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  margin: 8px 10px 0;
  background: linear-gradient(135deg, rgba(255, 220, 180, 0.55), rgba(255, 200, 160, 0.45));
  border: 1px solid rgba(240, 180, 130, 0.35);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: reminder-banner-pulse 2s ease-in-out infinite;
}

.workspace-reminder-banner:hover {
  background: linear-gradient(135deg, rgba(255, 210, 160, 0.7), rgba(255, 190, 140, 0.6));
  border-color: rgba(240, 170, 110, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(200, 150, 100, 0.2);
}

.workspace-reminder-banner-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.workspace-reminder-banner-text {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: #8b5e3c;
  line-height: 1.4;
}

.workspace-reminder-banner-arrow {
  font-size: 13px;
  color: #b88060;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.workspace-reminder-banner:hover .workspace-reminder-banner-arrow {
  transform: translateX(3px);
}

/* 横幅脉冲动画 */
@keyframes reminder-banner-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(240, 180, 130, 0.3); }
  50% { box-shadow: 0 0 0 4px rgba(240, 180, 130, 0); }
}

/* 横幅淡入淡出过渡 */
.reminder-banner-fade-enter-active,
.reminder-banner-fade-leave-active {
  transition: all 0.3s ease;
}

.reminder-banner-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.reminder-banner-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
