// 文件路径: src/types/lunar-javascript.d.ts
// lunar-javascript (v1.7.7) CJS 模块的类型声明
declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar
    static fromDate(date: Date): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getLunar(): Lunar
    toYmd(): string
    toFullString(): string
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    static fromSolar(solar: Solar): Lunar
    getYear(): number
    /** 农历月，闰月返回负值（如 -8 表示闰八月） */
    getMonth(): number
    getDay(): number
    getYearInGanZhi(): string
    getMonthInGanZhi(): string
    getDayInGanZhi(): string
    getYearShengXiao(): string
    getMonthInChinese(): string
    getDayInChinese(): string
    getJieQi(): string | null
    getFestivals(): string[]
    getZhiXing(): string
    getDayJiShen(): string[]
    getDayXiongSha(): string[]
    getMonthZhiIndex(): number
  }

  export const LunarUtil: {
    SHENGXIAO: string[]
    GAN: string[]
    ZHI: string[]
    MONTH: string[]
    DAY: string[]
    toGanZhi(year: number): string
    getDayJiShen(monthZhiIndex: number, dayGanZhi: string): string[]
    getDayXiongSha(monthZhiIndex: number, dayGanZhi: string): string[]
  }

  export const HolidayUtil: {
    getHoliday(year: number, month: number, day: number): {
      getName(): string
      isWork(): boolean
    } | null
  }

  const LunarJS: {
    Solar: typeof Solar
    Lunar: typeof Lunar
    LunarUtil: typeof LunarUtil
    HolidayUtil: typeof HolidayUtil
  }

  export default LunarJS
}
