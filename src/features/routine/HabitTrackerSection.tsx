'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Bell,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { queueAndSync } from '@/features/offline/useOfflineSync'
import { PeriodNavigator } from '@/features/reports/PeriodNavigator'
import { validateSafeUserText } from '@/lib/authSecurity'
import { focusAndScrollToElement } from '@/lib/focusScroll'
import { createClient } from '@/lib/supabase/client'
import { HabitConsistencyChart } from './HabitConsistencyChart'
import { RecentDaysStrip } from '@/components/ui/RecentDaysStrip'
import {
  addCustomHabit,
  buildHistoricalPeriods,
  buildPeriodReport,
  clampPastOrTodayDateKey,
  computeHabitStreak,
  countActiveCompletedForDate,
  formatShortItalianDate,
  getLastNDaysKeys,
  getRelativeDateKey,
  type HabitItem,
  type HabitLogsByDate,
  readHabitLogs,
  readHabits,
  readRoutineReminder,
  removeHabit,
  type ReportPeriod,
  type RoutineReminderConfig,
  saveRoutineReminder,
  SUGGESTED_HABITS,
  toggleHabitForDate,
  updateHabitLabel,
} from './habitStore'

const HEATMAP_COLORS = [
  'bg-muted/50 border-border/40 text-muted-foreground',
  'bg-emerald-500/25 border-emerald-500/30 text-emerald-100',
  'bg-emerald-500/45 border-emerald-500/40 text-emerald-50',
  'bg-emerald-500/70 border-emerald-500/60 text-white',
  'bg-emerald-400 border-emerald-300 text-emerald-950',
] as const

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'] as const

