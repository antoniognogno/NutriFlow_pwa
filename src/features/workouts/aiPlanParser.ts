export interface ParsedAiExercise {
  exercise_name: string
  target_sets: string
  target_reps: string
  rir: string
  restSeconds: string
  supersetGroup: string
  note: string
}

export interface ParsedAiWorkout {
  name: string
  exercises: ParsedAiExercise[]
}

export interface ParsedAiPlan {
  planName: string
  workouts: ParsedAiWorkout[]
}

export const GEMINI_FORMAT_GUIDE = `# Nome Scheda
## Giorno: Nome del Giorno
- Nome Esercizio | 4x8-10 | Rec: 120s | RIR 2 | SS: A | Nota: opzionale`

export const GEMINI_PROMPT_TEMPLATE = `Agisci come un personal trainer esperto. Crea una scheda di allenamento per:
- Obiettivo: [ipertrofia / forza / dimagrimento]
- Giorni a settimana: [3 o 4]
- Livello: [principiante / intermedio]
- Attrezzatura: [palestra completa / manubri a casa]

IMPORTANTE: Alla fine della tua risposta formatta la scheda ESATTAMENTE così, usando una riga per esercizio (Rec, RIR, SS e Nota sono opzionali; usa lo stesso valore SS su due esercizi consecutivi per collegarli in superserie):

# Upper / Lower Personalizzata
## Giorno: Giorno 1 - Spinta
- Panca Piana con Bilanciere | 4x6-8 | Rec: 150s | RIR 2 | Nota: Fermo 1s al petto
- Croci ai Cavi | 3x12 | Rec: 75s | RIR 1 | SS: A
- Alzate Laterali Manubri | 3x12-15 | Rec: 75s | RIR 1 | SS: A
## Giorno: Giorno 2 - Tirata & Gambe
- Lat Machine Avanti | 4x8-10 | Rec: 120s | RIR 2
- Squat con Bilanciere | 4x6 | Rec: 180s | RIR 2`

export const GEMINI_EXAMPLE_OUTPUT = `# Scheda Spinta / Tirata / Gambe
## Giorno: Spinta (Petto, Spalle, Tricipiti)
- Panca Piana con Bilanciere | 4x6-8 | Rec: 150s | RIR 2 | Nota: Discesa controllata 2s
- Spinte Manubri su Panca Inclinata | 3x10 | Rec: 120s | RIR 2
- Alzate Laterali Manubri | 3x12-15 | Rec: 75s | RIR 1 | SS: A
- French Press Manubri | 3x12 | Rec: 75s | RIR 1 | SS: A
## Giorno: Tirata (Schiena, Bicipiti)
- Trazioni / Lat Machine | 4x8-10 | Rec: 120s | RIR 2
- Rematore con Bilanciere | 4x8 | Rec: 120s | RIR 2
- Curl con Bilanciere | 3x10 | Rec: 90s | RIR 1
## Giorno: Gambe & Core
- Squat con Bilanciere | 4x6 | Rec: 180s | RIR 2
- Romanian Deadlift (RDL) | 3x8-10 | Rec: 150s | RIR 2
- Plank | 3x60s | Rec: 60s | Nota: Addome contratto`

function clampSets(raw: string | number | undefined): string {
  const num = Number.parseInt(String(raw ?? '3'), 10)
  if (!Number.isFinite(num) || num < 1) return '3'
  return String(Math.min(20, num))
}

function parseSetsAndReps(segment: string): { sets: string; reps: string } | null {
  const clean = segment.trim()
  // 4x8-10, 4 × 8, 4x60s, 3 x 12
  const compactMatch = clean.match(/(\d{1,2})\s*[x×*]\s*(\d+(?:\s*[-–]\s*\d+)?\s*(?:s|sec|min)?)/i)
  if (compactMatch) {
    return {
      sets: clampSets(compactMatch[1]),
      reps: compactMatch[2].replace(/\s+/g, ''),
    }
  }
  const verboseMatch = clean.match(/(\d{1,2})\s*serie\s*(?:da|x|×)?\s*(\d+(?:\s*[-–]\s*\d+)?)/i)
  if (verboseMatch) {
    return {
      sets: clampSets(verboseMatch[1]),
      reps: verboseMatch[2].replace(/\s+/g, ''),
    }
  }
  return null
}

