export const CACHED_WATER_KEY = 'nutriflow:cached-water-v1'
export const CACHED_WATER_BY_DATE_KEY = 'nutriflow:cached-water-by-date-v1'

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

export function buildDayBoundsIso(dateKey: string): { startIso: string; endIso: string } {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { startIso: start.toISOString(), endIso: end.toISOString() }
  }
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export function buildTimestampForDateKey(dateKey: string, now: Date = new Date()): string {
  if (dateKey === getTodayWaterDateKey(now)) {
    return now.toISOString()
  }
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return now.toISOString()
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString()
}

export function sortWaterLogsNewestFirst(logs: CachedWaterLog[]): CachedWaterLog[] {
  return [...logs].sort((a, b) => {
    const timeCmp = b.created_at.localeCompare(a.created_at)
    if (timeCmp !== 0) return timeCmp
    return (b.id ?? 0) - (a.id ?? 0)
  })
}

function readByDateMap(): Record<string, CachedWaterLog[]> {
  try {
    const raw = localStorage.getItem(CACHED_WATER_BY_DATE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CachedWaterLog[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeByDateEntry(dateKey: string, logs: CachedWaterLog[]): void {
  try {
    const map = readByDateMap()
    map[dateKey] = logs
    const keys = Object.keys(map).sort().slice(-10)
    const trimmed: Record<string, CachedWaterLog[]> = {}
    for (const k of keys) trimmed[k] = map[k]
    localStorage.setItem(CACHED_WATER_BY_DATE_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore storage quota issues
  }
}

export function readCachedWaterByDateMap(): Record<string, CachedWaterLog[]> {
  const todayKey = getTodayWaterDateKey()
  const map = readByDateMap()
  const todayState = readCachedWaterState(todayKey)
  if (todayState.logs.length > 0 && !map[todayKey]) {
    map[todayKey] = todayState.logs
  }
  return map
}

export function readCachedWaterState(dateKey = getTodayWaterDateKey()): CachedWaterState {
  const todayKey = getTodayWaterDateKey()
  let dailyGoal: number | undefined
  let todayLogs: CachedWaterLog[] = []

  try {
    const raw = localStorage.getItem(CACHED_WATER_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CachedWaterState>
      dailyGoal = typeof parsed.dailyGoal === 'number' && parsed.dailyGoal > 0 ? parsed.dailyGoal : undefined
      if (parsed.dateKey === dateKey && Array.isArray(parsed.logs)) {
        todayLogs = sortWaterLogsNewestFirst(parsed.logs)
        return { dateKey, logs: todayLogs, dailyGoal }
      }
    }
  } catch {
    // Ignore storage parse failure
  }

  if (dateKey !== todayKey) {
    const mapLogs = readByDateMap()[dateKey]
    return {
      dateKey,
      logs: Array.isArray(mapLogs) ? sortWaterLogsNewestFirst(mapLogs) : [],
      dailyGoal,
    }
  }

  return { dateKey, logs: todayLogs, dailyGoal }
}

export function saveCachedWaterState(
  logs: CachedWaterLog[],
  dailyGoal?: number,
  dateKey = getTodayWaterDateKey(),
): CachedWaterState {
  const existing = readCachedWaterState(dateKey)
  const sorted = sortWaterLogsNewestFirst(logs)
  const resolvedGoal = dailyGoal ?? existing.dailyGoal
  const next: CachedWaterState = {
    dateKey,
    logs: sorted,
    dailyGoal: resolvedGoal,
  }
  writeByDateEntry(dateKey, sorted)

  // Only overwrite CACHED_WATER_KEY when updating today's water or goal
  if (dateKey === getTodayWaterDateKey()) {
    try {
      localStorage.setItem(CACHED_WATER_KEY, JSON.stringify(next))
    } catch {
      // Ignore storage quota issues
    }
  } else if (typeof dailyGoal === 'number' && dailyGoal > 0) {
    try {
      const todayState = readCachedWaterState(getTodayWaterDateKey())
      localStorage.setItem(
        CACHED_WATER_KEY,
        JSON.stringify({ ...todayState, dailyGoal }),
      )
    } catch {
      // Ignore storage quota issues
    }
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
