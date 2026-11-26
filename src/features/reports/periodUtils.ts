import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'

export type FullReportPeriod = 'day' | 'week' | 'month' | '3m' | '6m' | 'year'

export interface PeriodWindow {
  period: FullReportPeriod
  offset: number
  start: Date
  end: Date
  startIso: string
  endIso: string
  label: string
  daysCount: number
  bucketMode: 'hour' | 'day' | 'month'
}

export const REPORT_PERIOD_OPTIONS: Array<{ id: FullReportPeriod; shortLabel: string; label: string }> = [
  { id: 'day', shortLabel: '1G', label: 'Giorno' },
  { id: 'week', shortLabel: 'Sett', label: 'Settimana' },
  { id: 'month', shortLabel: 'Mese', label: 'Mese' },
  { id: '3m', shortLabel: '3M', label: '3 Mesi' },
  { id: '6m', shortLabel: '6M', label: '6 Mesi' },
  { id: 'year', shortLabel: 'Anno', label: 'Anno' },
]

const MONTH_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'] as const
const MONTH_LONG = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function getMonday(date: Date, weekOffset = 0): Date {
  const mid = startOfDay(date)
  const dow = mid.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  mid.setDate(mid.getDate() + diff + weekOffset * 7)
  return mid
}

export function getPeriodWindow(
  period: FullReportPeriod,
  offset = 0,
  now: Date = new Date(),
): PeriodWindow {
  const safeOffset = Math.min(0, Math.trunc(offset))
  const todayMid = startOfDay(now)

  if (period === 'day') {
    const start = new Date(todayMid)
    start.setDate(start.getDate() + safeOffset)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const label =
      safeOffset === 0
        ? 'Oggi'
        : safeOffset === -1
          ? 'Ieri'
          : new Intl.DateTimeFormat('it-IT', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: start.getFullYear() !== todayMid.getFullYear() ? 'numeric' : undefined,
            }).format(start)
    return {
      period,
      offset: safeOffset,
      start,
      end,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label,
      daysCount: 1,
      bucketMode: 'hour',
    }
  }

  if (period === 'week') {
    const start = getMonday(todayMid, safeOffset)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const endInclusive = new Date(end)
    endInclusive.setDate(endInclusive.getDate() - 1)
    const sameMonth = start.getMonth() === endInclusive.getMonth()
    const label = sameMonth
      ? `${start.getDate()}–${endInclusive.getDate()} ${MONTH_SHORT[endInclusive.getMonth()]} ${endInclusive.getFullYear()}`
      : `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${endInclusive.getDate()} ${MONTH_SHORT[endInclusive.getMonth()]}`
    return {
      period,
      offset: safeOffset,
      start,
      end,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label,
      daysCount: 7,
      bucketMode: 'day',
    }
  }

  if (period === 'month') {
    const start = new Date(todayMid.getFullYear(), todayMid.getMonth() + safeOffset, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    const daysCount = Math.round((end.getTime() - start.getTime()) / 86_400_000)
    const label = `${MONTH_LONG[start.getMonth()]} ${start.getFullYear()}`
    return {
      period,
      offset: safeOffset,
      start,
      end,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label,
      daysCount,
      bucketMode: 'day',
    }
  }

  if (period === '3m' || period === '6m') {
    const span = period === '3m' ? 3 : 6
    const endMonthStart = new Date(todayMid.getFullYear(), todayMid.getMonth() + safeOffset * span + 1, 1)
    const start = new Date(endMonthStart.getFullYear(), endMonthStart.getMonth() - span, 1)
    const lastMonth = new Date(endMonthStart.getFullYear(), endMonthStart.getMonth() - 1, 1)
    const daysCount = Math.round((endMonthStart.getTime() - start.getTime()) / 86_400_000)
    const label =
      start.getFullYear() === lastMonth.getFullYear()
        ? `${MONTH_SHORT[start.getMonth()]}–${MONTH_SHORT[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`
        : `${MONTH_SHORT[start.getMonth()]} ${String(start.getFullYear()).slice(-2)}–${MONTH_SHORT[lastMonth.getMonth()]} ${String(lastMonth.getFullYear()).slice(-2)}`
    return {
      period,
      offset: safeOffset,
      start,
      end: endMonthStart,
      startIso: start.toISOString(),
      endIso: endMonthStart.toISOString(),
      label,
      daysCount,
      bucketMode: 'month',
    }
  }

  // 'year'
  const year = todayMid.getFullYear() + safeOffset
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  const daysCount = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return {
    period: 'year',
    offset: safeOffset,
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: `Anno ${year}`,
    daysCount,
    bucketMode: 'month',
  }
}

