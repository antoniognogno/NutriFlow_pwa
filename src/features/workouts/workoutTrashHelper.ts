import { enqueueUpsert, offlineDatabase } from '@/features/offline/database'
import { moveToTrash, type SetRowSnapshot } from '@/features/trash/trashStore'
import type { EditableSession, EditableSet } from './SessionEditor'
import { readCachedSetsForSession, removeCachedSession } from './workoutOfflineCache'

export type TrashSessionOutcome = 'synced' | 'offline' | 'queued'

export interface TrashSessionSupabaseLike {
  auth: {
    getSession: () => Promise<{ data: { session: { user?: { id: string } } | null } }>
  }
  from: (table: 'workout_sets' | 'workout_sessions') => {
    select: (columns: string) => {
      eq: (col: string, val: string) => PromiseLike<{ data: unknown[] | null; error: unknown }>
    }
    delete: () => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => PromiseLike<{ error: unknown }>
      } & PromiseLike<{ error: unknown }>
    }
  }
}

export interface TrashSessionDeps {
  supabase: TrashSessionSupabaseLike
  isOnline: boolean
  readOutbox?: (userId: string) => Promise<Array<{ id: string; table: string; payload: unknown }>>
  deleteOutboxIds?: (ids: string[]) => Promise<void>
  queueDelete?: (userId: string, sessionId: string) => Promise<void>
  readCachedSets?: (sessionId: string) => EditableSet[]
  removeSessionFromCache?: (sessionId: string) => void
  saveToTrash?: typeof moveToTrash
}

function deduplicateSets(lists: EditableSet[][]): EditableSet[] {
  const byId = new Map<string, EditableSet>()
  for (const list of lists) {
    for (const row of list) {
      if (row && typeof row.id === 'string') {
        byId.set(row.id, row)
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.set_number - b.set_number)
}

/**
 * Sposta una sessione (con tutte le serie registrate) nel cestino locale (30 giorni),
 * ripulisce cache/outbox pendenti ed elimina la sessione dal cloud o la mette in coda sync.
 */
export async function moveWorkoutSessionToTrash(
  item: EditableSession,
  deps: TrashSessionDeps,
): Promise<TrashSessionOutcome> {
  const readCachedSets = deps.readCachedSets ?? readCachedSetsForSession
  const removeSessionFromCache = deps.removeSessionFromCache ?? removeCachedSession
  const saveToTrash = deps.saveToTrash ?? moveToTrash
  const readOutbox =
    deps.readOutbox ??
    (async (userId: string) => {
      try {
        return await offlineDatabase.outbox.where('userId').equals(userId).toArray()
      } catch {
        return []
      }
    })
  const deleteOutboxIds =
    deps.deleteOutboxIds ??
    (async (ids: string[]) => {
      if (ids.length === 0) return
      await offlineDatabase.outbox.bulkDelete(ids).catch(() => undefined)
    })
  const queueDelete =
    deps.queueDelete ??
    (async (userId: string, sessionId: string) => {
      await enqueueUpsert({
        id: `workout_sessions_delete:${sessionId}`,
        userId,
        table: 'workout_sessions_delete',
        payload: { session_id: sessionId },
      })
    })

  let ownerId = item.user_id
  if (!ownerId) {
    try {
      const { data } = await deps.supabase.auth.getSession()
      ownerId = data.session?.user?.id ?? ''
    } catch {
      ownerId = ''
    }
  }

  const cachedSets = readCachedSets(item.id)
  const outboxRows = ownerId ? await readOutbox(ownerId) : []
  const outboxSets = outboxRows
    .filter(entry => {
      if (entry.table !== 'workout_sets' || !entry.payload || typeof entry.payload !== 'object') {
        return false
      }
      return (entry.payload as { session_id?: string }).session_id === item.id
    })
    .map(entry => entry.payload as EditableSet)

  let remoteSets: EditableSet[] = []
  if (deps.isOnline) {
    try {
      const { data: setsData } = await deps.supabase
        .from('workout_sets')
        .select('id, user_id, session_id, exercise_id, exercise_name, set_number, reps, weight_kg, completed_at')
        .eq('session_id', item.id)
      if (Array.isArray(setsData) && setsData.length > 0) {
        remoteSets = setsData as EditableSet[]
      }
    } catch {
      // Fall back cleanly to local cached/outbox sets snapshot
    }
  }

  const setsSnapshot = deduplicateSets([cachedSets, outboxSets, remoteSets])

  // Remove any pending upsert for this session or its sets before trashing
  const outboxIdsToDelete = [`workout_sessions:${item.id}`, ...setsSnapshot.map(set => `workout_sets:${set.id}`)]
  await deleteOutboxIds(outboxIdsToDelete)

  saveToTrash({
    id: `workout_session:${item.id}`,
    kind: 'workout_session',
    title: item.workout_name,
    subtitle: `${Math.max(1, Math.round((item.duration_seconds || 0) / 60))} min · ${new Date(item.started_at).toLocaleDateString('it-IT')}`,
    session: item,
    sets: setsSnapshot as SetRowSnapshot[],
  })
  removeSessionFromCache(item.id)

  if (!deps.isOnline) {
    if (ownerId) {
      await queueDelete(ownerId, item.id).catch(() => undefined)
    }
    return 'offline'
  }

  try {
    // Delete child sets explicitly first so databases without ON DELETE CASCADE never reject the parent delete
    const setsDeleteQuery = ownerId
      ? deps.supabase.from('workout_sets').delete().eq('session_id', item.id).eq('user_id', ownerId)
      : deps.supabase.from('workout_sets').delete().eq('session_id', item.id)
    const { error: setsError } = await setsDeleteQuery
    if (setsError) {
      console.warn('Impossibile eliminare le serie remote subito, metto in coda sync:', setsError)
      if (ownerId) await queueDelete(ownerId, item.id).catch(() => undefined)
      return 'queued'
    }

    const sessionDeleteQuery = ownerId
      ? deps.supabase.from('workout_sessions').delete().eq('id', item.id).eq('user_id', ownerId)
      : deps.supabase.from('workout_sessions').delete().eq('id', item.id)
    const { error: sessionError } = await sessionDeleteQuery
    if (sessionError) {
      console.warn('Impossibile eliminare la sessione remota subito, metto in coda sync:', sessionError)
      if (ownerId) await queueDelete(ownerId, item.id).catch(() => undefined)
      return 'queued'
    }

    return 'synced'
  } catch (error) {
    console.warn('Errore di rete durante eliminazione sessione, metto in coda sync:', error)
    if (ownerId) await queueDelete(ownerId, item.id).catch(() => undefined)
    return 'queued'
  }
}
