<!--
  文件路径: src/components/Workspace.vue
  工作台主组件 —— 「夜曲工作室」暗色主题

  左右两栏布局：
  - 左侧 3/5：日历组件
  - 右侧 2/5：工作记录入口 / 工作记录日志
  设计语言：深靛蓝底 + 玻璃面板 + 琥珀暖调点缀
-->
<template>
  <div class="workspace">
    <!-- 顶部栏（可拖拽窗口） -->
    <div class="ws-topbar" @mousedown="onTopbarMouseDown">
      <button class="ws-btn-back" @click="handleClose">
        <span class="ws-btn-back-icon">←</span>
        <span>返回桌宠</span>
      </button>
      <div class="ws-topbar-right">
        <SkinPicker v-model="currentSkin" />
      </div>
    </div>

    <!-- 主体：左右两栏 -->
    <div class="ws-main">
      <!-- 左侧：日历 -->
      <div class="ws-left">
        <Calendar @day-dblclick="onDayDblClick" />
      </div>

      <!-- 右侧：面板 -->
      <div class="ws-right">
        <!-- 工作提醒横幅 -->
        <Transition name="ws-banner">
          <div
            v-if="showReminderBanner"
            class="ws-banner"
            @click="handleReminderBannerClick"
          >
            <span class="ws-banner-dot" />
            <span class="ws-banner-text">今天的工作还没有完成，去处理~</span>
            <span class="ws-banner-arrow">→</span>
          </div>
        </Transition>

        <!-- 视图路由器 -->
        <div class="ws-panel">
          <div v-if="currentView === 'menu'" class="ws-menu">
            <button class="ws-menu-card" @click="currentView = 'worklog'">
              <span class="ws-menu-card-icon">📋</span>
              <span class="ws-menu-card-label">工作记录</span>
              <span class="ws-menu-card-desc">查看历史工作日志</span>
            </button>
            <button class="ws-menu-card" @click="openTypeManager('menu')">
              <span class="ws-menu-card-icon">⚙️</span>
              <span class="ws-menu-card-label">工作类型</span>
              <span class="ws-menu-card-desc">自定义工作分类</span>
            </button>
          </div>

          <WorkForm
            v-else-if="currentView === 'workform'"
            :date="selectedWorkDate"
            @back="currentView = 'menu'"
            @manage-types="openTypeManager('workform')"
          />

          <WorkTypeManager
            v-else-if="currentView === 'worktype-manager'"
            @back="currentView = previousView"
          />

          <WorkLog v-else @back="currentView = 'menu'" />
        </div>
      </div>
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
import WorkTypeManager from './WorkTypeManager.vue'
import SkinPicker from './SkinPicker.vue'

const petStore = usePetStore()
const appWindow = getCurrentWindow()
const { setIgnoreCursorEvents } = useCursorEvents()

// ===== 皮肤管理 =====
const SKIN_KEY = 'codepet-workspace-skin'
const currentSkin = ref<string>(
  localStorage.getItem(SKIN_KEY) || DEFAULT_SKIN
)
watch(currentSkin, (val) => {
  localStorage.setItem(SKIN_KEY, val)
})

type RightView = 'menu' | 'worklog' | 'workform' | 'worktype-manager'

/** 右侧面板当前视图 */
const currentView = ref<RightView>('menu')
/** 进入类型管理前的上一个视图（用于返回导航） */
const previousView = ref<RightView>('menu')
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

/**
 * 打开工作类型管理视图
 *
 * 记录来源视图，以便返回时正确导航。
 */
