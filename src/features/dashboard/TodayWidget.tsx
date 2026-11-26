'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bell, Check, Droplets, ListChecks, Pause, Pill, Play, RotateCcw, Timer, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  appendCachedWaterLog,
  readCachedWaterState,
  sumWaterLogs,
} from '@/features/nutrition/waterOfflineCache'
import { queueAndSync, useOfflineSync } from '@/features/offline/useOfflineSync'
import { readHabitLogs, readHabits, syncCreatineHabit } from '@/features/routine/habitStore'
import { readWeightLogs } from '@/features/routine/weightStore'
import { useTimestampTimer } from '@/features/timers/useTimestampTimer'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const CREATINE_GRAMS = 5
const DEFAULT_REMINDER_TIME = '20:00'
const FOCUS_TAGS = ['AI & Data', 'Esame UniTS', 'Ripetizioni', 'Generale'] as const

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function TodayWidget() {
  const supabase = createClient()
  const { pendingCount } = useOfflineSync()
  const [userId, setUserId] = useState<string | null>(null)
  const [creatineAmount, setCreatineAmount] = useState<number | null>(null)
  const [waterMlToday, setWaterMlToday] = useState<number>(0)
  const [focusMinutesToday, setFocusMinutesToday] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMode, setSelectedMode] = useState<'pomodoro' | 'block'>('pomodoro')
  const [selectedTag, setSelectedTag] = useState<string>(FOCUS_TAGS[0])
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const userIdRef = useRef(userId)
  const todayKey = localDateKey(new Date())

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  const logFocusSession = useCallback(async (completion: {
    runId: string
    startedAt: string
    completedAt: string
    durationMs: number
  }) => {
    const activeUserId = userIdRef.current
    if (!activeUserId) throw new Error('Utente non autenticato: sessione focus non registrata.')
    await queueAndSync({
      id: `focus_sessions:${completion.runId}`,
      userId: activeUserId,
      table: 'focus_sessions',
      conflictTarget: 'id',
      payload: {
        id: completion.runId,
        user_id: activeUserId,
        label: selectedTag,
        mode: selectedMode,
        started_at: completion.startedAt,
        ended_at: completion.completedAt,
        duration_seconds: Math.round(completion.durationMs / 1000),
      },
    })
    setFocusMinutesToday(prev => prev + Math.round(completion.durationMs / 60_000))
    toast.success(`Focus "${selectedTag}" registrato.`)
    window.dispatchEvent(new Event('nutriflow:data-updated'))
  }, [selectedMode, selectedTag])

  const focusTimer = useTimestampTimer({
    storageKey: 'lifeflow:focus-timer',
    onComplete: logFocusSession,
  })

  useEffect(() => {
    let active = true
    const loadToday = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError) throw authError
      const user = session?.user
      if (!user) return
      if (active) setUserId(user.id)

      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      const cachedWater = sumWaterLogs(readCachedWaterState().logs)
      if (!navigator.onLine) {
        const routineCreatineDone = (readHabitLogs()[todayKey] ?? []).includes('creatine')
        setCreatineAmount(routineCreatineDone ? CREATINE_GRAMS : null)
        setWaterMlToday(cachedWater)
        setIsLoading(false)
        return
      }

      const [creatineResult, waterResult, focusResult] = await Promise.all([
        supabase
          .from('creatine_logs')
          .select('amount_g')
          .eq('user_id', user.id)
          .eq('log_date', todayKey)
          .maybeSingle(),
        supabase
          .from('water_logs')
          .select('amount_ml')
          .eq('user_id', user.id)
          .gte('created_at', start.toISOString()),
        supabase
          .from('focus_sessions')
          .select('duration_seconds')
          .eq('user_id', user.id)
          .gte('started_at', start.toISOString()),
      ])
      if (creatineResult.error) throw creatineResult.error
      if (!active) return
      const dbCreatine = creatineResult.data?.amount_g ?? null
      const routineCreatineDone = (readHabitLogs()[todayKey] ?? []).includes('creatine')
      if (dbCreatine !== null) {
        syncCreatineHabit(true, todayKey)
      }
      setCreatineAmount(dbCreatine ?? (routineCreatineDone ? CREATINE_GRAMS : null))
      setWaterMlToday((waterResult.data ?? []).reduce((sum, row) => sum + (row.amount_ml || 0), 0))
      setFocusMinutesToday(
        Math.round((focusResult.data ?? []).reduce((sum, row) => sum + (row.duration_seconds || 0), 0) / 60),
      )
      setIsLoading(false)
    }

    const syncLocalState = () => {
      const doneInRoutine = (readHabitLogs()[todayKey] ?? []).includes('creatine')
      setCreatineAmount(curr => (doneInRoutine ? curr ?? CREATINE_GRAMS : null))
      void loadToday().catch(() => undefined)
    }

    void loadToday().catch(error => {
      console.error('Impossibile caricare il riepilogo di oggi:', error)
      if (active) {
        toast.error('Non riesco a caricare i dati di oggi. Verifica la connessione o le migrazioni Supabase.')
        setIsLoading(false)
      }
    })
    setReminderTime(localStorage.getItem('lifeflow:creatine-reminder-time') ?? DEFAULT_REMINDER_TIME)
    setNotificationsEnabled('Notification' in window && Notification.permission === 'granted')
    window.addEventListener('nutriflow:data-updated', syncLocalState)

    return () => {
      active = false
      window.removeEventListener('nutriflow:data-updated', syncLocalState)
    }
  }, [supabase, todayKey])

  useEffect(() => {
    const checkCreatineReminder = () => {
      if (creatineAmount !== null || !userIdRef.current) return
      const [hour, minute] = reminderTime.split(':').map(Number)
      const now = new Date()
      if (now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < minute)) return

      const reminderKey = `lifeflow:creatine-reminded:${todayKey}`
      if (localStorage.getItem(reminderKey)) return
      localStorage.setItem(reminderKey, 'true')

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Creatina di oggi', { body: `Ricordati di registrare i tuoi ${CREATINE_GRAMS} g.` })
      } else {
        toast.info(`Ricordati la creatina: ${CREATINE_GRAMS} g.`)
      }
    }

    checkCreatineReminder()
    const intervalId = window.setInterval(checkCreatineReminder, 60_000)
    document.addEventListener('visibilitychange', checkCreatineReminder)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', checkCreatineReminder)
    }
  }, [creatineAmount, reminderTime, todayKey])

  const logCreatine = async () => {
    if (!userId || creatineAmount !== null) return
    const record = {
      id: crypto.randomUUID(),
      user_id: userId,
      log_date: todayKey,
      amount_g: CREATINE_GRAMS,
    }
    try {
      await queueAndSync({
        id: `creatine_logs:${userId}:${todayKey}`,
        userId,
        table: 'creatine_logs',
        conflictTarget: 'user_id,log_date',
        payload: record,
      })
      setCreatineAmount(CREATINE_GRAMS)
      syncCreatineHabit(true, todayKey)
      localStorage.removeItem(`lifeflow:creatine-reminded:${todayKey}`)
      window.dispatchEvent(new Event('nutriflow:data-updated'))
      toast.success(`${CREATINE_GRAMS} g di creatina registrati e sincronizzati con Routine.`)
    } catch (error) {
      console.error('Impossibile registrare la creatina offline:', error)
      toast.error('Non è stato possibile salvare la creatina sul dispositivo.')
    }
  }

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Le notifiche non sono supportate da questo browser.')
      return
    }
    const permission = await Notification.requestPermission()
    setNotificationsEnabled(permission === 'granted')
    if (permission !== 'granted') toast.info('Puoi attivare le notifiche dalle impostazioni del browser.')
    else toast.success(`Promemoria creatina attivo alle ${reminderTime}.`)
  }

  const updateReminderTime = (time: string) => {
    setReminderTime(time)
    localStorage.setItem('lifeflow:creatine-reminder-time', time)
    localStorage.removeItem(`lifeflow:creatine-reminded:${todayKey}`)
  }

  const quickAddWater = async (amount: number) => {
    if (!userId) return
    const nowIso = new Date().toISOString()
    const outboxId = `water_logs:${crypto.randomUUID()}`
    appendCachedWaterLog({ localId: outboxId, amount_ml: amount, created_at: nowIso })
    setWaterMlToday(sumWaterLogs(readCachedWaterState().logs))
    try {
      if (!navigator.onLine) {
        await queueAndSync({
          id: outboxId,
          userId,
          table: 'water_logs',
          payload: {
            user_id: userId,
            amount_ml: amount,
            created_at: nowIso,
          },
        })
      } else {
        const { error } = await supabase
          .from('water_logs')
          .insert([{ user_id: userId, amount_ml: amount }])
        if (error) {
          await queueAndSync({
            id: outboxId,
            userId,
            table: 'water_logs',
            payload: {
              user_id: userId,
              amount_ml: amount,
              created_at: nowIso,
            },
          })
        }
      }
      toast.success(`+${amount} ml registrati`)
      window.dispatchEvent(new Event('nutriflow:data-updated'))
    } catch (error) {
      setWaterMlToday(prev => Math.max(0, prev - amount))
      console.error('Errore salvataggio acqua offline:', error)
      toast.error('Errore nel registrare l’acqua.')
    }
  }

  const startFocus = () => {
    if (focusTimer.status === 'paused') {
      focusTimer.resume()
      return
    }
    const durationMs = (selectedMode === 'pomodoro' ? 25 : 50) * 60_000
    focusTimer.start(durationMs)
  }

  const dayTitle = useMemo(
    () => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    [],
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription className="capitalize">{dayTitle}</CardDescription>
            <CardTitle className="mt-1 text-xl">Oggi, un passo alla volta</CardTitle>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground" aria-live="polite">
            {navigator.onLine ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {pendingCount > 0 ? `${pendingCount} in coda` : navigator.onLine ? 'Sincronizzato' : 'Offline'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <section data-tour="home-today" className="rounded-xl border bg-background/50 p-4" aria-labelledby="creatine-heading">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Pill className="size-5" />
              </span>
              <div>
                <h3 id="creatine-heading" className="font-semibold">Creatina</h3>
                <p className="text-sm text-muted-foreground">{creatineAmount === null ? `${CREATINE_GRAMS} g · da registrare` : `${creatineAmount} g · completata`}</p>
              </div>
            </div>
            <Button
              size="icon"
              variant={creatineAmount === null ? 'default' : 'secondary'}
              className={creatineAmount === null ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-500/20 text-emerald-400'}
              aria-label={creatineAmount === null ? 'Registra 5 grammi di creatina' : 'Creatina registrata'}
              disabled={isLoading || creatineAmount !== null}
              onClick={() => void logCreatine()}
            >
              <Check className="size-5" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="size-3.5" />
              Promemoria
              <input
                type="time"
                aria-label="Orario promemoria creatina"
                value={reminderTime}
                onChange={event => updateReminderTime(event.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              />
            </label>
            {!notificationsEnabled && (
              <Button variant="ghost" size="sm" onClick={() => void enableNotifications()}>
                Attiva
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-background/50 p-4" aria-labelledby="focus-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-primary" />
                <h3 id="focus-heading" className="font-semibold">Focus timer</h3>
                {focusMinutesToday > 0 && (
                  <span className="font-mono text-[11px] text-muted-foreground">· {focusMinutesToday}m oggi</span>
                )}
              </div>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums" aria-live="off">
                {formatTime(focusTimer.remainingMs)}
              </p>
            </div>
            <Button
              size="icon"
              className={
                focusTimer.status === 'running'
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }
              aria-label={focusTimer.status === 'running' ? 'Metti in pausa il timer' : 'Avvia il timer focus'}
              disabled={!userId}
              onClick={startFocus}
            >
              {focusTimer.status === 'running' ? <Pause className="size-5" /> : <Play className="size-5" />}
            </Button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {FOCUS_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                disabled={focusTimer.status === 'running'}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selectedTag === tag
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex gap-1">
              <Button
                variant={selectedMode === 'pomodoro' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMode('pomodoro')}
                disabled={focusTimer.status === 'running'}
              >
                25 min
              </Button>
              <Button
                variant={selectedMode === 'block' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMode('block')}
                disabled={focusTimer.status === 'running'}
              >
                50 min
              </Button>
            </div>
            {focusTimer.status !== 'idle' && (
              <Button variant="ghost" size="icon" aria-label="Azzera timer focus" onClick={focusTimer.reset}>
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/50 px-4 py-3 lg:col-span-2" aria-label="Acqua rapida">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
              <Droplets className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Acqua oggi</p>
              <p className="font-mono text-xs text-muted-foreground">{waterMlToday.toLocaleString('it-IT')} ml</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-9 rounded-xl border-sky-500/35 bg-sky-500/10 px-2.5 text-xs text-sky-400 hover:bg-sky-500/20" disabled={!userId} onClick={() => void quickAddWater(250)}>
              +250 ml
            </Button>
            <Button size="sm" variant="secondary" className="h-9 rounded-xl bg-sky-600 px-2.5 text-xs text-white hover:bg-sky-500" disabled={!userId} onClick={() => void quickAddWater(500)}>
              +500 ml
            </Button>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/50 px-4 py-3 lg:col-span-2" aria-label="Routine e peso">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <ListChecks className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Routine & Peso</p>
              <p className="text-xs text-muted-foreground">
                {(readHabitLogs()[todayKey] ?? []).length}/{readHabits().length} abitudini oggi
                {(() => {
                  const logs = readWeightLogs()
                  const last = logs[logs.length - 1]
                  return last ? ` · ${last.weightKg.toFixed(1)} kg` : ''
                })()}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/routine"
            className="inline-flex items-center gap-1 rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            Apri Routine
            <ArrowRight className="size-3.5" />
          </Link>
        </section>
      </CardContent>
    </Card>
  )
}
