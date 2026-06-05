// 文件路径: src/composables/useUpdater.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { check } from '@tauri-apps/plugin-updater'
import { Store } from '@tauri-apps/plugin-store'

// ===== 类型定义 =====

/** 更新状态 */
export type UpdateStatus =
  | 'idle'        // 空闲，未检查
  | 'checking'    // 正在检查更新
  | 'available'   // 发现新版本
  | 'downloading' // 正在下载
  | 'ready'       // 下载完成，准备安装
  | 'error'       // 检查出错

/** 更新信息 */
export interface UpdateInfo {
  /** 新版本号 */
  version: string
  /** 发布日期 */
  date: string
  /** 更新说明 */
  notes: string
}

/**
 * 自动更新检查间隔（毫秒）
 * 24 小时后再次自动检查，避免每次启动都请求网络
 */
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

/**
 * Store 中保存上次检查时间的键名
 */
const STORE_KEY_LAST_CHECK = 'updater_last_check'

// ===== 组合式函数 =====

/**
 * 自动更新管理组合式函数
 *
 * 功能：
 * - 应用启动时静默检查更新（每天最多一次）
 * - 从托盘菜单手动触发检查更新
 * - 下载进度跟踪
 * - 下载完成自动安装
 *
 * 用法：
 * ```vue
 * <script setup lang="ts">
 * const { status, updateInfo, errorMessage, checkForUpdates, downloadAndInstall } = useUpdater()
 * </script>
 * ```
 */
