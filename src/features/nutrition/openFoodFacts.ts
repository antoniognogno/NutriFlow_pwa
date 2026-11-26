import { containsCodeOrSql } from '@/lib/authSecurity'

export interface OpenFoodProduct {
  id: string
  name: string
  brand: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatsPer100g: number
  source?: 'openfoodfacts' | 'local'
}

interface RawOffProduct {
  code?: string
  product_name?: string
  product_name_it?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    'energy-kcal'?: number
    energy_100g?: number
    proteins_100g?: number
    proteins?: number
    carbohydrates_100g?: number
    carbohydrates?: number
    fat_100g?: number
    fat?: number
  }
}

export const LOCAL_COMMON_FOODS: OpenFoodProduct[] = [
  { id: 'local-yogurt-greco', name: 'Yogurt Greco 0%', brand: 'Catalogo', kcalPer100g: 57, proteinPer100g: 10.3, carbsPer100g: 3.6, fatsPer100g: 0, source: 'local' },
  { id: 'local-avena', name: 'Fiocchi di avena', brand: 'Catalogo', kcalPer100g: 372, proteinPer100g: 13.5, carbsPer100g: 59, fatsPer100g: 7, source: 'local' },
  { id: 'local-pollo', name: 'Petto di pollo', brand: 'Catalogo', kcalPer100g: 110, proteinPer100g: 23.3, carbsPer100g: 0, fatsPer100g: 1.3, source: 'local' },
  { id: 'local-tacchino', name: 'Fesa di tacchino', brand: 'Catalogo', kcalPer100g: 107, proteinPer100g: 24, carbsPer100g: 0.4, fatsPer100g: 1, source: 'local' },
  { id: 'local-riso-basmati', name: 'Riso basmati crudo', brand: 'Catalogo', kcalPer100g: 356, proteinPer100g: 8.2, carbsPer100g: 78, fatsPer100g: 0.6, source: 'local' },
  { id: 'local-pasta', name: 'Pasta di semola', brand: 'Catalogo', kcalPer100g: 353, proteinPer100g: 12.5, carbsPer100g: 71, fatsPer100g: 1.5, source: 'local' },
  { id: 'local-salmone', name: 'Salmone fresco', brand: 'Catalogo', kcalPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatsPer100g: 13.4, source: 'local' },
  { id: 'local-tonno-nat', name: 'Tonno al naturale', brand: 'Catalogo', kcalPer100g: 103, proteinPer100g: 24, carbsPer100g: 0, fatsPer100g: 0.6, source: 'local' },
  { id: 'local-uova', name: 'Uova intere', brand: 'Catalogo', kcalPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.7, fatsPer100g: 9.5, source: 'local' },
  { id: 'local-albume', name: 'Albume d’uovo', brand: 'Catalogo', kcalPer100g: 52, proteinPer100g: 10.9, carbsPer100g: 0.7, fatsPer100g: 0.2, source: 'local' },
  { id: 'local-pane-int', name: 'Pane integrale', brand: 'Catalogo', kcalPer100g: 243, proteinPer100g: 8.8, carbsPer100g: 44, fatsPer100g: 2.5, source: 'local' },
  { id: 'local-banana', name: 'Banana', brand: 'Catalogo', kcalPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatsPer100g: 0.3, source: 'local' },
  { id: 'local-mela', name: 'Mela', brand: 'Catalogo', kcalPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 13.8, fatsPer100g: 0.2, source: 'local' },
  { id: 'local-mandorle', name: 'Mandorle', brand: 'Catalogo', kcalPer100g: 579, proteinPer100g: 21.2, carbsPer100g: 21.6, fatsPer100g: 49.9, source: 'local' },
  { id: 'local-whey', name: 'Proteine Whey Isolate', brand: 'Catalogo', kcalPer100g: 380, proteinPer100g: 86, carbsPer100g: 3, fatsPer100g: 1.5, source: 'local' },
  { id: 'local-latte-ps', name: 'Latte parzialmente scremato', brand: 'Catalogo', kcalPer100g: 46, proteinPer100g: 3.3, carbsPer100g: 4.9, fatsPer100g: 1.5, source: 'local' },
  { id: 'local-mozzarella-light', name: 'Mozzarella light', brand: 'Catalogo', kcalPer100g: 163, proteinPer100g: 20, carbsPer100g: 1, fatsPer100g: 9, source: 'local' },
  { id: 'local-olio-evo', name: 'Olio extravergine d’oliva', brand: 'Catalogo', kcalPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatsPer100g: 100, source: 'local' },
  { id: 'local-patate', name: 'Patate', brand: 'Catalogo', kcalPer100g: 77, proteinPer100g: 2, carbsPer100g: 17, fatsPer100g: 0.1, source: 'local' },
  { id: 'local-bresaola', name: 'Bresaola', brand: 'Catalogo', kcalPer100g: 151, proteinPer100g: 33, carbsPer100g: 0, fatsPer100g: 2, source: 'local' },
]

