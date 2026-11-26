import type { MealLogItem } from './nutritionUtils'

export const CACHED_MEALS_KEY = 'nutriflow:cached-meals-v1'

interface CachedMealsEnvelope {
  dateKey: string
  meals: MealLogItem[]
}

export function getTodayMealsDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function sortMealsNewestFirst(meals: MealLogItem[]): MealLogItem[] {
  return [...meals].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
}

export function readCachedMeals(dateKey = getTodayMealsDateKey()): MealLogItem[] {
  try {
    const raw = localStorage.getItem(CACHED_MEALS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<CachedMealsEnvelope>
    if (parsed.dateKey !== dateKey || !Array.isArray(parsed.meals)) return []
    return sortMealsNewestFirst(parsed.meals)
  } catch {
    return []
  }
}

export function saveCachedMeals(meals: MealLogItem[], dateKey = getTodayMealsDateKey()): MealLogItem[] {
  const sorted = sortMealsNewestFirst(meals)
  try {
    const payload: CachedMealsEnvelope = { dateKey, meals: sorted }
    localStorage.setItem(CACHED_MEALS_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage quota issues
  }
  return sorted
}

export function upsertCachedMeal(meal: MealLogItem, dateKey = getTodayMealsDateKey()): MealLogItem[] {
  const existing = readCachedMeals(dateKey).filter(item => item.id !== meal.id)
  return saveCachedMeals([meal, ...existing], dateKey)
}

export function removeCachedMeal(mealId: string, dateKey = getTodayMealsDateKey()): MealLogItem[] {
  const filtered = readCachedMeals(dateKey).filter(item => item.id !== mealId)
  return saveCachedMeals(filtered, dateKey)
}

export function mergeRemoteAndCachedMeals(
  remoteMeals: MealLogItem[],
  localCachedMeals: MealLogItem[] = readCachedMeals(),
  pendingUpsertMealIds: Set<string> = new Set(),
  pendingDeleteMealIds: Set<string> = new Set(),
): MealLogItem[] {
  const merged = new Map<string, MealLogItem>()
  for (const remote of remoteMeals) {
    if (!pendingDeleteMealIds.has(remote.id)) {
      merged.set(remote.id, remote)
    }
  }
  for (const local of localCachedMeals) {
    if (pendingDeleteMealIds.has(local.id)) continue
    if (pendingUpsertMealIds.has(local.id)) {
      merged.set(local.id, local)
    }
  }
  return sortMealsNewestFirst(Array.from(merged.values()))
}
