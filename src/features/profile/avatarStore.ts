import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export type HairStyle = 'short' | 'wavy' | 'long' | 'bun' | 'bald'
export type HairColor = 'blonde' | 'brown' | 'black' | 'red' | 'gray'
export type BeardStyle = 'none' | 'short' | 'full'
export type EyeColor = 'brown' | 'blue' | 'green' | 'hazel' | 'gray'
export type SkinTone = 'fair' | 'light' | 'medium' | 'tan'
export type BgAccent = 'sky' | 'emerald' | 'amber' | 'slate'

export interface ProfileAvatarConfig {
  presetId: string | null
  hairStyle: HairStyle
  hairColor: HairColor
  beard: BeardStyle
  eyeColor: EyeColor
  skinTone: SkinTone
  bgAccent: BgAccent
}

export interface AvatarPreset {
  id: string
  label: string
  config: ProfileAvatarConfig
}

export const AVATAR_STORAGE_KEY = 'nutriflow:avatar-v1'

export const DEFAULT_AVATAR_CONFIG: ProfileAvatarConfig = {
  presetId: 'man-brown-beard',
  hairStyle: 'short',
  hairColor: 'brown',
  beard: 'short',
  eyeColor: 'brown',
  skinTone: 'light',
  bgAccent: 'sky',
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'man-brown-beard',
    label: 'Uomo castano + barba',
    config: {
      presetId: 'man-brown-beard',
      hairStyle: 'short',
      hairColor: 'brown',
      beard: 'full',
      eyeColor: 'brown',
      skinTone: 'light',
      bgAccent: 'sky',
    },
  },
  {
    id: 'man-blonde-clean',
    label: 'Uomo biondo',
    config: {
      presetId: 'man-blonde-clean',
      hairStyle: 'wavy',
      hairColor: 'blonde',
      beard: 'none',
      eyeColor: 'blue',
      skinTone: 'fair',
      bgAccent: 'emerald',
    },
  },
  {
    id: 'man-black-beard',
    label: 'Uomo moro + barba',
    config: {
      presetId: 'man-black-beard',
      hairStyle: 'short',
      hairColor: 'black',
      beard: 'short',
      eyeColor: 'hazel',
      skinTone: 'medium',
      bgAccent: 'slate',
    },
  },
  {
    id: 'woman-blonde',
    label: 'Donna bionda',
    config: {
      presetId: 'woman-blonde',
      hairStyle: 'long',
      hairColor: 'blonde',
      beard: 'none',
      eyeColor: 'blue',
      skinTone: 'fair',
      bgAccent: 'amber',
    },
  },
  {
    id: 'woman-brunette',
    label: 'Donna mora',
    config: {
      presetId: 'woman-brunette',
      hairStyle: 'long',
      hairColor: 'black',
      beard: 'none',
      eyeColor: 'green',
      skinTone: 'light',
      bgAccent: 'emerald',
    },
  },
  {
    id: 'woman-brown-bun',
    label: 'Donna castana',
    config: {
      presetId: 'woman-brown-bun',
      hairStyle: 'bun',
      hairColor: 'brown',
      beard: 'none',
      eyeColor: 'brown',
      skinTone: 'medium',
      bgAccent: 'sky',
    },
  },
  {
    id: 'woman-red-hazel',
    label: 'Donna rossa',
    config: {
      presetId: 'woman-red-hazel',
      hairStyle: 'wavy',
      hairColor: 'red',
      beard: 'none',
      eyeColor: 'green',
      skinTone: 'fair',
      bgAccent: 'amber',
    },
  },
  {
    id: 'man-bald-beard',
    label: 'Rasato + barba',
    config: {
      presetId: 'man-bald-beard',
      hairStyle: 'bald',
      hairColor: 'black',
      beard: 'full',
      eyeColor: 'gray',
      skinTone: 'tan',
      bgAccent: 'slate',
    },
  },
]

export function readProfileAvatar(): ProfileAvatarConfig {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (!raw) return DEFAULT_AVATAR_CONFIG
    const parsed = JSON.parse(raw) as Partial<ProfileAvatarConfig>
    return {
      presetId: typeof parsed.presetId === 'string' || parsed.presetId === null ? parsed.presetId : null,
      hairStyle: parsed.hairStyle ?? DEFAULT_AVATAR_CONFIG.hairStyle,
      hairColor: parsed.hairColor ?? DEFAULT_AVATAR_CONFIG.hairColor,
      beard: parsed.beard ?? DEFAULT_AVATAR_CONFIG.beard,
      eyeColor: parsed.eyeColor ?? DEFAULT_AVATAR_CONFIG.eyeColor,
      skinTone: parsed.skinTone ?? DEFAULT_AVATAR_CONFIG.skinTone,
      bgAccent: parsed.bgAccent ?? DEFAULT_AVATAR_CONFIG.bgAccent,
    }
  } catch {
    return DEFAULT_AVATAR_CONFIG
  }
}

export function saveProfileAvatar(config: ProfileAvatarConfig): ProfileAvatarConfig {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(config))
    markCloudStateDirty()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nutriflow:avatar-updated'))
    }
  } catch {
    // Ignore storage quota issues
  }
  return config
}
