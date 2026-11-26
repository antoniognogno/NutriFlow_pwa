import { Bell, Minus, Plus, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TimerStatus } from '@/features/timers/useTimestampTimer'

interface FloatingRestTimerProps {
  status: TimerStatus
  remainingMs: number
  onAddSeconds: (seconds: number) => void
  onSkip: () => void
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
}

export function FloatingRestTimer({
  status,
  remainingMs,
  onAddSeconds,
  onSkip,
}: FloatingRestTimerProps) {
  if (status === 'idle') return null

  return (
    <aside
      className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card/90 p-3 shadow-2xl backdrop-blur-2xl"
      aria-live="polite"
      aria-label="Timer recupero"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bell className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {status === 'complete' ? 'Pausa terminata' : 'Recupero'}
          </p>
          <p className="font-mono text-xl font-bold tabular-nums">{formatTime(remainingMs)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Riduci recupero di 15 secondi"
          onClick={() => onAddSeconds(-15)}
          disabled={status !== 'running'}
        >
          <Minus className="size-4" />
          <span className="sr-only">15 secondi</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Aggiungi 30 secondi al recupero"
          onClick={() => onAddSeconds(30)}
          disabled={status !== 'running'}
        >
          <Plus className="size-4" />
          <span className="sr-only">30 secondi</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={onSkip}>
          <SkipForward className="mr-1 size-4" />
          Salta
        </Button>
      </div>
    </aside>
  )
}