export interface WaterHistoryLogItem {
  id?: number
  localId?: string
  amount_ml: number
  created_at: string
}

export interface WaterReportSummary {
  chartSeries: Array<{ label: string; ml: number; goalMet: boolean }>
  totalMl: number
  avgDailyMl: number
  daysGoalMet: number
  activeDays: number
}

export function buildWaterPeriodReport(
  logs: WaterHistoryLogItem[],
  window: PeriodWindow,
  dailyGoal: number,
  now: Date = new Date(),
): WaterReportSummary {
  const safeGoal = Math.max(500, dailyGoal)
  const filtered = logs.filter(l => {
    const ms = new Date(l.created_at).getTime()
    return ms >= window.start.getTime() && ms < window.end.getTime()
  })

  const totalMl = filtered.reduce((sum, l) => sum + (Number(l.amount_ml) || 0), 0)
  const byDay = new Map<string, number>()
  for (const log of filtered) {
    const key = formatLocalDateKey(new Date(log.created_at))
    byDay.set(key, (byDay.get(key) ?? 0) + (Number(log.amount_ml) || 0))
  }

  const activeDays = byDay.size
  let daysGoalMet = 0
  for (const val of byDay.values()) {
    if (val >= safeGoal) daysGoalMet += 1
  }

  const todayEnd = new Date(startOfDay(now))
  todayEnd.setDate(todayEnd.getDate() + 1)
  const effectiveEndMs = Math.min(window.end.getTime(), todayEnd.getTime())
  const elapsedDays = Math.max(
    1,
    Math.ceil((effectiveEndMs - window.start.getTime()) / 86_400_000),
  )
  const avgDailyMl = window.period === 'day' ? totalMl : Math.round(totalMl / Math.max(1, activeDays || elapsedDays))

  if (window.bucketMode === 'hour') {
    const byHour = new Map<number, number>()
    for (const log of filtered) {
      const h = new Date(log.created_at).getHours()
      byHour.set(h, (byHour.get(h) ?? 0) + (Number(log.amount_ml) || 0))
    }
    const chartSeries = []
    for (let h = 7; h <= 23; h++) {
      const ml = byHour.get(h) ?? 0
      chartSeries.push({ label: `${h}:00`, ml, goalMet: ml > 0 && totalMl >= safeGoal })
    }
    return { chartSeries, totalMl, avgDailyMl, daysGoalMet, activeDays }
  }

  if (window.bucketMode === 'day') {
    const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
    const chartSeries = []
    for (let i = 0; i < window.daysCount; i++) {
      const cur = new Date(window.start)
      cur.setDate(cur.getDate() + i)
      const key = formatLocalDateKey(cur)
      const ml = byDay.get(key) ?? 0
      chartSeries.push({
        label: window.period === 'week' ? weekdays[i] : String(cur.getDate()),
        ml,
        goalMet: ml >= safeGoal,
      })
    }
    return { chartSeries, totalMl, avgDailyMl, daysGoalMet, activeDays }
  }

  // month buckets ('3m' | '6m' | 'year')
  const byMonth = new Map<string, { sum: number; activeDays: Set<string> }>()
  for (const log of filtered) {
    const d = new Date(log.created_at)
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const dayKey = formatLocalDateKey(d)
    const entry = byMonth.get(mKey) ?? { sum: 0, activeDays: new Set<string>() }
    entry.sum += Number(log.amount_ml) || 0
    entry.activeDays.add(dayKey)
    byMonth.set(mKey, entry)
  }

  const monthCount = window.period === '3m' ? 3 : window.period === '6m' ? 6 : 12
  const chartSeries = []
  for (let i = 0; i < monthCount; i++) {
    const cur = new Date(window.start.getFullYear(), window.start.getMonth() + i, 1)
    const mKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    const bucket = byMonth.get(mKey)
    const avgMl = bucket && bucket.activeDays.size > 0 ? Math.round(bucket.sum / bucket.activeDays.size) : 0
    chartSeries.push({
      label: MONTH_SHORT[cur.getMonth()],
      ml: avgMl,
      goalMet: avgMl >= safeGoal,
    })
  }
  return { chartSeries, totalMl, avgDailyMl, daysGoalMet, activeDays }
}

export interface MealHistoryItem {
  id: string
  meal_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  logged_at: string
}

export interface MealReportSummary {
  chartSeries: Array<{ label: string; calories: number; protein: number }>
  totalCalories: number
  avgDailyCalories: number
  avgProtein: number
  avgCarbs: number
  avgFats: number
  mealsCount: number
  activeDays: number
}

