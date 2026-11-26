import { describe, expect, it } from 'vitest'
import {
  buildMealPeriodReport,
  buildWaterPeriodReport,
  getPeriodWindow,
} from './periodUtils'

describe('Multi-period Scrollable Reports (1D, 1W, 1M, 3M, 6M, 1Y)', () => {
  const now = new Date('2026-11-26T12:00:00')

  it('builds shifted period windows across day, week, month, 3m, 6m, and year', () => {
    expect(getPeriodWindow('day', 0, now).label).toBe('Oggi')
    expect(getPeriodWindow('day', -1, now).label).toBe('Ieri')
    expect(getPeriodWindow('week', 0, now).daysCount).toBe(7)
    expect(getPeriodWindow('month', -1, now).label).toBe('Ottobre 2026')
    expect(getPeriodWindow('3m', 0, now).label).toBe('Set–Nov 2026')
    expect(getPeriodWindow('3m', -1, now).label).toBe('Giu–Ago 2026')
    expect(getPeriodWindow('6m', 0, now).label).toBe('Giu–Nov 2026')
    expect(getPeriodWindow('year', -1, now).label).toBe('Anno 2025')
  })

  it('aggregates water and meal metrics accurately across period windows', () => {
    const win = getPeriodWindow('week', 0, now)
    const waterReport = buildWaterPeriodReport(
      [
        { amount_ml: 1500, created_at: '2026-11-25T10:00:00' },
        { amount_ml: 1200, created_at: '2026-11-25T16:00:00' },
        { amount_ml: 800, created_at: '2026-11-26T09:00:00' },
      ],
      win,
      2500,
      now,
    )
    expect(waterReport.totalMl).toBe(3500)
    expect(waterReport.daysGoalMet).toBe(1)
    expect(waterReport.chartSeries).toHaveLength(7)

    const monthWin = getPeriodWindow('3m', 0, now)
    const mealReport = buildMealPeriodReport(
      [
        {
          id: 'm1',
          meal_name: 'Pranzo',
          calories: 700,
          protein_g: 50,
          carbs_g: 70,
          fats_g: 20,
          logged_at: '2026-10-12T13:00:00',
        },
        {
          id: 'm2',
          meal_name: 'Cena',
          calories: 800,
          protein_g: 55,
          carbs_g: 80,
          fats_g: 25,
          logged_at: '2026-11-26T20:00:00',
        },
      ],
      monthWin,
    )
    expect(mealReport.totalCalories).toBe(1500)
    expect(mealReport.activeDays).toBe(2)
    expect(mealReport.avgDailyCalories).toBe(750)
    expect(mealReport.chartSeries).toHaveLength(3)
  })
})
