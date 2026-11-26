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

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}))

import { queueAndSync, syncPendingChanges } from './useOfflineSync'

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
})
