'use client'

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTheme } from "next-themes"
import { chartColors } from "@/config/chartColors"

export interface ExerciseProgressData {
  completed_date: string;
  max_weight: number;
}


interface ExerciseProgressChartProps {
  data: ExerciseProgressData[];
  exerciseName: string;
}

export function ExerciseProgressChart({ data, exerciseName }: ExerciseProgressChartProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { theme } = useTheme();
  const colors = theme === "dark" ? chartColors.dark : chartColors.light;


  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart 
        data={data} 
        margin={{ top: 5, right: isMobile ? 5 : 20, bottom: isMobile ? 25 : 5, left: -20 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
        <XAxis 
          dataKey="completed_date" 
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
          />
        )}
        <Tooltip
          cursor={{ stroke: colors.line, strokeWidth: 1.5, strokeDasharray: '3 3' }}
          contentStyle={{
            backgroundColor: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            color: colors.tooltipText,
            borderRadius: 'var(--radius)',
          }}
          formatter={(value: number) => [`${value.toLocaleString()} kg`, "Peso Massimo"]}
          labelFormatter={(label) => `Data: ${label}`}
        />
        <Line 
          type="monotone" 
          dataKey="max_weight" 
          stroke={colors.line}
          strokeWidth={2} 
          dot={{ r: 4, fill: colors.line }}
          activeDot={{ r: 8, stroke: colors.line, fill: colors.tooltipBg }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}