const openTypeManager = (from: RightView): void => {
  previousView.value = from
  currentView.value = 'worktype-manager'
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
/* ========================================
   Workspace — 夜曲工作室 暗色主题
   ======================================== */

.workspace {
  --ws-bg: #09090f;
  --ws-bg-soft: #12121d;
  --ws-surface: rgba(255, 255, 255, 0.025);
  --ws-surface-hover: rgba(255, 255, 255, 0.05);
  --ws-surface-active: rgba(255, 255, 255, 0.08);
  --ws-border: rgba(255, 255, 255, 0.06);
  --ws-border-focus: rgba(255, 255, 255, 0.12);
  --ws-text: #e4e4ec;
  --ws-text-muted: #6e6e80;
  --ws-text-dim: #444456;
  --ws-accent: #e2b04a;
  --ws-accent-soft: #c99a3a;
  --ws-accent-glow: rgba(226, 176, 74, 0.12);
  --ws-accent-glow-strong: rgba(226, 176, 74, 0.25);
  --ws-lavender: #9180c8;
  --ws-lavender-glow: rgba(145, 128, 200, 0.12);
  --ws-rose: #d4787a;
  --ws-mint: #6eb89a;

  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 80% 60% at 20% 80%, rgba(145, 128, 200, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 80% 10%, rgba(226, 176, 74, 0.04) 0%, transparent 50%),
    var(--ws-bg);
  color: var(--ws-text);
  pointer-events: auto;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
}

/* ===== 顶部栏 ===== */
.ws-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.015);
  border-bottom: 1px solid var(--ws-border);
  flex-shrink: 0;
  cursor: grab;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.ws-topbar:active {
  cursor: grabbing;
}

.ws-btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border: 1px solid var(--ws-border);
  border-radius: 8px;
  background: var(--ws-surface);
  color: var(--ws-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ws-btn-back:hover {
  background: var(--ws-surface-hover);
  color: var(--ws-text);
  border-color: var(--ws-border-focus);
}

.ws-btn-back-icon {
  font-size: 13px;
  transition: transform 0.2s ease;
}

.ws-btn-back:hover .ws-btn-back-icon {
  transform: translateX(-2px);
}

.ws-topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== 主体两栏 ===== */
.ws-main {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* ===== 左侧：日历 ===== */
.ws-left {
  flex: 3;
  min-width: 0;
  padding: 12px 10px 12px 14px;
  display: flex;
  flex-direction: column;
}

/* ===== 右侧：面板 ===== */
.ws-right {
  flex: 2;
  min-width: 280px;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--ws-border);
  background: rgba(255, 255, 255, 0.01);
}

.ws-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 菜单卡片 ===== */
.ws-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 16px;
}

.ws-menu-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 18px 20px;
  border: 1px solid var(--ws-border);
  border-radius: 14px;
  background: var(--ws-surface);
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: left;
}

.ws-menu-card:hover {
  background: var(--ws-surface-hover);
  border-color: var(--ws-border-focus);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.ws-menu-card-icon {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 4px;
}

.ws-menu-card-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ws-text);
}

.ws-menu-card-desc {
  font-size: 11px;
  color: var(--ws-text-muted);
  line-height: 1.4;
}

/* ===== 提醒横幅 ===== */
.ws-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin: 12px 14px 0;
  background: var(--ws-accent-glow);
  border: 1px solid rgba(226, 176, 74, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.ws-banner:hover {
  background: var(--ws-accent-glow-strong);
  border-color: rgba(226, 176, 74, 0.35);
  transform: translateY(-1px);
}

.ws-banner-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ws-accent);
  flex-shrink: 0;
  animation: ws-pulse 2s ease-in-out infinite;
}

@keyframes ws-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--ws-accent-glow-strong); }
  50% { box-shadow: 0 0 0 6px transparent; }
}

.ws-banner-text {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--ws-accent);
  line-height: 1.4;
}

.ws-banner-arrow {
  font-size: 14px;
  color: var(--ws-accent-soft);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.ws-banner:hover .ws-banner-arrow {
  transform: translateX(3px);
}

/* ===== 过渡动画 ===== */
.ws-banner-enter-active,
.ws-banner-leave-active {
  transition: all 0.3s ease;
}
.ws-banner-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}
.ws-banner-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
