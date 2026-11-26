export interface GamificationInput {
  totalSessions: number
  sessionsThisWeek: number
  weeklyTarget: number
  creatineDoneToday: boolean
  waterMlToday: number
  waterGoalMl: number
  focusMinutesToday: number
  creatineStreakDays: number
  habitCheckinsTotal?: number
}

export interface UnlockedBadge {
  id: string
  label: string
  unlocked: boolean
}

export interface GamificationSummary {
  totalXp: number
  level: number
  levelTitle: string
  xpIntoLevel: number
  xpForNextLevel: number
  levelProgressPct: number
  todayQuestsDone: number
  todayQuestsTotal: number
  quests: Array<{
    id: string
    label: string
    xp: number
    done: boolean
  }>
  badges: UnlockedBadge[]
}

const XP_PER_LEVEL = 250
export const STREAK_FREEZE_KEY = 'nutriflow:streak-freeze-v1'

const LEVEL_TITLES = [
  'Principiante',
  'In Movimento',
  'Costante',
  'Atleta',
  'Macchina',
  'Leggenda',
] as const

export function getLevelTitle(level: number): string {
  const index = Math.min(LEVEL_TITLES.length - 1, Math.max(0, level - 1))
  return LEVEL_TITLES[index]
}

export function getIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function readFrozenDateKey(now: Date = new Date()): string | null {
  try {
    const raw = localStorage.getItem(STREAK_FREEZE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { weekKey: string; dateKey: string }
    return parsed.weekKey === getIsoWeekKey(now) ? parsed.dateKey : null
  } catch {
    return null
  }
}

export function activateWeeklyStreakFreeze(yesterdayDateKey: string, now: Date = new Date()): boolean {
  if (readFrozenDateKey(now) !== null) return false
  localStorage.setItem(
    STREAK_FREEZE_KEY,
    JSON.stringify({ weekKey: getIsoWeekKey(now), dateKey: yesterdayDateKey }),
  )
  return true
}

export function computeUnlockedBadges(input: GamificationInput): UnlockedBadge[] {
  const waterDone = input.waterGoalMl > 0 && input.waterMlToday >= input.waterGoalMl
  return [
    { id: 'first-workout', label: 'Primo Workout', unlocked: input.totalSessions >= 1 },
    { id: 'ten-workouts', label: '10 Sessioni', unlocked: input.totalSessions >= 10 },
    { id: 'hydrated', label: 'Idratato 100%', unlocked: waterDone },
    { id: 'streak-7', label: 'Streak 7g', unlocked: input.creatineStreakDays >= 7 },
    { id: 'deep-focus', label: 'Deep Focus 50m', unlocked: input.focusMinutesToday >= 50 },
  ]
}

export function computeGamificationSummary(input: GamificationInput): GamificationSummary {
  const waterDone = input.waterGoalMl > 0 && input.waterMlToday >= input.waterGoalMl
  const workoutDoneThisWeek = input.sessionsThisWeek > 0
  const focusDoneToday = input.focusMinutesToday >= 25

  const quests = [
    { id: 'creatine', label: 'Creatina', xp: 25, done: input.creatineDoneToday },
    { id: 'water', label: 'Acqua', xp: 30, done: waterDone },
    { id: 'focus', label: 'Focus 25m', xp: 25, done: focusDoneToday },
    { id: 'workout', label: 'Workout', xp: 100, done: workoutDoneThisWeek },
  ]

  const baseXp =
    input.totalSessions * 100 +
    input.creatineStreakDays * 25 +
    (input.habitCheckinsTotal ?? 0) * 15 +
    (waterDone ? 30 : 0) +
    (focusDoneToday ? 25 : 0)

  const level = Math.floor(baseXp / XP_PER_LEVEL) + 1
  const xpIntoLevel = baseXp % XP_PER_LEVEL
  const levelProgressPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)

  return {
    totalXp: baseXp,
    level,
    levelTitle: getLevelTitle(level),
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    levelProgressPct,
    todayQuestsDone: quests.filter(q => q.done).length,
    todayQuestsTotal: quests.length,
    quests,
    badges: computeUnlockedBadges(input),
  }
}
