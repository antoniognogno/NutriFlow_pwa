import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export interface WaterPresetItem {
  id: string
  label: string
  amountMl: number
  kind: 'sip' | 'glass' | 'bottle' | 'large'
}

export const WATER_PRESETS_KEY = 'nutriflow:water-presets-v1'

export const DEFAULT_WATER_PRESETS: WaterPresetItem[] = [
  { id: 'sip', label: 'Sorso', amountMl: 100, kind: 'sip' },
  { id: 'glass', label: 'Bicchiere', amountMl: 200, kind: 'glass' },
  { id: 'bottle', label: 'Borraccia', amountMl: 500, kind: 'bottle' },
  { id: 'large', label: 'Borraccia L', amountMl: 750, kind: 'large' },
]

export function readWaterPresets(): WaterPresetItem[] {
  try {
    const raw = localStorage.getItem(WATER_PRESETS_KEY)
    if (!raw) {
      localStorage.setItem(WATER_PRESETS_KEY, JSON.stringify(DEFAULT_WATER_PRESETS))
      return DEFAULT_WATER_PRESETS
    }
    const parsed = JSON.parse(raw) as WaterPresetItem[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WATER_PRESETS
  } catch {
    return DEFAULT_WATER_PRESETS
  }
}

export function saveWaterPresets(presets: WaterPresetItem[]): void {
  localStorage.setItem(WATER_PRESETS_KEY, JSON.stringify(presets))
  markCloudStateDirty()
}

export function updateWaterPresetAmount(
  presets: WaterPresetItem[],
  id: string,
  amountMl: number,
  label?: string,
): WaterPresetItem[] {
  const safeAmount = Math.max(25, Math.min(3000, Math.round(amountMl)))
  const next = presets.map(item =>
    item.id === id
      ? {
          ...item,
          amountMl: safeAmount,
          label: label !== undefined && label.trim() ? label.trim() : item.label,
        }
      : item,
  )
  saveWaterPresets(next)
  return next
}
