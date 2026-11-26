import { liveQuery } from 'dexie'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { flushDirtyCloudState, pullCloudStateIfNewer } from './cloudStateSync'
import { enqueueUpsert, offlineDatabase, type OutboxInput } from './database'

let syncInProgress = false

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
    case 'water_logs':
      return supabase.from('water_logs').insert(item.payload)
  }
}

export async function syncPendingChanges(
  supabase: ReturnType<typeof createClient> = createClient(),
): Promise<number> {
  if (syncInProgress || !navigator.onLine) return 0
  syncInProgress = true
  let syncedCount = 0

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) return 0

    const queued = await offlineDatabase.outbox
      .where('userId')
      .equals(user.id)
      .sortBy('createdAt')

    for (const item of queued) {
      try {
        const { error } = await syncItem(supabase, item)
        if (error) throw error
        await offlineDatabase.outbox.delete(item.id)
        syncedCount += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Errore di sincronizzazione sconosciuto.'
        await offlineDatabase.outbox.update(item.id, {
          attempts: item.attempts + 1,
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

  return { isOnline, pendingCount, lastError }
}

export async function queueAndSync(item: OutboxInput): Promise<void> {
  await offlineDatabase.transaction('rw', offlineDatabase.outbox, async () => {
    await enqueueUpsert(item)
  })

  if (navigator.onLine) {
    await syncPendingChanges()
  }
}
