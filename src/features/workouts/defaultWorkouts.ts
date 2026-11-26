import { readWorkoutPresets } from './presetStorage'

export type DefaultExercise = {
  id: string
  workout_id: string
  exercise_name: string
  target_sets: number | null
  target_reps: string | null
  order: number
}

export type DefaultWorkout = {
  id: string
  name: string
  subtitle: string
  workout_exercises: DefaultExercise[]
}

export const DEFAULT_WORKOUTS: DefaultWorkout[] = [
  {
    id: 'preset-push',
    name: 'Push · Petto, Spalle, Tricipiti',
    subtitle: '4 esercizi · ~45 min',
    workout_exercises: [
      { id: 'preset-push-bench', workout_id: 'preset-push', exercise_name: 'Panca Piana Bilanciere', target_sets: 4, target_reps: '8', order: 1 },
      { id: 'preset-push-ohp', workout_id: 'preset-push', exercise_name: 'Military Press Manubri', target_sets: 3, target_reps: '10', order: 2 },
      { id: 'preset-push-lat', workout_id: 'preset-push', exercise_name: 'Alzate Laterali', target_sets: 3, target_reps: '12', order: 3 },
      { id: 'preset-push-tri', workout_id: 'preset-push', exercise_name: 'Pushdown Tricipiti Cavo', target_sets: 3, target_reps: '12', order: 4 },
    ],
  },
  {
    id: 'preset-pull',
    name: 'Pull · Schiena, Bicipiti',
    subtitle: '4 esercizi · ~45 min',
    workout_exercises: [
      { id: 'preset-pull-lat', workout_id: 'preset-pull', exercise_name: 'Lat Machine / Trazioni', target_sets: 4, target_reps: '8', order: 1 },
      { id: 'preset-pull-row', workout_id: 'preset-pull', exercise_name: 'Rematore Manubrio', target_sets: 3, target_reps: '10', order: 2 },
      { id: 'preset-pull-face', workout_id: 'preset-pull', exercise_name: 'Face Pull', target_sets: 3, target_reps: '15', order: 3 },
      { id: 'preset-pull-curl', workout_id: 'preset-pull', exercise_name: 'Curl Bilanciere / Manubri', target_sets: 3, target_reps: '10', order: 4 },
    ],
  },
  {
    id: 'preset-legs',
    name: 'Legs · Gambe & Core',
    subtitle: '4 esercizi · ~50 min',
    workout_exercises: [
      { id: 'preset-legs-squat', workout_id: 'preset-legs', exercise_name: 'Squat / Leg Press', target_sets: 4, target_reps: '8', order: 1 },
      { id: 'preset-legs-rdl', workout_id: 'preset-legs', exercise_name: 'Romanian Deadlift', target_sets: 3, target_reps: '10', order: 2 },
      { id: 'preset-legs-curl', workout_id: 'preset-legs', exercise_name: 'Leg Curl', target_sets: 3, target_reps: '12', order: 3 },
      { id: 'preset-legs-calf', workout_id: 'preset-legs', exercise_name: 'Calf Raise', target_sets: 3, target_reps: '15', order: 4 },
    ],
  },
]

export function findDefaultWorkout(workoutId: string): DefaultWorkout | undefined {
  return (
    readWorkoutPresets().find(item => item.id === workoutId) ??
    DEFAULT_WORKOUTS.find(item => item.id === workoutId)
  )
}
