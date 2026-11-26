export type TimerStatus = 'idle' | 'running' | 'paused' | 'complete'

export interface PersistedTimer {
  status: TimerStatus
  runId: string | null
  startedAt: string | null
  endAt: number | null
  remainingMs: number
  durationMs: number
  completedAt: string | null
}

export const idleTimer = (): PersistedTimer => ({
  status: 'idle',
  runId: null,
  startedAt: null,
  endAt: null,
  remainingMs: 0,
  durationMs: 0,
  completedAt: null,
})

export function parsePersistedTimer(serialized: string | null): PersistedTimer {
  if (!serialized) return idleTimer()
  try {
    const timer = JSON.parse(serialized) as PersistedTimer
    if (
      !['idle', 'running', 'paused', 'complete'].includes(timer.status) ||
      typeof timer.remainingMs !== 'number' ||
      typeof timer.durationMs !== 'number'
    ) {
      return idleTimer()
    }
    return timer
  } catch {
    return idleTimer()
  }
}

export function computeRemainingMs(timer: PersistedTimer, now: number): number {
  if (timer.status === 'running' && timer.endAt !== null) {
    return Math.max(0, timer.endAt - now)
  }
  return Math.max(0, timer.remainingMs)
}

export function adjustTimerState(timer: PersistedTimer, deltaMs: number, now: number): PersistedTimer {
  if (timer.status === 'running' && timer.endAt !== null) {
    const endAt = Math.max(now, timer.endAt + deltaMs)
    return { ...timer, endAt, remainingMs: endAt - now }
  }
  if (timer.status === 'paused') {
    const remaining = Math.max(0, timer.remainingMs + deltaMs)
    return { ...timer, remainingMs: remaining }
  }
  return timer
}
