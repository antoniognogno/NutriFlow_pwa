'use client'

import HeatMap from '@uiw/react-heat-map';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from 'next-themes';
import { Tooltip as ReactTooltip } from 'recharts';

export interface HeatmapData {
  date: string; // YYYY-MM-DD
  count: number;
}

interface WorkoutHeatmapProps {
  data: HeatmapData[];
}

export function WorkoutHeatmap({ data }: WorkoutHeatmapProps) {
  const { theme } = useTheme();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);
  
  const formattedData = data.map(item => ({...item, date: item.date.replace(/-/g, '/')}));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consistenza Allenamenti</CardTitle>
        <CardDescription>
          Una panoramica dei tuoi giorni di allenamento negli ultimi mesi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2 -ml-4">
          <HeatMap
            value={formattedData}
            startDate={startDate}
            panelColors={{
              0: theme === 'dark' ? 'hsl(var(--muted) / 0.5)' : 'hsl(var(--muted))',
              1: 'hsl(var(--primary))',
            }}
            rectProps={{ rx: 3 }}
            legendCellSize={0}
            // La libreria Tooltip di Recharts non funziona bene qui,
            // la libreria heatmap ha un suo tooltip di default (HTML title) che è sufficiente.
          />
        </div>
      </CardContent>
    </Card>
  );
}