import { markCloudStateDirty } from '@/features/offline/cloudStateSync'
import { DEFAULT_WORKOUTS, type DefaultWorkout } from './defaultWorkouts'

export interface CardioPreset {
  id: string
  label: string
  distanceKm: number
  minutes: number
  isCustom?: boolean
}

export const CARDIO_PRESETS_KEY = 'nutriflow:cardio-presets-v2'
export const WORKOUT_PRESETS_KEY = 'nutriflow:workout-presets-v2'
const LEGACY_CARDIO_KEY = 'nutriflow:cardio-presets'
const LEGACY_WORKOUT_KEY = 'nutriflow:workout-presets'

export const DEFAULT_CARDIO_PRESETS: CardioPreset[] = [
  { id: 'run-5k', label: 'Corsa 5 km', distanceKm: 5, minutes: 28, isCustom: true },
  { id: 'run-10k', label: 'Corsa 10 km', distanceKm: 10, minutes: 56, isCustom: true },
]

export function readCardioPresets(): CardioPreset[] {
  try {
    const raw = localStorage.getItem(CARDIO_PRESETS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as CardioPreset[]
      return Array.isArray(parsed) ? parsed : []
    }
    const legacyRaw = localStorage.getItem(LEGACY_CARDIO_KEY)
    const legacy = legacyRaw ? (JSON.parse(legacyRaw) as CardioPreset[]) : []
    const seeded = [...DEFAULT_CARDIO_PRESETS, ...(Array.isArray(legacy) ? legacy : [])]
    localStorage.setItem(CARDIO_PRESETS_KEY, JSON.stringify(seeded))
    return seeded
  } catch {
    return [...DEFAULT_CARDIO_PRESETS]
  }
}

export function saveCardioPresets(presets: CardioPreset[]): void {
  localStorage.setItem(CARDIO_PRESETS_KEY, JSON.stringify(presets))
  markCloudStateDirty()
}

export function createCardioPreset(label: string, distanceKm: number, minutes: number): CardioPreset {
  const cleanLabel = label.trim() || `Corsa ${distanceKm} km`
  return {
    id: `custom-run-${crypto.randomUUID()}`,
    label: cleanLabel,
    distanceKm,
    minutes,
    isCustom: true,
  }
}

export function readWorkoutPresets(): DefaultWorkout[] {
  try {
    const raw = localStorage.getItem(WORKOUT_PRESETS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DefaultWorkout[]
      return Array.isArray(parsed) ? parsed : []
    }
    const legacyRaw = localStorage.getItem(LEGACY_WORKOUT_KEY)
    const legacy = legacyRaw ? (JSON.parse(legacyRaw) as DefaultWorkout[]) : []
    const seeded = [...(Array.isArray(legacy) ? legacy : []), ...DEFAULT_WORKOUTS]
    localStorage.setItem(WORKOUT_PRESETS_KEY, JSON.stringify(seeded))
    return seeded
  } catch {
    return [...DEFAULT_WORKOUTS]
  }
}

export function saveWorkoutPresets(presets: DefaultWorkout[]): void {
  localStorage.setItem(WORKOUT_PRESETS_KEY, JSON.stringify(presets))
  markCloudStateDirty()
}

export function createWorkoutPreset(
  name: string,
  exerciseNames: string[],
  defaultSets = 3,
  defaultReps = '10',
): DefaultWorkout {
  const id = `preset-custom-${crypto.randomUUID()}`
  const cleanExercises = exerciseNames.map(item => item.trim()).filter(Boolean)
  return {
    id,
    name: name.trim(),
    subtitle: `${cleanExercises.length} esercizi · rapido`,
    workout_exercises: cleanExercises.map((exerciseName, index) => ({
      id: `${id}-ex-${index + 1}`,
      workout_id: id,
      exercise_name: exerciseName,
      target_sets: defaultSets,
      target_reps: defaultReps,
      order: index + 1,
    })),
  }
}

export function updateWorkoutPresetData(
  existing: DefaultWorkout,
  name: string,
  exerciseNames: string[],
): DefaultWorkout {
  const cleanExercises = exerciseNames.map(item => item.trim()).filter(Boolean)
  return {
    ...existing,
    name: name.trim(),
    subtitle: `${cleanExercises.length} esercizi · rapido`,
    workout_exercises: cleanExercises.map((exerciseName, index) => ({
      id: existing.workout_exercises[index]?.id ?? `${existing.id}-ex-${index + 1}`,
      workout_id: existing.id,
      exercise_name: exerciseName,
      target_sets: existing.workout_exercises[index]?.target_sets ?? 3,
      target_reps: existing.workout_exercises[index]?.target_reps ?? '10',
      order: index + 1,
    })),
  }
}
