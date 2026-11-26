import { describe, expect, it } from 'vitest'
import { DEFAULT_WORKOUTS, findDefaultWorkout } from './defaultWorkouts'
import {
  computeBarbellPlates,
  computeElapsedWorkoutSeconds,
  computeLiveExerciseProgression,
  computeSetVolumeKg,
  estimateOneRepMaxEpley,
  formatDuration,
  formatPacePerKm,
  getOverloadSuggestion,
  getRecommendedRestSeconds,
  isCardioSession,
} from './workoutUtils'
import {
  findCuratedGuide,
  findSameMuscleAlternatives,
  hasExercisePhotoMatch,
  matchExerciseInDb,
  searchExerciseSuggestions,
} from './exerciseGuide'
import { readExerciseMeta, saveExerciseMeta } from './exerciseNotesStore'
import {
  cachePlans,
  findCachedPlan,
  findCachedWorkout,
  mergeRemoteAndCachedPlans,
  mergeRemoteAndCachedSessions,
  readCachedPlans,
  readCachedSessions,
  readCachedSetsForSession,
  removeCachedPlan,
  removeCachedSession,
  upsertCachedPlan,
  upsertCachedSession,
} from './workoutOfflineCache'
import {
  getStandbyWorkout,
  readStandbyWorkouts,
  removeStandbyWorkout,
  saveStandbyWorkout,
} from './workoutStandby'

