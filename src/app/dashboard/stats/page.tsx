'use client'

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock3, Dumbbell } from "lucide-react";
import { WeeklyVolumeChart, WeeklyVolumeData } from "@/app/components/dashboard/WeeklyVolumeChart";
import { ExerciseProgressChart, ExerciseProgressData } from "@/app/components/dashboard/ExerciseProgressChart";
import { WorkoutHeatmap, HeatmapData } from "@/app/components/dashboard/WorkoutHeatmap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
  buildExerciseProgressionFromSets,
  buildWeeklyVolumeFromSets,
  type WorkoutSetRow,
} from "@/features/workouts/statsUtils";
import { formatDuration } from "@/features/workouts/workoutUtils";
import Link from "next/link";
import { WeightTrendChart } from "@/features/routine/WeightTrendChart";
import { HabitConsistencyChart } from "@/features/routine/HabitConsistencyChart";
import { buildPeriodReport, readHabitLogs, readHabits } from "@/features/routine/habitStore";
import { readWeightLogs, type WeightEntry } from "@/features/routine/weightStore";

type SessionRow = {
  id: string;
  workout_name: string;
  duration_seconds: number;
  started_at: string;
};

export default function StatsPage() {
  const supabase = createClient();

  const [weeklyData, setWeeklyData] = useState<WeeklyVolumeData[]>([]);
  const [exerciseProgressData, setExerciseProgressData] = useState<ExerciseProgressData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionRow[]>([]);
  const [rawSets, setRawSets] = useState<WorkoutSetRow[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>(() => readWeightLogs());

  const [distinctExercises, setDistinctExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialStats = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const [setsRes, sessionsRes, legacyExercisesRes, volumeRes, heatmapRes] = await Promise.all([
          supabase
            .from('workout_sets')
            .select('exercise_name, reps, weight_kg, completed_at')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: true }),
          supabase
            .from('workout_sessions')
            .select('id, workout_name, duration_seconds, started_at')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(8),
          supabase.from('exercise_logs').select('exercise_name').eq('user_id', user.id),
          supabase.rpc('get_weekly_volume_trend'),
          supabase.rpc('get_workout_heatmap_data', {
            start_date: new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
          }),
        ]);

        const fetchedSets = (setsRes.data ?? []) as WorkoutSetRow[];
        setRawSets(fetchedSets);
        setRecentSessions((sessionsRes.data ?? []) as SessionRow[]);
        setWeightLogs(readWeightLogs());

        const setNames = fetchedSets.map(s => s.exercise_name);
        const legacyNames = (legacyExercisesRes.data ?? []).map(e => e.exercise_name);
        const uniqueNames = [...new Set([...setNames, ...legacyNames])];
        setDistinctExercises(uniqueNames);
        if (uniqueNames.length > 0) {
          setSelectedExercise(current => current || uniqueNames[0]);
        }

        const setsVolume = buildWeeklyVolumeFromSets(fetchedSets);
        const rpcVolume = (volumeRes.data as WeeklyVolumeData[] | null) ?? [];
        setWeeklyData(setsVolume.length > 0 ? setsVolume : rpcVolume);

        if (heatmapRes.data) {
          setHeatmapData(heatmapRes.data as HeatmapData[]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInitialStats();
  }, [supabase]);

  useEffect(() => {
    if (!selectedExercise) return;

    const fromNewSets = buildExerciseProgressionFromSets(rawSets, selectedExercise);
    if (fromNewSets.length > 0) {
      setExerciseProgressData(fromNewSets);
      return;
    }

    const fetchLegacyProgress = async () => {
      setExerciseProgressData([]);
      const { data, error } = await supabase.rpc('get_exercise_progression', { p_exercise_name: selectedExercise });
      if (!error && data) {
        setExerciseProgressData(data as ExerciseProgressData[]);
      }
    };
    void fetchLegacyProgress();
  }, [rawSets, selectedExercise, supabase]);

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">Caricamento statistiche...</div>;
  }

  const hasData = weeklyData.length > 0 || heatmapData.length > 0 || recentSessions.length > 0 || weightLogs.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-xl font-bold tracking-tight md:text-2xl">Statistiche & Storico</h1>

      {!hasData ? (
        <Card className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-8 shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-lg font-bold tracking-tight">Nessun dato da mostrare</h3>
            <p className="text-sm text-muted-foreground">Completa un allenamento o una corsa per vedere volumi e progressioni.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5 lg:col-span-1">
            {weeklyData.length > 0 && <WeeklyVolumeChart data={weeklyData} />}

            {recentSessions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Dumbbell className="size-4 text-primary" />
                    Storico sessioni recenti
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentSessions.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.workout_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.started_at).toLocaleDateString('it-IT', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {formatDuration(item.duration_seconds || 0)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-5 lg:col-span-1">
            {distinctExercises.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:gap-4 sm:space-y-0">
                    <Label htmlFor="exercise-select" className="shrink-0">Progressione esercizio:</Label>
                    <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                      <SelectTrigger id="exercise-select" className="w-full sm:w-[260px]">
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
                    <ExerciseProgressChart data={exerciseProgressData} exerciseName={selectedExercise} />
                  ) : (
                    <div className="flex h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
                      <p>Nessun dato di progressione per questo esercizio.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {heatmapData.length > 0 && <WorkoutHeatmap data={heatmapData} />}

            {weightLogs.length > 0 && <WeightTrendChart entries={weightLogs} />}

            {(() => {
              const yearReport = buildPeriodReport(readHabitLogs(), readHabits(), 'year')
              return (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Routine {yearReport.periodLabel}</CardTitle>
                      <Link
                        href="/dashboard/routine"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Report dettagliato →
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <HabitConsistencyChart data={yearReport.chartSeries} period="year" />
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
