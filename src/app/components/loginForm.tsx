'use client'

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

import React from "react";

export function LoginForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    // Se c'è un errore, mostralo e fermati.
    if (signInError) {
      console.error("Errore di login da Supabase:", signInError.message);
      setError("Credenziali non valide. Riprova.");
      setIsLoading(false);
      return;
    }

    // SE IL LOGIN HA SUCCESSO:
    // Non facciamo NIENTE. Non reindirizziamo. Non facciamo nulla.
    // L'evento onAuthStateChange si occuperà del resto.
    // Lasciamo che lo stato `isLoading` rimanga `true` per dare un feedback
    // all'utente che l'app sta lavorando.
  }

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
                    type="email" // <-- CORRETTO
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
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/80" // Rimosso stili duplicati per pulizia
                  disabled={isLoading} // <<< Disabilita il bottone durante il caricamento
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