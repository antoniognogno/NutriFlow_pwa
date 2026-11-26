import { createClient as createSupabaseClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { LifeFlowDatabase } from '@/features/core/database'

let supabaseClient: SupabaseClient<LifeFlowDatabase> | undefined

/**
 * Reads the locally persisted Supabase session synchronously from localStorage
 * so mobile PWA cold starts do not block on Web Locks or slow token refreshes.
 */
export function readStoredSupabaseSession(
  storage?: Pick<Storage, 'length' | 'key' | 'getItem'> | null,
): { user: { id: string; email?: string }; access_token: string } | null {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
    if (!store) return null

    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i)
      if (!key || !/^sb-.*-auth-token$/.test(key)) continue
      const raw = store.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as {
        access_token?: unknown
        user?: { id?: unknown; email?: unknown }
        currentSession?: {
          access_token?: unknown
          user?: { id?: unknown; email?: unknown }
        }
      }
      const candidate = parsed?.currentSession ?? parsed
      if (
        candidate &&
        typeof candidate.access_token === 'string' &&
        candidate.access_token.length > 0 &&
        candidate.user &&
        typeof candidate.user.id === 'string' &&
        candidate.user.id.length > 0
      ) {
        return {
          access_token: candidate.access_token,
          user: {
            id: candidate.user.id,
            email: typeof candidate.user.email === 'string' ? candidate.user.email : undefined,
          },
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function getSessionWithTimeout(
  client: Pick<SupabaseClient<LifeFlowDatabase>, 'auth'> = createClient(),
  timeoutMs: number = 3500,
): Promise<{ session: Session | null; timedOut: boolean; error: Error | null }> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      client.auth.getSession().then(res => ({
        session: res.data.session,
        timedOut: false,
        error: res.error,
      })),
      new Promise<{ session: Session | null; timedOut: boolean; error: Error | null }>(resolve => {
        timer = setTimeout(() => {
          resolve({ session: null, timedOut: true, error: null })
        }, timeoutMs)
      }),
    ])
    return result
  } catch (err) {
    return {
      session: null,
      timedOut: false,
      error: err instanceof Error ? err : new Error('Errore lettura sessione'),
    }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

export function createClient(): SupabaseClient<LifeFlowDatabase> {
  if (supabaseClient) return supabaseClient

  const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY per avviare LifeFlow.')
  }

  supabaseClient = createSupabaseClient<LifeFlowDatabase>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      // Avoid navigator.locks deadlocks on suspended mobile PWA WebViews
      lock: async (_name, _acquireTimeout, fn) => await fn(),
    },
  })
  return supabaseClient
}
