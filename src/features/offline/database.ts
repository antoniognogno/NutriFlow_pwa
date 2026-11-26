import Dexie, { type Table } from 'dexie'
import type { LifeFlowDatabase } from '@/features/core/database'
import type { PlanWithWorkoutsAndExercises } from '@/lib/supabase/types'

type AppTables = LifeFlowDatabase['public']['Tables']

type OutboxItem =
  | {
      id: string
      userId: string
      table: 'workout_sessions'
      conflictTarget: 'id'
      payload: AppTables['workout_sessions']['Insert']
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'workout_sets'
      conflictTarget: 'id'
      payload: AppTables['workout_sets']['Insert']
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'focus_sessions'
      conflictTarget: 'id'
      payload: AppTables['focus_sessions']['Insert']
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'creatine_logs'
      conflictTarget: 'user_id,log_date'
      payload: AppTables['creatine_logs']['Insert']
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'life_events'
      conflictTarget: 'id'
      payload: AppTables['life_events']['Insert']
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'meal_logs'
      conflictTarget: 'id'
      payload: AppTables['meal_logs']['Insert']
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'meal_logs_delete'
      payload: { id: string }
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'water_logs'
      conflictTarget?: never
      payload: AppTables['water_logs']['Insert']
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'water_logs_update'
      payload: {
        id: number
        user_id: string
        amount_ml: number
        created_at: string
      }
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'water_logs_delete'
      payload: { id: number }
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'water_logs_reset_day'
      payload: {
        start_iso: string
        end_iso: string
      }
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'profiles'
      conflictTarget: 'id'
      payload: AppTables['profiles']['Insert']
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'profiles_water_goal'
      payload: {
        water_goal_ml: number
        updated_at: string
      }
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'workout_plans_sync'
      payload: {
        plan: PlanWithWorkoutsAndExercises
      }
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'workout_plans_delete'
      payload: {
        plan_id: string
      }
      createdAt: number
      attempts: number
      lastError?: string
    }
  | {
      id: string
      userId: string
      table: 'workout_sessions_delete'
      payload: {
        session_id: string
      }
      createdAt: number
      attempts: number
      lastError?: string
    }

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type OutboxInput = DistributiveOmit<OutboxItem, 'createdAt' | 'attempts' | 'lastError'>

class LifeFlowOfflineDatabase extends Dexie {
  outbox!: Table<OutboxItem, string>

  constructor() {
    super('lifeflow-offline')
    this.version(1).stores({
      outbox: 'id, userId, table, createdAt',
    })
  }
}

export const offlineDatabase = new LifeFlowOfflineDatabase()

export async function enqueueUpsert(item: OutboxInput): Promise<void> {
  await offlineDatabase.outbox.put({
    ...item,
    createdAt: Date.now(),
    attempts: 0,
  } as OutboxItem)
}
