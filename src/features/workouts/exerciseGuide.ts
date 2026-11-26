export const FREE_EXERCISE_DB_JSON =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
export const FREE_EXERCISE_DB_IMG_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const CACHE_KEY = 'nutriflow:free-exercise-db-v1'

export interface FreeExerciseRecord {
  id: string
  name: string
  equipment?: string | null
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
  images?: string[]
}

export interface ExerciseGuideData {
  id: string
  displayName: string
  englishName: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  images: string[]
  italianCues: string[]
  commonMistake: string
  rawInstructions: string[]
}

interface CuratedGuide {
  keywords: string[]
  id: string
  englishName: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  italianCues: string[]
  commonMistake: string
}

const CURATED_GUIDES: CuratedGuide[] = [
  {
    keywords: ['panca piana', 'bench press', 'panca'],
    id: 'Barbell_Bench_Press_-_Medium_Grip',
    englishName: 'Barbell Bench Press - Medium Grip',
    equipment: 'Bilanciere',
    primaryMuscles: ['Petto'],
    secondaryMuscles: ['Spalle anteriori', 'Tricipiti'],
    italianCues: [
      'Retrai e abbassa le scapole appoggiandole bene sulla panca.',
      'Scendi controllando il bilanciere fino a sfiorare la parte bassa dello sterno.',
      'Spingi verso l’alto mantenendo i gomiti a ~45° rispetto al busto.',
    ],
    commonMistake: 'Aprire i gomiti a 90° o staccare i glutei dalla panca durante la spinta.',
  },
  {
    keywords: ['military', 'lento avanti', 'shoulder press'],
    id: 'Dumbbell_Shoulder_Press',
    englishName: 'Dumbbell Shoulder Press',
    equipment: 'Manubri / Bilanciere',
    primaryMuscles: ['Spalle'],
    secondaryMuscles: ['Tricipiti', 'Core'],
    italianCues: [
      'Contrai addome e glutei per non inarcare la zona lombare.',
      'Spingi i manubri sopra la testa tenendo i gomiti leggermente avanti.',
      'Controlla la discesa fino all’altezza delle orecchie.',
    ],
    commonMistake: 'Inarcare eccessivamente la schiena compensando con il petto alto.',
  },
  {
    keywords: ['alzate laterali', 'lateral raise'],
    id: 'Side_Lateral_Raise',
    englishName: 'Side Lateral Raise',
    equipment: 'Manubri',
    primaryMuscles: ['Deltoide laterale'],
    secondaryMuscles: ['Trapezio'],
    italianCues: [
      'Inclina leggermente il busto in avanti e tieni i gomiti appena flessi.',
      'Solleva guidando il movimento con i gomiti fino all’altezza delle spalle.',
      'Scendi lentamente frenando il carico senza slanci.',
    ],
    commonMistake: 'Usare troppo peso oscillando con la schiena o alzando le spalle verso le orecchie.',
  },
  {
    keywords: ['pushdown', 'tricipiti'],
    id: 'Triceps_Pushdown',
    englishName: 'Triceps Pushdown',
    equipment: 'Cavo',
    primaryMuscles: ['Tricipiti'],
    secondaryMuscles: [],
    italianCues: [
      'Blocca i gomiti lungo i fianchi per tutta la serie.',
      'Estendi completamente gli avambracci verso il basso contraendo i tricipiti.',
      'Risali controllato fino a superare di poco i 90° al gomito.',
    ],
    commonMistake: 'Spostare i gomiti avanti e indietro trasformandolo in una spinta di petto/spalle.',
  },
  {
    keywords: ['lat machine', 'trazioni', 'pulldown', 'pull-up', 'pullup'],
    id: 'Wide-Grip_Lat_Pulldown',
    englishName: 'Wide-Grip Lat Pulldown',
    equipment: 'Cavo / Sbarra',
    primaryMuscles: ['Dorsali'],
    secondaryMuscles: ['Bicipiti', 'Romboidi'],
    italianCues: [
      'Inizia la tirata abbassando le scapole prima di piegare i gomiti.',
      'Porta i gomiti verso i fianchi fino alla parte alta del petto.',
      'Allunga bene il dorsale in alto senza perdere la postura.',
    ],
    commonMistake: 'Tirare solo con le braccia o dondolare indietro con il busto.',
  },
  {
    keywords: ['rematore', 'row'],
    id: 'One-Arm_Dumbbell_Row',
    englishName: 'One-Arm Dumbbell Row',
    equipment: 'Manubrio / Bilanciere',
    primaryMuscles: ['Dorsali', 'Centro schiena'],
    secondaryMuscles: ['Bicipiti', 'Spalle posteriori'],
    italianCues: [
      'Mantieni la schiena piatta e parallela al suolo.',
      'Tira il manubrio verso l’anca, non verso il petto.',
      'Fai una breve pausa in alto stringendo la scapola.',
    ],
    commonMistake: 'Ruotare il tronco durante la tirata per dare slancio.',
  },
  {
    keywords: ['face pull'],
    id: 'Face_Pull',
    englishName: 'Face Pull',
    equipment: 'Cavo con corda',
    primaryMuscles: ['Deltoidi posteriori'],
    secondaryMuscles: ['Trapezio medio', 'Cuffia dei rotatori'],
    italianCues: [
      'Tira la corda verso la fronte aprendo i gomiti verso l’esterno.',
      'Ruota esternamente gli avambracci a fine movimento (posizione doppio bicipite).',
      'Controlla il ritorno tenendo le scapole stabili.',
    ],
    commonMistake: 'Tirare verso il mento con i gomiti bassi o usare troppo carico.',
  },
  {
    keywords: ['curl'],
    id: 'Barbell_Curl',
    englishName: 'Barbell Curl',
    equipment: 'Bilanciere / Manubri',
    primaryMuscles: ['Bicipiti'],
    secondaryMuscles: ['Avambracci'],
    italianCues: [
      'Tieni i gomiti fermi vicino ai fianchi.',
      'Fletti l’avambraccio fino alla massima contrazione senza alzare le spalle.',
      'Scendi lentamente estendendo quasi tutto il braccio.',
    ],
    commonMistake: 'Dondolare con la schiena o portare i gomiti troppo in avanti.',
  },
  {
    keywords: ['squat', 'leg press'],
    id: 'Barbell_Squat',
    englishName: 'Barbell Squat',
    equipment: 'Bilanciere / Macchina',
    primaryMuscles: ['Quadricipiti', 'Glutei'],
    secondaryMuscles: ['Femorali', 'Core'],
    italianCues: [
      'Prendi aria di pancia, compatta il core e scendi spingendo indietro le anche.',
      'Mantieni le ginocchia in linea con le punte dei piedi.',
      'Spingi forte con tutto il piede a terra risalendo con petto aperto.',
    ],
    commonMistake: 'Alzare i talloni o far cedere le ginocchia verso l’interno in risalita.',
  },
  {
    keywords: ['romanian', 'stacco rumeno', 'rdl', 'stacco'],
    id: 'Romanian_Deadlift',
    englishName: 'Romanian Deadlift',
    equipment: 'Bilanciere / Manubri',
    primaryMuscles: ['Femorali', 'Glutei'],
    secondaryMuscles: ['Lombari'],
    italianCues: [
      'Ginocchia leggermente flesse e bloccate, schiena sempre neutra.',
      'Spingi il bacino indietro facendo scorrere il bilanciere lungo le cosce.',
      'Inverti il movimento appena senti forte tensione sui femorali.',
    ],
    commonMistake: 'Arrotondare la zona lombare per scendere di più verso il pavimento.',
  },
  {
    keywords: ['leg curl'],
    id: 'Seated_Leg_Curl',
    englishName: 'Seated Leg Curl',
    equipment: 'Macchina',
    primaryMuscles: ['Femorali'],
    secondaryMuscles: ['Polpacci'],
    italianCues: [
      'Allinea l’asse del ginocchio con il perno della macchina.',
      'Fletti in modo esplosivo e controlla per 2-3 secondi la fase di ritorno.',
    ],
    commonMistake: 'Staccare il bacino dal sedile quando il carico è alto.',
  },
  {
    keywords: ['calf', 'polpacci'],
    id: 'Standing_Calf_Raises',
    englishName: 'Standing Calf Raises',
    equipment: 'Macchina / Step',
    primaryMuscles: ['Polpacci'],
    secondaryMuscles: [],
    italianCues: [
      'Scendi fino al massimo allungamento e fai 1 secondo di pausa in basso.',
      'Sali completamente sulla punta dell’alluce contraendo per 1 secondo in alto.',
    ],
    commonMistake: 'Rimbalzare velocemente sfruttando l’elasticità del tendine d’Achille.',
  },
  {
    keywords: ['panca inclinata', 'incline bench', 'incline dumbbell'],
    id: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
    englishName: 'Barbell Incline Bench Press - Medium Grip',
    equipment: 'Bilanciere / Manubri',
    primaryMuscles: ['Petto alto'],
    secondaryMuscles: ['Spalle anteriori', 'Tricipiti'],
    italianCues: [
      'Inclina la panca a 30°–45° e blocca le scapole.',
      'Scendi controllato verso la parte alta del petto e spingi senza perdere assetto.',
    ],
    commonMistake: 'Impostare la panca troppo verticale trasformando il movimento in un lento avanti.',
  },
  {
    keywords: ['croci', 'chest fly', 'pec deck'],
    id: 'Dumbbell_Flyes',
    englishName: 'Dumbbell Flyes',
    equipment: 'Manubri / Cavi',
    primaryMuscles: ['Petto'],
    secondaryMuscles: ['Spalle anteriori'],
    italianCues: [
      'Tieni i gomiti leggermente flessi e bloccati per tutta la serie.',
      'Apri in controllo fino a sentire allungamento sul petto e richiudi ad arco.',
    ],
    commonMistake: 'Piegare troppo i gomiti trasformando le croci in una spinta.',
  },
  {
    keywords: ['french press', 'skullcrusher'],
    id: 'Lying_Triceps_Press',
    englishName: 'Lying Triceps Press',
    equipment: 'Bilanciere EZ / Manubri',
    primaryMuscles: ['Tricipiti'],
    secondaryMuscles: [],
    italianCues: [
      'Tieni gli omeri leggermente inclinati indietro per mantenere tensione costante.',
      'Fletti solo il gomito scendendo verso la fronte o dietro la testa.',
    ],
    commonMistake: 'Allargare eccessivamente i gomiti verso l’esterno.',
  },
  {
    keywords: ['pulley', 'seated cable row'],
    id: 'Seated_Cable_Rows',
    englishName: 'Seated Cable Rows',
    equipment: 'Cavo',
    primaryMuscles: ['Dorsali', 'Centro schiena'],
    secondaryMuscles: ['Bicipiti'],
    italianCues: [
      'Petto aperto, tira l’impugnatura verso l’ombelico portando indietro i gomiti.',
      'Controlla il ritorno senza incurvare la bassa schiena.',
    ],
    commonMistake: 'Dondolare avanti e indietro con il busto.',
  },
  {
    keywords: ['affondi', 'lunge', 'bulgarian'],
    id: 'Dumbbell_Lunges',
    englishName: 'Dumbbell Lunges',
    equipment: 'Manubri / Corpo libero',
    primaryMuscles: ['Quadricipiti', 'Glutei'],
    secondaryMuscles: ['Femorali', 'Core'],
    italianCues: [
      'Fai un passo ampio scendendo con il ginocchio posteriore verso il pavimento.',
      'Spingi forte dal tallone/centro del piede anteriore per risalire.',
    ],
    commonMistake: 'Tenere i piedi sulla stessa linea perdendo equilibrio laterale.',
  },
  {
    keywords: ['leg extension', 'estensioni gambe'],
    id: 'Leg_Extensions',
    englishName: 'Leg Extensions',
    equipment: 'Macchina',
    primaryMuscles: ['Quadricipiti'],
    secondaryMuscles: [],
    italianCues: [
      'Regola lo schienale per allineare le ginocchia al perno.',
      'Estendi completamente facendo una breve pausa in alto e scendi lento.',
    ],
    commonMistake: 'Dare strappi velocissimi sollevando il bacino dal sedile.',
  },
  {
    keywords: ['crunch', 'addome', 'plank', 'abs'],
    id: 'Crunches',
    englishName: 'Crunches',
    equipment: 'Corpo libero / Tappetino',
    primaryMuscles: ['Addominali'],
    secondaryMuscles: [],
    italianCues: [
      'Arrotola la colonna sollevando solo le scapole da terra e buttando fuori l’aria.',
      'Scendi lentamente mantenendo tensione sull’addome.',
    ],
    commonMistake: 'Tirare il collo con le mani o sollevare tutta la schiena usando i flessori dell’anca.',
  },
]

