'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Dumbbell, HelpCircle, ImageOff, Wrench } from 'lucide-react'
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
  inferMachineKind,
  loadFreeExerciseDb,
  type MachineVisualKind,
  matchExerciseInDb,
} from './exerciseGuide'

interface ExerciseGuideDialogProps {
  exerciseName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MachineSchematicSvg({ kind }: { kind: MachineVisualKind }) {
  return (
    <svg
      viewBox="0 0 120 84"
      className="h-20 w-28 shrink-0 rounded-lg border border-border/60 bg-slate-900/90 p-1.5 text-primary"
      aria-hidden="true"
    >
      {kind === 'barbell_bench' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <line x1="20" y1="62" x2="100" y2="62" />
          <line x1="34" y1="62" x2="34" y2="28" />
          <line x1="86" y1="62" x2="86" y2="28" />
          <line x1="16" y1="32" x2="104" y2="32" className="text-emerald-400" />
          <rect x="12" y="22" width="6" height="20" rx="2" fill="currentColor" className="text-emerald-400" />
          <rect x="102" y="22" width="6" height="20" rx="2" fill="currentColor" className="text-emerald-400" />
          <line x1="40" y1="50" x2="80" y2="50" strokeWidth="4" />
        </g>
      )}
      {kind === 'lat_pulldown' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <line x1="28" y1="72" x2="92" y2="72" />
          <line x1="60" y1="72" x2="60" y2="12" />
          <line x1="36" y1="12" x2="72" y2="12" />
          <circle cx="40" cy="14" r="3" fill="currentColor" />
          <line x1="40" y1="17" x2="40" y2="32" className="text-emerald-400" />
          <line x1="22" y1="32" x2="58" y2="32" className="text-emerald-400" />
          <rect x="66" y="28" width="18" height="32" rx="2" />
          <line x1="34" y1="56" x2="54" y2="56" strokeWidth="4" />
        </g>
      )}
      {kind === 'cable' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <line x1="26" y1="14" x2="26" y2="72" />
          <line x1="94" y1="14" x2="94" y2="72" />
          <line x1="20" y1="14" x2="100" y2="14" />
          <circle cx="32" cy="24" r="3" fill="currentColor" className="text-emerald-400" />
          <circle cx="88" cy="24" r="3" fill="currentColor" className="text-emerald-400" />
          <line x1="34" y1="26" x2="52" y2="48" className="text-emerald-400" />
          <line x1="86" y1="26" x2="68" y2="48" className="text-emerald-400" />
          <rect x="20" y="34" width="12" height="24" rx="2" />
          <rect x="88" y="34" width="12" height="24" rx="2" />
        </g>
      )}
      {kind === 'leg_press' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <line x1="18" y1="70" x2="102" y2="70" />
          <line x1="26" y1="70" x2="78" y2="20" />
          <line x1="72" y1="14" x2="92" y2="34" strokeWidth="4" className="text-emerald-400" />
          <circle cx="72" cy="40" r="8" className="text-emerald-400" />
          <path d="M22 52 L42 66 L54 66" strokeWidth="4" />
        </g>
      )}
      {kind === 'leg_machine' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <line x1="24" y1="70" x2="96" y2="70" />
          <line x1="34" y1="30" x2="34" y2="56" strokeWidth="4" />
          <line x1="34" y1="54" x2="64" y2="54" strokeWidth="4" />
          <circle cx="64" cy="54" r="4" fill="currentColor" className="text-emerald-400" />
          <line x1="64" y1="54" x2="82" y2="66" className="text-emerald-400" strokeWidth="3.5" />
          <rect x="74" y="24" width="16" height="34" rx="2" />
        </g>
      )}
      {kind === 'squat_rack' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <line x1="24" y1="72" x2="96" y2="72" />
          <line x1="34" y1="72" x2="34" y2="14" />
          <line x1="86" y1="72" x2="86" y2="14" />
          <line x1="34" y1="16" x2="86" y2="16" />
          <line x1="16" y1="30" x2="104" y2="30" className="text-emerald-400" />
          <rect x="12" y="20" width="6" height="20" rx="2" fill="currentColor" className="text-emerald-400" />
          <rect x="102" y="20" width="6" height="20" rx="2" fill="currentColor" className="text-emerald-400" />
        </g>
      )}
      {kind === 'pullup_bar' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <line x1="28" y1="72" x2="28" y2="18" />
          <line x1="92" y1="72" x2="92" y2="18" />
          <line x1="22" y1="18" x2="98" y2="18" strokeWidth="3.5" className="text-emerald-400" />
          <line x1="20" y1="72" x2="40" y2="72" />
          <line x1="80" y1="72" x2="100" y2="72" />
        </g>
      )}
      {kind === 'dumbbell' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <rect x="20" y="26" width="12" height="32" rx="3" fill="currentColor" className="text-emerald-400" />
          <rect x="88" y="26" width="12" height="32" rx="3" fill="currentColor" className="text-emerald-400" />
          <rect x="32" y="37" width="56" height="10" rx="2" />
        </g>
      )}
      {kind === 'barbell' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <rect x="14" y="22" width="10" height="40" rx="2" fill="currentColor" className="text-emerald-400" />
          <rect x="96" y="22" width="10" height="40" rx="2" fill="currentColor" className="text-emerald-400" />
          <rect x="24" y="28" width="6" height="28" rx="1.5" />
          <rect x="90" y="28" width="6" height="28" rx="1.5" />
          <line x1="10" y1="42" x2="110" y2="42" strokeWidth="3" />
        </g>
      )}
      {kind === 'mat' && (
        <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <rect x="18" y="48" width="84" height="14" rx="4" className="text-emerald-400" fill="currentColor" fillOpacity="0.2" />
          <circle cx="24" cy="55" r="7" />
        </g>
      )}
    </svg>
  )
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
          const resolvedEquipment = curated?.equipment ?? dbMatch.equipment ?? 'Corpo libero / Palestra'
          setGuide(prev => ({
            id: dbMatch.id,
            displayName: exerciseName,
            englishName: dbMatch.name,
            equipment: resolvedEquipment,
            machineKind: curated?.machineKind ?? inferMachineKind(dbMatch.equipment, dbMatch.name),
            machineSetup:
              curated?.machineSetup ??
              `Utilizza ${dbMatch.equipment ?? 'la postazione dedicata'} mantenendo postura neutra e regolazioni allineate alle articolazioni.`,
            primaryMuscles: prev?.primaryMuscles?.length ? prev.primaryMuscles : dbMatch.primaryMuscles ?? [],
            secondaryMuscles: prev?.secondaryMuscles?.length ? prev.secondaryMuscles : dbMatch.secondaryMuscles ?? [],
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
            {guide ? `DB: ${guide.englishName} · ${guide.equipment}` : 'Caricamento da free-exercise-db...'}
          </DialogDescription>
        </DialogHeader>

        {guide ? (
          <div className="space-y-4">
            {/* 1. Foto Esecuzione */}
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

            {/* 2. Macchinario / Attrezzatura da utilizzare */}
            <section className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Wrench className="size-3.5" />
                  Macchinario & Postazione da utilizzare
                </p>
                <Badge variant="outline" className="border-primary/35 text-[10.5px]">
                  {guide.equipment}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <MachineSchematicSvg kind={guide.machineKind} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Dumbbell className="size-3.5 shrink-0 text-emerald-500" />
                    <span className="truncate">{guide.equipment}</span>
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {guide.machineSetup}
                  </p>
                </div>
              </div>
            </section>

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

            {/* 3. Come si svolge l'esercizio */}
            <section className="space-y-2 rounded-xl border border-slate-300 bg-slate-100 p-3 text-slate-900 dark:border-border dark:bg-muted/40 dark:text-foreground">
              <p className="text-xs font-bold text-slate-900 dark:text-primary">
                Come si svolge l’esercizio
              </p>
              {guide.italianCues.length > 0 ? (
                <ol className="space-y-1.5 text-xs leading-relaxed">
                  {guide.italianCues.map((cue, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        <strong className="mr-1 font-mono text-[11px]">{idx + 1}.</strong>
                        {cue}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : guide.rawInstructions.length > 0 ? (
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                  {guide.rawInstructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Mantieni controllo nella discesa, pausa breve in contrazione e traiettoria fluida.
                </p>
              )}
            </section>

            {guide.commonMistake && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400 bg-amber-200 p-3 text-xs font-medium text-amber-950">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-900" />
                <div>
                  <span className="font-bold">Errore comune: </span>
                  {guide.commonMistake}
                </div>
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
