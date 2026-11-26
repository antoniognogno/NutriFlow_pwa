'use client'

import { useMemo, useState } from 'react'
import { Flame, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface WeeklyVolumeData {
  week_start: string
  total_volume: number
}

interface WeeklyVolumeChartProps {
  data: WeeklyVolumeData[]
}

function formatWeekShort(isoDate: string): string {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function formatVolumeCompact(volumeKg: number): string {
  if (volumeKg >= 1000) return `${(volumeKg / 1000).toFixed(1)}t`
  return `${volumeKg}`
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const recent = useMemo(() => data.slice(-8), [data])
  const maxVolume = Math.max(1, ...recent.map(item => item.total_volume))
  const avgVolume =
    recent.length > 0
      ? Math.round(recent.reduce((sum, item) => sum + item.total_volume, 0) / recent.length)
      : 0

  const last = recent[recent.length - 1]?.total_volume ?? 0
  const prev = recent[recent.length - 2]?.total_volume ?? 0
  const deltaPct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null

  const selected =
    activeIdx !== null && recent[activeIdx]
      ? recent[activeIdx]
      : recent[recent.length - 1] ?? null

  return (
    <Card>
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="size-4 text-emerald-500" />
              Volume Totale Settimanale
            </CardTitle>
            <CardDescription className="text-xs">
              Peso × Ripetizioni × Serie nelle ultime 8 settimane
            </CardDescription>
          </div>
          {deltaPct !== null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${
                deltaPct >= 0
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-amber-500/15 text-amber-500'
              }`}
            >
              {deltaPct >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10px] text-muted-foreground">Ultima sett.</p>
            <p className="font-mono text-sm font-bold text-emerald-500">
              {last.toLocaleString('it-IT')} kg
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10px] text-muted-foreground">Media sett.</p>
            <p className="font-mono text-sm font-bold text-primary">
              {avgVolume.toLocaleString('it-IT')} kg
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/35 p-2 dark:bg-[#111f2c]/80">
            <p className="text-[10px] text-muted-foreground">Picco</p>
            <p className="font-mono text-sm font-bold text-foreground">
              {maxVolume.toLocaleString('it-IT')} kg
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {recent.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Nessuna settimana con volume registrato.
          </p>
        ) : (
          <>
            {selected && (
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs dark:bg-[#111f2c]/70">
                <span className="text-muted-foreground">
                  Settimana del <strong className="text-foreground">{formatWeekShort(selected.week_start)}</strong>
                </span>
                <span className="font-mono font-bold text-emerald-500">
                  {selected.total_volume.toLocaleString('it-IT')} kg
                </span>
              </div>
            )}

            <div className="relative flex h-[175px] w-full items-end gap-1.5 border-b border-border/60 pt-5 pb-1">
              <div
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary/40"
                style={{ bottom: `${Math.min(95, Math.max(8, Math.round((avgVolume / maxVolume) * 100)))}%` }}
              />

              {recent.map((item, idx) => {
                const pct = item.total_volume > 0 ? Math.max(8, Math.round((item.total_volume / maxVolume) * 100)) : 3
                const isPeak = item.total_volume === maxVolume && item.total_volume > 0
                const isLatest = idx === recent.length - 1
                const isSelected = activeIdx === idx

                return (
                  <button
                    key={item.week_start}
                    type="button"
                    onClick={() => setActiveIdx(curr => (curr === idx ? null : idx))}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 focus:outline-none"
                  >
                    <span className="font-mono text-[9.5px] font-semibold text-muted-foreground group-hover:text-foreground">
                      {formatVolumeCompact(item.total_volume)}
                    </span>
                    <div
                      className={`w-full max-w-[34px] rounded-t-lg transition-all duration-200 ${
                        isLatest || isPeak
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                          : 'bg-gradient-to-t from-primary/70 to-primary'
                      } ${isSelected ? 'ring-2 ring-foreground/45 ring-offset-1 ring-offset-background' : ''}`}
                      style={{ height: `${pct}%` }}
                    />
                  </button>
                )
              })}
            </div>

            <div className="flex w-full items-center gap-1.5">
              {recent.map(item => (
                <span
                  key={`lbl-${item.week_start}`}
                  className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-muted-foreground"
                >
                  {formatWeekShort(item.week_start)}
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
