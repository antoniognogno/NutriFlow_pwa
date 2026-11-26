'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Scale, Settings2, Target } from 'lucide-react'
import { toast } from 'sonner'
import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RecentDaysStrip } from '@/components/ui/RecentDaysStrip'
import { formatShortItalianDate, getLastNDaysKeys } from './habitStore'
import { computeBmi, readBodyProfile, type BodyProfile } from './profileGoalsStore'
import { WeightTrendChart } from './WeightTrendChart'
import {
  computeWeeklyWeightStats,
  DEFAULT_START_WEIGHT_KG,
  readWeightLogs,
  roundWeight,
  upsertWeightEntry,
  type WeightEntry,
} from './weightStore'

export function BodyTrackerSection() {
  const [entries, setEntries] = useState<WeightEntry[]>(() => readWeightLogs())
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(() => readBodyProfile())
  const todayKey = formatLocalDateKey()
  const recent7Days = useMemo(() => getLastNDaysKeys(7), [todayKey])
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatLocalDateKey())

  useEffect(() => {
    const sync = () => {
      setEntries(readWeightLogs())
      setBodyProfile(readBodyProfile())
    }
    window.addEventListener('nutriflow:data-updated', sync)
    return () => window.removeEventListener('nutriflow:data-updated', sync)
  }, [])

  const stats = useMemo(() => computeWeeklyWeightStats(entries), [entries])
  const [draftWeight, setDraftWeight] = useState<number>(() => {
    const todayEntry = entries.find(e => e.dateKey === todayKey)
    if (todayEntry) return todayEntry.weightKg
    return stats.latestKg ?? bodyProfile.weightKg ?? DEFAULT_START_WEIGHT_KG
  })

  const selectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey)
    const entry = entries.find(e => e.dateKey === dateKey)
    if (entry) {
      setDraftWeight(entry.weightKg)
    } else {
      setDraftWeight(stats.latestKg ?? bodyProfile.weightKg ?? DEFAULT_START_WEIGHT_KG)
    }
  }

  const currentWeightForMetrics = stats.latestKg ?? bodyProfile.weightKg
  const bmi = computeBmi(currentWeightForMetrics, bodyProfile.heightCm)
  const targetDiff =
    currentWeightForMetrics !== null && bodyProfile.targetWeightKg !== null
      ? Math.round((currentWeightForMetrics - bodyProfile.targetWeightKg) * 10) / 10
      : null

  const selectedEntry = entries.find(e => e.dateKey === selectedDateKey)
  const hasSelectedEntry = Boolean(selectedEntry)
  const isSelectedToday = selectedDateKey === todayKey

  const adjustDraft = (delta: number) => {
    setDraftWeight(prev => roundWeight(prev + delta))
  }

  const saveSelectedWeight = () => {
    const updated = upsertWeightEntry(draftWeight, selectedDateKey)
    setEntries(updated)
    window.dispatchEvent(new Event('nutriflow:data-updated'))
    const daySuffix = isSelectedToday ? 'oggi' : formatShortItalianDate(selectedDateKey)
    toast.success(`Peso registrato (${daySuffix}): ${draftWeight.toFixed(1)} kg`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="size-4 text-primary" />
                {isSelectedToday ? 'Peso mattutino' : `Peso · ${formatShortItalianDate(selectedDateKey)}`}
              </CardTitle>
              <CardDescription className="text-xs">
                Registra in 1 tap per oggi o gli ultimi 7 giorni
              </CardDescription>
            </div>
            {hasSelectedEntry && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                {isSelectedToday ? 'Oggi salvato' : `${formatShortItalianDate(selectedDateKey)} salvato`}
              </span>
            )}
          </div>
          <RecentDaysStrip
            days={recent7Days}
            selectedDateKey={selectedDateKey}
            onSelect={selectDate}
            renderBadge={dateKey => {
              const found = entries.find(e => e.dateKey === dateKey)
              return found ? `${found.weightKg.toFixed(1)}kg` : '—'
            }}
            isDayComplete={dateKey => entries.some(e => e.dateKey === dateKey)}
            accent="primary"
          />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-muted/30 py-4 text-center">
            <p className="font-mono text-4xl font-bold tracking-tight text-primary">
              {draftWeight.toFixed(1)}
              <span className="ml-1.5 text-lg font-medium text-muted-foreground">kg</span>
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <Button variant="outline" size="sm" className="h-10 w-full min-w-0 px-1 font-mono text-xs font-semibold" onClick={() => adjustDraft(-0.5)}>
              -0.5
            </Button>
            <Button variant="outline" size="sm" className="h-10 w-full min-w-0 px-1 font-mono text-xs font-semibold" onClick={() => adjustDraft(-0.1)}>
              -0.1
            </Button>
            <Button variant="outline" size="sm" className="h-10 w-full min-w-0 px-1 font-mono text-xs font-semibold" onClick={() => adjustDraft(0.1)}>
              +0.1
            </Button>
            <Button variant="outline" size="sm" className="h-10 w-full min-w-0 px-1 font-mono text-xs font-semibold" onClick={() => adjustDraft(0.5)}>
              +0.5
            </Button>
          </div>

          <Button className="h-11 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-500" onClick={saveSelectedWeight}>
            <Check className="mr-1.5 size-4" />
            {hasSelectedEntry
              ? `Aggiorna peso (${isSelectedToday ? 'oggi' : formatShortItalianDate(selectedDateKey)})`
              : `Registra peso (${isSelectedToday ? 'oggi' : formatShortItalianDate(selectedDateKey)})`}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Ultimo</p>
            <p className="font-mono text-base font-bold">
              {stats.latestKg !== null ? `${stats.latestKg.toFixed(1)} kg` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Media 7g</p>
            <p className="font-mono text-base font-bold text-primary">
              {stats.weeklyAvgKg !== null ? `${stats.weeklyAvgKg.toFixed(1)} kg` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Delta sett.</p>
            <p className="font-mono text-base font-bold">
              {stats.deltaKg !== null
                ? `${stats.deltaKg > 0 ? '+' : ''}${stats.deltaKg.toFixed(1)} kg`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3.5 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Target className="size-4 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <p className="font-semibold">
                {bodyProfile.targetWeightKg !== null
                  ? `Obiettivo peso: ${bodyProfile.targetWeightKg.toFixed(1)} kg`
                  : 'Imposta peso obiettivo e altezza'}
              </p>
              <p className="text-muted-foreground">
                {targetDiff !== null
                  ? targetDiff === 0
                    ? 'Obiettivo raggiunto!'
                    : `${targetDiff > 0 ? `${targetDiff.toFixed(1)} kg da perdere` : `${Math.abs(targetDiff).toFixed(1)} kg da prendere`}`
                  : 'Calcola BMI e distanza dal target'}
                {bmi !== null ? ` · BMI ${bmi}` : ''}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 shrink-0 rounded-xl px-2.5 text-xs text-primary" asChild>
            <Link href="/dashboard/settings">
              <Settings2 className="mr-1 size-3.5" />
              Profilo
            </Link>
          </Button>
        </CardContent>
      </Card>

      <WeightTrendChart entries={entries} targetWeightKg={bodyProfile.targetWeightKg} />
    </div>
  )
}
