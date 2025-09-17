// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Questo middleware ha il solo scopo di rinfrescare il token di sessione dell'utente.
// NON esegue alcun reindirizzamento.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Rinfresca la sessione. Questo è il suo unico lavoro.
  // Assicura che i cookie siano sempre aggiornati per le chiamate successive
  // (Server Components, API Routes).
  await supabase.auth.getSession();
  
  return res;
}


export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)',
  ],
};