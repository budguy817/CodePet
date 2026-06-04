// 文件路径: src/stores/workStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { load } from '@tauri-apps/plugin-store'

// ===== 类型定义 =====

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
  }
})
