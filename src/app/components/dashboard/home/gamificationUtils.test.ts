import { beforeEach, describe, expect, it } from 'vitest'
import {
  activateWeeklyStreakFreeze,
  computeGamificationSummary,
  getLevelTitle,
  readFrozenDateKey,
} from './gamificationUtils'

const memoryStorage = new Map<string, string>()

describe('Dashboard Gamification Helpers', () => {
  beforeEach(() => {
    memoryStorage.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, val: string) => {
          memoryStorage.set(key, val)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })
  })
  it('computes level, XP progress, and completed daily quests from real activity', () => {
    const summary = computeGamificationSummary({
      totalSessions: 5,
      sessionsThisWeek: 2,
      weeklyTarget: 4,
      creatineDoneToday: true,
      waterMlToday: 2500,
      waterGoalMl: 2500,
      focusMinutesToday: 30,
      creatineStreakDays: 4,
    })

    // 5*100 + 4*25 + 30 + 25 = 655 XP -> Lv 3 (500..750), 155/250
    expect(summary.totalXp).toBe(655)
    expect(summary.level).toBe(3)
    expect(summary.levelTitle).toBe('Costante')
    expect(summary.xpIntoLevel).toBe(155)
    expect(summary.todayQuestsDone).toBe(4)
    expect(summary.todayQuestsTotal).toBe(4)
  })

  it('caps level titles cleanly for high levels', () => {
    expect(getLevelTitle(1)).toBe('Principiante')
    expect(getLevelTitle(99)).toBe('Leggenda')
  })

  it('computes unlockable badges and limits streak freeze to once per week', () => {
    const summary = computeGamificationSummary({
      totalSessions: 10,
      sessionsThisWeek: 3,
      weeklyTarget: 4,
      creatineDoneToday: true,
      waterMlToday: 2500,
      waterGoalMl: 2500,
      focusMinutesToday: 55,
      creatineStreakDays: 7,
    })
    expect(summary.badges.every(b => b.unlocked)).toBe(true)

    const now = new Date('2026-11-25T12:00:00Z')
    expect(readFrozenDateKey(now)).toBeNull()
    expect(activateWeeklyStreakFreeze('2026-11-24', now)).toBe(true)
    expect(readFrozenDateKey(now)).toBe('2026-11-24')
    expect(activateWeeklyStreakFreeze('2026-11-23', now)).toBe(false)
  })
})