export function buildMealPeriodReport(
  meals: MealHistoryItem[],
  window: PeriodWindow,
): MealReportSummary {
  const filtered = meals.filter(m => {
    const ms = new Date(m.logged_at).getTime()
    return ms >= window.start.getTime() && ms < window.end.getTime()
  })

  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFats = 0
  const byDay = new Map<string, { calories: number; protein: number }>()

  for (const meal of filtered) {
    const kcal = Number(meal.calories) || 0
    const p = Number(meal.protein_g) || 0
    const c = Number(meal.carbs_g) || 0
    const f = Number(meal.fats_g) || 0
    totalCalories += kcal
    totalProtein += p
    totalCarbs += c
    totalFats += f
    const dayKey = formatLocalDateKey(new Date(meal.logged_at))
    const prev = byDay.get(dayKey) ?? { calories: 0, protein: 0 }
    prev.calories += kcal
    prev.protein += p
    byDay.set(dayKey, prev)
  }

  const activeDays = byDay.size
  const div = Math.max(1, activeDays)
  const avgDailyCalories = window.period === 'day' ? Math.round(totalCalories) : Math.round(totalCalories / div)
  const avgProtein = Math.round(totalProtein / div)
  const avgCarbs = Math.round(totalCarbs / div)
  const avgFats = Math.round(totalFats / div)

  if (window.bucketMode === 'hour') {
    const slots = [
      { label: 'Mattina', min: 0, max: 11 },
      { label: 'Pranzo', min: 12, max: 15 },
      { label: 'Spuntino', min: 16, max: 18 },
      { label: 'Cena', min: 19, max: 23 },
    ]
    const chartSeries = slots.map(slot => {
      const slotMeals = filtered.filter(m => {
        const h = new Date(m.logged_at).getHours()
        return h >= slot.min && h <= slot.max
      })
      return {
        label: slot.label,
        calories: Math.round(slotMeals.reduce((s, m) => s + (Number(m.calories) || 0), 0)),
        protein: Math.round(slotMeals.reduce((s, m) => s + (Number(m.protein_g) || 0), 0)),
      }
    })
    return {
      chartSeries,
      totalCalories: Math.round(totalCalories),
      avgDailyCalories,
      avgProtein,
      avgCarbs,
      avgFats,
      mealsCount: filtered.length,
      activeDays,
    }
  }

  if (window.bucketMode === 'day') {
    const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
    const chartSeries = []
    for (let i = 0; i < window.daysCount; i++) {
      const cur = new Date(window.start)
      cur.setDate(cur.getDate() + i)
      const key = formatLocalDateKey(cur)
      const dayVal = byDay.get(key)
      chartSeries.push({
        label: window.period === 'week' ? weekdays[i] : String(cur.getDate()),
        calories: Math.round(dayVal?.calories ?? 0),
        protein: Math.round(dayVal?.protein ?? 0),
      })
    }
    return {
      chartSeries,
      totalCalories: Math.round(totalCalories),
      avgDailyCalories,
      avgProtein,
      avgCarbs,
      avgFats,
      mealsCount: filtered.length,
      activeDays,
    }
  }

  const byMonth = new Map<string, { calories: number; protein: number; days: Set<string> }>()
  for (const meal of filtered) {
    const d = new Date(meal.logged_at)
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const dayKey = formatLocalDateKey(d)
    const bucket = byMonth.get(mKey) ?? { calories: 0, protein: 0, days: new Set<string>() }
    bucket.calories += Number(meal.calories) || 0
    bucket.protein += Number(meal.protein_g) || 0
    bucket.days.add(dayKey)
    byMonth.set(mKey, bucket)
  }

  const monthCount = window.period === '3m' ? 3 : window.period === '6m' ? 6 : 12
  const chartSeries = []
  for (let i = 0; i < monthCount; i++) {
    const cur = new Date(window.start.getFullYear(), window.start.getMonth() + i, 1)
    const mKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    const bucket = byMonth.get(mKey)
    const monthDays = bucket?.days.size || 1
    chartSeries.push({
      label: MONTH_SHORT[cur.getMonth()],
      calories: bucket ? Math.round(bucket.calories / monthDays) : 0,
      protein: bucket ? Math.round(bucket.protein / monthDays) : 0,
    })
  }
  return {
    chartSeries,
    totalCalories: Math.round(totalCalories),
    avgDailyCalories,
    avgProtein,
    avgCarbs,
    avgFats,
    mealsCount: filtered.length,
    activeDays,
  }
}
