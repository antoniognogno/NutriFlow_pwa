import { describe, expect, it } from 'vitest'
import { computeConsecutiveDays } from './recentWinsUtils'

describe('Recent Wins Helpers', () => {
  it('computes consecutive creatine/activity streak ending today or yesterday', () => {
    expect(computeConsecutiveDays(['2026-11-25', '2026-11-24', '2026-11-23'], '2026-11-25')).toBe(3)
    expect(computeConsecutiveDays(['2026-11-24', '2026-11-23'], '2026-11-25')).toBe(2)
    expect(computeConsecutiveDays(['2026-11-20'], '2026-11-25')).toBe(0)
    expect(computeConsecutiveDays([], '2026-11-25')).toBe(0)
  })
})
