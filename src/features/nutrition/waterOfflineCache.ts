export const CACHED_WATER_KEY = 'nutriflow:cached-water-v1'

export interface CachedWaterLog {
  id?: number
  localId?: string
  amount_ml: number
  created_at: string
}

export interface CachedWaterState {
  dateKey: string
  logs: CachedWaterLog[]
  dailyGoal?: number
}

export interface HourlyWaterPoint {
  time: string
  ml: number
}

export function getTodayWaterDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function sortWaterLogsNewestFirst(logs: CachedWaterLog[]): CachedWaterLog[] {
  return [...logs].sort((a, b) => {
    const timeCmp = b.created_at.localeCompare(a.created_at)
    if (timeCmp !== 0) return timeCmp
    return (b.id ?? 0) - (a.id ?? 0)
  })
}

export function readCachedWaterState(dateKey = getTodayWaterDateKey()): CachedWaterState {
  try {
    const raw = localStorage.getItem(CACHED_WATER_KEY)
    if (!raw) return { dateKey, logs: [] }
    const parsed = JSON.parse(raw) as Partial<CachedWaterState>
    const dailyGoal = typeof parsed.dailyGoal === 'number' && parsed.dailyGoal > 0 ? parsed.dailyGoal : undefined
    if (parsed.dateKey !== dateKey) {
      return { dateKey, logs: [], dailyGoal }
    }
    const logs = Array.isArray(parsed.logs) ? sortWaterLogsNewestFirst(parsed.logs) : []
    return { dateKey, logs, dailyGoal }
  } catch {
    return { dateKey, logs: [] }
  }
}

export function saveCachedWaterState(
  logs: CachedWaterLog[],
  dailyGoal?: number,
  dateKey = getTodayWaterDateKey(),
): CachedWaterState {
  const existing = readCachedWaterState(dateKey)
  const next: CachedWaterState = {
    dateKey,
    logs: sortWaterLogsNewestFirst(logs),
    dailyGoal: dailyGoal ?? existing.dailyGoal,
  }
  try {
    localStorage.setItem(CACHED_WATER_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota issues
  }
  return next
}

export function appendCachedWaterLog(
  log: CachedWaterLog,
  dailyGoal?: number,
  dateKey = getTodayWaterDateKey(),
): CachedWaterState {
  const current = readCachedWaterState(dateKey)
  return saveCachedWaterState([log, ...current.logs], dailyGoal ?? current.dailyGoal, dateKey)
}

export function removeLastCachedWaterLog(dateKey = getTodayWaterDateKey()): {
  removed: CachedWaterLog | null
  state: CachedWaterState
} {
  const current = readCachedWaterState(dateKey)
  if (current.logs.length === 0) {
    return { removed: null, state: current }
  }
  const [removed, ...rest] = current.logs
  const state = saveCachedWaterState(rest, current.dailyGoal, dateKey)
  return { removed, state }
}

export function updateLastCachedWaterLog(
  nextMl: number,
  dateKey = getTodayWaterDateKey(),
): {
  updated: CachedWaterLog | null
  previous: CachedWaterLog | null
  state: CachedWaterState
} {
  const current = readCachedWaterState(dateKey)
  if (current.logs.length === 0) {
    return { updated: null, previous: null, state: current }
  }
  const [previous, ...rest] = current.logs
  const updated: CachedWaterLog = { ...previous, amount_ml: nextMl }
  const state = saveCachedWaterState([updated, ...rest], current.dailyGoal, dateKey)
  return { updated, previous, state }
}

export function clearCachedWaterLogs(dateKey = getTodayWaterDateKey()): CachedWaterState {
  const current = readCachedWaterState(dateKey)
  return saveCachedWaterState([], current.dailyGoal, dateKey)
}

export function sumWaterLogs(logs: CachedWaterLog[]): number {
  return logs.reduce((sum, item) => sum + (Number(item.amount_ml) || 0), 0)
}

export function buildHourlyWaterChartData(
  logs: CachedWaterLog[],
  startHour = 7,
  endHour = 23,
): HourlyWaterPoint[] {
  const hourlyTotals = new Map<number, number>()
  for (const log of logs) {
    const hour = new Date(log.created_at).getHours()
    hourlyTotals.set(hour, (hourlyTotals.get(hour) || 0) + (Number(log.amount_ml) || 0))
  }
  const result: HourlyWaterPoint[] = []
  for (let hour = startHour; hour <= endHour; hour++) {
    result.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      ml: hourlyTotals.get(hour) || 0,
    })
  }
  return result
}
