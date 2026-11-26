'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Droplets, Dumbbell, Flame, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { HomeDashboardSnapshot } from '@/features/dashboard/homeData'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_WATER_GOAL_ML } from './progressUtils'
import { computeConsecutiveDays, formatLocalDateKey } from './recentWinsUtils'

interface HighlightCard {
  id: string
  href: string
  icon: React.ReactNode
  badgeBg: string
  title: string
  subtitle: string
}

export function RecentWins({ sharedData }: { sharedData?: HomeDashboardSnapshot | null }) {
  const supabase = createClient()
  const [cards, setCards] = useState<HighlightCard[]>([])

  const applyHighlightSnapshot = useCallback(
    (
      lastWorkout: HomeDashboardSnapshot['lastWorkout'],
      topLift: HomeDashboardSnapshot['topLift'],
      creatineDates: string[],
      waterMl: number,
      waterGoal: number,
    ) => {
      const streak = computeConsecutiveDays(creatineDates, formatLocalDateKey())
      const safeGoal = waterGoal || DEFAULT_WATER_GOAL_ML
      const waterPct = Math.round((waterMl / safeGoal) * 100)

      setCards([
        {
          id: 'last-workout',
          href: '/dashboard/gym',
          icon: <Dumbbell className="size-4 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/15',
          title: lastWorkout ? lastWorkout.workout_name : 'Primo Workout',
          subtitle: lastWorkout
            ? `${Math.max(1, Math.round((lastWorkout.duration_seconds || 0) / 60))} min · ${new Date(lastWorkout.started_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`
            : 'Avvia una scheda pronta',
        },
        {
          id: 'top-pr',
          href: '/dashboard/stats',
          icon: <Trophy className="size-4 text-amber-400" />,
          badgeBg: 'bg-amber-500/15',
          title: topLift ? `${topLift.max_weight_kg} kg` : 'Record Personali',
          subtitle: topLift ? topLift.exercise_name : 'Completa una serie',
        },
        {
          id: 'water-today',
          href: '/dashboard/water',
          icon: <Droplets className="size-4 text-sky-400" />,
          badgeBg: 'bg-sky-500/15',
          title: `Idratazione ${waterPct}%`,
          subtitle: `${waterMl.toLocaleString('it-IT')} / ${safeGoal.toLocaleString('it-IT')} ml`,
        },
        {
          id: 'creatine-streak',
          href: '/dashboard',
          icon: <Flame className="size-4 text-primary" />,
          badgeBg: 'bg-primary/15',
          title: streak > 0 ? `${streak}g Creatina` : 'Creatina 5g',
          subtitle: streak > 0 ? 'Giorni di fila' : 'Spunta da Oggi',
        },
      ])
    },
    [],
  )

  useEffect(() => {
    if (!sharedData) return
    applyHighlightSnapshot(
      sharedData.lastWorkout,
      sharedData.topLift,
      sharedData.creatineDates,
      sharedData.waterMlToday,
      sharedData.waterGoalMl,
    )
  }, [sharedData, applyHighlightSnapshot])

  const loadHighlights = useCallback(async () => {
    if (sharedData !== undefined) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const [lastWorkoutRes, topLiftRes, creatineRes, waterRes, profileRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('workout_name, duration_seconds, started_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('latest_exercise_performance')
          .select('exercise_name, max_weight_kg')
          .eq('user_id', user.id)
          .order('max_weight_kg', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('creatine_logs')
          .select('log_date')
          .eq('user_id', user.id)
          .order('log_date', { ascending: false })
          .limit(30),
        supabase
          .from('water_logs')
          .select('amount_ml')
          .eq('user_id', user.id)
          .gte('created_at', startOfDay.toISOString()),
        supabase
          .from('profiles')
          .select('water_goal_ml')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      const topLift = topLiftRes.data
      const lastWorkout = lastWorkoutRes.data
      const streak = (creatineRes.data ?? []).map(item => item.log_date)
      const waterMl = (waterRes.data ?? []).reduce((sum, row) => sum + (row.amount_ml || 0), 0)
      const waterGoal = profileRes.data?.water_goal_ml || DEFAULT_WATER_GOAL_ML
      applyHighlightSnapshot(lastWorkout, topLift, streak, waterMl, waterGoal)
    } catch (error) {
      console.error('Impossibile caricare gli highlights reali:', error)
    }
  }, [supabase, sharedData, applyHighlightSnapshot])

  useEffect(() => {
    void loadHighlights()
    const refresh = () => void loadHighlights()
    window.addEventListener('nutriflow:data-updated', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('nutriflow:data-updated', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [loadHighlights])

  if (cards.length === 0) return null

  return (
    <section aria-labelledby="highlights-heading" className="space-y-3">
      <h2 id="highlights-heading" className="text-base font-bold tracking-tight sm:text-lg">
        Riepilogo rapido
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cards.map(card => (
          <Link key={card.id} href={card.href} className="block min-w-0">
            <Card className="h-full border-border/60 transition-colors active:scale-[0.98] hover:border-primary/40">
              <CardContent className="flex items-start gap-3 p-3.5">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${card.badgeBg}`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">{card.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