export function HabitTrackerSection() {
  const [habits, setHabits] = useState<HabitItem[]>(() => readHabits())
  const [logs, setLogs] = useState<HabitLogsByDate>(() => readHabitLogs())
  const [newHabitName, setNewHabitName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('week')
  const [offsets, setOffsets] = useState<Record<ReportPeriod, number>>({
    day: 0,
    week: 0,
    month: 0,
    '3m': 0,
    '6m': 0,
    year: 0,
  })
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [reminder, setReminder] = useState<RoutineReminderConfig>(() => readRoutineReminder())
  const supabase = useMemo(() => createClient(), [])

  const newHabitInputRef = useRef<HTMLInputElement>(null)
  const firstEditInputRef = useRef<HTMLInputElement>(null)
  const detailedReportRef = useRef<HTMLDivElement>(null)

  const todayKey = formatLocalDateKey()
  const yesterdayKey = getRelativeDateKey(-1)
  const recent7Days = useMemo(() => getLastNDaysKeys(7), [todayKey])
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatLocalDateKey())
  const activeDateKey = clampPastOrTodayDateKey(selectedDateKey, todayKey)
  const isEditingToday = activeDateKey === todayKey
  const isEditingYesterday = activeDateKey === yesterdayKey
  const activeCompleted = logs[activeDateKey] ?? []
  const activeDoneCount = countActiveCompletedForDate(logs, habits, activeDateKey)

  useEffect(() => {
    const refresh = () => {
      setHabits(readHabits())
      setLogs(readHabitLogs())
      setReminder(readRoutineReminder())
    }
    window.addEventListener('nutriflow:data-updated', refresh)
    return () => window.removeEventListener('nutriflow:data-updated', refresh)
  }, [])

  useEffect(() => {
    if (!reminder.enabled) return
    const checkReminder = () => {
      const latestLogs = readHabitLogs()[todayKey] ?? []
      const allHabits = readHabits()
      const remaining = allHabits.filter(h => !latestLogs.includes(h.id)).length
      if (remaining === 0) return

      const [hh, mm] = reminder.time.split(':').map(Number)
      const now = new Date()
      if (now.getHours() < hh || (now.getHours() === hh && now.getMinutes() < mm)) return

      const flagKey = `nutriflow:routine-reminded:${todayKey}`
      if (localStorage.getItem(flagKey)) return
      localStorage.setItem(flagKey, '1')

      const body = `Ti restano ${remaining} abitudini da completare oggi per mantenere lo streak.`
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Routine serale NutriFlow', { body })
      } else {
        toast.info(body)
      }
    }

    checkReminder()
    const timer = window.setInterval(checkReminder, 60_000)
    document.addEventListener('visibilitychange', checkReminder)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', checkReminder)
    }
  }, [reminder.enabled, reminder.time, todayKey])

  const toggleReminder = async () => {
    if (!reminder.enabled && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => 'denied')
    }
    const next = saveRoutineReminder({ ...reminder, enabled: !reminder.enabled })
    setReminder(next)
    localStorage.removeItem(`nutriflow:routine-reminded:${todayKey}`)
    toast.success(
      next.enabled
        ? `Promemoria routine attivo alle ${next.time}`
        : 'Promemoria routine disattivato.',
    )
  }

  const updateReminderTime = (time: string) => {
    const next = saveRoutineReminder({ ...reminder, time })
    setReminder(next)
    localStorage.removeItem(`nutriflow:routine-reminded:${todayKey}`)
  }
  const currentOffset = offsets[reportPeriod]
  const streak = useMemo(() => computeHabitStreak(logs), [logs])

  const report = useMemo(
    () => buildPeriodReport(logs, habits, reportPeriod, new Date(), currentOffset),
    [currentOffset, habits, logs, reportPeriod],
  )
  const history = useMemo(
    () => buildHistoricalPeriods(logs, habits, reportPeriod),
    [habits, logs, reportPeriod],
  )

  const jumpToOffset = (targetOffset: number) => {
    setOffsets(prev => ({
      ...prev,
      [reportPeriod]: Math.min(0, targetOffset),
    }))
  }

  const handleToggle = (habit: HabitItem) => {
    const targetDate = activeDateKey
    const wasDone = activeCompleted.includes(habit.id)
    const nextLogs = toggleHabitForDate(habit.id, targetDate)
    setLogs(nextLogs)
    window.dispatchEvent(new Event('nutriflow:data-updated'))
    if (!wasDone) {
      const whenLabel = isEditingToday
        ? ''
        : isEditingYesterday
          ? ' (Ieri)'
          : ` (${formatShortItalianDate(targetDate)})`
      toast.success(`${habit.label}${whenLabel} · +${habit.xp} XP`)
    }

    if (habit.id === 'creatine') {
      void supabase.auth.getSession().then(async ({ data }) => {
        const uid = data.session?.user?.id
        if (!uid) return
        if (!wasDone) {
          await queueAndSync({
            id: `creatine_logs:${uid}:${targetDate}`,
            userId: uid,
            table: 'creatine_logs',
            conflictTarget: 'user_id,log_date',
            payload: {
              id: crypto.randomUUID(),
              user_id: uid,
              log_date: targetDate,
              amount_g: 5,
            },
          })
          window.dispatchEvent(new Event('nutriflow:data-updated'))
        } else if (navigator.onLine) {
          await supabase
            .from('creatine_logs')
            .delete()
            .eq('user_id', uid)
            .eq('log_date', targetDate)
          window.dispatchEvent(new Event('nutriflow:data-updated'))
        }
      })
    }
  }

  const handleAddName = (label: string) => {
    const check = validateSafeUserText(label, 'Nome abitudine', 60)
    if (!check.ok) {
      toast.error(check.error)
      return
    }
    if (!check.value) return
    const next = addCustomHabit(check.value)
    setHabits(next)
    setNewHabitName('')
    setShowAdd(false)
    window.dispatchEvent(new Event('nutriflow:data-updated'))
    toast.success(`"${check.value}" aggiunta alla routine.`)
  }

  const handleDelete = (id: string) => {
    if (habits.length <= 1) {
      toast.error('Tieni almeno una abitudine attiva.')
      return
    }
    const next = removeHabit(id)
    setHabits(next)
    window.dispatchEvent(new Event('nutriflow:data-updated'))
  }

  const handleRename = (id: string, label: string) => {
    const check = validateSafeUserText(label, 'Nome abitudine', 60)
    if (!check.ok) {
      toast.error(check.error)
      return
    }
    const next = updateHabitLabel(id, check.value)
    setHabits(next)
    window.dispatchEvent(new Event('nutriflow:data-updated'))
  }

  const availableSuggestions = SUGGESTED_HABITS.filter(
    suggestion => !habits.some(h => h.label.toLowerCase() === suggestion.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="size-4 text-primary" />
                {isEditingToday
                  ? 'Routine di oggi'
                  : isEditingYesterday
                    ? 'Routine di ieri'
                    : `Routine · ${formatShortItalianDate(activeDateKey)}`}
              </CardTitle>
              <CardDescription className="text-xs">
                {activeDoneCount} / {habits.length} completate
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-400">
                <Flame className="size-3.5" />
                <span className="font-mono text-xs font-bold">{streak}g</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-emerald-500/40 px-2.5 text-xs text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300"
                onClick={() => {
                  const next = !showAdd
                  setShowAdd(next)
                  if (next) setTimeout(() => focusAndScrollToElement(newHabitInputRef.current), 20)
                }}
              >
                <Plus className="mr-1 size-3.5" />
                Aggiungi
              </Button>
            </div>
          </div>

          <RecentDaysStrip
            days={recent7Days}
            selectedDateKey={activeDateKey}
            onSelect={dateKey => setSelectedDateKey(clampPastOrTodayDateKey(dateKey, todayKey))}
            renderBadge={dateKey =>
              `${countActiveCompletedForDate(logs, habits, dateKey)}/${habits.length}`
            }
            isDayComplete={dateKey =>
              habits.length > 0 && countActiveCompletedForDate(logs, habits, dateKey) >= habits.length
            }
            showDatePicker
            maxDateKey={todayKey}
            accent="emerald"
          />

          {!isEditingToday && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">
              <span>
                Modifica retroattiva attiva per{' '}
                <strong>{isEditingYesterday ? `ieri (${formatShortItalianDate(yesterdayKey)})` : formatShortItalianDate(activeDateKey)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDateKey(todayKey)}
                className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-200"
              >
                Torna a oggi
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-2.5">
          {showAdd && (
            <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleAddName(newHabitName)
                }}
                className="flex items-center gap-2"
              >
                <Input
                  ref={newHabitInputRef}
                  placeholder="Nuova abitudine..."
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  className="h-9 min-w-0 flex-1 text-sm"
                  required
                />
                <Button type="submit" size="sm" className="h-9 shrink-0 rounded-xl bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500">
                  Salva
                </Button>
              </form>
              {availableSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleAddName(suggestion)}
                      className="rounded-full border border-emerald-400 bg-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-950 transition-colors hover:bg-emerald-300"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {habits.map((habit, idx) => {
            if (isManaging) {
              return (
                <div key={habit.id} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-background/50 p-2">
                  <Input
                    ref={idx === 0 ? firstEditInputRef : undefined}
                    aria-label={`Modifica ${habit.label}`}
                    defaultValue={habit.label}
                    onBlur={e => handleRename(habit.id, e.target.value)}
                    className="h-9 min-w-0 flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Elimina ${habit.label}`}
                    className="size-9 shrink-0 rounded-xl text-red-400 hover:bg-red-500/15 hover:text-red-300"
                    onClick={() => handleDelete(habit.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            }

            const done = activeCompleted.includes(habit.id)
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => handleToggle(habit)}
                className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
                  done
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground'
                    : 'border-border/70 bg-background/50 text-foreground hover:border-primary/40'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                      done
                        ? 'border-emerald-400 bg-emerald-500 text-emerald-950'
                        : 'border-border text-transparent'
                    }`}
                  >
                    <Check className="size-3.5" />
                  </span>
                  <span className="truncate text-sm font-medium">{habit.label}</span>
                </span>
                <Badge variant="secondary" className="shrink-0 font-mono text-[10px] text-emerald-400">
                  +{habit.xp} XP
                </Badge>
              </button>
            )
          })}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 pb-3">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 rounded-lg px-2 text-xs ${
                reminder.enabled ? 'bg-amber-500/15 text-amber-400' : 'text-muted-foreground'
              }`}
              onClick={() => void toggleReminder()}
            >
              <Bell className="mr-1 size-3" />
              {reminder.enabled ? 'Promemoria ON' : 'Promemoria'}
            </Button>
            <input
              type="time"
              aria-label="Orario promemoria routine"
              value={reminder.time}
              onChange={e => updateReminderTime(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-2 text-xs text-primary hover:bg-primary/10"
            onClick={() => {
              const next = !isManaging
              setIsManaging(next)
              if (next) setTimeout(() => focusAndScrollToElement(firstEditInputRef.current), 20)
            }}
          >
            <Pencil className="mr-1.5 size-3" />
            {isManaging ? 'Fine modifica' : 'Modifica / Elimina'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              Costanza & Report
            </CardTitle>
            <CardDescription className="text-xs">
              Scorri giorni, settimane, mesi, 3 mesi, 6 mesi o anni
            </CardDescription>
          </div>

          <PeriodNavigator
            period={reportPeriod}
            offset={currentOffset}
            periodLabel={report.periodLabel}
            onPeriodChange={setReportPeriod}
            onOffsetChange={nextOffset =>
              setOffsets(prev => ({ ...prev, [reportPeriod]: Math.min(0, nextOffset) }))
            }
          />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/40 p-2.5 text-center">
              <p className="text-[11px] text-muted-foreground">Aderenza</p>
              <p className="font-mono text-base font-bold text-emerald-400">{report.completionPct}%</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-2.5 text-center">
              <p className="text-[11px] text-muted-foreground">Giorni 100%</p>
              <p className="font-mono text-base font-bold">{report.perfectDays}</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-2.5 text-center">
              <p className="text-[11px] text-muted-foreground">Check-in</p>
              <p className="font-mono text-base font-bold text-primary">{report.totalCheckins}</p>
            </div>
          </div>

          {reportPeriod === 'day' ? (
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-xs">
              <span className="font-medium text-muted-foreground">{report.periodLabel}</span>
              <span className="font-mono font-semibold text-foreground">
                {report.days[0]?.completedCount ?? 0} / {report.days[0]?.totalCount ?? habits.length} abitudini
              </span>
            </div>
          ) : reportPeriod === 'week' || reportPeriod === 'month' ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {WEEKDAY_HEADERS.map((letter, idx) => (
                  <span key={`${letter}-${idx}`} className="text-[10px] font-semibold text-muted-foreground">
                    {letter}
                  </span>
                ))}
              </div>
              <div
                className="grid grid-cols-7 gap-1.5"
                role="grid"
                aria-label={reportPeriod === 'week' ? 'Settimana Lunedì-Domenica' : 'Calendario mensile costanza'}
              >
                {reportPeriod === 'month' &&
                  Array.from({ length: report.leadingEmptyDays }).map((_, idx) => (
                    <div key={`spacer-${idx}`} aria-hidden="true" className="aspect-square" />
                  ))}
                {report.days.map(cell => {
                  const isToday = cell.dateKey === todayKey
                  return (
                    <div
                      key={cell.dateKey}
                      title={`${cell.dateKey}: ${cell.completedCount}/${cell.totalCount}`}
                      className={`flex aspect-square flex-col items-center justify-center rounded-lg border font-mono text-[10px] font-semibold ${
                        cell.isFuture
                          ? 'border-border/30 bg-muted/20 text-muted-foreground/40'
                          : HEATMAP_COLORS[cell.level]
                      } ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                    >
                      <span>{cell.dayLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-1.5 ${
                reportPeriod === '3m' ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'
              }`}
              role="grid"
              aria-label="Riepilogo multi-mese"
            >
              {report.days.map(cell => (
                <div
                  key={cell.dateKey}
                  title={`${cell.dayLabel}: ${cell.subLabel} (${cell.completedCount} check-in)`}
                  className={`flex flex-col items-center justify-center rounded-xl border px-1 py-2 text-center ${
                    cell.isFuture
                      ? 'border-border/30 bg-muted/20 text-muted-foreground/40'
                      : HEATMAP_COLORS[cell.level]
                  }`}
                >
                  <span className="text-[11px] font-semibold">{cell.dayLabel}</span>
                  <span className="font-mono text-[10px] opacity-90">{cell.subLabel}</span>
                </div>
              ))}
            </div>
          )}

          <HabitConsistencyChart data={report.chartSeries} period={reportPeriod} />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full rounded-xl border-primary/35 bg-primary/10 text-xs text-primary hover:bg-primary/20"
            onClick={() => {
              const next = !showDetailedReport
              setShowDetailedReport(next)
              if (next) setTimeout(() => focusAndScrollToElement(detailedReportRef.current), 30)
            }}
          >
            {showDetailedReport ? (
              <>
                <ChevronUp className="mr-1.5 size-3.5" />
                Nascondi report dettagliato
              </>
            ) : (
              <>
                <ChevronDown className="mr-1.5 size-3.5" />
                Apri report dettagliato & storico
              </>
            )}
          </Button>

          {showDetailedReport && (
            <div
              ref={detailedReportRef}
              tabIndex={-1}
              className="space-y-4 rounded-xl border border-border/70 bg-background/40 p-3 outline-none"
            >
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-muted/40 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Confronto periodo prec.</p>
                  {report.deltaPct !== null ? (
                    <p
                      className={`mt-0.5 flex items-center gap-1 font-mono text-sm font-bold ${
                        report.deltaPct >= 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {report.deltaPct >= 0 ? (
                        <TrendingUp className="size-3.5 shrink-0" />
                      ) : (
                        <TrendingDown className="size-3.5 shrink-0" />
                      )}
                      {report.deltaPct > 0 ? `+${report.deltaPct}%` : `${report.deltaPct}%`}
                    </p>
                  ) : (
                    <p className="mt-0.5 font-mono text-sm font-semibold text-muted-foreground">—</p>
                  )}
                </div>
                <div className="rounded-xl bg-muted/40 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Giorni attivi</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-primary">
                    {report.activeDays} / {report.elapsedDays}
                  </p>
                </div>
              </div>

              {report.bestHabit && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-300">
                    <Flame className="size-3.5 shrink-0" />
                    <span className="truncate">Top: {report.bestHabit.label}</span>
                  </span>
                  <span className="shrink-0 font-mono font-bold text-emerald-300">
                    {report.bestHabit.pct}%
                  </span>
                </div>
              )}

              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground">Dettaglio per abitudine</p>
                {report.perHabitStats.map(stat => (
                  <div key={stat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{stat.label}</span>
                      <span className="shrink-0 font-mono text-muted-foreground">
                        {stat.doneDays}/{stat.totalDays} · {stat.pct}%
                      </span>
                    </div>
                    <Progress value={stat.pct} className="h-1.5" />
                  </div>
                ))}
              </div>

              {history.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <CalendarRange className="size-3.5 text-primary" />
                    {reportPeriod === 'week'
                      ? 'Storico settimanale (tocca per aprire)'
                      : reportPeriod === 'month'
                        ? 'Storico mensile (tocca per aprire)'
                        : 'Storico annuale (tocca per aprire)'}
                  </p>
                  <div className="space-y-1.5">
                    {history.map(item => {
                      const isSelected = item.offset === currentOffset
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => jumpToOffset(item.offset)}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'border border-primary/40 bg-primary/15 text-foreground'
                              : 'bg-muted/40 hover:bg-muted/60'
                          }`}
                        >
                          <span className="truncate font-medium">{item.label}</span>
                          <span className="shrink-0 font-mono text-muted-foreground">
                            <strong className="text-emerald-400">{item.completionPct}%</strong> · {item.totalCheckins} check-in
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
