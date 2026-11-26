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
  { id: 'local-yogurt-greco', name: 'Yogurt Greco 0%', brand: 'Comune EU', kcalPer100g: 57, proteinPer100g: 10.3, carbsPer100g: 3.6, fatsPer100g: 0, source: 'local' },
  { id: 'local-skyr', name: 'Skyr bianco naturale', brand: 'Comune EU', kcalPer100g: 63, proteinPer100g: 11, carbsPer100g: 4, fatsPer100g: 0.2, source: 'local' },
  { id: 'local-avena', name: 'Fiocchi di avena', brand: 'Comune EU', kcalPer100g: 372, proteinPer100g: 13.5, carbsPer100g: 59, fatsPer100g: 7, source: 'local' },
  { id: 'local-pollo', name: 'Petto di pollo', brand: 'Comune EU', kcalPer100g: 110, proteinPer100g: 23.3, carbsPer100g: 0, fatsPer100g: 1.3, source: 'local' },
  { id: 'local-tacchino', name: 'Fesa di tacchino', brand: 'Comune EU', kcalPer100g: 107, proteinPer100g: 24, carbsPer100g: 0.4, fatsPer100g: 1, source: 'local' },
  { id: 'local-manzo-magro', name: 'Manzo magro / Macinato 5%', brand: 'Comune EU', kcalPer100g: 137, proteinPer100g: 21.4, carbsPer100g: 0, fatsPer100g: 5, source: 'local' },
  { id: 'local-bresaola', name: 'Bresaola', brand: 'Comune EU', kcalPer100g: 151, proteinPer100g: 33, carbsPer100g: 0, fatsPer100g: 2, source: 'local' },
  { id: 'local-prosciutto-crudo', name: 'Prosciutto crudo sgrassato', brand: 'Comune EU', kcalPer100g: 159, proteinPer100g: 27, carbsPer100g: 0, fatsPer100g: 5.5, source: 'local' },
  { id: 'local-riso-basmati', name: 'Riso basmati crudo', brand: 'Comune EU', kcalPer100g: 356, proteinPer100g: 8.2, carbsPer100g: 78, fatsPer100g: 0.6, source: 'local' },
  { id: 'local-riso-integrale', name: 'Riso integrale crudo', brand: 'Comune EU', kcalPer100g: 362, proteinPer100g: 7.5, carbsPer100g: 76, fatsPer100g: 2.7, source: 'local' },
  { id: 'local-pasta', name: 'Pasta di semola', brand: 'Comune EU', kcalPer100g: 353, proteinPer100g: 12.5, carbsPer100g: 71, fatsPer100g: 1.5, source: 'local' },
  { id: 'local-farro', name: 'Farro perlato', brand: 'Comune EU', kcalPer100g: 338, proteinPer100g: 14.6, carbsPer100g: 67, fatsPer100g: 2.4, source: 'local' },
  { id: 'local-gallette-riso', name: 'Gallette di riso', brand: 'Comune EU', kcalPer100g: 387, proteinPer100g: 8.1, carbsPer100g: 81.5, fatsPer100g: 2.8, source: 'local' },
  { id: 'local-salmone', name: 'Salmone fresco', brand: 'Comune EU', kcalPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatsPer100g: 13.4, source: 'local' },
  { id: 'local-merluzzo', name: 'Merluzzo / Nasello', brand: 'Comune EU', kcalPer100g: 82, proteinPer100g: 17.8, carbsPer100g: 0, fatsPer100g: 0.7, source: 'local' },
  { id: 'local-tonno-nat', name: 'Tonno al naturale', brand: 'Comune EU', kcalPer100g: 103, proteinPer100g: 24, carbsPer100g: 0, fatsPer100g: 0.6, source: 'local' },
  { id: 'local-uova', name: 'Uova intere', brand: 'Comune EU', kcalPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.7, fatsPer100g: 9.5, source: 'local' },
  { id: 'local-albume', name: 'Albume d’uovo', brand: 'Comune EU', kcalPer100g: 52, proteinPer100g: 10.9, carbsPer100g: 0.7, fatsPer100g: 0.2, source: 'local' },
  { id: 'local-pane-int', name: 'Pane integrale', brand: 'Comune EU', kcalPer100g: 243, proteinPer100g: 8.8, carbsPer100g: 44, fatsPer100g: 2.5, source: 'local' },
  { id: 'local-pane-segale', name: 'Pane di segale', brand: 'Comune EU', kcalPer100g: 259, proteinPer100g: 8.5, carbsPer100g: 48, fatsPer100g: 1.8, source: 'local' },
  { id: 'local-patate', name: 'Patate', brand: 'Comune EU', kcalPer100g: 77, proteinPer100g: 2, carbsPer100g: 17, fatsPer100g: 0.1, source: 'local' },
  { id: 'local-patate-dolci', name: 'Patate dolci', brand: 'Comune EU', kcalPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20.1, fatsPer100g: 0.1, source: 'local' },
  { id: 'local-banana', name: 'Banana', brand: 'Comune EU', kcalPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatsPer100g: 0.3, source: 'local' },
  { id: 'local-mela', name: 'Mela', brand: 'Comune EU', kcalPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 13.8, fatsPer100g: 0.2, source: 'local' },
  { id: 'local-fragole', name: 'Fragole / Frutti di bosco', brand: 'Comune EU', kcalPer100g: 36, proteinPer100g: 0.7, carbsPer100g: 7.7, fatsPer100g: 0.3, source: 'local' },
  { id: 'local-mandorle', name: 'Mandorle', brand: 'Comune EU', kcalPer100g: 579, proteinPer100g: 21.2, carbsPer100g: 21.6, fatsPer100g: 49.9, source: 'local' },
  { id: 'local-noci', name: 'Noci sgusciate', brand: 'Comune EU', kcalPer100g: 654, proteinPer100g: 15.2, carbsPer100g: 13.7, fatsPer100g: 65.2, source: 'local' },
  { id: 'local-burro-arachidi', name: 'Burro d’arachidi 100%', brand: 'Comune EU', kcalPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatsPer100g: 50, source: 'local' },
  { id: 'local-whey', name: 'Proteine Whey Isolate', brand: 'Comune EU', kcalPer100g: 380, proteinPer100g: 86, carbsPer100g: 3, fatsPer100g: 1.5, source: 'local' },
  { id: 'local-latte-ps', name: 'Latte parzialmente scremato', brand: 'Comune EU', kcalPer100g: 46, proteinPer100g: 3.3, carbsPer100g: 4.9, fatsPer100g: 1.5, source: 'local' },
  { id: 'local-mozzarella-light', name: 'Mozzarella light', brand: 'Comune EU', kcalPer100g: 163, proteinPer100g: 20, carbsPer100g: 1, fatsPer100g: 9, source: 'local' },
  { id: 'local-fiocchi-latte', name: 'Fiocchi di latte', brand: 'Comune EU', kcalPer100g: 98, proteinPer100g: 11.1, carbsPer100g: 3.4, fatsPer100g: 4.3, source: 'local' },
  { id: 'local-ricotta-light', name: 'Ricotta vaccina light', brand: 'Comune EU', kcalPer100g: 138, proteinPer100g: 11, carbsPer100g: 3.5, fatsPer100g: 9, source: 'local' },
  { id: 'local-olio-evo', name: 'Olio extravergine d’oliva', brand: 'Comune EU', kcalPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatsPer100g: 100, source: 'local' },
  { id: 'local-avocado', name: 'Avocado', brand: 'Comune EU', kcalPer100g: 160, proteinPer100g: 2, carbsPer100g: 8.5, fatsPer100g: 14.7, source: 'local' },
]

export function searchLocalFoods(query: string): OpenFoodProduct[] {
  const clean = query.trim().toLocaleLowerCase()
  if (clean.length < 2) return []
  return LOCAL_COMMON_FOODS.filter(item => item.name.toLocaleLowerCase().includes(clean)).slice(0, 5)
}

const searchCache = new Map<string, OpenFoodProduct[]>()
let lastSearchTimestamp = 0
const SEARCH_COOLDOWN_MS = 600

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
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Ricerca OpenFoodFacts non disponibile offline.')
  }

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
    return []
  }
  lastSearchTimestamp = now

  const controller = new AbortController()
  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), 6500)

  try {
    // End-point italiano/europeo ordinato per popolarita (riduce rumore e peso)
    const url =
      `https://it.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(clean)}` +
      '&search_simple=1&action=process&json=1&lc=it&cc=it' +
      '&tagtype_0=countries&tag_contains_0=contains&tag_0=italy' +
      '&sort_by=unique_scans_n&page_size=5' +
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
      .slice(0, 5)

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
