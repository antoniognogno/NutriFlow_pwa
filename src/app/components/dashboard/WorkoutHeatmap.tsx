'use client'

// --- CORREZIONE QUI ---
import React from 'react';
import HeatMap from '@uiw/react-heat-map';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from 'next-themes';
// import { Tooltip } from 'recharts'; // RIMOSSO: Tooltip di Recharts non compatibile

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
  
  // Convertiamo i dati nel formato richiesto dalla libreria (YYYY/MM/DD)
  const formattedData = data.map(item => ({...item, date: item.date.replace(/-/g, '/')}));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consistenza Allenamenti</CardTitle>
        <CardDescription>
          Una panoramica dei tuoi giorni di allenamento negli ultimi mesi.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-4">
        <HeatMap
          value={formattedData}
          startDate={startDate}
          width={650}
          height={120}
          // Colori dinamici basati sul tema
          panelColors={{
            0: theme === 'dark' ? 'hsl(var(--muted) / 0.5)' : 'hsl(var(--muted))',
            1: 'hsl(var(--primary))',
          }}
          rectProps={{
            rx: 3, // Bordi arrotondati
          }}
          legendCellSize={0} // Nasconde la legenda
          // Aggiungiamo un tooltip personalizzato al passaggio del mouse
          rectRender={(props, data) => {
            const [show, setShow] = React.useState(false);
            if (!data.count) return <rect {...props} />;
            return (
              <g>
                <rect
                  {...props}
                  onMouseEnter={() => setShow(true)}
                  onMouseLeave={() => setShow(false)}
                />
                {show && (
                  <foreignObject x={props.x} y={typeof props.y === 'number' ? props.y - 40 : 0} width={100} height={40}>
                    <div
                      className="bg-popover text-popover-foreground text-xs p-2 rounded-md border"
                      style={{ pointerEvents: 'none' }}
                    >
                      {data.count} allenamento il {new Date(data.date).toLocaleDateString('it-IT')}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}