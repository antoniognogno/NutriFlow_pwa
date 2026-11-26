'use client'

import Link from 'next/link'
import { ArrowLeft, ChefHat, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RecipesPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-4">
      <Card className="border-dashed">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ChefHat className="size-6" />
          </div>
          <Badge variant="secondary" className="mb-1 gap-1">
            <Clock3 className="size-3" />
            Coming soon
          </Badge>
          <CardTitle className="text-xl">Generatore Ricette AI</CardTitle>
          <CardDescription>
            Questa sezione è momentaneamente in pausa mentre completiamo il tracking rapido di pasti e macro.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button className="h-11 rounded-xl px-5" asChild>
            <Link href="/dashboard/nutrition">
              <ArrowLeft className="mr-2 size-4" />
              Torna a Nutrizione
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
