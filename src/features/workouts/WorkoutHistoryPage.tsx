'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock3, Dumbbell, Footprints, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { moveToTrash, type SetRowSnapshot } from '@/features/trash/trashStore'
import { createClient } from '@/lib/supabase/client'
import { SessionEditor, type EditableSession, type EditableSet } from './SessionEditor'
import { formatDuration, isCardioSession } from './workoutUtils'

export function WorkoutHistoryView() {
  const router = useRouter()
  const supabase = createClient()

  const [sessions, setSessions] = useState<EditableSession[]>([])
  const [filter, setFilter] = useState<'cardio' | 'workouts'>('workouts')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<{
    session: EditableSession
    sets: EditableSet[]
    editMode: boolean
  } | null>(null)

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        router.replace('/login')
        return
      }
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, user_id, workout_id, workout_name, started_at, ended_at, duration_seconds')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setSessions(data as EditableSession[])
      }
    } finally {
      setIsLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    void loadSessions()
    const refresh = () => void loadSessions()
    window.addEventListener('nutriflow:data-updated', refresh)
    return () => window.removeEventListener('nutriflow:data-updated', refresh)
  }, [loadSessions])

  const cardioSessions = useMemo(() => sessions.filter(isCardioSession), [sessions])
  const workoutSessions = useMemo(() => sessions.filter(s => !isCardioSession(s)), [sessions])
  const visibleSessions = filter === 'cardio' ? cardioSessions : workoutSessions

  const openSessionEditor = async (item: EditableSession, editMode: boolean) => {
    const { data, error } = await supabase
      .from('workout_sets')
      .select('id, user_id, session_id, exercise_id, exercise_name, set_number, reps, weight_kg, completed_at')
      .eq('session_id', item.id)
      .order('completed_at', { ascending: true })

    if (error) {
      toast.error('Impossibile caricare le serie della sessione.')
      return
    }
    setSelectedSession({
      session: item,
      sets: (data ?? []) as EditableSet[],
      editMode,
    })
  }

  const trashSession = async (item: EditableSession) => {
    const { data: setsData } = await supabase
      .from('workout_sets')
      .select('id, user_id, session_id, exercise_id, exercise_name, set_number, reps, weight_kg, completed_at')
      .eq('session_id', item.id)

    const { error } = await supabase.from('workout_sessions').delete().eq('id', item.id)
    if (error) {
      toast.error('Impossibile spostare nel cestino.')
      return
    }

    moveToTrash({
      id: `workout_session:${item.id}`,
      kind: 'workout_session',
      title: item.workout_name,
      subtitle: `${Math.max(1, Math.round((item.duration_seconds || 0) / 60))} min · ${new Date(item.started_at).toLocaleDateString('it-IT')}`,
      session: item,
      sets: (setsData ?? []) as SetRowSnapshot[],
    })
    setSessions(current => current.filter(row => row.id !== item.id))
    toast.success('Spostato nel cestino (30 giorni).')
    window.dispatchEvent(new Event('nutriflow:data-updated'))
  }

  if (selectedSession) {
    return (
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 rounded-xl px-2 text-xs"
          onClick={() => setSelectedSession(null)}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Torna allo storico
        </Button>
        <SessionEditor
          session={selectedSession.session}
          initialSets={selectedSession.sets}
          initialEditMode={selectedSession.editMode}
          onSaved={(updatedSession, updatedSets) => {
            setSessions(current =>
              current.map(row => (row.id === updatedSession.id ? updatedSession : row)),
            )
            setSelectedSession({ session: updatedSession, sets: updatedSets, editMode: false })
          }}
          onClose={() => setSelectedSession(null)}
          closeLabel="Chiudi riepilogo"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Storico Allenamenti</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Tocca una sessione per il riepilogo dettagliato, modifica o sposta nel cestino
        </p>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-card/70 p-1">
        <button
          type="button"
          onClick={() => setFilter('workouts')}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
            filter === 'workouts'
              ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(122,166,189,0.25)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Dumbbell className="size-3.5" />
          Allenamenti ({workoutSessions.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('cardio')}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
            filter === 'cardio'
              ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(122,166,189,0.25)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Footprints className="size-3.5" />
          Corse ({cardioSessions.length})
        </button>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Caricamento storico...</p>
      ) : visibleSessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-xs text-muted-foreground">
            {filter === 'cardio'
              ? 'Nessuna corsa registrata finora.'
              : 'Nessun allenamento da scheda registrato finora.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleSessions.map(item => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                <button
                  type="button"
                  onClick={() => void openSessionEditor(item, false)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium">{item.workout_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.started_at).toLocaleDateString('it-IT', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                    {' · '}
                    <span className="inline-flex items-center gap-0.5 font-mono">
                      <Clock3 className="size-3" />
                      {formatDuration(item.duration_seconds || 0)}
                    </span>
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Modifica ${item.workout_name}`}
                    className="size-9 rounded-xl text-primary hover:bg-primary/15"
                    onClick={() => void openSessionEditor(item, true)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Sposta ${item.workout_name} nel cestino`}
                    className="size-9 rounded-xl text-amber-400/80 hover:bg-amber-500/15 hover:text-amber-400"
                    onClick={() => void trashSession(item)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
