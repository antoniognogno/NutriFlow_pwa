'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTheme } from "next-themes"
import { chartColors } from "@/config/chartColors"

export interface WeeklyVolumeData {
  week_start: string;
  total_volume: number;
}

interface WeeklyVolumeChartProps {
  data: WeeklyVolumeData[];
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "light" ? chartColors.light : chartColors.dark;

  const maxVolume = Math.max(...data.map(item => item.total_volume));
  const yAxisDomain = [0, Math.ceil((maxVolume * 1.1) / 100) * 100];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume Totale Settimanale</CardTitle>
        <CardDescription>
          Il volume (Peso x Reps x Serie) nelle ultime 8 settimane.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={data} 
            margin={{ top: 5, right: isMobile ? 5 : 20, bottom: isMobile ? 25 : 5, left: -20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
            <XAxis 
              dataKey="week_start" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              stroke={colors.text}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 50 : 30}
            />
            {!isMobile && (
              <YAxis 
                unit=" kg" 
                width={80} 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                stroke={colors.text}
                domain={yAxisDomain}
                tickCount={6}
              />
            )}
            <Tooltip
              cursor={false} 
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                borderColor: colors.tooltipBorder,
                color: colors.tooltipText,
                borderRadius: 'var(--radius)',
              }}
              formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volume Totale"]}
            />
            <Bar 
              dataKey="total_volume" 
              fill={colors.bar}
              radius={[4, 4, 0, 0]} 
              barSize={isMobile ? 10 : 20}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}