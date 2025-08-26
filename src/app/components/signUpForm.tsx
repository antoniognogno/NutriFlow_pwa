'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null) // Per i messaggi di successo

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError("Errore durante la registrazione: " + error.message)
      return
    }

    if (data.user) {
      // Invece di un alert, mostriamo un messaggio carino e reindirizziamo
      setMessage("Registrazione avvenuta! Controlla la tua email per la conferma. Verrai reindirizzato al login...")
      
      // Aspettiamo 3 secondi prima di reindirizzare, così l'utente può leggere il messaggio
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  return (
    <Card className={cn("w-full", className)} {...props}>
      <CardHeader>
        <CardTitle>Crea un account</CardTitle>
        <CardDescription>Inizia il tuo percorso con NutriFlow.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignUp}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="input"
              placeholder="tua@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {/* Mostra messaggi di errore o successo */}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          {message && <p className="text-sm font-medium text-green-500">{message}</p>}
        </CardContent>
        <CardFooter className="mt-5 flex flex-col gap-4">
          <Button type="submit" className="w-full">Registrati</Button>
          <div className="text-center text-sm">
            Hai già un account?{" "}
            <Link href="/login" className="underline">
              Accedi
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}