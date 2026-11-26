import type { ExerciseProgressData } from '@/app/components/dashboard/ExerciseProgressChart'
import type { WeeklyVolumeData } from '@/app/components/dashboard/WeeklyVolumeChart'
import { getStartOfWeekIso } from '@/app/components/dashboard/home/progressUtils'

export interface WorkoutSetRow {
  exercise_name: string
  reps: number
  weight_kg: number
  completed_at: string
}

export function buildWeeklyVolumeFromSets(sets: WorkoutSetRow[]): WeeklyVolumeData[] {
  const buckets = new Map<string, number>()
  for (const set of sets) {
    const weekStart = getStartOfWeekIso(new Date(set.completed_at)).slice(0, 10)
    const volume = Math.max(0, Number(set.weight_kg) || 0) * Math.max(0, Number(set.reps) || 0)
    buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + volume)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
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
