'use client'

import { useCallback, useEffect, useState } from 'react'
import { TodayWidget } from '@/features/dashboard/TodayWidget'
import { WelcomeBackCtaCard } from '@/features/dashboard/WelcomeBackCtaCard'
import {
  fetchHomeDashboardSnapshot,
  type HomeDashboardSnapshot,
} from '@/features/dashboard/homeData'
import { GamificationCard } from '@/app/components/dashboard/home/GamificationCard'
import { NextWorkoutCard } from '@/app/components/dashboard/home/NextWorkoutCard'
import { ProgressRings } from '@/app/components/dashboard/home/ProgressRings'
import { RecentWins } from '@/app/components/dashboard/home/RecentWins'
import { DEFAULT_WORKOUTS } from '@/features/workouts/defaultWorkouts'
import { readCachedProfileSettings } from '@/features/routine/profileGoalsStore'
import { readCachedPlans } from '@/features/workouts/workoutOfflineCache'
import { createClient } from '@/lib/supabase/client'
import type { PlanWithWorkoutsAndExercises, Workout, WorkoutExercise } from '@/lib/supabase/types'

const getFormattedDate = (): string => {
  const today = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  const formattedDate = new Intl.DateTimeFormat('it-IT', options).format(today)
  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)
}

export type Win = {
  type: string
  title: string
  description: string
  icon: string
  color: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const [username, setUsername] = useState<string | null>(
    () => readCachedProfileSettings().username || null,
  )
  const [latestPlan, setLatestPlan] = useState<PlanWithWorkoutsAndExercises | null>(
    () => readCachedPlans()[0] ?? null,
  )
  const [homeSnapshot, setHomeSnapshot] = useState<HomeDashboardSnapshot | null>(null)
  const currentDate = getFormattedDate()

  const loadConsolidatedHome = useCallback(async () => {
    try {
      const snap = await fetchHomeDashboardSnapshot(supabase)
      if (!snap) return
      setHomeSnapshot(snap)
      if (snap.username !== null) {
        setUsername(snap.username || null)
      }
      if (snap.latestPlan) {
        setLatestPlan(snap.latestPlan)
      }
    } catch (error) {
      console.error('Impossibile aggiornare la dashboard Home:', error)
    }
  }, [supabase])

  useEffect(() => {
    void loadConsolidatedHome()
    let refreshTimer: number | null = null
    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        void loadConsolidatedHome()
      }, 150)
    }
    window.addEventListener('nutriflow:data-updated', scheduleRefresh)
    document.addEventListener('visibilitychange', scheduleRefresh)
    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      window.removeEventListener('nutriflow:data-updated', scheduleRefresh)
      document.removeEventListener('visibilitychange', scheduleRefresh)
    }
  }, [loadConsolidatedHome])

  const nextWorkout =
    latestPlan?.workouts?.[0] ??
    (DEFAULT_WORKOUTS[0] as unknown as Workout & { workout_exercises: WorkoutExercise[] })

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
      <header className="space-y-0.5">
        <p className="text-xs font-medium capitalize text-muted-foreground sm:text-sm">
          {currentDate}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Bentornato, <span className="text-primary">{username || 'Atleta'}!</span>
        </h1>
      </header>

      <div className="space-y-4 sm:space-y-6">
        <WelcomeBackCtaCard />

        <GamificationCard sharedData={homeSnapshot} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2" data-tour="home-progress">
            <ProgressRings sharedData={homeSnapshot} />
          </div>
          <div className="lg:col-span-1">
            <NextWorkoutCard workout={nextWorkout} />
          </div>
        </div>

        <TodayWidget sharedData={homeSnapshot} />

        <RecentWins sharedData={homeSnapshot} />
      </div>
    </div>
  )
}
