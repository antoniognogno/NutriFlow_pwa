export const FREE_EXERCISE_DB_JSON =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
export const FREE_EXERCISE_DB_IMG_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const CACHE_KEY = 'nutriflow:free-exercise-db-v1'

export type MachineVisualKind =
  | 'barbell_bench'
  | 'dumbbell'
  | 'cable'
  | 'lat_pulldown'
  | 'leg_press'
  | 'leg_machine'
  | 'squat_rack'
  | 'pullup_bar'
  | 'barbell'
  | 'mat'

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
  machineKind: MachineVisualKind
  machineSetup: string
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
  italianLabel: string
  englishName: string
  equipment: string
  machineKind: MachineVisualKind
  machineSetup: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  italianCues: string[]
  commonMistake: string
}

const CURATED_GUIDES: CuratedGuide[] = [
  {
    keywords: ['panca piana bilanciere', 'barbell bench press', 'panca piana', 'bench press', 'panca'],
    id: 'Barbell_Bench_Press_-_Medium_Grip',
    italianLabel: 'Panca Piana Bilanciere',
    englishName: 'Barbell Bench Press - Medium Grip',
    equipment: 'Bilanciere + Panca piana con rack',
    machineKind: 'barbell_bench',
    machineSetup: 'Posiziona gli occhi sotto il bilanciere sui supporti della panca piana, presa leggermente più larga delle spalle e piedi ben piantati a terra.',
    primaryMuscles: ['Petto'],
    secondaryMuscles: ['Spalle anteriori', 'Tricipiti'],
    italianCues: [
      'Retrai e abbassa le scapole appoggiandole saldamente sulla panca.',
      'Stacca il bilanciere portandolo sopra lo sterno e scendi controllato fino a sfiorare la parte bassa del petto.',
      'Spingi verso l’alto mantenendo i gomiti a ~45° rispetto al busto senza staccare i glutei.',
    ],
    commonMistake: 'Aprire i gomiti a 90° o far rimbalzare il bilanciere sul petto staccando i glutei.',
  },
  {
    keywords: ['panca piana manubri', 'dumbbell bench press', 'spinte manubri panca piana'],
    id: 'Dumbbell_Bench_Press',
    italianLabel: 'Panca Piana Manubri',
    englishName: 'Dumbbell Bench Press',
    equipment: 'Manubri + Panca piana',
    machineKind: 'dumbbell',
    machineSetup: 'Regola la panca completamente in orizzontale (0°) e appoggia prima i manubri sulle cosce per portarli al petto in sicurezza.',
    primaryMuscles: ['Petto'],
    secondaryMuscles: ['Spalle anteriori', 'Tricipiti'],
    italianCues: [
      'Mantieni le scapole addotte e i polsi dritti in linea con gli avambracci.',
      'Scendi con i manubri ai lati del petto aprendo bene il torace senza collassare con le spalle.',
      'Spingi verso l’alto seguendo una leggera traiettoria convergente senza far sbattere i manubri.',
    ],
    commonMistake: 'Far toccare i manubri in alto perdendo tensione o scendere troppo veloce.',
  },
  {
    keywords: ['panca inclinata bilanciere', 'barbell incline bench press', 'incline bench press'],
    id: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
    italianLabel: 'Panca Inclinata Bilanciere',
    englishName: 'Barbell Incline Bench Press - Medium Grip',
    equipment: 'Bilanciere + Panca inclinata 30°–45°',
    machineKind: 'barbell_bench',
    machineSetup: 'Imposta lo schienale a 30°–45° (mai troppo verticale) davanti al rack del bilanciere e blocca le scapole.',
    primaryMuscles: ['Petto alto'],
    secondaryMuscles: ['Spalle anteriori', 'Tricipiti'],
    italianCues: [
      'Afferra il bilanciere poco oltre la larghezza delle spalle e stabilizza il core.',
      'Scendi lentamente verso la parte alta dello sterno / sotto le clavicole.',
      'Spingi verso l’alto mantenendo i gomiti sotto la linea del bilanciere.',
    ],
    commonMistake: 'Inclinazione eccessiva della panca (>45°) che sposta il lavoro quasi solo sui deltoidi.',
  },
  {
    keywords: ['panca inclinata manubri', 'spinte manubri su panca inclinata', 'spinte inclinata', 'incline dumbbell press', 'panca inclinata'],
    id: 'Incline_Dumbbell_Press',
    italianLabel: 'Panca Inclinata Manubri',
    englishName: 'Incline Dumbbell Press',
    equipment: 'Manubri + Panca regolabile a 30°–45°',
    machineKind: 'dumbbell',
    machineSetup: 'Regola lo schienale della panca a 30°–45° e alza il sedile di uno scatto per evitare di scivolare in avanti.',
    primaryMuscles: ['Petto alto'],
    secondaryMuscles: ['Spalle anteriori', 'Tricipiti'],
    italianCues: [
      'Scapole addotte e petto alto aperto verso il soffitto.',
      'Scendi con i manubri ai lati del petto alto tenendo gli avambracci verticali.',
      'Spingi in alto controllando la chiusura sopra la linea clavicolare.',
    ],
    commonMistake: 'Alzare i gomiti all’altezza delle spalle o inarcare troppo la zona lombare.',
  },
  {
    keywords: ['chest press', 'machine bench press', 'macchina petto'],
    id: 'Machine_Bench_Press',
    italianLabel: 'Chest Press Macchina',
    englishName: 'Machine Bench Press',
    equipment: 'Macchina Chest Press',
    machineKind: 'barbell_bench',
    machineSetup: 'Regola il sedile in modo che le maniglie siano all’altezza del centro del petto, con scapole appoggiate allo schienale.',
    primaryMuscles: ['Petto'],
    secondaryMuscles: ['Tricipiti', 'Spalle anteriori'],
    italianCues: [
      'Afferra le maniglie neutre o prone tenendo i gomiti leggermente sotto le spalle.',
      'Estendi avanti senza staccare le scapole dallo schienale.',
      'Ritorna lentamente mantenendo tensione fino a fine corsa senza far battere i pacchi pesi.',
    ],
    commonMistake: 'Tenere il sedile troppo basso facendo lavorare soprattutto le spalle anteriori.',
  },
  {
    keywords: ['croci ai cavi', 'cable crossover', 'croci cavi'],
    id: 'Cable_Crossover',
    italianLabel: 'Croci ai Cavi',
    englishName: 'Cable Crossover',
    equipment: 'Cavi doppi (Poliercolina / Cable Crossover)',
    machineKind: 'cable',
    machineSetup: 'Imposta entrambe le carrucole all’altezza delle spalle (o in alto per petto basso), impugna le maniglie e fai mezzo passo avanti.',
    primaryMuscles: ['Petto'],
    secondaryMuscles: ['Spalle anteriori'],
    italianCues: [
      'Inclina leggermente il busto in avanti con un piede davanti all’altro per stabilità.',
      'Chiudi le braccia ad arco davanti al petto mantenendo i gomiti leggermente flessi.',
      'Apri controllando lo stiramento pettorale fino alla linea del busto.',
    ],
    commonMistake: 'Trasformare le croci in spinte piegando ed estendendo i gomiti.',
  },
  {
    keywords: ['pec deck', 'butterfly', 'pectoral machine'],
    id: 'Butterfly',
    italianLabel: 'Pec Deck / Butterfly',
    englishName: 'Butterfly',
    equipment: 'Macchina Pec Deck / Butterfly',
    machineKind: 'cable',
    machineSetup: 'Regola il sedile così che gli avambracci/maniglie restino all’altezza del petto centrale, schiena ben aderente allo schienale.',
    primaryMuscles: ['Petto'],
    secondaryMuscles: ['Spalle anteriori'],
    italianCues: [
      'Mantieni le spalle basse e lontane dalle orecchie.',
      'Avvicina i cuscinetti o le maniglie davanti al petto contraendo 1 secondo.',
      'Controlla l’apertura senza far sbilanciare le spalle in avanti.',
    ],
    commonMistake: 'Incurvare le spalle in chiusura riducendo l’attivazione pettorale.',
  },
  {
    keywords: ['croci con manubri', 'croci manubri', 'dumbbell flyes', 'chest fly', 'croci'],
    id: 'Dumbbell_Flyes',
    italianLabel: 'Croci con Manubri',
    englishName: 'Dumbbell Flyes',
    equipment: 'Manubri + Panca piana',
    machineKind: 'dumbbell',
    machineSetup: 'Panca orizzontale (0°), impugna due manubri leggeri/medi con i palmi rivolti l’uno verso l’altro.',
    primaryMuscles: ['Petto'],
    secondaryMuscles: ['Spalle anteriori'],
    italianCues: [
      'Tieni i gomiti leggermente flessi e bloccati per tutta la serie.',
      'Apri lateralmente ad arco fino a sentire allungamento sul petto (linea delle spalle).',
      'Richiudi pensando di stringere i bicipiti verso lo sterno.',
    ],
    commonMistake: 'Scendere troppo sotto la linea della panca stressando la capsula della spalla.',
  },
  {
    keywords: ['military press', 'standing military press', 'lento avanti bilanciere', 'barbell shoulder press'],
    id: 'Standing_Military_Press',
    italianLabel: 'Military Press Bilanciere',
    englishName: 'Standing Military Press',
    equipment: 'Bilanciere + Rack',
    machineKind: 'squat_rack',
    machineSetup: 'Posiziona i fermi del rack all’altezza della parte alta del petto, impugna il bilanciere poco oltre la larghezza delle spalle.',
    primaryMuscles: ['Spalle'],
    secondaryMuscles: ['Tricipiti', 'Core'],
    italianCues: [
      'Contrai glutei e addome per bloccare la schiena in posizione neutra.',
      'Spingi il bilanciere verticalmente sopra la testa facendo passare appena il viso.',
      'Controlla la discesa fino alle clavicole tenendo i gomiti leggermente avanti.',
    ],
    commonMistake: 'Inarcare la bassa schiena trasformando l’alzata in una spinta inclinata.',
  },
  {
    keywords: ['lento avanti manubri', 'lento avanti', 'dumbbell shoulder press', 'shoulder press manubri'],
    id: 'Dumbbell_Shoulder_Press',
    italianLabel: 'Lento Avanti Manubri',
    englishName: 'Dumbbell Shoulder Press',
    equipment: 'Manubri + Panca quasi verticale (75°–85°)',
    machineKind: 'dumbbell',
    machineSetup: 'Regola lo schienale della panca quasi verticale (75°–85°), mai 90° rigidi se ti irrigidisce i lombari.',
    primaryMuscles: ['Spalle'],
    secondaryMuscles: ['Tricipiti', 'Core'],
    italianCues: [
      'Parti con i manubri all’altezza delle orecchie e gomiti leggermente avanti (piano scapolare ~30°).',
      'Spingi in alto senza estendere bruscamente i gomiti né staccare la schiena dallo schienale.',
      'Scendi lentamente controllando tutto il ROM.',
    ],
    commonMistake: 'Aprire i gomiti esattamente in linea laterale a 180° creando fastidio alle spalle.',
  },
  {
    keywords: ['shoulder press macchina', 'leverage shoulder press', 'shoulder press'],
    id: 'Leverage_Shoulder_Press',
    italianLabel: 'Shoulder Press Macchina',
    englishName: 'Leverage Shoulder Press',
    equipment: 'Macchina Shoulder Press guidata / a leve',
    machineKind: 'barbell_bench',
    machineSetup: 'Regola il sedile affinché le maniglie siano all’altezza delle spalle/mento all’inizio del movimento.',
    primaryMuscles: ['Spalle'],
    secondaryMuscles: ['Tricipiti'],
    italianCues: [
      'Appoggia bene testa e schiena allo schienale.',
      'Spingi fino a quasi completa estensione mantenendo spalle basse.',
      'Controlla la discesa senza far urtare il pacco pesi.',
    ],
    commonMistake: 'Staccare i glutei o iperestendere il collo durante lo sforzo.',
  },
  {
    keywords: ['alzate laterali', 'side lateral raise', 'lateral raise'],
    id: 'Side_Lateral_Raise',
    italianLabel: 'Alzate Laterali',
    englishName: 'Side Lateral Raise',
    equipment: 'Manubri',
    machineKind: 'dumbbell',
    machineSetup: 'In piedi (o seduto su panca), impugna due manubri ai fianchi con leggera inclinazione del busto avanti (10°).',
    primaryMuscles: ['Deltoide laterale'],
    secondaryMuscles: ['Trapezio'],
    italianCues: [
      'Solleva guidando il movimento con i gomiti (non con le mani) verso l’esterno e leggermente avanti.',
      'Fermati quando le braccia raggiungono l’altezza delle spalle.',
      'Scendi lentamente frenando il carico senza slanci.',
    ],
    commonMistake: 'Usare troppo peso oscillando con la schiena o alzando i trapezi verso le orecchie.',
  },
  {
    keywords: ['pushdown corda', 'triceps pushdown rope', 'pushdown tricipiti corda'],
    id: 'Triceps_Pushdown_-_Rope_Attachment',
    italianLabel: 'Pushdown Tricipiti Corda',
    englishName: 'Triceps Pushdown - Rope Attachment',
    equipment: 'Cavo alto con attacco Corda',
    machineKind: 'cable',
    machineSetup: 'Aggancia la corda alla carrucola alta, afferrala a presa neutra e blocca i gomiti ai fianchi inclinando appena il busto.',
    primaryMuscles: ['Tricipiti'],
    secondaryMuscles: [],
    italianCues: [
      'Estendi gli avambracci verso il basso aprendo leggermente le estremità della corda in fondo.',
      'Fai un breve fermo in contrazione mantenendo i gomiti immobili.',
      'Risali controllato superando di poco i 90° al gomito.',
    ],
    commonMistake: 'Portare i gomiti avanti/indietro o usare le spalle per chiudere la ripetizione.',
  },
  {
    keywords: ['pushdown', 'triceps pushdown', 'pushdown tricipiti'],
    id: 'Triceps_Pushdown',
    italianLabel: 'Pushdown Tricipiti Cavo',
    englishName: 'Triceps Pushdown',
    equipment: 'Cavo alto con sbarra dritta o angolata',
    machineKind: 'cable',
    machineSetup: 'Aggancia la sbarra corta al cavo alto, presa prona alla larghezza delle spalle, gomiti bloccati lungo i fianchi.',
    primaryMuscles: ['Tricipiti'],
    secondaryMuscles: [],
    italianCues: [
      'Spingi la barra verso il basso estendendo completamente il gomito.',
      'Tieni le spalle basse e stabili senza curvare il dorso.',
      'Risali lentamente mantenendo tensione sul tricipite.',
    ],
    commonMistake: 'Alzare i gomiti a ogni ripetizione trasformandolo in un pullover.',
  },
  {
    keywords: ['french press', 'lying triceps press', 'skullcrusher'],
    id: 'Lying_Triceps_Press',
    italianLabel: 'French Press Bilanciere EZ',
    englishName: 'Lying Triceps Press',
    equipment: 'Bilanciere EZ (o Manubri) + Panca piana',
    machineKind: 'barbell',
    machineSetup: 'Sdraiati su panca piana, impugna il bilanciere EZ nella curvatura interna con braccia inclinate di ~15° indietro.',
    primaryMuscles: ['Tricipiti'],
    secondaryMuscles: [],
    italianCues: [
      'Mantieni fermi i gomiti e gli omeri leggermente arretrati.',
      'Fletti i gomiti scendendo verso la fronte o appena dietro la nuca.',
      'Estendi i tricipiti riportando il bilanciere in linea sopra gli occhi.',
    ],
    commonMistake: 'Allargare eccessivamente i gomiti verso l’esterno.',
  },
  {
    keywords: ['dips', 'dip alle parallele', 'parallel bar dip', 'parallele'],
    id: 'Parallel_Bar_Dip',
    italianLabel: 'Dips alle Parallele',
    englishName: 'Parallel Bar Dip',
    equipment: 'Stazione Parallele (Dip Station)',
    machineKind: 'pullup_bar',
    machineSetup: 'Sali sulle parallele a braccia tese, spingi le spalle verso il basso e incrocia leggermente le caviglie dietro.',
    primaryMuscles: ['Petto basso', 'Tricipiti'],
    secondaryMuscles: ['Spalle anteriori'],
    italianCues: [
      'Scendi controllando fino a portare la spalla appena sotto il livello del gomito (o ~90°).',
      'Tieni il busto leggermente inclinato avanti per il petto, oppure più verticale per i tricipiti.',
      'Spingi con decisione mantenendo le spalle depresse.',
    ],
    commonMistake: 'Chiudere le spalle verso le orecchie in fondo alla discesa.',
  },
  {
    keywords: ['trazioni', 'pullups', 'pull-up', 'pullup', 'chin-up'],
    id: 'Pullups',
    italianLabel: 'Trazioni alla Sbarra',
    englishName: 'Pullups',
    equipment: 'Sbarra per trazioni (Pull-up Bar)',
    machineKind: 'pullup_bar',
    machineSetup: 'Afferra la sbarra con presa prona leggermente più larga delle spalle e parti da braccia tese con scapole attive.',
    primaryMuscles: ['Dorsali'],
    secondaryMuscles: ['Bicipiti', 'Core'],
    italianCues: [
      'Avvia il movimento deprimendo le scapole prima di piegare le braccia.',
      'Porta il petto verso la sbarra guidando i gomiti verso i fianchi.',
      'Scendi lentamente controllando fino a completa distensione.',
    ],
    commonMistake: 'Fare mezze ripetizioni o dondolare con le gambe per darsi slancio.',
  },
  {
    keywords: ['lat machine', 'wide-grip lat pulldown', 'lat pulldown', 'pulldown'],
    id: 'Wide-Grip_Lat_Pulldown',
    italianLabel: 'Lat Machine Avanti',
    englishName: 'Wide-Grip Lat Pulldown',
    equipment: 'Macchina Lat Machine (Cavo alto + barra larga)',
    machineKind: 'lat_pulldown',
    machineSetup: 'Regola i cuscinetti ferma-cosce così da bloccare bene le gambe, afferra la barra larga a presa prona.',
    primaryMuscles: ['Dorsali'],
    secondaryMuscles: ['Bicipiti', 'Romboidi'],
    italianCues: [
      'Abbassa le scapole e inclina appena indietro il busto (~10°–15°).',
      'Tira la sbarra fino alla parte alta del petto portando i gomiti verso il basso.',
      'Controlla la risalita allungando bene i dorsali senza sollevare i glutei.',
    ],
    commonMistake: 'Tirare la barra dietro il collo o dondolare indietro con la schiena.',
  },
  {
    keywords: ['rematore bilanciere', 'rematore con bilanciere', 'bent over barbell row', 'barbell row'],
    id: 'Bent_Over_Barbell_Row',
    italianLabel: 'Rematore con Bilanciere',
    englishName: 'Bent Over Barbell Row',
    equipment: 'Bilanciere',
    machineKind: 'barbell',
    machineSetup: 'Impugna il bilanciere alla larghezza delle spalle, ginocchia leggermente piegate e busto inclinato avanti a ~45° con schiena piatta.',
    primaryMuscles: ['Dorsali', 'Centro schiena'],
    secondaryMuscles: ['Bicipiti', 'Lombari'],
    italianCues: [
      'Tira il bilanciere verso l’ombelico / parte bassa dello sterno stringendo le scapole.',
      'Mantieni ferma l’inclinazione del busto per tutta la serie.',
      'Controlla la discesa senza arrotondare i lombari.',
    ],
    commonMistake: 'Alzare il busto a ogni ripetizione usando la schiena come leva.',
  },
  {
    keywords: ['rematore con manubrio', 'rematore manubrio', 'one-arm dumbbell row', 'rematore'],
    id: 'One-Arm_Dumbbell_Row',
    italianLabel: 'Rematore con Manubrio',
    englishName: 'One-Arm Dumbbell Row',
    equipment: 'Manubrio + Panca di appoggio',
    machineKind: 'dumbbell',
    machineSetup: 'Appoggia un ginocchio e la mano dello stesso lato sulla panca piana mantenendo la schiena parallela al pavimento.',
    primaryMuscles: ['Dorsali', 'Centro schiena'],
    secondaryMuscles: ['Bicipiti', 'Spalle posteriori'],
    italianCues: [
      'Lascia allungare la spalla in basso senza ruotare il tronco.',
      'Tira il manubrio ad arco verso l’anca (non verso il petto).',
      'Fai mezzo secondo di fermo in alto chiudendo la scapola.',
    ],
    commonMistake: 'Ruotare il torso per compensare un manubrio troppo pesante.',
  },
  {
    keywords: ['pulley', 'seated cable rows', 'seated cable row', 'pulley basso'],
    id: 'Seated_Cable_Rows',
    italianLabel: 'Pulley Basso',
    englishName: 'Seated Cable Rows',
    equipment: 'Macchina Pulley Basso con triangolo / maniglia V',
    machineKind: 'cable',
    machineSetup: 'Siediti sulla panca con i piedi sulle pedane e ginocchia leggermente sbloccate, schiena dritta e petto aperto.',
    primaryMuscles: ['Dorsali', 'Centro schiena'],
    secondaryMuscles: ['Bicipiti'],
    italianCues: [
      'Porta la maniglia verso l’addome tenendo i gomiti vicini al busto.',
      'Stringi le scapole dietro per un istante senza alzare le spalle.',
      'Controlla l’allungamento in avanti senza flettere la bassa schiena.',
    ],
    commonMistake: 'Dondolare avanti e indietro con la zona lombare.',
  },
  {
    keywords: ['face pull'],
    id: 'Face_Pull',
    italianLabel: 'Face Pull',
    englishName: 'Face Pull',
    equipment: 'Cavo alto / medio con attacco Corda',
    machineKind: 'cable',
    machineSetup: 'Posiziona la carrucola all’altezza del viso/fronte, impugna la corda con i pollici rivolti verso di te.',
    primaryMuscles: ['Deltoidi posteriori'],
    secondaryMuscles: ['Trapezio medio', 'Cuffia dei rotatori'],
    italianCues: [
      'Tira la corda verso la fronte separando le mani e aprendo i gomiti.',
      'Ruota esternamente gli avambracci a fine movimento (posizione doppio bicipite).',
      'Ritorna lentamente mantenendo le scapole stabili.',
    ],
    commonMistake: 'Tirare verso il mento con i gomiti bassi o usare troppo peso.',
  },
  {
    keywords: ['hammer curl', 'hammer curls', 'curl a martello'],
    id: 'Hammer_Curls',
    italianLabel: 'Hammer Curl',
    englishName: 'Hammer Curls',
    equipment: 'Manubri',
    machineKind: 'dumbbell',
    machineSetup: 'In piedi o seduto, impugna i manubri con presa neutra (palmi rivolti verso i fianchi).',
    primaryMuscles: ['Brachiale', 'Bicipiti'],
    secondaryMuscles: ['Avambracci'],
    italianCues: [
      'Blocca i gomiti lungo i fianchi.',
      'Solleva i manubri mantenendo i pollici verso l’alto fino alla massima contrazione.',
      'Scendi lentamente estendendo quasi completamente il gomito.',
    ],
    commonMistake: 'Oscillare con le spalle o ruotare il polso durante la salita.',
  },
  {
    keywords: ['curl manubri', 'curl con manubri', 'dumbbell bicep curl'],
    id: 'Dumbbell_Bicep_Curl',
    italianLabel: 'Curl Manubri',
    englishName: 'Dumbbell Bicep Curl',
    equipment: 'Manubri',
    machineKind: 'dumbbell',
    machineSetup: 'In piedi, impugna i manubri con braccia lungo i fianchi e spalle rilassate.',
    primaryMuscles: ['Bicipiti'],
    secondaryMuscles: ['Avambracci'],
    italianCues: [
      'Tieni i gomiti fermi accanto al busto mentre ruoti l’avambraccio in supinazione.',
      'Contrai bene in alto senza avanzare eccessivamente con il gomito.',
      'Controlla la discesa in 2 secondi.',
    ],
    commonMistake: 'Usare slancio dei fianchi o portare i gomiti molto davanti al corpo.',
  },
  {
    keywords: ['leg curl', 'seated leg curl'],
    id: 'Seated_Leg_Curl',
    italianLabel: 'Leg Curl Seduto',
    englishName: 'Seated Leg Curl',
    equipment: 'Macchina Leg Curl seduto',
    machineKind: 'leg_machine',
    machineSetup: 'Allinea il ginocchio esattamente con il perno rosso/centrale della macchina, blocca il cuscinetto sopra le cosce e posiziona il rullo dietro le caviglie.',
    primaryMuscles: ['Femorali'],
    secondaryMuscles: ['Polpacci'],
    italianCues: [
      'Appoggia bene la schiena e tira verso il basso flettendo le ginocchia con controllo.',
      'Tieni una breve pausa in massima flessione.',
      'Ritorna lentamente per 2–3 secondi senza perdere controllo.',
    ],
    commonMistake: 'Staccare il bacino dal sedile o avere il rullo troppo in alto sui polpacci.',
  },
  {
    keywords: ['curl bilanciere', 'curl con bilanciere', 'barbell curl', 'curl'],
    id: 'Barbell_Curl',
    italianLabel: 'Curl Bilanciere',
    englishName: 'Barbell Curl',
    equipment: 'Bilanciere dritto o EZ',
    machineKind: 'barbell',
    machineSetup: 'In piedi, afferra il bilanciere in supinazione alla larghezza delle spalle e stabilizza l’addome.',
    primaryMuscles: ['Bicipiti'],
    secondaryMuscles: ['Avambracci'],
    italianCues: [
      'Tieni i gomiti fermi vicino ai fianchi.',
      'Fletti l’avambraccio fino alla massima contrazione senza alzare le spalle.',
      'Scendi lentamente estendendo quasi tutto il braccio.',
    ],
    commonMistake: 'Dondolare con la schiena o portare i gomiti troppo avanti.',
  },
  {
    keywords: ['leg press', 'pressa', 'narrow stance leg press'],
    id: 'Leg_Press',
    italianLabel: 'Leg Press 45°',
    englishName: 'Leg Press',
    equipment: 'Macchina Leg Press 45°',
    machineKind: 'leg_press',
    machineSetup: 'Appoggia schiena e bacino ben aderenti al sedile, posiziona i piedi sulla pedana alla larghezza delle spalle e sblocca i fermi laterali.',
    primaryMuscles: ['Quadricipiti', 'Glutei'],
    secondaryMuscles: ['Femorali'],
    italianCues: [
      'Scendi controllando fino a portare le ginocchia verso il petto senza mai alzare il sacro dal sedile.',
      'Spingi con tutta la pianta del piede (peso su tallone e mesopiede).',
      'Fermati un attimo prima di iperestendere/bloccare completamente le ginocchia in alto.',
    ],
    commonMistake: 'Arrotondare e sollevare il sedere dallo schienale in fondo alla discesa.',
  },
  {
    keywords: ['squat con bilanciere', 'barbell squat', 'squat'],
    id: 'Barbell_Squat',
    italianLabel: 'Squat con Bilanciere',
    englishName: 'Barbell Squat',
    equipment: 'Bilanciere + Squat Rack / Power Rack',
    machineKind: 'squat_rack',
    machineSetup: 'Posiziona il bilanciere sui fermi del rack all’altezza del petto alto e regola le barre di sicurezza all’altezza del punto più basso dello squat.',
    primaryMuscles: ['Quadricipiti', 'Glutei'],
    secondaryMuscles: ['Femorali', 'Core'],
    italianCues: [
      'Prendi aria di pancia, compatta il core e scendi spingendo indietro le anche e avanti le ginocchia.',
      'Mantieni le ginocchia allineate alle punte dei piedi e la pianta intera a terra.',
      'Spingi forte con i piedi risalendo con petto aperto.',
    ],
    commonMistake: 'Alzare i talloni o far cedere le ginocchia verso l’interno (valgismo) in risalita.',
  },
  {
    keywords: ['stacco rumeno', 'romanian deadlift', 'rdl'],
    id: 'Romanian_Deadlift',
    italianLabel: 'Stacco Rumeno (RDL)',
    englishName: 'Romanian Deadlift',
    equipment: 'Bilanciere (o Manubri)',
    machineKind: 'barbell',
    machineSetup: 'Parti in piedi tenendo il bilanciere all’altezza delle cosce con presa prona alla larghezza delle spalle.',
    primaryMuscles: ['Femorali', 'Glutei'],
    secondaryMuscles: ['Lombari'],
    italianCues: [
      'Ginocchia leggermente flesse e fisse, schiena sempre neutra.',
      'Spingi il bacino indietro facendo scorrere il bilanciere aderente alle cosce/tibie.',
      'Inverti il movimento appena senti forte tensione sui femorali (circa sotto le ginocchia).',
    ],
    commonMistake: 'Arrotondare i lombari per cercare di toccare il pavimento.',
  },
  {
    keywords: ['stacco da terra', 'barbell deadlift', 'deadlift', 'stacco'],
    id: 'Barbell_Deadlift',
    italianLabel: 'Stacco da Terra (Deadlift)',
    englishName: 'Barbell Deadlift',
    equipment: 'Bilanciere + Dischi da 20 kg (altezza regolare)',
    machineKind: 'barbell',
    machineSetup: 'Bilanciere a terra sopra il centro del piede (circa 2–3 cm dalle tibie), presa esterna alle gambe, petto aperto.',
    primaryMuscles: ['Femorali', 'Glutei', 'Lombari'],
    secondaryMuscles: ['Quadricipiti', 'Trapezio', 'Avambracci'],
    italianCues: [
      'Metti in tensione il bilanciere (“togli il gioco”), compatta l’addome e abbassa le scapole.',
      'Spingi il pavimento via con i piedi mantenendo il bilanciere incollato alle gambe.',
      'Chiudi estendendo completamente le anche senza iperestendere indietro la schiena.',
    ],
    commonMistake: 'Strappare da terra con la schiena curva invece di spingere prima con le gambe.',
  },
  {
    keywords: ['affondi', 'dumbbell lunges', 'lunge', 'bulgarian'],
    id: 'Dumbbell_Lunges',
    italianLabel: 'Affondi Manubri',
    englishName: 'Dumbbell Lunges',
    equipment: 'Manubri + Spazio libero',
    machineKind: 'dumbbell',
    machineSetup: 'Impugna due manubri ai fianchi tenendo i piedi larghi quanto le anche per garantire equilibrio.',
    primaryMuscles: ['Quadricipiti', 'Glutei'],
    secondaryMuscles: ['Femorali', 'Core'],
    italianCues: [
      'Fai un passo ampio avanti scendendo con il ginocchio posteriore a sfiorare terra.',
      'Tieni il busto eretto e il ginocchio davanti in linea con il piede.',
      'Spingi forte dal tallone/centro del piede anteriore per risalire.',
    ],
    commonMistake: 'Mettere i piedi in fila come su una corda perdendo stabilità laterale.',
  },
  {
    keywords: ['leg extension', 'leg extensions', 'estensioni gambe'],
    id: 'Leg_Extensions',
    italianLabel: 'Leg Extension',
    englishName: 'Leg Extensions',
    equipment: 'Macchina Leg Extension',
    machineKind: 'leg_machine',
    machineSetup: 'Regola lo schienale per allineare le ginocchia con il perno della macchina e posiziona il rullo davanti sopra le caviglie.',
    primaryMuscles: ['Quadricipiti'],
    secondaryMuscles: [],
    italianCues: [
      'Afferra le maniglie laterali per fissare il bacino al sedile.',
      'Estendi completamente le gambe facendo 1 secondo di pausa in alto.',
      'Scendi lentamente mantenendo controllo.',
    ],
    commonMistake: 'Dare slanci violenti alzando il bacino dal sedile.',
  },
  {
    keywords: ['calf', 'standing calf raises', 'polpacci'],
    id: 'Standing_Calf_Raises',
    italianLabel: 'Calf Raises (Polpacci)',
    englishName: 'Standing Calf Raises',
    equipment: 'Macchina Standing Calf / Rialzo o Step',
    machineKind: 'leg_machine',
    machineSetup: 'Posiziona solo gli avampiedi sul rialzo/pedana e regola i cuscinetti sulle spalle tenendo le ginocchia quasi tese.',
    primaryMuscles: ['Polpacci'],
    secondaryMuscles: [],
    italianCues: [
      'Scendi fino al massimo allungamento e fai 1 secondo di pausa in basso.',
      'Sali completamente sulla punta dell’alluce contraendo per 1 secondo in alto.',
    ],
    commonMistake: 'Rimbalzare velocemente sfruttando l’elasticità del tendine d’Achille.',
  },
  {
    keywords: ['plank'],
    id: 'Plank',
    italianLabel: 'Plank',
    englishName: 'Plank',
    equipment: 'Tappetino (Corpo libero)',
    machineKind: 'mat',
    machineSetup: 'Appoggia gli avambracci a terra con i gomiti esattamente sotto le spalle e i piedi uniti o larghi quanto il bacino.',
    primaryMuscles: ['Addominali', 'Core'],
    secondaryMuscles: ['Spalle', 'Glutei'],
    italianCues: [
      'Contrai addome e glutei mantenendo una linea retta da testa a talloni.',
      'Spingi leggermente i gomiti verso il pavimento tenendo le scapole stabili.',
      'Respira in modo controllato senza lasciar cadere il bacino.',
    ],
    commonMistake: 'Inarcare la bassa schiena facendo scendere i fianchi verso il tappetino.',
  },
  {
    keywords: ['crunch', 'crunches', 'addome', 'abs'],
    id: 'Crunches',
    italianLabel: 'Crunch Addome',
    englishName: 'Crunches',
    equipment: 'Tappetino (Corpo libero)',
    machineKind: 'mat',
    machineSetup: 'Sdraiati supino sul tappetino con ginocchia piegate, piedi a terra e mani dietro la nuca o incrociate sul petto.',
    primaryMuscles: ['Addominali'],
    secondaryMuscles: [],
    italianCues: [
      'Arrotola la colonna sollevando solo le scapole da terra e buttando fuori l’aria.',
      'Scendi lentamente mantenendo tensione costante sull’addome.',
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

export const CURATED_EXERCISE_OPTIONS: ExerciseSuggestion[] = CURATED_GUIDES.map(item => ({
  label: item.italianLabel,
  englishName: item.englishName,
  equipment: item.equipment,
  id: item.id,
  isCurated: true,
}))

export const GEMINI_DB_EXERCISE_NAMES: string[] = CURATED_GUIDES.map(
  item => `${item.italianLabel} (${item.englishName})`,
)

const IT_TO_EN_SYNONYMS: Array<[string, string]> = [
  ['panca inclinata', 'incline bench press'],
  ['panca piana', 'bench press'],
  ['panca', 'bench press'],
  ['spinta', 'press'],
  ['trazioni', 'pullups'],
  ['lat machine', 'wide-grip lat pulldown'],
  ['lat', 'lat pulldown'],
  ['rematore', 'row'],
  ['alzate laterali', 'side lateral raise'],
  ['stacco rumeno', 'romanian deadlift'],
  ['stacco', 'deadlift'],
  ['polpacci', 'standing calf raises'],
  ['addome', 'crunches'],
  ['plank', 'plank'],
  ['tricipiti', 'triceps pushdown'],
  ['bicipiti', 'curl'],
  ['spalle', 'shoulder press'],
  ['pettorali', 'bench press'],
]

export function inferMachineKind(equipment?: string | null, exerciseName = ''): MachineVisualKind {
  const hay = `${equipment ?? ''} ${exerciseName}`.toLowerCase()
  if (hay.includes('leg press') || hay.includes('pressa')) return 'leg_press'
  if (hay.includes('lat machine') || hay.includes('pulldown')) return 'lat_pulldown'
  if (hay.includes('leg curl') || hay.includes('leg extension') || hay.includes('calf')) return 'leg_machine'
  if (hay.includes('cable') || hay.includes('cavo') || hay.includes('cavi') || hay.includes('pulley')) return 'cable'
  if (hay.includes('pullup') || hay.includes('trazioni') || hay.includes('parallele') || hay.includes('dip')) return 'pullup_bar'
  if (hay.includes('rack') || hay.includes('squat') || hay.includes('military')) return 'squat_rack'
  if (hay.includes('dumbbell') || hay.includes('manubr')) return 'dumbbell'
  if (hay.includes('panca') || hay.includes('bench') || hay.includes('chest press') || hay.includes('machine')) return 'barbell_bench'
  if (hay.includes('barbell') || hay.includes('bilanciere') || hay.includes('e-z')) return 'barbell'
  return 'mat'
}

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
  if (!normalized) return null

  let bestMatch: CuratedGuide | null = null
  let bestScore = 0

  for (const item of CURATED_GUIDES) {
    for (const kw of item.keywords) {
      if (normalized.includes(kw)) {
        // Preferisci sempre il match più specifico (keyword più lunga)
        const score = kw.length + (normalized === kw ? 100 : 0)
        if (score > bestScore) {
          bestScore = score
          bestMatch = item
        }
      }
    }
    if (normalized === item.italianLabel.toLowerCase() || normalized === item.englishName.toLowerCase()) {
      bestMatch = item
      break
    }
  }

  if (!bestMatch) return null
  return {
    id: bestMatch.id,
    displayName: exerciseName,
    englishName: bestMatch.englishName,
    equipment: bestMatch.equipment,
    machineKind: bestMatch.machineKind,
    machineSetup: bestMatch.machineSetup,
    primaryMuscles: bestMatch.primaryMuscles,
    secondaryMuscles: bestMatch.secondaryMuscles,
    images: imageUrlsForId(bestMatch.id),
    italianCues: bestMatch.italianCues,
    commonMistake: bestMatch.commonMistake,
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
  const cleanLower = exerciseName.trim().toLowerCase()

  // Prima controlla match esatto sul nome o contenuto tra parentesi
  const parenMatch = cleanLower.match(/\(([^)]+)\)/)
  const cleanTarget = parenMatch ? parenMatch[1].trim() : cleanLower
  const exact = records.find(
    rec => rec.name.toLowerCase() === cleanTarget || rec.name.toLowerCase() === cleanLower,
  )
  if (exact) return exact

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
      if (hay.includes(token)) score += token.length >= 5 ? 2 : 1
    }
    if (hay === cleanLower) score += 100
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
    return (
      sameMuscleCurated.length > 0
        ? sameMuscleCurated
        : CURATED_EXERCISE_OPTIONS.filter(o => o.label.toLowerCase() !== clean)
    ).slice(0, limit)
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
