import { useCallback, useEffect, useRef, useState } from 'react'
import {
  adjustTimerState,
  computeRemainingMs,
  idleTimer,
  parsePersistedTimer,
  type PersistedTimer,
  type TimerStatus,
} from './timerHelpers'

export type { TimerStatus }

export interface TimerCompletion {
  runId: string
  startedAt: string
  completedAt: string
  durationMs: number
}

interface UseTimestampTimerOptions {
  storageKey: string
  onComplete?: (completion: TimerCompletion) => void | Promise<void>
}

function readTimer(storageKey: string): PersistedTimer {
  try {
    return parsePersistedTimer(localStorage.getItem(storageKey))
  } catch (error) {
    console.error(`Timer locale non leggibile (${storageKey}):`, error)
    return idleTimer()
  }
}

export function useTimestampTimer({ storageKey, onComplete }: UseTimestampTimerOptions) {
  const [timer, setTimer] = useState<PersistedTimer>(() => readTimer(storageKey))
  const [remainingMs, setRemainingMs] = useState(timer.remainingMs)
  const onCompleteRef = useRef(onComplete)
  const reportingRunId = useRef<string | null>(null)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const reportCompletion = useCallback((completed: PersistedTimer) => {
    if (!completed.runId || !completed.startedAt || !completed.completedAt) return
    const markerKey = `${storageKey}:logged:${completed.runId}`
    if (localStorage.getItem(markerKey) || reportingRunId.current === completed.runId) return
    const callback = onCompleteRef.current
    if (!callback) return

    reportingRunId.current = completed.runId
    void Promise.resolve(callback({
      runId: completed.runId,
      startedAt: completed.startedAt,
      completedAt: completed.completedAt,
      durationMs: completed.durationMs,
    })).then(() => {
      localStorage.setItem(markerKey, 'true')
    }).catch(error => {
      console.error(`Registrazione timer fallita (${storageKey}):`, error)
    }).finally(() => {
      reportingRunId.current = null
    })
  }, [storageKey])

  const commit = useCallback((next: PersistedTimer) => {
    setTimer(next)
    setRemainingMs(computeRemainingMs(next, Date.now()))
    localStorage.setItem(storageKey, JSON.stringify(next))
    if (next.status === 'complete') reportCompletion(next)
  }, [reportCompletion, storageKey])

  const tick = useCallback(() => {
    setTimer(current => {
      if (current.status === 'running' && current.endAt !== null) {
        const left = Math.max(0, current.endAt - Date.now())
        setRemainingMs(left)
        if (left === 0) {
          const completed: PersistedTimer = {
            ...current,
            status: 'complete',
            endAt: null,
            remainingMs: 0,
            completedAt: new Date().toISOString(),
          }
          localStorage.setItem(storageKey, JSON.stringify(completed))
          reportCompletion(completed)
          return completed
        }
        return current
      }
      if (current.status === 'complete') reportCompletion(current)
      setRemainingMs(current.remainingMs)
      return current
    })
  }, [reportCompletion, storageKey])

  useEffect(() => {
    tick()
    const intervalId = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [tick])

  const start = useCallback((durationMs: number) => {
    const now = Date.now()
    commit({
      status: 'running',
      runId: crypto.randomUUID(),
      startedAt: new Date(now).toISOString(),
      endAt: now + Math.max(0, durationMs),
      remainingMs: Math.max(0, durationMs),
      durationMs: Math.max(0, durationMs),
      completedAt: null,
    })
  }, [commit])

  const pause = useCallback(() => {
    if (timer.status !== 'running' || timer.endAt === null) return
    const left = Math.max(0, timer.endAt - Date.now())
    commit({ ...timer, status: 'paused', endAt: null, remainingMs: left })
  }, [commit, timer])

  const resume = useCallback(() => {
    if (timer.status !== 'paused') return
    const now = Date.now()
    commit({ ...timer, status: 'running', endAt: now + timer.remainingMs })
  }, [commit, timer])

  const adjust = useCallback((deltaMs: number) => {
    const updated = adjustTimerState(timer, deltaMs, Date.now())
    if (updated !== timer) {
      commit(updated)
    }
  }, [commit, timer])

  const reset = useCallback(() => commit(idleTimer()), [commit])

  return {
    status: timer.status,
    runId: timer.runId,
    startedAt: timer.startedAt,
    completedAt: timer.completedAt,
    durationMs: timer.durationMs,
    remainingMs,
    start,
    pause,
    resume,
    adjust,
    reset,
  }
}
