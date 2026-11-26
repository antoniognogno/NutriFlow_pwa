import { beforeEach, describe, expect, it } from 'vitest'
import {
  addCustomHabit,
  buildHabitHeatmapDays,
  buildHistoricalPeriods,
  buildPeriodReport,
  clampPastOrTodayDateKey,
  computeHabitStreak,
  countActiveCompletedForDate,
  DEFAULT_HABITS,
  getRelativeDateKey,
  readHabitLogs,
  readHabits,
  syncCreatineHabit,
  toggleHabitForDate,
  updateHabitLabel,
} from './habitStore'
import { computeBmi, readBodyProfile, saveBodyProfile } from './profileGoalsStore'
import {
  buildWeightChartSeries,
  computeWeeklyWeightStats,
  readWeightLogs,
  roundWeight,
  upsertWeightEntry,
} from './weightStore'

const memoryStorage = new Map<string, string>()

describe('Habit Tracker, Body Weight Tracker & Profile Goals', () => {
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

  it('builds calendar Mon-Sun weeks, full Months, Year charts & navigable history', () => {
    const habits = readHabits()
    expect(habits).toHaveLength(DEFAULT_HABITS.length)

    const updatedHabits = addCustomHabit('10.000 Passi')
    expect(updatedHabits).toHaveLength(DEFAULT_HABITS.length + 1)
    const renamed = updateHabitLabel(updatedHabits[updatedHabits.length - 1].id, '12.000 Passi')
    expect(renamed[renamed.length - 1].label).toBe('12.000 Passi')

    toggleHabitForDate('creatine', '2026-11-26')
    toggleHabitForDate('sleep', '2026-11-26')
    toggleHabitForDate('creatine', '2026-11-25')
    toggleHabitForDate('creatine', '2026-10-12')

    const logs = readHabitLogs()
    expect(logs['2026-11-26']).toEqual(['creatine', 'sleep'])

    syncCreatineHabit(false, '2026-11-26')
    expect(readHabitLogs()['2026-11-26']).toEqual(['sleep'])
    syncCreatineHabit(true, '2026-11-26')
    expect(readHabitLogs()['2026-11-26']).toContain('creatine')
    toggleHabitForDate('creatine', '2026-11-26') // clean restore state before assertions
    toggleHabitForDate('creatine', '2026-11-26')

    const today = new Date('2026-11-26T10:00:00')
    expect(computeHabitStreak(logs, today)).toBe(2)

    const cells = buildHabitHeatmapDays(logs, 6, 28, today)
    expect(cells).toHaveLength(28)
    expect(cells[cells.length - 1].completedCount).toBe(2)
    expect(cells[cells.length - 1].level).toBe(1)

    // Current Mon-Sun week (23..29 Nov 2026)
    const weekReport = buildPeriodReport(logs, updatedHabits, 'week', today, 0)
    expect(weekReport.days).toHaveLength(7)
    expect(weekReport.days[0].dateKey).toBe('2026-11-23')
    expect(weekReport.days[6].dateKey).toBe('2026-11-29')
    expect(weekReport.days[6].isFuture).toBe(true)
    expect(weekReport.elapsedDays).toBe(4) // Mon-Thu
    expect(weekReport.totalCheckins).toBe(3)
    expect(weekReport.perHabitStats[0].doneDays).toBe(2)

    // Current month (only Nov 1..30) and previous month (Oct 1..31)
    const novReport = buildPeriodReport(logs, updatedHabits, 'month', today, 0)
    expect(novReport.days).toHaveLength(30)
    expect(novReport.days[0].dateKey).toBe('2026-11-01')
    expect(novReport.days[29].dateKey).toBe('2026-11-30')

    const octReport = buildPeriodReport(logs, updatedHabits, 'month', today, -1)
    expect(octReport.days).toHaveLength(31)
    expect(octReport.totalCheckins).toBe(1)

    // Full year report
    const yearReport = buildPeriodReport(logs, updatedHabits, 'year', today, 0)
    expect(yearReport.chartSeries).toHaveLength(12)
    expect(yearReport.totalCheckins).toBe(4)

    // Day & 3-month / 6-month reports
    const dayReport = buildPeriodReport(logs, updatedHabits, 'day', today, -1)
    expect(dayReport.periodLabel).toBe('Ieri')
    expect(dayReport.totalCheckins).toBe(1)

    const threeMonthReport = buildPeriodReport(logs, updatedHabits, '3m', today, 0)
    expect(threeMonthReport.chartSeries).toHaveLength(3)
    expect(threeMonthReport.totalCheckins).toBe(4)

    const sixMonthReport = buildPeriodReport(logs, updatedHabits, '6m', today, 0)
    expect(sixMonthReport.chartSeries).toHaveLength(6)

    const monthHistory = buildHistoricalPeriods(logs, updatedHabits, 'month', today)
    expect(monthHistory[0].key).toBe('2026-11')
    expect(monthHistory[0].totalCheckins).toBe(3)
    expect(monthHistory[1].key).toBe('2026-10')
    expect(monthHistory[1].offset).toBe(-1)
  })

  it('rounds weight steps, computes weekly average delta, and saves body profile + BMI', () => {
    expect(roundWeight(75.14)).toBe(75.1)
    expect(roundWeight(75.1 + 0.1)).toBe(75.2)

    upsertWeightEntry(76.0, '2026-11-18')
    upsertWeightEntry(75.6, '2026-11-19')
    upsertWeightEntry(75.2, '2026-11-25')
    upsertWeightEntry(75.0, '2026-11-26')

    const entries = readWeightLogs()
    const stats = computeWeeklyWeightStats(entries, new Date('2026-11-26T10:00:00'))
    expect(stats.latestKg).toBe(75.0)
    expect(stats.weeklyAvgKg).toBe(75.1)
    expect(stats.previousWeekAvgKg).toBe(75.8)
    expect(stats.deltaKg).toBe(-0.7)

    const series = buildWeightChartSeries(entries)
    expect(series).toHaveLength(4)
    expect(series[3].dateLabel).toBe('26/11')

    saveBodyProfile({
      weightKg: 75.0,
      targetWeightKg: 72.0,
      heightCm: 178,
      age: 24,
      sex: 'm',
    })
    const loaded = readBodyProfile()
    expect(loaded.targetWeightKg).toBe(72.0)
    expect(computeBmi(loaded.weightKg, loaded.heightCm)).toBe(23.7)
  })

  it('supports retroactive yesterday and past-date habit/creatine toggles without future dates', () => {
    const afterMidnight = new Date('2026-11-27T00:08:00')
    const todayKey = getRelativeDateKey(0, afterMidnight)
    const yesterdayKey = getRelativeDateKey(-1, afterMidnight)

    expect(todayKey).toBe('2026-11-27')
    expect(yesterdayKey).toBe('2026-11-26')
    expect(clampPastOrTodayDateKey('2026-11-28', todayKey)).toBe('2026-11-27')
    expect(clampPastOrTodayDateKey('2026-11-25', todayKey)).toBe('2026-11-25')

    syncCreatineHabit(true, yesterdayKey)
    toggleHabitForDate('sleep', yesterdayKey)
    // Legacy deleted habit ID should not inflate active completed count above active habits length
    toggleHabitForDate('deleted-old-habit', yesterdayKey)

    const logs = readHabitLogs()
    expect(logs[yesterdayKey]).toContain('creatine')
    expect(logs[yesterdayKey]).toContain('sleep')
    expect(computeHabitStreak(logs, afterMidnight)).toBe(1)
    expect(countActiveCompletedForDate(logs, DEFAULT_HABITS, yesterdayKey)).toBe(2)
  })
})
