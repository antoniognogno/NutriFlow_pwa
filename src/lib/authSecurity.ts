const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:\s@"]+@[^\s@<>()[\]\\,;:\s@"]+\.[^\s@<>()[\]\\,;:\s@"]{2,}$/
const UNSAFE_TEXT_CHARS = /[<>\u0000-\u001F\u007F]/g
const CODE_OR_SQL_PATTERNS: RegExp[] = [
  /<\s*\/?[a-z!][^>]*>/i,
  /javascript\s*:/i,
  /\bon(?:error|load|click|mouseover|focus)\s*=/i,
  /\b(?:select\s+.+\s+from|insert\s+into|update\s+\w+\s+set|delete\s+from|drop\s+(?:table|database|schema)|union\s+(?:all\s+)?select|alter\s+table|truncate\s+table)\b/i,
  /(?:--|\*\/|\/\*)/,
  /;\s*(?:select|drop|delete|insert|update|exec|waitfor)\b/i,
  /\b(?:or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /\b(?:eval|Function|require|process\.env|document\.cookie|window\.location|__proto__)\b/i,
  /(?:=>|\$\{|#!\/)/,
]

export function containsCodeOrSql(raw: string): boolean {
  const input = raw.trim()
  if (!input) return false
  return CODE_OR_SQL_PATTERNS.some(pattern => pattern.test(input))
}

export function validateSafeUserText(raw: string, fieldLabel = 'Campo', maxLength = 120): {
  ok: boolean
  value: string
  error?: string
} {
  if (containsCodeOrSql(raw) || /[<>]/.test(raw)) {
    return {
      ok: false,
      value: '',
      error: `${fieldLabel}: non è consentito inserire codice, tag HTML o comandi SQL.`,
    }
  }
  return {
    ok: true,
    value: sanitizePlainText(raw, maxLength),
  }
}

export const GDPR_POLICY_VERSION = '2026-11-EU-v1'
const LOGIN_THROTTLE_KEY = 'nutriflow:auth-throttle-v1'
const MAX_ATTEMPTS_BEFORE_COOLDOWN = 5
const COOLDOWN_MS = 30_000

export function normalizeEmail(raw: string): string {
  return raw.replace(UNSAFE_TEXT_CHARS, '').trim().toLowerCase()
}

export function isValidEmail(raw: string): boolean {
  if (UNSAFE_TEXT_CHARS.test(raw)) return false
  const email = raw.trim().toLowerCase()
  return email.length >= 5 && email.length <= 254 && EMAIL_PATTERN.test(email)
}

export function sanitizePlainText(raw: string, maxLength = 120): string {
  return raw.replace(UNSAFE_TEXT_CHARS, '').trim().slice(0, maxLength)
}

export function validateSignupPassword(password: string): string | null {
  if (password.length < 8) {
    return 'La password deve avere almeno 8 caratteri.'
  }
  if (password.length > 128) {
    return 'La password supera la lunghezza massima consentita (128 caratteri).'
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Usa almeno una lettera maiuscola, una minuscola e un numero.'
  }
  return null
}

export function mapAuthErrorMessage(error: { message?: string } | null | undefined): string {
  const msg = (error?.message ?? '').toLowerCase()
  if (msg.includes('invalid login credentials')) {
    return 'Email o password non corretti.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Conferma prima la tua email tramite il link ricevuto.'
  }
  if (msg.includes('user already registered')) {
    return 'Esiste già un account associato a questa email.'
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Troppi tentativi ravvicinati. Attendi qualche secondo e riprova.'
  }
  if (msg.includes('password')) {
    return 'Password non valida: verifica i requisiti richiesti.'
  }
  return 'Operazione non riuscita. Verifica i dati inseriti o la connessione.'
}

interface ThrottleRecord {
  failures: number
  lockedUntil: number
}

export function getLoginCooldownRemainingMs(now = Date.now()): number {
  try {
    const raw = sessionStorage.getItem(LOGIN_THROTTLE_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as Partial<ThrottleRecord>
    if (typeof parsed.lockedUntil === 'number' && parsed.lockedUntil > now) {
      return parsed.lockedUntil - now
    }
    return 0
  } catch {
    return 0
  }
}

export function recordFailedLoginAttempt(now = Date.now()): number {
  try {
    const raw = sessionStorage.getItem(LOGIN_THROTTLE_KEY)
    const prev = raw ? (JSON.parse(raw) as Partial<ThrottleRecord>) : {}
    const failures = (typeof prev.failures === 'number' ? prev.failures : 0) + 1
    const lockedUntil = failures >= MAX_ATTEMPTS_BEFORE_COOLDOWN ? now + COOLDOWN_MS : 0
    sessionStorage.setItem(LOGIN_THROTTLE_KEY, JSON.stringify({ failures, lockedUntil }))
    return lockedUntil > now ? COOLDOWN_MS : 0
  } catch {
    return 0
  }
}

export function clearFailedLoginAttempts(): void {
  try {
    sessionStorage.removeItem(LOGIN_THROTTLE_KEY)
  } catch {
    // Ignore storage access errors
  }
}
