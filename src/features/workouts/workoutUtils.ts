export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remaining = safe % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${minutes}:${String(remaining).padStart(2, '0')}`
}

export function formatPacePerKm(distanceKm: number, minutes: number): string {
  if (distanceKm <= 0 || minutes <= 0) return '0:00/km'
  const paceSec = Math.round((minutes * 60) / distanceKm)
  return `${Math.floor(paceSec / 60)}:${String(paceSec % 60).padStart(2, '0')}/km`
}

export function computeSetVolumeKg(sets: Array<{ weightKg: string; reps: string; completed: boolean }>): number {
  return sets
    .filter(set => set.completed)
    .reduce((sum, set) => sum + (Number.parseFloat(set.weightKg) || 0) * (Number.parseInt(set.reps, 10) || 0), 0)
}

export function isCardioSession(session: { workout_id: string | null; workout_name: string }): boolean {
  if (!session.workout_id) return true
  const lower = session.workout_name.toLowerCase()
  return lower.includes('corsa') || lower.includes('cardio') || lower.includes('run')
}

export function computeElapsedWorkoutSeconds(
  sessionStartMs: number,
  nowMs: number,
  pausedTotalMs: number,
  pausedAtMs: number | null,
): number {
  const effectiveNow = pausedAtMs ?? nowMs
  return Math.max(0, Math.floor((effectiveNow - sessionStartMs - pausedTotalMs) / 1000))
}

const HEAVY_COMPOUNDS = [
  'panca',
  'bench',
  'squat',
  'stacco',
  'deadlift',
  'rdl',
  'romanian',
  'military',
  'lento',
  'rematore',
  'row',
  'trazioni',
  'lat machine',
  'leg press',
]

const LIGHT_ISOLATION = [
  'alzate',
  'lateral',
  'curl',
  'pushdown',
  'face pull',
  'leg curl',
  'calf',
  'polpacci',
  'plank',
  'crunch',
  'addome',
]

export function getRecommendedRestSeconds(exerciseName: string): number {
  const normalized = exerciseName.trim().toLowerCase()
  if (HEAVY_COMPOUNDS.some(kw => normalized.includes(kw))) return 120
  if (LIGHT_ISOLATION.some(kw => normalized.includes(kw))) return 60
  return 90
}

export function getOverloadSuggestion(lastWeightKg: number | undefined, lastReps: number | undefined): string | null {
  if (!lastWeightKg || lastWeightKg <= 0) return null
  if (lastReps && lastReps >= 10) {
    return `Prova ${Math.round((lastWeightKg + 2.5) * 100) / 100} kg`
  }
  return `Prova ${lastWeightKg} kg × ${(lastReps ?? 8) + 1}`
}

export function estimateOneRepMaxEpley(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(reps) || reps <= 0) {
    return 0
  }
  const safeReps = Math.round(reps)
  if (safeReps <= 1) return Math.round(weightKg * 10) / 10
  return Math.round(weightKg * (1 + safeReps / 30) * 10) / 10
}

export function computeLiveExerciseProgression(
  sets: Array<{ weightKg: string; reps: string; completed: boolean }>,
  previousWeightKg?: number,
  previousReps?: number,
): {
  best1RmKg: number
  previous1RmKg: number
  delta1RmKg: number | null
  completedVolumeKg: number
} {
  let best1RmKg = 0
  let completedVolumeKg = 0

  for (const s of sets) {
    const w = Number.parseFloat(s.weightKg) || 0
    const r = Number.parseInt(s.reps, 10) || 0
    if (s.completed) {
      completedVolumeKg += w * r
    }
    const est = estimateOneRepMaxEpley(w, r)
    if (est > best1RmKg) best1RmKg = est
  }

  const previous1RmKg =
    previousWeightKg && previousReps
      ? estimateOneRepMaxEpley(previousWeightKg, previousReps)
      : 0

  const delta1RmKg =
    best1RmKg > 0 && previous1RmKg > 0
      ? Math.round((best1RmKg - previous1RmKg) * 10) / 10
      : null

  return {
    best1RmKg,
    previous1RmKg,
    delta1RmKg,
    completedVolumeKg: Math.round(completedVolumeKg),
  }
}

const STANDARD_PLATES = [20, 15, 10, 5, 2.5, 1.25]

export function computeBarbellPlates(totalKg: number, barKg = 20): {
  barKg: number
  perSideKg: number
  plates: number[]
  remainderKg: number
} {
  const safeTotal = Math.max(barKg, totalKg)
  let remaining = Math.round(((safeTotal - barKg) / 2) * 100) / 100
  const perSideKg = remaining
  const plates: number[] = []

  for (const plate of STANDARD_PLATES) {
    while (remaining + 0.001 >= plate) {
      plates.push(plate)
      remaining = Math.round((remaining - plate) * 100) / 100
    }
  }

  return {
    barKg,
    perSideKg,
    plates,
    remainderKg: Math.max(0, remaining),
  }
}
