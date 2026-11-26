import Dexie, { type Table } from 'dexie'
import type { LifeFlowDatabase } from '@/features/core/database'

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
      table: 'water_logs'
      conflictTarget?: never
      payload: AppTables['water_logs']['Insert']
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
