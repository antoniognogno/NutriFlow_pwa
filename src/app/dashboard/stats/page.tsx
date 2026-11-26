'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  History,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { offlineDatabase } from '@/features/offline/database'
import {
  WeeklyVolumeChart,
  type WeeklyVolumeData,
} from '@/app/components/dashboard/WeeklyVolumeChart'
import {
  ExerciseProgressChart,
  type ExerciseProgressData,
} from '@/app/components/dashboard/ExerciseProgressChart'
import { WorkoutHeatmap, type HeatmapData } from '@/app/components/dashboard/WorkoutHeatmap'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  buildExerciseProgressionFromSets,
  buildHeatmapFromSessions,
  buildPersonalRecords,
  buildStatsSummary,
  buildWeeklyVolumeFromSets,
  filterByRecentDays,
  type WorkoutSetRow,
} from '@/features/workouts/statsUtils'
import { formatDuration, isCardioSession } from '@/features/workouts/workoutUtils'
import {
  mergeRemoteAndCachedSessions,
  readCachedPerformance,
  readCachedSessions,
  readCachedSetsForSession,
} from '@/features/workouts/workoutOfflineCache'
import type { EditableSession } from '@/features/workouts/SessionEditor'
import { WeightTrendChart } from '@/features/routine/WeightTrendChart'
import { HabitConsistencyChart } from '@/features/routine/HabitConsistencyChart'
import { buildPeriodReport, readHabitLogs, readHabits } from '@/features/routine/habitStore'
import { readWeightLogs, type WeightEntry } from '@/features/routine/weightStore'

type PeriodOption = '4w' | '8w' | 'all'
type HistoryFilter = 'all' | 'strength' | 'cardio'

