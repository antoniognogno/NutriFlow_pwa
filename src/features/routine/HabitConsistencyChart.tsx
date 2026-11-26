'use client'

import { LightweightBarChart } from '@/components/ui/LightweightBarChart'
import type { ChartBucket, ReportPeriod } from './habitStore'

interface HabitConsistencyChartProps {
  data: ChartBucket[]
  period: ReportPeriod
}

export function HabitConsistencyChart({ data, period }: HabitConsistencyChartProps) {
  if (data.length === 0) return null

  const chartData = data.map(item => ({
    label: item.label,
    value: item.pct,
    accent: item.pct >= 80,
    secondaryText: `${item.checkins} check-in`,
  }))

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">
        {period === 'day'
          ? 'Abitudini del giorno'
          : period === 'week'
            ? 'Andamento giornaliero (Lun–Dom)'
            : period === 'month'
              ? 'Andamento settimanale nel mese'
              : period === '3m'
                ? 'Andamento ultimi 3 mesi'
                : period === '6m'
                  ? 'Andamento ultimi 6 mesi'
                  : 'Andamento mensile nell’anno'}
      </p>
      <LightweightBarChart
        data={chartData}
        unit="%"
        heightPx={155}
        maxTicks={12}
        defaultTone="primary"
        accentTone="emerald"
      />
    </div>
  )
}
