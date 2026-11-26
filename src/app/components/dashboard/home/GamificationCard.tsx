'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, CheckCircle2, Circle, Flame, Snowflake, Target, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import {
  activateWeeklyStreakFreeze,
  computeGamificationSummary,
  type GamificationSummary,
  readFrozenDateKey,
} from './gamificationUtils'
import { DEFAULT_WATER_GOAL_ML, getStartOfWeekIso, WEEKLY_WORKOUT_GOAL } from './progressUtils'
import { computeConsecutiveDays, formatLocalDateKey } from './recentWinsUtils'
import { computeHabitStreak, countTotalHabitCheckins, readHabitLogs } from '@/features/routine/habitStore'

export function GamificationCard() {
  const supabase = createClient()
  const [summary, setSummary] = useState<GamificationSummary | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0)
  const [freezeUsedDate, setFreezeUsedDate] = useState<string | null>(() => readFrozenDateKey())
  const [canRecoverStreak, setCanRecoverStreak] = useState(false)

  const loadGamification = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const startOfDayIso = startOfDay.toISOString()
      const startOfWeekIso = getStartOfWeekIso()
      const todayKey = formatLocalDateKey()
      const yesterday = new Date(startOfDay)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayKey = formatLocalDateKey(yesterday)

      const [totalRes, weekRes, creatineRes, waterRes, profileRes, focusRes] = await Promise.all([
        supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', startOfWeekIso),
        supabase.from('creatine_logs').select('log_date').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30),
        supabase.from('water_logs').select('amount_ml').eq('user_id', user.id).gte('created_at', startOfDayIso),
        supabase.from('profiles').select('water_goal_ml').eq('id', user.id).maybeSingle(),
        supabase.from('focus_sessions').select('duration_seconds').eq('user_id', user.id).gte('started_at', startOfDayIso),
      ])

      const rawDates = (creatineRes.data ?? []).map(item => item.log_date)
      const activeFreeze = readFrozenDateKey()
      setFreezeUsedDate(activeFreeze)
      const effectiveDates = activeFreeze ? [...rawDates, activeFreeze] : rawDates
      const streak = computeConsecutiveDays(effectiveDates, todayKey)
      const creatineDoneToday = rawDates.includes(todayKey)

      // Offre il Freeze settimanale se ieri mancava la creatina ma l'utente ha altri log nei giorni precedenti
      const missedYesterday = !rawDates.includes(yesterdayKey) && rawDates.length > 0 && !activeFreeze
      setCanRecoverStreak(missedYesterday)

      const waterMlToday = (waterRes.data ?? []).reduce((sum, row) => sum + (row.amount_ml || 0), 0)
      const waterGoalMl = profileRes.data?.water_goal_ml || DEFAULT_WATER_GOAL_ML
      const focusMinutesToday = Math.round(
        (focusRes.data ?? []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0) / 60,
      )
      const weekCount = weekRes.count ?? 0

      const habitLogs = readHabitLogs()
      const habitStreak = computeHabitStreak(habitLogs)
      const habitCheckinsTotal = countTotalHabitCheckins(habitLogs)
      const effectiveStreak = Math.max(streak, habitStreak)

      setStreakDays(effectiveStreak)
      setSessionsThisWeek(weekCount)
      setSummary(
        computeGamificationSummary({
          totalSessions: totalRes.count ?? 0,
          sessionsThisWeek: weekCount,
          weeklyTarget: WEEKLY_WORKOUT_GOAL,
          creatineDoneToday,
          waterMlToday,
          waterGoalMl,
          focusMinutesToday,
          creatineStreakDays: effectiveStreak,
          habitCheckinsTotal,
        }),
      )
    } catch (error) {
      console.error('Impossibile calcolare i dati gamification:', error)
    }
  }, [supabase])

  useEffect(() => {
    void loadGamification()
    const refresh = () => void loadGamification()
    window.addEventListener('nutriflow:data-updated', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('nutriflow:data-updated', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [loadGamification])

  const handleActivateFreeze = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const ok = activateWeeklyStreakFreeze(formatLocalDateKey(yesterday))
    if (ok) {
      toast.success('Streak Freeze attivato per questa settimana!')
      void loadGamification()
    }
  }

  if (!summary) return null

  const unlockedBadges = summary.badges.filter(b => b.unlocked)

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Trophy className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold">Lv. {summary.level}</span>
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {summary.levelTitle}
                </Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {summary.totalXp} XP · {summary.xpIntoLevel}/{summary.xpForNextLevel}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 font-mono text-[10px] font-semibold text-sky-400"
              title="Streak Freeze settimanale"
            >
              <Snowflake className="size-3" />
              {freezeUsedDate ? '0/1' : '1/1'}
            </span>
            <div className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-400">
              <Flame className="size-3.5" />
              <span className="font-mono text-xs font-bold">{streakDays}g</span>
            </div>
          </div>
        </div>
        <Progress value={summary.levelProgressPct} className="mt-2 h-2" />
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        {canRecoverStreak && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs">
            <span className="min-w-0 truncate text-sky-300">Proteggi la streak di ieri con il jolly</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 shrink-0 rounded-lg px-2 text-[11px]"
              onClick={handleActivateFreeze}
            >
              <Snowflake className="mr-1 size-3" />
              Usa Freeze
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
            <Target className="size-3.5 text-primary" />
            Missioni ({summary.todayQuestsDone}/{summary.todayQuestsTotal})
          </span>
          <span className="font-mono text-muted-foreground">
            Sfida sett.: {sessionsThisWeek}/{WEEKLY_WORKOUT_GOAL}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {summary.quests.map(quest => (
            <div
              key={quest.id}
              className={`flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-xs ${
                quest.done
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-foreground'
                  : 'border-border/60 bg-background/40 text-muted-foreground'
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {quest.done ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="size-3.5 shrink-0 opacity-50" />
                )}
                <span className="truncate font-medium">{quest.label}</span>
              </span>
              <span className="shrink-0 font-mono text-[10px] text-primary">+{quest.xp}</span>
            </div>
          ))}
        </div>

        {unlockedBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-2.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Award className="size-3.5 text-amber-400" />
              Badge:
            </span>
            {unlockedBadges.map(badge => (
              <Badge key={badge.id} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300">
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
