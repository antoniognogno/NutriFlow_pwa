import { liveQuery } from 'dexie'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient, getSessionWithTimeout, readStoredSupabaseSession } from '@/lib/supabase/client'
import { flushDirtyCloudState, pullCloudStateIfNewer } from './cloudStateSync'
import { enqueueUpsert, offlineDatabase, type OutboxInput } from './database'

export const MAX_OUTBOX_ATTEMPTS = 5
let syncInProgress = false

export function isPermanentSyncError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: unknown; status?: unknown; message?: unknown }
  const code = typeof err.code === 'string' ? err.code : ''
  const status = typeof err.status === 'number' ? err.status : 0
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return true
  }
  if (/^(22|23|42501|42703|42P01|PGRST)/.test(code)) {
    return true
  }
  return false
}

async function syncItem(supabase: ReturnType<typeof createClient>, item: OutboxInput) {
  switch (item.table) {
    case 'workout_sessions':
      return supabase.from('workout_sessions').upsert(item.payload, { onConflict: item.conflictTarget })
    case 'workout_sets':
      return supabase.from('workout_sets').upsert(item.payload, { onConflict: item.conflictTarget })
    case 'focus_sessions':
      return supabase.from('focus_sessions').upsert(item.payload, { onConflict: item.conflictTarget })
    case 'creatine_logs':
      return supabase.from('creatine_logs').upsert(item.payload, { onConflict: item.conflictTarget })
    case 'life_events':
      return supabase.from('life_events').upsert(item.payload, { onConflict: item.conflictTarget })
    case 'meal_logs':
      return supabase.from('meal_logs').upsert(item.payload, { onConflict: item.conflictTarget })
    case 'meal_logs_delete':
      return supabase
        .from('meal_logs')
        .delete()
        .eq('id', item.payload.id)
        .eq('user_id', item.userId)
    case 'water_logs':
      return supabase.from('water_logs').insert(item.payload)
    case 'water_logs_delete':
      return supabase
        .from('water_logs')
        .delete()
        .eq('id', item.payload.id)
        .eq('user_id', item.userId)
    case 'water_logs_update': {
      const { data: updatedRows, error: updateError } = await supabase
        .from('water_logs')
        .update({ amount_ml: item.payload.amount_ml })
        .eq('id', item.payload.id)
        .eq('user_id', item.userId)
        .select('id')
      if (!updateError && updatedRows && updatedRows.length > 0) {
        return { error: null }
      }
      const { error: deleteErr } = await supabase
        .from('water_logs')
        .delete()
        .eq('id', item.payload.id)
        .eq('user_id', item.userId)
      if (deleteErr) return { error: deleteErr }
      return supabase.from('water_logs').insert([
        {
          user_id: item.userId,
          amount_ml: item.payload.amount_ml,
          created_at: item.payload.created_at,
        },
      ])
    }
    case 'water_logs_reset_day':
      return supabase
        .from('water_logs')
        .delete()
        .eq('user_id', item.userId)
        .gte('created_at', item.payload.start_iso)
        .lt('created_at', item.payload.end_iso)
    case 'profiles':
      return supabase.from('profiles').upsert(item.payload, { onConflict: item.conflictTarget })
    case 'profiles_water_goal':
      return supabase
        .from('profiles')
        .update({
          water_goal_ml: item.payload.water_goal_ml,
          updated_at: item.payload.updated_at,
        })
        .eq('id', item.userId)
    case 'workout_plans_sync': {
      const { plan } = item.payload
      const { error: planErr } = await supabase
        .from('workout_plans')
        .upsert(
          {
            id: plan.id,
            user_id: item.userId,
            name: plan.name,
            created_at: plan.created_at,
          },
          { onConflict: 'id' },
        )
      if (planErr) return { error: planErr }

      const { data: existingWorkouts, error: existingErr } = await supabase
        .from('workouts')
        .select('id')
        .eq('plan_id', plan.id)
      if (existingErr) return { error: existingErr }

      const existingIds = (existingWorkouts ?? []).map(w => w.id)
      if (existingIds.length > 0) {
        const { error: delExErr } = await supabase
          .from('workout_exercises')
          .delete()
          .in('workout_id', existingIds)
        if (delExErr) return { error: delExErr }

        const { error: delWkErr } = await supabase
          .from('workouts')
          .delete()
          .eq('plan_id', plan.id)
        if (delWkErr) return { error: delWkErr }
      }

      for (const workout of plan.workouts ?? []) {
        const { error: wkErr } = await supabase
          .from('workouts')
          .upsert(
            {
              id: workout.id,
              plan_id: plan.id,
              name: workout.name,
              muscle_group: workout.muscle_group ?? null,
            },
            { onConflict: 'id' },
          )
        if (wkErr) return { error: wkErr }

        const exercises = (workout.workout_exercises ?? []).map((ex, idx) => ({
          id: ex.id,
          workout_id: workout.id,
          exercise_name: ex.exercise_name,
          target_sets: ex.target_sets ?? 3,
          target_reps: ex.target_reps ?? '10',
          order: ex.order ?? idx + 1,
        }))
        if (exercises.length > 0) {
          const { error: exErr } = await supabase
            .from('workout_exercises')
            .upsert(exercises, { onConflict: 'id' })
          if (exErr) return { error: exErr }
        }
      }
      return { error: null }
    }
    case 'workout_plans_delete':
      return supabase
        .from('workout_plans')
        .delete()
        .eq('id', item.payload.plan_id)
        .eq('user_id', item.userId)
    case 'workout_sessions_delete': {
      const { error: setsError } = await supabase
        .from('workout_sets')
        .delete()
        .eq('session_id', item.payload.session_id)
        .eq('user_id', item.userId)
      if (setsError) return { error: setsError }
      return supabase
        .from('workout_sessions')
        .delete()
        .eq('id', item.payload.session_id)
        .eq('user_id', item.userId)
    }
  }
}

