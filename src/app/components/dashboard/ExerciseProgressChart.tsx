'use client'

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useTheme } from 'next-themes'
import { chartColors } from '@/config/chartColors'

export interface ExerciseProgressData {
  completed_date: string
  max_weight: number
}

interface ExerciseProgressChartProps {
  data: ExerciseProgressData[]
  exerciseName: string
}

function formatDateShort(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

export function ExerciseProgressChart({ data, exerciseName }: ExerciseProgressChartProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { resolvedTheme } = useTheme()
  const colors = resolvedTheme === 'light' ? chartColors.light : chartColors.dark

  const chartSeries = data.map(item => ({
    ...item,
    dateLabel: formatDateShort(item.completed_date),
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/35 px-2.5 py-1 text-[11px] dark:bg-[#111f2c]/70">
        <span className="truncate font-semibold text-foreground">{exerciseName}</span>
        <span className="shrink-0 font-mono text-primary">
          {chartSeries.length} {chartSeries.length === 1 ? 'sessione' : 'giorni'}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          key={exerciseName}
          data={chartSeries}
          margin={{ top: 8, right: isMobile ? 8 : 20, bottom: isMobile ? 16 : 5, left: -16 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="dateLabel"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            stroke={colors.text}
          />
          <YAxis
            unit=" kg"
            width={56}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            stroke={colors.text}
            domain={['dataMin - 2', 'dataMax + 2']}
          />
          <Tooltip
            cursor={{ stroke: colors.line, strokeWidth: 1.5, strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              borderColor: colors.tooltipBorder,
              color: colors.tooltipText,
              borderRadius: '12px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value.toLocaleString('it-IT')} kg`, 'Peso Massimo']}
            labelFormatter={label => `Data: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="max_weight"
            isAnimationActive={false}
            stroke={colors.line}
            strokeWidth={2.5}
            dot={{ r: 5, fill: colors.line, strokeWidth: 2, stroke: colors.tooltipBg }}
            activeDot={{ r: 7, stroke: colors.line, fill: colors.tooltipBg }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
