// 文件路径: src/stores/workStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { load } from '@tauri-apps/plugin-store'

// ===== 类型定义 =====

/** 自定义工作类型 */
export interface WorkType {
  /** 唯一 ID */
  id: string
  /** 类型名称 */
  label: string
}

/** 单条工作记录 */
export interface WorkRecord {
  /** 唯一 ID */
  id: number
  /** 工作类型 */
  type: string
  /** 紧急程度 */
  urgency: string
  /** 具体内容 */
  content: string
  /** 工作进度 */
  progress: string
  /** 所属日期（YYYY-MM-DD） */
  dateKey: string
}

/** 持久化数据格式 */
interface StoredData {
  records: WorkRecord[]
  nextId: number
  completedDates: string[]
  /** 每日提醒时间（HH:MM 格式，如 "17:50"） */
  reminderTime: string
  /** 是否启用每日提醒 */
  reminderEnabled: boolean
  /** 最近一次已提醒的日期（YYYY-MM-DD），防止同一天重复提醒 */
  lastRemindedDate: string
  /** 自定义工作类型列表 */
  workTypes: WorkType[]
}

/**
 * 工作记录 Store（tauri-plugin-store 持久化）
 *
 * 数据保存在系统应用数据目录（Windows: %APPDATA%/com.codepet.app/）
 * Rust 异步 I/O，原子写入，不闪退。
 */
