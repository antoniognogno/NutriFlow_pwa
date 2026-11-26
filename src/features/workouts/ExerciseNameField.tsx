'use client'

import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  type FreeExerciseRecord,
  hasExercisePhotoMatch,
  loadFreeExerciseDb,
  searchExerciseSuggestions,
} from './exerciseGuide'

interface ExerciseNameFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function ExerciseNameField({
  value,
  onChange,
  placeholder = 'Nome Esercizio (es. Panca Piana)',
  className = '',
  ariaLabel,
}: ExerciseNameFieldProps) {
  const [focused, setFocused] = useState(false)
  const [dbRecords, setDbRecords] = useState<FreeExerciseRecord[]>([])

  useEffect(() => {
    let active = true
    void loadFreeExerciseDb()
      .then(recs => {
        if (active) setDbRecords(recs)
      })
      .catch(() => {
        // Curated suggestions still work offline
      })
    return () => {
      active = false
    }
  }, [])

  const matched = hasExercisePhotoMatch(value, dbRecords)
  const suggestions = focused ? searchExerciseSuggestions(value, dbRecords, 6) : []

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="relative flex items-center">
        <Input
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onChange={e => onChange(e.target.value)}
          className={`pr-20 ${className}`}
        />
        {matched && (
          <span className="pointer-events-none absolute right-2 inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
            <Camera className="size-3 shrink-0" />
            Foto OK
          </span>
        )}
      </div>

      {focused && suggestions.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 rounded-xl border border-slate-300 bg-slate-100 p-2 dark:border-border dark:bg-slate-200/95"
          role="listbox"
          aria-label="Suggerimenti esercizi con foto"
        >
          {suggestions.map(item => (
            <button
              key={item.id}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                onChange(item.label)
                setFocused(false)
              }}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-emerald-300"
            >
              <Camera className="size-3 shrink-0 text-emerald-900" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
