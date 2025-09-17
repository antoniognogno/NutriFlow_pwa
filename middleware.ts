// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 1. Rinfresca sempre la sessione. Questo è il suo compito principale.
  await supabase.auth.getSession();

  // 2. Applica la logica di protezione
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Se l'utente non è loggato, proteggi l'area /dashboard
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Se l'utente è loggato, proteggi le pagine di autenticazione
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    // Esegui il middleware su tutte le rotte tranne i file statici e le API
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)',
  ],
};