'use client'

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Check, Clock3, Link2, PlusCircle, Trash2, Unlink2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExerciseNameField } from '@/features/workouts/ExerciseNameField'
import { readExerciseMeta, saveExerciseMeta } from '@/features/workouts/exerciseNotesStore'
import { findCachedPlan, upsertCachedPlan } from '@/features/workouts/workoutOfflineCache'
import { offlineDatabase } from '@/features/offline/database'
import { queueAndSync } from '@/features/offline/useOfflineSync'
import { createClient } from '@/lib/supabase/client'
import type { PlanWithWorkoutsAndExercises } from '@/lib/supabase/types'

interface ExerciseForm {
  id?: string
  exercise_name: string
  target_sets: string
  target_reps: string
  rir: string
  restSeconds: string
  supersetGroup: string
  note: string
}

interface WorkoutForm {
  id?: string
  name: string
  exercises: ExerciseForm[]
}

const QUICK_REST_OPTIONS = [60, 90, 120, 150] as const

const DEFAULT_CREATE_WORKOUTS: WorkoutForm[] = [
  {
    name: 'Spinta (Petto/Tricipiti/Spalle)',
    exercises: [
      { exercise_name: 'Panca Piana', target_sets: '4', target_reps: '8', rir: 'RIR 2', restSeconds: '150', supersetGroup: '', note: '' },
    ],
  },
  {
    name: 'Tirata (Schiena/Bicipiti)',
    exercises: [
      { exercise_name: 'Trazioni / Lat Machine', target_sets: '4', target_reps: '8', rir: 'RIR 2', restSeconds: '120', supersetGroup: '', note: '' },
    ],
  },
  {
    name: 'Gambe',
    exercises: [
      { exercise_name: 'Squat con Bilanciere', target_sets: '4', target_reps: '8', rir: 'RIR 2', restSeconds: '150', supersetGroup: '', note: '' },
    ],
  },
]

const EMPTY_EXERCISE: ExerciseForm = {
  exercise_name: '',
  target_sets: '3',
  target_reps: '10',
  rir: '',
  restSeconds: '',
  supersetGroup: '',
  note: '',
}

