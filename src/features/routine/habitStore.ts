import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'
import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export interface HabitItem {
  id: string
  label: string
  xp: number
}

export type HabitLogsByDate = Record<string, string[]>
export type ReportPeriod = 'week' | 'month' | 'year'

export const HABITS_KEY = 'nutriflow:habits-v1'
export const HABIT_LOGS_KEY = 'nutriflow:habit-logs-v1'

export const DEFAULT_HABITS: HabitItem[] = [
  { id: 'creatine', label: 'Creatina 5g', xp: 15 },
  { id: 'sleep', label: 'Sonno 7h+', xp: 15 },
  { id: 'mobility', label: 'Stretching / Mobilità', xp: 15 },
  { id: 'study', label: 'Studio / Focus', xp: 15 },
  { id: 'clean-diet', label: 'Zero sgarri', xp: 15 },
]

export const SUGGESTED_HABITS = [
  '10.000 passi',
  'Proteine target',
  'No schermi pre-sonno',
  'Lettura 15 min',
  'Acqua 2.5L',
  'Borsa palestra pronta',
] as const

export function readHabits(): HabitItem[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY)
    if (!raw) {
      localStorage.setItem(HABITS_KEY, JSON.stringify(DEFAULT_HABITS))
      return DEFAULT_HABITS
    }
    const parsed = JSON.parse(raw) as HabitItem[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HABITS
  } catch {
    return DEFAULT_HABITS
  }
}

export function saveHabits(habits: HabitItem[]): void {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits))
  markCloudStateDirty()
}

export function addCustomHabit(label: string): HabitItem[] {
  const clean = label.trim()
  if (!clean) return readHabits()
  const existing = readHabits()
  const created: HabitItem = {
    id: `habit-${crypto.randomUUID()}`,
    label: clean,
    xp: 15,
  }
  const next = [...existing, created]
  saveHabits(next)
  return next
}

export function removeHabit(id: string): HabitItem[] {
  const next = readHabits().filter(item => item.id !== id)
  saveHabits(next)
  return next
}

export function updateHabitLabel(id: string, label: string): HabitItem[] {
  const clean = label.trim()
  if (!clean) return readHabits()
  const next = readHabits().map(item => (item.id === id ? { ...item, label: clean } : item))
  saveHabits(next)
  return next
}

