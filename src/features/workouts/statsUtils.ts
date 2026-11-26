import type { ExerciseProgressData } from '@/app/components/dashboard/ExerciseProgressChart'
import type { HeatmapData } from '@/app/components/dashboard/WorkoutHeatmap'
import type { WeeklyVolumeData } from '@/app/components/dashboard/WeeklyVolumeChart'
import { getStartOfWeekIso } from '@/app/components/dashboard/home/progressUtils'
import { estimateOneRepMaxEpley, isCardioSession } from './workoutUtils'

export interface WorkoutSetRow {
  session_id?: string
  exercise_name: string
  reps: number
  weight_kg: number
  completed_at: string
}

export interface StatsSessionItem {
  id: string
  workout_id?: string | null
  workout_name: string
  duration_seconds: number
  started_at: string
}

export interface ExercisePersonalRecord {
  exerciseName: string
  bestWeightKg: number
  bestReps: number
  best1RmKg: number
  totalSets: number
  totalVolumeKg: number
  lastPerformedAt: string
}

export interface StatsOverviewSummary {
  totalSessions: number
  strengthSessions: number
  cardioSessions: number
  totalDurationSeconds: number
  avgDurationSeconds: number
  totalVolumeKg: number
  totalSets: number
  totalReps: number
  bestWeekVolumeKg: number
}

export function filterByRecentDays<T>(
  items: T[],
  getIso: (item: T) => string,
  days: number | null,
  now = new Date(),
): T[] {
  if (!days || days <= 0) return items
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffMs = cutoff.getTime()
  return items.filter(item => {
    const ms = new Date(getIso(item)).getTime()
    return Number.isFinite(ms) && ms >= cutoffMs
  })
}

export function buildWeeklyVolumeFromSets(
  sets: WorkoutSetRow[],
  maxWeeks = 8,
): WeeklyVolumeData[] {
  const buckets = new Map<string, number>()
  for (const set of sets) {
    const weekStart = getStartOfWeekIso(new Date(set.completed_at)).slice(0, 10)
    const volume = Math.max(0, Number(set.weight_kg) || 0) * Math.max(0, Number(set.reps) || 0)
    buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + volume)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-maxWeeks)
    .map(([week_start, total_volume]) => ({
      week_start,
      total_volume: Math.round(total_volume),
    }))
}

export function buildExerciseProgressionFromSets(
  sets: WorkoutSetRow[],
  exerciseName: string,
): ExerciseProgressData[] {
  const byDate = new Map<string, number>()
  const target = exerciseName.trim().toLocaleLowerCase()

  for (const set of sets) {
    if (set.exercise_name.trim().toLocaleLowerCase() !== target) continue
    const dateKey = set.completed_at.slice(0, 10)
    const weight = Number(set.weight_kg) || 0
    byDate.set(dateKey, Math.max(byDate.get(dateKey) ?? 0, weight))
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([completed_date, max_weight]) => ({ completed_date, max_weight }))
}

export interface CachedPerfLite {
  exercise_name: string
  weight_kg: number
  reps: number
  max_weight_kg: number
}

export function buildPersonalRecords(
  sets: WorkoutSetRow[],
  cachedPerf: CachedPerfLite[] = [],
): ExercisePersonalRecord[] {
  const byExercise = new Map<string, ExercisePersonalRecord>()

  for (const set of sets) {
    const cleanName = set.exercise_name.trim()
    if (!cleanName) continue
    const key = cleanName.toLocaleLowerCase()
    const weight = Math.max(0, Number(set.weight_kg) || 0)
    const reps = Math.max(0, Number(set.reps) || 0)
    const est1Rm = estimateOneRepMaxEpley(weight, reps)
    const setVolume = weight * reps

    const existing = byExercise.get(key)
    if (!existing) {
      byExercise.set(key, {
        exerciseName: cleanName,
        bestWeightKg: weight,
        bestReps: reps,
        best1RmKg: est1Rm,
        totalSets: 1,
        totalVolumeKg: Math.round(setVolume),
        lastPerformedAt: set.completed_at,
      })
      continue
    }

    existing.totalSets += 1
    existing.totalVolumeKg += Math.round(setVolume)
    if (set.completed_at > existing.lastPerformedAt) {
      existing.lastPerformedAt = set.completed_at
    }
    if (weight > existing.bestWeightKg || (weight === existing.bestWeightKg && reps > existing.bestReps)) {
      existing.bestWeightKg = weight
      existing.bestReps = reps
    }
    if (est1Rm > existing.best1RmKg) {
      existing.best1RmKg = est1Rm
    }
  }

  for (const item of cachedPerf) {
    const cleanName = item.exercise_name.trim()
    if (!cleanName) continue
    const key = cleanName.toLocaleLowerCase()
    const weight = Math.max(0, Number(item.max_weight_kg || item.weight_kg) || 0)
    const reps = Math.max(1, Number(item.reps) || 1)
    const est1Rm = estimateOneRepMaxEpley(weight, reps)

    const existing = byExercise.get(key)
    if (!existing) {
      byExercise.set(key, {
        exerciseName: cleanName,
        bestWeightKg: weight,
        bestReps: reps,
        best1RmKg: est1Rm,
        totalSets: 0,
        totalVolumeKg: 0,
        lastPerformedAt: '',
      })
      continue
    }
    if (weight > existing.bestWeightKg) {
      existing.bestWeightKg = weight
    }
    if (est1Rm > existing.best1RmKg) {
      existing.best1RmKg = est1Rm
    }
  }

  return Array.from(byExercise.values()).sort((a, b) => {
    if (b.best1RmKg !== a.best1RmKg) return b.best1RmKg - a.best1RmKg
    return b.bestWeightKg - a.bestWeightKg
  })
}

export function buildStatsSummary(
  sessions: StatsSessionItem[],
  sets: WorkoutSetRow[],
): StatsOverviewSummary {
  const cardioSessions = sessions.filter(item =>
    isCardioSession({ workout_id: item.workout_id ?? null, workout_name: item.workout_name }),
  ).length
  const strengthSessions = Math.max(0, sessions.length - cardioSessions)
  const totalDurationSeconds = sessions.reduce(
    (sum, item) => sum + Math.max(0, Number(item.duration_seconds) || 0),
    0,
  )
  const avgDurationSeconds = sessions.length > 0 ? Math.round(totalDurationSeconds / sessions.length) : 0

  let totalVolumeKg = 0
  let totalReps = 0
  for (const set of sets) {
    const weight = Math.max(0, Number(set.weight_kg) || 0)
    const reps = Math.max(0, Number(set.reps) || 0)
    totalVolumeKg += weight * reps
    totalReps += reps
  }

  const weekly = buildWeeklyVolumeFromSets(sets, 52)
  const bestWeekVolumeKg = weekly.reduce((max, item) => Math.max(max, item.total_volume), 0)

  return {
    totalSessions: sessions.length,
    strengthSessions,
    cardioSessions,
    totalDurationSeconds,
    avgDurationSeconds,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets: sets.length,
    totalReps,
    bestWeekVolumeKg,
  }
}

export function buildHeatmapFromSessions(sessions: StatsSessionItem[]): HeatmapData[] {
  const counts = new Map<string, number>()
  for (const item of sessions) {
    const dateKey = item.started_at.slice(0, 10)
    if (!dateKey) continue
    counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}
