// 文件路径: src/utils/lunarCalendar.ts
// 农历日历工具模块
//
// 底层基于 lunar-javascript（6tail/lunar-javascript，MIT 协议）
// 业界最权威的无第三方依赖 JS 农历库，数据覆盖 1900–2100 年。
//
// 提供：
//   1. 公历 → 农历互转（精确）
//   2. 天干地支、生肖、星座
//   3. 节气（精确到时辰，来自 lunar-javascript）
//   4. 传统节日 & 公历节日 & 法定节假日
//   5. 建除十二神 & 吉神宜趋 / 凶煞宜忌 → 每日宜忌

// lunar-javascript 是 CJS 模块，通过默认导入 + 解构确保 Vite 兼容
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LunarJS from 'lunar-javascript'
const { Solar, LunarUtil, HolidayUtil } = LunarJS as any as {
  Solar: any
  LunarUtil: any
  HolidayUtil: any
}

// ============================================================
//  类型定义
// ============================================================

/** 农历日期对象 */
export interface LunarDate {
  /** 农历年 */
  year: number
  /** 农历月（1–12，闰月为负值，如 -8 表示闰八月） */
  month: number
  /** 农历日（1–30） */
  day: number
  /** 是否闰月 */
  isLeap: boolean
  /** 农历月名（中文，如"八月"、"闰八月"） */
  monthName: string
  /** 农历日名（中文，如"初三"、"十五"） */
  dayName: string
  /** 年份天干地支 */
  yearGanZhi: string
  /** 月份天干地支 */
  monthGanZhi: string
  /** 日天干地支 */
  dayGanZhi: string
  /** 生肖 */
  zodiac: string
  /** 星座 */
  constellation: string
}

/** 单日宜忌信息 */
export interface DayAlmanac {
  /** 农历月日显示（如"八月初三"） */
  lunarStr: string
  /** 天干地支日柱（如"甲子"） */
  ganZhiDay: string
  /** 建除十二神（建/除/满/平/定/执/破/危/成/收/开/闭） */
  jianChu: string
  /** 宜做之事 */
  yi: string[]
  /** 忌做之事 */
  ji: string[]
}

/** 节假日信息 */
export interface HolidayInfo {
  /** 节日名称 */
  name: string
  /** 是否为休息日（法定假日） */
  isRest: boolean
  /** 节日类型 */
  type: 'traditional' | 'solar' | 'term'
}

// ============================================================
//  工具函数
// ============================================================

/** 星座（公历月日 → 星座名） */
function constellation(month: number, day: number): string {
  const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22]
  const names = [
    '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座', '巨蟹座',
    '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座',
  ]
  const idx = month - 1
  return day >= dates[idx] ? names[idx] : names[(idx + 11) % 12]
}

// ============================================================
//  公历 → 农历 转换（使用 lunar-javascript）
// ============================================================

/**
 * 公历日期 → 农历日期（完整信息）
 * 基于 lunar-javascript 的精确天文数据，误差 < 1 天
 */
export function solarToLunar(date: Date): LunarDate {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const lunar = solar.getLunar()

  // lunar-javascript 中闰月直接返回负值（如 -8 表示闰八月）
  const rawMonth = lunar.getMonth()

  return {
    year: lunar.getYear(),
    // 闰月返回负值（保持与旧接口兼容），lunar.getMonth() 对闰月本身返回负值
    month: rawMonth,
    day: lunar.getDay(),
    isLeap: rawMonth < 0,
    monthName: lunar.getMonthInChinese(),
    dayName: lunar.getDayInChinese(),
    yearGanZhi: lunar.getYearInGanZhi(),
    monthGanZhi: lunar.getMonthInGanZhi(),
    dayGanZhi: lunar.getDayInGanZhi(),
    zodiac: lunar.getYearShengXiao(),
    constellation: constellation(date.getMonth() + 1, date.getDate()),
  }
}

// ============================================================
//  天干地支、生肖（独立工具函数）
// ============================================================

