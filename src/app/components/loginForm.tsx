// in src/app/components/loginForm.tsx

'use client'

import { useState } from "react"
// useRouter non è utilizzato, lo rimuoviamo per pulizia
// import { useRouter } from "next/navigation" 
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

// Import dei componenti UI
// cn non è utilizzato, lo rimuoviamo
// import { cn } from "@/lib/utils" 
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
import React from "react"; // React viene importato implicitamente, ma lasciarlo non fa male

export function LoginForm() { // Non riceve più props come className, quindi le rimuoviamo dalla firma
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    console.log("[LOGIN FORM] Tentativo di login avviato per:", email);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (signInError) {
      console.error("[LOGIN FORM] Errore da Supabase:", signInError);
      setError(`Errore: ${signInError.message}`);
      setIsLoading(false);
      return;
    }

    if (!data.session) {
      console.error("[LOGIN FORM] Login riuscito ma non è stata restituita una sessione.");
      setError("Qualcosa è andato storto. Nessuna sessione ricevuta.");
      setIsLoading(false);
      return;
    }

    // Se il login ha successo, non facciamo nulla. Il listener si occuperà del resto.
  };

  return (
    // Dato che non passiamo più `className`, possiamo semplificare questo div
    <div className="flex flex-col gap-6"> 
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
                    type="email"
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
                      href="#"
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
                {error && (
                  <p className="text-sm font-medium text-red-500 text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Accesso in corso...' : 'Accedi'}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Oppure continua con
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full">
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
      <div className="text-muted-foreground text-center text-xs text-balance">
        Cliccando continua, accetti i nostri <a href="#" className="underline">Termini di Servizio</a>{" "}
        e la nostra <a href="#" className="underline">Privacy Policy</a>.
      </div>
    </div>
  )
}