describe('Workouts & Cardio Module', () => {
  it('provides 3 ready-to-use default workout templates with exercises', () => {
    expect(DEFAULT_WORKOUTS.length).toBeGreaterThanOrEqual(3)
    for (const workout of DEFAULT_WORKOUTS) {
      expect(workout.id).toMatch(/^preset-/)
      expect(workout.workout_exercises.length).toBeGreaterThan(0)
      expect(findDefaultWorkout(workout.id)?.name).toBe(workout.name)
    }
    expect(findDefaultWorkout('non-existent')).toBeUndefined()
  })

  it('formats workout durations and running pace cleanly', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3665)).toBe('1:01:05')
    expect(formatPacePerKm(5, 25)).toBe('5:00/km')
    expect(formatPacePerKm(10, 55)).toBe('5:30/km')
  })

  it('computes total lifted volume from completed sets only', () => {
    expect(computeSetVolumeKg([
      { weightKg: '80', reps: '8', completed: true },
      { weightKg: '80', reps: '8', completed: false },
      { weightKg: '62.5', reps: '10', completed: true },
    ])).toBe(1265)
  })

  it('distinguishes cardio/running sessions from gym workout sessions', () => {
    expect(isCardioSession({ workout_id: null, workout_name: 'Corsa 5 km (5:36/km)' })).toBe(true)
    expect(isCardioSession({ workout_id: 'preset-push', workout_name: 'Push · Petto, Spalle, Tricipiti' })).toBe(false)
  })

  it('freezes elapsed workout seconds while paused on finish confirmation', () => {
    const start = 1_700_000_000_000
    const pausedAt = start + 125_000
    // While paused at +125s, advancing wall-clock time to +200s stays frozen at 125s
    expect(computeElapsedWorkoutSeconds(start, start + 200_000, 0, pausedAt)).toBe(125)
    // After resuming from a 75s pause at +210s, elapsed time is 210 - 75 = 135s
    expect(computeElapsedWorkoutSeconds(start, start + 210_000, 75_000, null)).toBe(135)
  })

  it('picks custom rest duration and progressive overload hints per exercise', () => {
    expect(getRecommendedRestSeconds('Panca Piana Bilanciere')).toBe(120)
    expect(getRecommendedRestSeconds('Alzate Laterali')).toBe(60)
    expect(getRecommendedRestSeconds('Esercizio Generico')).toBe(90)

    expect(getOverloadSuggestion(80, 10)).toBe('Prova 82.5 kg')
    expect(getOverloadSuggestion(80, 8)).toBe('Prova 80 kg × 9')
    expect(getOverloadSuggestion(undefined, undefined)).toBeNull()
  })

  it('computes barbell plates per side accurately', () => {
    const res = computeBarbellPlates(80, 20)
    expect(res.perSideKg).toBe(30)
    expect(res.plates).toEqual([20, 10])
    expect(res.remainderKg).toBe(0)
  })

  it('resolves curated exercise guide and free-exercise-db matching', () => {
    const curated = findCuratedGuide('Panca Piana Bilanciere')
    expect(curated?.id).toBe('Barbell_Bench_Press_-_Medium_Grip')
    expect(curated?.images[0]).toContain('Barbell_Bench_Press_-_Medium_Grip/0.jpg')

    const matched = matchExerciseInDb('Stacco Rumeno', [
      { id: 'Romanian_Deadlift', name: 'Romanian Deadlift' },
      { id: 'Barbell_Curl', name: 'Barbell Curl' },
    ])
    expect(matched?.id).toBe('Romanian_Deadlift')

    expect(hasExercisePhotoMatch('Panca Piana')).toBe(true)
    expect(hasExercisePhotoMatch('Esercizio Inventato Xyz')).toBe(false)
    const suggestions = searchExerciseSuggestions('panca')
    expect(suggestions.length).toBeGreaterThanOrEqual(2)
    expect(suggestions[0].label).toContain('Panca')

    const chestSwaps = findSameMuscleAlternatives('Panca Piana')
    expect(chestSwaps.length).toBeGreaterThan(0)
    expect(chestSwaps.some(s => s.label.toLowerCase().includes('panca'))).toBe(true)
  })

  it('stores, reads, and removes standby workouts cleanly', () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v) },
        removeItem: (k: string) => { store.delete(k) },
      },
      configurable: true,
    })

    saveStandbyWorkout({
      workoutId: 'preset-push',
      workoutName: 'Push · Petto',
      sessionId: 'sess-1',
      startedAt: '2026-11-26T00:00:00Z',
      pausedAtMs: 1_700_000_050_000,
      pausedTotalMs: 0,
      completedSets: 3,
    })
    expect(readStandbyWorkouts()).toHaveLength(1)
    expect(getStandbyWorkout('preset-push')?.completedSets).toBe(3)

    removeStandbyWorkout('preset-push')
    expect(getStandbyWorkout('preset-push')).toBeNull()

    saveExerciseMeta('Panca Piana', {
      rir: 'RIR 2',
      note: 'Fermo 1s',
      restSeconds: 150,
      supersetGroup: 'a',
    })
    expect(readExerciseMeta('panca piana')).toEqual({
      rir: 'RIR 2',
      note: 'Fermo 1s',
      restSeconds: 150,
      supersetGroup: 'A',
    })
  })

  it('estimates Epley 1RM and live exercise progression across sets', () => {
    expect(estimateOneRepMaxEpley(100, 1)).toBe(100)
    expect(estimateOneRepMaxEpley(80, 10)).toBe(106.7)
    expect(estimateOneRepMaxEpley(0, 8)).toBe(0)

    const prog = computeLiveExerciseProgression(
      [
        { weightKg: '80', reps: '10', completed: true },
        { weightKg: '85', reps: '8', completed: false },
      ],
      80,
      8,
    )
    expect(prog.previous1RmKg).toBe(101.3)
    expect(prog.best1RmKg).toBe(107.7)
    expect(prog.delta1RmKg).toBe(6.4)
    expect(prog.completedVolumeKg).toBe(800)
  })

  it('caches custom plans and offline workout sessions for immediate offline access & history', () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v) },
        removeItem: (k: string) => { store.delete(k) },
      },
      configurable: true,
    })

    cachePlans([
      {
        id: 'plan-1',
        user_id: 'u-1',
        name: 'Upper Lower Offline',
        created_at: '2026-11-20T10:00:00Z',
        workouts: [
          {
            id: 'wk-1',
            plan_id: 'plan-1',
            name: 'Upper A',
            workout_exercises: [
              { id: 'ex-2', workout_id: 'wk-1', exercise_name: 'Rematore', target_sets: 3, target_reps: '10', order: 2 },
              { id: 'ex-1', workout_id: 'wk-1', exercise_name: 'Panca Piana', target_sets: 4, target_reps: '8', order: 1 },
            ],
          },
        ],
      },
    ] as never)

    expect(readCachedPlans()).toHaveLength(1)
    const found = findCachedWorkout('wk-1')
    expect(found?.name).toBe('Upper A')
    expect(found?.workout_exercises.map(e => e.exercise_name)).toEqual(['Panca Piana', 'Rematore'])

    upsertCachedSession(
      {
        id: 'offline-sess-1',
        user_id: 'u-1',
        workout_id: 'wk-1',
        workout_name: 'Upper A',
        started_at: '2026-11-26T11:00:00Z',
        ended_at: '2026-11-26T11:45:00Z',
        duration_seconds: 2700,
      },
      [
        {
          id: 's1',
          user_id: 'u-1',
          session_id: 'offline-sess-1',
          exercise_id: 'ex-1',
          exercise_name: 'Panca Piana',
          set_number: 1,
          reps: 8,
          weight_kg: 80,
          completed_at: '2026-11-26T11:10:00Z',
        },
      ],
    )

    expect(readCachedSessions()).toHaveLength(1)
    expect(readCachedSetsForSession('offline-sess-1')).toHaveLength(1)

    const merged = mergeRemoteAndCachedSessions(
      [
        {
          id: 'remote-sess-1',
          user_id: 'u-1',
          workout_id: null,
          workout_name: 'Corsa 5 km (5:30/km)',
          started_at: '2026-11-25T10:00:00Z',
          ended_at: '2026-11-25T10:28:00Z',
          duration_seconds: 1680,
        },
      ],
      readCachedSessions(),
      new Set(['offline-sess-1']),
    )
    expect(merged.map(s => s.id)).toEqual(['offline-sess-1', 'remote-sess-1'])

    removeCachedSession('offline-sess-1')
    expect(readCachedSessions()).toHaveLength(0)

    upsertCachedPlan({
      id: 'plan-offline-2',
      user_id: 'u-1',
      name: 'Creata Offline',
      created_at: '2026-11-26T12:00:00Z',
      workouts: [],
    } as never)
    expect(findCachedPlan('plan-offline-2')?.name).toBe('Creata Offline')

    const mergedPlans = mergeRemoteAndCachedPlans(
      [{ id: 'plan-1', user_id: 'u-1', name: 'Upper Lower Offline', created_at: '2026-11-20T10:00:00Z', workouts: [] }] as never,
      readCachedPlans(),
      new Set(['plan-offline-2']),
      new Set(['plan-1']),
    )
    expect(mergedPlans.map(p => p.id)).toEqual(['plan-offline-2'])

    removeCachedPlan('plan-offline-2')
    expect(findCachedPlan('plan-offline-2')).toBeUndefined()
  })
})