async function resolveSyncUserId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const stored = readStoredSupabaseSession()
  try {
    if (typeof supabase.auth?.getSession === 'function') {
      const { session } = await getSessionWithTimeout(supabase, 3000)
      if (session?.user?.id) return session.user.id
    } else if (typeof supabase.auth?.getUser === 'function') {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      if (data?.user?.id) return data.user.id
    }
  } catch (error) {
    if (stored?.user?.id) return stored.user.id
    throw error
  }
  return stored?.user?.id ?? null
}

export async function syncPendingChanges(
  supabase: ReturnType<typeof createClient> = createClient(),
): Promise<number> {
  if (syncInProgress || !navigator.onLine) return 0
  syncInProgress = true
  let syncedCount = 0

  try {
    const userId = await resolveSyncUserId(supabase)
    if (!userId) return 0

    const queued = await offlineDatabase.outbox
      .where('userId')
      .equals(userId)
      .sortBy('createdAt')

    for (const item of queued) {
      if (item.attempts >= MAX_OUTBOX_ATTEMPTS) {
        console.warn(`Rimozione elemento outbox bloccato dopo ${item.attempts} tentativi:`, item.id)
        await offlineDatabase.outbox.delete(item.id)
        continue
      }
      try {
        const { error } = await syncItem(supabase, item)
        if (error) throw error
        await offlineDatabase.outbox.delete(item.id)
        syncedCount += 1
      } catch (error) {
        const nextAttempts = item.attempts + 1
        if (isPermanentSyncError(error) || nextAttempts >= MAX_OUTBOX_ATTEMPTS) {
          console.warn(`Elemento outbox non recuperabile rimosso (${item.table}/${item.id}):`, error)
          await offlineDatabase.outbox.delete(item.id)
          continue
        }
        const message = error instanceof Error ? error.message : 'Errore di sincronizzazione sconosciuto.'
        await offlineDatabase.outbox.update(item.id, {
          attempts: nextAttempts,
          lastError: message,
        })
        console.error(`Sincronizzazione offline fallita (${item.table}/${item.id}):`, error)
        if (!navigator.onLine) break
      }
    }

    const pushedCloud = await flushDirtyCloudState(supabase)
    if (pushedCloud) syncedCount += 1
  } finally {
    syncInProgress = false
  }
  return syncedCount
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    const pendingSubscription = liveQuery(() => offlineDatabase.outbox.count()).subscribe({
      next: count => {
        if (active) setPendingCount(count)
      },
      error: error => {
        console.error('Impossibile leggere la coda offline:', error)
        if (active) setLastError('Impossibile leggere la coda offline.')
      },
    })

    const runSync = async (notifyOnSuccess: boolean) => {
      try {
        const synced = await syncPendingChanges(supabase)
        await pullCloudStateIfNewer(supabase)
        if (notifyOnSuccess) {
          toast.success(
            synced > 0
              ? 'Connessione tornata: tutti i dati locali sono stati sincronizzati!'
              : 'Connessione ripristinata e sincronizzata.',
          )
        }
      } catch (error) {
        console.error('Sincronizzazione offline non riuscita:', error)
        if (active) setLastError('Sincronizzazione in attesa di connessione o autenticazione.')
      }
    }

    const handleOffline = () => {
      if (!active) return
      wasOfflineRef.current = true
      setIsOnline(false)
      toast.warning('Sei offline: tutto viene salvato localmente e verrà sincronizzato al ritorno della rete.')
    }

    const handleOnline = () => {
      if (!active) return
      const returningFromOffline = wasOfflineRef.current
      wasOfflineRef.current = false
      setIsOnline(true)
      void runSync(returningFromOffline)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        void runSync(false)
      }
    })

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    void runSync(false)

    return () => {
      active = false
      pendingSubscription.unsubscribe()
      subscription.unsubscribe()
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const retryNow = async () => {
    if (!navigator.onLine) {
      toast.warning(`Sei offline · ${pendingCount} elementi in coda locale.`)
      return
    }
    try {
      const synced = await syncPendingChanges()
      const remaining = await offlineDatabase.outbox.count()
      setPendingCount(remaining)
      if (remaining === 0) {
        toast.success(
          synced > 0
            ? 'Sincronizzazione completata: tutto aggiornato!'
            : 'Connesso e sincronizzato.',
        )
      } else {
        toast.info(`Rimangono ${remaining} elementi in attesa di sincronizzazione.`)
      }
    } catch {
      toast.error('Sincronizzazione non riuscita al momento.')
    }
  }

  return { isOnline, pendingCount, lastError, retryNow }
}

