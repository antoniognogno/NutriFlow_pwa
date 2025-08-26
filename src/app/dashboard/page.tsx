'use client'

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle" // Importa il nuovo componente

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Stato per il caricamento

  // Questo hook viene eseguito una sola volta quando il componente viene caricato
  useEffect(() => {
    const fetchProfile = async () => {
      // Controlliamo se c'è un utente loggato
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Se l'utente esiste, recuperiamo il suo profilo
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error("Errore nel recupero del profilo:", error.message)
        }
        
        if (profile && profile.username) {
          setUsername(profile.username)
        } else {
          // Se l'utente non ha un profilo completo, lo mandiamo all'onboarding
          router.push('/onboarding')
        }
      } else {
        // Se non c'è nessun utente, lo mandiamo al login
        router.push('/login')
      }
      // Finito di caricare, nascondiamo il messaggio di loading
      setIsLoading(false)
    }

    fetchProfile()
  }, [router, supabase])


  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Dopo il logout, reindirizziamo al login e forziamo un refresh
    // per essere sicuri che lo stato della sessione venga pulito
    router.push('/login')
    router.refresh()
  }

  // Mostra un messaggio di caricamento mentre i dati non sono ancora pronti
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-foreground">Caricamento dashboard...</p>
      </div>
    )
  }

  return (
    // Usiamo le classi di Tailwind per il tema (bg-background, text-foreground)
    // che cambieranno automaticamente con il ModeToggle
    <div className="relative min-h-screen bg-background text-foreground">
      
      {/* Header con i controlli utente */}
      <header className="absolute top-0 right-0 p-4 sm:p-6 z-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <ModeToggle />
          <Button asChild variant="outline">
             <Link href="/dashboard/settings">Impostazioni</Link>
          </Button>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>
      </header>

      {/* Contenuto principale della pagina */}
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-3xl text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Benvenuto, <span className="text-primary">{username}</span>!
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Questa è la tua dashboard. Presto qui vedrai il tuo Water Tracker e il generatore di ricette.
          </p>
          
          <div className="mt-12 p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground/80">-- I tuoi widget appariranno qui --</p>
          </div>
        </div>
      </main>
    </div>
  )
}