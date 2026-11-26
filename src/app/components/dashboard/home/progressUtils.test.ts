import { describe, expect, it } from 'vitest'
import { clampRingPercent, formatLiters, getStartOfWeekIso } from './progressUtils'

describe('Home Progress Rings Helpers', () => {
  it('clamps ring progress between 0 and 100', () => {
    expect(clampRingPercent(0, 4)).toBe(0)
    expect(clampRingPercent(2, 4)).toBe(50)
    expect(clampRingPercent(6, 4)).toBe(100)
    expect(clampRingPercent(100, 0)).toBe(0)
  })

  it('formats milliliters in clean liters for ring labels', () => {
    expect(formatLiters(0)).toBe('0.0L')
    expect(formatLiters(1250)).toBe('1.3L')
    expect(formatLiters(2500)).toBe('2.5L')
  })

  it('computes Monday 00:00 as start of week', () => {
    // Wednesday 2026-11-25 -> Monday 2026-11-23
    const wednesday = new Date(2026, 10, 25, 15, 30, 0)
    const monday = new Date(getStartOfWeekIso(wednesday))
    expect(monday.getDay()).toBe(1)
    expect(monday.getDate()).toBe(23)
    expect(monday.getHours()).toBe(0)
  })
})
