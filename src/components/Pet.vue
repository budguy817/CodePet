<!--
  文件路径: src/components/Pet.vue
  宠物主组件

  整个窗口即为宠物本身，全区域可拖拽和点击。
  架构：单层结构 —— 窗口 = 宠物身体 = 可交互区域

  ┌─────────────────────────┐
  │  .pet-body              │  ← 撑满整个窗口，pointer-events: auto
  │  ┌───────────────────┐  │
  │  │   PetAnimation    │  │  ← 宠物 CSS 渲染
  │  │   + 点击反馈气泡   │  │
  │  └───────────────────┘  │
  └─────────────────────────┘
-->
<template>
  <!-- 整个窗口就是宠物，全区域可拖拽点击 -->
  <div
    class="pet-body"
    :class="{
      'is-dragging': isDragging,
      'is-sleeping': petStore.currentState === 'sleep',
    }"
    @mousedown.prevent="onMouseDown"
    @click.stop="handleClick"
    @contextmenu.prevent="showContextMenu"
  >
    <!-- 宠物动画渲染 -->
    <PetAnimation />

    <!-- 右键菜单 -->
    <Transition name="menu-fade">
      <div
        v-if="contextMenuVisible"
        ref="contextMenuRef"
        class="context-menu"
        :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
      >
        <button class="context-menu-item" @click="handleWorkspaceClick">
          工作台
        </button>
        <button class="context-menu-item" @click="handleChatClick">
          智能问答
        </button>
        <button class="context-menu-item" @click="handleExitClick">
          退出
        </button>
      </div>
    </Transition>

    <!-- 退出确认对话云层 -->
    <Transition name="dialog-fade">
      <div v-if="showExitDialog" class="exit-cloud">
        <p class="exit-cloud-text">真的要我离开吗？</p>
        <div class="exit-cloud-actions">
          <button class="exit-cloud-btn exit-cloud-btn--cancel" @click="showExitDialog = false">
            再待一会~
          </button>
          <button class="exit-cloud-btn exit-cloud-btn--confirm" @click="handleExitConfirm">
            嗯，拜拜~
          </button>
        </div>
        <!-- 小三角尾巴 -->
        <div class="exit-cloud-tail" />
      </div>
    </Transition>

    <!-- 点击反馈气泡 -->
    <Transition name="feedback-fade">
      <div v-if="showClickFeedback" class="click-feedback">
        {{ clickFeedbackText }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { usePetStore } from '@/stores/petStore'
import { useWindowDrag } from '@/composables/useWindowDrag'
import { useCursorEvents } from '@/composables/useCursorEvents'
import PetAnimation from './PetAnimation.vue'

// 缓存窗口引用（用于退出）
const appWindow = getCurrentWindow()

// ===== Store =====
const petStore = usePetStore()

// ===== Composables =====
const { isDragging, onMouseDown } = useWindowDrag()
const { setIgnoreCursorEvents, isAvailable: isCursorEventsAvailable } = useCursorEvents()

// ===== 本地状态 =====
/** 是否显示点击反馈文字 */
const showClickFeedback = ref<boolean>(false)
/** 点击反馈文字内容 */
const clickFeedbackText = ref<string>('')
import { PET_CLICK_MESSAGES } from '@/constants'

// ===== 右键菜单 =====
/** 右键菜单是否可见 */
const contextMenuVisible = ref<boolean>(false)
/** 右键菜单位置 */
const contextMenuPos = ref<{ x: number; y: number }>({ x: 0, y: 0 })
/** 右键菜单 DOM 引用（用于判断点击是否在菜单内） */
const contextMenuRef = ref<HTMLElement | null>(null)

/** 显示右键菜单 */
const showContextMenu = (e: MouseEvent): void => {
  contextMenuPos.value = { x: e.offsetX, y: e.offsetY }
  contextMenuVisible.value = true
  // 鼠标在任何地方按下都关闭菜单（桌宠 / 桌面 / 其他窗口）
  document.addEventListener('mousedown', onOutsideClick, true)
}

/** 点击菜单外部时关闭 */
const onOutsideClick = (e: MouseEvent): void => {
  // 如果点击在菜单内部，不关闭
  if (contextMenuRef.value?.contains(e.target as Node)) return
  // 关闭菜单并移除监听
  contextMenuVisible.value = false
  document.removeEventListener('mousedown', onOutsideClick, true)
}

/** 打开工作台 */
const handleWorkspaceClick = (): void => {
  contextMenuVisible.value = false
  petStore.openWorkspace()
}

/** 打开智能问答 */
const handleChatClick = (): void => {
  contextMenuVisible.value = false
  petStore.openChat()
}

// ===== 退出确认 =====
/** 是否显示退出确认弹窗 */
const showExitDialog = ref<boolean>(false)

/** 点击右键菜单"退出" */
const handleExitClick = (): void => {
  contextMenuVisible.value = false
  showExitDialog.value = true
}

/** 确认退出 */
const handleExitConfirm = async (): Promise<void> => {
  // destroy() 强制关闭窗口，比 close() 更可靠
  await appWindow.destroy()
}

// ===== 拖拽状态监听 =====
// 监听拖拽状态变化，同步到 petStore
watch(isDragging, (nowDragging, prevDragging) => {
  if (nowDragging && !prevDragging) {
    // 开始拖拽
    petStore.setState('drag')
  } else if (!nowDragging && prevDragging) {
    // 拖拽结束，回到 idle
    petStore.setState('idle')
  }
})

// ===== 交互处理 =====

/**
 * 宠物点击事件处理
 *
 * 拖拽中不触发点击（通过 isDragging 判断），
 * 点击后切换到 click 状态并显示随机反馈，
 * 1 秒后自动恢复到 idle 状态。
 */
const handleClick = (): void => {
  // 拖拽过程中不触发点击
  if (isDragging.value) return

  // 睡眠状态点击 → 唤醒
  if (petStore.currentState === 'sleep') {
    petStore.setState('idle')
    return
  }

  // 切换到点击状态
  petStore.setState('click')

  // 显示随机反馈文字
  const randomIndex = Math.floor(Math.random() * PET_CLICK_MESSAGES.length)
  clickFeedbackText.value = PET_CLICK_MESSAGES[randomIndex]
  showClickFeedback.value = true

  // 1 秒后恢复 idle
  setTimeout(() => {
    if (petStore.currentState === 'click') {
      petStore.setState('idle')
    }
    showClickFeedback.value = false
  }, 1000)
}

// ===== 生命周期 =====

onMounted(() => {
  // 初始状态：保持鼠标穿透关闭（窗口可接收鼠标事件）
  // 背景区域通过 CSS pointer-events: none 实现穿透效果
  // 这样宠物身体可以正常响应点击和拖拽
  setIgnoreCursorEvents(false)

  console.log('[CodePet] 🐾 宠物已就绪！')
  console.log(`[CodePet] 鼠标穿透功能: ${isCursorEventsAvailable.value ? '✅ 可用' : '❌ 不可用，已回退'}`)
})

onUnmounted(() => {
  // 清理右键菜单监听
  document.removeEventListener('mousedown', onOutsideClick, true)
  // 组件销毁时恢复穿透，避免残留窗口阻挡桌面操作
  setIgnoreCursorEvents(true)
})
</script>

<style scoped>
/* ========================================
   宠物身体：撑满整个窗口，全区域可拖拽点击
   ======================================== */

.pet-body {
  position: fixed;
  inset: 0;
  /* 全区域响应鼠标事件 */
  pointer-events: auto;
  /* 手型光标表示可拖拽 */
  cursor: grab;
  /* 平滑过渡 */
  transition: filter 0.2s ease;
  /* 居中子元素 */
  display: flex;
  align-items: center;
  justify-content: center;
  /* 透明背景 */
  background: transparent;
}

/* 拖拽中的光标样式 */
.pet-body.is-dragging {
  cursor: grabbing;
  filter: brightness(1.05);
}

/* 睡眠状态 */
.pet-body.is-sleeping {
  cursor: default;
  opacity: 0.9;
}

/* hover 时微微放大提示可交互 */
.pet-body:hover:not(.is-dragging) {
  filter: brightness(1.03);
}

/* ========================================
   点击反馈气泡
   ======================================== */

.click-feedback {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  /* 半透明圆角背景 */
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4px);
  color: #6d5080;
  padding: 4px 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  /* 阴影 */
  box-shadow: 0 2px 12px rgba(150, 140, 180, 0.2);
}

