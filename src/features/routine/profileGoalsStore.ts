import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export interface BodyProfile {
  weightKg: number | null
  targetWeightKg: number | null
  heightCm: number | null
  age: number | null
  sex: 'm' | 'f' | ''
}

export const BODY_PROFILE_KEY = 'nutriflow:body-profile-v1'

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
