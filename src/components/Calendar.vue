<!--
  日历组件

  仿 Element Plus Calendar 风格，轻量纯 CSS 实现。
  支持月视图切换、今日高亮、日期点击选中。
  新增：农历显示、节假日/节气标签、hover 宜忌浮框。
-->
<template>
  <div class="calendar">
    <!-- 头部：月份导航 -->
    <div class="calendar-header">
      <button class="calendar-nav-btn" @click="prevMonth">◀</button>
      <span class="calendar-title">
        {{ year }}年{{ month }}月
        <span v-if="currentLunarInfo" class="calendar-title-lunar">
          · {{ currentLunarInfo.yearGanZhi }}年【{{ currentLunarInfo.zodiac }}】
        </span>
      </span>
      <button class="calendar-nav-btn" @click="nextMonth">▶</button>
    </div>

    <!-- 星期表头 -->
    <div class="calendar-weekdays">
      <span v-for="d in weekDays" :key="d" class="calendar-weekday">{{ d }}</span>
    </div>

    <!-- 日期网格 -->
    <div class="calendar-grid">
      <div
        v-for="(day, i) in calendarDays"
        :key="i"
        class="calendar-day"
        :class="{
          'calendar-day--other-month': !day.isCurrentMonth,
          'calendar-day--today': day.isToday,
          'calendar-day--selected': day.isSelected,
          'calendar-day--has-work': day.isHasWork && !day.isCompleted,
          'calendar-day--completed': day.isCompleted,
          'calendar-day--festival': day.badgeType === 'festival' || day.badgeType === 'rest',
          'calendar-day--term': day.badgeType === 'term',
          'calendar-day--rest': day.badgeType === 'rest',
        }"
        @click="selectDay(day)"
        @dblclick="dblClickDay(day)"
        @mouseenter="onDayHover($event, day, i)"
        @mouseleave="onDayLeave"
      >
        <!-- 公历日期数字 -->
        <span class="calendar-day-num">{{ day.date }}</span>
        <!-- 农历 / 节日文字 -->
        <span
          v-if="day.isCurrentMonth && day.lunarText"
          class="calendar-day-lunar"
          :class="{ 'calendar-day-lunar--badge': day.badge }"
        >
          {{ day.lunarText }}
        </span>
        <!-- 节假日小圆点 -->
        <span
          v-if="day.isCurrentMonth && day.badge"
          class="calendar-day-dot"
          :class="{
            'calendar-day-dot--rest': day.badgeType === 'rest',
            'calendar-day-dot--term': day.badgeType === 'term',
          }"
        />
      </div>
    </div>

    <!-- ====== Hover 宜忌浮框 ====== -->
    <Teleport to="body">
      <div
        v-if="tooltip.visible"
        class="calendar-tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
        <div class="calendar-tooltip-header">
          <span class="calendar-tooltip-date">
            {{ tooltip.solarDate }}
          </span>
          <span class="calendar-tooltip-lunar">
            农历{{ tooltip.lunarStr }}
          </span>
        </div>
        <div class="calendar-tooltip-ganzhi">
          {{ tooltip.ganZhiDay }}日 · {{ tooltip.jianChu }}日
        </div>
        <!-- 节日标签 -->
        <div v-if="tooltip.holidays.length > 0" class="calendar-tooltip-holidays">
          <span
            v-for="h in tooltip.holidays"
            :key="h.name"
            class="calendar-tooltip-holiday-tag"
            :class="{
              'calendar-tooltip-holiday-tag--rest': h.isRest,
              'calendar-tooltip-holiday-tag--term': h.type === 'term',
            }"
          >
            {{ h.name }}
          </span>
        </div>
        <div class="calendar-tooltip-divider" />
        <div class="calendar-tooltip-almanac">
          <div class="calendar-tooltip-almanac-row">
            <span class="calendar-tooltip-label calendar-tooltip-label--yi">宜</span>
            <span class="calendar-tooltip-text">{{ tooltip.yiText || '—' }}</span>
          </div>
          <div class="calendar-tooltip-almanac-row">
            <span class="calendar-tooltip-label calendar-tooltip-label--ji">忌</span>
            <span class="calendar-tooltip-text">{{ tooltip.jiText || '—' }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useWorkStore } from '@/stores/workStore'
