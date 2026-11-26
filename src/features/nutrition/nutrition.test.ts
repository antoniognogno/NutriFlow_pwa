import { describe, expect, it } from 'vitest'
import {
  aggregateMealTotals,
  computeMacroGoals,
  DAILY_GOALS,
  DEFAULT_PRESETS,
  macroPercent,
} from './nutritionUtils'
import { scaleNutrientsForGrams } from './openFoodFacts'

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
})
