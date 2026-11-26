import type { PlanWithWorkoutsAndExercises, Tables } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { offlineDatabase } from '@/features/offline/database'
import type { EditableSession, EditableSet } from './SessionEditor'

export const CACHED_PLANS_KEY = 'nutriflow:cached-plans-v1'
export const CACHED_PERF_KEY = 'nutriflow:cached-perf-v1'
export const CACHED_SESSIONS_KEY = 'nutriflow:cached-sessions-v1'
export const CACHED_SETS_KEY = 'nutriflow:cached-sets-v1'

export interface CachedPerformanceItem {
  exercise_id: string | null
  exercise_key: string
  exercise_name: string
  weight_kg: number
  reps: number
  max_weight_kg: number
}

export type CachedWorkoutWithExercises = Tables<'workouts'> & {
  workout_exercises: Tables<'workout_exercises'>[]
}

export function readCachedPlans(): PlanWithWorkoutsAndExercises[] {
  try {
    const raw = localStorage.getItem(CACHED_PLANS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PlanWithWorkoutsAndExercises[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function cachePlans(plans: PlanWithWorkoutsAndExercises[]): void {
  try {
    localStorage.setItem(CACHED_PLANS_KEY, JSON.stringify(plans))
  } catch {
    // Ignore storage quota issues
  }
}

export function findCachedPlan(planId: string): PlanWithWorkoutsAndExercises | undefined {
  return readCachedPlans().find(plan => plan.id === planId)
}

export function upsertCachedPlan(plan: PlanWithWorkoutsAndExercises): PlanWithWorkoutsAndExercises[] {
  const existing = readCachedPlans().filter(item => item.id !== plan.id)
  const next = [plan, ...existing].sort((a, b) => b.created_at.localeCompare(a.created_at))
  cachePlans(next)
  return next
}

export function removeCachedPlan(planId: string): PlanWithWorkoutsAndExercises[] {
  const next = readCachedPlans().filter(item => item.id !== planId)
  cachePlans(next)
  return next
}

export function mergeRemoteAndCachedPlans(
  remotePlans: PlanWithWorkoutsAndExercises[],
  localCachedPlans: PlanWithWorkoutsAndExercises[] = readCachedPlans(),
  pendingSyncPlanIds: Set<string> = new Set(),
  pendingDeletePlanIds: Set<string> = new Set(),
): PlanWithWorkoutsAndExercises[] {
  const merged = new Map<string, PlanWithWorkoutsAndExercises>()
  for (const remote of remotePlans) {
    if (!pendingDeletePlanIds.has(remote.id)) {
      merged.set(remote.id, remote)
    }
  }
  for (const local of localCachedPlans) {
    if (pendingDeletePlanIds.has(local.id)) continue
    if (pendingSyncPlanIds.has(local.id)) {
      merged.set(local.id, local)
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function findCachedWorkout(workoutId: string): CachedWorkoutWithExercises | undefined {
  for (const plan of readCachedPlans()) {
    const match = (plan.workouts ?? []).find(w => w.id === workoutId)
    if (match) {
      return {
        ...match,
        workout_exercises: [...(match.workout_exercises ?? [])].sort((a, b) => a.order - b.order),
      }
    }
  }
  return undefined
}

export function readCachedPerformance(): CachedPerformanceItem[] {
  try {
    const raw = localStorage.getItem(CACHED_PERF_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CachedPerformanceItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function cachePerformance(items: CachedPerformanceItem[]): void {
  try {
    localStorage.setItem(CACHED_PERF_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage quota issues
  }
}

export function readCachedSessions(): EditableSession[] {
  try {
    const raw = localStorage.getItem(CACHED_SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EditableSession[]
    if (!Array.isArray(parsed)) return []
    return [...parsed].sort((a, b) => b.started_at.localeCompare(a.started_at))
  } catch {
    return []
  }
}

export function saveCachedSessions(sessions: EditableSession[]): void {
  try {
    const sorted = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 80)
    localStorage.setItem(CACHED_SESSIONS_KEY, JSON.stringify(sorted))
  } catch {
    // Ignore storage quota issues
  }
}

function readAllCachedSetsMap(): Record<string, EditableSet[]> {
  try {
    const raw = localStorage.getItem(CACHED_SETS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, EditableSet[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readCachedSetsForSession(sessionId: string): EditableSet[] {
  return readAllCachedSetsMap()[sessionId] ?? []
}

export function cacheSetsForSession(sessionId: string, sets: EditableSet[]): void {
  try {
    const map = readAllCachedSetsMap()
    map[sessionId] = sets
    // Keep up to 50 most recent session set lists to stay lightweight
    const keys = Object.keys(map)
    if (keys.length > 50) {
      delete map[keys[0]]
    }
    localStorage.setItem(CACHED_SETS_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage quota issues
  }
}

export function upsertCachedSession(session: EditableSession, sets?: EditableSet[]): EditableSession[] {
  const existing = readCachedSessions().filter(item => item.id !== session.id)
  const next = [session, ...existing].sort((a, b) => b.started_at.localeCompare(a.started_at))
  saveCachedSessions(next)
  if (sets) {
    cacheSetsForSession(session.id, sets)
  }
  return next
}

export function removeCachedSession(sessionId: string): EditableSession[] {
  const next = readCachedSessions().filter(item => item.id !== sessionId)
  saveCachedSessions(next)
  try {
    const map = readAllCachedSetsMap()
    delete map[sessionId]
    localStorage.setItem(CACHED_SETS_KEY, JSON.stringify(map))
  } catch {
    // Ignore
  }
  return next
}

export function mergeRemoteAndCachedSessions(
  remoteSessions: EditableSession[],
  localCachedSessions: EditableSession[] = readCachedSessions(),
  pendingOutboxSessionIds: Set<string> = new Set(),
  pendingDeleteSessionIds: Set<string> = new Set(),
): EditableSession[] {
  const merged = new Map<string, EditableSession>()
  for (const r of remoteSessions) {
    if (!pendingDeleteSessionIds.has(r.id)) {
      merged.set(r.id, r)
    }
  }
  for (const local of localCachedSessions) {
    if (pendingDeleteSessionIds.has(local.id)) continue
    // Preserve sessions created or modified while offline that aren't in remote yet
    if (!merged.has(local.id) && pendingOutboxSessionIds.has(local.id)) {
      merged.set(local.id, local)
    } else if (pendingOutboxSessionIds.has(local.id)) {
      merged.set(local.id, local)
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.started_at.localeCompare(a.started_at))
}

let warmingPromise: Promise<void> | null = null

export async function warmWorkoutOfflineCache(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  if (warmingPromise) return warmingPromise

  warmingPromise = (async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const [plansRes, perfRes, sessionsRes, pendingOutbox] = await Promise.all([
        supabase
          .from('workout_plans')
          .select('*, workouts(*, workout_exercises(*))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('latest_exercise_performance')
          .select('exercise_id, exercise_key, exercise_name, weight_kg, reps, max_weight_kg')
          .eq('user_id', user.id),
        supabase
          .from('workout_sessions')
          .select('id, user_id, workout_id, workout_name, started_at, ended_at, duration_seconds')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(50),
        offlineDatabase.outbox.where('userId').equals(user.id).toArray(),
      ])

      const pendingSyncPlanIds = new Set(
        pendingOutbox
          .filter(item => item.table === 'workout_plans_sync')
          .map(item => item.payload.plan.id),
      )
      const pendingDeletePlanIds = new Set(
        pendingOutbox
          .filter(item => item.table === 'workout_plans_delete')
          .map(item => item.payload.plan_id),
      )
      const pendingSessionIds = new Set(
        pendingOutbox
          .filter(item => item.table === 'workout_sessions')
          .map(item => item.payload.id)
          .filter((id): id is string => Boolean(id)),
      )
      const pendingDeleteSessionIds = new Set(
        pendingOutbox
          .filter(item => item.table === 'workout_sessions_delete')
          .map(item => item.payload.session_id)
          .filter(Boolean),
      )

      if (!plansRes.error && plansRes.data) {
        const mergedPlans = mergeRemoteAndCachedPlans(
          plansRes.data as PlanWithWorkoutsAndExercises[],
          readCachedPlans(),
          pendingSyncPlanIds,
          pendingDeletePlanIds,
        )
        cachePlans(mergedPlans)
      }
      if (!perfRes.error && perfRes.data) {
        cachePerformance(perfRes.data as CachedPerformanceItem[])
      }
      if (!sessionsRes.error && sessionsRes.data) {
        const mergedSessions = mergeRemoteAndCachedSessions(
          sessionsRes.data as EditableSession[],
          readCachedSessions(),
          pendingSessionIds,
          pendingDeleteSessionIds,
        )
        saveCachedSessions(mergedSessions)
      }
    } catch {
      // Silent warm failure when offline or flaky
    } finally {
      warmingPromise = null
    }
  })()

  return warmingPromise
}
