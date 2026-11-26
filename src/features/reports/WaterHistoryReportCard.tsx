'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from 'next-themes'
import { CalendarRange, Droplets } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { chartColors } from '@/config/chartColors'
import { readCachedWaterState } from '@/features/nutrition/waterOfflineCache'
import { createClient } from '@/lib/supabase/client'
import { PeriodNavigator } from './PeriodNavigator'
import {
  buildWaterPeriodReport,
  type FullReportPeriod,
  getPeriodWindow,
  type WaterHistoryLogItem,
} from './periodUtils'

interface WaterHistoryReportCardProps {
  userId: string | null
  dailyGoal: number
  refreshSignal?: number
}

export function WaterHistoryReportCard({
  userId,
  dailyGoal,
  refreshSignal = 0,
}: WaterHistoryReportCardProps) {
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
  const [logs, setLogs] = useState<WaterHistoryLogItem[]>(() => readCachedWaterState().logs)
  const [isLoading, setIsLoading] = useState(false)
  const cacheRef = useRef<Map<string, WaterHistoryLogItem[]>>(new Map())

  const currentOffset = offsets[period]
  const periodWindow = useMemo(() => getPeriodWindow(period, currentOffset), [period, currentOffset])

  useEffect(() => {
    const cacheKey = `${userId ?? 'anon'}:${period}:${currentOffset}`
    const cachedToday = readCachedWaterState().logs

    if (period === 'day' && currentOffset === 0) {
      setLogs(cachedToday)
    }

    if (!userId || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      if (period === 'day' && currentOffset === 0) {
        setLogs(cachedToday)
      }
      return
    }

    const hit = cacheRef.current.get(cacheKey)
    if (hit && !(period === 'day' && currentOffset === 0)) {
      setLogs(hit)
      return
    }

    let active = true
    const loadRange = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('water_logs')
          .select('id, amount_ml, created_at')
          .eq('user_id', userId)
          .gte('created_at', periodWindow.startIso)
          .lt('created_at', periodWindow.endIso)
          .order('created_at', { ascending: false })
        if (!active) return
        if (!error && data) {
          const rows = data as WaterHistoryLogItem[]
          cacheRef.current.set(cacheKey, rows)
          setLogs(rows)
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadRange()
    return () => {
      active = false
    }
  }, [userId, period, currentOffset, periodWindow.startIso, periodWindow.endIso, refreshSignal, supabase])

  const summary = useMemo(
    () => buildWaterPeriodReport(logs, periodWindow, dailyGoal),
    [logs, periodWindow, dailyGoal],
  )

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="size-4 text-sky-500" />
            Storico & Report Idratazione
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
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10.5px] text-muted-foreground">Totale</p>
            <p className="font-mono text-sm font-bold text-primary">
              {summary.totalMl >= 1000
                ? `${(summary.totalMl / 1000).toFixed(1)} L`
                : `${summary.totalMl} ml`}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10.5px] text-muted-foreground">
              {period === 'day' ? 'Target' : 'Media / g'}
            </p>
            <p className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
              {period === 'day'
                ? `${Math.round((summary.totalMl / Math.max(1, dailyGoal)) * 100)}%`
                : `${summary.avgDailyMl} ml`}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10.5px] text-muted-foreground">Giorni target</p>
            <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {summary.daysGoalMet} / {Math.max(1, summary.activeDays)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Caricamento report...</p>
        ) : (
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.chartSeries} margin={{ top: 8, right: 6, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis
                  dataKey="label"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke={colors.text}
                  interval={period === 'month' ? 4 : period === 'day' ? 3 : 0}
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
                  formatter={(value: number) => [
                    `${value.toLocaleString('it-IT')} ml`,
                    period === '3m' || period === '6m' || period === 'year' ? 'Media/g' : 'Acqua',
                  ]}
                />
                <Bar dataKey="ml" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {summary.chartSeries.map((entry, idx) => (
                    <Cell
                      key={`${entry.label}-${idx}`}
                      fill={entry.goalMet ? colors.barAccent : colors.bar}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {period === 'day' && logs.length > 0 && (
          <div className="space-y-1.5 border-t border-border/50 pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Droplets className="size-3.5 text-sky-500" />
              Bevute del giorno ({logs.length})
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {logs.slice(0, 12).map((item, idx) => (
                <div
                  key={`${item.id ?? item.localId ?? idx}`}
                  className="flex items-center justify-between rounded-lg bg-muted/35 px-2.5 py-1.5 text-xs dark:bg-[#111f2c]/70"
                >
                  <span className="text-muted-foreground">
                    {new Date(item.created_at).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                    +{item.amount_ml} ml
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