function extractRestSeconds(text: string): string {
  const minMatch = text.match(/(?:rec(?:upero)?|rest|pausa)\s*[:=]?\s*(\d{1,2})\s*m(?:in)?\b/i)
  if (minMatch) {
    const secs = Number.parseInt(minMatch[1], 10) * 60
    if (secs >= 15 && secs <= 600) return String(secs)
  }
  const secMatch = text.match(/(?:rec(?:upero)?|rest|pausa)\s*[:=]?\s*(\d{2,3})\s*(?:s|sec)?\b/i)
  if (secMatch) {
    const secs = Number.parseInt(secMatch[1], 10)
    if (secs >= 15 && secs <= 600) return String(secs)
  }
  const bareSecMatch = text.match(/^\s*(\d{2,3})\s*(?:s|sec)\s*$/i)
  if (bareSecMatch) {
    const secs = Number.parseInt(bareSecMatch[1], 10)
    if (secs >= 15 && secs <= 600) return String(secs)
  }
  return ''
}

function parseExerciseLine(rawLine: string): ParsedAiExercise | null {
  const cleanedLine = rawLine
    .replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '')
    .replace(/\*\*/g, '')
    .trim()
  if (!cleanedLine) return null

  const parts = cleanedLine.split('|').map(p => p.trim()).filter(Boolean)
  let namePart = parts[0] ?? cleanedLine
  let targetSets = '3'
  let targetReps = '10'
  let restSeconds = ''
  let rir = ''
  let supersetGroup = ''
  let note = ''

  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      const setsReps = parseSetsAndReps(part)
      if (setsReps && !/^(?:rec|rest|pausa|rir|ss|superset|nota)/i.test(part)) {
        targetSets = setsReps.sets
        targetReps = setsReps.reps
        continue
      }
      if (/^(?:rec|rest|pausa)\b/i.test(part) || /^\d{2,3}\s*(?:s|sec)$/i.test(part)) {
        restSeconds = extractRestSeconds(part) || restSeconds
        continue
      }
      const rirMatch = part.match(/\b(RIR\s*\d+(?:\s*[-–]\s*\d+)?|RPE\s*\d+(?:[.,]\d+)?)\b/i)
      if (rirMatch) {
        rir = rirMatch[1].toUpperCase().replace(/\s+/g, ' ')
        continue
      }
      const ssMatch = part.match(/^(?:SS|Superset)\s*[:=]?\s*([A-Z0-9]{1,3})$/i)
      if (ssMatch) {
        supersetGroup = ssMatch[1].toUpperCase()
        continue
      }
      const noteMatch = part.match(/^Nota?\s*[:=]\s*(.+)$/i)
      if (noteMatch) {
        note = noteMatch[1].trim().slice(0, 120)
        continue
      }
      if (!note) {
        note = part.slice(0, 120)
      }
    }
  } else {
    // Fallback for free-form lines like "Panca Piana: 4x8, recupero 120s, RIR 2"
    const setsReps = parseSetsAndReps(cleanedLine)
    if (setsReps) {
      targetSets = setsReps.sets
      targetReps = setsReps.reps
    }
    restSeconds = extractRestSeconds(cleanedLine)
    const rirMatch = cleanedLine.match(/\b(RIR\s*\d+|RPE\s*\d+)\b/i)
    if (rirMatch) {
      rir = rirMatch[1].toUpperCase().replace(/\s+/g, ' ')
    }
    namePart = cleanedLine
      .split(/\s*[:–-]\s*(?=\d)/)[0]
      .replace(/\d{1,2}\s*[x×*]\s*\d+(?:\s*[-–]\s*\d+)?\s*(?:s|sec|min)?/gi, '')
      .replace(/,.*$/, '')
      .replace(/\(.*?\)/g, '')
      .trim()
  }

  const finalName = namePart.replace(/^[:\-\s]+|[:\-\s]+$/g, '').slice(0, 90)
  if (!finalName || finalName.length < 2) return null

  return {
    exercise_name: finalName,
    target_sets: targetSets,
    target_reps: targetReps,
    rir,
    restSeconds,
    supersetGroup,
    note,
  }
}

