// 文件路径: src/composables/useWorkReminder.ts
// 工作提醒组合式函数
//
// 定时检查当前时间是否到达设定的提醒时间，如果到达且今天未被标记为"全部完成"，
// 则触发提醒回调。同一日内只触发一次。
//
// 使用场景：
// - Pet.vue：桌面宠物模式下弹出对话气泡提醒
// - Workspace.vue：工作台模式下右侧展示消息横幅提醒

import { onMounted, onUnmounted } from 'vue'
import { useWorkStore } from '@/stores/workStore'

/** 提醒检查间隔（毫秒），30 秒足够覆盖分钟级提醒精度 */
const CHECK_INTERVAL_MS = 30_000

/** store 加载最大等待时间（毫秒），超时后放弃等待 */
const STORE_LOAD_TIMEOUT_MS = 10_000

/**
 * 工作提醒组合式函数
 *
 * 每隔 CHECK_INTERVAL_MS 检查一次：
 * 1. 提醒功能是否启用
 * 2. 今天是否已被标记为"全部完成"（已完成的日期不再提醒）
 * 3. 当前时间（HH:MM）是否到达提醒时间（首次检查允许 >= 匹配，覆盖启动后已过提醒时间的场景）
 * 4. 今天是否尚未提醒过
 *
 * 条件全部满足时调用 onReminder 回调，并自动标记今天已提醒。
 *
 * @param onReminder - 提醒触发时的回调函数
 * @param debugLabel  - 调试标签（用于日志区分调用来源，如 'Pet' / 'Workspace'）
 */
export function useWorkReminder(onReminder: () => void, debugLabel = 'Reminder') {
  const workStore = useWorkStore()

  /** 定时器 ID */
  let timerId: ReturnType<typeof setInterval> | null = null

  /** 是否已完成首次检查（首次检查用 >= 匹配，后续用 === 精确匹配） */
  let firstCheckDone = false

  /** store 加载等待的起始时间 */
  let waitStartTime = 0

  /**
   * 获取当前时间的 HH:MM 字符串
   */
  const getCurrentTimeStr = (): string => {
    const now = new Date()
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }

  /**
   * 检查前置条件是否满足，并输出跳过原因到控制台
   */
  const prerequisitesMet = (): boolean => {
    // 1. 提醒功能未启用
    if (!workStore.reminderEnabled) {
      console.log(`[CodePet] ⏰ ${debugLabel}: 提醒功能已关闭，跳过`)
      return false
    }
    // 2. 今天已被标记为"全部完成"
    const todayKey = workStore.formatDateKey(new Date())
    if (workStore.isDateCompleted(todayKey)) {
      console.log(`[CodePet] ⏰ ${debugLabel}: 今天(${todayKey})已标记全部完成，跳过`)
      return false
    }
    // 3. 今天已经提醒过
    if (workStore.isRemindedToday()) {
      console.log(`[CodePet] ⏰ ${debugLabel}: 今天已提醒过(${workStore.lastRemindedDate})，跳过`)
      return false
    }
    return true
  }

  /**
   * 执行提醒触发（标记 + 回调）
   */
  const fireReminder = (): void => {
    console.log(`[CodePet] ⏰ ${debugLabel}: 触发提醒！`)
    workStore.markRemindedToday()
    onReminder()
  }

  /**
   * 定时检查是否应该触发提醒
   */
  const checkReminder = (): void => {
    if (!prerequisitesMet()) return

    const nowTime = getCurrentTimeStr()
    const [rh, rm] = workStore.reminderTime.split(':').map(Number)
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const reminderMinutes = rh * 60 + rm

    console.log(
      `[CodePet] ⏰ ${debugLabel}: 检查 ` +
      `现在=${nowTime}(${nowMinutes}分) ` +
      `提醒=${workStore.reminderTime}(${reminderMinutes}分) ` +
      `首次=${!firstCheckDone}`
    )

    if (!firstCheckDone) {
      firstCheckDone = true
      if (nowMinutes >= reminderMinutes) {
        console.log(`[CodePet] ⏰ ${debugLabel}: 首次检查，时间已过提醒点 → 触发`)
        fireReminder()
      } else {
        console.log(`[CodePet] ⏰ ${debugLabel}: 首次检查，时间未到，等待定时轮询 (每${CHECK_INTERVAL_MS / 1000}s)`)
      }
    } else {
      if (nowTime === workStore.reminderTime) {
        console.log(`[CodePet] ⏰ ${debugLabel}: 时间精确匹配 → 触发`)
        fireReminder()
      }
    }
  }

  // ===== 生命周期 =====

  onMounted(() => {
    console.log(`[CodePet] ⏰ ${debugLabel}: 组件挂载，开始等待 store 加载...`)
    waitStartTime = Date.now()

    const waitAndCheck = (): void => {
      if (workStore.loaded) {
        console.log(`[CodePet] ⏰ ${debugLabel}: store 已加载，开始首次检查`)
        checkReminder()
        timerId = setInterval(checkReminder, CHECK_INTERVAL_MS)
      } else if (Date.now() - waitStartTime > STORE_LOAD_TIMEOUT_MS) {
        console.warn(`[CodePet] ⏰ ${debugLabel}: store 加载超时(${STORE_LOAD_TIMEOUT_MS}ms)，放弃等待`)
      } else {
        setTimeout(waitAndCheck, 100)
      }
    }
    waitAndCheck()
  })

  onUnmounted(() => {
    console.log(`[CodePet] ⏰ ${debugLabel}: 组件卸载，清理定时器`)
    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
  })
}