// 天干地支查找表（用于独立工具函数）
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 公历年 → 年干支 */
export function yearGanZhi(year: number): string {
  const offset = year - 4 // 以甲子年（公元 4 年）为基准
  const g = ((offset % 10) + 10) % 10
  const z = ((offset % 12) + 12) % 12
  return GAN[g] + ZHI[z]
}

/** 公历年 → 生肖 */
export function zodiac(year: number): string {
  return LunarUtil.SHENGXIAO[((year - 4) % 12 + 12) % 12]
}

// ============================================================
//  节假日
// ============================================================

/**
 * 获取某天的所有节假日信息
 * 优先使用 lunar-javascript 的 HolidayUtil 和内置节日，
 * 辅以节气信息
 */
export function getHolidays(date: Date, _lunar: LunarDate): HolidayInfo[] {
  const result: HolidayInfo[] = []
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const l = solar.getLunar()

  // ----- 1. 公历节日（lunar-javascript 内置） -----
  try {
    const holiday = HolidayUtil.getHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate())
    if (holiday) {
      const work: boolean = typeof holiday.isWork === 'function' ? holiday.isWork() : true
      result.push({
        name: holiday.getName(),
        isRest: !work,
        type: 'solar',
      })
    }
  } catch {
    // 忽略异常
  }

  // ----- 2. 节气 -----
  const jieQi = l.getJieQi()
  if (jieQi) {
    result.push({ name: jieQi, isRest: false, type: 'term' })
  }

  // ----- 3. 农历传统节日（lunar-javascript 内置的 getFestivals） -----
  const festivals = l.getFestivals()
  for (const f of festivals) {
    // 避免重复
    if (!result.some((r) => r.name === f)) {
      result.push({
        name: f,
        isRest: f === '春节',
        type: 'traditional',
      })
    }
  }

  return result
}

// ============================================================
//  建除十二神 & 每日宜忌
//
//  lunar-javascript 内置了完整的：
//    - 建除十二神（getDayPositionDesc / getDayZhiXing）
//    - 吉神宜趋（getDayJiShen）
//    - 凶煞宜忌（getDayXiongSha）
//  此处封装为易用的宜忌接口。
// ============================================================

/**
 * 获取某天的完整黄历信息（宜忌）
 * 优先使用 lunar-javascript 内置的吉神凶煞数据，
 * 若库未返回则回退到传统建除十二神映射。
 */
export function getDayAlmanac(date: Date, lunar: LunarDate): DayAlmanac {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const l = solar.getLunar()

  // 建除十二神（如"定"、"执"、"破"等）
  // lunar-javascript v1.7.7 方法名为 getZhiXing()
  const jianChu: string = (l as any).getZhiXing?.() ?? '—'

  // 宜：从吉神宜趋中提取（getDayJiShen 返回数组，直接使用）
  let yi: string[] = []
  try {
    const jiShenRaw = l.getDayJiShen?.()
    if (Array.isArray(jiShenRaw)) {
      yi = jiShenRaw.filter((s: any) => typeof s === 'string' && s.length > 0 && s !== '—')
    }
  } catch { /* 静默回退 */ }

  // 忌：从凶煞宜忌中提取（getDayXiongSha 返回数组，直接使用）
  let ji: string[] = []
  try {
    const xiongShaRaw = l.getDayXiongSha?.()
    if (Array.isArray(xiongShaRaw)) {
      ji = xiongShaRaw.filter((s: any) => typeof s === 'string' && s.length > 0 && s !== '—')
    }
  } catch { /* 静默回退 */ }

  // 如果库没有返回有效宜忌数据，使用备用建除十二神映射
  if (yi.length === 0 && ji.length === 0) {
    return getFallbackAlmanac(jianChu, lunar)
  }

  // 截断过长的列表（最多展示 8 条）
  return {
    lunarStr: lunar.monthName + lunar.dayName,
    ganZhiDay: lunar.dayGanZhi,
    jianChu,
    yi: yi.slice(0, 8),
    ji: ji.slice(0, 8),
  }
}