/* 气泡淡入淡出过渡 */
.feedback-fade-enter-active,
.feedback-fade-leave-active {
  transition: all 0.3s ease;
}

.feedback-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

.feedback-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}

/* ========================================
   右键菜单
   ======================================== */

.context-menu {
  position: absolute;
  z-index: 100;
  min-width: 0;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  box-shadow: 0 3px 12px rgba(100, 90, 130, 0.16);
  overflow: hidden;
  padding: 3px;
}

.context-menu-item {
  display: block;
  width: 100%;
  padding: 4px 14px;
  border: none;
  background: transparent;
  color: #6d5080;
  font-size: 11px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s ease;
}

.context-menu-item:hover {
  background: rgba(200, 180, 220, 0.3);
}

/* 右键菜单过渡 */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.15s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ========================================
   退出确认对话云层（无遮罩，气泡样式）
   ======================================== */

.exit-cloud {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 3px 14px rgba(130, 120, 170, 0.16);
  text-align: center;
  min-width: 0;
  white-space: nowrap;
}

/* 对话云层小三角尾巴 */
.exit-cloud-tail {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(255, 255, 255, 0.94);
}

.exit-cloud-text {
  color: #5d4070;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
  line-height: 1.4;
  white-space: nowrap;
}

.exit-cloud-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.exit-cloud-btn {
  padding: 3px 10px;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.exit-cloud-btn--cancel {
  background: rgba(200, 190, 220, 0.35);
  color: #7d6090;
}

.exit-cloud-btn--cancel:hover {
  background: rgba(200, 190, 220, 0.55);
}

.exit-cloud-btn--confirm {
  background: #c9b1e8;
  color: #fff;
}

.exit-cloud-btn--confirm:hover {
  background: #b89ad8;
}

/* 云层过渡 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: all 0.25s ease;
}
.dialog-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.9);
}
.dialog-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px) scale(0.9);
}
</style>
