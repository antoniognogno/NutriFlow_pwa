import { describe, expect, it } from 'vitest'
import { isNavItemActive, NAV_ITEMS } from './navLink'

describe('Mobile Navigation & Route Grouping', () => {
  it('exposes exactly 4 clean bottom nav tabs for mobile one-handed use', () => {
    expect(NAV_ITEMS).toHaveLength(4)
    expect(NAV_ITEMS.map(item => item.href)).toEqual([
      '/dashboard',
      '/dashboard/gym',
      '/dashboard/routine',
      '/dashboard/nutrition',
    ])
  })

  it('activates the exact parent tab for nested routes', () => {
    expect(isNavItemActive('/dashboard', '/dashboard')).toBe(true)
    expect(isNavItemActive('/dashboard', '/dashboard/routine')).toBe(false)

    expect(isNavItemActive('/dashboard/gym', '/dashboard/gym/preset-push')).toBe(true)
    expect(isNavItemActive('/dashboard/gym', '/dashboard/stats')).toBe(true)
    expect(isNavItemActive('/dashboard/routine', '/dashboard/routine')).toBe(true)

    expect(isNavItemActive('/dashboard/nutrition', '/dashboard/water')).toBe(true)
    expect(isNavItemActive('/dashboard/nutrition', '/dashboard/recipes')).toBe(true)
  })
})