export function useUpdater() {
  // ===== 响应式状态 =====

  /** 当前更新状态 */
  const status = ref<UpdateStatus>('idle')

  /** 更新信息（有可用更新时填充） */
  const updateInfo = ref<UpdateInfo | null>(null)

  /** 下载进度（0～100） */
  const downloadProgress = ref<number>(0)

  /** 错误信息 */
  const errorMessage = ref<string>('')

  /** 是否显示更新对话框 */
  const showDialog = ref<boolean>(false)

  /** 是否正在启动静默检查（不弹对话框） */
  const isSilentCheck = ref<boolean>(false)

  /** 清理函数引用 */
  let unlistenEvent: (() => void) | null = null

  // ===== 私有方法 =====

  /**
   * 获取 Store 实例（持久化存储上次检查时间）
   */
  async function getStore(): Promise<Store> {
    return await Store.load('updater-settings.json')
  }

  /**
   * 判断是否需要执行自动检查
   * 距离上次检查超过 CHECK_INTERVAL_MS 才执行
   */
  async function shouldAutoCheck(): Promise<boolean> {
    try {
      const store = await getStore()
      const lastCheck = await store.get<number>(STORE_KEY_LAST_CHECK)
      if (lastCheck == null) return true
      return Date.now() - lastCheck > CHECK_INTERVAL_MS
    } catch {
      // Store 读取失败时仍执行检查
      return true
    }
  }

  /**
   * 更新上次检查时间
   */
  async function updateLastCheckTime(): Promise<void> {
    try {
      const store = await getStore()
      await store.set(STORE_KEY_LAST_CHECK, Date.now())
      await store.save()
    } catch (error) {
      console.warn('[CodePet] 保存更新检查时间失败:', error)
    }
  }

  // ===== 公共方法 =====

  /**
   * 检查更新
   *
   * 调用 Tauri updater 插件的 check() 方法，
   * 根据 tauri.conf.json 中配置的 endpoints 拉取 GitHub Releases 更新清单。
   *
   * @param silent - 静默模式：true 时不弹出无更新/错误的对话框
   */
  const checkForUpdates = async (silent = false): Promise<void> => {
    // 开发模式下跳过更新检查
    if (import.meta.env.DEV) {
      console.log('[CodePet] 开发模式，跳过更新检查')
      return
    }

    // 防止重复检查
    if (status.value === 'checking' || status.value === 'downloading') {
      console.log('[CodePet] 已在检查/下载中，跳过重复请求')
      return
    }

    isSilentCheck.value = silent
    status.value = 'checking'
    errorMessage.value = ''
    updateInfo.value = null
    downloadProgress.value = 0

    // 静默模式不显示对话框；手动模式显示对话框
    if (!silent) {
      showDialog.value = true
    }

    try {
      // 调用 Tauri updater 插件检查 GitHub Releases
      const update = await check()

      // 更新上次检查时间
      await updateLastCheckTime()

      if (update) {
        // 发现新版本 → 总是弹出对话框
        updateInfo.value = {
          version: update.version,
          date: update.date ?? '',
          notes: update.body ?? '',
        }
        status.value = 'available'
        showDialog.value = true
        console.log(`[CodePet] 发现新版本: ${update.version}`)
      } else {
        // 已是最新版本
        status.value = 'idle'
        isSilentCheck.value = false
        console.log('[CodePet] 当前已是最新版本')
        // 静默模式下无更新不弹框，手动模式下弹"已是最新"
        if (!silent) {
          // 已是最新 — 保持对话框显示让用户看到状态
          showDialog.value = true
        } else {
          showDialog.value = false
        }
      }
    } catch (error) {
      // 检查更新失败
      status.value = 'error'
      isSilentCheck.value = false
      errorMessage.value = typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : '检查更新失败，请检查网络连接'

      console.error('[CodePet] 检查更新失败:', error)

      // 静默模式下错误也不弹框
      if (!silent) {
        showDialog.value = true
      } else {
        showDialog.value = false
      }
    }
  }

  /**
   * 下载并安装更新
   *
   * 调用 update.downloadAndInstall() 方法下载安装包，
   * 并监听下载进度事件。下载完成后自动安装。
   */
  const downloadAndInstall = async (): Promise<void> => {
    if (status.value !== 'available' || !updateInfo.value) {
      console.warn('[CodePet] 没有可用更新，跳过下载')
      return
    }

    status.value = 'downloading'
    downloadProgress.value = 0

    try {
      // 重新检查以获取更新对象
      const update = await check()
      if (!update) {
        status.value = 'idle'
        errorMessage.value = '更新信息已过期，请重新检查'
        return
      }

      // 监听下载进度
      // @ts-expect-error — updater 插件的 onDownloadEvent 类型定义可能不完整
      update.onDownloadEvent?.((event: { event: string; data: number }) => {
        if (event.event === 'tick') {
          // 更新下载进度百分比
          downloadProgress.value = Math.round(event.data * 100)
        }
      })

      // 开始下载并安装
      // downloadAndInstall() 会下载安装包并自动运行安装程序，
      // 安装程序（MSI/DMG）会自动关闭旧版本并启动新版本。
      // 无需手动调用 relaunch()。
      await update.downloadAndInstall()

      // 注意：执行到此处时，安装程序已启动，
      // 应用即将被关闭，此后的代码可能不会被执行。
      status.value = 'ready'
      console.log('[CodePet] 更新安装程序已启动')
    } catch (error) {
      status.value = 'error'
      errorMessage.value = typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : '下载更新失败'
      console.error('[CodePet] 下载更新失败:', error)
    }
  }

  /**
   * 关闭更新对话框
   */
  const closeDialog = (): void => {
    showDialog.value = false
  }

  /**
   * 重新检查更新（出错后重试）
   */
  const retry = (): void => {
    checkForUpdates(false)
  }

  // ===== 生命周期 =====

  /** 初始化：监听托盘事件 + 启动时静默检查 */
  onMounted(async () => {
    // 监听托盘菜单触发的"检查更新"事件
    try {
      unlistenEvent = await listen('check-update', () => {
        console.log('[CodePet] 收到托盘"检查更新"事件')
        // 托盘触发 → 非静默模式
        checkForUpdates(false)
      })
    } catch (error) {
      console.error('[CodePet] 注册 check-update 事件监听失败:', error)
    }

    // 应用启动时静默检查更新（每天最多一次）
    try {
      const shouldCheck = await shouldAutoCheck()
      if (shouldCheck) {
        console.log('[CodePet] 启动时自动检查更新')
        // 静默检查：不弹对话框，只在发现更新时才显示
        checkForUpdates(true)
      } else {
        console.log('[CodePet] 距上次检查不足24小时，跳过自动检查')
      }
    } catch (error) {
      console.warn('[CodePet] 自动更新检查调度失败:', error)
    }
  })

  /** 组件卸载时清理事件监听 */
  onUnmounted(() => {
    if (unlistenEvent) {
      unlistenEvent()
      unlistenEvent = null
    }
  })

  // ===== 返回值 =====

  return {
    /** 当前更新状态 */
    status,
    /** 更新信息 */
    updateInfo,
    /** 下载进度（0～100） */
    downloadProgress,
    /** 错误信息 */
    errorMessage,
    /** 是否显示更新对话框 */
    showDialog,
    /** 检查更新（参数 silent=true 静默模式不弹对话框） */
    checkForUpdates,
    /** 下载并安装更新 */
    downloadAndInstall,
    /** 关闭对话框 */
    closeDialog,
    /** 重试 */
    retry,
  }
}
