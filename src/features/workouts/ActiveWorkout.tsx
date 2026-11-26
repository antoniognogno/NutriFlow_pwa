'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimestampTimer } from '@/features/timers/useTimestampTimer'
import { FloatingRestTimer } from '@/features/workouts/FloatingRestTimer'
import { ExerciseGuideDialog } from '@/features/workouts/ExerciseGuideDialog'
import { BarbellCalculatorDialog } from '@/features/workouts/BarbellCalculatorDialog'
import { findDefaultWorkout } from '@/features/workouts/defaultWorkouts'
import { ExerciseNameField } from '@/features/workouts/ExerciseNameField'
import { findSameMuscleAlternatives, loadFreeExerciseDb, type FreeExerciseRecord } from '@/features/workouts/exerciseGuide'
import { readExerciseMeta } from '@/features/workouts/exerciseNotesStore'
import {
  cachePerformance,
  findCachedWorkout,
  readCachedPerformance,
  upsertCachedSession,
} from '@/features/workouts/workoutOfflineCache'
import {
  getStandbyWorkout,
  removeStandbyWorkout,
  saveStandbyWorkout,
} from '@/features/workouts/workoutStandby'
import {
  computeElapsedWorkoutSeconds,
  computeLiveExerciseProgression,
  computeSetVolumeKg,
  estimateOneRepMaxEpley,
  formatDuration,
  getOverloadSuggestion,
  getRecommendedRestSeconds,
} from '@/features/workouts/workoutUtils'
import { queueAndSync } from '@/features/offline/useOfflineSync'
import { SessionEditor, type EditableSession, type EditableSet } from '@/features/workouts/SessionEditor'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, ArrowLeftRight, Check, Clock3, Droplets, Dumbbell, HelpCircle, PauseCircle, Plus, Scale, TrendingUp, Trophy, X } from 'lucide-react'
import { toast } from 'sonner'

type Exercise = Tables<'workout_exercises'>
type Workout = Tables<'workouts'> & { workout_exercises: Exercise[] }
type LatestPerformance = {
  exercise_id: string | null
  exercise_key: string
  exercise_name: string
  weight_kg: number
  reps: number
  max_weight_kg: number
}
type SetDraft = {
  id: string
  setNumber: number
  weightKg: string
  reps: string
  completed: boolean
  isPersonalRecord: boolean
  completedAt?: string
}
type SessionDraft = { id: string; startedAt: string }
type SavedWorkoutDraft = Record<string, SetDraft[]>

const DEFAULT_REST_SECONDS = 90

function getSessionDraft(workoutId: string): SessionDraft {
  const key = `lifeflow:active-workout:${workoutId}`
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved) as SessionDraft
  } catch (error) {
    console.error('Impossibile recuperare la sessione locale:', error)
  }
  const session = { id: crypto.randomUUID(), startedAt: new Date().toISOString() }
  localStorage.setItem(key, JSON.stringify(session))
  return session
}

function exerciseKey(exercise: Exercise) {
  return exercise.id || exercise.exercise_name.trim().toLocaleLowerCase()
}

function targetReps(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '8'
}

function readSavedSets(workoutId: string): SavedWorkoutDraft {
  try {
    const value = localStorage.getItem(`lifeflow:workout-sets:${workoutId}`)
    return value ? JSON.parse(value) as SavedWorkoutDraft : {}
  } catch (error) {
    console.error('Impossibile recuperare le serie salvate localmente:', error)
    return {}
  }
}

function buildInitialSets(exercises: Exercise[], perfData: LatestPerformance[] = []): SavedWorkoutDraft {
  const initialized: SavedWorkoutDraft = {}
  for (const exercise of exercises) {
    const previous = perfData.find(performance =>
      performance.exercise_id === exercise.id ||
      performance.exercise_key === exercise.exercise_name.trim().toLocaleLowerCase(),
    )
    initialized[exercise.id] = Array.from({ length: exercise.target_sets || 3 }, (_, index) => ({
      id: crypto.randomUUID(),
      setNumber: index + 1,
      weightKg: previous ? String(previous.weight_kg) : '',
      reps: previous ? String(previous.reps) : targetReps(exercise.target_reps),
      completed: false,
      isPersonalRecord: false,
    }))
  }
  return initialized
}

