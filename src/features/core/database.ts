import type { Database } from '@/lib/supabase/types'

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type LifeFlowDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Views'> & {
    Tables: Database['public']['Tables'] & {
      workout_sessions: TableShape<{
        id: string
        user_id: string
        workout_id: string | null
        workout_name: string
        started_at: string
        ended_at: string | null
        duration_seconds: number
        created_at: string
      }, {
        id: string
        user_id: string
        workout_id?: string | null
        workout_name: string
        started_at: string
        ended_at?: string | null
        duration_seconds?: number
        created_at?: string
      }>
      workout_sets: TableShape<{
        id: string
        user_id: string
        session_id: string
        exercise_id: string | null
        exercise_name: string
        set_number: number
        reps: number
        weight_kg: number
        completed_at: string
      }, {
        id: string
        user_id: string
        session_id: string
        exercise_id?: string | null
        exercise_name: string
        set_number: number
        reps: number
        weight_kg: number
        completed_at: string
      }>
      focus_sessions: TableShape<{
        id: string
        user_id: string
        label: string
        mode: 'pomodoro' | 'block'
        started_at: string
        ended_at: string
        duration_seconds: number
        created_at: string
      }, {
        id: string
        user_id: string
        label?: string
        mode: 'pomodoro' | 'block'
        started_at: string
        ended_at: string
        duration_seconds: number
        created_at?: string
      }>
      creatine_logs: TableShape<{
        id: string
        user_id: string
        log_date: string
        amount_g: number
        created_at: string
      }, {
        id: string
        user_id: string
        log_date: string
        amount_g: number
        created_at?: string
      }>
      life_events: TableShape<{
        id: string
        user_id: string
        title: string
        category: string
        starts_at: string
        ends_at: string | null
        notes: string | null
        created_at: string
      }, {
        id: string
        user_id: string
        title: string
        category: string
        starts_at: string
        ends_at?: string | null
        notes?: string | null
        created_at?: string
      }>
      meal_logs: TableShape<{
        id: string
        user_id: string
        meal_name: string
        description: string
        calories: number
        protein_g: number
        carbs_g: number
        fats_g: number
        logged_at: string
        created_at: string
      }, {
        id: string
        user_id: string
        meal_name: string
        description?: string
        calories: number
        protein_g: number
        carbs_g: number
        fats_g: number
        logged_at: string
        created_at?: string
      }>
    }
    Views: Database['public']['Views'] & {
      latest_exercise_performance: {
        Row: {
          user_id: string
          exercise_key: string
          exercise_id: string | null
          exercise_name: string
          weight_kg: number
          reps: number
          performed_at: string
          max_weight_kg: number
        }
        Relationships: []
      }
    }
  }
}
