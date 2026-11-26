'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

export function stepRecentDateKey(
  days: RecentDayOption[],
  selectedDateKey: string,
  direction: -1 | 1,
  allowBeyondWindow: boolean = false,
): string | null {
  const index = days.findIndex(d => d.dateKey === selectedDateKey)
  if (index !== -1) {
    const nextIndex = index - direction // days[0] = Oggi, days[1] = Ieri -> -1 steps forward index
    if (nextIndex >= 0 && nextIndex < days.length) {
      return days[nextIndex].dateKey
    }
    if (!allowBeyondWindow) return null
  }

  if (!allowBeyondWindow) return null
  const [y, m, d] = selectedDateKey.split('-').map(Number)
  if (!y || !m || !d) return null
  const cursor = new Date(y, m - 1, d)
  cursor.setDate(cursor.getDate() + direction)
  const nextY = cursor.getFullYear()
  const nextM = String(cursor.getMonth() + 1).padStart(2, '0')
  const nextD = String(cursor.getDate()).padStart(2, '0')
  const nextKey = `${nextY}-${nextM}-${nextD}`
  const todayKey = days[0]?.dateKey
  if (todayKey && nextKey > todayKey) return null
  return nextKey
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
  const touchStartX = useRef<number | null>(null)
  const selectedIndex = days.findIndex(d => d.dateKey === selectedDateKey)
  const currentOption = selectedIndex >= 0 ? days[selectedIndex] : null

  const prevDateKey = stepRecentDateKey(days, selectedDateKey, -1, showDatePicker)
  const nextDateKey = stepRecentDateKey(days, selectedDateKey, 1, showDatePicker)

  const badge = renderBadge?.(selectedDateKey) ?? null
  const complete = isDayComplete?.(selectedDateKey) ?? false

  const accentBadge =
    accent === 'sky'
      ? 'bg-sky-500/15 text-sky-300 border-sky-500/35'
      : accent === 'emerald'
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
        : 'bg-primary/15 text-primary border-primary/35'

  const centerTitle = currentOption
    ? currentOption.isToday
      ? `Oggi · ${formatShortItalianDate(selectedDateKey)}`
      : currentOption.isYesterday
        ? `Ieri · ${formatShortItalianDate(selectedDateKey)}`
        : `${currentOption.weekdayShort} · ${formatShortItalianDate(selectedDateKey)}`
    : formatShortItalianDate(selectedDateKey)

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current
    const deltaX = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(deltaX) < 36) return
    // Swipe right -> go back in time (prev); swipe left -> go forward (next)
    if (deltaX > 0 && prevDateKey) {
      onSelect(prevDateKey)
    } else if (deltaX < 0 && nextDateKey) {
      onSelect(nextDateKey)
    }
  }

  return (
    <div className="w-full space-y-2">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/35 p-1.5"
      >
        <button
          type="button"
          aria-label="Giorno precedente"
          disabled={!prevDateKey}
          onClick={() => {
            if (prevDateKey) onSelect(prevDateKey)
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground transition-colors active:scale-95 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-center">
          <div className="flex max-w-full items-center justify-center gap-1.5">
            <span className="truncate text-xs font-semibold capitalize text-foreground sm:text-sm">
              {centerTitle}
            </span>
            {badge && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                  complete ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400' : accentBadge
                }`}
              >
                {badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1" aria-hidden="true">
            {[...days].reverse().map(day => {
              const isSelected = day.dateKey === selectedDateKey
              const done = isDayComplete?.(day.dateKey) ?? false
              return (
                <span
                  key={day.dateKey}
                  className={`h-1.5 rounded-full transition-all duration-150 ${
                    isSelected
                      ? 'w-4 bg-primary'
                      : done
                        ? 'w-1.5 bg-emerald-400/80'
                        : 'w-1.5 bg-muted-foreground/30'
                  }`}
                />
              )
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Giorno successivo"
          disabled={!nextDateKey}
          onClick={() => {
            if (nextDateKey) onSelect(nextDateKey)
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground transition-colors active:scale-95 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {showDatePicker && maxDateKey && (
        <div className="flex items-center justify-between gap-2 px-0.5 text-[11px] text-muted-foreground">
          <span>Scorri o usa le frecce (ultimi 7 giorni)</span>
          <input
            type="date"
            aria-label="Scegli un'altra data precedente"
            max={maxDateKey}
            value={selectedDateKey}
            onChange={e => {
              if (e.target.value) onSelect(e.target.value)
            }}
            className="h-7 rounded-lg border border-input bg-background px-2 font-mono text-[11px] text-foreground"
          />
        </div>
      )}
    </div>
  )
}
