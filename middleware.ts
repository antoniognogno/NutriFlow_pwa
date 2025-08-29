import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    const user = session?.user
    const pathname = request.nextUrl.pathname

    const authRoutes = ['/login', '/signup']
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

    // --- LOGICA PER UTENTE NON AUTENTICATO ---
    if (!user) {
      // Se NON è una rotta di autenticazione, reindirizza al login
      if (!isAuthRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      // Se è una rotta di autenticazione, lascialo passare
      return response
    }

    // --- LOGICA PER UTENTE AUTENTICATO ---
    
    // Se è loggato e prova ad andare a login/signup, reindirizza alla dashboard
    if (isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Controlliamo lo stato dell'onboarding per tutte le altre rotte
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    
    const onboardingComplete = profile?.username != null;

    // Se l'onboarding non è completo e non è sulla pagina di onboarding, reindirizza
    if (!onboardingComplete && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    
    // Se l'onboarding è completo e prova ad andare alla pagina di onboarding, reindirizza
    if (onboardingComplete && pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Se tutti i controlli passano, lascia proseguire la richiesta
    return response

  } catch (e) {
    // In caso di errore, reindirizza al login per sicurezza
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Abbina tutti i percorsi delle richieste tranne quelli che iniziano con:
     * - api (chiamate API)
     * - _next/static (file statici)
     * - _next/image (ottimizzazione immagini)
     * - favicon.ico (icona del sito)
     * - auth/callback (rotta di callback di Supabase)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}