export function searchLocalFoods(query: string): OpenFoodProduct[] {
  const clean = query.trim().toLocaleLowerCase()
  if (clean.length < 2) return []
  return LOCAL_COMMON_FOODS.filter(item => item.name.toLocaleLowerCase().includes(clean)).slice(0, 5)
}

const searchCache = new Map<string, OpenFoodProduct[]>()
let lastSearchTimestamp = 0
const SEARCH_COOLDOWN_MS = 500

function parseKcal(nutriments?: RawOffProduct['nutriments']): number | null {
  if (!nutriments) return null
  if (typeof nutriments['energy-kcal_100g'] === 'number' && Number.isFinite(nutriments['energy-kcal_100g'])) {
    return nutriments['energy-kcal_100g']
  }
  if (typeof nutriments['energy-kcal'] === 'number' && Number.isFinite(nutriments['energy-kcal'])) {
    return nutriments['energy-kcal']
  }
  if (typeof nutriments.energy_100g === 'number' && Number.isFinite(nutriments.energy_100g)) {
    return nutriments.energy_100g / 4.184
  }
  return null
}

export async function searchOpenFoodFacts(
  query: string,
  externalSignal?: AbortSignal,
): Promise<OpenFoodProduct[]> {
  const clean = query.trim()
  if (clean.length < 2 || clean.length > 60) return []
  if (containsCodeOrSql(clean)) {
    throw new Error('Ricerca non valida: rimuovi caratteri speciali o codice.')
  }

  const cacheKey = clean.toLowerCase()
  const cached = searchCache.get(cacheKey)
  if (cached) return cached

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return searchLocalFoods(clean)
  }

  const now = Date.now()
  if (now - lastSearchTimestamp < SEARCH_COOLDOWN_MS) {
    return searchLocalFoods(clean)
  }
  lastSearchTimestamp = now

  const controller = new AbortController()
  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), 9000)

  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(clean)}` +
      '&search_simple=1&action=process&json=1&lc=it&sort_by=unique_scans_n&page_size=8' +
      '&fields=code,product_name,product_name_it,brands,nutriments'
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { products?: RawOffProduct[] }
    const products = Array.isArray(data.products) ? data.products : []

    const mapped = products
      .map((item, idx): OpenFoodProduct | null => {
        const displayName = String(item.product_name_it || item.product_name || '').trim()
        const kcal = parseKcal(item.nutriments)
        if (!displayName || kcal === null) return null
        return {
          id: item.code || `${clean}-${idx}`,
          name: displayName,
          brand: String(item.brands ?? '').split(',')[0].trim(),
          kcalPer100g: Math.max(0, Math.round(kcal)),
          proteinPer100g: Math.max(0, Math.round(Number(item.nutriments?.proteins_100g ?? item.nutriments?.proteins ?? 0) * 10) / 10),
          carbsPer100g: Math.max(0, Math.round(Number(item.nutriments?.carbohydrates_100g ?? item.nutriments?.carbohydrates ?? 0) * 10) / 10),
          fatsPer100g: Math.max(0, Math.round(Number(item.nutriments?.fat_100g ?? item.nutriments?.fat ?? 0) * 10) / 10),
          source: 'openfoodfacts',
        }
      })
      .filter((x): x is OpenFoodProduct => x !== null)
      .slice(0, 6)

    searchCache.set(cacheKey, mapped)
    return mapped
  } finally {
    window.clearTimeout(timeout)
    externalSignal?.removeEventListener('abort', onExternalAbort)
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
