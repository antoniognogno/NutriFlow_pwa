// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Logghiamo l'inizio
  console.log(`[MIDDLEWARE] Inizio esecuzione per: ${req.nextUrl.pathname}`);
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    console.log(`[MIDDLEWARE] Utente trovato: ${user.id}`);
  } else {
    console.log("[MIDDLEWARE] Nessun utente trovato.");
  }

  const { pathname } = req.nextUrl;

  if (!user && pathname.startsWith('/dashboard')) {
    console.log("[MIDDLEWARE] Utente non trovato e rotta protetta. REINDIRIZZO A /login.");
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    console.log("[MIDDLEWARE] Utente trovato su pagina di auth. REINDIRIZZO A /dashboard.");
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  console.log(`[MIDDLEWARE] Fine esecuzione per: ${req.nextUrl.pathname}. Lascio passare.`);
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)',
  ],
};