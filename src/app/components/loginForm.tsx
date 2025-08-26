// Assicurati che il file inizi con questa riga, è fondamentale!
'use client'

// 1. Importiamo tutto ciò che ci serve
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

// Import dei componenti UI
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Definiamo il componente LoginForm
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  // 2. Prepariamo gli "strumenti" che useremo
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null) // Stato per gestire i messaggi di errore

  // 3. Creiamo la funzione che gestirà il login
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault() // Impedisce alla pagina di ricaricarsi
    setError(null) // Resetta l'errore a ogni tentativo

    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (loginError) {
      setError("Credenziali non valide. Riprova.") // Mostriamo un errore generico
      console.error("Login Error:", loginError.message) // Logghiamo l'errore vero per noi sviluppatori
      return
    }

    if (user) {
      // Login avvenuto con successo, ora controlliamo il profilo per l'onboarding
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        setError("Impossibile recuperare il profilo utente.")
        return
      }

      if (profile && profile.username) {
        // L'utente ha completato l'onboarding, lo mandiamo alla dashboard
        router.push('/dashboard') // REINDIRIZZAMENTO ALLA HOME PAGE
      } else {
        // L'utente deve completare l'onboarding
        router.push('/onboarding')
      }
    }
  }

  // 4. Costruiamo l'interfaccia (JSX) e la colleghiamo alla nostra logica
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bentornato!</CardTitle>
          <CardDescription>
            Accedi al tuo account NutriFlow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="input"
                    placeholder="tua@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="#" // Qui andrà la pagina per il recupero password
                      className="ml-auto inline-block text-sm underline"
                    >
                      Dimenticata?
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {/* Mostra il messaggio di errore se esiste */}
                {error && (
                  <p className="text-sm font-medium text-red-500">{error}</p>
                )}
                <Button type="submit" className="w-full">
                  Accedi
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 text-foreground">
                    Oppure continua con
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                {/* Qui puoi inserire l'SVG per Google se vuoi */}
                Accedi con Google
              </Button>

              <div className="mt-4 text-center text-sm">
                Non hai un account?{" "}
                <Link href="/signup" className="underline">
                  Registrati
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        Cliccando continua, accetti i nostri <a href="#">Termini di Servizio</a>{" "}
        e la nostra <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}