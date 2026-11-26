'use client'

import { useState } from 'react'

export interface LightweightBarDatum {
  label: string
  value: number
  accent?: boolean
  secondaryText?: string
}

interface LightweightBarChartProps {
  data: LightweightBarDatum[]
  unit?: string
  heightPx?: number
  maxTicks?: number
  formatValue?: (val: number) => string
  emptyText?: string
  defaultTone?: 'sky' | 'emerald' | 'primary'
  accentTone?: 'emerald' | 'sky' | 'amber'
}

function barColorClass(tone: 'sky' | 'emerald' | 'primary' | 'amber') {
  if (tone === 'emerald') return 'bg-emerald-500/85 hover:bg-emerald-400'
  if (tone === 'amber') return 'bg-amber-500/85 hover:bg-amber-400'
  if (tone === 'sky') return 'bg-sky-500/80 hover:bg-sky-400'
  return 'bg-primary/80 hover:bg-primary'
}

export function LightweightBarChart({
  data,
  unit = '',
  heightPx = 180,
  maxTicks = 8,
  formatValue,
  emptyText = 'Nessun dato registrato nel periodo.',
  defaultTone = 'primary',
  accentTone = 'emerald',
}: LightweightBarChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyText}</p>
  }

  const maxVal = Math.max(1, ...data.map(d => d.value))
  const labelStep = data.length > maxTicks ? Math.ceil(data.length / maxTicks) : 1
  const activeDatum =
    selectedIndex !== null && data[selectedIndex]
      ? data[selectedIndex]
      : data.reduce<LightweightBarDatum | null>(
          (best, item) => (!best || item.value > best.value ? item : best),
          null,
        )

  const fmt = (v: number) => (formatValue ? formatValue(v) : `${v.toLocaleString('it-IT')}${unit ? ` ${unit}` : ''}`)

  return (
    <div className="space-y-2 select-none">
      {activeDatum && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1 text-[11px] dark:bg-[#111f2c]/70">
          <span className="truncate font-medium text-muted-foreground">
            {selectedIndex !== null ? `Dettaglio ${activeDatum.label}` : `Picco (${activeDatum.label})`}
            {activeDatum.secondaryText ? ` · ${activeDatum.secondaryText}` : ''}
          </span>
          <span className="shrink-0 font-mono font-bold text-foreground">{fmt(activeDatum.value)}</span>
        </div>
      )}

      <div
        className="relative flex w-full items-end gap-1 border-b border-border/60 pt-4 pb-1"
        style={{ height: `${heightPx}px` }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-4 bottom-1 flex flex-col justify-between">
          <div className="border-t border-dashed border-border/35" />
          <div className="border-t border-dashed border-border/35" />
          <div className="border-t border-dashed border-border/25" />
        </div>

        {data.map((item, idx) => {
          const pct = item.value > 0 ? Math.max(4, Math.round((item.value / maxVal) * 100)) : 2
          const isSelected = selectedIndex === idx
          const tone = item.accent ? accentTone : defaultTone

          return (
            <button
              key={`${item.label}-${idx}`}
              type="button"
              onClick={() => setSelectedIndex(curr => (curr === idx ? null : idx))}
              onMouseEnter={() => setSelectedIndex(idx)}
              title={`${item.label}: ${fmt(item.value)}`}
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end focus:outline-none"
            >
              <div
                className={`w-full max-w-[26px] rounded-t-md transition-all duration-200 ${
                  item.value <= 0
                    ? 'bg-muted/45 dark:bg-muted/25'
                    : barColorClass(tone)
                } ${isSelected ? 'ring-2 ring-foreground/40 ring-offset-1 ring-offset-background' : ''}`}
                style={{ height: `${pct}%` }}
              />
            </button>
          )
        })}
      </div>

      <div className="flex w-full items-center gap-1">
        {data.map((item, idx) => {
          const showLabel = idx % labelStep === 0 || idx === data.length - 1
          return (
            <span
              key={`lbl-${item.label}-${idx}`}
              className="min-w-0 flex-1 truncate text-center text-[9.5px] font-medium text-muted-foreground"
            >
              {showLabel ? item.label : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}
