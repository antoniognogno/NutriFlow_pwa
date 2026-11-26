import { describe, expect, it } from 'vitest'
import { getSessionWithTimeout, readStoredSupabaseSession } from './client'

function makeStorage(entries: Record<string, string>) {
  const keys = Object.keys(entries)
  return {
    length: keys.length,
    key: (index: number) => keys[index] ?? null,
    getItem: (key: string) => entries[key] ?? null,
  }
}

describe('supabase client session resilience', () => {
  it('reads stored Supabase session synchronously from localStorage without waiting on locks/network', () => {
    const store = makeStorage({
      'nutriflow:theme': 'dark',
      'sb-xyzabc-auth-token': JSON.stringify({
        access_token: 'jwt-abc',
        user: { id: 'user-42', email: 'test@example.com' },
      }),
    })

    const session = readStoredSupabaseSession(store)
    expect(session).toEqual({
      access_token: 'jwt-abc',
      user: { id: 'user-42', email: 'test@example.com' },
    })

    expect(readStoredSupabaseSession(makeStorage({ 'sb-xyz-auth-token': '{bad-json' }))).toBeNull()
  })

  it('bounds hanging getSession calls via timeout so cold start never spins infinitely', async () => {
    const hangingClient = {
      auth: {
        getSession: () => new Promise<never>(() => {}),
      },
    } as unknown as Parameters<typeof getSessionWithTimeout>[0]

    const result = await getSessionWithTimeout(hangingClient, 20)
    expect(result.timedOut).toBe(true)
    expect(result.session).toBeNull()
    expect(result.error).toBeNull()
  })
})
