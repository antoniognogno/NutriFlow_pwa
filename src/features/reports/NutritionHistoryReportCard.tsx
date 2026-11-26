'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from 'next-themes'
import { CalendarRange, Utensils } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { chartColors } from '@/config/chartColors'
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

export function NutritionHistoryReportCard({
  userId,
  calorieGoal,
  todayMealsCount,
}: NutritionHistoryReportCardProps) {
  const supabase = useMemo(() => createClient(), [])
  const { resolvedTheme } = useTheme()
  const colors = resolvedTheme === 'light' ? chartColors.light : chartColors.dark

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
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.chartSeries} margin={{ top: 8, right: 6, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis
                  dataKey="label"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke={colors.text}
                  interval={period === 'month' ? 4 : 0}
                />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke={colors.text}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(122, 166, 189, 0.08)' }}
                  contentStyle={{
                    backgroundColor: colors.tooltipBg,
                    borderColor: colors.tooltipBorder,
                    color: colors.tooltipText,
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString('it-IT')} kcal`, 'Calorie']}
                />
                <Bar dataKey="calories" radius={[4, 4, 0, 0]} maxBarSize={26}>
                  {summary.chartSeries.map((entry, idx) => (
                    <Cell
                      key={`${entry.label}-${idx}`}
                      fill={
                        entry.calories > 0 && entry.calories <= calorieGoal * 1.1
                          ? colors.barAccent
                          : colors.bar
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {period === 'day' && meals.length > 0 && (
          <div className="space-y-1.5 border-t border-border/50 pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Utensils className="size-3.5 text-emerald-500" />
              Pasti nel giorno selezionato ({meals.length})
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {meals.slice(0, 12).map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/35 px-2.5 py-1.5 text-xs dark:bg-[#111f2c]/70"
                >
                  <span className="truncate font-medium">{item.meal_name}</span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {item.calories} kcal · {Math.round(item.protein_g)}P
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
