export interface RemoteVersionInfo {
  version: string
  buildId: string
  builtAt?: string
}

export type UpdateStage =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'installing'
  | 'evaluating'
  | 'restart_required'
  | 'up_to_date'
  | 'error'

export interface RestartEvaluation {
  shouldRestart: boolean
  reason: 'new_sw_waiting' | 'new_sw_installed' | 'controller_changed' | 'new_remote_build' | 'already_latest'
  targetVersion: string
  headline: string
  detail: string
}

export function formatRemainingEstimate(seconds: number, completed: boolean = false): string {
  if (completed || seconds <= 0) return 'Completato'
  if (seconds < 1) return 'Meno di 1s'
  return `~${Math.ceil(seconds)}s rimasti`
}

export function evaluateRestartRequirement(input: {
  hasWaitingWorker: boolean
  hasInstallingFinished: boolean
  controllerChanged: boolean
  localVersion: string
  localBuildId: string
  remoteInfo: RemoteVersionInfo | null
}): RestartEvaluation {
  const remoteChanged = Boolean(
    input.remoteInfo &&
      (input.remoteInfo.version !== input.localVersion ||
        (input.remoteInfo.buildId &&
          input.localBuildId !== 'dev' &&
          input.remoteInfo.buildId !== input.localBuildId)),
  )
  const targetVersion =
    input.remoteInfo?.version && input.remoteInfo.version !== input.localVersion
      ? `${input.remoteInfo.version} (${input.remoteInfo.buildId})`
      : `${input.localVersion} (${input.remoteInfo?.buildId ?? input.localBuildId})`

  if (input.controllerChanged) {
    return {
      shouldRestart: true,
      reason: 'controller_changed',
      targetVersion,
      headline: 'Aggiornamento applicato!',
      detail: 'I nuovi moduli sono pronti: riavvia NutriFlow per evitare schermate non allineate.',
    }
  }
  if (input.hasWaitingWorker) {
    return {
      shouldRestart: true,
      reason: 'new_sw_waiting',
      targetVersion,
      headline: 'Nuova versione scaricata!',
      detail: 'È pronto un nuovo Service Worker: consigliato il riavvio per attivarlo subito.',
    }
  }
  if (input.hasInstallingFinished) {
    return {
      shouldRestart: true,
      reason: 'new_sw_installed',
      targetVersion,
      headline: 'Installazione completata!',
      detail: 'Il pacchetto aggiornato è stato scaricato: riavvia l’app per usarlo.',
    }
  }
  if (remoteChanged) {
    return {
      shouldRestart: true,
      reason: 'new_remote_build',
      targetVersion,
      headline: 'Nuova build rilevata sul server!',
      detail: 'È disponibile una build più recente: riavvia per scaricare i nuovi file.',
    }
  }

  return {
    shouldRestart: false,
    reason: 'already_latest',
    targetVersion: `${input.localVersion} (${input.localBuildId})`,
    headline: 'NutriFlow è già aggiornato',
    detail: 'Nessun riavvio necessario: stai già usando l’ultima versione disponibile.',
  }
}

export function isRemoteVersionNewer(
  localVersion: string,
  localBuildId: string,
  remoteInfo: RemoteVersionInfo | null,
): boolean {
  if (!remoteInfo) return false
  return (
    remoteInfo.version !== localVersion ||
    (Boolean(remoteInfo.buildId) && localBuildId !== 'dev' && remoteInfo.buildId !== localBuildId)
  )
}
