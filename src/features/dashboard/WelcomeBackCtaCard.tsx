'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Compass, Dumbbell, GlassWater, Pill, Rocket, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatLocalDateKey } from '@/app/components/dashboard/home/recentWinsUtils'
import { appendCachedWaterLog } from '@/features/nutrition/waterOfflineCache'
import { queueAndSync } from '@/features/offline/useOfflineSync'
import { readHabitLogs, syncCreatineHabit } from '@/features/routine/habitStore'
import { createClient } from '@/lib/supabase/client'
import {
  captureAndGetSessionEntryMode,
  dismissWelcomeCta,
  isWelcomeCtaDismissed,
  requestAppTourStart,
  type SessionEntryMode,
} from '@/features/tour/tourStore'

export function WelcomeBackCtaCard() {
  const [entryMode, setEntryMode] = useState<SessionEntryMode>('active')
  const [dismissed, setDismissed] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [waterDoneToday, setWaterDoneToday] = useState(false)
  const [creatineDoneToday, setCreatineDoneToday] = useState(() => {
    const todayKey = formatLocalDateKey()
    return (readHabitLogs()[todayKey] ?? []).includes('creatine')
  })

  useEffect(() => {
    const mode = captureAndGetSessionEntryMode()
    setEntryMode(mode)
    setDismissed(mode === 'active' || isWelcomeCtaDismissed())

    void createClient().auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUserId(data.session.user.id)
      }
    })
  }, [])

  if (dismissed || entryMode === 'active') return null

  const handleDismiss = () => {
    dismissWelcomeCta()
    setDismissed(true)
  }

  const handleQuickWater = async () => {
    if (!userId || waterDoneToday) return
    const nowIso = new Date().toISOString()
    const outboxId = `water_logs:${crypto.randomUUID()}`
    appendCachedWaterLog({ localId: outboxId, amount_ml: 250, created_at: nowIso })
    setWaterDoneToday(true)
    try {
      await queueAndSync({
        id: outboxId,
        userId,
        table: 'water_logs',
        payload: {
          user_id: userId,
          amount_ml: 250,
          created_at: nowIso,
        },
      })
      toast.success('+250 ml di acqua registrati!')
      window.dispatchEvent(new Event('nutriflow:data-updated'))
    } catch {
      setWaterDoneToday(false)
      toast.error('Impossibile registrare l’acqua.')
    }
  }

  const handleQuickCreatine = async () => {
    if (!userId || creatineDoneToday) return
    const todayKey = formatLocalDateKey()
    setCreatineDoneToday(true)
    try {
      await queueAndSync({
        id: `creatine_logs:${userId}:${todayKey}`,
        userId,
        table: 'creatine_logs',
        conflictTarget: 'user_id,log_date',
        payload: {
          id: crypto.randomUUID(),
          user_id: userId,
          log_date: todayKey,
          amount_g: 5,
        },
      })
      syncCreatineHabit(true, todayKey)
      window.dispatchEvent(new Event('nutriflow:data-updated'))
      toast.success('5 g di creatina segnati per oggi!')
    } catch {
      setCreatineDoneToday(false)
      toast.error('Impossibile registrare la creatina.')
    }
  }

  const isReturningAfterThreeMonths = entryMode === 'inactive_3m'

  return (
    <Card className="nf-pop-enter border-emerald-500/40 bg-card dark:bg-gradient-to-br dark:from-[#0d1722] dark:via-[#0f1f2b] dark:to-emerald-500/10">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Rocket className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                {isReturningAfterThreeMonths
                  ? 'Bentornato! Sono passati più di 3 mesi'
                  : 'Benvenuto in NutriFlow! Inizia dalle prime cose di oggi'}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isReturningAfterThreeMonths
                  ? 'Riparti senza stress: segna subito la prima azione di oggi qui sotto.'
                  : 'Bastano pochi secondi: registra la prima acqua, la creatina o crea la tua scheda.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Nascondi suggerimenti iniziali"
            onClick={handleDismiss}
            className="size-7 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            type="button"
            size="sm"
            variant={waterDoneToday ? 'secondary' : 'outline'}
            disabled={!userId || waterDoneToday}
            onClick={() => void handleQuickWater()}
            className="h-9 justify-start rounded-xl border-sky-500/35 bg-sky-500/10 px-2.5 text-xs text-sky-700 hover:bg-sky-500/20 dark:text-sky-300"
          >
            {waterDoneToday ? <Check className="mr-1.5 size-3.5 shrink-0" /> : <GlassWater className="mr-1.5 size-3.5 shrink-0" />}
            <span className="truncate">{waterDoneToday ? 'Acqua OK' : '+250 ml Acqua'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={creatineDoneToday ? 'secondary' : 'outline'}
            disabled={!userId || creatineDoneToday}
            onClick={() => void handleQuickCreatine()}
            className="h-9 justify-start rounded-xl border-emerald-500/35 bg-emerald-500/10 px-2.5 text-xs text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            {creatineDoneToday ? <Check className="mr-1.5 size-3.5 shrink-0" /> : <Pill className="mr-1.5 size-3.5 shrink-0" />}
            <span className="truncate">{creatineDoneToday ? 'Creatina OK' : 'Creatina 5g'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 justify-start rounded-xl border-primary/35 bg-primary/10 px-2.5 text-xs text-primary hover:bg-primary/20"
            asChild
          >
            <Link href="/dashboard/gym/plan/new">
              <Dumbbell className="mr-1.5 size-3.5 shrink-0" />
              <span className="truncate">Crea scheda</span>
            </Link>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={requestAppTourStart}
            className="h-9 justify-start rounded-xl px-2.5 text-xs"
          >
            <Compass className="mr-1.5 size-3.5 shrink-0 text-amber-500" />
            <span className="truncate">Tour app</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