function tryParseJsonPlan(rawText: string): ParsedAiPlan | null {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fencedMatch ? fencedMatch[1].trim() : rawText.trim()
  if (!candidate.startsWith('{') && !candidate.startsWith('[')) return null
  try {
    const parsed = JSON.parse(candidate) as {
      planName?: string
      name?: string
      workouts?: Array<{
        name?: string
        exercises?: Array<{
          exercise_name?: string
          name?: string
          target_sets?: string | number
          sets?: string | number
          target_reps?: string | number
          reps?: string | number
          restSeconds?: string | number
          rest?: string | number
          rir?: string
          supersetGroup?: string
          superset?: string
          note?: string
        }>
      }>
    }
    const rawWorkouts = Array.isArray(parsed.workouts) ? parsed.workouts : []
    const workouts: ParsedAiWorkout[] = rawWorkouts
      .map((w, idx) => ({
        name: String(w.name ?? `Giorno ${idx + 1}`).trim() || `Giorno ${idx + 1}`,
        exercises: (Array.isArray(w.exercises) ? w.exercises : [])
          .map(ex => {
            const name = String(ex.exercise_name ?? ex.name ?? '').trim()
            if (!name) return null
            const restNum = Number.parseInt(String(ex.restSeconds ?? ex.rest ?? ''), 10)
            return {
              exercise_name: name.slice(0, 90),
              target_sets: clampSets(ex.target_sets ?? ex.sets),
              target_reps: String(ex.target_reps ?? ex.reps ?? '10').trim() || '10',
              rir: String(ex.rir ?? '').trim(),
              restSeconds: Number.isFinite(restNum) && restNum > 0 ? String(restNum) : '',
              supersetGroup: String(ex.supersetGroup ?? ex.superset ?? '').trim().toUpperCase(),
              note: String(ex.note ?? '').trim().slice(0, 120),
            }
          })
          .filter((ex): ex is ParsedAiExercise => ex !== null),
      }))
      .filter(w => w.exercises.length > 0)

    if (workouts.length === 0) return null
    return {
      planName: String(parsed.planName ?? parsed.name ?? 'Scheda importata').trim() || 'Scheda importata',
      workouts,
    }
  } catch {
    return null
  }
}

export function parseAiWorkoutPlan(rawText: string): ParsedAiPlan | null {
  const trimmed = rawText.trim()
  if (!trimmed) return null

  const jsonResult = tryParseJsonPlan(trimmed)
  if (jsonResult) return jsonResult

  const lines = trimmed
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .split(/\r?\n/)

  let planName = ''
  const workouts: ParsedAiWorkout[] = []
  let currentWorkout: ParsedAiWorkout | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Top-level heading: # Nome Scheda
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
      const candidatePlan = line.replace(/^#\s+/, '').replace(/\*\*/g, '').trim()
      if (candidatePlan && !planName) {
        planName = candidatePlan
      }
      continue
    }

    // Day heading: ## Giorno: ..., ### Giorno 1 - ..., or **Giorno 1: ...**
    const isDayHeading =
      /^#{2,3}\s+/.test(line) ||
      /^\*{0,2}(?:giorno|day|scheda|allenamento|sessione)\s*\d*\s*[:–-]/i.test(line)

    if (isDayHeading && !line.includes('|')) {
      const dayTitle = line
        .replace(/^#{2,3}\s+/, '')
        .replace(/\*\*/g, '')
        .replace(/^(?:giorno|day)\s*:\s*/i, '')
        .trim()
      if (dayTitle) {
        currentWorkout = { name: dayTitle.slice(0, 80), exercises: [] }
        workouts.push(currentWorkout)
      }
      continue
    }

    const isBulletOrHasPipe = /^\s*(?:[-*•]+|\d+[.)])\s+/.test(rawLine) || line.includes('|')
    if (!isBulletOrHasPipe) continue

    const parsedExercise = parseExerciseLine(line)
    if (!parsedExercise) continue

    if (!currentWorkout) {
      currentWorkout = { name: 'Giorno 1', exercises: [] }
      workouts.push(currentWorkout)
    }
    currentWorkout.exercises.push(parsedExercise)
  }

  const nonEmptyWorkouts = workouts.filter(w => w.exercises.length > 0)
  if (nonEmptyWorkouts.length === 0) return null

  return {
    planName: planName || 'Scheda da Gemini',
    workouts: nonEmptyWorkouts,
  }
}
