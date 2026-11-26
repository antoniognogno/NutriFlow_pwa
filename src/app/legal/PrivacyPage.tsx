'use client'

import Link from 'next/link'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 bg-background px-4 py-6 text-foreground">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-9 rounded-xl text-xs"
        >
          <ArrowLeft className="mr-1.5 size-3.5" />
          Indietro
        </Button>
        <Link href="/terms" className="text-xs font-medium text-primary hover:underline">
          Termini di Servizio →
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-emerald-500" />
            Informativa sulla Privacy (GDPR UE 2016/679)
          </CardTitle>
          <CardDescription className="text-xs">
            Ultimo aggiornamento: Novembre 2026 · Versione UE 2026-11
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <section className="space-y-1">
            <h2 className="font-semibold text-foreground">1. Titolare e finalità del trattamento</h2>
            <p>
              NutriFlow tratta i dati personali esclusivamente per consentirti di gestire allenamenti, schede, idratazione,
              nutrizione e routine quotidiane personali, inclusa la sincronizzazione offline-first tra i tuoi dispositivi.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold text-foreground">2. Dati raccolti e base giuridica (Art. 6 e Art. 9 GDPR)</h2>
            <p>
              Trattiamo email di autenticazione, preferenze del profilo e metriche inserite volontariamente dall&apos;utente
              (peso, altezza, età, allenamenti, log idratazione e pasti) sulla base dell&apos;esecuzione del servizio e del tuo
              consenso esplicito prestato in fase di registrazione.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold text-foreground">3. Archiviazione locale (Offline), Cloud & Sicurezza</h2>
            <p>
              I dati offline vengono salvati sul tuo dispositivo tramite `localStorage` e IndexedDB (`Dexie`) e sincronizzati
              su Supabase con autenticazione protetta e Row Level Security (RLS), così ogni utente può leggere e modificare
              solo i propri record. Non vendiamo dati a terzi né utilizziamo cookie di profilazione pubblicitaria.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold text-foreground">4. Conservazione e diritti dell&apos;utente (Art. 15-22 GDPR)</h2>
            <p>
              Puoi esportare in qualsiasi momento i tuoi dati locali in JSON dalle Impostazioni (diritto alla portabilità),
              modificarli o richiederne la cancellazione completa. Conserviamo i dati solo finché mantieni attivo il tuo account
              o finché non ne richiedi la rimozione.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
