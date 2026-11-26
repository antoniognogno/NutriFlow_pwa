import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { OutboxInput } from './database'

const mockPut = vi.fn().mockResolvedValue(undefined)
const mockDelete = vi.fn().mockResolvedValue(undefined)
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockSortBy = vi.fn().mockResolvedValue([])

vi.mock('./database', () => ({
  enqueueUpsert: (...args: unknown[]) => mockPut(...args),
  offlineDatabase: {
    transaction: async (_mode: string, _table: unknown, cb: () => Promise<void>) => cb(),
    outbox: {
      put: (...args: unknown[]) => mockPut(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      where: () => ({
        equals: () => ({
          sortBy: (...args: unknown[]) => mockSortBy(...args),
        }),
      }),
    },
  },
}))

const createQueryChain = () => {
  const result = { data: [], error: null }
  const chain: Record<string, unknown> = {
    then: (resolve: (val: unknown) => unknown) => Promise.resolve(result).then(resolve),
    upsert: vi.fn().mockImplementation(() => chain),
    insert: vi.fn().mockImplementation(() => chain),
    update: vi.fn().mockImplementation(() => chain),
    delete: vi.fn().mockImplementation(() => chain),
    select: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    in: vi.fn().mockImplementation(() => chain),
    gte: vi.fn().mockImplementation(() => chain),
    lt: vi.fn().mockImplementation(() => chain),
  }
  return chain
}

vi.mock('@/lib/supabase/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/supabase/client')>()
  return {
    ...actual,
    createClient: () => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => createQueryChain()),
    }),
  }
})

import { isPermanentSyncError, MAX_OUTBOX_ATTEMPTS, queueAndSync, syncPendingChanges } from './useOfflineSync'

describe('Offline Sync Outbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { onLine: false })
  })

  it('enqueues items locally even when offline without calling Supabase', async () => {
    const item: OutboxInput = {
      id: 'creatine_logs:user-1:2026-11-25',
      userId: 'user-1',
      table: 'creatine_logs',
      conflictTarget: 'user_id,log_date',
      payload: {
        id: 'c1',
        user_id: 'user-1',
        log_date: '2026-11-25',
        amount_g: 5,
      },
    }

    await queueAndSync(item)
    expect(mockPut).toHaveBeenCalledTimes(1)
    expect(mockPut).toHaveBeenCalledWith(item)
  })

  it('flushes queued outbox items when back online and deletes synced entries', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    mockSortBy.mockResolvedValueOnce([
      {
        id: 'meal_logs:m1',
        userId: 'user-1',
        table: 'meal_logs',
        conflictTarget: 'id',
        payload: {
          id: 'm1',
          user_id: 'user-1',
          meal_name: 'Shake Whey + Banana',
          calories: 230,
          protein_g: 28,
          carbs_g: 26,
          fats_g: 2,
          logged_at: '2026-11-25T10:00:00Z',
        },
        createdAt: 1,
        attempts: 0,
      },
    ])

    await syncPendingChanges()
    expect(mockDelete).toHaveBeenCalledWith('meal_logs:m1')
  })

  it('flushes offline deletes, water resets, profile updates, and custom workout plans', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    mockSortBy.mockResolvedValueOnce([
      {
        id: 'meal_logs_delete:m2',
        userId: 'user-1',
        table: 'meal_logs_delete',
        payload: { id: 'm2' },
        createdAt: 1,
        attempts: 0,
      },
      {
        id: 'water_logs_reset_day:2026-11-26',
        userId: 'user-1',
        table: 'water_logs_reset_day',
        payload: {
          start_iso: '2026-11-26T00:00:00.000Z',
          end_iso: '2026-11-27T00:00:00.000Z',
        },
        createdAt: 2,
        attempts: 0,
      },
      {
        id: 'profiles_water_goal:user-1',
        userId: 'user-1',
        table: 'profiles_water_goal',
        payload: {
          water_goal_ml: 3000,
          updated_at: '2026-11-26T10:00:00.000Z',
        },
        createdAt: 3,
        attempts: 0,
      },
      {
        id: 'workout_plans_sync:plan-offline-1',
        userId: 'user-1',
        table: 'workout_plans_sync',
        payload: {
          plan: {
            id: 'plan-offline-1',
            user_id: 'user-1',
            name: 'Push Pull Offline',
            created_at: '2026-11-26T09:00:00.000Z',
            workouts: [
              {
                id: 'wk-offline-1',
                plan_id: 'plan-offline-1',
                name: 'Push A',
                muscle_group: null,
                workout_exercises: [
                  {
                    id: 'ex-offline-1',
                    workout_id: 'wk-offline-1',
                    exercise_name: 'Panca Piana',
                    target_sets: 4,
                    target_reps: '8',
                    order: 1,
                  },
                ],
              },
            ],
          },
        },
        createdAt: 4,
        attempts: 0,
      },
    ])

    const synced = await syncPendingChanges()
    expect(synced).toBe(4)
    expect(mockDelete).toHaveBeenCalledWith('meal_logs_delete:m2')
    expect(mockDelete).toHaveBeenCalledWith('water_logs_reset_day:2026-11-26')
    expect(mockDelete).toHaveBeenCalledWith('profiles_water_goal:user-1')
    expect(mockDelete).toHaveBeenCalledWith('workout_plans_sync:plan-offline-1')
  })

  it('removes stuck poison-pill outbox entries after max attempts instead of keeping orange pending count forever', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    mockSortBy.mockResolvedValueOnce([
      {
        id: 'workout_sessions_delete:dead-sess',
        userId: 'user-1',
        table: 'workout_sessions_delete',
        payload: { session_id: 'dead-sess' },
        createdAt: 1,
        attempts: MAX_OUTBOX_ATTEMPTS,
      },
    ])

    const synced = await syncPendingChanges()
    expect(synced).toBe(0)
    expect(mockDelete).toHaveBeenCalledWith('workout_sessions_delete:dead-sess')
    expect(isPermanentSyncError({ code: '23503' })).toBe(true)
    expect(isPermanentSyncError({ status: 404 })).toBe(true)
    expect(isPermanentSyncError(new Error('Failed to fetch'))).toBe(false)
  })
})
