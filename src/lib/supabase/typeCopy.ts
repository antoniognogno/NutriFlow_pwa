export type PlanWithWorkoutsAndExercises = {
  id: string
  name: string
  created_at: string
  user_id: string
  workouts: Array<{
    id: string
    name: string
    muscle_group: string | null
    plan_id: string
    exercises: Array<{
      id: string
      exercise_name: string
      order: number
      target_reps: string | null
      target_sets: number | null
      workout_id: string
    }>
  }>
}