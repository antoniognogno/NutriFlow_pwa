// src/app/login/page.tsx
'use client';

import { useEffect, useState } from 'react'; // Aggiungiamo useState
import { createClient } from '@/lib/supabase/client';
import { LoginForm } from "@/app/components/loginForm"; 
import { siteConfig } from "@/config/attributes"; 
import { NutriFlowLogo } from "@/components/NutriFlowLogo";
import { Loader2 } from 'lucide-react'; // Importiamo un loader

export default function LoginPage() {
  const supabase = createClient();
  // Stato per gestire il caricamento e prevenire loop
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Controlliamo subito se c'è già una sessione.
    // Il middleware dovrebbe già gestire questo, ma questo è il nostro fallback.
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Se c'è una sessione, il middleware ci reindirizzerà.
        // Non facciamo nulla qui, ma smettiamo di caricare per mostrare il form
        // nel caso in cui il middleware fallisca.
        console.log("[LOGIN PAGE] Trovata sessione iniziale. Attendo il redirect del middleware.");
      }
      setLoading(false); // Smettiamo di caricare in ogni caso
    };

    checkInitialSession();

    // 2. Impostiamo il listener per il FUTURO evento di login.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Questo si attiverà solo quando l'utente compila il form e il login ha successo.
      if (event === 'SIGNED_IN' && session) {
        console.log("[LOGIN PAGE] Rilevato evento SIGNED_IN. Eseguo redirect hard a /dashboard.");
        window.location.href = '/dashboard';
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  // Se stiamo ancora verificando la sessione iniziale, mostriamo un loader
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Altrimenti, mostriamo il contenuto normale
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <NutriFlowLogo className="size-9" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">{siteConfig.name}</h1>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}