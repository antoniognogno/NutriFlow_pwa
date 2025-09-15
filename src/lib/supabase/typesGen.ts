export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      exercise_logs: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          log_id: string
          reps: number
          set_number: number
          user_id: string | null
          weight_kg: number
          workout_exercise_id: string | null
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          log_id: string
          reps: number
          set_number: number
          user_id?: string | null
          weight_kg: number
          workout_exercise_id?: string | null
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          log_id?: string
          reps?: number
          set_number?: number
          user_id?: string | null
          weight_kg?: number
          workout_exercise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allergies: string[] | null
          diet_type: string | null
          disliked_foods: string[] | null
          goals: string | null
          id: string
          updated_at: string | null
          username: string | null
          water_goal_ml: number | null
        }
        Insert: {
          allergies?: string[] | null
          diet_type?: string | null
          disliked_foods?: string[] | null
          goals?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          water_goal_ml?: number | null
        }
        Update: {
          allergies?: string[] | null
          diet_type?: string | null
          disliked_foods?: string[] | null
          goals?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          water_goal_ml?: number | null
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          exercise_name: string
          id: string
          order: number
          target_reps: string | null
          target_sets: number | null
          workout_id: string
        }
        Insert: {
          exercise_name: string
          id?: string
          order?: number
          target_reps?: string | null
          target_sets?: number | null
          workout_id: string
        }
        Update: {
          exercise_name?: string
          id?: string
          order?: number
          target_reps?: string | null
          target_sets?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed_at: string | null
          id: string
          notes: string | null
          started_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          id: string
          muscle_group: string | null
          name: string
          plan_id: string
        }
        Insert: {
          id?: string
          muscle_group?: string | null
          name: string
          plan_id: string
        }
        Update: {
          id?: string
          muscle_group?: string | null
          name?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_workout_plan: {
        Args: { plan_id_param: string }
        Returns: undefined
      }
      get_exercise_progression: {
        Args: { p_exercise_name: string }
        Returns: {
          completed_date: string
          max_weight: number
        }[]
      }
      get_last_exercise_log: {
        Args: { p_exercise_id: string }
        Returns: Json
      }
      get_user_workout_plans: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_weekly_volume_trend: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_volume: number
          week_start: string
        }[]
      }
      get_workout_details: {
        Args: { p_workout_id: string }
        Returns: Json
      }
      get_workout_heatmap_data: {
        Args: { end_date: string; start_date: string }
        Returns: {
          count: number
          date: string
        }[]
      }
      insert_exercise_logs: {
        Args: { logs: Json }
        Returns: undefined
      }
      insert_workout: {
        Args: { p_name: string; p_plan_id: string }
        Returns: string
      }
      insert_workout_exercises: {
        Args: {
          p_exercises: Database["public"]["CompositeTypes"]["exercise_insert_type"][]
        }
        Returns: undefined
      }
      log_workout_session: {
        Args: { p_exercise_logs: Json; p_workout_id: string }
        Returns: string
      }
      save_workout_session: {
        Args: {
          p_sets: Database["public"]["CompositeTypes"]["set_log_type"][]
          p_workout_id: string
        }
        Returns: string
      }
      update_workout_plan: {
        Args: {
          p_plan_id: string
          p_plan_name: string
          p_workouts: Database["public"]["CompositeTypes"]["workout_update_type"][]
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      exercise_insert_type: {
        workout_id: string | null
        exercise_name: string | null
        target_sets: number | null
        target_reps: string | null
        order: number | null
      }
      set_log_type: {
        workout_exercise_id: string | null
        exercise_name: string | null
        set_number: number | null
        reps: number | null
        weight_kg: number | null
      }
      workout_update_type: {
        id: string | null
        name: string | null
        exercises: Json | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const


