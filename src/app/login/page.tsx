// src/app/login/page.tsx
'use client'; // <<< PASSO 1: Trasforma in un Client Component

import { useEffect } from 'react'; // <<< PASSO 2: Importa useEffect
import { useRouter } from 'next/navigation'; // <<< PASSO 3: Importa useRouter
import { createClient } from '@/lib/supabase/client'; // <<< PASSO 4: Importa il client Supabase

import { LoginForm } from "../components/loginForm";
import { siteConfig } from "../../config/attributes";
import { GalleryVerticalEnd } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  // <<< PASSO 5: Aggiungi il listener per i cambi di stato di autenticazione
  useEffect(() => {
    // Questo listener si attiva ogni volta che lo stato di auth cambia (login, logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Se l'evento è 'SIGNED_IN', significa che l'utente ha appena effettuato il login con successo.
      if (event === 'SIGNED_IN') {
        console.log("Evento SIGNED_IN rilevato dal listener. Reindirizzamento a /dashboard...");
        
        // Usiamo router.push() qui perché la sessione è garantita essere stabile.
        // Questo offre una transizione più fluida rispetto a un hard refresh.
        router.push('/dashboard');
      }
    });

    // È una best practice pulire il listener quando il componente viene "smontato"
    // (cioè quando l'utente naviga via dalla pagina di login).
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]); // Le dipendenze assicurano che l'effetto non venga eseguito inutilmente


  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <GalleryVerticalEnd className="size-5" />
             </div>
             <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">{siteConfig.name}</h1>
          </div>
        </div>
        
        {/* Il LoginForm ora si occupa solo di fare il login, non del reindirizzamento */}
        <LoginForm />

      </div>
    </div>
  );
}