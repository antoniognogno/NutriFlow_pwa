import { describe, expect, it } from 'vitest'
import { formatAppVersionLabel } from '@/config/appVersion'
import {
  evaluateRestartRequirement,
  formatRemainingEstimate,
  isRemoteVersionNewer,
} from './appUpdateUtils'

describe('appUpdateUtils', () => {
  it('formats app version label and remaining time estimates', () => {
    expect(formatAppVersionLabel('0.1.0', '2026.11.26.1725')).toBe('v0.1.0 (2026.11.26.1725)')
    expect(formatRemainingEstimate(3.2)).toBe('~4s rimasti')
    expect(formatRemainingEstimate(0.6)).toBe('Meno di 1s')
    expect(formatRemainingEstimate(0, true)).toBe('Completato')
  })

  it('requires restart when new SW installed, waiting, or remote build changed', () => {
    const withNewRemote = evaluateRestartRequirement({
      hasWaitingWorker: false,
      hasInstallingFinished: false,
      controllerChanged: false,
      localVersion: '0.1.0',
      localBuildId: '2026.11.26.1700',
      remoteInfo: { version: '0.1.0', buildId: '2026.11.26.1725' },
    })
    expect(withNewRemote.shouldRestart).toBe(true)
    expect(withNewRemote.reason).toBe('new_remote_build')

    const withSwWaiting = evaluateRestartRequirement({
      hasWaitingWorker: true,
      hasInstallingFinished: false,
      controllerChanged: false,
      localVersion: '0.1.0',
      localBuildId: '2026.11.26.1700',
      remoteInfo: null,
    })
    expect(withSwWaiting.shouldRestart).toBe(true)
    expect(withSwWaiting.reason).toBe('new_sw_waiting')
  })

  it('avoids unnecessary restart when version and build already match', () => {
    const alreadyLatest = evaluateRestartRequirement({
      hasWaitingWorker: false,
      hasInstallingFinished: false,
      controllerChanged: false,
      localVersion: '0.1.0',
      localBuildId: '2026.11.26.1725',
      remoteInfo: { version: '0.1.0', buildId: '2026.11.26.1725' },
    })
    expect(alreadyLatest.shouldRestart).toBe(false)
    expect(alreadyLatest.reason).toBe('already_latest')
    expect(isRemoteVersionNewer('0.1.0', '2026.11.26.1725', { version: '0.1.0', buildId: '2026.11.26.1725' })).toBe(false)
  })
})
