// export type PlanWithWorkoutsAndExercises = {
//   id: string
//   name: string
//   created_at: string
//   user_id: string
//   workouts: Array<{
//     id: string
//     name: string
//     muscle_group: string | null
//     plan_id: string
//     exercises: Array<{
//       id: string
//       exercise_name: string
//       order: number
//       target_reps: string | null
//       target_sets: number | null
//       workout_id: string
//     }>
//   }>
// }


// export type Profile = Database['public']['Tables']['profiles']['Row'];
// export type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row'];
// export type Workout = Database['public']['Tables']['workouts']['Row'];
// export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'];
// export type WaterLog = Database['public']['Tables']['water_logs']['Row'];
// export type ExerciseLog = Database['public']['Tables']['exercise_logs']['Row'];

// // Passo 3: Definisci ed ESPORTA il nostro tipo custom complesso.
// // Questo è il tipo che risolve l'errore di build.
// // Stiamo dicendo: "Un WorkoutPlan, che inoltre ha una proprietà 'workouts'.
// // Ogni 'workout' è un normale Workout, che inoltre ha una proprietà 'workout_exercises'".
// export type PlanWithWorkoutsAndExercises = WorkoutPlan & {
//   workouts: (Workout & {
//     workout_exercises: WorkoutExercise[];
//   })[];
// };