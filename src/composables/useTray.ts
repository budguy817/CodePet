// 文件路径: src/composables/useTray.ts
// 系统托盘交互组合式函数
//
// 负责前端与 Rust 后端托盘功能的通信：
// 1. 监听来自托盘菜单的模式切换事件
// 2. 提供隐藏到托盘和退出应用的方法
// 3. 管理托盘相关的前端状态

import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { usePetStore } from '@/stores/petStore'

/**
 * 系统托盘交互组合式函数
 *
 * 封装与系统托盘相关的所有前端逻辑：
 * - 监听 Rust 后端通过 `tray-switch-mode` 事件发送的模式切换请求
 * - 提供 `hideToTray()` 方法将窗口隐藏到托盘
 * - 提供 `quitApp()` 方法彻底退出应用（清理托盘图标）
 *
 * 使用场景：
 * - Pet.vue 右键菜单"隐藏到托盘"调用 hideToTray()
 * - Pet.vue 右键菜单"退出"调用 quitApp()
 * - App.vue 或 Pet.vue 中监听托盘模式切换事件
 *
 * 边界情况处理：
 * - 事件监听器的注册与清理（防止内存泄漏）
 * - invoke 调用失败时的错误处理与日志记录
 * - 组件卸载时自动取消事件监听
 */
export function useTray() {
  // ===== 状态 =====

  /** 托盘功能是否已成功初始化 */
  const isTrayReady = ref<boolean>(false)

  /** 窗口当前是否可见（用于托盘左键切换逻辑的前端判断） */
  const isWindowVisible = ref<boolean>(true)

  // ===== 事件监听清理函数 =====

  /** tray-switch-mode 事件的取消监听函数 */
  let unlistenModeSwitch: UnlistenFn | null = null

  // ===== Pinia Store =====

  const petStore = usePetStore()

  // ===== 操作方法 =====

  /**
   * 隐藏宠物窗口到系统托盘
   *
   * 调用 Rust 后端的 hide_window 命令将窗口隐藏。
   * 隐藏后应用仍在后台运行，用户可通过托盘图标恢复。
   *
   * 异步操作，失败时仅记录错误不中断用户操作。
   */
  const hideToTray = async (): Promise<void> => {
    try {
      await invoke('hide_window')
      isWindowVisible.value = false
      console.log('[CodePet] 🖥️ 宠物已隐藏到系统托盘')
    } catch (error) {
      console.error('[CodePet] 隐藏到托盘失败:', error)
    }
  }

  /**
   * 彻底退出应用程序
   *
   * 调用 Rust 后端的 quit_app 命令终止整个进程。
   * 此操作会清理系统托盘图标，确保不留后台进程。
   *
   * 异步操作，失败时仅记录错误。
   * （实际上如果退出成功，这行代码可能不会执行完）
   */
  const quitApp = async (): Promise<void> => {
    try {
      console.log('[CodePet] 👋 正在退出应用...')
      await invoke('quit_app')
    } catch (error) {
      console.error('[CodePet] 退出应用失败:', error)
    }
  }

  /**
   * 显示宠物窗口（从托盘恢复）
   *
   * 调用 Rust 后端的 show_window 命令将窗口显示并聚焦。
   * 通常在需要从托盘恢复宠物时调用。
   */
  const showFromTray = async (): Promise<void> => {
    try {
      await invoke('show_window')
      isWindowVisible.value = true
      console.log('[CodePet] 🐾 宠物已从系统托盘恢复')
    } catch (error) {
      console.error('[CodePet] 从托盘恢复失败:', error)
    }
  }

  // ===== 事件监听 =====

  /**
   * 注册托盘模式切换事件监听
   *
   * 当用户通过系统托盘右键菜单选择"工作台"或"智能问答"时，
   * Rust 后端会向前端发送 `tray-switch-mode` 事件。
   * 此监听器接收事件并调用 petStore 切换到对应模式。
   *
   * 事件触发时序：
   * 1. 用户点击托盘菜单项
   * 2. Rust on_menu_event 回调 → 先 show 窗口 → 再 emit 事件
   * 3. 前端收到事件 → 调用 petStore.openWorkspace() / openChat()
   * 4. App.vue watch(appMode) → 自动调整窗口大小和置顶属性
   */
  const setupTrayListeners = async (): Promise<void> => {
    try {
      // 监听模式切换事件
      unlistenModeSwitch = await listen<string>('tray-switch-mode', (event) => {
        const mode = event.payload
        console.log(`[CodePet] 📋 托盘菜单切换模式: ${mode}`)

        if (mode === 'workspace') {
          petStore.openWorkspace()
        } else if (mode === 'chat') {
          petStore.openChat()
        }

        // 标记窗口为可见（Rust 端已先 show 了窗口）
        isWindowVisible.value = true
      })

      isTrayReady.value = true
      console.log('[CodePet] ✅ 托盘事件监听已就绪')
    } catch (error) {
      console.error('[CodePet] 注册托盘事件监听失败:', error)
      // 托盘功能降级：菜单切换不可用，但隐藏/退出仍可通过
      // Rust 命令正常工作，仅事件监听失败
      isTrayReady.value = false
    }
  }

  /**
   * 清理所有托盘事件监听器
   *
   * 在组件卸载时调用，防止内存泄漏和重复监听。
   */
  const cleanupTrayListeners = (): void => {
    if (unlistenModeSwitch) {
      unlistenModeSwitch()
      unlistenModeSwitch = null
    }
  }

  // ===== 导出 =====

  return {
    // 状态
    /** 托盘功能是否已就绪 */
    isTrayReady,
    /** 窗口是否可见 */
    isWindowVisible,

    // 方法
    /** 隐藏窗口到系统托盘 */
    hideToTray,
    /** 彻底退出应用程序（清理托盘） */
    quitApp,
    /** 从托盘恢复窗口 */
    showFromTray,

    // 生命周期
    /** 注册托盘事件监听（在 onMounted 中调用） */
    setupTrayListeners,
    /** 清理托盘事件监听（在 onUnmounted 中调用） */
    cleanupTrayListeners,
  }
}
