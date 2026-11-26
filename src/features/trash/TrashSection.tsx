'use client'

import { useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { queueAndSync } from '@/features/offline/useOfflineSync'
import {
  readCardioPresets,
  readWorkoutPresets,
  saveCardioPresets,
  saveWorkoutPresets,
} from '@/features/workouts/presetStorage'
import { createClient } from '@/lib/supabase/client'
import {
  clearTrash,
  daysUntilExpiry,
  readTrashItems,
  removeFromTrash,
  type TrashItem,
} from './trashStore'

interface TrashSectionProps {
  onRestored: () => void
}

function kindLabel(kind: TrashItem['kind']): string {
  switch (kind) {
    case 'workout_session':
      return 'Allenamento / Corsa'
    case 'workout_plan':
      return 'Scheda DB'
    case 'workout_preset':
      return 'Preset Scheda'
    case 'cardio_preset':
      return 'Preset Corsa'
  }
}

export function TrashSection({ onRestored }: TrashSectionProps) {
  const supabase = createClient()
  const [items, setItems] = useState<TrashItem[]>(() => readTrashItems())
  const [busyId, setBusyId] = useState<string | null>(null)

  const refreshTrash = () => {
    setItems(readTrashItems())
    onRestored()
    window.dispatchEvent(new Event('nutriflow:data-updated'))
  }

  const handleRestore = async (item: TrashItem) => {
    if (busyId) return
    setBusyId(item.id)
    try {
      if (item.kind === 'cardio_preset') {
        const current = readCardioPresets().filter(p => p.id !== item.preset.id)
        saveCardioPresets([item.preset, ...current])
      } else if (item.kind === 'workout_preset') {
        const current = readWorkoutPresets().filter(p => p.id !== item.preset.id)
        saveWorkoutPresets([item.preset, ...current])
      } else if (item.kind === 'workout_session') {
        await queueAndSync({
          id: `workout_sessions:${item.session.id}`,
          userId: item.session.user_id,
          table: 'workout_sessions',
          conflictTarget: 'id',
          payload: item.session,
        })
        for (const set of item.sets) {
          await queueAndSync({
            id: `workout_sets:${set.id}`,
            userId: set.user_id,
            table: 'workout_sets',
            conflictTarget: 'id',
            payload: set,
          })
        }
      } else if (item.kind === 'workout_plan') {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) throw new Error('Utente non autenticato.')

        const { data: planData, error: planErr } = await supabase
          .from('workout_plans')
          .insert({ name: item.plan.name, user_id: user.id })
          .select('id')
          .single()
        if (planErr || !planData) throw planErr ?? new Error('Ripristino scheda fallito.')

        for (const workout of item.plan.workouts ?? []) {
          const { data: wData, error: wErr } = await supabase
            .from('workouts')
            .insert({ name: workout.name, plan_id: planData.id, muscle_group: workout.muscle_group })
            .select('id')
            .single()
          if (wErr || !wData) throw wErr ?? new Error('Ripristino workout fallito.')

          const exRows = (workout.workout_exercises ?? []).map((ex, idx) => ({
            workout_id: wData.id,
            exercise_name: ex.exercise_name,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
            order: ex.order ?? idx + 1,
          }))
          if (exRows.length > 0) {
            const { error: exErr } = await supabase.from('workout_exercises').insert(exRows)
            if (exErr) throw exErr
          }
        }
      }

      removeFromTrash(item.id)
      toast.success(`"${item.title}" ripristinato.`)
      refreshTrash()
    } catch (error) {
      console.error('Errore ripristino dal cestino:', error)
      toast.error('Impossibile ripristinare elemento.')
    } finally {
      setBusyId(null)
    }
  }

  const handlePermanentDelete = (item: TrashItem) => {
    removeFromTrash(item.id)
    toast.info(`"${item.title}" eliminato definitivamente.`)
    refreshTrash()
  }

  const handleEmptyTrash = () => {
    clearTrash()
    toast.info('Cestino svuotato.')
    refreshTrash()
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <p className="text-sm font-medium">Il cestino è vuoto</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Schede, preset, corse e allenamenti eliminati restano qui per 30 giorni.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Conservati per 30 giorni prima dell’eliminazione automatica.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300"
          onClick={handleEmptyTrash}
        >
          Svuota cestino
        </Button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-2 p-3.5">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {kindLabel(item.kind)}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Scade tra {daysUntilExpiry(item.expiresAt)}g
                  </span>
                </div>
                <p className="truncate text-sm font-semibold">{item.title}</p>
                {item.subtitle && (
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busyId === item.id}
                  className="h-9 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-2.5 text-xs text-emerald-400 hover:bg-emerald-500/25"
                  onClick={() => void handleRestore(item)}
                >
                  <RotateCcw className="mr-1 size-3.5" />
                  Ripristina
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busyId === item.id}
                  aria-label={`Elimina definitivamente ${item.title}`}
                  className="size-9 rounded-xl text-red-400/80 hover:bg-red-500/15 hover:text-red-400"
                  onClick={() => handlePermanentDelete(item)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
