import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'
import { DEFAULT_WATER_GOAL_ML, getStartOfWeekIso } from '@/app/components/dashboard/home/progressUtils'
import { offlineDatabase } from '@/features/offline/database'
import { readCachedWaterState, sumWaterLogs } from '@/features/nutrition/waterOfflineCache'
import { readCachedProfileSettings, saveCachedProfileSettings } from '@/features/routine/profileGoalsStore'
import {
  cachePlans,
  mergeRemoteAndCachedPlans,
  readCachedPlans,
} from '@/features/workouts/workoutOfflineCache'
import { createClient } from '@/lib/supabase/client'
import type { PlanWithWorkoutsAndExercises } from '@/lib/supabase/types'

export interface HomeDashboardSnapshot {
  userId: string | null
  username: string | null
  latestPlan: PlanWithWorkoutsAndExercises | null
  totalSessions: number
  sessionsThisWeek: number
  lastWorkout: {
    workout_name: string
    duration_seconds: number | null
    started_at: string
  } | null
  topLift: {
    exercise_name: string
    max_weight_kg: number
  } | null
  waterMlToday: number
  waterGoalMl: number
  focusMinutesToday: number
  creatineDates: string[]
  creatineAmountToday: number | null
  syncedAt: number
}

export async function fetchHomeDashboardSnapshot(
  supabase = createClient(),
): Promise<HomeDashboardSnapshot | null> {
  const localWater = sumWaterLogs(readCachedWaterState().logs)
  const localGoal = readCachedProfileSettings().water_goal_ml || DEFAULT_WATER_GOAL_ML

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null
  }

  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (authError) throw authError
  const user = session?.user
  if (!user) return null

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startOfDayIso = startOfDay.toISOString()
  const startOfWeekIso = getStartOfWeekIso()
  const todayKey = formatLocalDateKey()

  const [
    profileRes,
    planRes,
    totalWorkoutsRes,
    weekWorkoutsRes,
    lastWorkoutRes,
    topLiftRes,
    creatineRes,
    waterRes,
    focusRes,
    pendingOutbox,
  ] = await Promise.all([
    supabase.from('profiles').select('username, water_goal_ml').eq('id', user.id).maybeSingle(),
    supabase.rpc('get_latest_plan_details'),
    supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', startOfWeekIso),
    supabase.from('workout_sessions').select('workout_name, duration_seconds, started_at').eq('user_id', user.id).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('latest_exercise_performance').select('exercise_name, max_weight_kg').eq('user_id', user.id).order('max_weight_kg', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('creatine_logs').select('log_date, amount_g').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30),
    supabase.from('water_logs').select('amount_ml').eq('user_id', user.id).gte('created_at', startOfDayIso),
    supabase.from('focus_sessions').select('duration_seconds').eq('user_id', user.id).gte('started_at', startOfDayIso),
    offlineDatabase.outbox.where('userId').equals(user.id).toArray(),
  ])

  const hasPendingProfile = pendingOutbox.some(item => item.table === 'profiles')
  let resolvedUsername = readCachedProfileSettings().username || null
  let resolvedWaterGoal = localGoal
  if (!hasPendingProfile && profileRes.data) {
    resolvedUsername = profileRes.data.username ?? null
    resolvedWaterGoal = profileRes.data.water_goal_ml || localGoal
    saveCachedProfileSettings({
      username: profileRes.data.username ?? '',
      water_goal_ml: resolvedWaterGoal,
    })
  }

  const pendingSyncIds = new Set<string>()
  const pendingDeleteIds = new Set<string>()
  for (const item of pendingOutbox) {
    if (item.table === 'workout_plans_sync') {
      pendingSyncIds.add(item.payload.plan.id)
    } else if (item.table === 'workout_plans_delete') {
      pendingDeleteIds.add(item.payload.plan_id)
    }
  }

  let latestPlan: PlanWithWorkoutsAndExercises | null = readCachedPlans()[0] ?? null
  if (planRes.data) {
    const remotePlan = planRes.data as PlanWithWorkoutsAndExercises
    const merged = mergeRemoteAndCachedPlans(
      [remotePlan],
      readCachedPlans(),
      pendingSyncIds,
      pendingDeleteIds,
    )
    cachePlans(merged)
    latestPlan = merged[0] ?? null
  }

  const creatineRows = creatineRes.data ?? []
  const creatineDates = creatineRows.map(item => item.log_date)
  const todayCreatine = creatineRows.find(item => item.log_date === todayKey)
  const waterMlToday = (waterRes.data ?? []).reduce((sum, row) => sum + (row.amount_ml || 0), 0) || localWater
  const focusMinutesToday = Math.round(
    (focusRes.data ?? []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0) / 60,
  )

  return {
    userId: user.id,
    username: resolvedUsername,
    latestPlan,
    totalSessions: totalWorkoutsRes.count ?? 0,
    sessionsThisWeek: weekWorkoutsRes.count ?? 0,
    lastWorkout: lastWorkoutRes.data ?? null,
    topLift: topLiftRes.data ?? null,
    waterMlToday,
    waterGoalMl: resolvedWaterGoal,
    focusMinutesToday,
    creatineDates,
    creatineAmountToday: todayCreatine?.amount_g ?? null,
    syncedAt: Date.now(),
  }
}
