'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartBucket, ReportPeriod } from './habitStore'

interface HabitConsistencyChartProps {
  data: ChartBucket[]
  period: ReportPeriod
}

export function HabitConsistencyChart({ data, period }: HabitConsistencyChartProps) {
  if (data.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">
        {period === 'week'
          ? 'Andamento giornaliero (Lun–Dom)'
          : period === 'month'
            ? 'Andamento settimanale nel mese'
            : 'Andamento mensile nell’anno'}
      </p>
      <div className="h-[175px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#263845" />
            <XAxis
              dataKey="label"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              stroke="#91a2ae"
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              unit="%"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              stroke="#91a2ae"
            />
            <Tooltip
              cursor={{ fill: 'rgba(122, 166, 189, 0.08)' }}
              contentStyle={{
                backgroundColor: '#0d1722',
                borderColor: '#263845',
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
                      ? '#34d399'
                      : entry.pct >= 40
                        ? '#7aa6bd'
                        : entry.pct > 0
                          ? '#f59e0b'
                          : '#263845'
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