export function ActiveWorkout({ workoutId }: { workoutId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const initialDefaultWorkout = useMemo(
    () => (findDefaultWorkout(workoutId) ?? findCachedWorkout(workoutId)) as Workout | undefined,
    [workoutId],
  )
  const [workout, setWorkout] = useState<Workout | null>(() => initialDefaultWorkout ?? null)
  const [userId, setUserId] = useState<string | null>(null)
  const [lastPerformance, setLastPerformance] = useState<LatestPerformance[]>(() => readCachedPerformance())
  const [setsByExercise, setSetsByExercise] = useState<SavedWorkoutDraft>(() => {
    const saved = readSavedSets(workoutId)
    if (Object.keys(saved).length > 0) return saved
    return initialDefaultWorkout
      ? buildInitialSets(initialDefaultWorkout.workout_exercises, readCachedPerformance())
      : {}
  })
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [pausedAtMs, setPausedAtMs] = useState<number | null>(null)
  const [pausedTotalMs, setPausedTotalMs] = useState(() => {
    const sb = getStandbyWorkout(workoutId)
    return sb ? sb.pausedTotalMs + Math.max(0, Date.now() - sb.pausedAtMs) : 0
  })
  const [isLoading, setIsLoading] = useState(() => !initialDefaultWorkout)
  const [isSaving, setIsSaving] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showBackExitDialog, setShowBackExitDialog] = useState(false)
  const [waterTodayMl, setWaterTodayMl] = useState(0)
  const [completedResult, setCompletedResult] = useState<{
    session: EditableSession
    sets: EditableSet[]
  } | null>(null)
  const [guideExerciseName, setGuideExerciseName] = useState<string | null>(null)
  const [calculatorWeight, setCalculatorWeight] = useState<number | null>(null)
  const [swapTarget, setSwapTarget] = useState<Exercise | null>(null)
  const [swapCustomName, setSwapCustomName] = useState('')
  const [dbRecords, setDbRecords] = useState<FreeExerciseRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const allowLeaveRef = useRef(false)
  const [session] = useState(() => getSessionDraft(workoutId))
  const sessionStartMs = useMemo(() => new Date(session.startedAt).getTime(), [session.startedAt])
  const completionCount = useMemo(
    () => Object.values(setsByExercise).flat().filter(set => set.completed).length,
    [setsByExercise],
  )
  const totalVolumeKg = useMemo(
    () => computeSetVolumeKg(Object.values(setsByExercise).flat()),
    [setsByExercise],
  )
  const personalRecords = useMemo(
    () => Object.values(setsByExercise).flat().filter(set => set.completed && set.isPersonalRecord).length,
    [setsByExercise],
  )
  const userIdRef = useRef(userId)

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  useEffect(() => {
    removeStandbyWorkout(workoutId)
  }, [workoutId])

  const loadWaterToday = useCallback(async (uid: string) => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', uid)
      .gte('created_at', startOfDay.toISOString())
    if (!error && data) {
      setWaterTodayMl(data.reduce((sum, row) => sum + (row.amount_ml || 0), 0))
    }
  }, [supabase])

  useEffect(() => {
    if (!userId) return
    void loadWaterToday(userId)
    const refresh = () => void loadWaterToday(userId)
    window.addEventListener('nutriflow:data-updated', refresh)
    return () => window.removeEventListener('nutriflow:data-updated', refresh)
  }, [loadWaterToday, userId])

  const quickAddWater = useCallback(async (amount: number) => {
    const currentUserId = userIdRef.current
    if (!currentUserId) return
    setWaterTodayMl(prev => prev + amount)
    try {
      if (!navigator.onLine) {
        await queueAndSync({
          id: `water_logs:${crypto.randomUUID()}`,
          userId: currentUserId,
          table: 'water_logs',
          payload: {
            user_id: currentUserId,
            amount_ml: amount,
            created_at: new Date().toISOString(),
          },
        })
      } else {
        const { error } = await supabase
          .from('water_logs')
          .insert([{ user_id: currentUserId, amount_ml: amount }])
        if (error) throw error
      }
      toast.success(`+${amount} ml di acqua registrati`)
      window.dispatchEvent(new Event('nutriflow:data-updated'))
    } catch (error) {
      setWaterTodayMl(prev => Math.max(0, prev - amount))
      console.error('Errore registrazione acqua in allenamento:', error)
      toast.error('Impossibile registrare acqua adesso.')
    }
  }, [supabase])

  const onRestComplete = useCallback(() => {
    if ('vibrate' in navigator && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) {
      navigator.vibrate([180, 90, 180])
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pausa terminata', { body: 'Pronto per la prossima serie?' })
    }
  }, [])
  const restTimer = useTimestampTimer({
    storageKey: `lifeflow:rest:${session.id}`,
    onComplete: onRestComplete,
  })

  useEffect(() => {
    let active = true
    const loadWorkout = async () => {
      const localTemplate = findDefaultWorkout(workoutId) ?? findCachedWorkout(workoutId)
      if (!localTemplate) {
        setIsLoading(true)
      }
      setLoadError(null)
      const { data: { session: authSession }, error: authError } = await supabase.auth.getSession()
      if (authError) throw authError
      const user = authSession?.user
      if (!user) {
        router.replace('/login')
        return
      }
      if (active) setUserId(user.id)

      if (!navigator.onLine && localTemplate) {
        const cachedPerf = readCachedPerformance()
        if (active) {
          const wData = {
            ...localTemplate,
            workout_exercises: [...localTemplate.workout_exercises].sort((a, b) => a.order - b.order),
          } as Workout
          setWorkout(wData)
          setLastPerformance(cachedPerf)
          setIsLoading(false)
        }
        return
      }

      const [workoutResult, performanceResult] = await Promise.all([
        localTemplate
          ? Promise.resolve({ data: localTemplate, error: null })
          : supabase
              .from('workouts')
              .select('*, workout_exercises(*)')
              .eq('id', workoutId)
              .single(),
        supabase
          .from('latest_exercise_performance')
          .select('exercise_id, exercise_key, exercise_name, weight_kg, reps, max_weight_kg')
          .eq('user_id', user.id),
      ])

      if (workoutResult.error) throw workoutResult.error
      if (performanceResult.error) {
        console.warn('Ultime performance non disponibili:', performanceResult.error)
      }
      if (!active) return

      const workoutData = workoutResult.data as Workout
      const perfData =
        !performanceResult.error && performanceResult.data
          ? (performanceResult.data as LatestPerformance[])
          : readCachedPerformance()
      if (!performanceResult.error && performanceResult.data) {
        cachePerformance(perfData)
      }
      workoutData.workout_exercises.sort((a, b) => a.order - b.order)
      setWorkout(workoutData)
      setLastPerformance(perfData)

      setSetsByExercise(current => {
        if (Object.keys(current).length > 0 && !localTemplate) return current
        if (Object.keys(current).length > 0 && perfData.length === 0) return current
        if (Object.keys(current).length > 0) {
          // Autocompila solo le serie non ancora toccate dall'utente
          const updated: SavedWorkoutDraft = { ...current }
          for (const exercise of workoutData.workout_exercises) {
            const previous = perfData.find(performance =>
              performance.exercise_id === exercise.id ||
              performance.exercise_key === exercise.exercise_name.trim().toLocaleLowerCase(),
            )
            if (!previous) continue
            updated[exercise.id] = (updated[exercise.id] ?? []).map(set =>
              !set.completed && set.weightKg === ''
                ? { ...set, weightKg: String(previous.weight_kg), reps: String(previous.reps) }
                : set,
            )
          }
          return updated
        }
        return buildInitialSets(workoutData.workout_exercises, perfData)
      })
      setIsLoading(false)
    }

    void loadWorkout().catch(error => {
      console.error('Impossibile caricare la sessione di allenamento:', error)
      if (active) {
        setLoadError(error instanceof Error ? error.message : 'Errore nel caricamento della scheda.')
        setIsLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [router, supabase, workoutId])

  useEffect(() => {
    const updateDuration = () => {
      setElapsedSeconds(computeElapsedWorkoutSeconds(sessionStartMs, Date.now(), pausedTotalMs, pausedAtMs))
    }
    updateDuration()
    if (pausedAtMs !== null || completedResult !== null) return
    const intervalId = window.setInterval(updateDuration, 1000)
    document.addEventListener('visibilitychange', updateDuration)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', updateDuration)
    }
  }, [completedResult, pausedAtMs, pausedTotalMs, sessionStartMs])

  useEffect(() => {
    localStorage.setItem(`lifeflow:workout-sets:${workoutId}`, JSON.stringify(setsByExercise))
  }, [setsByExercise, workoutId])

  const updateSet = useCallback((exerciseId: string, setId: string, update: Partial<SetDraft>) => {
    setSetsByExercise(current => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map(set => set.id === setId ? { ...set, ...update } : set),
    }))
  }, [])

  const adjustSet = useCallback((exerciseId: string, set: SetDraft, field: 'weightKg' | 'reps', amount: number) => {
    const currentValue = Number.parseFloat(set[field]) || 0
    const nextValue = Math.max(0, currentValue + amount)
    updateSet(exerciseId, set.id, { [field]: String(field === 'weightKg' ? Math.round(nextValue * 100) / 100 : Math.round(nextValue)) })
  }, [updateSet])

  const completeSet = useCallback(async (exercise: Exercise, set: SetDraft) => {
    const currentUserId = userIdRef.current
    if (!currentUserId || !workout || set.completed) return
    const reps = Number.parseInt(set.reps, 10)
    const weightKg = Number.parseFloat(set.weightKg)
    if (!Number.isInteger(reps) || reps <= 0 || !Number.isFinite(weightKg) || weightKg < 0) {
      toast.error('Inserisci un carico e un numero di ripetizioni validi.')
      return
    }

    const completedAt = new Date().toISOString()
    const previousBest = lastPerformance.find(performance =>
      performance.exercise_id === exercise.id ||
      performance.exercise_key === exercise.exercise_name.trim().toLocaleLowerCase(),
    )?.max_weight_kg ?? 0
    const isPersonalRecord = weightKg > previousBest
    const sessionRow = {
      id: session.id,
      user_id: currentUserId,
      workout_id: workout.id,
      workout_name: workout.name,
      started_at: session.startedAt,
      ended_at: null,
      duration_seconds: Math.floor((Date.now() - sessionStartMs) / 1000),
    }
    const setRow = {
      id: set.id,
      user_id: currentUserId,
      session_id: session.id,
      exercise_id: exercise.id,
      exercise_name: exercise.exercise_name,
      set_number: set.setNumber,
      reps,
      weight_kg: weightKg,
      completed_at: completedAt,
    }

    try {
      await queueAndSync({
        id: `workout_sessions:${session.id}`,
        userId: currentUserId,
        table: 'workout_sessions',
        conflictTarget: 'id',
        payload: sessionRow,
      })
      await queueAndSync({
        id: `workout_sets:${set.id}`,
        userId: currentUserId,
        table: 'workout_sets',
        conflictTarget: 'id',
        payload: setRow,
      })
      updateSet(exercise.id, set.id, { completed: true, isPersonalRecord, completedAt })
      if (isPersonalRecord) {
        setLastPerformance(current => current.map(performance =>
          performance.exercise_id === exercise.id ||
          performance.exercise_key === exercise.exercise_name.trim().toLocaleLowerCase()
            ? { ...performance, max_weight_kg: weightKg, weight_kg: weightKg, reps }
            : performance,
        ))
      }
      const meta = readExerciseMeta(exercise.exercise_name)
      const effectiveRestSec = meta?.restSeconds ?? getRecommendedRestSeconds(exercise.exercise_name)
      const currentIdx = workout.workout_exercises.findIndex(ex => ex.id === exercise.id)
      const nextSupersetPartner = meta?.supersetGroup
        ? workout.workout_exercises.find(
            (ex, idx) =>
              idx > currentIdx &&
              readExerciseMeta(ex.exercise_name)?.supersetGroup === meta.supersetGroup,
          )
        : undefined

      if (nextSupersetPartner) {
        toast.info(`Superserie ${meta?.supersetGroup}: passa a ${nextSupersetPartner.exercise_name}!`)
      } else {
        restTimer.start(effectiveRestSec * 1000)
      }
      if (isPersonalRecord) toast.success(`Nuovo PR: ${weightKg} kg`)
    } catch (error) {
      console.error('Impossibile salvare la serie offline:', error)
      toast.error('Serie non salvata sul dispositivo. Riprova.')
    }
  }, [lastPerformance, restTimer, session.id, session.startedAt, sessionStartMs, updateSet, workout])

  const addSet = useCallback((exercise: Exercise) => {
    setSetsByExercise(current => {
      const currentSets = current[exercise.id] ?? []
      const last = currentSets[currentSets.length - 1]
      return {
        ...current,
        [exercise.id]: [...currentSets, {
          id: crypto.randomUUID(),
          setNumber: currentSets.length + 1,
          weightKg: last?.weightKg ?? '',
          reps: last?.reps ?? targetReps(exercise.target_reps),
          completed: false,
          isPersonalRecord: false,
        }],
      }
    })
  }, [])

  const openFinishDialog = useCallback(() => {
    const now = Date.now()
    setPausedAtMs(now)
    setElapsedSeconds(computeElapsedWorkoutSeconds(sessionStartMs, now, pausedTotalMs, now))
    setShowSummary(true)
  }, [pausedTotalMs, sessionStartMs])

  const resumeFromDialog = useCallback(() => {
    if (pausedAtMs !== null) {
      setPausedTotalMs(prev => prev + Math.max(0, Date.now() - pausedAtMs))
      setPausedAtMs(null)
    }
    setShowSummary(false)
  }, [pausedAtMs])

  const discardEmptyWorkout = useCallback(() => {
    allowLeaveRef.current = true
    localStorage.removeItem(`lifeflow:active-workout:${workoutId}`)
    localStorage.removeItem(`lifeflow:workout-sets:${workoutId}`)
    removeStandbyWorkout(workoutId)
    restTimer.reset()
    if (userIdRef.current) {
      void supabase.from('workout_sessions').delete().eq('id', session.id).is('ended_at', null)
    }
    toast.info('Sessione annullata senza salvare.')
    window.dispatchEvent(new Event('nutriflow:data-updated'))
    router.push('/dashboard/gym')
  }, [restTimer, router, session.id, supabase, workoutId])

  const openBackExitDialog = useCallback(() => {
    const now = Date.now()
    setPausedAtMs(prev => prev ?? now)
    setElapsedSeconds(computeElapsedWorkoutSeconds(sessionStartMs, now, pausedTotalMs, now))
    setShowBackExitDialog(true)
  }, [pausedTotalMs, sessionStartMs])

  const resumeFromBackDialog = useCallback(() => {
    if (pausedAtMs !== null) {
      setPausedTotalMs(prev => prev + Math.max(0, Date.now() - pausedAtMs))
      setPausedAtMs(null)
    }
    setShowBackExitDialog(false)
  }, [pausedAtMs])

  useEffect(() => {
    void loadFreeExerciseDb()
      .then(recs => setDbRecords(recs))
      .catch(() => undefined)
  }, [])

  const applyExerciseSwap = useCallback((exerciseId: string, nextName: string) => {
    const clean = nextName.trim()
    if (!clean) return
    setWorkout(curr => {
      if (!curr) return curr
      return {
        ...curr,
        workout_exercises: curr.workout_exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, exercise_name: clean } : ex,
        ),
      }
    })
    setSwapTarget(null)
    setSwapCustomName('')
    toast.success(`Esercizio sostituito con "${clean}"`)
  }, [])

  const putWorkoutInStandby = useCallback(() => {
    if (!workout) return
    allowLeaveRef.current = true
    const now = Date.now()
    const effectivePausedTotal = pausedTotalMs + (pausedAtMs !== null ? Math.max(0, now - pausedAtMs) : 0)
    saveStandbyWorkout({
      workoutId,
      workoutName: workout.name,
      sessionId: session.id,
      startedAt: session.startedAt,
      pausedAtMs: now,
      pausedTotalMs: effectivePausedTotal,
      completedSets: completionCount,
    })
    setShowBackExitDialog(false)
    toast.info('Scheda messa in stand-by. Puoi riprenderla da Workout.')
    window.dispatchEvent(new Event('nutriflow:data-updated'))
    router.push('/dashboard/gym')
  }, [completionCount, pausedAtMs, pausedTotalMs, router, session.id, session.startedAt, workout, workoutId])

  useEffect(() => {
    const win = window as Window & { __nutriflowWorkoutBackHandler?: (() => void) | null }
    if (!completedResult && !isLoading && workout) {
      win.__nutriflowWorkoutBackHandler = openBackExitDialog
      if (window.history.state?.nutriflowWorkoutGuard !== workoutId) {
        window.history.pushState({ ...(window.history.state ?? {}), nutriflowWorkoutGuard: workoutId }, '', window.location.href)
      }
      const onPopState = () => {
        if (allowLeaveRef.current) return
        window.history.pushState({ ...(window.history.state ?? {}), nutriflowWorkoutGuard: workoutId }, '', window.location.href)
        openBackExitDialog()
      }
      window.addEventListener('popstate', onPopState)
      return () => {
        win.__nutriflowWorkoutBackHandler = null
        window.removeEventListener('popstate', onPopState)
      }
    }
    win.__nutriflowWorkoutBackHandler = null
    return () => {
      win.__nutriflowWorkoutBackHandler = null
    }
  }, [completedResult, isLoading, openBackExitDialog, workout, workoutId])

  const finishWorkout = useCallback(async () => {
    const currentUserId = userIdRef.current
    if (!currentUserId || !workout || completionCount === 0 || isSaving) return
    setIsSaving(true)
    try {
      const endedAt = new Date().toISOString()
      const finalDuration = computeElapsedWorkoutSeconds(sessionStartMs, Date.now(), pausedTotalMs, pausedAtMs)
      const savedSessionPayload: EditableSession = {
        id: session.id,
        user_id: currentUserId,
        workout_id: workout.id,
        workout_name: workout.name,
        started_at: session.startedAt,
        ended_at: endedAt,
        duration_seconds: finalDuration,
      }

      await queueAndSync({
        id: `workout_sessions:${session.id}`,
        userId: currentUserId,
        table: 'workout_sessions',
        conflictTarget: 'id',
        payload: savedSessionPayload,
      })

      const savedSetRows: EditableSet[] = []
      for (const exercise of workout.workout_exercises) {
        const draftSets = setsByExercise[exercise.id] ?? []
        for (const set of draftSets) {
          if (!set.completed) continue
          savedSetRows.push({
            id: set.id,
            user_id: currentUserId,
            session_id: session.id,
            exercise_id: exercise.id,
            exercise_name: exercise.exercise_name,
            set_number: set.setNumber,
            reps: Number.parseInt(set.reps, 10) || 1,
            weight_kg: Number.parseFloat(set.weightKg) || 0,
            completed_at: set.completedAt ?? endedAt,
            isPersonalRecord: set.isPersonalRecord,
          })
        }
      }

      upsertCachedSession(savedSessionPayload, savedSetRows)
      localStorage.removeItem(`lifeflow:active-workout:${workoutId}`)
      localStorage.removeItem(`lifeflow:workout-sets:${workoutId}`)
      removeStandbyWorkout(workoutId)
      restTimer.reset()
      setShowBackExitDialog(false)
      setShowSummary(false)
      setCompletedResult({ session: savedSessionPayload, sets: savedSetRows })
      window.dispatchEvent(new Event('nutriflow:data-updated'))
      toast.success(`Allenamento salvato · ${completionCount} serie · ${formatDuration(finalDuration)}`)
    } catch (error) {
      console.error('Impossibile chiudere la sessione:', error)
      toast.error('Sessione non salvata sul dispositivo. Riprova.')
    } finally {
      setIsSaving(false)
    }
  }, [completionCount, isSaving, pausedAtMs, pausedTotalMs, restTimer, session.id, session.startedAt, sessionStartMs, setsByExercise, workout, workoutId])

  if (completedResult) {
    return (
      <SessionEditor
        session={completedResult.session}
        initialSets={completedResult.sets}
        onSaved={(updatedSession, updatedSets) => {
          setCompletedResult({ session: updatedSession, sets: updatedSets })
        }}
        onClose={() => router.push('/dashboard/gym')}
        closeLabel="Torna ad Allenamento"
      />
    )
  }

  if (isLoading) return <p className="py-12 text-center text-muted-foreground">Caricamento allenamento...</p>
  if (loadError || !workout) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{loadError ?? 'Allenamento non trovato.'}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/gym')}>Torna alle schede</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-28">
      <header className="sticky top-14 z-20 -mx-4 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{workout.name}</p>
          <div className="flex items-center gap-2 font-mono text-lg font-semibold">
            <Clock3 className="size-4 shrink-0 text-primary" />
            {formatDuration(elapsedSeconds)}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-xl border-amber-500/35 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
          onClick={openFinishDialog}
          disabled={isSaving}
        >
          {isSaving ? 'Salvo...' : 'Termina'}
        </Button>
      </header>

      <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Serie completate</p>
          <p className="text-xs text-muted-foreground">Tocca ✓ per registrare e avviare il recupero.</p>
        </div>
        <div className="text-right">
          <span className="block font-mono text-2xl font-bold text-primary">{completionCount}</span>
          {personalRecords > 0 && <span className="text-xs font-medium text-amber-500">{personalRecords} PR</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Droplets className="size-4 shrink-0 text-sky-400" />
          <div>
            <p className="text-xs font-semibold leading-tight">Idratazione rapida</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {waterTodayMl.toLocaleString('it-IT')} ml oggi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-sky-500/40 bg-sky-500/15 px-2.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
            onClick={() => void quickAddWater(250)}
          >
            +250 ml
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-xl bg-sky-600 px-2.5 text-xs font-semibold text-white hover:bg-sky-500"
            onClick={() => void quickAddWater(500)}
          >
            +500 ml
          </Button>
        </div>
      </div>

      {workout.workout_exercises.map(exercise => {
        const previous = lastPerformance.find(item =>
          item.exercise_id === exercise.id ||
          item.exercise_key === exercise.exercise_name.trim().toLocaleLowerCase(),
        )
        const meta = readExerciseMeta(exercise.exercise_name)
        const overloadHint = getOverloadSuggestion(previous?.weight_kg, previous?.reps)
        const recRestSec = meta?.restSeconds ?? getRecommendedRestSeconds(exercise.exercise_name)
        const currentSets = setsByExercise[exercise.id] ?? []
        const firstIncomplete = currentSets.find(s => !s.completed)
        const calcBaseWeight = Number.parseFloat(firstIncomplete?.weightKg ?? '') || previous?.weight_kg || 60
        const liveProg = computeLiveExerciseProgression(
          currentSets,
          previous?.weight_kg,
          previous?.reps,
        )

        return (
          <Card
            key={exercise.id}
            className={`overflow-hidden ${
              meta?.supersetGroup ? 'border-amber-400/50 border-l-4 border-l-amber-400' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Dumbbell className="size-5 shrink-0 text-primary" />
                      <span className="break-words leading-snug">{exercise.exercise_name}</span>
                    </CardTitle>
                    {meta?.supersetGroup && (
                      <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                        Superserie {meta.supersetGroup}
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    Obiettivo: {exercise.target_sets ?? 3} × {exercise.target_reps || '8'} · Recupero{' '}
                    {formatDuration(recRestSec)}
                    {meta?.restSeconds ? ' (pers.)' : ''}
                    {meta && [meta.rir, meta.note].filter(Boolean).length > 0
                      ? ` · ${[meta.rir, meta.note].filter(Boolean).join(' · ')}`
                      : ''}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 rounded-xl text-primary hover:bg-primary/15"
                    aria-label={`Sostituisci ${exercise.exercise_name}`}
                    onClick={() => {
                      setSwapTarget(exercise)
                      setSwapCustomName('')
                    }}
                  >
                    <ArrowLeftRight className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 rounded-xl text-primary hover:bg-primary/15"
                    aria-label={`Come fare ${exercise.exercise_name}`}
                    onClick={() => setGuideExerciseName(exercise.exercise_name)}
                  >
                    <HelpCircle className="size-5" />
                  </Button>
                </div>
              </div>
              {(overloadHint || liveProg.best1RmKg > 0) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {overloadHint && (
                    <div className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-500/70 bg-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-950">
                      <TrendingUp className="size-3 shrink-0 text-emerald-900" />
                      <span>{overloadHint}</span>
                    </div>
                  )}
                  {liveProg.best1RmKg > 0 && (
                    <div
                      title="Calcolato con formula di Epley: peso × (1 + reps / 30)"
                      className="inline-flex w-fit items-center gap-1 rounded-full border border-sky-400/70 bg-sky-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-950"
                    >
                      <Trophy className="size-3 shrink-0 text-sky-900" />
                      <span>
                        Massimale 1RM: {liveProg.best1RmKg} kg
                        {liveProg.delta1RmKg !== null && liveProg.delta1RmKg !== 0
                          ? ` (${liveProg.delta1RmKg > 0 ? '+' : ''}${liveProg.delta1RmKg} kg)`
                          : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
            {currentSets.map(set => {
              const set1Rm = estimateOneRepMaxEpley(
                Number.parseFloat(set.weightKg) || 0,
                Number.parseInt(set.reps, 10) || 0,
              )
              return (
              <div key={set.id} className={`rounded-xl border p-3 ${set.completed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'}`}>
                {set1Rm > 0 && (
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>Serie {set.setNumber}</span>
                    <span className="font-mono font-medium text-primary">
                      Massimale ~{set1Rm} kg
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-end gap-2">
                  <span className="flex h-11 w-7 items-center justify-center rounded-lg bg-muted font-mono text-xs font-semibold">
                    {set.setNumber}
                  </span>
                  <label className="min-w-0 text-center text-xs text-muted-foreground">
                    kg
                    <input
                      aria-label={`${exercise.exercise_name}, serie ${set.setNumber}, carico in kg`}
                      className="mt-1 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-1.5 text-center font-mono text-base font-semibold tabular-nums text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      value={set.weightKg}
                      disabled={set.completed}
                      onChange={event => updateSet(exercise.id, set.id, { weightKg: event.target.value })}
                    />
                  </label>
                  <label className="min-w-0 text-center text-xs text-muted-foreground">
                    reps
                    <input
                      aria-label={`${exercise.exercise_name}, serie ${set.setNumber}, ripetizioni`}
                      className="mt-1 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-1.5 text-center font-mono text-base font-semibold tabular-nums text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={set.reps}
                      disabled={set.completed}
                      onChange={event => updateSet(exercise.id, set.id, { reps: event.target.value })}
                    />
                  </label>
                  <Button
                    className={`size-11 rounded-xl ${
                      set.completed
                        ? 'bg-emerald-600/80 text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                    size="icon"
                    aria-label={`Conferma serie ${set.setNumber} di ${exercise.exercise_name}`}
                    disabled={set.completed}
                    onClick={() => void completeSet(exercise, set)}
                  >
                    <Check className="size-5" />
                  </Button>
                </div>
                {!set.completed && (
                  <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-full min-w-0 px-1 font-mono text-[11px] font-semibold"
                      onClick={() => adjustSet(exercise.id, set, 'weightKg', -2.5)}
                    >
                      -2.5 kg
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-full min-w-0 px-1 font-mono text-[11px] font-semibold"
                      onClick={() => adjustSet(exercise.id, set, 'weightKg', 2.5)}
                    >
                      +2.5 kg
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-full min-w-0 px-1 font-mono text-[11px] font-semibold"
                      onClick={() => adjustSet(exercise.id, set, 'reps', -1)}
                    >
                      -1 rep
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-full min-w-0 px-1 font-mono text-[11px] font-semibold"
                      onClick={() => adjustSet(exercise.id, set, 'reps', 1)}
                    >
                      +1 rep
                    </Button>
                  </div>
                )}
                {set.isPersonalRecord && (
                  <p className="mt-2 text-right text-xs font-semibold text-amber-500">Nuovo record personale</p>
                )}
              </div>
              )
            })}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {previous?.weight_kg
                  ? `Ultima: ${previous.weight_kg} kg × ${previous.reps}`
                  : 'Prima registrazione'}
                {liveProg.completedVolumeKg > 0 ? ` · Volume: ${liveProg.completedVolumeKg} kg` : ''}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => setCalculatorWeight(calcBaseWeight)}
                >
                  <Scale className="mr-1 size-3.5" />
                  Dischi
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                  onClick={() => addSet(exercise)}
                >
                  <Plus className="mr-1 size-3.5" />Serie
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )
      })}

      <Button
        className="h-12 w-full bg-emerald-600 text-white hover:bg-emerald-500"
        size="lg"
        onClick={openFinishDialog}
        disabled={isSaving}
      >
        {isSaving ? 'Salvataggio...' : 'Termina allenamento'}
        <Check className="ml-2 size-4" />
      </Button>

      <Dialog open={showSummary} onOpenChange={open => { if (!open) resumeFromDialog() }}>
        <DialogContent className="sm:max-w-md">
          {completionCount === 0 ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="size-5" />
                  Nessuna serie completata
                </DialogTitle>
                <DialogDescription>
                  Non hai registrato nessuna serie per <strong>{workout.name}</strong> (timer in pausa a {formatDuration(elapsedSeconds)}). Vuoi uscire senza salvare?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" className="h-11 w-full sm:w-auto" onClick={resumeFromDialog}>
                  Riprendi
                </Button>
                <Button variant="destructive" className="h-11 w-full sm:w-auto" onClick={discardEmptyWorkout}>
                  Esci senza salvare
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trophy className="size-5 text-amber-500" />
                  Confermi la chiusura?
                </DialogTitle>
                <DialogDescription>
                  {workout.name} · Timer fermo a {formatDuration(elapsedSeconds)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Durata</p>
                  <p className="font-mono text-lg font-bold">{formatDuration(elapsedSeconds)}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Serie completate</p>
                  <p className="font-mono text-lg font-bold">{completionCount}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Volume totale</p>
                  <p className="font-mono text-lg font-bold">{Math.round(totalVolumeKg)} kg</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Nuovi PR</p>
                  <p className="font-mono text-lg font-bold text-amber-500">{personalRecords}</p>
                </div>
              </div>
              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" className="h-11 w-full min-w-0 whitespace-normal sm:w-auto" onClick={resumeFromDialog}>
                  Continua
                </Button>
                <Button
                  className="h-auto min-h-11 w-full min-w-0 whitespace-normal bg-emerald-600 py-2 text-center leading-tight text-white hover:bg-emerald-500 sm:w-auto"
                  onClick={() => void finishWorkout()}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvataggio...' : 'Registra e vedi riepilogo'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBackExitDialog} onOpenChange={open => { if (!open) resumeFromBackDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="min-w-0 pr-6 text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              <PauseCircle className="size-5 shrink-0 text-amber-400" />
              <span className="break-words">Cosa vuoi fare con la scheda?</span>
            </DialogTitle>
            <DialogDescription className="break-words text-xs">
              <strong>{workout.name}</strong> · {completionCount} serie · Timer a {formatDuration(elapsedSeconds)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-w-0 flex-col gap-2 pt-1">
            <Button
              type="button"
              className="h-auto min-h-11 w-full min-w-0 whitespace-normal rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-xs font-semibold leading-tight text-white hover:bg-emerald-500 sm:text-sm"
              disabled={completionCount === 0 || isSaving}
              onClick={() => void finishWorkout()}
            >
              <Check className="mr-1.5 size-4 shrink-0" />
              <span>
                {completionCount > 0
                  ? `Termina e registra (${completionCount} serie)`
                  : 'Termina (completa almeno 1 serie)'}
              </span>
            </Button>
            <Button
              type="button"
              className="h-auto min-h-11 w-full min-w-0 whitespace-normal rounded-xl border border-amber-400 bg-amber-300 px-3 py-2.5 text-center text-xs font-semibold leading-tight text-amber-950 hover:bg-amber-200 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200 sm:text-sm"
              onClick={putWorkoutInStandby}
            >
              <PauseCircle className="mr-1.5 size-4 shrink-0" />
              <span>Metti in stand-by</span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-auto min-h-11 w-full min-w-0 whitespace-normal rounded-xl px-3 py-2.5 text-center text-xs font-semibold leading-tight sm:text-sm"
              onClick={discardEmptyWorkout}
            >
              <X className="mr-1.5 size-4 shrink-0" />
              <span>Annulla scheda (scarta)</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full min-w-0 whitespace-normal rounded-xl text-xs sm:text-sm"
              onClick={resumeFromBackDialog}
            >
              Continua allenamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FloatingRestTimer
        status={restTimer.status}
        remainingMs={restTimer.remainingMs}
        onAddSeconds={seconds => restTimer.adjust(seconds * 1000)}
        onSkip={restTimer.reset}
      />

      <ExerciseGuideDialog
        exerciseName={guideExerciseName}
        open={guideExerciseName !== null}
        onOpenChange={open => { if (!open) setGuideExerciseName(null) }}
      />

      <Dialog open={swapTarget !== null} onOpenChange={open => { if (!open) setSwapTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowLeftRight className="size-4 text-primary" />
              Sostituisci esercizio
            </DialogTitle>
            <DialogDescription className="text-xs">
              Attuale: <strong>{swapTarget?.exercise_name}</strong> · Scegli un’alternativa dello stesso gruppo o scrivi il nome
            </DialogDescription>
          </DialogHeader>
          {swapTarget && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-300 bg-slate-100 p-2.5 dark:bg-slate-200/95">
                {findSameMuscleAlternatives(swapTarget.exercise_name, dbRecords, 6).map(alt => (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => applyExerciseSwap(swapTarget.id, alt.label)}
                    className="rounded-full border border-emerald-500/60 bg-emerald-200 px-2.5 py-1 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-300"
                  >
                    {alt.label}
                  </button>
                ))}
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  applyExerciseSwap(swapTarget.id, swapCustomName)
                }}
                className="flex items-start gap-2"
              >
                <ExerciseNameField
                  value={swapCustomName}
                  onChange={setSwapCustomName}
                  placeholder="Oppure cerca un esercizio..."
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!swapCustomName.trim()}
                  className="h-10 shrink-0 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500"
                >
                  Usa
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {calculatorWeight !== null && (
        <BarbellCalculatorDialog
          key={calculatorWeight}
          initialWeightKg={calculatorWeight}
          open={calculatorWeight !== null}
          onOpenChange={open => { if (!open) setCalculatorWeight(null) }}
        />
      )}
    </div>
  )
}
