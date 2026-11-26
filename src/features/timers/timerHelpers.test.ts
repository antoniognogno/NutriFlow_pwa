import { describe, expect, it } from 'vitest'
import {
  adjustTimerState,
  computeRemainingMs,
  idleTimer,
  parsePersistedTimer,
} from './timerHelpers'

describe('Timestamp Timer Helpers', () => {
  it('computes remaining ms accurately without drifting below zero', () => {
    const now = 1_700_000_000_000
    const running = {
      ...idleTimer(),
      status: 'running' as const,
      endAt: now + 90_000,
      remainingMs: 90_000,
      durationMs: 90_000,
    }
    expect(computeRemainingMs(running, now + 30_000)).toBe(60_000)
    expect(computeRemainingMs(running, now + 120_000)).toBe(0)
  })

  it('adjusts running and paused timers with -15s and +30s clamped at zero', () => {
    const now = 1_700_000_000_000
    const running = {
      ...idleTimer(),
      status: 'running' as const,
      endAt: now + 10_000,
      remainingMs: 10_000,
      durationMs: 90_000,
    }
    const added = adjustTimerState(running, 30_000, now)
    expect(added.endAt).toBe(now + 40_000)
    expect(added.remainingMs).toBe(40_000)

    const subtractedPastZero = adjustTimerState(running, -15_000, now)
    expect(subtractedPastZero.endAt).toBe(now)
    expect(subtractedPastZero.remainingMs).toBe(0)
  })

  it('safely falls back to idle on malformed persisted payloads', () => {
    expect(parsePersistedTimer(null).status).toBe('idle')
    expect(parsePersistedTimer('not-json').status).toBe('idle')
    expect(parsePersistedTimer('{"status":"invalid"}').status).toBe('idle')
  })
})
