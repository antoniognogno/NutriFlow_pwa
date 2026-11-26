'use client'

import { useTheme } from 'next-themes'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { chartColors } from '@/config/chartColors'
import { buildWeightChartSeries, type WeightEntry } from './weightStore'

interface WeightTrendChartProps {
  entries: WeightEntry[]
  targetWeightKg?: number | null
}

export function WeightTrendChart({ entries, targetWeightKg = null }: WeightTrendChartProps) {
  const { resolvedTheme } = useTheme()
  const colors = resolvedTheme === 'light' ? chartColors.light : chartColors.dark
  const series = buildWeightChartSeries(entries, 14)

  if (series.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-xs text-muted-foreground">
          Registra almeno un peso per vedere il grafico trend e la media mobile a 7 giorni.
        </CardContent>
      </Card>
    )
  }

  const values = series.flatMap(p => [p.weightKg, p.avg7d])
  if (targetWeightKg !== null) values.push(targetWeightKg)
  const minVal = Math.floor(Math.min(...values) - 1)
  const maxVal = Math.ceil(Math.max(...values) + 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Trend Peso & Media 7g</CardTitle>
        <CardDescription className="text-xs">
          Linea tratteggiata = peso giornaliero · Linea continua = media 7 giorni
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-0 sm:pl-2">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={series} margin={{ top: 10, right: 14, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
            <XAxis dataKey="dateLabel" fontSize={11} tickLine={false} axisLine={false} stroke={colors.text} />
            <YAxis domain={[minVal, maxVal]} fontSize={11} tickLine={false} axisLine={false} stroke={colors.text} />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                borderColor: colors.tooltipBorder,
                color: colors.tooltipText,
                borderRadius: '12px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="weightKg"
              name="Peso (kg)"
              stroke={colors.text}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: colors.text }}
            />
            <Line
              type="monotone"
              dataKey="avg7d"
              name="Media 7g (kg)"
              stroke={colors.lineAccent}
              strokeWidth={2.5}
              dot={false}
            />
            {targetWeightKg !== null && (
              <ReferenceLine
                y={targetWeightKg}
                stroke={colors.barAccent}
                strokeDasharray="6 4"
                label={{
                  value: `Obiettivo ${targetWeightKg}kg`,
                  position: 'insideTopRight',
                  fill: colors.barAccent,
                  fontSize: 10,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