export default function PlanBuilderPage() {
  const { planId } = useParams<{ planId?: string }>()
  const isEditMode = Boolean(planId && planId !== 'new')
  const navigate = useNavigate()
  const supabase = createClient()

  const [planName, setPlanName] = useState('La mia scheda')
  const [workouts, setWorkouts] = useState<WorkoutForm[]>(() => DEFAULT_CREATE_WORKOUTS)
  const [originalWorkoutIds, setOriginalWorkoutIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isEditMode || !planId) return
    let active = true

    const applyPlanToForm = (plan: PlanWithWorkoutsAndExercises) => {
      setPlanName(plan.name)
      setOriginalWorkoutIds((plan.workouts ?? []).map(w => w.id))
      setWorkouts(
        (plan.workouts ?? []).map(w => ({
          id: w.id,
          name: w.name,
          exercises: [...(w.workout_exercises ?? [])]
            .sort((a, b) => a.order - b.order)
            .map(ex => {
              const meta = readExerciseMeta(ex.exercise_name)
              return {
                id: ex.id,
                exercise_name: ex.exercise_name,
                target_sets: String(ex.target_sets ?? 3),
                target_reps: String(ex.target_reps ?? '10'),
                rir: meta?.rir ?? '',
                restSeconds: meta?.restSeconds ? String(meta.restSeconds) : '',
                supersetGroup: meta?.supersetGroup ?? '',
                note: meta?.note ?? '',
              }
            }),
        })),
      )
    }

    const loadPlan = async () => {
      const cachedPlan = findCachedPlan(planId)
      if (cachedPlan && active) {
        applyPlanToForm(cachedPlan)
        setIsLoading(false)
      }

      if (!navigator.onLine) {
        if (!cachedPlan && active) {
          toast.error('Scheda non presente nella cache offline.')
          setIsLoading(false)
        }
        return
      }

      try {
        const pendingSync = await offlineDatabase.outbox.get(`workout_plans_sync:${planId}`)
        if (pendingSync && cachedPlan) {
          return
        }

        const { data, error } = await supabase
          .from('workout_plans')
          .select('*, workouts(*, workout_exercises(*))')
          .eq('id', planId)
          .single()

        if (error) throw error
        const plan = data as PlanWithWorkoutsAndExercises
        if (!active || !plan) return

        upsertCachedPlan(plan)
        applyPlanToForm(plan)
      } catch (error) {
        console.error('Errore caricamento scheda:', error)
        if (!cachedPlan) {
          toast.error('Impossibile caricare la scheda.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void loadPlan()
    return () => {
      active = false
    }
  }, [isEditMode, planId, supabase])

  const updateWorkoutName = (wIndex: number, name: string) => {
    setWorkouts(curr => curr.map((w, idx) => (idx === wIndex ? { ...w, name } : w)))
  }

  const updateExercise = (wIndex: number, exIndex: number, patch: Partial<ExerciseForm>) => {
    setWorkouts(curr =>
      curr.map((w, idx) =>
        idx === wIndex
          ? {
              ...w,
              exercises: w.exercises.map((ex, j) => (j === exIndex ? { ...ex, ...patch } : ex)),
            }
          : w,
      ),
    )
  }

  const toggleSupersetWithNext = (wIndex: number, exIndex: number) => {
    setWorkouts(curr =>
      curr.map((w, idx) => {
        if (idx !== wIndex) return w
        const list = [...w.exercises]
        const current = list[exIndex]
        const next = list[exIndex + 1]
        if (!current || !next) return w

        if (current.supersetGroup && current.supersetGroup === next.supersetGroup) {
          const groupToCheck = current.supersetGroup
          list[exIndex] = { ...current, supersetGroup: '' }
          const stillUsed = list.some((item, i) => i !== exIndex + 1 && item.supersetGroup === groupToCheck)
          if (!stillUsed) {
            list[exIndex + 1] = { ...next, supersetGroup: '' }
          }
          return { ...w, exercises: list }
        }

        const existingGroups = new Set(list.map(e => e.supersetGroup).filter(Boolean))
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        let assigned = current.supersetGroup || next.supersetGroup || ''
        if (!assigned) {
          for (const ch of letters) {
            if (!existingGroups.has(ch)) {
              assigned = ch
              break
            }
          }
          if (!assigned) assigned = 'SS'
        }
        list[exIndex] = { ...current, supersetGroup: assigned }
        list[exIndex + 1] = { ...next, supersetGroup: assigned }
        return { ...w, exercises: list }
      }),
    )
  }

  const unlinkSuperset = (wIndex: number, exIndex: number) => {
    setWorkouts(curr =>
      curr.map((w, idx) => {
        if (idx !== wIndex) return w
        const group = w.exercises[exIndex]?.supersetGroup
        if (!group) return w
        const updated = w.exercises.map((ex, j) => (j === exIndex ? { ...ex, supersetGroup: '' } : ex))
        const remainingInGroup = updated.filter(ex => ex.supersetGroup === group).length
        return {
          ...w,
          exercises:
            remainingInGroup < 2
              ? updated.map(ex => (ex.supersetGroup === group ? { ...ex, supersetGroup: '' } : ex))
              : updated,
        }
      }),
    )
  }

  const moveExercise = (wIndex: number, exIndex: number, dir: -1 | 1) => {
    setWorkouts(curr =>
      curr.map((w, idx) => {
        if (idx !== wIndex) return w
        const targetIndex = exIndex + dir
        if (targetIndex < 0 || targetIndex >= w.exercises.length) return w
        const nextList = [...w.exercises]
        const [moved] = nextList.splice(exIndex, 1)
        nextList.splice(targetIndex, 0, moved)
        return { ...w, exercises: nextList }
      }),
    )
  }

  const addExercise = (wIndex: number) => {
    setWorkouts(curr =>
      curr.map((w, idx) =>
        idx === wIndex ? { ...w, exercises: [...w.exercises, { ...EMPTY_EXERCISE }] } : w,
      ),
    )
  }

  const removeExercise = (wIndex: number, exIndex: number) => {
    setWorkouts(curr =>
      curr.map((w, idx) =>
        idx === wIndex ? { ...w, exercises: w.exercises.filter((_, j) => j !== exIndex) } : w,
      ),
    )
  }

  const addWorkoutDay = () => {
    setWorkouts(curr => [
      ...curr,
      { name: `Giorno ${curr.length + 1}`, exercises: [{ ...EMPTY_EXERCISE }] },
    ])
  }

  const removeWorkoutDay = (wIndex: number) => {
    setWorkouts(curr => curr.filter((_, idx) => idx !== wIndex))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planName.trim() || isSaving) {
      toast.error('Inserisci il nome della scheda.')
      return
    }
    setIsSaving(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const user = authSession?.user
      if (!user) throw new Error('Utente non autenticato.')

      const targetPlanId = isEditMode && planId ? planId : crypto.randomUUID()
      const existingCached = isEditMode ? findCachedPlan(targetPlanId) : undefined
      const createdAt = existingCached?.created_at ?? new Date().toISOString()

      const builtWorkouts = workouts
        .filter(w => w.name.trim())
        .map(workout => {
          const workoutId = workout.id ?? crypto.randomUUID()
          const validExercises = workout.exercises
            .filter(ex => ex.exercise_name.trim())
            .map((ex, idx) => {
              const parsedRest = ex.restSeconds ? Number.parseInt(ex.restSeconds, 10) : null
              saveExerciseMeta(ex.exercise_name, {
                rir: ex.rir,
                note: ex.note,
                restSeconds: Number.isFinite(parsedRest) ? parsedRest : null,
                supersetGroup: ex.supersetGroup || null,
              })
              return {
                id: ex.id ?? crypto.randomUUID(),
                workout_id: workoutId,
                exercise_name: ex.exercise_name.trim(),
                target_sets: Number.parseInt(ex.target_sets, 10) || 3,
                target_reps: ex.target_reps.trim() || '10',
                order: idx + 1,
              }
            })

          return {
            id: workoutId,
            plan_id: targetPlanId,
            name: workout.name.trim(),
            muscle_group: null,
            workout_exercises: validExercises,
          }
        })

      const builtPlan: PlanWithWorkoutsAndExercises = {
        id: targetPlanId,
        name: planName.trim(),
        user_id: user.id,
        created_at: createdAt,
        workouts: builtWorkouts,
      }

      upsertCachedPlan(builtPlan)

      const enqueuePlanOffline = async () => {
        await queueAndSync({
          id: `workout_plans_sync:${targetPlanId}`,
          userId: user.id,
          table: 'workout_plans_sync',
          payload: { plan: builtPlan },
        })
      }

      if (!navigator.onLine) {
        await enqueuePlanOffline()
        toast.success(
          isEditMode
            ? 'Modifiche scheda salvate offline!'
            : 'Nuova scheda creata offline: già pronta da avviare!',
        )
        window.dispatchEvent(new Event('nutriflow:data-updated'))
        navigate('/dashboard/gym')
        return
      }

      try {
        if (isEditMode) {
          const { error: planErr } = await supabase
            .from('workout_plans')
            .update({ name: builtPlan.name })
            .eq('id', targetPlanId)
          if (planErr) throw planErr

          if (originalWorkoutIds.length > 0) {
            const { error: delExErr } = await supabase
              .from('workout_exercises')
              .delete()
              .in('workout_id', originalWorkoutIds)
            if (delExErr) throw delExErr
          }
          const { error: delWkErr } = await supabase
            .from('workouts')
            .delete()
            .eq('plan_id', targetPlanId)
          if (delWkErr) throw delWkErr
        } else {
          const { error: planErr } = await supabase
            .from('workout_plans')
            .insert({
              id: builtPlan.id,
              name: builtPlan.name,
              user_id: user.id,
              created_at: builtPlan.created_at,
            })
          if (planErr) throw planErr
        }

        for (const workout of builtPlan.workouts) {
          const { error: wErr } = await supabase
            .from('workouts')
            .insert({
              id: workout.id,
              name: workout.name,
              plan_id: targetPlanId,
            })
          if (wErr) throw wErr

          if (workout.workout_exercises.length > 0) {
            const { error: exErr } = await supabase
              .from('workout_exercises')
              .insert(workout.workout_exercises)
            if (exErr) throw exErr
          }
        }

        toast.success(isEditMode ? 'Scheda aggiornata!' : 'Nuova scheda creata!')
      } catch {
        await enqueuePlanOffline()
        toast.success('Scheda salvata in locale (verrà sincronizzata online).')
      }

      window.dispatchEvent(new Event('nutriflow:data-updated'))
      navigate('/dashboard/gym')
    } catch (error) {
      console.error('Errore salvataggio scheda:', error)
      toast.error(error instanceof Error ? error.message : 'Impossibile salvare la scheda.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Caricamento scheda...</p>
  }

  return (
    <form onSubmit={e => void handleSave(e)} className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {isEditMode ? 'Modifica scheda' : 'Nuova scheda'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Recupero personalizzato (es. 150s), superserie, RIR e note tecniche
          </p>
        </div>
        <Button
          type="submit"
          disabled={isSaving}
          className="h-10 rounded-xl bg-emerald-600 px-4 text-xs text-white hover:bg-emerald-500"
        >
          <Check className="mr-1.5 size-4" />
          {isSaving ? 'Salvo...' : isEditMode ? 'Salva modifiche' : 'Crea scheda'}
        </Button>
      </header>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="builder-plan-name">Nome della scheda</Label>
            <Input
              id="builder-plan-name"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              placeholder="Es. Upper / Lower 4 giorni"
              className="h-11 font-semibold"
              required
            />
          </div>
        </CardContent>
      </Card>

      {workouts.map((workout, wIndex) => (
        <Card key={wIndex} className="border-primary/25">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Nome giorno ${wIndex + 1}`}
                value={workout.name}
                onChange={e => updateWorkoutName(wIndex, e.target.value)}
                placeholder="Nome allenamento (es. Push Day)"
                className="h-10 flex-1 font-semibold"
              />
              {workouts.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Rimuovi giorno"
                  className="size-9 shrink-0 rounded-xl text-red-400 hover:bg-red-500/15 hover:text-red-300"
                  onClick={() => removeWorkoutDay(wIndex)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {workout.exercises.map((exercise, exIndex) => {
              const hasNext = exIndex < workout.exercises.length - 1
              const nextEx = hasNext ? workout.exercises[exIndex + 1] : null
              const linkedWithNext = Boolean(
                exercise.supersetGroup && nextEx && nextEx.supersetGroup === exercise.supersetGroup,
              )

              return (
                <div
                  key={exIndex}
                  className={`space-y-2.5 rounded-xl border bg-muted/25 p-3 ${
                    exercise.supersetGroup ? 'border-amber-400/60 border-l-4 border-l-amber-400' : 'border-border/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <CardTitle className="font-mono text-xs text-muted-foreground">
                        Esercizio #{exIndex + 1}
                      </CardTitle>
                      {exercise.supersetGroup && (
                        <button
                          type="button"
                          onClick={() => unlinkSuperset(wIndex, exIndex)}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-200"
                          title="Tocca per scollegare dalla superserie"
                        >
                          Superserie {exercise.supersetGroup}
                          <Unlink2 className="size-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={exIndex === 0}
                        aria-label="Sposta esercizio su"
                        className="size-8 rounded-lg"
                        onClick={() => moveExercise(wIndex, exIndex, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={exIndex === workout.exercises.length - 1}
                        aria-label="Sposta esercizio giù"
                        className="size-8 rounded-lg"
                        onClick={() => moveExercise(wIndex, exIndex, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Rimuovi esercizio"
                        className="size-8 rounded-lg text-red-400 hover:bg-red-500/15 hover:text-red-300"
                        onClick={() => removeExercise(wIndex, exIndex)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <ExerciseNameField
                    value={exercise.exercise_name}
                    onChange={val => updateExercise(wIndex, exIndex, { exercise_name: val })}
                    className="h-10"
                  />

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Serie</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={exercise.target_sets}
                        onChange={e => updateExercise(wIndex, exIndex, { target_sets: e.target.value })}
                        className="h-9 text-center font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Reps</Label>
                      <Input
                        value={exercise.target_reps}
                        onChange={e => updateExercise(wIndex, exIndex, { target_reps: e.target.value })}
                        placeholder="8-10"
                        className="h-9 text-center font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock3 className="size-3 text-primary" />
                        Rec. (sec)
                      </Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="15"
                        max="600"
                        step="15"
                        value={exercise.restSeconds}
                        onChange={e => updateExercise(wIndex, exIndex, { restSeconds: e.target.value })}
                        placeholder="90"
                        className="h-9 text-center font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">RIR / RPE</Label>
                      <Input
                        value={exercise.rir}
                        onChange={e => updateExercise(wIndex, exIndex, { rir: e.target.value })}
                        placeholder="RIR 2"
                        className="h-9 text-center text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {QUICK_REST_OPTIONS.map(sec => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => updateExercise(wIndex, exIndex, { restSeconds: String(sec) })}
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                            exercise.restSeconds === String(sec)
                              ? 'border-primary/50 bg-primary/20 text-primary'
                              : 'border-border/60 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>

                    {hasNext && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`h-7 rounded-lg px-2 text-[11px] font-semibold ${
                          linkedWithNext
                            ? 'bg-amber-300 text-amber-950 hover:bg-amber-200'
                            : 'text-amber-400 hover:bg-amber-500/15'
                        }`}
                        onClick={() => toggleSupersetWithNext(wIndex, exIndex)}
                      >
                        {linkedWithNext ? (
                          <>
                            <Unlink2 className="mr-1 size-3" />
                            Scollega da #{exIndex + 2}
                          </>
                        ) : (
                          <>
                            <Link2 className="mr-1 size-3" />
                            Superserie con #{exIndex + 2}
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <Input
                    aria-label="Note tecniche"
                    value={exercise.note}
                    onChange={e => updateExercise(wIndex, exIndex, { note: e.target.value })}
                    placeholder="Note tecniche (es. Fermo 1s al petto, scapole addotte)"
                    className="h-9 text-xs"
                  />
                </div>
              )
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full rounded-xl border-emerald-500/35 bg-emerald-500/10 text-xs text-emerald-400 hover:bg-emerald-500/20"
              onClick={() => addExercise(wIndex)}
            >
              <PlusCircle className="mr-1.5 size-3.5" />
              Aggiungi esercizio
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="secondary" className="h-10 rounded-xl text-xs" onClick={addWorkoutDay}>
        <PlusCircle className="mr-1.5 size-4" />
        Aggiungi giorno
      </Button>

      <Button
        type="submit"
        size="lg"
        disabled={isSaving}
        className="h-12 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
      >
        <Check className="mr-1.5 size-4" />
        {isSaving ? 'Salvataggio...' : isEditMode ? 'Salva modifiche scheda' : 'Salva nuova scheda'}
      </Button>
    </form>
  )
}
