'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, HelpCircle, ImageOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type ExerciseGuideData,
  findCuratedGuide,
  imageUrlsForId,
  loadFreeExerciseDb,
  matchExerciseInDb,
} from './exerciseGuide'

interface ExerciseGuideDialogProps {
  exerciseName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExerciseGuideDialog({ exerciseName, open, onOpenChange }: ExerciseGuideDialogProps) {
  const [guide, setGuide] = useState<ExerciseGuideData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!open || !exerciseName) return
    let active = true
    setImgErrors({})

    const curated = findCuratedGuide(exerciseName)
    setGuide(curated)

    setIsLoading(true)
    void loadFreeExerciseDb()
      .then(records => {
        if (!active) return
        const dbMatch = curated
          ? records.find(r => r.id === curated.id) ?? matchExerciseInDb(exerciseName, records)
          : matchExerciseInDb(exerciseName, records)

        if (dbMatch) {
          setGuide(prev => ({
            id: dbMatch.id,
            displayName: exerciseName,
            englishName: dbMatch.name,
            equipment: prev?.equipment ?? dbMatch.equipment ?? 'Corpo libero / Palestra',
            primaryMuscles: prev?.primaryMuscles ?? dbMatch.primaryMuscles ?? [],
            secondaryMuscles: prev?.secondaryMuscles ?? dbMatch.secondaryMuscles ?? [],
            images: imageUrlsForId(dbMatch.id, dbMatch.images),
            italianCues: prev?.italianCues ?? [],
            commonMistake: prev?.commonMistake ?? '',
            rawInstructions: dbMatch.instructions ?? [],
          }))
        }
      })
      .catch(() => {
        // Fallback to curated guide offline
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [exerciseName, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6 text-left text-base sm:text-lg">
            <HelpCircle className="size-4 shrink-0 text-primary" />
            <span>{exerciseName ?? 'Guida esercizio'}</span>
          </DialogTitle>
          <DialogDescription className="text-left text-xs">
            {guide ? `${guide.englishName} · ${guide.equipment}` : 'Caricamento da free-exercise-db...'}
          </DialogDescription>
        </DialogHeader>

        {guide ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {guide.images.slice(0, 2).map((src, idx) => (
                <div key={src} className="overflow-hidden rounded-xl border bg-muted/30">
                  <p className="border-b bg-muted/50 px-2 py-1 text-center text-[10px] font-semibold text-muted-foreground">
                    {idx === 0 ? 'Partenza' : 'Chiusura'}
                  </p>
                  {imgErrors[idx] ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                      <ImageOff className="size-5" />
                      <span>Offline</span>
                    </div>
                  ) : (
                    <img
                      src={src}
                      alt={`${guide.displayName} fase ${idx + 1}`}
                      loading="lazy"
                      className="h-36 w-full object-cover"
                      onError={() => setImgErrors(prev => ({ ...prev, [idx]: true }))}
                    />
                  )}
                </div>
              ))}
            </div>

            {(guide.primaryMuscles.length > 0 || guide.secondaryMuscles.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {guide.primaryMuscles.map(m => (
                  <Badge key={m} variant="secondary" className="text-[11px]">
                    {m}
                  </Badge>
                ))}
                {guide.secondaryMuscles.map(m => (
                  <Badge key={m} variant="outline" className="text-[11px] text-muted-foreground">
                    {m}
                  </Badge>
                ))}
              </div>
            )}

            {guide.italianCues.length > 0 && (
              <div className="space-y-2 rounded-xl border border-slate-300 bg-slate-100 p-3 text-slate-900 dark:border-border dark:bg-muted/40 dark:text-foreground">
                <p className="text-xs font-bold text-slate-900 dark:text-primary">Come si esegue</p>
                <ul className="space-y-1.5 text-xs leading-relaxed">
                  {guide.italianCues.map((cue, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{cue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {guide.commonMistake && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400 bg-amber-200 p-3 text-xs font-medium text-amber-950">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-900" />
                <div>
                  <span className="font-bold">Errore comune: </span>
                  {guide.commonMistake}
                </div>
              </div>
            )}

            {guide.italianCues.length === 0 && guide.rawInstructions.length > 0 && (
              <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-primary">Istruzioni (free-exercise-db)</p>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                  {guide.rawInstructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            {isLoading
              ? 'Ricerca esercizio su free-exercise-db...'
              : 'Nessuna scheda trovata per questo esercizio.'}
          </div>
        )}

        <Button variant="secondary" className="h-10 w-full rounded-xl" onClick={() => onOpenChange(false)}>
          Chiudi guida
        </Button>
      </DialogContent>
    </Dialog>
  )
}
