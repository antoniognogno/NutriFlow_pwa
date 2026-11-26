import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'

export interface StandbyWorkoutEntry {
  workoutId: string
  workoutName: string
  sessionId: string
  startedAt: string
  pausedAtMs: number
  pausedTotalMs: number
  completedSets: number
  dateKey: string
}

export const STANDBY_WORKOUTS_KEY = 'nutriflow:standby-workouts-v1'

export function readStandbyWorkouts(): StandbyWorkoutEntry[] {
  try {
    const raw = localStorage.getItem(STANDBY_WORKOUTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StandbyWorkoutEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStandbyWorkout(entry: Omit<StandbyWorkoutEntry, 'dateKey'>): StandbyWorkoutEntry[] {
  const list = readStandbyWorkouts().filter(item => item.workoutId !== entry.workoutId)
  const next: StandbyWorkoutEntry[] = [
    { ...entry, dateKey: formatLocalDateKey() },
    ...list,
  ]
  localStorage.setItem(STANDBY_WORKOUTS_KEY, JSON.stringify(next))
  return next
}

export function getStandbyWorkout(workoutId: string): StandbyWorkoutEntry | null {
  return readStandbyWorkouts().find(item => item.workoutId === workoutId) ?? null
}

export function removeStandbyWorkout(workoutId: string): StandbyWorkoutEntry[] {
  const next = readStandbyWorkouts().filter(item => item.workoutId !== workoutId)
  localStorage.setItem(STANDBY_WORKOUTS_KEY, JSON.stringify(next))
  return next
}
