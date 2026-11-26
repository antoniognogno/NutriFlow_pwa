import { describe, expect, it } from 'vitest'
import {
  containsCodeOrSql,
  isValidEmail,
  mapAuthErrorMessage,
  normalizeEmail,
  sanitizePlainText,
  validateSafeUserText,
  validateSignupPassword,
} from './authSecurity'

describe('Auth Security & Input Sanitization', () => {
  it('normalizes and validates email inputs cleanly', () => {
    expect(normalizeEmail('  User@Example.COM \n')).toBe('user@example.com')
    expect(isValidEmail('utente@nutriflow.eu')).toBe(true)
    expect(isValidEmail('bad<script>@domain.com')).toBe(false)
    expect(isValidEmail('not-an-email')).toBe(false)
  })

  it('enforces strong passwords on signup and strips unsafe chars', () => {
    expect(validateSignupPassword('short')).toContain('8 caratteri')
    expect(validateSignupPassword('alllowercase1')).toContain('maiuscola')
    expect(validateSignupPassword('NoNumbersHere')).toContain('numero')
    expect(validateSignupPassword('Sicura123!')).toBeNull()

    expect(sanitizePlainText(' <script>alert(1)</script> ', 20)).toBe('scriptalert(1)/scrip')
  })

  it('maps raw Supabase auth errors to safe Italian messages', () => {
    expect(mapAuthErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Email o password non corretti.',
    )
    expect(mapAuthErrorMessage({ message: 'User already registered' })).toContain(
      'Esiste già un account',
    )
  })

  it('rejects SQL injection, HTML/JS scripts, and programming code while allowing normal fitness text', () => {
    expect(containsCodeOrSql('Panca Piana 4x8')).toBe(false)
    expect(containsCodeOrSql('Dieta iperproteica, yogurt 150g')).toBe(false)
    expect(containsCodeOrSql("'; DROP TABLE profiles; --")).toBe(true)
    expect(containsCodeOrSql('SELECT * FROM workout_plans')).toBe(true)
    expect(containsCodeOrSql('<script>alert(1)</script>')).toBe(true)
    expect(containsCodeOrSql('() => process.env.SECRET')).toBe(true)

    const rejected = validateSafeUserText('SELECT id FROM users', 'Nome')
    expect(rejected.ok).toBe(false)
    const accepted = validateSafeUserText('Mario Rossi', 'Nome')
    expect(accepted.ok).toBe(true)
    expect(accepted.value).toBe('Mario Rossi')
  })
})