/** 备用宜忌（当 lunar-javascript 没有返回数据时，使用传统建除十二神映射） */
function getFallbackAlmanac(jianChu: string, lunar: LunarDate): DayAlmanac {
  const JIAN_CHU_ALMANAC: Record<string, { yi: string[]; ji: string[] }> = {
    '建':  { yi: ['出行', '会友', '订婚', '交易'],          ji: ['动土', '开仓', '掘井'] },
    '除':  { yi: ['清洁', '沐浴', '扫舍', '求医'],          ji: ['嫁娶', '上任', '开市'] },
    '满':  { yi: ['祭祀', '祈福', '开光', '交易'],          ji: ['赴任', '求医', '栽种'] },
    '平':  { yi: ['修造', '装饰', '涂泥', '铺路'],          ji: ['开仓', '出货', '伐木'] },
    '定':  { yi: ['订婚', '纳采', '祭祀', '祈福'],          ji: ['诉讼', '出行', '迁徙'] },
    '执':  { yi: ['捕捉', '狩猎', '立约', '纳财'],          ji: ['开市', '交易', '安床'] },
    '破':  { yi: ['求医', '破屋', '拆卸', '打扫'],          ji: ['嫁娶', '开业', '出行', '入宅'] },
    '危':  { yi: ['安床', '祭祀', '祈福', '纳畜'],          ji: ['出行', '迁徙', '动土', '开市'] },
    '成':  { yi: ['嫁娶', '开市', '立券', '入宅', '安葬'],  ji: ['诉讼', '争斗', '伐木'] },
    '收':  { yi: ['纳财', '收购', '入库', '纳畜', '栽种'],  ji: ['安葬', '出行', '针灸'] },
    '开':  { yi: ['开业', '出行', '嫁娶', '交易', '开光'],  ji: ['动土', '安葬', '伐木'] },
    '闭':  { yi: ['祭祀', '祈福', '安葬', '筑堤'],          ji: ['开市', '出行', '针灸', '嫁娶'] },
  }

  const a = JIAN_CHU_ALMANAC[jianChu] || { yi: [], ji: [] }
  return {
    lunarStr: lunar.monthName + lunar.dayName,
    ganZhiDay: lunar.dayGanZhi,
    jianChu: jianChu || '—',
    yi: a.yi,
    ji: a.ji,
  }
}

// ============================================================
//  农历日期简短显示文字
// ============================================================

/**
 * 获取农历日期在日历格中的简短显示文字
 * - 初一 → 显示月名（如"正月"、"四月"）
 * - 节日/节气 → 显示节日名
 * - 其他 → 显示日名（如"初三"、"十五"）
 */
export function getLunarDisplay(date: Date, lunar: LunarDate): {
  /** 主显示文字 */
  primary: string
  /** 次要显示（节日/节气标签名，hover 浮框用） */
  badge: string | null
  /** 标签颜色类型 */
  badgeType: 'festival' | 'term' | 'rest' | null
} {
  const holidays = getHolidays(date, lunar)

  // 如果有节日/节气，优先显示节日名
  if (holidays.length > 0) {
    const h = holidays[0]
    let badgeType: 'festival' | 'term' | 'rest' = 'festival'
    if (h.type === 'term') badgeType = 'term'
    if (h.isRest) badgeType = 'rest'

    // 节日名太长时截断（如"圣诞节"→"圣诞"）
    const name = h.name.length <= 3 ? h.name : h.name.slice(0, 2) + '…'
    return { primary: name, badge: h.name, badgeType }
  }

  // 初一显示月名（如"四月"）
  if (lunar.day === 1) {
    return {
      primary: lunar.monthName.replace('月', ''),
      badge: null,
      badgeType: null,
    }
  }

  // 其他显示日名（如"初三"、"十五"、"廿一"）
  return {
    primary: lunar.dayName,
    badge: null,
    badgeType: null,
  }
}