export default function StatsPage() {
  const supabase = createClient()

  const [period, setPeriod] = useState<PeriodOption>('8w')
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  const [sessions, setSessions] = useState<EditableSession[]>(() => readCachedSessions())
  const [rawSets, setRawSets] = useState<WorkoutSetRow[]>([])
  const [rpcVolume, setRpcVolume] = useState<WeeklyVolumeData[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>(() =>
    buildHeatmapFromSessions(readCachedSessions()),
  )
  const [exerciseProgressData, setExerciseProgressData] = useState<ExerciseProgressData[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>(() => readWeightLogs())
  const [distinctExercises, setDistinctExercises] = useState<string[]>(() =>
    Array.from(new Set(readCachedPerformance().map(p => p.exercise_name).filter(Boolean))),
  )
  const [selectedExercise, setSelectedExercise] = useState<string>(
    () => readCachedPerformance()[0]?.exercise_name ?? '',
  )
  const [isLoading, setIsLoading] = useState(() => readCachedSessions().length === 0)

  useEffect(() => {
    const fetchInitialStats = async () => {
      const localSessions = readCachedSessions()
      if (localSessions.length > 0) {
        setSessions(localSessions)
        setHeatmapData(buildHeatmapFromSessions(localSessions))
        setIsLoading(false)
      }

      if (!navigator.onLine) {
        setIsLoading(false)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) return

        const [setsRes, sessionsRes, legacyExercisesRes, volumeRes, heatmapRes, pendingOutbox] = await Promise.all([
          supabase
            .from('workout_sets')
            .select('session_id, exercise_name, reps, weight_kg, completed_at')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: true }),
          supabase
            .from('workout_sessions')
            .select('id, user_id, workout_id, workout_name, started_at, ended_at, duration_seconds')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(40),
          supabase.from('exercise_logs').select('exercise_name').eq('user_id', user.id),
          supabase.rpc('get_weekly_volume_trend'),
          supabase.rpc('get_workout_heatmap_data', {
            start_date: new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
          }),
          offlineDatabase.outbox.where('userId').equals(user.id).toArray(),
        ])

        const pendingSessionIds = new Set(
          pendingOutbox
            .filter(item => item.table === 'workout_sessions')
            .map(item => (item.payload as { id?: string }).id ?? '')
            .filter(Boolean),
        )

        const mergedSessions = sessionsRes.data
          ? mergeRemoteAndCachedSessions(
              sessionsRes.data as EditableSession[],
              readCachedSessions(),
              pendingSessionIds,
            )
          : readCachedSessions()

        setSessions(mergedSessions)

        const fetchedSets = (setsRes.data ?? []) as WorkoutSetRow[]
        setRawSets(fetchedSets)
        setWeightLogs(readWeightLogs())

        const cachedNames = readCachedPerformance().map(p => p.exercise_name)
        const setNames = fetchedSets.map(s => s.exercise_name)
        const legacyNames = (legacyExercisesRes.data ?? []).map(e => e.exercise_name)
        const uniqueNames = [...new Set([...setNames, ...cachedNames, ...legacyNames])].filter(Boolean)
        setDistinctExercises(uniqueNames)
        if (uniqueNames.length > 0) {
          setSelectedExercise(current => current || uniqueNames[0])
        }

        setRpcVolume((volumeRes.data as WeeklyVolumeData[] | null) ?? [])

        const rpcHeatmap = (heatmapRes.data as HeatmapData[] | null) ?? []
        const localHeatmap = buildHeatmapFromSessions(mergedSessions)
        setHeatmapData(rpcHeatmap.length > 0 ? rpcHeatmap : localHeatmap)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchInitialStats()
  }, [supabase])

  useEffect(() => {
    if (!selectedExercise) return

    const fromNewSets = buildExerciseProgressionFromSets(rawSets, selectedExercise)
    if (fromNewSets.length > 0) {
      setExerciseProgressData(fromNewSets)
      return
    }

    if (!navigator.onLine) {
      setExerciseProgressData([])
      return
    }

    const fetchLegacyProgress = async () => {
      setExerciseProgressData([])
      const { data, error } = await supabase.rpc('get_exercise_progression', {
        p_exercise_name: selectedExercise,
      })
      if (!error && data) {
        setExerciseProgressData(data as ExerciseProgressData[])
      }
    }
    void fetchLegacyProgress()
  }, [rawSets, selectedExercise, supabase])

  const windowDays = period === '4w' ? 28 : period === '8w' ? 56 : null

  const filteredSessions = useMemo(
    () => filterByRecentDays(sessions, s => s.started_at, windowDays),
    [sessions, windowDays],
  )
  const filteredSets = useMemo(
    () => filterByRecentDays(rawSets, s => s.completed_at, windowDays),
    [rawSets, windowDays],
  )

  const summary = useMemo(
    () => buildStatsSummary(filteredSessions, filteredSets),
    [filteredSessions, filteredSets],
  )

  const weeklyData = useMemo(() => {
    const maxWeeks = period === '4w' ? 4 : period === '8w' ? 8 : 16
    const fromSets = buildWeeklyVolumeFromSets(filteredSets, maxWeeks)
    return fromSets.length > 0 ? fromSets : rpcVolume.slice(-maxWeeks)
  }, [filteredSets, period, rpcVolume])

  const personalRecords = useMemo(
    () => buildPersonalRecords(rawSets, rawSets.length === 0 ? readCachedPerformance() : []),
    [rawSets],
  )

  const visibleHistorySessions = useMemo(() => {
    return filteredSessions
      .filter(item => {
        if (historyFilter === 'cardio') return isCardioSession(item)
        if (historyFilter === 'strength') return !isCardioSession(item)
        return true
      })
      .slice(0, 12)
  }, [filteredSessions, historyFilter])

  const setsBySessionId = useMemo(() => {
    const grouped = new Map<string, WorkoutSetRow[]>()
    for (const row of rawSets) {
      if (!row.session_id) continue
      const list = grouped.get(row.session_id) ?? []
      list.push(row)
      grouped.set(row.session_id, list)
    }
    return grouped
  }, [rawSets])

  const selectedPr = personalRecords.find(
    r => r.exerciseName.toLocaleLowerCase() === selectedExercise.toLocaleLowerCase(),
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
        Caricamento statistiche...
      </div>
    )
  }

  const hasData =
    weeklyData.length > 0 ||
    heatmapData.length > 0 ||
    sessions.length > 0 ||
    weightLogs.length > 0 ||
    personalRecords.length > 0

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5" data-tour="stats-overview">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Statistiche & Storico</h1>
          <p className="text-xs text-muted-foreground">
            Volumi, massimali stimati (Epley 1RM) e dettaglio di ogni sessione
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border/60 bg-card/70 p-0.5">
            {([
              { id: '4w', label: '4 sett' },
              { id: '8w', label: '8 sett' },
              { id: 'all', label: 'Tutto' },
            ] as const).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition-all active:scale-95 ${
                  period === opt.id
                    ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(122,166,189,0.25)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs" asChild>
            <Link href="/dashboard/gym/history">
              <History className="mr-1.5 size-3.5 text-sky-400" />
              Storico completo
            </Link>
          </Button>
        </div>
      </header>

      {!hasData ? (
        <Card className="flex flex-1 items-center justify-center rounded-2xl border border-dashed p-8 shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <Dumbbell className="size-8 text-primary/70" />
            <h3 className="text-lg font-bold tracking-tight">Nessun dato da mostrare</h3>
            <p className="text-sm text-muted-foreground">
              Completa un allenamento o una corsa per vedere volumi, PR e progressioni.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <section
            aria-label="Riepilogo metriche principali"
            data-tour="stats-kpis"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
          >
            <Card className="border-primary/25 bg-card dark:bg-gradient-to-br dark:from-[#0d1722] dark:to-primary/10">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Sessioni</span>
                  <Activity className="size-4 text-primary" />
                </div>
                <p className="mt-1.5 font-mono text-2xl font-bold text-foreground">{summary.totalSessions}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {summary.strengthSessions} pesi · {summary.cardioSessions} corse
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/25 bg-card dark:bg-gradient-to-br dark:from-[#0d1722] dark:to-emerald-500/10">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Volume</span>
                  <Flame className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="mt-1.5 font-mono text-2xl font-bold text-foreground">
                  {summary.totalVolumeKg >= 1000
                    ? `${(summary.totalVolumeKg / 1000).toFixed(1)}t`
                    : `${summary.totalVolumeKg}`}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {summary.totalSets} serie · {summary.totalReps} rep
                </p>
              </CardContent>
            </Card>

            <Card className="border-sky-500/25 bg-card dark:bg-gradient-to-br dark:from-[#0d1722] dark:to-sky-500/10">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tempo totale</span>
                  <Clock3 className="size-4 text-sky-600 dark:text-sky-400" />
                </div>
                <p className="mt-1.5 font-mono text-2xl font-bold text-foreground">
                  {formatDuration(summary.totalDurationSeconds)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Media {formatDuration(summary.avgDurationSeconds)}/sess.
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/25 bg-card dark:bg-gradient-to-br dark:from-[#0d1722] dark:to-amber-500/10">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Picco sett.</span>
                  <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="mt-1.5 font-mono text-2xl font-bold text-foreground">
                  {summary.bestWeekVolumeKg >= 1000
                    ? `${(summary.bestWeekVolumeKg / 1000).toFixed(1)}t`
                    : `${summary.bestWeekVolumeKg} kg`}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {personalRecords.length} esercizi tracciati
                </p>
              </CardContent>
            </Card>
          </section>

          {personalRecords.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
                      Record Personali (PR & Epley 1RM)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tocca un esercizio per vedere il grafico della progressione
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {personalRecords.slice(0, 6).map(pr => {
                  const isSelected =
                    pr.exerciseName.toLocaleLowerCase() === selectedExercise.toLocaleLowerCase()
                  return (
                    <button
                      key={pr.exerciseName}
                      type="button"
                      onClick={() => setSelectedExercise(pr.exerciseName)}
                      className={`nf-interactive flex items-center justify-between gap-2 rounded-xl border p-3 text-left ${
                        isSelected
                          ? 'border-primary/50 bg-primary/10 dark:bg-primary/15'
                          : 'border-border/60 bg-muted/40 hover:bg-muted/70 dark:bg-[#111f2c]/80 dark:hover:bg-[#162738]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{pr.exerciseName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Max {pr.bestWeightKg} kg × {pr.bestReps} rep
                          {pr.totalSets > 0 ? ` · ${pr.totalSets} serie` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg border border-amber-500/35 bg-amber-500/15 px-2 py-1 font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
                        ~{pr.best1RmKg} kg
                      </span>
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              {weeklyData.length > 0 && <WeeklyVolumeChart data={weeklyData} />}

              {visibleHistorySessions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Dumbbell className="size-4 text-primary" />
                        Storico sessioni dettagliato
                      </CardTitle>
                      <div className="inline-flex rounded-xl border border-border/60 bg-muted/40 p-0.5">
                        {([
                          { id: 'all', label: 'Tutte' },
                          { id: 'strength', label: 'Pesi' },
                          { id: 'cardio', label: 'Corsa' },
                        ] as const).map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setHistoryFilter(f.id)}
                            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                              historyFilter === f.id
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {visibleHistorySessions.map(item => {
                      const cardio = isCardioSession(item)
                      const isExpanded = expandedSessionId === item.id
                      const remoteSessionSets = setsBySessionId.get(item.id) ?? []
                      const cachedSessionSets =
                        remoteSessionSets.length > 0
                          ? remoteSessionSets
                          : readCachedSetsForSession(item.id)
                      const groupedExercises = new Map<string, { count: number; maxWeight: number; volume: number }>()
                      for (const s of cachedSessionSets) {
                        const prev = groupedExercises.get(s.exercise_name) ?? {
                          count: 0,
                          maxWeight: 0,
                          volume: 0,
                        }
                        prev.count += 1
                        prev.maxWeight = Math.max(prev.maxWeight, Number(s.weight_kg) || 0)
                        prev.volume += (Number(s.weight_kg) || 0) * (Number(s.reps) || 0)
                        groupedExercises.set(s.exercise_name, prev)
                      }

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border/60 bg-muted/40 transition-colors dark:bg-[#111f2c]/80"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSessionId(curr => (curr === item.id ? null : item.id))
                            }
                            className="nf-interactive flex w-full items-center justify-between gap-2.5 px-3 py-2.5 text-left"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                  cardio
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-primary/15 text-primary'
                                }`}
                              >
                                {cardio ? (
                                  <Footprints className="size-4" />
                                ) : (
                                  <Dumbbell className="size-4" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{item.workout_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(item.started_at).toLocaleDateString('it-IT', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: 'short',
                                  })}
                                  {groupedExercises.size > 0
                                    ? ` · ${groupedExercises.size} esercizi`
                                    : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock3 className="size-3.5" />
                                {formatDuration(item.duration_seconds || 0)}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="size-4 text-primary" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="nf-pop-enter space-y-2 border-t border-border/50 px-3 py-2.5 text-xs">
                              {groupedExercises.size > 0 ? (
                                <div className="space-y-1.5">
                                  {Array.from(groupedExercises.entries()).map(([name, info]) => (
                                    <div key={name} className="flex items-center justify-between gap-2">
                                      <span className="truncate font-medium">{name}</span>
                                      <span className="shrink-0 font-mono text-muted-foreground">
                                        {info.count} serie · max {info.maxWeight} kg
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground">
                                  {cardio
                                    ? 'Sessione cardio / corsa registrata.'
                                    : 'Nessun dettaglio serie locale per questa sessione.'}
                                </p>
                              )}
                              <div className="flex justify-end pt-1">
                                <Link
                                  href="/dashboard/gym/history"
                                  className="text-xs font-semibold text-primary hover:underline"
                                >
                                  Modifica nello storico →
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-5">
              {distinctExercises.length > 0 && (
                <Card>
                  <CardHeader className="space-y-3">
                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
                      <Label htmlFor="exercise-select" className="flex items-center gap-1.5 shrink-0 font-semibold">
                        <TrendingUp className="size-4 text-primary" />
                        Progressione esercizio
                      </Label>
                      <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                        <SelectTrigger id="exercise-select" className="w-full sm:w-[240px]">
                          <SelectValue placeholder="Seleziona un esercizio..." />
                        </SelectTrigger>
                        <SelectContent>
                          {distinctExercises.map(ex => (
                            <SelectItem key={ex} value={ex}>
                              {ex}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedPr && (
                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5 text-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Max carico</p>
                          <p className="font-mono text-sm font-bold">{selectedPr.bestWeightKg} kg</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">1RM Epley</p>
                          <p className="font-mono text-sm font-bold text-sky-400">~{selectedPr.best1RmKg} kg</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Volume tot.</p>
                          <p className="font-mono text-sm font-bold text-emerald-400">
                            {selectedPr.totalVolumeKg.toLocaleString('it-IT')} kg
                          </p>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {exerciseProgressData.length > 0 ? (
                      <ExerciseProgressChart data={exerciseProgressData} exerciseName={selectedExercise} />
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-center text-sm text-muted-foreground">
                        <p>Nessun dato storico multi-giorno per questo esercizio nel periodo.</p>
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
        </>
      )}
    </div>
  )
}