export async function queueAndSync(item: OutboxInput): Promise<void> {
  await offlineDatabase.transaction('rw', offlineDatabase.outbox, async () => {
    await enqueueUpsert(item)
  })

  if (navigator.onLine) {
    await syncPendingChanges()
  }
}

export async function removeOutboxItem(id: string): Promise<void> {
  await offlineDatabase.outbox.delete(id)
}

export async function updatePendingWaterAmount(id: string, amountMl: number): Promise<void> {
  const existing = await offlineDatabase.outbox.get(id)
  if (!existing || existing.table !== 'water_logs') return
  await offlineDatabase.outbox.update(id, {
    payload: {
      ...existing.payload,
      amount_ml: amountMl,
    },
  })
}

export async function clearPendingTodayWaterOutbox(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<void> {
  const items = await offlineDatabase.outbox.where('userId').equals(userId).toArray()
  const idsToDelete = items
    .filter(item => {
      if (item.table === 'water_logs') {
        const ts = item.payload.created_at ?? ''
        return ts >= startIso && ts < endIso
      }
      if (item.table === 'water_logs_update') {
        const ts = item.payload.created_at
        return ts >= startIso && ts < endIso
      }
      return item.table === 'water_logs_delete'
    })
    .map(item => item.id)
  if (idsToDelete.length > 0) {
    await offlineDatabase.outbox.bulkDelete(idsToDelete)
  }
}
