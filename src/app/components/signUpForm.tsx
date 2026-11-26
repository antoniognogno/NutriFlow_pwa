'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  GDPR_POLICY_VERSION,
  isValidEmail,
  mapAuthErrorMessage,
  normalizeEmail,
  validateSignupPassword,
} from '@/lib/authSecurity'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedGdpr, setAcceptedGdpr] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)
    setMessage(null)

    const cleanEmail = normalizeEmail(email)
    if (!isValidEmail(cleanEmail)) {
      setError('Inserisci un indirizzo email valido.')
      return
    }
    const passwordIssue = validateSignupPassword(password)
    if (passwordIssue) {
      setError(passwordIssue)
      return
    }
    if (!acceptedGdpr) {
      setError('Devi accettare i Termini di Servizio e la Privacy Policy (GDPR UE) per registrarti.')
      return
    }

    setIsSubmitting(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          gdpr_accepted_at: new Date().toISOString(),
          gdpr_version: GDPR_POLICY_VERSION,
        },
      },
    })

    if (signUpError) {
      setError(mapAuthErrorMessage(signUpError))
      setIsSubmitting(false)
      return
    }

    if (data.user) {
      setMessage(
        'Registrazione avvenuta! Controlla la tua email per confermare l’account. Reindirizzamento al login...',
      )
      window.setTimeout(() => {
        router.push('/login')
      }, 2800)
    }
    setIsSubmitting(false)
  }

  return (
    <Card className={cn('w-full', className)} {...props}>
      <CardHeader>
        <CardTitle>Crea un account</CardTitle>
        <CardDescription>Inizia il tuo percorso con NutriFlow.</CardDescription>
      </CardHeader>
      <form onSubmit={e => void handleSignUp(e)} noValidate>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="tua@email.com"
              maxLength={254}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimo 8 caratteri (Aa1)"
              maxLength={128}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Almeno 8 caratteri con una maiuscola, una minuscola e un numero.
            </p>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            <Checkbox
              id="gdpr-consent"
              checked={acceptedGdpr}
              onCheckedChange={checked => setAcceptedGdpr(Boolean(checked))}
              className="mt-0.5 shrink-0"
            />
            <span>
              Dichiaro di avere almeno 16 anni, accetto i{' '}
              <Link href="/terms" className="font-medium text-primary underline underline-offset-4">
                Termini di Servizio
              </Link>{' '}
              e la{' '}
              <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
                Privacy Policy (GDPR UE)
              </Link>{' '}
              e acconsento al trattamento dei dati per fitness e benessere.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm font-medium text-emerald-500">
              {message}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-4">
          <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {isSubmitting ? 'Registrazione...' : 'Registrati'}
          </Button>
          <div className="text-center text-sm">
            Hai già un account?{' '}
            <Link href="/login" className="font-medium text-primary underline underline-offset-4">
              Accedi
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
