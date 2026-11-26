'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, RefreshCw, Sparkles, X } from 'lucide-react'
import { NutriFlowLogo } from '@/components/NutriFlowLogo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatRemainingEstimate,
  type RestartEvaluation,
  type UpdateStage,
} from './appUpdateUtils'

export interface UpdateProgressModalProps {
  open: boolean
  stage: UpdateStage
  progress: number
  estimatedSecondsLeft: number
  currentVersion: string
  currentBuildId: string
  targetVersion?: string | null
  stepLabel: string
  evaluation: RestartEvaluation | null
  errorMessage?: string | null
  onRestartNow: () => void
  onClose: () => void
}

export function UpdateProgressModal({
  open,
  stage,
  progress,
  estimatedSecondsLeft,
  currentVersion,
  currentBuildId,
  targetVersion,
  stepLabel,
  evaluation,
  errorMessage,
  onRestartNow,
  onClose,
}: UpdateProgressModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [autoRestartPaused, setAutoRestartPaused] = useState(false)
  const restartCallbackRef = useRef(onRestartNow)
  restartCallbackRef.current = onRestartNow

  useEffect(() => {
    if (!open || stage !== 'restart_required') {
      setCountdown(null)
      setAutoRestartPaused(false)
      return
    }
    if (autoRestartPaused) return

    setCountdown(4)
    const interval = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          window.clearInterval(interval)
          restartCallbackRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [autoRestartPaused, open, stage])

  if (!open) return null

  const isWorking =
    stage === 'checking' ||
    stage === 'downloading' ||
    stage === 'installing' ||
    stage === 'evaluating'
  const isCompleted = stage === 'restart_required' || stage === 'up_to_date'
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nf-update-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-md"
    >
      <div className="nf-pop-enter relative w-full max-w-sm overflow-hidden rounded-3xl border border-border/80 bg-card p-6 text-card-foreground shadow-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-64 -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-500/20 via-sky-500/15 to-transparent blur-2xl"
        />

        {!isWorking && (
          <button
            type="button"
            aria-label="Chiudi finestra aggiornamento"
            onClick={onClose}
            className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}

        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-4 flex size-24 items-center justify-center">
            {isWorking && (
              <div
                aria-hidden="true"
                className="absolute inset-0 animate-spin rounded-[28%] border-2 border-transparent border-t-emerald-400 border-r-sky-400/70"
                style={{ animationDuration: '1.6s' }}
              />
            )}
            <div className={isWorking ? 'nf-splash-logo rounded-[24%]' : 'rounded-[24%]'}>
              <NutriFlowLogo className="size-16" />
            </div>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
            <Badge variant="outline" className="border-sky-500/35 bg-sky-500/10 font-mono text-[11px] text-sky-400">
              v{currentVersion} · {currentBuildId}
            </Badge>
            {targetVersion && targetVersion !== `${currentVersion} (${currentBuildId})` && (
              <Badge variant="secondary" className="border border-emerald-500/35 bg-emerald-500/15 font-mono text-[11px] text-emerald-400">
                → v{targetVersion}
              </Badge>
            )}
          </div>

          <h2 id="nf-update-modal-title" className="text-lg font-bold tracking-tight">
            {stage === 'restart_required'
              ? evaluation?.headline ?? 'Aggiornamento pronto'
              : stage === 'up_to_date'
                ? 'NutriFlow è già aggiornato'
                : stage === 'error'
                  ? 'Verifica non completata'
                  : 'Aggiornamento in corso...'}
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {stage === 'error'
              ? errorMessage || 'Impossibile completare la verifica in questo momento.'
              : evaluation?.detail ?? stepLabel}
          </p>

          <div className="mt-5 w-full space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="truncate text-muted-foreground">{stepLabel}</span>
              <span className="shrink-0 font-mono text-foreground">{safeProgress}%</span>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={safeProgress}
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 transition-[width] duration-300 ease-out"
                style={{ width: `${safeProgress}%` }}
              />
              {isWorking && (
                <div
                  aria-hidden="true"
                  className="nf-splash-bar absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {isWorking
                  ? 'Analisi pacchetti PWA'
                  : stage === 'restart_required'
                    ? 'Valutazione: riavvio consigliato'
                    : stage === 'up_to_date'
                      ? 'Valutazione: riavvio non necessario'
                      : 'Verifica interrotta'}
              </span>
              <span className="font-mono">
                {formatRemainingEstimate(estimatedSecondsLeft, isCompleted)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex w-full flex-col gap-2">
            {stage === 'restart_required' && (
              <>
                <Button
                  type="button"
                  onClick={onRestartNow}
                  className="h-11 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <RefreshCw className="mr-1.5 size-4" />
                  {countdown !== null && !autoRestartPaused
                    ? `Riavvia ora (${countdown}s)`
                    : 'Riavvia app ora'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAutoRestartPaused(true)
                    onClose()
                  }}
                  className="h-10 w-full rounded-xl text-xs"
                >
                  Riavvia più tardi
                </Button>
              </>
            )}

            {stage === 'up_to_date' && (
              <Button
                type="button"
                onClick={onClose}
                className="h-10 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-500"
              >
                <CheckCircle2 className="mr-1.5 size-4" />
                Continua su v{currentVersion}
              </Button>
            )}

            {stage === 'error' && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 w-full rounded-xl"
              >
                <Sparkles className="mr-1.5 size-4" />
                Chiudi
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
