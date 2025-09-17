// src/app/auth/callback/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // <<< Usiamo questa libreria per coerenza
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic'; // Assicura che questa rotta sia sempre dinamica

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Usiamo createRouteHandlerClient per coerenza con il middleware e altre API routes
    const supabase = createRouteHandlerClient({ cookies });
    
    // Scambia il codice per una sessione. Questo imposterà i cookie di autenticazione.
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // <<< MODIFICA CHIAVE: Reindirizzamento esplicito alla dashboard
      // Invece di usare un parametro 'next' potenzialmente ambiguo,
      // mandiamo sempre l'utente alla pagina principale dopo un login di successo.
      // Il nostro `DashboardLayout` si occuperà poi di verificare la sessione.
      console.log("[AUTH CALLBACK] Scambio codice riuscito. Reindirizzo a /dashboard.");
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Se non c'è il codice o c'è un errore, reindirizza alla pagina di login con un messaggio di errore.
  console.error("[AUTH CALLBACK] Errore: Scambio codice fallito o codice mancante.");
  const redirectUrl = new URL('/login', request.url);
  redirectUrl.searchParams.set('error', "Impossibile completare l'autenticazione. Riprova.");
  redirectUrl.searchParams.set('error_description', "Il codice di autorizzazione non è valido o è scaduto.");
  
  return NextResponse.redirect(redirectUrl);
}