export interface ExerciseSuggestion {
  label: string
  englishName: string
  equipment: string
  id: string
  isCurated: boolean
}

export const CURATED_EXERCISE_OPTIONS: ExerciseSuggestion[] = [
  { label: 'Panca Piana', englishName: 'Barbell Bench Press - Medium Grip', equipment: 'Bilanciere', id: 'Barbell_Bench_Press_-_Medium_Grip', isCurated: true },
  { label: 'Panca Inclinata Manubri', englishName: 'Barbell Incline Bench Press - Medium Grip', equipment: 'Manubri', id: 'Barbell_Incline_Bench_Press_-_Medium_Grip', isCurated: true },
  { label: 'Croci con Manubri', englishName: 'Dumbbell Flyes', equipment: 'Manubri', id: 'Dumbbell_Flyes', isCurated: true },
  { label: 'Military Press / Lento Avanti', englishName: 'Dumbbell Shoulder Press', equipment: 'Manubri / Bilanciere', id: 'Dumbbell_Shoulder_Press', isCurated: true },
  { label: 'Alzate Laterali', englishName: 'Side Lateral Raise', equipment: 'Manubri', id: 'Side_Lateral_Raise', isCurated: true },
  { label: 'Pushdown Tricipiti', englishName: 'Triceps Pushdown', equipment: 'Cavo', id: 'Triceps_Pushdown', isCurated: true },
  { label: 'French Press', englishName: 'Lying Triceps Press', equipment: 'Bilanciere EZ', id: 'Lying_Triceps_Press', isCurated: true },
  { label: 'Trazioni / Lat Machine', englishName: 'Wide-Grip Lat Pulldown', equipment: 'Cavo / Sbarra', id: 'Wide-Grip_Lat_Pulldown', isCurated: true },
  { label: 'Rematore con Manubrio', englishName: 'One-Arm Dumbbell Row', equipment: 'Manubrio', id: 'One-Arm_Dumbbell_Row', isCurated: true },
  { label: 'Pulley Basso', englishName: 'Seated Cable Rows', equipment: 'Cavo', id: 'Seated_Cable_Rows', isCurated: true },
  { label: 'Face Pull', englishName: 'Face Pull', equipment: 'Cavo', id: 'Face_Pull', isCurated: true },
  { label: 'Curl Bilanciere', englishName: 'Barbell Curl', equipment: 'Bilanciere', id: 'Barbell_Curl', isCurated: true },
  { label: 'Squat con Bilanciere', englishName: 'Barbell Squat', equipment: 'Bilanciere', id: 'Barbell_Squat', isCurated: true },
  { label: 'Stacco Rumeno (RDL)', englishName: 'Romanian Deadlift', equipment: 'Bilanciere', id: 'Romanian_Deadlift', isCurated: true },
  { label: 'Affondi', englishName: 'Dumbbell Lunges', equipment: 'Manubri', id: 'Dumbbell_Lunges', isCurated: true },
  { label: 'Leg Curl', englishName: 'Seated Leg Curl', equipment: 'Macchina', id: 'Seated_Leg_Curl', isCurated: true },
  { label: 'Leg Extension', englishName: 'Leg Extensions', equipment: 'Macchina', id: 'Leg_Extensions', isCurated: true },
  { label: 'Calf Raises (Polpacci)', englishName: 'Standing Calf Raises', equipment: 'Macchina / Step', id: 'Standing_Calf_Raises', isCurated: true },
  { label: 'Crunch Addome', englishName: 'Crunches', equipment: 'Corpo libero', id: 'Crunches', isCurated: true },
]

