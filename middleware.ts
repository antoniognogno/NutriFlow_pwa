import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    // Questo crea un client Supabase specifico per l'ambiente Middleware
    const { supabase, response } = createClient(request)

    // Controlla se c'è un utente loggato
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Se NON c'è un utente e la richiesta NON è per una pagina di autenticazione,
    // reindirizza alla pagina di login.
    if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/signup')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    
    // Se C'È un utente e sta provando ad accedere a login/signup,
    // reindirizzalo alla sua dashboard.
    if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // Se nessuna delle condizioni sopra è vera, lascia che l'utente prosegua
    return response

  } catch (e) {
    // Se c'è un errore, per sicurezza reindirizza al login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

// Configurazione del Middleware
export const config = {
  matcher: [
    /*
     * Abbina tutti i percorsi delle richieste tranne quelli che iniziano con:
     * - api (chiamate API)
     * - _next/static (file statici)
     * - _next/image (ottimizzazione immagini)
     * - favicon.ico (icona del sito)
     * Questo assicura che il middleware giri solo sulle pagine vere e proprie.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}