import { WEEK_DAYS } from '@/constants'
import {
  solarToLunar,
  getDayAlmanac,
  getHolidays,
  getLunarDisplay,
  type LunarDate,
  type DayAlmanac,
  type HolidayInfo,
} from '@/utils/lunarCalendar'

// ===== Emits =====
const emit = defineEmits<{
  /** 双击某一天 */
  dayDblclick: [date: Date]
}>()

// ===== Store =====
const workStore = useWorkStore()

// ===== 常量 =====
const weekDays = WEEK_DAYS

// ===== 状态 =====
const today = new Date()
const currentYear = ref<number>(today.getFullYear())
const currentMonth = ref<number>(today.getMonth() + 1) // 1-12
const selectedDate = ref<Date | null>(null)

// ===== 日历日扩展类型 =====
interface CalendarDay {
  date: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isHasWork: boolean
  isCompleted: boolean
  /** 农历/节日显示文字 */
  lunarText: string | null
  /** 节日/节气标签 */
  badge: string | null
  /** 标签类型 */
  badgeType: 'festival' | 'term' | 'rest' | null
  /** 预计算的宜忌数据（hover 时直接用） */
  _almanac: DayAlmanac | null
  /** 预计算的节假日列表 */
  _holidays: HolidayInfo[]
  /** 公历日期对象 */
  _date: Date | null
  /** 农历日期对象 */
  _lunar: LunarDate | null
}

// ===== Hover 浮框状态 =====
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  solarDate: '',
  lunarStr: '',
  ganZhiDay: '',
  jianChu: '',
  yiText: '',
  jiText: '',
  holidays: [] as HolidayInfo[],
})

/** 当前视图月份的农历信息（标题栏显示） */
const currentLunarInfo = computed(() => {
  // 取当月 15 号左右作为代表日期
  const midDate = new Date(currentYear.value, currentMonth.value - 1, 15)
  try {
    return solarToLunar(midDate)
  } catch {
    return null
  }
})

// ===== 计算属性 =====
const year = computed(() => currentYear.value)
const month = computed(() => currentMonth.value)

/** 辅助：格式化日期 key */
const formatKey = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** 日历网格数据（含农历） */
const calendarDays = computed<CalendarDay[]>(() => {
  const y = currentYear.value
  const m = currentMonth.value

  // 当月第一天 & 最后一天
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const startWeekDay = firstDay.getDay() // 0=周日
  const daysInMonth = lastDay.getDate()

  const days: CalendarDay[] = []

  /** 创建一个日历格子 */
  const makeDay = (
    gregorianYear: number,
    gregorianMonth: number,
    d: number,
    isCurrentMonth: boolean,
  ): CalendarDay => {
    const date = new Date(gregorianYear, gregorianMonth - 1, d)

    const isToday =
      d === today.getDate() &&
      gregorianMonth === today.getMonth() + 1 &&
      gregorianYear === today.getFullYear()

    const isSelected =
      selectedDate.value !== null &&
      d === selectedDate.value.getDate() &&
      gregorianMonth === selectedDate.value.getMonth() + 1 &&
      gregorianYear === selectedDate.value.getFullYear()

    const dateKey = formatKey(gregorianYear, gregorianMonth, d)
    const isHasWork = workStore.datesWithRecords.has(dateKey)
    const isCompleted = workStore.completedDates.has(dateKey)

    // 农历信息（仅当月日期计算）
    let lunarText: string | null = null
    let badge: string | null = null
    let badgeType: 'festival' | 'term' | 'rest' | null = null
    let _almanac: DayAlmanac | null = null
    let _holidays: HolidayInfo[] = []
    let _lunar: LunarDate | null = null

    if (isCurrentMonth) {
      try {
        _lunar = solarToLunar(date)
        _almanac = getDayAlmanac(date, _lunar)
        _holidays = getHolidays(date, _lunar)
        const display = getLunarDisplay(date, _lunar)
        lunarText = display.primary
        badge = display.badge
        badgeType = display.badgeType
      } catch {
        // 农历计算失败时静默回退
      }
    }

    return {
      date: d,
      isCurrentMonth,
      isToday,
      isSelected,
      isHasWork,
      isCompleted,
      lunarText,
      badge,
      badgeType,
      _almanac,
      _holidays,
      _date: isCurrentMonth ? date : null,
      _lunar,
    }
  }

  // 填充上月尾巴
  const prevMonthLastDay = new Date(y, m - 1, 0).getDate()
  const prevMonthYear = m === 1 ? y - 1 : y
  const prevMonthNum = m === 1 ? 12 : m - 1
  for (let i = startWeekDay - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    days.push(makeDay(prevMonthYear, prevMonthNum, d, false))
  }

  // 当月日期
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(makeDay(y, m, d, true))
  }

  // 填充下月头
  const remaining = 42 - days.length
  const nextMonthYear = m === 12 ? y + 1 : y
  const nextMonthNum = m === 12 ? 1 : m + 1
  for (let d = 1; d <= remaining; d++) {
    days.push(makeDay(nextMonthYear, nextMonthNum, d, false))
  }

  return days
})

