// 文件路径: src/stores/petStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ===== 类型定义 =====

/** 宠物动画状态 */
export type PetState = 'idle' | 'walk' | 'click' | 'drag' | 'sleep'

/** 应用显示模式 */
export type AppMode = 'pet' | 'workspace' | 'chat'

/** 宠物屏幕位置 */
export interface PetPosition {
  /** 水平坐标（物理像素） */
  x: number
  /** 垂直坐标（物理像素） */
  y: number
}

/** 宠物配置 */
export interface PetConfig {
  /** 宠物名称 */
  name: string
  /** 移动速度（像素/帧） */
  speed: number
  /** 是否启用自动闲逛 */
  autoWander: boolean
}

// ===== Store 定义 =====

/**
 * 宠物状态管理 Store
 *
 * 管理宠物的动画状态、屏幕位置和配置。
 * 使用 Pinia Setup Store 语法（组合式 API 风格）。
 *
 * 动画状态流转：
 * ```
 * idle ──(点击)──▶ click ──(1s后)──▶ idle
 *   │                                    │
 *   ├──(拖拽)──▶ drag ──(释放)──▶ idle
 *   │
 *   └──(定时)──▶ walk ──(到达)──▶ idle
 *                  │
 *                  └──(闲置超时)──▶ sleep ──(点击/移动)──▶ idle
 * ```
 */
export const usePetStore = defineStore('pet', () => {
  // ===== 状态 =====

  /** 当前动画状态 */
  const currentState = ref<PetState>('idle')

  /** 宠物的屏幕位置 */
  const position = ref<PetPosition>({ x: 100, y: 100 })

  /** 宠物配置 */
  const config = ref<PetConfig>({
    name: 'CodePet',
    speed: 2,
    autoWander: false,
  })

  /** 上一次的状态（用于状态回退等场景） */
  const previousState = ref<PetState>('idle')

  /** 当前应用模式 */
  const appMode = ref<AppMode>('pet')

  // ===== 计算属性 =====

  /** 宠物是否正在移动中 */
  const isMoving = computed<boolean>(
    () => currentState.value === 'walk' || currentState.value === 'drag'
  )

  /** 宠物是否处于可交互状态（非睡眠） */
  const isInteractive = computed<boolean>(
    () => currentState.value !== 'sleep'
  )

  // ===== 操作方法 =====

  /**
   * 切换宠物动画状态
   *
   * @param state - 目标动画状态
   *
   * 状态切换规则：
   * - 睡眠状态下仅 'click' 和 'drag' 可以唤醒
   * - 拖拽状态下不允许切换到其他状态（由 useWindowDrag 控制）
   */
  const setState = (state: PetState): void => {
    // 睡眠状态保护：仅交互操作可以唤醒
    if (currentState.value === 'sleep' && state !== 'click' && state !== 'drag') {
      return
    }

    previousState.value = currentState.value
    currentState.value = state
  }

  /**
   * 更新宠物屏幕位置
   *
   * @param x - 水平坐标
   * @param y - 垂直坐标
   */
  const setPosition = (x: number, y: number): void => {
    position.value = { x, y }
  }

  /**
   * 更新宠物配置
   *
   * @param partialConfig - 部分配置（仅更新提供的字段）
   */
  const updateConfig = (partialConfig: Partial<PetConfig>): void => {
    config.value = { ...config.value, ...partialConfig }
  }

  /** 打开工作台 */
  const openWorkspace = (): void => {
    appMode.value = 'workspace'
  }

  /** 打开智能问答 */
  const openChat = (): void => {
    appMode.value = 'chat'
  }

  /** 关闭子窗口，返回桌宠 */
  const closeSubWindow = (): void => {
    appMode.value = 'pet'
  }

  /**
   * 重置宠物状态到初始值
   * 用于重新开始或错误恢复场景
   */
  const reset = (): void => {
    currentState.value = 'idle'
    previousState.value = 'idle'
    position.value = { x: 100, y: 100 }
  }

  return {
    // 状态
    currentState,
    position,
    config,
    previousState,
    appMode,
    // 计算属性
    isMoving,
    isInteractive,
    // 方法
    setState,
    setPosition,
    updateConfig,
    openWorkspace,
    openChat,
    closeSubWindow,
    reset,
  }
})
