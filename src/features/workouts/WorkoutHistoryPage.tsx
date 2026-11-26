'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock3, Dumbbell, Footprints, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { offlineDatabase } from '@/features/offline/database'
import { createClient } from '@/lib/supabase/client'
import { SessionEditor, type EditableSession, type EditableSet } from './SessionEditor'
import {
  cacheSetsForSession,
  mergeRemoteAndCachedSessions,
  readCachedSessions,
  readCachedSetsForSession,
  saveCachedSessions,
} from './workoutOfflineCache'
import { moveWorkoutSessionToTrash, type TrashSessionSupabaseLike } from './workoutTrashHelper'
import { formatDuration, isCardioSession } from './workoutUtils'

export function WorkoutHistoryView() {
  const router = useRouter()
  const supabase = createClient()

  const [sessions, setSessions] = useState<EditableSession[]>(() => readCachedSessions())
  const [filter, setFilter] = useState<'cardio' | 'workouts'>('workouts')
  const [isLoading, setIsLoading] = useState(() => readCachedSessions().length === 0)
  const [pendingTrashSession, setPendingTrashSession] = useState<EditableSession | null>(null)
  const [selectedSession, setSelectedSession] = useState<{
    session: EditableSession
    sets: EditableSet[]
    editMode: boolean
  } | null>(null)

  const loadSessions = useCallback(async () => {
    const cached = readCachedSessions()
    if (cached.length === 0) {
      setIsLoading(true)
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        router.replace('/login')
        return
      }

      const pendingOutbox = await offlineDatabase.outbox
        .where('userId')
        .equals(user.id)
        .toArray()
      const pendingIds = new Set(
        pendingOutbox
          .filter(item => item.table === 'workout_sessions')
          .map(item => (item.payload as { id?: string }).id ?? '')
          .filter(Boolean),
      )
      const pendingDeleteSessionIds = new Set(
        pendingOutbox
          .filter(item => item.table === 'workout_sessions_delete')
          .map(item => item.payload.session_id)
          .filter(Boolean),
      )

      if (!navigator.onLine) {
        setSessions(cached.filter(row => !pendingDeleteSessionIds.has(row.id)))
        return
      }

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, user_id, workout_id, workout_name, started_at, ended_at, duration_seconds')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        const merged = mergeRemoteAndCachedSessions(
          data as EditableSession[],
          cached,
          pendingIds,
          pendingDeleteSessionIds,
        )
        setSessions(merged)
        saveCachedSessions(merged)
      } else {
        setSessions(cached.filter(row => !pendingDeleteSessionIds.has(row.id)))
      }
    } catch {
      setSessions(readCachedSessions())
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
    const localSets = readCachedSetsForSession(item.id)
    if (!navigator.onLine) {
      setSelectedSession({
        session: item,
        sets: localSets,
        editMode,
      })
      return
    }

    const { data, error } = await supabase
      .from('workout_sets')
      .select('id, user_id, session_id, exercise_id, exercise_name, set_number, reps, weight_kg, completed_at')
      .eq('session_id', item.id)
      .order('completed_at', { ascending: true })

    if (error) {
      if (localSets.length > 0) {
        setSelectedSession({ session: item, sets: localSets, editMode })
        return
      }
      toast.error('Impossibile caricare le serie della sessione.')
      return
    }
    const resolved = ((data ?? []) as EditableSet[]).length > 0 ? (data as EditableSet[]) : localSets
    cacheSetsForSession(item.id, resolved)
    setSelectedSession({
      session: item,
      sets: resolved,
      editMode,
    })
  }

  const trashSession = async (item: EditableSession) => {
    try {
      const outcome = await moveWorkoutSessionToTrash(item, {
        supabase: supabase as unknown as TrashSessionSupabaseLike,
        isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
      })
      setSessions(current => current.filter(row => row.id !== item.id))
      toast.success(
        outcome === 'offline'
          ? 'Spostato nel cestino offline (verrà sincronizzato).'
          : outcome === 'queued'
            ? 'Spostato nel cestino (eliminazione cloud in coda sync).'
            : 'Spostato nel cestino (30 giorni).',
      )
      window.dispatchEvent(new Event('nutriflow:data-updated'))
    } catch (error) {
      console.error('Impossibile spostare la sessione nel cestino:', error)
      toast.error('Impossibile spostare nel cestino.')
    }
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
                    onClick={() => setPendingTrashSession(item)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={pendingTrashSession !== null}
        onOpenChange={open => {
          if (!open) setPendingTrashSession(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Spostare “{pendingTrashSession?.workout_name}” nel cestino?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per spostare questa sessione dallo storico al cestino. Potrai comunque ripristinarla entro 30 giorni oppure eliminarla definitivamente da lì. Sei sicuro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-500"
              onClick={() => {
                const target = pendingTrashSession
                setPendingTrashSession(null)
                if (target) {
                  void trashSession(target)
                }
              }}
            >
              Sposta nel cestino
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