const IT_TO_EN_SYNONYMS: Array<[string, string]> = [
  ['panca', 'bench press'],
  ['spinta', 'press'],
  ['trazioni', 'pullup'],
  ['lat', 'lat pulldown'],
  ['rematore', 'row'],
  ['alzate laterali', 'side lateral raise'],
  ['stacco', 'deadlift'],
  ['polpacci', 'calf raise'],
  ['addome', 'crunch'],
  ['tricipiti', 'triceps'],
  ['bicipiti', 'curl'],
  ['spalle', 'shoulder'],
  ['pettorali', 'chest'],
]

export function imageUrlsForId(id: string, images?: string[]): string[] {
  if (images && images.length > 0) {
    return images.map(path => `${FREE_EXERCISE_DB_IMG_BASE}${path}`)
  }
  return [
    `${FREE_EXERCISE_DB_IMG_BASE}${id}/0.jpg`,
    `${FREE_EXERCISE_DB_IMG_BASE}${id}/1.jpg`,
  ]
}

export function findCuratedGuide(exerciseName: string): ExerciseGuideData | null {
  const normalized = exerciseName.trim().toLowerCase()
  const match = CURATED_GUIDES.find(item => item.keywords.some(kw => normalized.includes(kw)))
  if (!match) return null
  return {
    id: match.id,
    displayName: exerciseName,
    englishName: match.englishName,
    equipment: match.equipment,
    primaryMuscles: match.primaryMuscles,
    secondaryMuscles: match.secondaryMuscles,
    images: imageUrlsForId(match.id),
    italianCues: match.italianCues,
    commonMistake: match.commonMistake,
    rawInstructions: [],
  }
}

