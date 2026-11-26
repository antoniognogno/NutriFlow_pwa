'use client'

import Link from 'next/link'
import { Pencil, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlanWithWorkoutsAndExercises } from '@/lib/supabase/types'

interface NewPlanDialogProps {
  mode: 'create' | 'edit'
  planToEdit?: PlanWithWorkoutsAndExercises
  onSaveSuccess?: () => void
}

export function NewPlanDialog({ mode, planToEdit }: NewPlanDialogProps) {
  if (mode === 'edit' && planToEdit) {
    return (
      <Button variant="ghost" size="icon" aria-label="Modifica scheda" className="size-8 rounded-xl text-primary hover:bg-primary/15" asChild>
        <Link href={`/dashboard/gym/plan/${planToEdit.id}`}>
          <Pencil className="size-4" />
        </Link>
      </Button>
    )
  }

  return (
    <Button size="sm" className="h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500" asChild>
      <Link href="/dashboard/gym/plan/new">
        <PlusCircle className="mr-1.5 size-4" />
        Nuova Scheda
      </Link>
    </Button>
  )
}
