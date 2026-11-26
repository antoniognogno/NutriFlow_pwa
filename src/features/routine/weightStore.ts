import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'
import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export interface WeightEntry {
  dateKey: string
  weightKg: number
  updatedAt: string
}

export const WEIGHT_LOGS_KEY = 'nutriflow:weight-logs-v1'
export const DEFAULT_START_WEIGHT_KG = 75.0

export function roundWeight(value: number): number {
  return Math.max(20, Math.min(300, Math.round(value * 10) / 10))
}

export function readWeightLogs(): WeightEntry[] {
  try {
    const raw = localStorage.getItem(WEIGHT_LOGS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WeightEntry[]
    if (!Array.isArray(parsed)) return []
    return [...parsed].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  } catch {
    return []
  }
}

export function saveWeightLogs(entries: WeightEntry[]): void {
  const sorted = [...entries].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  localStorage.setItem(WEIGHT_LOGS_KEY, JSON.stringify(sorted))
  markCloudStateDirty()
}

export function upsertWeightEntry(
  weightKg: number,
  dateKey: string = formatLocalDateKey(),
): WeightEntry[] {
  const clean = roundWeight(weightKg)
  const existing = readWeightLogs().filter(item => item.dateKey !== dateKey)
  const next = [
    ...existing,
    { dateKey, weightKg: clean, updatedAt: new Date().toISOString() },
  ]
  saveWeightLogs(next)
  return readWeightLogs()
}

export function computeWeeklyWeightStats(
  entries: WeightEntry[],
  today: Date = new Date(),
): {
  latestKg: number | null
  weeklyAvgKg: number | null
  previousWeekAvgKg: number | null
  deltaKg: number | null
} {
  if (entries.length === 0) {
    return { latestKg: null, weeklyAvgKg: null, previousWeekAvgKg: null, deltaKg: null }
  }

  const sorted = [...entries].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  const latestKg = sorted[sorted.length - 1].weightKg

  const endCurrent = new Date(today)
  endCurrent.setHours(23, 59, 59, 999)
  const startCurrent = new Date(today)
  startCurrent.setHours(0, 0, 0, 0)
  startCurrent.setDate(startCurrent.getDate() - 6)

  const startPrevious = new Date(startCurrent)
  startPrevious.setDate(startPrevious.getDate() - 7)

  const currentKeyMin = formatLocalDateKey(startCurrent)
  const currentKeyMax = formatLocalDateKey(endCurrent)
  const prevKeyMin = formatLocalDateKey(startPrevious)

  const currentWeek = sorted.filter(e => e.dateKey >= currentKeyMin && e.dateKey <= currentKeyMax)
  const prevWeek = sorted.filter(e => e.dateKey >= prevKeyMin && e.dateKey < currentKeyMin)

  const avg = (list: WeightEntry[]) =>
    list.length > 0
      ? Math.round((list.reduce((s, e) => s + e.weightKg, 0) / list.length) * 10) / 10
      : null

  const weeklyAvgKg = avg(currentWeek)
  const previousWeekAvgKg = avg(prevWeek)
  const deltaKg =
    weeklyAvgKg !== null && previousWeekAvgKg !== null
      ? Math.round((weeklyAvgKg - previousWeekAvgKg) * 10) / 10
      : null

  return { latestKg, weeklyAvgKg, previousWeekAvgKg, deltaKg }
}

export interface WeightChartPoint {
  dateLabel: string
  weightKg: number
  avg7d: number
}

export function buildWeightChartSeries(entries: WeightEntry[], maxPoints = 14): WeightChartPoint[] {
  const sorted = [...entries].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  const slice = sorted.slice(-maxPoints)

  return slice.map((entry, idx) => {
    const windowStart = Math.max(0, idx - 6)
    const windowSlice = slice.slice(windowStart, idx + 1)
    const avg7d =
      Math.round((windowSlice.reduce((sum, item) => sum + item.weightKg, 0) / windowSlice.length) * 10) / 10

    const [, month, day] = entry.dateKey.split('-')
    return {
      dateLabel: `${day}/${month}`,
      weightKg: entry.weightKg,
      avg7d,
    }
  })
}
