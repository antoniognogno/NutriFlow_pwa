'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, Clock3, Dumbbell, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react'
import { toast } from 'sonner'
import { focusAndScrollToElement } from '@/lib/focusScroll'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { queueAndSync } from '@/features/offline/useOfflineSync'
import { createClient } from '@/lib/supabase/client'
import { ExerciseNameField } from './ExerciseNameField'
import { upsertCachedSession } from './workoutOfflineCache'
import { formatDuration } from './workoutUtils'

export interface EditableSession {
  id: string
  user_id: string
  workout_id: string | null
  workout_name: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
}

export interface EditableSet {
  id: string
  user_id: string
  session_id: string
  exercise_id: string | null
  exercise_name: string
  set_number: number
  reps: number
  weight_kg: number
  completed_at: string
  isPersonalRecord?: boolean
}

interface SessionEditorProps {
  session: EditableSession
  initialSets: EditableSet[]
  initialEditMode?: boolean
  onSaved?: (session: EditableSession, sets: EditableSet[]) => void
  onClose?: () => void
  closeLabel?: string
}

export function groupSetsByExercise(sets: EditableSet[]) {
  const groups = new Map<string, EditableSet[]>()
  for (const set of sets) {
    const key = set.exercise_name
    const existing = groups.get(key) ?? []
    existing.push(set)
    groups.set(key, existing)
  }
  return Array.from(groups.entries()).map(([exerciseName, items]) => ({
    exerciseName,
    sets: [...items].sort((a, b) => a.set_number - b.set_number),
  }))
}

