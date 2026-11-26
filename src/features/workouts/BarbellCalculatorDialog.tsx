'use client'

import { useState } from 'react'
import { Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { computeBarbellPlates } from './workoutUtils'

interface BarbellCalculatorDialogProps {
  initialWeightKg: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

const BAR_OPTIONS = [20, 15, 10] as const

export function BarbellCalculatorDialog({
  initialWeightKg,
  open,
  onOpenChange,
}: BarbellCalculatorDialogProps) {
  const [totalKg, setTotalKg] = useState(() => String(initialWeightKg > 0 ? initialWeightKg : 60))
  const [barKg, setBarKg] = useState<number>(20)

  const parsedTotal = Number.parseFloat(totalKg) || barKg
  const result = computeBarbellPlates(parsedTotal, barKg)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4 text-primary" />
            Calcolatore dischi bilanciere
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dischi da caricare su ciascun lato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="calc-total-kg" className="text-xs text-muted-foreground">
              Carico totale (kg)
            </label>
            <Input
              id="calc-total-kg"
              type="number"
              inputMode="decimal"
              min="10"
              step="2.5"
              value={totalKg}
              onChange={e => setTotalKg(e.target.value)}
              className="h-11 text-center font-mono text-lg font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Peso bilanciere</p>
            <div className="grid grid-cols-3 gap-2">
              {BAR_OPTIONS.map(option => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={barKg === option ? 'secondary' : 'outline'}
                  className="h-9 rounded-xl font-mono text-xs"
                  onClick={() => setBarKg(option)}
                >
                  {option} kg
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 p-3.5 text-center">
            <p className="text-xs text-muted-foreground">
              Per lato: <strong className="font-mono text-foreground">{result.perSideKg} kg</strong>
            </p>
            {result.plates.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Solo bilanciere ({barKg} kg)</p>
            ) : (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {result.plates.map((plate, index) => (
                  <Badge key={`${plate}-${index}`} variant="secondary" className="font-mono text-xs">
                    {plate} kg
                  </Badge>
                ))}
              </div>
            )}
            {result.remainderKg > 0 && (
              <p className="mt-2 text-[11px] text-amber-400">
                Scarto non copribile: {result.remainderKg} kg per lato
              </p>
            )}
          </div>
        </div>

        <Button variant="secondary" className="h-10 w-full rounded-xl" onClick={() => onOpenChange(false)}>
          Chiudi
        </Button>
      </DialogContent>
    </Dialog>
  )
}