export function readHabitLogs(): HabitLogsByDate {
  try {
    const raw = localStorage.getItem(HABIT_LOGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as HabitLogsByDate
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveHabitLogs(logs: HabitLogsByDate): void {
  localStorage.setItem(HABIT_LOGS_KEY, JSON.stringify(logs))
  markCloudStateDirty()
}

export function syncCreatineHabit(
  done: boolean,
  dateKey: string = formatLocalDateKey(),
): HabitLogsByDate {
  const logs = readHabitLogs()
  const current = logs[dateKey] ?? []
  const hasCreatine = current.includes('creatine')
  if (hasCreatine === done) return logs
  const updated = done
    ? [...current, 'creatine']
    : current.filter(id => id !== 'creatine')
  const next: HabitLogsByDate = { ...logs, [dateKey]: updated }
  saveHabitLogs(next)
  return next
}

export interface RoutineReminderConfig {
  enabled: boolean
  time: string
}

export const ROUTINE_REMINDER_KEY = 'nutriflow:routine-reminder-v1'

export function readRoutineReminder(): RoutineReminderConfig {
  try {
    const raw = localStorage.getItem(ROUTINE_REMINDER_KEY)
    if (!raw) return { enabled: false, time: '21:00' }
    const parsed = JSON.parse(raw) as Partial<RoutineReminderConfig>
    return {
      enabled: Boolean(parsed.enabled),
      time: typeof parsed.time === 'string' && /^\d{2}:\d{2}$/.test(parsed.time) ? parsed.time : '21:00',
    }
  } catch {
    return { enabled: false, time: '21:00' }
  }
}

export function saveRoutineReminder(config: RoutineReminderConfig): RoutineReminderConfig {
  localStorage.setItem(ROUTINE_REMINDER_KEY, JSON.stringify(config))
  markCloudStateDirty()
  return config
}

export function toggleHabitForDate(
  habitId: string,
  dateKey: string = formatLocalDateKey(),
): HabitLogsByDate {
  const logs = readHabitLogs()
  const current = logs[dateKey] ?? []
  const exists = current.includes(habitId)
  const updatedDay = exists ? current.filter(id => id !== habitId) : [...current, habitId]
  const next: HabitLogsByDate = { ...logs, [dateKey]: updatedDay }
  saveHabitLogs(next)
  return next
}

export interface HeatmapCell {
  dateKey: string
  dayLabel: string
  subLabel?: string
  completedCount: number
  totalCount: number
  level: 0 | 1 | 2 | 3 | 4
  isFuture?: boolean
}

export interface ChartBucket {
  label: string
  pct: number
  checkins: number
  perfectDays: number
}

export function buildHabitHeatmapDays(
  logs: HabitLogsByDate,
  totalHabits: number,
  days: number = 28,
  today: Date = new Date(),
): HeatmapCell[] {
  const cells: HeatmapCell[] = []
  const safeTotal = Math.max(1, totalHabits)

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(today)
    cursor.setHours(0, 0, 0, 0)
    cursor.setDate(cursor.getDate() - offset)
    const dateKey = formatLocalDateKey(cursor)
    const completedCount = (logs[dateKey] ?? []).length

    cells.push({
      dateKey,
      dayLabel: String(cursor.getDate()),
      completedCount,
      totalCount: safeTotal,
      level: ratioToLevel(completedCount, safeTotal),
    })
  }
  return cells
}

export function computeHabitStreak(
  logs: HabitLogsByDate,
  today: Date = new Date(),
): number {
  const cursor = new Date(today)
  cursor.setHours(0, 0, 0, 0)
  const todayKey = formatLocalDateKey(cursor)

  if ((logs[todayKey] ?? []).length === 0) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (true) {
    const key = formatLocalDateKey(cursor)
    if ((logs[key] ?? []).length === 0) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function countTotalHabitCheckins(logs: HabitLogsByDate): number {
  return Object.values(logs).reduce((sum, items) => sum + items.length, 0)
}

export interface HabitStatRow {
  id: string
  label: string
  doneDays: number
  totalDays: number
  pct: number
}

export interface PeriodReport {
  period: ReportPeriod
  offset: number
  periodLabel: string
  days: HeatmapCell[]
  leadingEmptyDays: number
  completionPct: number
  previousCompletionPct: number | null
  deltaPct: number | null
  totalCheckins: number
  perfectDays: number
  elapsedDays: number
  activeDays: number
  chartSeries: ChartBucket[]
  perHabitStats: HabitStatRow[]
  bestHabit: HabitStatRow | null
  weakestHabit: HabitStatRow | null
}

export interface HistoricalPeriodSummary {
  key: string
  offset: number
  label: string
  completionPct: number
  totalCheckins: number
  perfectDays: number
  daysTracked: number
}

const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const
const MONTH_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'] as const

function ratioToLevel(completedCount: number, totalCount: number): 0 | 1 | 2 | 3 | 4 {
  if (completedCount <= 0) return 0
  const ratio = Math.min(1, completedCount / Math.max(1, totalCount))
  if (ratio >= 1) return 4
  if (ratio >= 0.66) return 3
  if (ratio >= 0.34) return 2
  return 1
}

function toMidnight(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function getMondayOfWeek(date: Date, weekOffset = 0): Date {
  const base = toMidnight(date)
  const dayOfWeek = base.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(base)
  monday.setDate(monday.getDate() + diffToMonday + weekOffset * 7)
  return monday
}

function formatShortDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const endMonth = MONTH_SHORT[end.getMonth()]
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${endMonth} ${end.getFullYear()}`
  }
  const startMonth = MONTH_SHORT[start.getMonth()]
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`
}

function capitalize(str: string): string {
  return str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str
}

function summarizeCorePeriod(
  logs: HabitLogsByDate,
  habits: HabitItem[],
  period: ReportPeriod,
  today: Date,
  offset: number,
  includePrevious: boolean,
): PeriodReport {
  const safeOffset = Math.min(0, offset)
  const todayMid = toMidnight(today)
  const safeHabits = Math.max(1, habits.length)
  const validIds = new Set(habits.map(h => h.id))
  const perHabitCounts = new Map<string, number>()

  const days: HeatmapCell[] = []
  const chartSeries: ChartBucket[] = []
  let leadingEmptyDays = 0
  let totalCheckins = 0
  let perfectDays = 0
  let elapsedDays = 0
  let activeDays = 0
  let periodLabel = ''

  if (period === 'week') {
    const monday = getMondayOfWeek(todayMid, safeOffset)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    periodLabel = formatShortDateRange(monday, sunday)

    for (let d = 0; d < 7; d += 1) {
      const cursor = new Date(monday)
      cursor.setDate(cursor.getDate() + d)
      const isFuture = cursor > todayMid
      const dateKey = formatLocalDateKey(cursor)
      const validCompleted = isFuture ? [] : (logs[dateKey] ?? []).filter(id => validIds.has(id))
      const completedCount = validCompleted.length

      if (!isFuture) {
        elapsedDays += 1
        if (completedCount > 0) activeDays += 1
        if (completedCount >= safeHabits) perfectDays += 1
        totalCheckins += completedCount
        for (const id of validCompleted) {
          perHabitCounts.set(id, (perHabitCounts.get(id) ?? 0) + 1)
        }
      }

      days.push({
        dateKey,
        dayLabel: String(cursor.getDate()),
        subLabel: WEEKDAY_SHORT[d],
        completedCount,
        totalCount: safeHabits,
        level: ratioToLevel(completedCount, safeHabits),
        isFuture,
      })

      chartSeries.push({
        label: WEEKDAY_SHORT[d],
        pct: isFuture ? 0 : Math.round((completedCount / safeHabits) * 100),
        checkins: completedCount,
        perfectDays: completedCount >= safeHabits ? 1 : 0,
      })
    }
  } else if (period === 'month') {
    const targetMonthDate = new Date(todayMid.getFullYear(), todayMid.getMonth() + safeOffset, 1)
    const year = targetMonthDate.getFullYear()
    const month = targetMonthDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstWeekday = targetMonthDate.getDay()
    leadingEmptyDays = firstWeekday === 0 ? 6 : firstWeekday - 1

    const formattedMonth = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(
      targetMonthDate,
    )
    periodLabel = capitalize(formattedMonth)

    const weeklyBuckets = new Map<number, { checkins: number; elapsed: number; perfect: number }>()

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
      const cursor = new Date(year, month, dayNum)
      const isFuture = cursor > todayMid
      const dateKey = formatLocalDateKey(cursor)
      const validCompleted = isFuture ? [] : (logs[dateKey] ?? []).filter(id => validIds.has(id))
      const completedCount = validCompleted.length

      if (!isFuture) {
        elapsedDays += 1
        if (completedCount > 0) activeDays += 1
        if (completedCount >= safeHabits) perfectDays += 1
        totalCheckins += completedCount
        for (const id of validCompleted) {
          perHabitCounts.set(id, (perHabitCounts.get(id) ?? 0) + 1)
        }
      }

      const weekIndex = Math.floor((dayNum - 1 + leadingEmptyDays) / 7) + 1
      const bucket = weeklyBuckets.get(weekIndex) ?? { checkins: 0, elapsed: 0, perfect: 0 }
      if (!isFuture) {
        bucket.elapsed += 1
        bucket.checkins += completedCount
        if (completedCount >= safeHabits) bucket.perfect += 1
      }
      weeklyBuckets.set(weekIndex, bucket)

      days.push({
        dateKey,
        dayLabel: String(dayNum),
        completedCount,
        totalCount: safeHabits,
        level: ratioToLevel(completedCount, safeHabits),
        isFuture,
      })
    }

    for (const [weekIdx, bucket] of Array.from(weeklyBuckets.entries()).sort(([a], [b]) => a - b)) {
      chartSeries.push({
        label: `Sett.${weekIdx}`,
        pct: bucket.elapsed > 0 ? Math.round((bucket.checkins / (bucket.elapsed * safeHabits)) * 100) : 0,
        checkins: bucket.checkins,
        perfectDays: bucket.perfect,
      })
    }
  } else {
    const targetYear = todayMid.getFullYear() + safeOffset
    periodLabel = `Anno ${targetYear}`

    for (let m = 0; m < 12; m += 1) {
      const daysInMonth = new Date(targetYear, m + 1, 0).getDate()
      let monthCheckins = 0
      let monthElapsed = 0
      let monthPerfect = 0

      for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
        const cursor = new Date(targetYear, m, dayNum)
        if (cursor > todayMid) continue
        monthElapsed += 1
        elapsedDays += 1

        const dateKey = formatLocalDateKey(cursor)
        const validCompleted = (logs[dateKey] ?? []).filter(id => validIds.has(id))
        const completedCount = validCompleted.length
        monthCheckins += completedCount
        totalCheckins += completedCount

        if (completedCount > 0) activeDays += 1
        if (completedCount >= safeHabits) {
          monthPerfect += 1
          perfectDays += 1
        }
        for (const id of validCompleted) {
          perHabitCounts.set(id, (perHabitCounts.get(id) ?? 0) + 1)
        }
      }

      const monthPct = monthElapsed > 0 ? Math.round((monthCheckins / (monthElapsed * safeHabits)) * 100) : 0
      days.push({
        dateKey: `${targetYear}-${String(m + 1).padStart(2, '0')}`,
        dayLabel: MONTH_SHORT[m],
        subLabel: `${monthPct}%`,
        completedCount: monthCheckins,
        totalCount: Math.max(1, monthElapsed * safeHabits),
        level: ratioToLevel(monthCheckins, Math.max(1, monthElapsed * safeHabits)),
        isFuture: monthElapsed === 0,
      })

      chartSeries.push({
        label: MONTH_SHORT[m],
        pct: monthPct,
        checkins: monthCheckins,
        perfectDays: monthPerfect,
      })
    }
  }

  const denominatorDays = Math.max(1, elapsedDays)
  const completionPct = elapsedDays > 0 ? Math.round((totalCheckins / (elapsedDays * safeHabits)) * 100) : 0

  const perHabitStats: HabitStatRow[] = habits.map(habit => {
    const doneDays = perHabitCounts.get(habit.id) ?? 0
    return {
      id: habit.id,
      label: habit.label,
      doneDays,
      totalDays: denominatorDays,
      pct: Math.round((doneDays / denominatorDays) * 100),
    }
  })

  const sortedByPct = [...perHabitStats].sort((a, b) => b.pct - a.pct)
  const bestHabit = sortedByPct.length > 0 ? sortedByPct[0] : null
  const weakestHabit = sortedByPct.length > 1 ? sortedByPct[sortedByPct.length - 1] : null

  let previousCompletionPct: number | null = null
  let deltaPct: number | null = null
  if (includePrevious) {
    const prev = summarizeCorePeriod(logs, habits, period, todayMid, safeOffset - 1, false)
    if (prev.elapsedDays > 0 && (prev.totalCheckins > 0 || safeOffset < 0)) {
      previousCompletionPct = prev.completionPct
      deltaPct = completionPct - prev.completionPct
    }
  }

  return {
    period,
    offset: safeOffset,
    periodLabel,
    days,
    leadingEmptyDays,
    completionPct,
    previousCompletionPct,
    deltaPct,
    totalCheckins,
    perfectDays,
    elapsedDays,
    activeDays,
    chartSeries,
    perHabitStats,
    bestHabit,
    weakestHabit,
  }
}

export function buildPeriodReport(
  logs: HabitLogsByDate,
  habits: HabitItem[],
  period: ReportPeriod,
  today: Date = new Date(),
  offset: number = 0,
): PeriodReport {
  return summarizeCorePeriod(logs, habits, period, today, offset, true)
}

export function buildHistoricalPeriods(
  logs: HabitLogsByDate,
  habits: HabitItem[],
  period: ReportPeriod,
  today: Date = new Date(),
): HistoricalPeriodSummary[] {
  const safeHabits = Math.max(1, habits.length)
  const validIds = new Set(habits.map(h => h.id))
  const todayMid = toMidnight(today)

  if (period === 'week') {
    const summaries: HistoricalPeriodSummary[] = []
    const thisMonday = getMondayOfWeek(todayMid, 0)

    for (let w = 0; w < 8; w += 1) {
      const monday = new Date(thisMonday)
      monday.setDate(monday.getDate() - w * 7)
      let checkins = 0
      let perfectDays = 0
      let daysTracked = 0

      for (let d = 0; d < 7; d += 1) {
        const cursor = new Date(monday)
        cursor.setDate(cursor.getDate() + d)
        if (cursor > todayMid) continue
        daysTracked += 1
        const key = formatLocalDateKey(cursor)
        const count = (logs[key] ?? []).filter(id => validIds.has(id)).length
        checkins += count
        if (count >= safeHabits) perfectDays += 1
      }

      if (w > 0 && checkins === 0) continue

      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      const label =
        w === 0
          ? 'Settimana attuale'
          : w === 1
            ? 'Settimana scorsa'
            : formatShortDateRange(monday, sunday)

      const possible = Math.max(1, daysTracked * safeHabits)
      summaries.push({
        key: formatLocalDateKey(monday),
        offset: -w,
        label,
        completionPct: Math.round((checkins / possible) * 100),
        totalCheckins: checkins,
        perfectDays,
        daysTracked,
      })
    }
    return summaries
  }

  if (period === 'month') {
    const currentMonthKey = formatLocalDateKey(todayMid).slice(0, 7)
    const monthBuckets = new Map<string, { checkins: number; perfectDays: number }>()
    monthBuckets.set(currentMonthKey, { checkins: 0, perfectDays: 0 })

    for (const [dateKey, ids] of Object.entries(logs)) {
      const monthKey = dateKey.slice(0, 7)
      const count = ids.filter(id => validIds.has(id)).length
      if (count === 0 && monthKey !== currentMonthKey) continue
      const bucket = monthBuckets.get(monthKey) ?? { checkins: 0, perfectDays: 0 }
      bucket.checkins += count
      if (count >= safeHabits) bucket.perfectDays += 1
      monthBuckets.set(monthKey, bucket)
    }

    return Array.from(monthBuckets.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .map(([monthKey, bucket]) => {
        const [yearStr, monthStr] = monthKey.split('-')
        const year = Number(yearStr)
        const month = Number(monthStr)
        const isCurrent = monthKey === currentMonthKey
        const daysInPeriod = isCurrent ? todayMid.getDate() : new Date(year, month, 0).getDate()
        const monthOffset = (year - todayMid.getFullYear()) * 12 + (month - 1 - todayMid.getMonth())
        const label = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(
          new Date(year, month - 1, 1),
        )
        return {
          key: monthKey,
          offset: Math.min(0, monthOffset),
          label: capitalize(label),
          completionPct: Math.round((bucket.checkins / Math.max(1, daysInPeriod * safeHabits)) * 100),
          totalCheckins: bucket.checkins,
          perfectDays: bucket.perfectDays,
          daysTracked: daysInPeriod,
        }
      })
  }

  // Annual history
  const currentYear = todayMid.getFullYear()
  const years = new Set<number>([currentYear])
  for (const [dateKey, ids] of Object.entries(logs)) {
    if (ids.length === 0) continue
    const y = Number(dateKey.slice(0, 4))
    if (Number.isFinite(y) && y <= currentYear) years.add(y)
  }

  return Array.from(years)
    .sort((a, b) => b - a)
    .map(y => {
      const rep = summarizeCorePeriod(logs, habits, 'year', todayMid, y - currentYear, false)
      return {
        key: String(y),
        offset: y - currentYear,
        label: `Anno ${y}`,
        completionPct: rep.completionPct,
        totalCheckins: rep.totalCheckins,
        perfectDays: rep.perfectDays,
        daysTracked: rep.elapsedDays,
      }
    })
}
