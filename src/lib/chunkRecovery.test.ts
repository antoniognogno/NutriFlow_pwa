import { describe, expect, it, vi } from 'vitest'
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_STORAGE_KEY,
  clearChunkReloadAttempt,
  isRecoverableChunkError,
  readLastChunkReloadAttempt,
  shouldAttemptAutoReload,
  triggerSingleAssetReload,
} from './chunkRecovery'

function createMemoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  }
}

describe('chunkRecovery (mobile white-screen prevention)', () => {
  it('recognizes stale PWA dynamic import / chunk load errors', () => {
    expect(isRecoverableChunkError(new TypeError('Failed to fetch dynamically imported module: https://app/assets/x.js'))).toBe(true)
    expect(isRecoverableChunkError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isRecoverableChunkError(new Error('ChunkLoadError: Loading chunk 42 failed.'))).toBe(true)
    expect(isRecoverableChunkError(new Error('Unable to preload CSS for /assets/style.css'))).toBe(true)
    expect(isRecoverableChunkError(new Error('Validation error: reps must be positive'))).toBe(false)
  })

  it('allows single auto-reload when online and outside cooldown, preventing infinite reload loops', () => {
    const err = new Error('Failed to fetch dynamically imported module')
    const now = 1_700_000_000_000

    expect(shouldAttemptAutoReload({ error: err, isOnline: true, lastAttemptAt: null, now })).toBe(true)
    expect(shouldAttemptAutoReload({ error: err, isOnline: false, lastAttemptAt: null, now })).toBe(false)
    expect(shouldAttemptAutoReload({ error: err, isOnline: true, lastAttemptAt: now - 3_000, now })).toBe(false)
    expect(
      shouldAttemptAutoReload({
        error: err,
        isOnline: true,
        lastAttemptAt: now - CHUNK_RELOAD_COOLDOWN_MS - 1,
        now,
      }),
    ).toBe(true)
  })

  it('tracks reload timestamp in sessionStorage so consecutive triggers within cooldown do not loop', () => {
    const storage = createMemoryStorage()
    const reloadFn = vi.fn()
    const t0 = 1_700_000_000_000

    const first = triggerSingleAssetReload({ reloadFn, storage, now: t0 })
    const second = triggerSingleAssetReload({ reloadFn, storage, now: t0 + 2_000 })

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(reloadFn).toHaveBeenCalledTimes(1)
    expect(readLastChunkReloadAttempt(storage)).toBe(t0)

    clearChunkReloadAttempt(storage)
    expect(storage.getItem(CHUNK_RELOAD_STORAGE_KEY)).toBeNull()
  })
})
