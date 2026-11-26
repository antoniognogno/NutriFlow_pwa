import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export interface BodyProfile {
  weightKg: number | null
  targetWeightKg: number | null
  heightCm: number | null
  age: number | null
  sex: 'm' | 'f' | ''
}

export const BODY_PROFILE_KEY = 'nutriflow:body-profile-v1'
export const SETTINGS_PROFILE_CACHE_KEY = 'nutriflow:settings-profile-v1'

export interface CachedProfileSettings {
  username: string
  water_goal_ml: number
  diet_type: string
  allergies: string[]
  disliked_foods: string[]
}

const DEFAULT_SETTINGS_PROFILE: CachedProfileSettings = {
  username: '',
  water_goal_ml: 2500,
  diet_type: '',
  allergies: [],
  disliked_foods: [],
}

export function readCachedProfileSettings(): CachedProfileSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_PROFILE_CACHE_KEY)
    if (!raw) return DEFAULT_SETTINGS_PROFILE
    const parsed = JSON.parse(raw) as Partial<CachedProfileSettings>
    return {
      username: typeof parsed.username === 'string' ? parsed.username : '',
      water_goal_ml:
        typeof parsed.water_goal_ml === 'number' && parsed.water_goal_ml >= 500 && parsed.water_goal_ml <= 8000
          ? parsed.water_goal_ml
          : 2500,
      diet_type: typeof parsed.diet_type === 'string' ? parsed.diet_type : '',
      allergies: Array.isArray(parsed.allergies) ? parsed.allergies.map(String).filter(Boolean) : [],
      disliked_foods: Array.isArray(parsed.disliked_foods) ? parsed.disliked_foods.map(String).filter(Boolean) : [],
    }
  } catch {
    return DEFAULT_SETTINGS_PROFILE
  }
}

export function saveCachedProfileSettings(patch: Partial<CachedProfileSettings>): CachedProfileSettings {
  const current = readCachedProfileSettings()
  const next: CachedProfileSettings = {
    username: patch.username !== undefined ? patch.username : current.username,
    water_goal_ml: patch.water_goal_ml !== undefined ? patch.water_goal_ml : current.water_goal_ml,
    diet_type: patch.diet_type !== undefined ? patch.diet_type : current.diet_type,
    allergies: patch.allergies !== undefined ? patch.allergies : current.allergies,
    disliked_foods: patch.disliked_foods !== undefined ? patch.disliked_foods : current.disliked_foods,
  }
  try {
    localStorage.setItem(SETTINGS_PROFILE_CACHE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota issues
  }
  return next
}

const EMPTY_PROFILE: BodyProfile = {
  weightKg: null,
  targetWeightKg: null,
  heightCm: null,
  age: null,
  sex: '',
}

function cleanPositiveNumber(value: unknown, min: number, max: number, decimals = 1): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (!Number.isFinite(num) || num < min || num > max) return null
  const factor = 10 ** decimals
  return Math.round(num * factor) / factor
}

export function readBodyProfile(): BodyProfile {
  try {
    const raw = localStorage.getItem(BODY_PROFILE_KEY)
    if (!raw) return EMPTY_PROFILE
    const parsed = JSON.parse(raw) as Partial<BodyProfile>
    return {
      weightKg: cleanPositiveNumber(parsed.weightKg, 20, 300, 1),
      targetWeightKg: cleanPositiveNumber(parsed.targetWeightKg, 20, 300, 1),
      heightCm: cleanPositiveNumber(parsed.heightCm, 100, 250, 0),
      age: cleanPositiveNumber(parsed.age, 12, 110, 0),
      sex: parsed.sex === 'm' || parsed.sex === 'f' ? parsed.sex : '',
    }
  } catch {
    return EMPTY_PROFILE
  }
}

export function saveBodyProfile(input: BodyProfile): BodyProfile {
  const sanitized: BodyProfile = {
    weightKg: cleanPositiveNumber(input.weightKg, 20, 300, 1),
    targetWeightKg: cleanPositiveNumber(input.targetWeightKg, 20, 300, 1),
    heightCm: cleanPositiveNumber(input.heightCm, 100, 250, 0),
    age: cleanPositiveNumber(input.age, 12, 110, 0),
    sex: input.sex === 'm' || input.sex === 'f' ? input.sex : '',
  }
  localStorage.setItem(BODY_PROFILE_KEY, JSON.stringify(sanitized))
  markCloudStateDirty()
  return sanitized
}

export function computeBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  return Math.round(bmi * 10) / 10
}
