'use client'

import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface HeatmapData {
  date: string
  count: number
}

interface WorkoutHeatmapProps {
  data: HeatmapData[]
}

export function WorkoutHeatmap({ data }: WorkoutHeatmapProps) {
  const { cells, activeDaysCount } = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const item of data) {
      const normalized = item.date.replace(/\//g, '-').slice(0, 10)
      byDate.set(normalized, (byDate.get(normalized) ?? 0) + (item.count || 0))
    }

    const totalDays = 16 * 7 // 16 settimane (112 celle leggere CSS)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const list: Array<{ dateKey: string; count: number; label: string }> = []
    let active = 0

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = formatLocalDateKey(d)
      const count = byDate.get(key) ?? 0
      if (count > 0) active += 1
      list.push({
        dateKey: key,
        count,
        label: d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
      })
    }
    return { cells: list, activeDaysCount: active }
  }, [data])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-emerald-500" />
              Consistenza Allenamenti
            </CardTitle>
            <CardDescription className="text-xs">
              Ultime 16 settimane · {activeDaysCount} giorni attivi
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Meno</span>
            <span className="size-2.5 rounded-[3px] bg-slate-200 dark:bg-[#162433]" />
            <span className="size-2.5 rounded-[3px] bg-emerald-400/75" />
            <span className="size-2.5 rounded-[3px] bg-emerald-500" />
            <span>Più</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[280px] grid-flow-col grid-rows-7 gap-1">
            {cells.map(cell => (
              <div
                key={cell.dateKey}
                title={`${cell.label}: ${cell.count} session${cell.count === 1 ? 'e' : 'i'}`}
                className={`h-3 w-full min-w-[10px] rounded-[3px] transition-colors ${
                  cell.count >= 2
                    ? 'bg-emerald-500'
                    : cell.count === 1
                      ? 'bg-emerald-400/80 dark:bg-emerald-500/75'
                      : 'bg-slate-200 dark:bg-[#162433]'
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
