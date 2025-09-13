'use client'

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";

import { WeeklyVolumeChart, WeeklyVolumeData } from "@/app/components/dashboard/WeeklyVolumeChart";
import { ExerciseProgressChart, ExerciseProgressData } from "@/app/components/dashboard/ExerciseProgressChart";
import { WorkoutHeatmap, HeatmapData } from "@/app/components/dashboard/WorkoutHeatmap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function StatsPage() {
  const supabase = createClient();
  const { resolvedTheme } = useTheme(); // Usiamo resolvedTheme per gestire il tema "system"

  // Stati per i dati di ogni grafico
  const [weeklyData, setWeeklyData] = useState<WeeklyVolumeData[]>([]);
  const [exerciseProgressData, setExerciseProgressData] = useState<ExerciseProgressData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  
  // Stati per la gestione della UI
  const [distinctExercises, setDistinctExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Colori per i grafici, calcolati in base al tema
  const chartColors = {
    light: { bar: "#2563eb", line: "#2563eb", grid: "#e5e7eb", text: "#6b7280", tooltipBg: "#ffffff", tooltipBorder: "#e5e7eb", tooltipText: "#030712" },
    dark: { bar: "#3b82f6", line: "#3b82f6", grid: "#2727a", text: "#a1a1aa", tooltipBg: "#09090b", tooltipBorder: "#2727a", tooltipText: "#f8fafc" }
  };
  const currentColors = resolvedTheme === 'dark' ? chartColors.dark : chartColors.light;

  useEffect(() => {
    const fetchInitialStats = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      
      const [exercisesRes, volumeRes, heatmapRes] = await Promise.all([
        supabase.from('exercise_logs').select('exercise_name', { count: 'exact' }).eq('user_id', user.id),
        supabase.rpc('get_weekly_volume_trend'),
        supabase.rpc('get_workout_heatmap_data', { 
          start_date: new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        }),
      ]);

      if (exercisesRes.data) {
        const uniqueNames = [...new Set(exercisesRes.data.map(e => e.exercise_name))];
        setDistinctExercises(uniqueNames);
        if (uniqueNames.length > 0 && selectedExercise === '') {
          setSelectedExercise(uniqueNames[0]);
        }
      }

      if (volumeRes.data) {
        const data = volumeRes.data as WeeklyVolumeData[];
        setWeeklyData(data);
      }
      
      if (heatmapRes.data) {
        setHeatmapData(heatmapRes.data as HeatmapData[]);
      }
      
      setIsLoading(false);
    };
    
    fetchInitialStats();
  }, [supabase]);
  
  useEffect(() => {
    if (!selectedExercise) return;
    
    const fetchExerciseProgress = async () => {
      setExerciseProgressData([]);
      const { data, error } = await supabase.rpc('get_exercise_progression', { p_exercise_name: selectedExercise });
      if (error) {
        console.error(`Errore nel recupero della progressione per ${selectedExercise}:`, error);
      } else if (data) {
        setExerciseProgressData(data as ExerciseProgressData[]);
      }
    };
    fetchExerciseProgress();
  }, [selectedExercise, supabase]);

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center">Caricamento statistiche...</div>;
  }

  const hasData = weeklyData.length > 0 || heatmapData.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-lg font-semibold md:text-2xl">Le Tue Statistiche di Allenamento</h1>
      
      {!hasData ? (
        <Card className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
            <div className="flex flex-col items-center gap-2 text-center">
                <h3 className="text-2xl font-bold tracking-tight">Nessun dato da mostrare</h3>
                <p className="text-sm text-muted-foreground">Completa qualche allenamento per iniziare a vedere le tue statistiche.</p>
            </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonna Sinistra (o prima su mobile) */}
          <div className="lg:col-span-1">
            {weeklyData.length > 0 && <WeeklyVolumeChart data={weeklyData} colors={currentColors} />}
          </div>
          
          {/* Colonna Destra (o seconda su mobile) */}
          <div className="space-y-6 lg:col-span-1">
            {distinctExercises.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 space-y-2 sm:space-y-0">
                    <Label htmlFor="exercise-select" className="shrink-0">Mostra progressione per:</Label>
                    <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                      <SelectTrigger id="exercise-select" className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Seleziona un esercizio..." />
                      </SelectTrigger>
                      <SelectContent>
                        {distinctExercises.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {exerciseProgressData.length > 0 ? (
                    <ExerciseProgressChart data={exerciseProgressData} exerciseName={selectedExercise} colors={currentColors} />
                  ) : (
                    <div className="text-sm text-center text-muted-foreground h-[350px] flex items-center justify-center">
                      <p>Nessun dato di progressione per questo esercizio.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {heatmapData.length > 0 && <WorkoutHeatmap data={heatmapData} />}
          </div>
        </div>
      )}
    </div>
  );
}