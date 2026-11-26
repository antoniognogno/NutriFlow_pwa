// src/app/components/dashboard/WaterLogChart.tsx
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";
import { chartColors } from "@/config/chartColors";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { buildHourlyWaterChartData, readCachedWaterState } from "@/features/nutrition/waterOfflineCache";

export interface WaterChartData {
  time: string;
  ml: number;
}

const waterDataFetcher = async (): Promise<WaterChartData[]> => {
    const cached = readCachedWaterState();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return buildHourlyWaterChartData(cached.logs, 6, 23);
    }
    const supabase = createClient();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const { data, error } = await supabase
        .from('water_logs')
        .select('amount_ml, created_at')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());
    if (error || !data) {
        return buildHourlyWaterChartData(cached.logs, 6, 23);
    }

    return buildHourlyWaterChartData(data, 6, 23);
};

export function WaterLogChart() {
  const { data, error, mutate } = useSWR('water_log_today', waterDataFetcher, {
    // Aggiungiamo un refresh automatico ogni 60 secondi
    refreshInterval: 60000 
  });
  
  const isMobile = useMediaQuery("(max-width: 640px)");
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const refreshChart = () => {
      void mutate();
    };
    window.addEventListener('nutriflow:data-updated', refreshChart);
    return () => window.removeEventListener('nutriflow:data-updated', refreshChart);
  }, [mutate]);

  const colors = theme === "dark" ? chartColors.dark : chartColors.light;
  
  const filteredData = useMemo(() => {
      return data?.filter(item => item.ml > 0) || [];
  }, [data]);

  // <<< CORREZIONE: Definiamo il componente Tooltip completo qui
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg border bg-background p-2 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-1">
            <p className="text-sm font-bold text-foreground">{label}</p>
            <p className="text-sm text-primary">
              <span className="font-semibold text-muted-foreground">Consumati:</span> {payload[0].value.toLocaleString('it-IT')} ml
            </p>
          </div>
        </div>
      );
    }
    return null;
  };
  
  if (error) return <div className="flex h-full w-full items-center justify-center rounded-lg border bg-muted/50 p-4"><p className="text-destructive">Impossibile caricare i dati del grafico.</p></div>;
  if (!isMounted) return null; // Gestito dallo Skeleton della pagina padre

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consumazioni Orarie</CardTitle>
        <CardDescription>Un riepilogo di quando hai bevuto oggi.</CardDescription>
      </CardHeader>
      <CardContent className="pl-0 sm:pl-2">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
            <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} stroke={colors.text} dy={10} />
            {/* <<< CORREZIONE: Non passiamo più props al tooltip, si prende i colori dal contesto */}
            <Tooltip
              cursor={{ fill: colors.tooltipBg, opacity: 0.5 }}
              content={<CustomTooltip />}
            />
            <Bar dataKey="ml" fill={colors.bar} radius={[4, 4, 0, 0]} barSize={isMobile ? 15 : 25} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}