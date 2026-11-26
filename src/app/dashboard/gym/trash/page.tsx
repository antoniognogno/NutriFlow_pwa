'use client'

import { useRouter } from 'next/navigation'
import { TrashSection } from '@/features/trash/TrashSection'

export default function GymTrashPage() {
  const router = useRouter()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-amber-400 md:text-2xl">
          Cestino (30 giorni)
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Ripristina o elimina definitivamente schede, preset, corse e allenamenti
        </p>
      </header>
      <TrashSection onRestored={() => router.refresh()} />
    </div>
  )
}
