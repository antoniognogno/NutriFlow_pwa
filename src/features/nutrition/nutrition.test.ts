import { describe, expect, it } from 'vitest'
import {
  aggregateMealTotals,
  computeMacroGoals,
  DAILY_GOALS,
  DEFAULT_PRESETS,
  macroPercent,
} from './nutritionUtils'
import { scaleNutrientsForGrams, searchLocalFoods, searchOpenFoodFacts } from './openFoodFacts'
import {
  appendCachedWaterLog,
  buildDayBoundsIso,
  buildTimestampForDateKey,
  clearCachedWaterLogs,
  getTodayWaterDateKey,
  readCachedWaterState,
  removeLastCachedWaterLog,
  sumWaterLogs,
  updateLastCachedWaterLog,
} from './waterOfflineCache'
import {
  mergeRemoteAndCachedMeals,
  readCachedMeals,
  removeCachedMeal,
  saveCachedMeals,
  upsertCachedMeal,
} from './mealOfflineCache'

describe('Nutrition, Personalized Macros & OpenFoodFacts', () => {
  it('ships with valid 1-tap meal presets', () => {
    expect(DEFAULT_PRESETS.length).toBeGreaterThanOrEqual(4)
    for (const preset of DEFAULT_PRESETS) {
      expect(preset.calories).toBeGreaterThan(0)
      expect(preset.protein_g).toBeGreaterThan(0)
    }
  })

  it('aggregates daily calories and macros accurately', () => {
    const totals = aggregateMealTotals([
      { calories: 230, protein_g: 28, carbs_g: 26, fats_g: 2 },
      { calories: 580, protein_g: 48, carbs_g: 68, fats_g: 10 },
    ])
    expect(totals).toEqual({ calories: 810, protein_g: 76, carbs_g: 94, fats_g: 12 })
  })

  it('clamps progress percentages between 0 and 100', () => {
    expect(macroPercent(0, DAILY_GOALS.calories)).toBe(0)
    expect(macroPercent(1200, 2400)).toBe(50)
    expect(macroPercent(5000, 2400)).toBe(100)
    expect(macroPercent(100, 0)).toBe(0)
  })

  it('computes personalized TDEE macro goals for cut/bulk and scales OpenFoodFacts portions', () => {
    const fallback = computeMacroGoals({
      weightKg: null,
      targetWeightKg: null,
      heightCm: null,
      age: null,
      sex: '',
    })
    expect(fallback.isPersonalized).toBe(false)
    expect(fallback.calories).toBe(DAILY_GOALS.calories)

    const cutGoals = computeMacroGoals(
      { weightKg: 80, targetWeightKg: 75, heightCm: 180, age: 25, sex: 'm' },
      4,
    )
    expect(cutGoals.isPersonalized).toBe(true)
    expect(cutGoals.goalMode).toBe('cut')
    expect(cutGoals.calories).toBe(cutGoals.tdee - 350)
    expect(cutGoals.protein_g).toBe(160)

    const scaled = scaleNutrientsForGrams(
      {
        id: '1',
        name: 'Yogurt Greco',
        brand: 'Fage',
        kcalPer100g: 60,
        proteinPer100g: 10,
        carbsPer100g: 3.5,
        fatsPer100g: 0,
      },
      170,
    )
    expect(scaled).toEqual({ calories: 102, protein_g: 17, carbs_g: 6, fats_g: 0 })
  })

  it('caches and edits daily water logs & meals offline cleanly', () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v) },
        removeItem: (k: string) => { store.delete(k) },
      },
      configurable: true,
    })

    appendCachedWaterLog({ localId: 'w-1', amount_ml: 250, created_at: '2026-11-26T09:00:00.000Z' }, 3000)
    appendCachedWaterLog({ localId: 'w-2', amount_ml: 500, created_at: '2026-11-26T10:00:00.000Z' }, 3000)
    expect(sumWaterLogs(readCachedWaterState().logs)).toBe(750)
    expect(readCachedWaterState().dailyGoal).toBe(3000)

    updateLastCachedWaterLog(650)
    expect(sumWaterLogs(readCachedWaterState().logs)).toBe(900)

    const removed = removeLastCachedWaterLog()
    expect(removed.removed?.amount_ml).toBe(650)
    expect(sumWaterLogs(removed.state.logs)).toBe(250)

    clearCachedWaterLogs()
    expect(sumWaterLogs(readCachedWaterState().logs)).toBe(0)

    // Logging water for yesterday keeps today's water separate and builds exact bounds
    const todayKey = getTodayWaterDateKey()
    appendCachedWaterLog({ localId: 'w-today', amount_ml: 500, created_at: new Date().toISOString() }, 3000, todayKey)
    appendCachedWaterLog({ localId: 'w-yest', amount_ml: 750, created_at: '2026-11-26T12:00:00.000Z' }, 3000, '2026-11-26')
    expect(sumWaterLogs(readCachedWaterState(todayKey).logs)).toBe(500)
    expect(sumWaterLogs(readCachedWaterState('2026-11-26').logs)).toBe(750)
    const bounds = buildDayBoundsIso('2026-11-26')
    const ts = buildTimestampForDateKey('2026-11-26')
    expect(ts >= bounds.startIso && ts < bounds.endIso).toBe(true)

    saveCachedMeals([
      {
        id: 'meal-remote',
        user_id: 'u-1',
        meal_name: 'Pranzo',
        description: '',
        calories: 600,
        protein_g: 45,
        carbs_g: 65,
        fats_g: 14,
        logged_at: '2026-11-26T12:00:00.000Z',
      },
    ])
    upsertCachedMeal({
      id: 'meal-offline',
      user_id: 'u-1',
      meal_name: 'Spuntino',
      description: '',
      calories: 220,
      protein_g: 20,
      carbs_g: 25,
      fats_g: 4,
      logged_at: '2026-11-26T16:00:00.000Z',
    })
    expect(readCachedMeals().map(m => m.id)).toEqual(['meal-offline', 'meal-remote'])

    const merged = mergeRemoteAndCachedMeals(
      [
        {
          id: 'meal-remote',
          user_id: 'u-1',
          meal_name: 'Pranzo',
          description: '',
          calories: 600,
          protein_g: 45,
          carbs_g: 65,
          fats_g: 14,
          logged_at: '2026-11-26T12:00:00.000Z',
        },
      ],
      readCachedMeals(),
      new Set(['meal-offline']),
      new Set(['meal-remote']),
    )
    expect(merged.map(m => m.id)).toEqual(['meal-offline'])

    removeCachedMeal('meal-offline')
    expect(readCachedMeals().map(m => m.id)).toEqual(['meal-remote'])

    expect(searchLocalFoods('yogurt')[0]?.name).toContain('Yogurt Greco')
    expect(searchLocalFoods('pollo')[0]?.kcalPer100g).toBeGreaterThan(0)
  })

  it('rejects OpenFoodFacts remote queries when offline', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
    })
    await expect(searchOpenFoodFacts('yogurt')).rejects.toThrow(/offline/i)
  })
})
