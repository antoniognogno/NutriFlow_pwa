import { createClient } from '@/lib/supabase/client'

const DIRTY_KEY = 'nutriflow:cloud-sync-dirty'
const UPDATED_AT_KEY = 'nutriflow:cloud-sync-updated-at'

const SYNCED_STORAGE_KEYS = [
  'nutriflow:body-profile-v1',
  'nutriflow:weekly-workout-goal',
  'nutriflow:habits-v1',
  'nutriflow:habit-logs-v1',
  'nutriflow:weight-logs-v1',
  'nutriflow:water-presets-v1',
  'nutriflow:workout-presets-v2',
  'nutriflow:cardio-presets-v2',
  'nutriflow:trash-v1',
  'nutriflow:exercise-notes-v1',
  'nutriflow:routine-reminder-v1',
  'nutriflow:avatar-v1',
] as const

export interface CloudSnapshot {
  updatedAt: string
  entries: Record<string, string>
}

let pushTimer: number | null = null

export function buildLocalCloudSnapshot(updatedAt = new Date().toISOString()): CloudSnapshot {
  const entries: Record<string, string> = {}
  for (const key of SYNCED_STORAGE_KEYS) {
    try {
      const value = localStorage.getItem(key)
      if (value !== null) {
        entries[key] = value
      }
    } catch {
      // Ignore storage access issues
    }
  }
  return { updatedAt, entries }
}

export function isCloudStateDirty(): boolean {
  try {
    return localStorage.getItem(DIRTY_KEY) === '1'
  } catch {
    return false
  }
}

export async function pushCloudState(
  supabase = createClient(),
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return false

    const localTs = localStorage.getItem(UPDATED_AT_KEY) ?? new Date().toISOString()
    const snapshot = buildLocalCloudSnapshot(localTs)
    const { error } = await supabase.auth.updateUser({
      data: { nutriflow_sync: snapshot },
    })
    if (error) return false
    localStorage.setItem(DIRTY_KEY, '0')
    localStorage.setItem(UPDATED_AT_KEY, snapshot.updatedAt)
    return true
  } catch {
    return false
  }
}

export function markCloudStateDirty(): void {
  try {
    const nowIso = new Date().toISOString()
    localStorage.setItem(UPDATED_AT_KEY, nowIso)
    localStorage.setItem(DIRTY_KEY, '1')
  } catch {
    return
  }

  if (typeof window === 'undefined') return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  if (pushTimer !== null) {
    window.clearTimeout(pushTimer)
  }
  pushTimer = window.setTimeout(() => {
    pushTimer = null
    void pushCloudState()
  }, 900)
}

export async function flushDirtyCloudState(
  supabase = createClient(),
): Promise<boolean> {
  if (!isCloudStateDirty()) return false
  return pushCloudState(supabase)
}

export async function pullCloudStateIfNewer(
  supabase = createClient(),
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  if (isCloudStateDirty()) {
    await pushCloudState(supabase)
    return false
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const cloud = session?.user?.user_metadata?.nutriflow_sync as CloudSnapshot | undefined
    if (!cloud || !cloud.updatedAt || !cloud.entries) return false

    const localTs = localStorage.getItem(UPDATED_AT_KEY)
    if (localTs && cloud.updatedAt <= localTs) return false

    for (const key of SYNCED_STORAGE_KEYS) {
      if (typeof cloud.entries[key] === 'string') {
        localStorage.setItem(key, cloud.entries[key])
      }
    }
    localStorage.setItem(UPDATED_AT_KEY, cloud.updatedAt)
    localStorage.setItem(DIRTY_KEY, '0')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nutriflow:data-updated'))
    }
    return true
  } catch {
    return false
  }
}
