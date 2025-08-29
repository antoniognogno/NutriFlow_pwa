import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  // Se l'utente ha cliccato su un link magico, potrebbe esserci un 'next' param
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          // QUANDO exchangeCodeForSession viene chiamato, userà QUESTE funzioni
          // per mettere i cookie nella NUOVA risposta che stiamo per creare.
          set(name: string, value: string, options: CookieOptions) {
            // request.cookies.set() è read-only, quindi non lo usiamo qui.
          },
          remove(name: string, options: CookieOptions) {
            // request.cookies.delete() è read-only, quindi non lo usiamo qui.
          },
        },
      }
    )
    const { error, data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      // Se lo scambio ha successo, creiamo una nuova risposta e ci mettiamo i cookie.
      // Dobbiamo creare un nuovo client che possa scrivere sulla risposta.
      const response = NextResponse.redirect(new URL(next, request.url))
      const supabaseWithCookieWriter = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )
      // Ora che abbiamo impostato il nuovo client, impostiamo la sessione
      await supabaseWithCookieWriter.auth.setSession(session)
      return response
    }
  }

  // Se c'è un errore o non c'è il codice, reindirizza a una pagina di errore
  console.error("Errore nel callback di autenticazione o codice mancante");
  const redirectUrl = new URL('/login', request.url)
  redirectUrl.searchParams.set('error', 'Authentication failed. Please try again.')
  return NextResponse.redirect(redirectUrl)
}