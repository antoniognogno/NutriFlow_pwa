import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export interface ExerciseMeta {
  rir?: string
  note?: string
  restSeconds?: number | null
  supersetGroup?: string | null
}

export const EXERCISE_NOTES_KEY = 'nutriflow:exercise-notes-v1'

function normalizeKey(exerciseName: string): string {
  return exerciseName.trim().toLowerCase()
}

export function readAllExerciseMeta(): Record<string, ExerciseMeta> {
  try {
    const raw = localStorage.getItem(EXERCISE_NOTES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ExerciseMeta>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readExerciseMeta(exerciseName: string): ExerciseMeta | null {
  const key = normalizeKey(exerciseName)
  if (!key) return null
  const item = readAllExerciseMeta()[key]
  if (!item) return null
  const hasRest = typeof item.restSeconds === 'number' && item.restSeconds > 0
  const hasSuperset = Boolean(item.supersetGroup?.trim())
  if (!item.rir?.trim() && !item.note?.trim() && !hasRest && !hasSuperset) return null
  return item
}

export function saveExerciseMeta(exerciseName: string, meta: ExerciseMeta): void {
  const key = normalizeKey(exerciseName)
  if (!key) return
  const all = readAllExerciseMeta()
  const cleanRir = meta.rir?.trim() || ''
  const cleanNote = meta.note?.trim() || ''
  const cleanRest =
    typeof meta.restSeconds === 'number' && Number.isFinite(meta.restSeconds) && meta.restSeconds >= 15
      ? Math.min(600, Math.round(meta.restSeconds))
      : null
  const cleanSuperset = meta.supersetGroup?.trim().toUpperCase() || null

  if (!cleanRir && !cleanNote && cleanRest === null && cleanSuperset === null) {
    delete all[key]
  } else {
    all[key] = {
      rir: cleanRir,
      note: cleanNote,
      restSeconds: cleanRest,
      supersetGroup: cleanSuperset,
    }
  }
  localStorage.setItem(EXERCISE_NOTES_KEY, JSON.stringify(all))
  markCloudStateDirty()
}
