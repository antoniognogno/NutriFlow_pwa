'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { readCachedWaterState, sumWaterLogs } from '@/features/nutrition/waterOfflineCache'
import { readCachedProfileSettings } from '@/features/routine/profileGoalsStore'
import { readCachedSessions } from '@/features/workouts/workoutOfflineCache'
import { createClient } from '@/lib/supabase/client'
import {
  clampRingPercent,
  DAILY_FOCUS_GOAL_MINUTES,
  DEFAULT_WATER_GOAL_ML,
  formatLiters,
  getStartOfWeekIso,
  getWeeklyWorkoutGoal,
  type ProgressSnapshot,
} from './progressUtils'

interface RingProps {
  progress: number
  label: string
  value: string
  colorClass: string
}

function Ring({ progress, label, value, colorClass }: RingProps) {
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <svg className="size-20 -rotate-90 sm:size-24" viewBox="0 0 100 100">
        <circle
          className="text-muted/20"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="40"
          cx="50"
          cy="50"
        />
        <circle
          className={colorClass}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="40"
          cx="50"
          cy="50"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-xs font-bold sm:text-sm">{value}</p>
    </div>
  )
}

export function ProgressRings() {
  const supabase = createClient()
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>(() => {
    const startOfWeekIso = getStartOfWeekIso()
    const cachedSessions = readCachedSessions().filter(s => s.started_at >= startOfWeekIso)
    return {
      workoutsThisWeek: cachedSessions.length,
      waterMlToday: sumWaterLogs(readCachedWaterState().logs),
      waterGoalMl: readCachedProfileSettings().water_goal_ml || DEFAULT_WATER_GOAL_ML,
      focusMinutesToday: 0,
    }
  })

  const loadSnapshot = useCallback(async () => {
    const startOfWeekIso = getStartOfWeekIso()
    const localWater = sumWaterLogs(readCachedWaterState().logs)
    const localGoal = readCachedProfileSettings().water_goal_ml || DEFAULT_WATER_GOAL_ML
    const localWorkouts = readCachedSessions().filter(s => s.started_at >= startOfWeekIso).length

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSnapshot(prev => ({
        workoutsThisWeek: Math.max(prev.workoutsThisWeek, localWorkouts),
        waterMlToday: localWater,
        waterGoalMl: localGoal,
        focusMinutesToday: prev.focusMinutesToday,
      }))
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const startOfDayIso = startOfDay.toISOString()

      const [profileRes, waterRes, workoutsRes, focusRes] = await Promise.all([
        supabase.from('profiles').select('water_goal_ml').eq('id', user.id).maybeSingle(),
        supabase.from('water_logs').select('amount_ml').eq('user_id', user.id).gte('created_at', startOfDayIso),
        supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', startOfWeekIso),
        supabase.from('focus_sessions').select('duration_seconds').eq('user_id', user.id).gte('started_at', startOfDayIso),
      ])

      const waterMlToday = (waterRes.data ?? []).reduce((sum, row) => sum + (row.amount_ml || 0), 0)
      const focusMinutesToday = Math.round(
        (focusRes.data ?? []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0) / 60,
      )

      setSnapshot({
        workoutsThisWeek: workoutsRes.count ?? 0,
        waterMlToday,
        waterGoalMl: profileRes.data?.water_goal_ml || DEFAULT_WATER_GOAL_ML,
        focusMinutesToday,
      })
    } catch (error) {
      console.error('Impossibile aggiornare i progressi reali:', error)
    }
  }, [supabase])

  useEffect(() => {
    void loadSnapshot()
    const refresh = () => void loadSnapshot()
    window.addEventListener('nutriflow:data-updated', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('nutriflow:data-updated', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [loadSnapshot])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Progressi</CardTitle>
      </CardHeader>
      <CardContent>
        {(() => {
          const weeklyGoal = getWeeklyWorkoutGoal()
          return (
        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          <Ring
            progress={clampRingPercent(snapshot.workoutsThisWeek, weeklyGoal)}
            label="Workout (Sett.)"
            value={`${snapshot.workoutsThisWeek} / ${weeklyGoal}`}
            colorClass="text-emerald-400"
          />
          <Ring
            progress={clampRingPercent(snapshot.waterMlToday, snapshot.waterGoalMl)}
            label="Acqua (Oggi)"
            value={`${formatLiters(snapshot.waterMlToday)} / ${formatLiters(snapshot.waterGoalMl)}`}
            colorClass="text-sky-400"
          />
          <Ring
            progress={clampRingPercent(snapshot.focusMinutesToday, DAILY_FOCUS_GOAL_MINUTES)}
            label="Focus (Oggi)"
            value={`${snapshot.focusMinutesToday} / ${DAILY_FOCUS_GOAL_MINUTES}m`}
            colorClass="text-primary"
          />
        </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
