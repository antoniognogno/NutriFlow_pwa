'use client'

import { useState } from 'react'
import { BodyTrackerSection } from './BodyTrackerSection'
import { HabitTrackerSection } from './HabitTrackerSection'

export function RoutineView() {
  const [tab, setTab] = useState<'habits' | 'weight'>('habits')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Routine & Corpo</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Abitudini giornaliere con streak e trend peso corporeo
        </p>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-card/70 p-1">
        <button
          type="button"
          onClick={() => setTab('habits')}
          className={`h-9 rounded-xl px-3 text-xs font-semibold transition-colors ${
            tab === 'habits'
              ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(122,166,189,0.25)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Abitudini
        </button>
        <button
          type="button"
          onClick={() => setTab('weight')}
          className={`h-9 rounded-xl px-3 text-xs font-semibold transition-colors ${
            tab === 'weight'
              ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(122,166,189,0.25)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Peso & Trend
        </button>
      </div>

      {tab === 'habits' ? <HabitTrackerSection /> : <BodyTrackerSection />}
    </div>
  )
}
