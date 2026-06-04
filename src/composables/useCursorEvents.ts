// 文件路径: src/composables/useCursorEvents.ts
import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'

/**
 * 鼠标穿透控制组合式函数
 *
 * 封装 Tauri 的 `set_ignore_cursor_events` 命令，
 * 控制窗口是否将鼠标事件穿透到桌面。
 * 当宠物背景区域需要被桌面穿透时调用。
 *
 * 边界情况处理：
 * - 若 Tauri 命令调用失败，记录错误日志并标记功能不可用
 * - 提供 `isAvailable` 状态供组件判断是否需要回退行为
 */
export function useCursorEvents() {
  /** 鼠标穿透功能是否可用（命令调用失败后标记为 false） */
  const isAvailable = ref<boolean>(true)

  /**
   * 设置窗口鼠标穿透状态
   *
   * @param ignore - true = 鼠标穿透（背景可点到桌面），false = 正常响应鼠标
   * @returns Promise<void>
   *
   * 时序注意：
   * - mousedown 时调用 setIgnoreCursorEvents(false)，关闭穿透以响应拖拽
   * - mouseup 时调用 setIgnoreCursorEvents(true)，恢复穿透让背景可透过
   */
  const setIgnoreCursorEvents = async (ignore: boolean): Promise<void> => {
    // 若之前已标记为不可用，跳过调用
    if (!isAvailable.value) {
      console.warn('[CodePet] 鼠标穿透功能已标记为不可用，跳过调用')
      return
    }

    try {
      await invoke('set_ignore_cursor_events', { ignore })
    } catch (error) {
      // 失败回退：标记功能不可用，记录错误日志
      isAvailable.value = false
      console.error(
        `[CodePet] 鼠标穿透设置失败 (ignore=${ignore}):`,
        error,
        '—— 功能已标记为不可用，依赖穿透的操作将回退为始终允许点击'
      )
    }
  }

  return {
    /** 鼠标穿透功能是否可用 */
    isAvailable,
    /** 设置窗口鼠标穿透状态 */
    setIgnoreCursorEvents,
  }
}
