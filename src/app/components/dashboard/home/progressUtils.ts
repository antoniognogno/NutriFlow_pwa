import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export const WEEKLY_WORKOUT_GOAL = 4
export const WEEKLY_WORKOUT_GOAL_KEY = 'nutriflow:weekly-workout-goal'
export const DAILY_FOCUS_GOAL_MINUTES = 60
export const DEFAULT_WATER_GOAL_ML = 2500

export function getWeeklyWorkoutGoal(): number {
  try {
    const raw = localStorage.getItem(WEEKLY_WORKOUT_GOAL_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : WEEKLY_WORKOUT_GOAL
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 14 ? parsed : WEEKLY_WORKOUT_GOAL
  } catch {
    return WEEKLY_WORKOUT_GOAL
  }
}

export function saveWeeklyWorkoutGoal(goal: number): void {
  localStorage.setItem(WEEKLY_WORKOUT_GOAL_KEY, String(Math.max(1, Math.min(14, Math.round(goal)))))
  markCloudStateDirty()
}

export interface ProgressSnapshot {
  workoutsThisWeek: number
  waterMlToday: number
  waterGoalMl: number
  focusMinutesToday: number
}

export function clampRingPercent(value: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.max(0, (value / goal) * 100))
}

export function formatLiters(ml: number): string {
  return `${(Math.max(0, ml) / 1000).toFixed(1)}L`
}

export function getStartOfWeekIso(now: Date = new Date()): string {
  const start = new Date(now)
  const day = start.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}
