'use client'

import HeatMap from '@uiw/react-heat-map'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface HeatmapData {
  date: string
  count: number
}

interface WorkoutHeatmapProps {
  data: HeatmapData[]
}

export function WorkoutHeatmap({ data }: WorkoutHeatmapProps) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 5)

  const formattedData = data.map(item => ({ ...item, date: item.date.replace(/-/g, '/') }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consistenza Allenamenti</CardTitle>
        <CardDescription>
          Una panoramica dei tuoi giorni di allenamento negli ultimi mesi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2 -ml-2">
          <HeatMap
            value={formattedData}
            startDate={startDate}
            style={{ color: isLight ? '#607080' : '#91a2ae' }}
            panelColors={{
              0: isLight ? '#e2e8f0' : '#162433',
              1: isLight ? '#267491' : '#34d399',
              2: isLight ? '#1d5b73' : '#10b981',
            }}
            rectProps={{ rx: 3 }}
            legendCellSize={0}
          />
        </div>
      </CardContent>
    </Card>
  )
}
