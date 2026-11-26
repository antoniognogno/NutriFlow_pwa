'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type FullReportPeriod, REPORT_PERIOD_OPTIONS } from './periodUtils'

interface PeriodNavigatorProps {
  period: FullReportPeriod
  offset: number
  periodLabel: string
  onPeriodChange: (period: FullReportPeriod) => void
  onOffsetChange: (nextOffset: number) => void
}

export function PeriodNavigator({
  period,
  offset,
  periodLabel,
  onPeriodChange,
  onOffsetChange,
}: PeriodNavigatorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 dark:bg-[#111f2c]/80">
        {REPORT_PERIOD_OPTIONS.map(opt => {
          const active = period === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPeriodChange(opt.id)}
              title={opt.label}
              className={`h-8 min-w-0 rounded-lg px-0.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(122,166,189,0.28)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="truncate">{opt.shortLabel}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/25 px-2 py-1.5 dark:bg-[#111f2c]/50">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Periodo precedente"
          onClick={() => onOffsetChange(offset - 1)}
          className="size-8 shrink-0 rounded-lg"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex min-w-0 items-center gap-2 text-center">
          <span className="truncate text-xs font-semibold capitalize text-foreground">
            {periodLabel}
          </span>
          {offset < 0 && (
            <button
              type="button"
              onClick={() => onOffsetChange(0)}
              className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/25"
            >
              Attuale
            </button>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Periodo successivo"
          disabled={offset >= 0}
          onClick={() => onOffsetChange(Math.min(0, offset + 1))}
          className="size-8 shrink-0 rounded-lg disabled:opacity-35"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
