'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, ChevronRight, Dumbbell, History, LineChart, PauseCircle, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { focusAndScrollToElement } from "@/lib/focusScroll";
import { PlanWithWorkoutsAndExercises } from "@/lib/supabase/types";
import WorkoutSelector from "@/app/components/dashboard/gym/WorkoutSelector";
import { NewPlanDialog } from "@/app/components/dashboard/gym/NewPlanDialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuickCardioCard } from "@/features/workouts/QuickCardioCard";
import type { DefaultWorkout } from "@/features/workouts/defaultWorkouts";
import {
  CURATED_EXERCISE_OPTIONS,
  hasExercisePhotoMatch,
} from "@/features/workouts/exerciseGuide";
import {
  createWorkoutPreset,
  readWorkoutPresets,
  saveWorkoutPresets,
  updateWorkoutPresetData,
} from "@/features/workouts/presetStorage";
import {
  readStandbyWorkouts,
  removeStandbyWorkout,
  type StandbyWorkoutEntry,
} from "@/features/workouts/workoutStandby";
import { isCardioSession } from "@/features/workouts/workoutUtils";
import { moveToTrash, readTrashItems } from "@/features/trash/trashStore";

type GymTab = 'allenamento' | 'corsa';

export default function GymPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<GymTab>('allenamento');
  const [plans, setPlans] = useState<PlanWithWorkoutsAndExercises[]>([]);
  const [counts, setCounts] = useState({ cardio: 0, workouts: 0 });
  const [workoutPresets, setWorkoutPresets] = useState<DefaultWorkout[]>(() => readWorkoutPresets());
  const [standbyWorkouts, setStandbyWorkouts] = useState<StandbyWorkoutEntry[]>(() => readStandbyWorkouts());
  const [trashCount, setTrashCount] = useState<number>(() => readTrashItems().length);

  const [showPresetForm, setShowPresetForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<DefaultWorkout | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetExercises, setPresetExercises] = useState('');
  const presetNameInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);

  const syncLocalLists = useCallback(() => {
    setWorkoutPresets(readWorkoutPresets());
    setStandbyWorkouts(readStandbyWorkouts());
    setTrashCount(readTrashItems().length);
  }, []);

  const handleDiscardStandby = async (entry: StandbyWorkoutEntry) => {
    localStorage.removeItem(`lifeflow:active-workout:${entry.workoutId}`);
    localStorage.removeItem(`lifeflow:workout-sets:${entry.workoutId}`);
    removeStandbyWorkout(entry.workoutId);
    setStandbyWorkouts(readStandbyWorkouts());
    if (entry.sessionId) {
      await supabase.from('workout_sessions').delete().eq('id', entry.sessionId).is('ended_at', null);
    }
    toast.info(`Stand-by "${entry.workoutName}" annullato.`);
  };

  const appendSuggestedExercise = (exerciseLabel: string) => {
    const current = presetExercises
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (current.some(item => item.toLowerCase() === exerciseLabel.toLowerCase())) return;
    setPresetExercises([...current, exerciseLabel].join(', '));
  };

  const fetchGymData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        router.push('/login');
        return;
      }

      const [plansRes, sessionsRes] = await Promise.all([
        supabase
          .from('workout_plans')
          .select(`*, workouts(*, workout_exercises(*))`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('workout_sessions')
          .select('workout_id, workout_name')
          .eq('user_id', user.id),
      ]);

      if (!plansRes.error && plansRes.data) {
        setPlans(plansRes.data);
      }
      if (!sessionsRes.error && sessionsRes.data) {
        let cardio = 0;
        let workouts = 0;
        for (const item of sessionsRes.data) {
          if (isCardioSession(item)) cardio += 1;
          else workouts += 1;
        }
        setCounts({ cardio, workouts });
      }
    } catch (error) {
      console.error("Errore caricamento palestra:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void fetchGymData();
    const refresh = () => {
      syncLocalLists();
      void fetchGymData();
    };
    window.addEventListener('nutriflow:data-updated', refresh);
    return () => window.removeEventListener('nutriflow:data-updated', refresh);
  }, [fetchGymData, syncLocalLists]);

  const openCreatePreset = () => {
    const next = !showPresetForm || editingPreset !== null;
    setEditingPreset(null);
    setPresetName('');
    setPresetExercises('');
    setShowPresetForm(next);
    if (next) setTimeout(() => focusAndScrollToElement(presetNameInputRef.current), 20);
  };

  const openEditPreset = (preset: DefaultWorkout) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPresetExercises(preset.workout_exercises.map(ex => ex.exercise_name).join(', '));
    setShowPresetForm(true);
    setTimeout(() => focusAndScrollToElement(presetNameInputRef.current), 20);
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const exercisesList = presetExercises.split(',').map(item => item.trim()).filter(Boolean);
    if (!presetName.trim() || exercisesList.length === 0) {
      toast.error('Inserisci un nome e almeno un esercizio separato da virgola.');
      return;
    }

    if (editingPreset) {
      const updatedItem = updateWorkoutPresetData(editingPreset, presetName, exercisesList);
      const updated = workoutPresets.map(item => (item.id === editingPreset.id ? updatedItem : item));
      setWorkoutPresets(updated);
      saveWorkoutPresets(updated);
      toast.success(`Preset "${updatedItem.name}" aggiornato.`);
    } else {
      const created = createWorkoutPreset(presetName, exercisesList);
      const updated = [created, ...workoutPresets];
      setWorkoutPresets(updated);
      saveWorkoutPresets(updated);
      toast.success(`Preset "${created.name}" pronto all'uso.`);
    }

    setEditingPreset(null);
    setPresetName('');
    setPresetExercises('');
    setShowPresetForm(false);
  };

  const handleTrashPreset = (preset: DefaultWorkout) => {
    const updated = workoutPresets.filter(item => item.id !== preset.id);
    setWorkoutPresets(updated);
    saveWorkoutPresets(updated);
    moveToTrash({
      id: `workout_preset:${preset.id}`,
      kind: 'workout_preset',
      title: preset.name,
      subtitle: preset.subtitle,
      preset,
    });
    setTrashCount(readTrashItems().length);
    toast.success(`"${preset.name}" spostato nel cestino (30 giorni).`);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          {tab === 'allenamento' ? 'Allenamento' : 'Corsa & Storico'}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-xl" asChild>
            <Link href="/dashboard/stats">
              <LineChart className="mr-1.5 size-4" />
              Stats
            </Link>
          </Button>
          {tab === 'allenamento' && <NewPlanDialog mode="create" onSaveSuccess={fetchGymData} />}
        </div>
      </div>

      {/* Solo 2 tab in alto: Allenamento | Corsa */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-card/70 p-1">
        {([
          { id: 'allenamento', label: 'Allenamento' },
          { id: 'corsa', label: 'Corsa' },
        ] as const).map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`h-9 rounded-xl px-3 text-xs font-semibold transition-colors ${
              tab === item.id
                ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(122,166,189,0.25)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'allenamento' && (
        <div className="space-y-5">
          {standbyWorkouts.length > 0 && (
            <section aria-label="Schede in stand-by" className="space-y-2">
              {standbyWorkouts.map(item => (
                <Card key={item.workoutId} className="overflow-hidden border-amber-500/40 bg-amber-500/10">
                  <CardContent className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PauseCircle className="size-5 shrink-0 text-amber-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.workoutName}</p>
                        <p className="text-xs text-muted-foreground">
                          In stand-by · {item.completedSets} serie completate
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 min-w-0 rounded-xl px-2.5 text-xs text-red-400 hover:bg-red-500/15 hover:text-red-300"
                        onClick={() => void handleDiscardStandby(item)}
                      >
                        <X className="mr-1 size-3.5 shrink-0" />
                        Annulla
                      </Button>
                      <Button size="sm" className="h-9 min-w-0 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500" asChild>
                        <Link href={`/dashboard/gym/${item.workoutId}`}>
                          <Play className="mr-1 size-3.5 shrink-0" />
                          Riprendi
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}

          {/* 1. Schede personalizzate dell'utente PRIMA */}
          <section aria-labelledby="db-plans-heading" className="space-y-2.5">
            <h2 id="db-plans-heading" className="text-sm font-semibold text-muted-foreground">
              Le mie schede personalizzate
            </h2>
            {isLoading ? (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                Caricamento schede personalizzate...
              </div>
            ) : plans.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed p-5 shadow-sm">
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-semibold">Nessuna scheda personalizzata</p>
                  <p className="text-xs text-muted-foreground">
                    Puoi crearne una completa oppure avviare subito un preset veloce qui sotto.
                  </p>
                  <div className="mt-1">
                    <NewPlanDialog mode="create" onSaveSuccess={fetchGymData} />
                  </div>
                </div>
              </div>
            ) : (
              <Accordion type="single" collapsible defaultValue={plans[0]?.id} className="w-full space-y-3">
                {plans.map((plan) => (
                  <AccordionItem value={plan.id} key={plan.id} className="overflow-hidden rounded-xl border bg-card">
                    <AccordionTrigger className="px-4 py-3.5 text-base font-semibold hover:no-underline">
                      <div className="flex w-full flex-col text-left sm:flex-row sm:items-center sm:justify-between">
                        <span>{plan.name}</span>
                        <span className="mt-0.5 text-xs font-normal text-muted-foreground sm:mt-0">
                          {new Date(plan.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                      <WorkoutSelector
                        plan={plan}
                        onDeleteSuccess={fetchGymData}
                        editComponent={
                          <NewPlanDialog mode="edit" planToEdit={plan} onSaveSuccess={fetchGymData} />
                        }
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </section>

          {/* 2. Preset veloci DOPO */}
          <section aria-labelledby="default-workouts-heading" className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 id="default-workouts-heading" className="text-sm font-semibold text-muted-foreground">
                Preset veloci (1 tap)
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2.5 text-xs text-emerald-400 hover:bg-emerald-500/20"
                onClick={openCreatePreset}
              >
                <Plus className="mr-1 size-3.5" />
                Nuovo preset
              </Button>
            </div>

            {showPresetForm && (
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {editingPreset ? `Modifica "${editingPreset.name}"` : 'Crea preset allenamento rapido'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Separa gli esercizi con una virgola (es. Panca Piana, Trazioni, Squat)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSavePreset} className="space-y-2.5">
                    <Input
                      ref={presetNameInputRef}
                      placeholder="Nome preset (es. Upper Rapido)"
                      value={presetName}
                      onChange={e => setPresetName(e.target.value)}
                      className="h-10"
                      required
                    />
                    <Input
                      placeholder="Esercizi: Panca Piana, Rematore, Alzate Laterali"
                      value={presetExercises}
                      onChange={e => setPresetExercises(e.target.value)}
                      className="h-10"
                      required
                    />
                    <div className="space-y-1.5 rounded-xl border border-slate-300 bg-slate-100 p-2.5 dark:bg-slate-200/95">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-900">
                        <span className="flex items-center gap-1">
                          <Camera className="size-3.5 text-emerald-800" />
                          Suggerimenti con foto (tocca per aggiungere)
                        </span>
                        {presetExercises.trim() && (() => {
                          const items = presetExercises.split(',').map(s => s.trim()).filter(Boolean)
                          const matched = items.filter(name => hasExercisePhotoMatch(name)).length
                          return <span className="font-mono text-emerald-900">{matched}/{items.length} Foto OK</span>
                        })()}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CURATED_EXERCISE_OPTIONS.slice(0, 10).map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => appendSuggestedExercise(opt.label)}
                            className="rounded-full border border-emerald-500/60 bg-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-emerald-300"
                          >
                            + {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 flex-1"
                        onClick={() => {
                          setShowPresetForm(false);
                          setEditingPreset(null);
                        }}
                      >
                        Annulla
                      </Button>
                      <Button type="submit" size="sm" className="h-10 flex-1 bg-emerald-600 text-white hover:bg-emerald-500">
                        {editingPreset ? 'Aggiorna preset' : 'Salva preset'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {workoutPresets.map(workout => (
                <Card key={workout.id} className="border-primary/20">
                  <CardContent className="flex items-center justify-between gap-2 p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        <Dumbbell className="size-4 shrink-0 text-primary" />
                        {workout.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{workout.subtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-xl text-primary hover:bg-primary/15"
                        aria-label={`Modifica preset ${workout.name}`}
                        onClick={() => openEditPreset(workout)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-xl text-amber-400/80 hover:bg-amber-500/15 hover:text-amber-400"
                        aria-label={`Sposta ${workout.name} nel cestino`}
                        onClick={() => handleTrashPreset(workout)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                      <Button size="icon" className="size-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500" asChild>
                        <Link href={`/dashboard/gym/${workout.id}`} aria-label={`Avvia ${workout.name}`}>
                          <Play className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'corsa' && (
        <div className="space-y-4">
          <QuickCardioCard onTrashChange={syncLocalLists} />
        </div>
      )}

      {/* Pulsante Storico allenamenti raggiungibile facilmente */}
      <Link href="/dashboard/gym/history" className="block">
        <Card className="border-border/70 transition-colors active:scale-[0.99] hover:border-primary/40">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <History className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Storico allenamenti</p>
                <p className="text-xs text-muted-foreground">
                  {counts.workouts} schede · {counts.cardio} corse
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Cestino spostato in fondo alla pagina in arancione */}
      <Link href="/dashboard/gym/trash" className="block pt-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-400 transition-colors active:scale-[0.99] hover:bg-amber-500/20">
          <div className="flex items-center gap-2.5">
            <Trash2 className="size-4 shrink-0" />
            <span className="text-sm font-semibold">Cestino (30 giorni)</span>
          </div>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300">
            {trashCount}
          </span>
        </div>
      </Link>
    </div>
  );
}
