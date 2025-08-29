'use client'

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function DashboardPage() {
  const supabase = createClient()
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Ora recuperiamo solo il nome utente, senza fare controlli di reindirizzamento
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUsername(profile.username)
        }
      }
      setIsLoading(false)
    }
    fetchProfile()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p>Caricamento...</p>
      </div>
    )
  }

  return (
    // Questo è TUTTO ciò che deve esserci.
    // Nessun header, nessun pulsante, solo il contenuto della pagina.
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        Benvenuto, <span className="text-primary">{username}</span>!
      </h1>
      <p className="max-w-[600px] text-muted-foreground">
        Questa è la tua dashboard. Presto qui vedrai il tuo Water Tracker e il generatore di ricette.
      </p>
      <div
        className="mt-8 flex w-full max-w-md items-center justify-center rounded-lg border border-dashed py-12"
      >
        <p className="text-sm text-muted-foreground">
          -- I tuoi widget appariranno qui --
        </p>
      </div>
    </div>
  )
}