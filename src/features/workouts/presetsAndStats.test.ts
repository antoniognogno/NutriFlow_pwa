import { describe, expect, it } from 'vitest'
import { createCardioPreset, createWorkoutPreset } from './presetStorage'
import { buildExerciseProgressionFromSets, buildWeeklyVolumeFromSets } from './statsUtils'

describe('Workout Presets & Stats Helpers', () => {
  it('creates custom cardio and workout presets with valid structure', () => {
    const cardio = createCardioPreset('Lungo argine', 12, 66)
    expect(cardio.id).toMatch(/^custom-run-/)
    expect(cardio.label).toBe('Lungo argine')
    expect(cardio.isCustom).toBe(true)

    const workout = createWorkoutPreset('Upper Rapido', ['Panca Piana', 'Rematore'])
    expect(workout.id).toMatch(/^preset-custom-/)
    expect(workout.workout_exercises).toHaveLength(2)
    expect(workout.workout_exercises[0].exercise_name).toBe('Panca Piana')
  })

  it('aggregates weekly volume and per-exercise max weight from workout_sets', () => {
    const sets = [
      { exercise_name: 'Panca Piana', reps: 8, weight_kg: 80, completed_at: '2026-11-24T10:00:00Z' },
      { exercise_name: 'Panca Piana', reps: 6, weight_kg: 85, completed_at: '2026-11-24T10:05:00Z' },
      { exercise_name: 'Squat', reps: 5, weight_kg: 100, completed_at: '2026-11-25T10:00:00Z' },
    ]
    const weekly = buildWeeklyVolumeFromSets(sets)
    expect(weekly).toHaveLength(1)
    expect(weekly[0].total_volume).toBe(8 * 80 + 6 * 85 + 5 * 100)

    const prog = buildExerciseProgressionFromSets(sets, 'panca piana')
    expect(prog).toEqual([{ completed_date: '2026-11-24', max_weight: 85 }])
  })
})
