// src/app/login/page.tsx
'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// --- Correzione dei Percorsi di Importazione ---
// Assumendo che LoginForm si trovi in 'src/app/components/loginForm.tsx'.
// Se si trova in 'src/components/loginForm.tsx' o 'src/components/auth/LoginForm.tsx',
// adatta il percorso di conseguenza. L'uso di '@/` è la best practice.
import { LoginForm } from "@/app/components/loginForm"; 
import { siteConfig } from "@/config/attributes"; 
import { GalleryVerticalEnd } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  console.log("[LOGIN PAGE] Pagina di login renderizzata.");

  useEffect(() => {
    console.log("[LOGIN PAGE] useEffect attivato. Imposto il listener onAuthStateChange.");

    // Questo listener si attiva ogni volta che lo stato di autenticazione cambia.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[LOGIN PAGE] onAuthStateChange ha ricevuto un evento: ${event}`);

      if (event === 'SIGNED_IN' && session) {
        console.log("[LOGIN PAGE] Evento SIGNED_IN rilevato! La sessione è presente. TENTO IL REINDIRIZZAMENTO HARD.");
        
        // Usiamo un piccolo timeout per dare al browser un istante per processare il cookie.
        setTimeout(() => {
          console.log("[LOGIN PAGE] Eseguo window.location.href = '/dashboard'");
          window.location.href = '/dashboard';
        }, 100); // 100ms di ritardo
      }
    });

    // Controlliamo anche lo stato iniziale all'avvio.
    // Se l'utente arriva sulla pagina di login ma ha già una sessione valida,
    // lo reindirizziamo subito alla dashboard.
    const checkInitialSession = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            console.log("[LOGIN PAGE] Trovata una sessione esistente al caricamento della pagina. Reindirizzo.");
            window.location.href = '/dashboard';
        } else {
            console.log("[LOGIN PAGE] Nessuna sessione iniziale trovata.");
        }
    }
    checkInitialSession();

    // Puliamo il listener quando il componente viene smontato.
    return () => {
      console.log("[LOGIN PAGE] Smonto il componente. Pulisco il listener.");
      authListener.subscription.unsubscribe();
    };
  }, [supabase]); // La dipendenza assicura che l'effetto venga eseguito una sola volta.
 

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

        {/* 
          Il LoginForm si occupa solo di fare la chiamata a Supabase.
          Il reindirizzamento è gestito dall'useEffect di questa pagina.
        */}
        <LoginForm />

      </div>
    </div>
  );
}