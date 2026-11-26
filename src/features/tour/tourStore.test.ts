import { describe, expect, it } from 'vitest'
import {
  evaluateSessionEntryMode,
  ONE_MONTH_MS,
  shouldAutoStartTour,
  THREE_MONTHS_MS,
  TOUR_STEPS,
} from './tourStore'

describe('App Guided Tour & 30-day inactivity trigger', () => {
  it('ships complete tour steps covering navigation, workout, stats, routine, nutrition, water, and settings', () => {
    expect(TOUR_STEPS.length).toBe(10)
    const routes = TOUR_STEPS.map(s => s.route)
    expect(routes).toContain('/dashboard')
    expect(routes).toContain('/dashboard/gym')
    expect(routes).toContain('/dashboard/gym/plan/new?import=ai')
    expect(routes).toContain('/dashboard/stats')
    expect(routes).toContain('/dashboard/routine')
    expect(routes).toContain('/dashboard/nutrition')
    expect(routes).toContain('/dashboard/water')
    expect(routes).toContain('/dashboard/settings')
    for (const step of TOUR_STEPS) {
      expect(step.pathLabel.trim().length).toBeGreaterThan(0)
    }
  })

  it('triggers automatically only when inactive for more than 1 month (30 days)', () => {
    const now = 1_800_000_000_000

    expect(shouldAutoStartTour({ lastActiveAt: null, lastCompletedOrSkippedAt: null }, now)).toBe(false)
    expect(
      shouldAutoStartTour({ lastActiveAt: now - (ONE_MONTH_MS - 60_000), lastCompletedOrSkippedAt: null }, now),
    ).toBe(false)
    expect(
      shouldAutoStartTour({ lastActiveAt: now - (ONE_MONTH_MS + 60_000), lastCompletedOrSkippedAt: null }, now),
    ).toBe(true)
    expect(
      shouldAutoStartTour(
        {
          lastActiveAt: now - (ONE_MONTH_MS + 60_000),
          lastCompletedOrSkippedAt: now - 10_000,
        },
        now,
      ),
    ).toBe(false)

    expect(evaluateSessionEntryMode({ lastActiveAt: null, lastCompletedOrSkippedAt: null }, now)).toBe('first_visit')
    expect(
      evaluateSessionEntryMode({ lastActiveAt: now - (THREE_MONTHS_MS + 60_000), lastCompletedOrSkippedAt: null }, now),
    ).toBe('inactive_3m')
    expect(
      evaluateSessionEntryMode({ lastActiveAt: now - 86_400_000, lastCompletedOrSkippedAt: null }, now),
    ).toBe('active')
  })
})
