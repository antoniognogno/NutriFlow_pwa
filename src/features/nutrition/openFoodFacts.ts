import { containsCodeOrSql } from '@/lib/authSecurity'

export interface OpenFoodProduct {
  id: string
  name: string
  brand: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatsPer100g: number
}

interface RawOffProduct {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
}

const searchCache = new Map<string, OpenFoodProduct[]>()
let lastSearchTimestamp = 0
const SEARCH_COOLDOWN_MS = 1200

export async function searchOpenFoodFacts(query: string): Promise<OpenFoodProduct[]> {
  const clean = query.trim()
  if (clean.length < 2 || clean.length > 60) return []
  if (containsCodeOrSql(clean)) {
    throw new Error('Ricerca non valida: rimuovi caratteri speciali o codice.')
  }

  const cacheKey = clean.toLowerCase()
  const cached = searchCache.get(cacheKey)
  if (cached) return cached

  const now = Date.now()
  if (now - lastSearchTimestamp < SEARCH_COOLDOWN_MS) {
    throw new Error('Attendi un secondo prima di fare un’altra ricerca.')
  }
  lastSearchTimestamp = now

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 5000)

  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(clean)}` +
      '&search_simple=1&action=process&json=1&page_size=6&fields=code,product_name,brands,nutriments'
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { products?: RawOffProduct[] }
    const products = Array.isArray(data.products) ? data.products : []

    const mapped = products
      .filter(item => item.product_name && item.nutriments?.['energy-kcal_100g'] !== undefined)
      .slice(0, 6)
      .map((item, idx) => ({
        id: item.code || `${clean}-${idx}`,
        name: String(item.product_name).trim(),
        brand: String(item.brands ?? '').split(',')[0].trim(),
        kcalPer100g: Math.max(0, Math.round(Number(item.nutriments?.['energy-kcal_100g'] ?? 0))),
        proteinPer100g: Math.max(0, Math.round(Number(item.nutriments?.proteins_100g ?? 0) * 10) / 10),
        carbsPer100g: Math.max(0, Math.round(Number(item.nutriments?.carbohydrates_100g ?? 0) * 10) / 10),
        fatsPer100g: Math.max(0, Math.round(Number(item.nutriments?.fat_100g ?? 0) * 10) / 10),
      }))
    searchCache.set(cacheKey, mapped)
    return mapped
  } finally {
    window.clearTimeout(timeout)
  }
}

export function scaleNutrientsForGrams(product: OpenFoodProduct, grams: number) {
  const factor = Math.max(1, grams) / 100
  return {
    calories: Math.round(product.kcalPer100g * factor),
    protein_g: Math.round(product.proteinPer100g * factor * 10) / 10,
    carbs_g: Math.round(product.carbsPer100g * factor * 10) / 10,
    fats_g: Math.round(product.fatsPer100g * factor * 10) / 10,
  }
}