export const useWorkStore = defineStore('work', () => {
  // ===== 状态 =====
  const records = ref<WorkRecord[]>([])
  const nextId = ref<number>(1)
  /** 已标记为"全部完成"的日期集合 */
  const completedDates = ref<Set<string>>(new Set())
  const loaded = ref<boolean>(false)

  /** 每日提醒时间（HH:MM 格式，如 "17:50"） */
  const reminderTime = ref<string>('17:50')
  /** 是否启用每日提醒 */
  const reminderEnabled = ref<boolean>(true)
  /** 最近一次已提醒的日期（YYYY-MM-DD），防止同一天重复提醒 */
  const lastRemindedDate = ref<string>('')

  /** 自定义工作类型列表（持久化存储） */
  const workTypes = ref<WorkType[]>([])

  /** 默认工作类型（首次使用或重置时使用） */
  const DEFAULT_WORK_TYPES: WorkType[] = [
    { id: crypto.randomUUID(), label: '会议' },
    { id: crypto.randomUUID(), label: '开发' },
    { id: crypto.randomUUID(), label: '改bug' },
  ]

  // ===== 持久化（tauri-plugin-store） =====
  let storePromise: ReturnType<typeof load> | null = null

  const getStore = () => {
    if (!storePromise) {
      storePromise = load('work-records.json', { autoSave: false, defaults: {} })
    }
    return storePromise
  }

  const loadFromDisk = async (): Promise<void> => {
    try {
      const store = await getStore()
      const data = await store.get<StoredData>('data')
      if (data) {
        records.value = data.records || []
        nextId.value = data.nextId || 1
        completedDates.value = new Set(data.completedDates || [])
        reminderTime.value = data.reminderTime || '17:50'
        reminderEnabled.value = data.reminderEnabled ?? true
        lastRemindedDate.value = data.lastRemindedDate || ''
        workTypes.value = data.workTypes || [...DEFAULT_WORK_TYPES]
      } else {
        // 首次使用：初始化默认工作类型
        workTypes.value = [...DEFAULT_WORK_TYPES]
      }
    } catch (e) {
      console.warn('[CodePet] 加载工作记录失败:', e)
    }
    loaded.value = true
  }

  const saveToDisk = async (): Promise<void> => {
    if (!loaded.value) return
    try {
      const store = await getStore()
      await store.set('data', {
        records: records.value,
        nextId: nextId.value,
        completedDates: [...completedDates.value],
        reminderTime: reminderTime.value,
        reminderEnabled: reminderEnabled.value,
        lastRemindedDate: lastRemindedDate.value,
        workTypes: workTypes.value,
      })
      await store.save()
    } catch (e) {
      console.error('[CodePet] 保存工作记录失败:', e)
    }
  }

  // ===== 计算属性 =====
  const getByDate = computed(() => {
    return (dateKey: string): WorkRecord[] =>
      records.value.filter((r) => r.dateKey === dateKey)
  })

  /** 有工作记录的日期集合 */
  const datesWithRecordsSet = computed(() => {
    const set = new Set<string>()
    records.value.forEach((r) => set.add(r.dateKey))
    return set
  })

  // ===== 方法 =====
  const formatDateKey = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const addRecord = async (date: Date, record: Omit<WorkRecord, 'id' | 'dateKey'>): Promise<void> => {
    records.value.push({
      ...record,
      id: nextId.value++,
      dateKey: formatDateKey(date),
    })
    await saveToDisk()
  }

  /** 标记某日期的工作全部完成 / 取消完成 */
  const setDateCompleted = async (dateKey: string, completed: boolean): Promise<void> => {
    if (completed) {
      completedDates.value.add(dateKey)
    } else {
      completedDates.value.delete(dateKey)
    }
    // 触发 ref 响应式更新（Set 的 add/delete 不会被 ref 自动追踪）
    completedDates.value = new Set(completedDates.value)
    await saveToDisk()
  }

  /** 检查某日期是否已标记完成 */
  const isDateCompleted = (dateKey: string): boolean => {
    return completedDates.value.has(dateKey)
  }

  const removeRecord = async (id: number): Promise<void> => {
    const idx = records.value.findIndex((r) => r.id === id)
    if (idx !== -1) {
      records.value.splice(idx, 1)
      saveToDisk()
    }
  }

  const clearDate = (dateKey: string): void => {
    records.value = records.value.filter((r) => r.dateKey !== dateKey)
    saveToDisk()
  }

  // ===== 提醒相关方法 =====

  /**
   * 设置每日提醒时间
   *
   * 修改提醒时间时自动重置"今天已提醒"标记，
   * 方便用户调整时间后立即测试提醒功能。
   *
   * @param time - HH:MM 格式的时间字符串，如 "17:50"
   */
  const setReminderTime = async (time: string): Promise<void> => {
    reminderTime.value = time
    // 修改提醒时间后重置今天的提醒标记，允许重新触发
    lastRemindedDate.value = ''
    await saveToDisk()
  }

  /**
   * 启用/禁用每日提醒
   *
   * @param enabled - 是否启用
   */
  const setReminderEnabled = async (enabled: boolean): Promise<void> => {
    reminderEnabled.value = enabled
    await saveToDisk()
  }

  /**
   * 标记今天已提醒（防止同一天重复提醒）
   */
  const markRemindedToday = async (): Promise<void> => {
    const today = formatDateKey(new Date())
    lastRemindedDate.value = today
    await saveToDisk()
  }

  /**
   * 检查今天是否已经提醒过
   */
  const isRemindedToday = (): boolean => {
    const today = formatDateKey(new Date())
    return lastRemindedDate.value === today
  }

  /**
   * 检查今天是否有未完成的工作
   * - 今天有工作记录
   * - 今天没有被标记为"全部完成"
   */
  const hasIncompleteWorkToday = (): boolean => {
    const todayKey = formatDateKey(new Date())
    const todayRecords = records.value.filter((r) => r.dateKey === todayKey)
    // 今天没有工作记录，无需提醒
    if (todayRecords.length === 0) return false
    // 今天已标记全部完成，无需提醒
    if (completedDates.value.has(todayKey)) return false
    return true
  }

  // ===== 自定义工作类型管理 =====

  /**
   * 新增工作类型
   *
   * @param label - 类型名称（不能与已有类型重名）
   * @returns 新创建的类型对象
   */
  const addWorkType = async (label: string): Promise<WorkType> => {
    // 去除首尾空格
    const trimmed = label.trim()
    // 重名校验
    if (workTypes.value.some((t) => t.label === trimmed)) {
      throw new Error(`工作类型"${trimmed}"已存在`)
    }
    const newType: WorkType = {
      id: crypto.randomUUID(),
      label: trimmed,
    }
    workTypes.value.push(newType)
    await saveToDisk()
    return newType
  }

  /**
   * 修改工作类型名称
   *
   * 修改后，所有使用旧名称的工作记录会自动更新为新的类型名称。
   *
   * @param id - 类型 ID
   * @param newLabel - 新名称（不能与已有类型重名）
   */
  const updateWorkType = async (id: string, newLabel: string): Promise<void> => {
    const trimmed = newLabel.trim()
    const type = workTypes.value.find((t) => t.id === id)
    if (!type) throw new Error('工作类型不存在')
    // 重名校验（排除自身）
    if (workTypes.value.some((t) => t.id !== id && t.label === trimmed)) {
      throw new Error(`工作类型"${trimmed}"已存在`)
    }
    const oldLabel = type.label
    type.label = trimmed
    // 更新所有使用旧名称的工作记录
    records.value.forEach((r) => {
      if (r.type === oldLabel) {
        r.type = trimmed
      }
    })
    await saveToDisk()
  }

  /**
   * 删除工作类型
   *
   * 已有工作记录中仍会保留该类型名称（不会丢失历史数据），
   * 只是下拉菜单中不再显示该选项。
   *
   * @param id - 类型 ID
   */
  const deleteWorkType = async (id: string): Promise<void> => {
    const idx = workTypes.value.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('工作类型不存在')
    workTypes.value.splice(idx, 1)
    await saveToDisk()
  }

  /**
   * 获取仅包含标签名的工作类型列表（供表单下拉使用）
   */
  const workTypeLabels = computed(() =>
    workTypes.value.map((t) => t.label)
  )

  // 启动时加载
  loadFromDisk()

  return {
    records,
    loaded,
    getByDate,
    addRecord,
    removeRecord,
    setDateCompleted,
    isDateCompleted,
    datesWithRecords: datesWithRecordsSet,
    completedDates,
    clearDate,
    formatDateKey,
    loadFromDisk,
    // 提醒
    reminderTime,
    reminderEnabled,
    lastRemindedDate,
    setReminderTime,
    setReminderEnabled,
    markRemindedToday,
    isRemindedToday,
    hasIncompleteWorkToday,
    // 自定义工作类型
    workTypes,
    workTypeLabels,
    addWorkType,
    updateWorkType,
    deleteWorkType,
  }
})
