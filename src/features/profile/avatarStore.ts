import { markCloudStateDirty } from '@/features/offline/cloudStateSync'

export type AvatarColorId =
  | 'sky'
  | 'emerald'
  | 'cyan'
  | 'amber'
  | 'violet'
  | 'rose'
  | 'indigo'
  | 'slate'

export type BgAccent = AvatarColorId

export interface ProfileAvatarConfig {
  bgAccent: AvatarColorId
}

export interface AvatarColorOption {
  id: AvatarColorId
  label: string
  bg: string
  ring: string
  icon: string
}

export const AVATAR_COLOR_OPTIONS: AvatarColorOption[] = [
  { id: 'sky', label: 'Oceano', bg: '#0f2738', ring: '#7aa6bd', icon: '#9cc5da' },
  { id: 'emerald', label: 'Smeraldo', bg: '#0c2a24', ring: '#34d399', icon: '#6ee7b7' },
  { id: 'cyan', label: 'Ciano', bg: '#0c2536', ring: '#38bdf8', icon: '#7dd3fc' },
  { id: 'amber', label: 'Ambra', bg: '#2c1f0e', ring: '#f59e0b', icon: '#fcd34d' },
  { id: 'violet', label: 'Viola', bg: '#21193b', ring: '#a78bfa', icon: '#c4b5fd' },
  { id: 'rose', label: 'Corallo', bg: '#33151e', ring: '#fb7185', icon: '#fda4af' },
  { id: 'indigo', label: 'Indaco', bg: '#171c3a', ring: '#818cf8', icon: '#a5b4fc' },
  { id: 'slate', label: 'Grafite', bg: '#16202c', ring: '#91a2ae', icon: '#cbd5e1' },
]

export const AVATAR_STORAGE_KEY = 'nutriflow:avatar-v1'

export const DEFAULT_AVATAR_CONFIG: ProfileAvatarConfig = {
  bgAccent: 'sky',
}

const VALID_COLORS = new Set<AvatarColorId>(AVATAR_COLOR_OPTIONS.map(c => c.id))

export function getAvatarPalette(colorId?: AvatarColorId): AvatarColorOption {
  return AVATAR_COLOR_OPTIONS.find(c => c.id === colorId) ?? AVATAR_COLOR_OPTIONS[0]
}

export function readProfileAvatar(): ProfileAvatarConfig {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (!raw) return DEFAULT_AVATAR_CONFIG
    const parsed = JSON.parse(raw) as { bgAccent?: unknown }
    const bgAccent =
      typeof parsed.bgAccent === 'string' && VALID_COLORS.has(parsed.bgAccent as AvatarColorId)
        ? (parsed.bgAccent as AvatarColorId)
        : DEFAULT_AVATAR_CONFIG.bgAccent
    return { bgAccent }
  } catch {
    return DEFAULT_AVATAR_CONFIG
  }
}

export function saveProfileAvatar(config: ProfileAvatarConfig): ProfileAvatarConfig {
  const normalized: ProfileAvatarConfig = {
    bgAccent: VALID_COLORS.has(config.bgAccent) ? config.bgAccent : DEFAULT_AVATAR_CONFIG.bgAccent,
  }
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(normalized))
    markCloudStateDirty()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nutriflow:avatar-updated'))
    }
  } catch {
    // Ignore storage quota issues
  }
  return normalized
}
