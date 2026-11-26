import type { PlanWithWorkoutsAndExercises } from '@/lib/supabase/types'
import { markCloudStateDirty } from '@/features/offline/cloudStateSync'
import type { CardioPreset } from '@/features/workouts/presetStorage'
import type { DefaultWorkout } from '@/features/workouts/defaultWorkouts'

export const TRASH_STORAGE_KEY = 'nutriflow:trash-v1'
export const TRASH_RETENTION_DAYS = 30
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000

export type SessionRowSnapshot = {
  id: string
  user_id: string
  workout_id: string | null
  workout_name: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
}

export type SetRowSnapshot = {
  id: string
  user_id: string
  session_id: string
  exercise_id: string | null
  exercise_name: string
  set_number: number
  reps: number
  weight_kg: number
  completed_at: string
}

export type TrashPayload =
  | {
      kind: 'workout_session'
      session: SessionRowSnapshot
      sets: SetRowSnapshot[]
    }
  | {
      kind: 'workout_plan'
      plan: PlanWithWorkoutsAndExercises
    }
  | {
      kind: 'workout_preset'
      preset: DefaultWorkout
    }
  | {
      kind: 'cardio_preset'
      preset: CardioPreset
    }

export type TrashItem = TrashPayload & {
  id: string
  title: string
  subtitle: string
  deletedAt: number
  expiresAt: number
}

export type TrashInput = TrashPayload & {
  id: string
  title: string
  subtitle: string
}

export function purgeExpiredTrashItems(items: TrashItem[], now: number = Date.now()): TrashItem[] {
  return items.filter(item => item.expiresAt > now)
}

export function daysUntilExpiry(expiresAt: number, now: number = Date.now()): number {
  return Math.max(1, Math.ceil((expiresAt - now) / 86_400_000))
}

export function readTrashItems(now: number = Date.now()): TrashItem[] {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrashItem[]
    if (!Array.isArray(parsed)) return []
    const active = purgeExpiredTrashItems(parsed, now)
    if (active.length !== parsed.length) {
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(active))
    }
    return active.sort((a, b) => b.deletedAt - a.deletedAt)
  } catch {
    return []
  }
}

export function writeTrashItems(items: TrashItem[]): void {
  const serialized = JSON.stringify(items)
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, serialized)
  } catch (error) {
    // Free cached per-session sets snapshot first if localStorage quota is tight on mobile
    try {
      localStorage.removeItem('nutriflow:cached-sets-v1')
      localStorage.setItem(TRASH_STORAGE_KEY, serialized)
    } catch {
      throw error
    }
  }
  markCloudStateDirty()
}

export function moveToTrash(input: TrashInput, now: number = Date.now()): TrashItem[] {
  const existing = readTrashItems(now).filter(item => item.id !== input.id)
  const entry: TrashItem = {
    ...input,
    deletedAt: now,
    expiresAt: now + TRASH_RETENTION_MS,
  }
  const next = [entry, ...existing]
  writeTrashItems(next)
  return next
}

export function removeFromTrash(id: string): TrashItem[] {
  const next = readTrashItems().filter(item => item.id !== id)
  writeTrashItems(next)
  return next
}

export function clearTrash(): TrashItem[] {
  writeTrashItems([])
  return []
}
