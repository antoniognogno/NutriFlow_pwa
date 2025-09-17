// src/middleware.ts (versione corretta e sicura)

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Rinfresca la sessione. È importante, ma non usiamo il suo `user` object per la sicurezza.
  await supabase.auth.getSession();

  // <<< CORREZIONE DI SICUREZZA: Usiamo getUser() per la logica di protezione
  const { data: { user } } = await supabase.auth.getUser();

  // Se l'utente non è loggato e cerca di accedere a /dashboard, reindirizza a /login
  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Se l'utente è loggato e cerca di accedere a /login o /signup, reindirizza a /dashboard
  if (user && (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup'))) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

// Assicurati che il matcher sia quello corretto
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json).*)',
  ],
};