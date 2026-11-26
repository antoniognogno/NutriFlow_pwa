'use client'

import { useTheme } from 'next-themes'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartColors } from '@/config/chartColors'
import type { ChartBucket, ReportPeriod } from './habitStore'

interface HabitConsistencyChartProps {
  data: ChartBucket[]
  period: ReportPeriod
}

export function HabitConsistencyChart({ data, period }: HabitConsistencyChartProps) {
  const { resolvedTheme } = useTheme()
  const colors = resolvedTheme === 'light' ? chartColors.light : chartColors.dark

  if (data.length === 0) return null

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
      <div className="h-[175px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="label"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              stroke={colors.text}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              unit="%"
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
              formatter={(value, _name, item) => {
                const payload = item?.payload as ChartBucket | undefined
                return [
                  `${value}% (${payload?.checkins ?? 0} check-in)`,
                  'Costanza',
                ]
              }}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {data.map((entry, idx) => (
                <Cell
                  key={`${entry.label}-${idx}`}
                  fill={
                    entry.pct >= 80
                      ? colors.barAccent
                      : entry.pct >= 40
                        ? colors.bar
                        : entry.pct > 0
                          ? '#f59e0b'
                          : colors.grid
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
