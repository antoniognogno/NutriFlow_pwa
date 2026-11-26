'use client'

import { useEffect, useRef, useState } from 'react'
import { BookmarkPlus, Footprints, Pencil, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { focusAndScrollToElement } from '@/lib/focusScroll'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { queueAndSync } from '@/features/offline/useOfflineSync'
import { moveToTrash } from '@/features/trash/trashStore'
import { createClient } from '@/lib/supabase/client'
import {
  type CardioPreset,
  createCardioPreset,
  readCardioPresets,
  saveCardioPresets,
} from './presetStorage'
import { upsertCachedSession } from './workoutOfflineCache'
import { formatPacePerKm } from './workoutUtils'

interface QuickCardioCardProps {
  onTrashChange?: () => void
}

export function QuickCardioCard({ onTrashChange }: QuickCardioCardProps) {
  const supabase = createClient()
  const [presets, setPresets] = useState<CardioPreset[]>(() => readCardioPresets())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [presetLabel, setPresetLabel] = useState('')
  const [distanceKm, setDistanceKm] = useState('5')
  const [minutes, setMinutes] = useState('30')
  const [isSaving, setIsSaving] = useState(false)
  const presetLabelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const reload = () => setPresets(readCardioPresets())
    window.addEventListener('nutriflow:data-updated', reload)
    return () => window.removeEventListener('nutriflow:data-updated', reload)
  }, [])

  const logRun = async (km: number, mins: number, customTitle?: string) => {
    if (isSaving || km <= 0 || mins <= 0) return
    setIsSaving(true)
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      const user = session?.user
      if (error || !user) {
        toast.error('Sessione non valida.')
        return
      }
      const now = new Date()
      const startedAt = new Date(now.getTime() - mins * 60_000)
      const paceStr = formatPacePerKm(km, mins)
      const title = customTitle ? `${customTitle} (${paceStr})` : `Corsa ${km} km (${paceStr})`
      const sessionPayload = {
        id: crypto.randomUUID(),
        user_id: user.id,
        workout_id: null,
        workout_name: title,
        started_at: startedAt.toISOString(),
        ended_at: now.toISOString(),
        duration_seconds: mins * 60,
      }

      upsertCachedSession(sessionPayload, [])
      await queueAndSync({
        id: `workout_sessions:${sessionPayload.id}`,
        userId: user.id,
        table: 'workout_sessions',
        conflictTarget: 'id',
        payload: sessionPayload,
      })
      toast.success(`${customTitle ?? `Corsa ${km} km`} salvata · passo ${paceStr}`)
      window.dispatchEvent(new Event('nutriflow:data-updated'))
    } catch (err) {
      console.error('Errore salvataggio corsa:', err)
      toast.error('Impossibile registrare la corsa.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveOrUpdatePreset = () => {
    const km = Number.parseFloat(distanceKm) || 0
    const mins = Number.parseInt(minutes, 10) || 0
    if (km <= 0 || mins <= 0) {
      toast.error('Inserisci distanza e minuti validi per salvare il preset.')
      return
    }

    if (editingId) {
      const updated = presets.map(item =>
        item.id === editingId
          ? { ...item, label: presetLabel.trim() || `Corsa ${km} km`, distanceKm: km, minutes: mins }
          : item,
      )
      setPresets(updated)
      saveCardioPresets(updated)
      setEditingId(null)
      setPresetLabel('')
      toast.success('Preset corsa aggiornato.')
      return
    }

    const created = createCardioPreset(presetLabel, km, mins)
    const updated = [...presets, created]
    setPresets(updated)
    saveCardioPresets(updated)
    setPresetLabel('')
    toast.success(`Preset "${created.label}" salvato.`)
  }

  const startEditPreset = (preset: CardioPreset) => {
    setEditingId(preset.id)
    setPresetLabel(preset.label)
    setDistanceKm(String(preset.distanceKm))
    setMinutes(String(preset.minutes))
    setTimeout(() => focusAndScrollToElement(presetLabelInputRef.current), 20)
  }

  const trashPreset = (preset: CardioPreset) => {
    const updated = presets.filter(item => item.id !== preset.id)
    setPresets(updated)
    saveCardioPresets(updated)
    moveToTrash({
      id: `cardio_preset:${preset.id}`,
      kind: 'cardio_preset',
      title: preset.label,
      subtitle: `${preset.distanceKm} km · ${preset.minutes} min`,
      preset,
    })
    if (editingId === preset.id) {
      setEditingId(null)
      setPresetLabel('')
    }
    toast.success(`"${preset.label}" spostato nel cestino (30 giorni).`)
    onTrashChange?.()
    window.dispatchEvent(new Event('nutriflow:data-updated'))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Footprints className="size-4 text-primary" />
          Corsa & Cardio rapido
        </CardTitle>
        <CardDescription>Avvia in 1 tap, modifica o crea nuovi preset</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {presets.length > 0 && (
          <div className="space-y-2">
            {presets.map(preset => (
              <div key={preset.id} className="flex min-w-0 items-center gap-1.5">
                <Button
                  variant="secondary"
                  className="h-11 min-w-0 flex-1 justify-between rounded-xl px-3 text-xs"
                  disabled={isSaving}
                  onClick={() => void logRun(preset.distanceKm, preset.minutes, preset.label)}
                >
                  <span className="truncate font-semibold">{preset.label}</span>
                  <span className="ml-2 shrink-0 font-mono text-muted-foreground">
                    {preset.distanceKm} km · {preset.minutes}m
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-xl text-primary hover:bg-primary/15"
                  aria-label={`Modifica preset ${preset.label}`}
                  onClick={() => startEditPreset(preset)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-xl text-amber-400/80 hover:bg-amber-500/15 hover:text-amber-400"
                  aria-label={`Sposta ${preset.label} nel cestino`}
                  onClick={() => trashPreset(preset)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_2.75rem] items-center gap-1.5 border-t pt-3 sm:gap-2">
          <Input
            aria-label="Distanza in km"
            type="number"
            inputMode="decimal"
            min="0.5"
            step="0.5"
            value={distanceKm}
            onChange={e => setDistanceKm(e.target.value)}
            className="h-11 min-w-0 px-2 text-center"
            placeholder="km"
          />
          <span className="text-xs text-muted-foreground">km</span>
          <Input
            aria-label="Durata in minuti"
            type="number"
            inputMode="numeric"
            min="1"
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            className="h-11 min-w-0 px-2 text-center"
            placeholder="min"
          />
          <span className="text-xs text-muted-foreground">min</span>
          <Button
            size="icon"
            className="size-11 shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
            aria-label="Registra corsa"
            disabled={isSaving}
            onClick={() => void logRun(Number.parseFloat(distanceKm) || 0, Number.parseInt(minutes, 10) || 0)}
          >
            <Play className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            ref={presetLabelInputRef}
            aria-label="Nome preset corsa"
            placeholder={editingId ? 'Modifica nome preset' : 'Nome preset (es. Lungo argine)'}
            value={presetLabel}
            onChange={e => setPresetLabel(e.target.value)}
            className="h-9 min-w-0 flex-1 text-xs"
          />
          {editingId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 rounded-xl px-2.5 text-xs"
              onClick={() => {
                setEditingId(null)
                setPresetLabel('')
              }}
            >
              Annulla
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 rounded-xl border-emerald-500/35 bg-emerald-500/10 px-3 text-xs text-emerald-400 hover:bg-emerald-500/20"
            onClick={handleSaveOrUpdatePreset}
          >
            <BookmarkPlus className="mr-1.5 size-3.5" />
            {editingId ? 'Aggiorna' : 'Salva preset'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
