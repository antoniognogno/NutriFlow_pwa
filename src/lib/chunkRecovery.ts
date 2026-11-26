import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export const CHUNK_RELOAD_STORAGE_KEY = 'nutriflow:chunk-reload-ts'
export const CHUNK_RELOAD_COOLDOWN_MS = 15_000

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Expected a JavaScript(?:-or-Wasm)? module script/i,
  /is not a valid JavaScript MIME type/i,
  /Unable to preload CSS/i,
  /Loading chunk [\w-]+ failed/i,
]

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }
  return ''
}

export function isRecoverableChunkError(error: unknown): boolean {
  const message = getErrorMessage(error)
  if (!message) return false
  return CHUNK_ERROR_PATTERNS.some(pattern => pattern.test(message))
}

export function shouldAttemptAutoReload(params: {
  error: unknown
  isOnline?: boolean
  lastAttemptAt?: number | null
  now?: number
}): boolean {
  const { error, isOnline = true, lastAttemptAt = null, now = Date.now() } = params
  if (!isOnline) return false
  if (!isRecoverableChunkError(error)) return false
  if (typeof lastAttemptAt === 'number' && Number.isFinite(lastAttemptAt)) {
    return now - lastAttemptAt > CHUNK_RELOAD_COOLDOWN_MS
  }
  return true
}

export function readLastChunkReloadAttempt(storage?: Pick<Storage, 'getItem'> | null): number | null {
  try {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
    if (!store) return null
    const raw = store.getItem(CHUNK_RELOAD_STORAGE_KEY)
    if (!raw) return null
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function markChunkReloadAttempt(
  storage?: Pick<Storage, 'setItem'> | null,
  now: number = Date.now(),
): void {
  try {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
    store?.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now))
  } catch {
    // Ignore storage restriction on private mode
  }
}

export function clearChunkReloadAttempt(storage?: Pick<Storage, 'removeItem'> | null): void {
  try {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
    store?.removeItem(CHUNK_RELOAD_STORAGE_KEY)
  } catch {
    // Ignore storage error
  }
}

export function isNavigatorOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : true
}

export function triggerSingleAssetReload(options?: {
  reloadFn?: () => void
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
  now?: number
  isOnline?: boolean
}): boolean {
  const now = options?.now ?? Date.now()
  const isOnline = options?.isOnline ?? isNavigatorOnline()
  if (!isOnline) return false

  const lastAttempt = readLastChunkReloadAttempt(options?.storage)
  if (typeof lastAttempt === 'number' && now - lastAttempt <= CHUNK_RELOAD_COOLDOWN_MS) {
    return false
  }

  markChunkReloadAttempt(options?.storage, now)
  if (options?.reloadFn) {
    options.reloadFn()
  } else if (typeof window !== 'undefined') {
    window.location.reload()
  }
  return true
}

/**
 * Wraps React.lazy so stale hashed PWA chunks after a deployment trigger a single
 * safe reload instead of unmounting the tree into a blank white screen.
 */
export function lazyWithRetry<T extends ComponentType<{}>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await importer()
      clearChunkReloadAttempt()
      return mod
    } catch (error) {
      const isOnline = isNavigatorOnline()
      const lastAttemptAt = readLastChunkReloadAttempt()
      if (shouldAttemptAutoReload({ error, isOnline, lastAttemptAt })) {
        const reloaded = triggerSingleAssetReload({ isOnline })
        if (reloaded) {
          return new Promise<{ default: T }>(() => {})
        }
      }
      throw error
    }
  })
}

let installed = false

export function installGlobalErrorRecovery(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('vite:preloadError', event => {
    event.preventDefault()
    const isOnline = isNavigatorOnline()
    const lastAttemptAt = readLastChunkReloadAttempt()
    const preloadPayload = (event as { payload?: unknown }).payload ?? 'Unable to preload'
    if (shouldAttemptAutoReload({ error: preloadPayload, isOnline, lastAttemptAt })) {
      triggerSingleAssetReload({ isOnline })
    }
  })

  window.addEventListener('unhandledrejection', event => {
    const isOnline = isNavigatorOnline()
    const lastAttemptAt = readLastChunkReloadAttempt()
    if (shouldAttemptAutoReload({ error: event.reason, isOnline, lastAttemptAt })) {
      event.preventDefault()
      triggerSingleAssetReload({ isOnline })
    }
  })
}