export function SessionEditor({
  session: initialSession,
  initialSets,
  initialEditMode = false,
  onSaved,
  onClose,
  closeLabel = 'Chiudi',
}: SessionEditorProps) {
  const supabase = createClient()
  const [session, setSession] = useState<EditableSession>(initialSession)
  const [sets, setSets] = useState<EditableSet[]>(initialSets)
  const [isEditing, setIsEditing] = useState(initialEditMode)

  const [nameDraft, setNameDraft] = useState(initialSession.workout_name)
  const [minutesDraft, setMinutesDraft] = useState(
    String(Math.max(1, Math.round((initialSession.duration_seconds || 0) / 60))),
  )
  const [draftSets, setDraftSets] = useState<EditableSet[]>(initialSets)
  const [removedSetIds, setRemovedSetIds] = useState<string[]>([])
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseWeight, setNewExerciseWeight] = useState('20')
  const [newExerciseReps, setNewExerciseReps] = useState('10')
  const [isSaving, setIsSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const activeSets = isEditing ? draftSets : sets
  const grouped = useMemo(() => groupSetsByExercise(activeSets), [activeSets])
  const totalVolumeKg = useMemo(
    () => activeSets.reduce((sum, s) => sum + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0), 0),
    [activeSets],
  )
  const prCount = useMemo(
    () => activeSets.filter(s => s.isPersonalRecord).length,
    [activeSets],
  )

  const enterEditMode = () => {
    setNameDraft(session.workout_name)
    setMinutesDraft(String(Math.max(1, Math.round((session.duration_seconds || 0) / 60))))
    setDraftSets(sets)
    setRemovedSetIds([])
    setIsEditing(true)
    setTimeout(() => focusAndScrollToElement(nameInputRef.current), 20)
  }

  const updateDraftSet = (id: string, patch: Partial<EditableSet>) => {
    setDraftSets(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeDraftSet = (id: string) => {
    setDraftSets(current => current.filter(item => item.id !== id))
    setRemovedSetIds(current => (current.includes(id) ? current : [...current, id]))
  }

  const addSetToExercise = (exerciseName: string, template?: EditableSet) => {
    const existingForExercise = draftSets.filter(s => s.exercise_name === exerciseName)
    const nextNumber = existingForExercise.length + 1
    const last = existingForExercise[existingForExercise.length - 1] ?? template
    setDraftSets(current => [
      ...current,
      {
        id: crypto.randomUUID(),
        user_id: session.user_id,
        session_id: session.id,
        exercise_id: last?.exercise_id ?? null,
        exercise_name: exerciseName,
        set_number: nextNumber,
        reps: last?.reps ?? 10,
        weight_kg: last?.weight_kg ?? 0,
        completed_at: new Date().toISOString(),
      },
    ])
  }

  const addNewExercise = () => {
    const cleanName = newExerciseName.trim()
    if (!cleanName) return
    const weight = Math.max(0, Number.parseFloat(newExerciseWeight) || 0)
    const reps = Math.max(1, Number.parseInt(newExerciseReps, 10) || 1)
    setDraftSets(current => [
      ...current,
      {
        id: crypto.randomUUID(),
        user_id: session.user_id,
        session_id: session.id,
        exercise_id: null,
        exercise_name: cleanName,
        set_number: 1,
        reps,
        weight_kg: weight,
        completed_at: new Date().toISOString(),
      },
    ])
    setNewExerciseName('')
  }

  const handleSaveChanges = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const mins = Math.max(1, Number.parseInt(minutesDraft, 10) || 1)
      const updatedSession: EditableSession = {
        ...session,
        workout_name: nameDraft.trim() || session.workout_name,
        duration_seconds: mins * 60,
      }

      // Rinumera le serie per esercizio in ordine pulito
      const perExerciseCounters = new Map<string, number>()
      const normalizedSets: EditableSet[] = draftSets.map(item => {
        const count = (perExerciseCounters.get(item.exercise_name) ?? 0) + 1
        perExerciseCounters.set(item.exercise_name, count)
        return {
          ...item,
          set_number: count,
          reps: Math.max(1, Math.round(Number(item.reps) || 1)),
          weight_kg: Math.max(0, Math.round((Number(item.weight_kg) || 0) * 100) / 100),
        }
      })

      await queueAndSync({
        id: `workout_sessions:${updatedSession.id}`,
        userId: updatedSession.user_id,
        table: 'workout_sessions',
        conflictTarget: 'id',
        payload: updatedSession,
      })

      if (removedSetIds.length > 0 && navigator.onLine) {
        const { error: deleteErr } = await supabase
          .from('workout_sets')
          .delete()
          .in('id', removedSetIds)
          .eq('user_id', updatedSession.user_id)
        if (deleteErr) throw deleteErr
      }

      for (const setRow of normalizedSets) {
        await queueAndSync({
          id: `workout_sets:${setRow.id}`,
          userId: updatedSession.user_id,
          table: 'workout_sets',
          conflictTarget: 'id',
          payload: {
            id: setRow.id,
            user_id: setRow.user_id,
            session_id: setRow.session_id,
            exercise_id: setRow.exercise_id,
            exercise_name: setRow.exercise_name,
            set_number: setRow.set_number,
            reps: setRow.reps,
            weight_kg: setRow.weight_kg,
            completed_at: setRow.completed_at,
          },
        })
      }

      upsertCachedSession(updatedSession, normalizedSets)
      setSession(updatedSession)
      setSets(normalizedSets)
      setRemovedSetIds([])
      setIsEditing(false)
      onSaved?.(updatedSession, normalizedSets)
      window.dispatchEvent(new Event('nutriflow:data-updated'))
      toast.success('Modifiche alla sessione salvate.')
    } catch (error) {
      console.error('Errore salvataggio modifiche sessione:', error)
      toast.error('Impossibile salvare tutte le modifiche.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="min-w-0 pb-3">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Badge variant="secondary" className="mb-1.5 gap-1">
                <Trophy className="size-3 text-amber-400" />
                {isEditing ? 'Modalità modifica' : 'Allenamento registrato'}
              </Badge>
              <CardTitle className="break-words text-lg leading-snug sm:text-xl">{session.workout_name}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                <Clock3 className="size-3.5 shrink-0" />
                <span>{formatDuration(session.duration_seconds)}</span>
                <span>·</span>
                <span>{new Date(session.started_at).toLocaleDateString('it-IT', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })}</span>
              </CardDescription>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 rounded-xl border-primary/35 bg-primary/10 text-primary hover:bg-primary/20"
                onClick={enterEditMode}
              >
                <Pencil className="mr-1.5 size-3.5" />
                Modifica
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 pt-0">
          <div className="rounded-xl bg-muted/50 p-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">Esercizi</p>
            <p className="font-mono text-base font-bold">{grouped.length}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">Serie</p>
            <p className="font-mono text-base font-bold">{activeSets.length}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">Volume</p>
            <p className="font-mono text-base font-bold">{Math.round(totalVolumeKg)} kg</p>
          </div>
        </CardContent>
      </Card>

      {prCount > 0 && !isEditing && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-300">
          <Trophy className="size-4 shrink-0" />
          <span>Hai battuto {prCount} record personale/i in questa sessione!</span>
        </div>
      )}

      {isEditing && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dettagli sessione</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
            <div className="space-y-1">
              <Label htmlFor="edit-session-name" className="text-xs">Nome</Label>
              <Input
                ref={nameInputRef}
                id="edit-session-name"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-session-mins" className="text-xs">Minuti</Label>
              <Input
                id="edit-session-mins"
                type="number"
                inputMode="numeric"
                min="1"
                value={minutesDraft}
                onChange={e => setMinutesDraft(e.target.value)}
                className="h-10 text-center"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {grouped.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-xs text-muted-foreground">
            Nessuna serie registrata per questa sessione.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(group => {
            const groupVol = group.sets.reduce(
              (sum, s) => sum + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0),
              0,
            )
            return (
              <Card key={group.exerciseName}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Dumbbell className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{group.exerciseName}</span>
                    </CardTitle>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {Math.round(groupVol)} kg
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.sets.map((set, idx) =>
                    isEditing ? (
                      <div key={set.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-1.5 rounded-xl bg-muted/40 p-2">
                        <span className="text-center font-mono text-xs font-semibold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <Input
                          aria-label={`${group.exerciseName} serie ${idx + 1} kg`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.5"
                          value={set.weight_kg}
                          onChange={e => updateDraftSet(set.id, { weight_kg: Number.parseFloat(e.target.value) || 0 })}
                          className="h-9 min-w-0 px-1.5 text-center text-sm"
                        />
                        <Input
                          aria-label={`${group.exerciseName} serie ${idx + 1} reps`}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={set.reps}
                          onChange={e => updateDraftSet(set.id, { reps: Number.parseInt(e.target.value, 10) || 1 })}
                          className="h-9 min-w-0 px-1.5 text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Elimina serie ${idx + 1}`}
                          className="size-8 text-red-400/80 hover:bg-red-500/15 hover:text-red-400"
                          onClick={() => removeDraftSet(set.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div key={set.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">Serie {set.set_number}</span>
                        <div className="flex items-center gap-2">
                          {set.isPersonalRecord && (
                            <Badge variant="secondary" className="text-[10px] text-amber-400">PR</Badge>
                          )}
                          <span className="font-mono font-semibold">
                            {set.weight_kg} kg × {set.reps}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full text-xs"
                      onClick={() => addSetToExercise(group.exerciseName, group.sets[group.sets.length - 1])}
                    >
                      <Plus className="mr-1 size-3.5" />
                      Aggiungi serie
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {isEditing && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aggiungi esercizio mancante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ExerciseNameField
              placeholder="Nome esercizio (es. Alzate Laterali)"
              value={newExerciseName}
              onChange={setNewExerciseName}
              className="h-10"
            />
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5">
              <Input
                aria-label="Peso in kg"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={newExerciseWeight}
                onChange={e => setNewExerciseWeight(e.target.value)}
                className="h-10 min-w-0 px-2 text-center"
                placeholder="kg"
              />
              <Input
                aria-label="Ripetizioni"
                type="number"
                inputMode="numeric"
                min="1"
                value={newExerciseReps}
                onChange={e => setNewExerciseReps(e.target.value)}
                className="h-10 min-w-0 px-2 text-center"
                placeholder="reps"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-10 shrink-0 rounded-xl bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-500"
                onClick={addNewExercise}
              >
                <Plus className="mr-1 size-3.5" />
                Aggiungi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isEditing ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-11 flex-1 rounded-xl"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            <X className="mr-1.5 size-4" />
            Annulla
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => void handleSaveChanges()}
            disabled={isSaving}
          >
            <Check className="mr-1.5 size-4" />
            {isSaving ? 'Salvo...' : 'Salva modifiche'}
          </Button>
        </div>
      ) : (
        onClose && (
          <Button className="h-12 w-full rounded-xl" size="lg" onClick={onClose}>
            {closeLabel}
          </Button>
        )
      )}
    </div>
  )
}
