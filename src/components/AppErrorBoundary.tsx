import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Home, RefreshCw } from 'lucide-react'
import { NutriFlowLogo } from '@/components/NutriFlowLogo'
import { Button } from '@/components/ui/button'
import {
  clearChunkReloadAttempt,
  getErrorMessage,
  isNavigatorOnline,
  isRecoverableChunkError,
  readLastChunkReloadAttempt,
  shouldAttemptAutoReload,
  triggerSingleAssetReload,
} from '@/lib/chunkRecovery'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
  error: unknown
  isAutoReloading: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
    isAutoReloading: false,
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      error,
      isAutoReloading: false,
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Errore UI intercettato da AppErrorBoundary:', error, info.componentStack)
    const isOnline = isNavigatorOnline()
    const lastAttemptAt = readLastChunkReloadAttempt()
    if (shouldAttemptAutoReload({ error, isOnline, lastAttemptAt })) {
      this.setState({ isAutoReloading: true })
      triggerSingleAssetReload({ isOnline })
    }
  }

  private handleReload = async () => {
    clearChunkReloadAttempt()
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        await reg?.update().catch(() => undefined)
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }
    } catch {
      // Ignore SW check issues and still reload
    }
    window.location.reload()
  }

  private handleGoHome = () => {
    clearChunkReloadAttempt()
    this.setState({ hasError: false, error: null, isAutoReloading: false })
    window.location.assign('/dashboard')
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const chunkIssue = isRecoverableChunkError(this.state.error)
    const message = getErrorMessage(this.state.error)

    return (
      <div
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10 text-foreground"
      >
        <div className="w-full max-w-sm space-y-5 rounded-3xl border border-border/70 bg-card p-6 text-center shadow-xl">
          <div className="mx-auto flex size-20 items-center justify-center">
            <div className="nf-splash-logo rounded-[22%]">
              <NutriFlowLogo className="size-16" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold tracking-tight">
              {this.state.isAutoReloading
                ? 'Aggiornamento di NutriFlow...'
                : chunkIssue
                  ? 'Nuova versione disponibile'
                  : 'Ripristino schermata NutriFlow'}
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {this.state.isAutoReloading
                ? 'Ricarico automaticamente i nuovi file dell’app per evitare schermate vuote.'
                : chunkIssue
                  ? 'Alcune risorse dell’app si sono aggiornate sul server. Tocca Ricarica per riprendere subito.'
                  : 'Si è verificato un imprevisto durante il caricamento della pagina. I tuoi dati locali restano al sicuro.'}
            </p>
          </div>

          {this.state.isAutoReloading ? (
            <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-muted">
              <div className="nf-splash-bar h-full w-1/2 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => void this.handleReload()}
                className="h-11 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <RefreshCw className="mr-1.5 size-4" />
                Ricarica NutriFlow
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={this.handleGoHome}
                className="h-10 w-full rounded-xl"
              >
                <Home className="mr-1.5 size-4" />
                Torna alla Home
              </Button>
            </div>
          )}

          {message && !this.state.isAutoReloading && (
            <p className="truncate rounded-lg bg-muted/50 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      </div>
    )
  }
}
