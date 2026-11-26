'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarRange, ChevronDown, ChevronUp, Utensils } from 'lucide-react'
import { LightweightBarChart } from '@/components/ui/LightweightBarChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { readCachedMeals } from '@/features/nutrition/mealOfflineCache'
import { createClient } from '@/lib/supabase/client'
import { PeriodNavigator } from './PeriodNavigator'
import {
  buildMealPeriodReport,
  type FullReportPeriod,
  getPeriodWindow,
  type MealHistoryItem,
} from './periodUtils'

interface NutritionHistoryReportCardProps {
  userId: string | null
  calorieGoal: number
  todayMealsCount: number
}

function formatMealWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Oggi · ${timeStr}`
  const dateStr = d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
  return `${dateStr} · ${timeStr}`
}

export function NutritionHistoryReportCard({
  userId,
  calorieGoal,
  todayMealsCount,
}: NutritionHistoryReportCardProps) {
  const supabase = useMemo(() => createClient(), [])

  const [period, setPeriod] = useState<FullReportPeriod>('week')
  const [offsets, setOffsets] = useState<Record<FullReportPeriod, number>>({
    day: 0,
    week: 0,
    month: 0,
    '3m': 0,
    '6m': 0,
    year: 0,
  })
  const [meals, setMeals] = useState<MealHistoryItem[]>(() => readCachedMeals())
  const [isLoading, setIsLoading] = useState(false)
  const [showMealLog, setShowMealLog] = useState(true)
  const cacheRef = useRef<Map<string, MealHistoryItem[]>>(new Map())

  const currentOffset = offsets[period]
  const periodWindow = useMemo(() => getPeriodWindow(period, currentOffset), [period, currentOffset])

  useEffect(() => {
    const cacheKey = `${userId ?? 'anon'}:${period}:${currentOffset}`
    const cachedToday = readCachedMeals()

    if (period === 'day' && currentOffset === 0) {
      setMeals(cachedToday)
    }

    if (!userId || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      if (period === 'day' && currentOffset === 0) {
        setMeals(cachedToday)
      }
      return
    }

    const hit = cacheRef.current.get(cacheKey)
    if (hit && !(period === 'day' && currentOffset === 0)) {
      setMeals(hit)
      return
    }

    let active = true
    const loadRange = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('meal_logs')
          .select('id, meal_name, calories, protein_g, carbs_g, fats_g, logged_at')
          .eq('user_id', userId)
          .gte('logged_at', periodWindow.startIso)
          .lt('logged_at', periodWindow.endIso)
          .order('logged_at', { ascending: false })
        if (!active) return
        if (!error && data) {
          const rows = data as MealHistoryItem[]
          cacheRef.current.set(cacheKey, rows)
          setMeals(rows)
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadRange()
    return () => {
      active = false
    }
  }, [userId, period, currentOffset, periodWindow.startIso, periodWindow.endIso, todayMealsCount, supabase])

  const summary = useMemo(() => buildMealPeriodReport(meals, periodWindow), [meals, periodWindow])

  const mealsInWindow = useMemo(() => {
    return meals
      .filter(m => {
        const ms = new Date(m.logged_at).getTime()
        return ms >= periodWindow.start.getTime() && ms < periodWindow.end.getTime()
      })
      .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
  }, [meals, periodWindow])

  const chartData = useMemo(
    () =>
      summary.chartSeries.map(item => ({
        label: item.label,
        value: item.calories,
        accent: item.calories > 0 && item.calories <= calorieGoal * 1.1,
        secondaryText: `${item.protein}g P`,
      })),
    [summary.chartSeries, calorieGoal],
  )

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="size-4 text-emerald-500" />
            Storico & Report Nutrizione
          </CardTitle>
          <CardDescription className="text-xs">
            Scorri giorni, settimane, mesi, 3 mesi, 6 mesi o anni
          </CardDescription>
        </div>

        <PeriodNavigator
          period={period}
          offset={currentOffset}
          periodLabel={periodWindow.label}
          onPeriodChange={setPeriod}
          onOffsetChange={nextOffset =>
            setOffsets(prev => ({ ...prev, [period]: Math.min(0, nextOffset) }))
          }
        />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10.5px] text-muted-foreground">
              {period === 'day' ? 'Kcal giorno' : 'Media kcal/g'}
            </p>
            <p className="font-mono text-sm font-bold text-primary">
              {summary.avgDailyCalories.toLocaleString('it-IT')}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10.5px] text-muted-foreground">Media P / C / F</p>
            <p className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {summary.avgProtein} · {summary.avgCarbs} · {summary.avgFats}g
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10.5px] text-muted-foreground">Pasti totali</p>
            <p className="font-mono text-sm font-bold text-foreground">{summary.mealsCount}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10.5px] text-muted-foreground">Giorni registrati</p>
            <p className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
              {summary.activeDays}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Caricamento report...</p>
        ) : (
          <LightweightBarChart
            data={chartData}
            unit="kcal"
            heightPx={185}
            maxTicks={period === 'month' ? 6 : 8}
            defaultTone="primary"
            accentTone="emerald"
          />
        )}

        <div className="space-y-2 border-t border-border/50 pt-3">
          <button
            type="button"
            onClick={() => setShowMealLog(v => !v)}
            className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Utensils className="size-3.5 text-emerald-500" />
              Cosa hai mangiato nel periodo ({mealsInWindow.length})
            </span>
            {showMealLog ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showMealLog && (
            mealsInWindow.length === 0 ? (
              <p className="rounded-lg bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
                Nessun pasto registrato in questo intervallo.
              </p>
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {mealsInWindow.slice(0, 60).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/35 px-2.5 py-2 text-xs dark:bg-[#111f2c]/70"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{item.meal_name}</p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {formatMealWhen(item.logged_at)} · {Math.round(item.protein_g)}P · {Math.round(item.carbs_g)}C · {Math.round(item.fats_g)}G
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-primary">
                      {item.calories} kcal
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