// ===== 月份导航 =====
const prevMonth = (): void => {
  if (currentMonth.value === 1) {
    currentYear.value--
    currentMonth.value = 12
  } else {
    currentMonth.value--
  }
}

const nextMonth = (): void => {
  if (currentMonth.value === 12) {
    currentYear.value++
    currentMonth.value = 1
  } else {
    currentMonth.value++
  }
}

// ===== 日期选择 =====
const selectDay = (day: CalendarDay): void => {
  if (!day.isCurrentMonth) return
  selectedDate.value = new Date(currentYear.value, currentMonth.value - 1, day.date)
}

/** 双击日期 → 通知父组件 */
const dblClickDay = (day: CalendarDay): void => {
  if (!day.isCurrentMonth) return
  selectDay(day)
  emit('dayDblclick', selectedDate.value!)
}

// ===== Hover 浮框 =====
let hideTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 鼠标移入日期格子 → 显示宜忌浮框
 * 浮框定位：尝试在格子右侧/上方，避免超出视口
 */
const onDayHover = (e: MouseEvent, day: CalendarDay, _index: number): void => {
  if (!day.isCurrentMonth || !day._date || !day._almanac) {
    tooltip.visible = false
    return
  }

  // 清除隐藏定时器
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  // 浮框内容
  const d = day._date
  const almanac = day._almanac
  tooltip.solarDate = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  tooltip.lunarStr = almanac.lunarStr
  tooltip.ganZhiDay = almanac.ganZhiDay
  tooltip.jianChu = almanac.jianChu
  tooltip.yiText = almanac.yi.join('、')
  tooltip.jiText = almanac.ji.join('、')
  tooltip.holidays = day._holidays

  // 定位：默认在鼠标右下方偏移
  const gap = 12
  let tx = e.clientX + gap
  let ty = e.clientY + gap

  // 预估浮框尺寸（约 200×160），防止溢出视口右/下边缘
  const estW = 210
  const estH = 180
  if (tx + estW > window.innerWidth) {
    tx = e.clientX - estW - gap
  }
  if (ty + estH > window.innerHeight) {
    ty = e.clientY - estH - gap
  }

  tooltip.x = tx
  tooltip.y = ty
  tooltip.visible = true
}

/** 鼠标移出 → 延迟隐藏（允许鼠标移入浮框） */
const onDayLeave = (): void => {
  hideTimer = setTimeout(() => {
    tooltip.visible = false
  }, 200)
}
</script>

<style scoped>
.calendar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  padding: 12px;
  user-select: none;
}

/* 头部导航 */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.calendar-nav-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(200, 190, 220, 0.3);
  border-radius: 8px;
  font-size: 11px;
  color: #6d5080;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}

.calendar-nav-btn:hover {
  background: rgba(200, 190, 220, 0.55);
}

.calendar-title {
  font-size: 15px;
  font-weight: 600;
  color: #4a3060;
}

.calendar-title-lunar {
  font-size: 12px;
  font-weight: 400;
  color: #9a80b8;
}

