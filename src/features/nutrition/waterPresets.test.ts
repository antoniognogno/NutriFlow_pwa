import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_WATER_PRESETS,
  readWaterPresets,
  updateWaterPresetAmount,
} from './waterPresets'

const memoryStorage = new Map<string, string>()

describe('Customizable Water Presets', () => {
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

  it('seeds default water sizes and lets user resize e.g. 750ml to 800ml', () => {
    const initial = readWaterPresets()
    expect(initial).toHaveLength(DEFAULT_WATER_PRESETS.length)
    expect(initial.find(p => p.id === 'large')?.amountMl).toBe(750)

    const updated = updateWaterPresetAmount(initial, 'large', 800, 'Borraccia 800')
    const large = updated.find(p => p.id === 'large')
    expect(large?.amountMl).toBe(800)
    expect(large?.label).toBe('Borraccia 800')
    expect(readWaterPresets().find(p => p.id === 'large')?.amountMl).toBe(800)
  })
})