export function translateQueryForExerciseDb(exerciseName: string): string {
  let text = exerciseName.toLowerCase()
  for (const [it, en] of IT_TO_EN_SYNONYMS) {
    if (text.includes(it)) {
      text = `${text} ${en}`
    }
  }
  return text
}

export function matchExerciseInDb(exerciseName: string, records: FreeExerciseRecord[]): FreeExerciseRecord | null {
  if (records.length === 0) return null
  const query = translateQueryForExerciseDb(exerciseName)
  const tokens = query
    .split(/[^a-z0-9]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3)

  let best: FreeExerciseRecord | null = null
  let bestScore = 0
  for (const rec of records) {
    const hay = rec.name.toLowerCase()
    let score = 0
    for (const token of tokens) {
      if (hay.includes(token)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = rec
    }
  }
  return bestScore > 0 ? best : null
}

export function hasExercisePhotoMatch(
  exerciseName: string,
  dbRecords: FreeExerciseRecord[] = [],
): boolean {
  if (!exerciseName.trim()) return false
  if (findCuratedGuide(exerciseName) !== null) return true
  return matchExerciseInDb(exerciseName, dbRecords) !== null
}

export function searchExerciseSuggestions(
  query: string,
  dbRecords: FreeExerciseRecord[] = [],
  limit = 6,
): ExerciseSuggestion[] {
  const clean = query.trim().toLowerCase()
  const curatedMatches = !clean
    ? CURATED_EXERCISE_OPTIONS.slice(0, limit)
    : CURATED_EXERCISE_OPTIONS.filter(
        item =>
          item.label.toLowerCase().includes(clean) ||
          item.englishName.toLowerCase().includes(clean) ||
          item.equipment.toLowerCase().includes(clean),
      )

  if (curatedMatches.length >= limit || dbRecords.length === 0 || !clean) {
    return curatedMatches.slice(0, limit)
  }

  const expanded = translateQueryForExerciseDb(clean)
  const tokens = expanded
    .split(/[^a-z0-9]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)

  const seenIds = new Set(curatedMatches.map(m => m.id))
  const dbMatches: ExerciseSuggestion[] = []

  for (const rec of dbRecords) {
    if (seenIds.has(rec.id)) continue
    const hay = rec.name.toLowerCase()
    if (tokens.some(token => hay.includes(token))) {
      dbMatches.push({
        label: rec.name,
        englishName: rec.name,
        equipment: rec.equipment ?? 'Palestra',
        id: rec.id,
        isCurated: false,
      })
      seenIds.add(rec.id)
      if (curatedMatches.length + dbMatches.length >= limit) break
    }
  }

  return [...curatedMatches, ...dbMatches].slice(0, limit)
}

export function findSameMuscleAlternatives(
  exerciseName: string,
  dbRecords: FreeExerciseRecord[] = [],
  limit = 6,
): ExerciseSuggestion[] {
  const clean = exerciseName.trim().toLowerCase()
  const guide = findCuratedGuide(exerciseName)
  const targetMuscles = (guide?.primaryMuscles ?? []).map(m => m.toLowerCase())

  const sameMuscleCurated = CURATED_EXERCISE_OPTIONS.filter(opt => {
    if (opt.label.toLowerCase() === clean) return false
    if (targetMuscles.length === 0) return true
    const optGuide = findCuratedGuide(opt.label)
    if (!optGuide) return false
    return optGuide.primaryMuscles.some(m => targetMuscles.includes(m.toLowerCase()))
  })

  if (sameMuscleCurated.length >= limit || dbRecords.length === 0) {
    return (sameMuscleCurated.length > 0 ? sameMuscleCurated : CURATED_EXERCISE_OPTIONS.filter(o => o.label.toLowerCase() !== clean)).slice(0, limit)
  }

  const seen = new Set(sameMuscleCurated.map(i => i.id))
  const extra = dbRecords
    .filter(rec => !seen.has(rec.id) && rec.name.toLowerCase() !== clean)
    .slice(0, limit - sameMuscleCurated.length)
    .map(rec => ({
      label: rec.name,
      englishName: rec.name,
      equipment: rec.equipment ?? 'Palestra',
      id: rec.id,
      isCurated: false,
    }))

  return [...sameMuscleCurated, ...extra].slice(0, limit)
}

let inMemoryCache: FreeExerciseRecord[] | null = null

export async function loadFreeExerciseDb(): Promise<FreeExerciseRecord[]> {
  if (inMemoryCache) return inMemoryCache
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as FreeExerciseRecord[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCache = parsed
        return parsed
      }
    }
  } catch {
    // Ignore cache parse error and refetch
  }

  const response = await fetch(FREE_EXERCISE_DB_JSON)
  if (!response.ok) throw new Error('Impossibile scaricare free-exercise-db')
  const full = (await response.json()) as FreeExerciseRecord[]
  const compact: FreeExerciseRecord[] = full.map(item => ({
    id: item.id,
    name: item.name,
    equipment: item.equipment,
    primaryMuscles: item.primaryMuscles,
    secondaryMuscles: item.secondaryMuscles,
    instructions: item.instructions,
    images: item.images,
  }))
  inMemoryCache = compact
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(compact))
  } catch {
    // localStorage quota full on some browsers; keep in-memory cache
  }
  return compact
}
