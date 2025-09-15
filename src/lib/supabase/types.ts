import type { Database as DB } from './typesGen';

// Passo 2: Crea dei "tipi alias" più semplici per le tabelle che usiamo spesso.
// Questo rende il codice più leggibile.
export type Profile = DB['public']['Tables']['profiles']['Row'];
export type WorkoutPlan = DB['public']['Tables']['workout_plans']['Row'];
export type Workout = DB['public']['Tables']['workouts']['Row'];
export type WorkoutExercise = DB['public']['Tables']['workout_exercises']['Row'];
export type WaterLog = DB['public']['Tables']['water_logs']['Row'];
export type ExerciseLog = DB['public']['Tables']['exercise_logs']['Row'];

// Passo 3: Definisci ed ESPORTA il nostro tipo custom complesso.
// Questo è il tipo che risolve l'errore di build.
// Stiamo dicendo: "Un WorkoutPlan, che inoltre ha una proprietà 'workouts'.
// Ogni 'workout' è un normale Workout, che inoltre ha una proprietà 'workout_exercises'".
export type PlanWithWorkoutsAndExercises = WorkoutPlan & {
  workouts: (Workout & {
    workout_exercises: WorkoutExercise[];
  })[];
};

