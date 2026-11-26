'use client'

import { formatShortItalianDate, type RecentDayOption } from '@/features/routine/habitStore'

interface RecentDaysStripProps {
  days: RecentDayOption[]
  selectedDateKey: string
  onSelect: (dateKey: string) => void
  renderBadge?: (dateKey: string) => string | null
  isDayComplete?: (dateKey: string) => boolean
  showDatePicker?: boolean
  maxDateKey?: string
  accent?: 'primary' | 'sky' | 'emerald'
}

export function RecentDaysStrip({
  days,
  selectedDateKey,
  onSelect,
  renderBadge,
  isDayComplete,
  showDatePicker = false,
  maxDateKey,
  accent = 'primary',
}: RecentDaysStripProps) {
  const activeColors =
    accent === 'sky'
      ? 'border-sky-400/70 bg-sky-500/20 text-sky-300'
      : accent === 'emerald'
        ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-300'
        : 'border-primary/70 bg-primary/20 text-primary'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {days.map(day => {
          const selected = day.dateKey === selectedDateKey
          const badge = renderBadge?.(day.dateKey) ?? null
          const complete = isDayComplete?.(day.dateKey) ?? false
          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelect(day.dateKey)}
              className={`flex min-w-[4.4rem] shrink-0 flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center transition-colors active:scale-95 ${
                selected
                  ? activeColors
                  : day.isToday
                    ? 'border-border/80 bg-background/70 text-foreground hover:border-primary/40'
                    : 'border-border/60 bg-muted/35 text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="text-[11px] font-semibold leading-tight">
                {day.isToday ? 'Oggi' : day.isYesterday ? 'Ieri' : `${day.weekdayShort} ${day.dayNum}`}
              </span>
              <span
                className={`mt-0.5 font-mono text-[10px] leading-tight ${
                  complete ? 'font-bold text-emerald-400' : 'opacity-80'
                }`}
              >
                {badge ?? formatShortItalianDate(day.dateKey)}
              </span>
            </button>
          )
        })}

        {showDatePicker && maxDateKey && (
          <input
            type="date"
            aria-label="Scegli un'altra data precedente"
            max={maxDateKey}
            value={selectedDateKey}
            onChange={e => {
              if (e.target.value) onSelect(e.target.value)
            }}
            className="h-[2.75rem] w-[7.8rem] shrink-0 rounded-xl border border-input bg-background px-2 font-mono text-[11px] text-foreground"
          />
        )}
      </div>
    </div>
  )
}
