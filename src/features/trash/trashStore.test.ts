import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearTrash,
  daysUntilExpiry,
  moveToTrash,
  purgeExpiredTrashItems,
  readTrashItems,
  removeFromTrash,
  TRASH_RETENTION_MS,
} from './trashStore'

const memoryStorage = new Map<string, string>()

describe('30-day Trash Store', () => {
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

  it('stores deleted presets/sessions with 30-day expiry and supports restore/delete', () => {
    const now = 1_700_000_000_000
    moveToTrash(
      {
        id: 'cardio_preset:run-5k',
        kind: 'cardio_preset',
        title: 'Corsa 5 km',
        subtitle: '5 km · 28 min',
        preset: { id: 'run-5k', label: 'Corsa 5 km', distanceKm: 5, minutes: 28 },
      },
      now,
    )

    const items = readTrashItems(now)
    expect(items).toHaveLength(1)
    expect(daysUntilExpiry(items[0].expiresAt, now)).toBe(30)

    removeFromTrash('cardio_preset:run-5k')
    expect(readTrashItems(now)).toHaveLength(0)

    moveToTrash(
      {
        id: 'cardio_preset:run-10k',
        kind: 'cardio_preset',
        title: 'Corsa 10 km',
        subtitle: '10 km · 56 min',
        preset: { id: 'run-10k', label: 'Corsa 10 km', distanceKm: 10, minutes: 56 },
      },
      now,
    )
    clearTrash()
    expect(readTrashItems(now)).toHaveLength(0)
  })

  it('auto-purges items older than 30 days', () => {
    const deletedAt = 1_700_000_000_000
    const after31Days = deletedAt + TRASH_RETENTION_MS + 86_400_000
    moveToTrash(
      {
        id: 'workout_preset:preset-push',
        kind: 'workout_preset',
        title: 'Push',
        subtitle: '4 esercizi',
        preset: {
          id: 'preset-push',
          name: 'Push',
          subtitle: '4 esercizi',
          workout_exercises: [],
        },
      },
      deletedAt,
    )

    expect(purgeExpiredTrashItems(readTrashItems(deletedAt), after31Days)).toHaveLength(0)
    expect(readTrashItems(after31Days)).toHaveLength(0)
  })
})
