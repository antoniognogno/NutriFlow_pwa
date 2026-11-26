export const TOUR_STATE_KEY = 'nutriflow:tour-state-v1'
export const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000
export const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000
const SESSION_ENTRY_MODE_KEY = 'nutriflow:session-entry-mode-v1'
const CTA_DISMISSED_AT_KEY = 'nutriflow:welcome-cta-dismissed-v1'

export type SessionEntryMode = 'first_visit' | 'inactive_3m' | 'active'

export interface TourState {
  lastActiveAt: number | null
  lastCompletedOrSkippedAt: number | null
}

export interface TourStep {
  id: string
  route: string
  selector: string
  pathLabel: string
  title: string
  description: string
  actionHint: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'nav-overview',
    route: '/dashboard',
    selector: '[data-tour="app-nav-bar"]',
    pathLabel: 'Menu principale',
    title: 'Naviga tra le 4 aree',
    description: 'Da qui passi subito tra Oggi, Workout, Routine e Nutrizione.',
    actionHint: 'Per le Impostazioni tocca invece l’icona Profilo in alto a destra',
  },
  {
    id: 'home-progress',
    route: '/dashboard',
    selector: '[data-tour="home-progress"]',
    pathLabel: 'Menu → Oggi',
    title: 'Anelli dei tuoi obiettivi',
    description: 'Controlli a colpo d’occhio allenamenti settimanali, acqua e focus.',
    actionHint: 'I target si personalizzano dalle Impostazioni',
  },
  {
    id: 'home-today',
    route: '/dashboard',
    selector: '[data-tour="home-today"]',
    pathLabel: 'Menu → Oggi → Azioni rapide',
    title: 'Creatina & azioni in 1 tap',
    description: 'Segna creatina, bicchieri d’acqua o timer Focus anche offline.',
    actionHint: 'Tutto viene sincronizzato appena torna la rete',
  },
  {
    id: 'gym-new-plan',
    route: '/dashboard/gym',
    selector: '[data-tour="gym-new-plan"]',
    pathLabel: 'Menu → Workout → Le mie schede',
    title: 'Crea schede personalizzate',
    description: 'Tocca "Nuova Scheda" per impostare esercizi, serie, recuperi e superserie.',
    actionHint: 'Le schede salvate si avviano anche senza connessione',
  },
  {
    id: 'stats-kpis',
    route: '/dashboard/stats',
    selector: '[data-tour="stats-kpis"]',
    pathLabel: 'Menu → Workout → Stats',
    title: 'Volumi, PR 1RM e Storico',
    description: 'Analizzi volumi settimanali, massimali stimati (Epley) e ogni sessione.',
    actionHint: 'Tocca un PR o una riga dello storico per vedere i dettagli',
  },
  {
    id: 'routine-tabs',
    route: '/dashboard/routine',
    selector: '[data-tour="routine-tabs"]',
    pathLabel: 'Menu → Routine',
    title: 'Abitudini & Peso corporeo',
    description: 'Passa tra checklist abitudini quotidiane e andamento del peso con media 7g.',
    actionHint: 'Ogni spunta aggiorna automaticamente la tua costanza',
  },
  {
    id: 'nutrition-summary',
    route: '/dashboard/nutrition',
    selector: '[data-tour="nutrition-summary"]',
    pathLabel: 'Menu → Nutrizione',
    title: 'Calorie, Macro e Pasti',
    description: 'Monitori calorie, proteine, carboidrati e grassi con ricerca alimenti.',
    actionHint: 'Aggiungi o modifica i pasti anche offline',
  },
  {
    id: 'water-controls',
    route: '/dashboard/water',
    selector: '[data-tour="water-controls"]',
    pathLabel: 'Menu → Nutrizione → Acqua',
    title: 'Idratazione in 1 tap',
    description: 'Scegli dosi rapide personalizzabili, modifica l’ultima bevuta o i litri.',
    actionHint: 'Premi un formato (es. Borraccia) per registrare subito',
  },
  {
    id: 'settings-profile',
    route: '/dashboard/settings',
    selector: '[data-tour="settings-profile-card"]',
    pathLabel: 'Icona Profilo (in alto a destra) → Impostazioni',
    title: 'Obiettivi, aggiornamenti e tour',
    description: 'Apri "Personalizza" per peso e target, o cerca aggiornamenti PWA in fondo.',
    actionHint: 'Puoi riavviare o saltare questo tour quando vuoi da qui',
  },
]

export function readTourState(): TourState {
  try {
    const raw = localStorage.getItem(TOUR_STATE_KEY)
    if (!raw) return { lastActiveAt: null, lastCompletedOrSkippedAt: null }
    const parsed = JSON.parse(raw) as Partial<TourState>
    return {
      lastActiveAt: typeof parsed.lastActiveAt === 'number' ? parsed.lastActiveAt : null,
      lastCompletedOrSkippedAt:
        typeof parsed.lastCompletedOrSkippedAt === 'number' ? parsed.lastCompletedOrSkippedAt : null,
    }
  } catch {
    return { lastActiveAt: null, lastCompletedOrSkippedAt: null }
  }
}

export function saveTourState(state: TourState): void {
  try {
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota issues
  }
}

export function touchTourActivity(now = Date.now()): TourState {
  const current = readTourState()
  const next: TourState = {
    lastActiveAt: now,
    lastCompletedOrSkippedAt: current.lastCompletedOrSkippedAt,
  }
  saveTourState(next)
  return next
}

export function markTourDismissed(now = Date.now()): TourState {
  const next: TourState = {
    lastActiveAt: now,
    lastCompletedOrSkippedAt: now,
  }
  saveTourState(next)
  return next
}

export function shouldAutoStartTour(state: TourState, now = Date.now()): boolean {
  if (state.lastActiveAt === null) return false
  const inactiveLongEnough = now - state.lastActiveAt >= ONE_MONTH_MS
  if (!inactiveLongEnough) return false
  if (
    state.lastCompletedOrSkippedAt !== null &&
    now - state.lastCompletedOrSkippedAt < ONE_MONTH_MS
  ) {
    return false
  }
  return true
}

export function requestAppTourStart(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nutriflow:start-tour'))
  }
}

export function evaluateSessionEntryMode(state: TourState, now = Date.now()): SessionEntryMode {
  if (state.lastActiveAt === null) return 'first_visit'
  if (now - state.lastActiveAt >= THREE_MONTHS_MS) return 'inactive_3m'
  return 'active'
}

export function captureAndGetSessionEntryMode(now = Date.now()): SessionEntryMode {
  try {
    const cached = sessionStorage.getItem(SESSION_ENTRY_MODE_KEY)
    if (cached === 'first_visit' || cached === 'inactive_3m' || cached === 'active') {
      return cached
    }
    const mode = evaluateSessionEntryMode(readTourState(), now)
    sessionStorage.setItem(SESSION_ENTRY_MODE_KEY, mode)
    return mode
  } catch {
    return evaluateSessionEntryMode(readTourState(), now)
  }
}

export function isWelcomeCtaDismissed(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(CTA_DISMISSED_AT_KEY)
    if (!raw) return false
    const dismissedAt = Number(raw)
    return Number.isFinite(dismissedAt) && now - dismissedAt < ONE_MONTH_MS
  } catch {
    return false
  }
}

export function dismissWelcomeCta(now = Date.now()): void {
  try {
    localStorage.setItem(CTA_DISMISSED_AT_KEY, String(now))
  } catch {
    // Ignore storage issues
  }
}
