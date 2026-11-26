'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  clearFailedLoginAttempts,
  getLoginCooldownRemainingMs,
  isValidEmail,
  mapAuthErrorMessage,
  normalizeEmail,
  recordFailedLoginAttempt,
} from '@/lib/authSecurity'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setInfoMessage(null)

    const remainingMs = getLoginCooldownRemainingMs()
    if (remainingMs > 0) {
      setError(`Troppi tentativi falliti. Riprova tra ${Math.ceil(remainingMs / 1000)} secondi.`)
      return
    }

    const cleanEmail = normalizeEmail(email)
    if (!isValidEmail(cleanEmail)) {
      setError('Inserisci un indirizzo email valido.')
      return
    }
    if (!password) {
      setError('Inserisci la tua password.')
      return
    }

    setIsLoading(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (signInError) {
      const lockMs = recordFailedLoginAttempt()
      const friendly = mapAuthErrorMessage(signInError)
      setError(
        lockMs > 0
          ? `${friendly} Troppi tentativi: riprova tra ${Math.ceil(lockMs / 1000)}s.`
          : friendly,
      )
      setIsLoading(false)
      return
    }

    if (!data.session) {
      setError('Accesso completato ma sessione non ricevuta. Riprova.')
      setIsLoading(false)
      return
    }

    clearFailedLoginAttempts()
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setInfoMessage(null)
    setIsLoading(true)
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      setError(mapAuthErrorMessage(oauthError))
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError(null)
    setInfoMessage(null)
    const cleanEmail = normalizeEmail(email)
    if (!isValidEmail(cleanEmail)) {
      setError('Inserisci prima la tua email per ricevere il link di recupero password.')
      return
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (resetError) {
      setError(mapAuthErrorMessage(resetError))
      return
    }
    setInfoMessage('Se l’email è registrata, riceverai a breve un link per reimpostare la password.')
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bentornato!</CardTitle>
          <CardDescription>Accedi al tuo account NutriFlow</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={e => void handleLogin(e)} noValidate>
            <div className="grid gap-5">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tua@email.com"
                    required
                    maxLength={254}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => void handleResetPassword()}
                      className="ml-auto inline-block text-xs text-primary underline underline-offset-4 hover:opacity-80"
                    >
                      Password dimenticata?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-center text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
                {infoMessage && (
                  <p role="status" className="text-center text-xs font-medium text-emerald-500">
                    {infoMessage}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Accesso in corso...' : 'Accedi'}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Oppure continua con</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                onClick={() => void handleGoogleSignIn()}
              >
                Accedi con Google
              </Button>

              <div className="text-center text-sm">
                Non hai un account?{' '}
                <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
                  Registrati
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground">
        Continuando accetti i{' '}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Termini di Servizio
        </Link>{' '}
        e la nostra{' '}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy (GDPR UE)
        </Link>
        .
      </div>
    </div>
  )
}
