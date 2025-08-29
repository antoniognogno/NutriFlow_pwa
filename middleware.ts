import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    
    // Se l'utente NON è loggato, l'unica pagina che può vedere è quella di login/auth
    if (!user && !request.nextUrl.pathname.startsWith('/login')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Se l'utente È loggato...
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      const onboardingComplete = profile?.username != null;

      // Se l'onboarding NON è completo, l'unica pagina che può vedere è /onboarding
      if (!onboardingComplete && request.nextUrl.pathname !== '/onboarding') {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }

      // Se l'onboarding È completo e prova ad andare a /login o /onboarding, lo mandiamo alla dashboard
      if (onboardingComplete && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/onboarding')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }

    return response

  } catch (e) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    /* ... (il matcher non cambia) ... */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}