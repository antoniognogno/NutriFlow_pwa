'use client'

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface ExerciseProgressData {
  completed_date: string;
  max_weight: number;
}

interface ExerciseProgressChartProps {
  data: ExerciseProgressData[];
  exerciseName: string;
  colors: { line: string; grid: string; text: string; /*...altri colori tooltip...*/ };
}

export function ExerciseProgressChart({ data, exerciseName, colors }: ExerciseProgressChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progressione: {exerciseName}</CardTitle>
        <CardDescription>
          Andamento del peso massimo sollevato nel tempo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
            <XAxis dataKey="completed_date" fontSize={12} tickLine={false} axisLine={false} stroke={colors.text} />
            <YAxis unit=" kg" width={80} fontSize={12} tickLine={false} axisLine={false} stroke={colors.text} />
            <Tooltip
              cursor={{ stroke: colors.line, strokeWidth: 2, strokeDasharray: '3 3' }}
              contentStyle={{ /* ... stili tooltip ... */ }}
              formatter={(value: number) => [`${value.toLocaleString()} kg`, "Peso Massimo"]}
            />
            <Line 
              type="monotone" 
              dataKey="max_weight" 
              stroke={colors.line} 
              strokeWidth={2} 
              dot={{ r: 4 }} 
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}