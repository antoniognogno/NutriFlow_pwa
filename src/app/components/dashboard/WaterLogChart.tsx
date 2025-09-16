// src/app/components/dashboard/WaterLogChart.tsx
'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { chartColors } from "@/config/chartColors";

export interface WaterChartData {
  time: string;
  ml: number;
}

interface WaterLogChartProps {
  data: WaterChartData[];
}


export function WaterLogChart({ data }: WaterLogChartProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Usa i colori universali
  const colors = theme === "dark" ? chartColors.dark : chartColors.light;

  // Componente Tooltip personalizzato per un controllo totale sullo stile
  const CustomTooltip = ({ active, payload, label, colors }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg border p-2 shadow-sm"
          style={{
            background: colors.tooltipBg,
            borderColor: colors.tooltipBorder,
            color: colors.tooltipText,
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          <div className="grid grid-cols-1 gap-1">
            <p className="text-sm font-bold" style={{ color: colors.tooltipText }}>{label}</p>
            <p className="text-sm" style={{ color: colors.bar }}>
              <span className="font-semibold" style={{ color: colors.tooltipText }}>Consumati:</span> {payload[0].value.toLocaleString('it-IT')} ml
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!isMounted) {
    // Questo evita il flash del grafico non stilizzato durante il caricamento del tema
    return (
      <div className="h-[362px] w-full flex items-center justify-center rounded-lg border">
        <p className="text-sm text-muted-foreground">Caricamento grafico...</p>
      </div>
    );
  }

  const filteredData = data.filter(item => item.ml > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consumazioni Orarie</CardTitle>
        <CardDescription>
          Un riepilogo di quando hai bevuto oggi.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-0 sm:pl-2">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={filteredData} 
            margin={{ top: 10, right: 10, bottom: 5, left: -20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
            <XAxis 
              dataKey="time" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              stroke={colors.text}
              dy={10}
            />
            <Tooltip
              cursor={{ fill: colors.tooltipBg, opacity: 0.5 }}
              content={<CustomTooltip colors={colors} />}
            />
            <Bar 
              dataKey="ml" 
              fill={colors.bar}
              radius={[4, 4, 0, 0]} 
              barSize={isMobile ? 15 : 25}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}