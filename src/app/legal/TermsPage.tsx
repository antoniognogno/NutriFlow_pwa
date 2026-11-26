'use client'

import Link from 'next/link'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
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
        <Link href="/privacy" className="text-xs font-medium text-primary hover:underline">
          Privacy Policy (GDPR) →
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="size-5 text-primary" />
            Termini di Servizio (UE)
          </CardTitle>
          <CardDescription className="text-xs">
            Ultimo aggiornamento: Novembre 2026
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <section className="space-y-1">
            <h2 className="font-semibold text-foreground">1. Natura del servizio</h2>
            <p>
              NutriFlow è un diario personale per il monitoraggio di allenamenti, idratazione, macro e routine. Le stime
              (come TDEE, BMI e massimale Epley 1RM) hanno scopo puramente informativo e non sostituiscono il parere di un
              medico, nutrizionista o preparatore qualificato.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold text-foreground">2. Requisiti dell&apos;account</h2>
            <p>
              L&apos;utilizzo è consentito a utenti di età pari o superiore a 16 anni (Art. 8 GDPR UE). L&apos;utente è responsabile
              della riservatezza delle proprie credenziali e dell&apos;uso lecito della piattaforma.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold text-foreground">3. Uso consentito e sicurezza</h2>
            <p>
              È vietato tentare accessi non autorizzati, manipolare API o inviare input automatizzati volti a compromettere
              l&apos;integrità del servizio. Le schede importate da assistenti esterni vanno sempre verificate prima dell&apos;esecuzione.
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="font-semibold text-foreground">4. Legge applicabile</h2>
            <p>
              I presenti Termini sono regolati dalla normativa italiana ed europea vigente a tutela dei consumatori e dei
              dati personali nell&apos;Unione Europea.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
