// 文件路径: src/composables/useWindowDrag.ts
import { ref, onUnmounted } from 'vue'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'
import { useCursorEvents } from './useCursorEvents'

/**
 * 窗口拖拽移动组合式函数（性能优化版）
 *
 * 优化策略：
 * 1. 缓存窗口引用，避免重复调用 getCurrentWindow()
 * 2. 自行追踪窗口位置，拖拽期间不查询 outerPosition()（省掉一半 IPC）
 * 3. 使用 requestAnimationFrame 批量更新，流畅 60fps
 * 4. 基于初始位置 + 累积 delta 计算，消除增量漂移
 *
 * 核心时序：
 * 1. mousedown → 获取初始窗口位置（1 IPC），记录起始屏幕坐标
 * 2. mousemove → 仅更新内存中的目标位置，由 rAF 驱动实际 setPosition
 * 3. mouseup   → 清理监听器和定时器
 */
export function useWindowDrag() {
  // ===== 缓存窗口引用（拖拽期间复用） =====
  const appWindow = getCurrentWindow()

  // ===== 状态 =====
  const isDragging = ref<boolean>(false)
  /** 拖拽开始时的窗口物理位置 */
  let dragStartX = 0
  let dragStartY = 0
  /** 拖拽开始时的鼠标屏幕坐标 */
  let mouseStartScreenX = 0
  let mouseStartScreenY = 0
  /** setPosition 连续失败计数 */
  let failCount = 0
  const MAX_FAIL_COUNT = 2

  const { setIgnoreCursorEvents } = useCursorEvents()

  // ===== rAF 驱动 =====
  let updatePending = false
  let pendingX = 0
  let pendingY = 0

  // ===== 无移动超时 =====
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null
  const INACTIVITY_TIMEOUT_MS = 500

  /** 执行实际的窗口位置更新（由 rAF 回调驱动） */
  const flushPosition = async (): Promise<void> => {
    updatePending = false
    if (!isDragging.value) return

    try {
      await appWindow.setPosition(new PhysicalPosition(pendingX, pendingY))
      failCount = 0
    } catch (error) {
      failCount++
      console.error(`[CodePet] setPosition 失败 (${failCount}/${MAX_FAIL_COUNT}):`, error)
      if (failCount >= MAX_FAIL_COUNT) {
        try {
          await appWindow.setPosition(new PhysicalPosition(dragStartX, dragStartY))
        } catch (rollbackError) {
          console.error('[CodePet] 位置回滚也失败了:', rollbackError)
        }
        endDrag()
      }
    }
  }

  /** rAF 循环：每帧检查是否需要更新位置 */
  const rafLoop = (): void => {
    if (!isDragging.value) return
    if (updatePending) {
      flushPosition()
    }
    requestAnimationFrame(rafLoop)
  }

  /** 重置无移动超时 */
  const resetInactivityTimer = (): void => {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      console.warn('[CodePet] 拖拽超时（500ms 无移动），自动结束拖拽')
      endDrag()
    }, INACTIVITY_TIMEOUT_MS)
  }

  /** 结束拖拽 */
  const endDrag = (): void => {
    isDragging.value = false
    failCount = 0
    updatePending = false
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  /**
   * 鼠标按下处理
   * ⚠️ 事件监听器必须在任何 await 之前同步注册
   */
  const onMouseDown = async (e: MouseEvent): Promise<void> => {
    if (isDragging.value) return

    isDragging.value = true
    failCount = 0

    // 记录鼠标起始屏幕坐标
    mouseStartScreenX = e.screenX
    mouseStartScreenY = e.screenY

    // ✅ 立即同步注册事件监听器
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // 启动 rAF 循环
    requestAnimationFrame(rafLoop)
    resetInactivityTimer()

    // 异步获取窗口初始位置
    try {
      const initPos = await appWindow.outerPosition()
      dragStartX = initPos.x
      dragStartY = initPos.y
    } catch {
      console.warn('[CodePet] 获取初始窗口位置失败')
    }

    await setIgnoreCursorEvents(false)
  }

  /**
   * 鼠标移动处理（轻量级，仅更新内存状态）
   *
   * 不在此处调用 IPC，而是标记待更新位置，
   * 由 rAF 循环在下帧执行 setPosition。
   * mousemove 即使以高频触发，IPC 最多 60fps。
   */
  const handleMouseMove = (e: MouseEvent): void => {
    if (!isDragging.value) return

    // 基于初始位置 + 累积 delta 计算目标位置（无漂移）
    pendingX = dragStartX + (e.screenX - mouseStartScreenX)
    pendingY = dragStartY + (e.screenY - mouseStartScreenY)
    updatePending = true

    resetInactivityTimer()
  }

  /** 鼠标释放 */
  const handleMouseUp = (): void => {
    if (!isDragging.value) return
    endDrag()
  }

  // ===== 组件卸载清理 =====
  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    if (inactivityTimer) clearTimeout(inactivityTimer)
  })

  return {
    isDragging,
    onMouseDown,
  }
}
