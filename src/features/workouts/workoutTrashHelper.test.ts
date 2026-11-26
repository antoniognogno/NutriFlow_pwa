import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readTrashItems } from '@/features/trash/trashStore'
import type { EditableSession, EditableSet } from './SessionEditor'
import { mergeRemoteAndCachedSessions } from './workoutOfflineCache'
import { moveWorkoutSessionToTrash, type TrashSessionSupabaseLike } from './workoutTrashHelper'

const memoryStorage = new Map<string, string>()

const sampleSession: EditableSession = {
  id: 'sess-1',
  user_id: 'user-1',
  workout_id: 'wk-1',
  workout_name: 'Push A',
  started_at: '2026-11-26T10:00:00.000Z',
  ended_at: '2026-11-26T10:50:00.000Z',
  duration_seconds: 3000,
}

const sampleSet: EditableSet = {
  id: 'set-1',
  user_id: 'user-1',
  session_id: 'sess-1',
  exercise_id: 'ex-1',
  exercise_name: 'Panca Piana con Bilanciere',
  set_number: 1,
  reps: 8,
  weight_kg: 80,
  completed_at: '2026-11-26T10:15:00.000Z',
}

describe('workoutTrashHelper', () => {
  beforeEach(() => {
    memoryStorage.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, val: string) => {
          memoryStorage.set(key, val)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })
  })

  it('deletes workout_sets before workout_sessions when online and moves session into 30-day trash', async () => {
    const deleteOrder: string[] = []
    const queueDelete = vi.fn(async () => {})
    const deleteOutboxIds = vi.fn(async () => {})
    const removeSessionFromCache = vi.fn()

    const supabase: TrashSessionSupabaseLike = {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }),
      },
      from: (table) => ({
        select: () => ({
          eq: async () => ({ data: [sampleSet], error: null }),
        }),
        delete: () => ({
          eq: () => {
            const p = Promise.resolve({ error: null as unknown })
            return {
              eq: async () => {
                deleteOrder.push(table)
                return { error: null as unknown }
              },
              then: p.then.bind(p),
            }
          },
        }),
      }),
    }

    const outcome = await moveWorkoutSessionToTrash(sampleSession, {
      supabase,
      isOnline: true,
      readOutbox: async () => [],
      deleteOutboxIds,
      queueDelete,
      readCachedSets: () => [],
      removeSessionFromCache,
    })

    expect(outcome).toBe('synced')
    expect(deleteOrder).toEqual(['workout_sets', 'workout_sessions'])
    expect(queueDelete).not.toHaveBeenCalled()
    expect(deleteOutboxIds).toHaveBeenCalledWith(['workout_sessions:sess-1', 'workout_sets:set-1'])
    expect(removeSessionFromCache).toHaveBeenCalledWith('sess-1')

    const trashed = readTrashItems()
    expect(trashed).toHaveLength(1)
    expect(trashed[0].id).toBe('workout_session:sess-1')
    expect(trashed[0].kind === 'workout_session' && trashed[0].sets).toHaveLength(1)
  })

  it('falls back to local trash + queued outbox delete if Supabase delete fails', async () => {
    const queueDelete = vi.fn(async () => {})

    const supabase: TrashSessionSupabaseLike = {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }),
      },
      from: (table) => ({
        select: () => ({
          eq: async () => ({ data: null, error: { message: 'timeout' } }),
        }),
        delete: () => ({
          eq: () => {
            const fail: unknown = table === 'workout_sessions' ? { message: 'FK/RLS blocked' } : null
            const p = Promise.resolve({ error: fail })
            return {
              eq: async () => ({ error: fail }),
              then: p.then.bind(p),
            }
          },
        }),
      }),
    }

    const outcome = await moveWorkoutSessionToTrash(sampleSession, {
      supabase,
      isOnline: true,
      readOutbox: async () => [],
      deleteOutboxIds: async () => {},
      queueDelete,
      readCachedSets: () => [sampleSet],
      removeSessionFromCache: () => {},
    })

    expect(outcome).toBe('queued')
    expect(queueDelete).toHaveBeenCalledWith('user-1', 'sess-1')
    expect(readTrashItems()).toHaveLength(1)
  })

  it('queues offline deletion and excludes pending-deleted sessions from merged lists', async () => {
    const queueDelete = vi.fn(async () => {})

    const supabase: TrashSessionSupabaseLike = {
      auth: { getSession: async () => ({ data: { session: null } }) },
      from: () => {
        throw new Error('Should not hit Supabase while offline')
      },
    }

    const outcome = await moveWorkoutSessionToTrash(sampleSession, {
      supabase,
      isOnline: false,
      readOutbox: async () => [],
      deleteOutboxIds: async () => {},
      queueDelete,
      readCachedSets: () => [sampleSet],
      removeSessionFromCache: () => {},
    })

    expect(outcome).toBe('offline')
    expect(queueDelete).toHaveBeenCalledWith('user-1', 'sess-1')

    const merged = mergeRemoteAndCachedSessions([sampleSession], [sampleSession], new Set(), new Set(['sess-1']))
    expect(merged).toHaveLength(0)
  })
})