/* 星期表头 */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.calendar-weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: #9a80b8;
  padding: 4px 0;
}

/* 日期网格 */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  flex: 1;
  gap: 1px;
}

.calendar-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s;
  position: relative;
  padding: 2px 1px;
  min-height: 0;
}

.calendar-day:hover:not(.calendar-day--other-month) {
  background: rgba(200, 190, 220, 0.25);
}

.calendar-day--other-month {
  cursor: default;
}

/* 公历日期数字 */
.calendar-day-num {
  font-size: 12px;
  font-weight: 400;
  color: #5d4070;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.15s;
  flex-shrink: 0;
  line-height: 1;
}

.calendar-day--other-month .calendar-day-num {
  color: #ccc;
}

/* 今日（高优先级） */
.calendar-day--today .calendar-day-num {
  background: rgba(200, 180, 220, 0.45);
  font-weight: 700;
  color: #4a3060;
}

/* 有工作记录（黄色）——整个日期背景 */
.calendar-day--has-work {
  background: rgba(250, 220, 140, 0.4);
}

/* 全部完成（绿色）——整个日期背景 */
.calendar-day--completed {
  background: rgba(140, 210, 160, 0.4);
}

/* 选中 */
.calendar-day--selected .calendar-day-num {
  background: #b89ad8;
  color: #fff;
  font-weight: 600;
}

/* ===== 农历/节日文字 ===== */
.calendar-day-lunar {
  font-size: 10px;
  color: #b0a0c8;
  line-height: 1.2;
  margin-top: -1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

/* 节日/节气高亮文字 */
.calendar-day-lunar--badge {
  color: #e87848;
  font-weight: 600;
}

.calendar-day--term .calendar-day-lunar {
  color: #4a9e6b;
}

.calendar-day--rest .calendar-day-lunar {
  color: #d44848;
  font-weight: 700;
}

/* 节假日小圆点 */
.calendar-day-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e87848;
}

.calendar-day-dot--rest {
  background: #d44848;
  box-shadow: 0 0 3px rgba(212, 72, 72, 0.5);
}

.calendar-day-dot--term {
  background: #4a9e6b;
}
</style>

<!-- ===== 全局浮框样式（非 scoped，因为用了 Teleport 到 body） ===== -->
<style>
/* Hover 宜忌浮框 */
.calendar-tooltip {
  position: fixed;
  z-index: 99999;
  min-width: 180px;
  max-width: 230px;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(180, 160, 210, 0.4);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 8px 24px rgba(100, 80, 140, 0.18);
  pointer-events: none;
  animation: calendar-tooltip-in 0.15s ease-out;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
}

@keyframes calendar-tooltip-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 浮框头部 */
.calendar-tooltip-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
}

.calendar-tooltip-date {
  font-size: 14px;
  font-weight: 600;
  color: #4a3060;
}

.calendar-tooltip-lunar {
  font-size: 12px;
  color: #9a80b8;
}

/* 干支 & 建除 */
.calendar-tooltip-ganzhi {
  font-size: 11px;
  color: #b0a0c8;
  margin-bottom: 4px;
}

/* 节日标签行 */
.calendar-tooltip-holidays {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 2px;
}

.calendar-tooltip-holiday-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(232, 120, 72, 0.12);
  color: #d06838;
  font-weight: 500;
}

.calendar-tooltip-holiday-tag--rest {
  background: rgba(212, 72, 72, 0.12);
  color: #c43838;
}

.calendar-tooltip-holiday-tag--term {
  background: rgba(74, 158, 107, 0.12);
  color: #3a8058;
}

/* 分割线 */
.calendar-tooltip-divider {
  height: 1px;
  background: rgba(180, 160, 210, 0.25);
  margin: 6px 0;
}

/* 宜忌行 */
.calendar-tooltip-almanac {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.calendar-tooltip-almanac-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
}

.calendar-tooltip-label {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}

.calendar-tooltip-label--yi {
  background: #7ec88a;
}

.calendar-tooltip-label--ji {
  background: #e08880;
}

.calendar-tooltip-text {
  color: #5d4070;
  line-height: 1.5;
}
</style>
