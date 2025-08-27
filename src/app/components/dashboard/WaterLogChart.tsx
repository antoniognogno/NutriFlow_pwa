'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Definiamo il tipo di dati che il nostro grafico si aspetta (invariato)
export interface ChartData {
  time: string; // Es: "09:30"
  ml: number;   // Es: 250
}

// Definiamo la configurazione del grafico, come nell'esempio
const chartConfig = {
  ml: {
    label: "ml",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface WaterLogChartProps {
  data: ChartData[];
}

export function WaterLogChart({ data }: WaterLogChartProps) {
  // Calcoliamo il totale per il footer del grafico
  const totalMl = data.reduce((total, item) => total + item.ml, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consumazioni della Giornata</CardTitle>
        <CardDescription>
          Un riepilogo di quando hai bevuto oggi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Usiamo il nuovo ChartContainer */}
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `${value}`} // Mostra l'orario completo
            />
            <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar 
              dataKey="ml" 
              fill="var(--color-ml)" // Usa il colore definito in chartConfig
              radius={4} 
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Hai bevuto un totale di {totalMl.toLocaleString()} ml oggi.
        </div>
        <div className="leading-none text-muted-foreground">
          Continua così per raggiungere il tuo obiettivo!
        </div>
      </CardFooter>
    </Card>
  )
}