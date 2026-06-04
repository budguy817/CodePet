// 文件路径: src/constants/index.ts
// 全局常量定义

/** 日历星期表头 */
export const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

/** 工作类型选项 */
export const WORK_TYPES = ['会议', '开发', '改bug'] as const

/** 紧急程度选项 */
export const URGENCY_LEVELS = ['紧急', '高', '中', '低'] as const

/** 点击宠物反馈文案 */
export const PET_CLICK_MESSAGES: string[] = [
  '❤️',
  '✨',
  '💕',
  '🌟',
  '嘿嘿~',
  '别闹~',
  '嘤~',
  '😊',
  '💖',
  '啾~',
  '爱你哦~',
  '么么哒~',
  '怎么一直点我呀~',
]

/** 皮肤主题预设 */
export interface SkinPreset {
  name: string
  color: string
}

export const SKIN_PRESETS: SkinPreset[] = [
  { name: '默认紫白', color: 'rgba(245, 242, 250, 0.95)' },
  { name: '天空蓝', color: 'rgba(235, 245, 255, 0.95)' },
  { name: '薄荷绿', color: 'rgba(230, 248, 240, 0.95)' },
  { name: '暖橘', color: 'rgba(255, 245, 235, 0.95)' },
  { name: '樱花粉', color: 'rgba(255, 238, 242, 0.95)' },
  { name: '深色模式', color: 'rgba(40, 38, 50, 0.95)' },
]

/** 默认皮肤 */
export const DEFAULT_SKIN = SKIN_PRESETS[0].color
