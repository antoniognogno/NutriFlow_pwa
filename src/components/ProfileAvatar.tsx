import BoringAvatar from 'boring-avatars'
import { BORING_PALETTES, type ProfileAvatarConfig } from '@/features/profile/avatarStore'

const HAIR_PALETTE: Record<ProfileAvatarConfig['hairColor'], string> = {
  blonde: '#e5b94c',
  brown: '#6b4226',
  black: '#1e293b',
  red: '#b44c26',
  gray: '#94a3b8',
}

const SKIN_PALETTE: Record<ProfileAvatarConfig['skinTone'], { base: string; shadow: string }> = {
  fair: { base: '#fbdcc4', shadow: '#ebbca0' },
  light: { base: '#f1c29d', shadow: '#dba27a' },
  medium: { base: '#d99b6c', shadow: '#be7d50' },
  tan: { base: '#a66a44', shadow: '#895232' },
}

const EYE_PALETTE: Record<ProfileAvatarConfig['eyeColor'], string> = {
  brown: '#4e311d',
  blue: '#2b8cbe',
  green: '#1e8c5a',
  hazel: '#9a6b24',
  gray: '#5c6e7e',
}

const BG_PALETTE: Record<ProfileAvatarConfig['bgAccent'], { bg: string; ring: string }> = {
  sky: { bg: '#0f2738', ring: '#7aa6bd' },
  emerald: { bg: '#0c2a24', ring: '#34d399' },
  amber: { bg: '#2c1f0e', ring: '#f59e0b' },
  slate: { bg: '#16202c', ring: '#91a2ae' },
}

export function ProfileAvatar({
  config,
  className = 'size-9',
}: {
  config: ProfileAvatarConfig
  className?: string
}) {
  const backdrop = BG_PALETTE[config.bgAccent]

  if (config.renderMode === 'boring') {
    return (
      <span
        className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full`}
        style={{ boxShadow: `0 0 0 2px ${backdrop.ring}` }}
        aria-hidden="true"
      >
        <BoringAvatar
          size="100%"
          name={config.boringSeed || 'NutriFlow'}
          variant={config.boringVariant ?? 'beam'}
          colors={BORING_PALETTES[config.bgAccent]}
        />
      </span>
    )
  }

  const hair = HAIR_PALETTE[config.hairColor]
  const skin = SKIN_PALETTE[config.skinTone]
  const eyes = EYE_PALETTE[config.eyeColor]

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} shrink-0 rounded-full`}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="31" fill={backdrop.bg} stroke={backdrop.ring} strokeWidth="2" />

      {config.hairStyle === 'long' && (
        <path
          d="M15 28 C14 14, 50 14, 49 28 L51 50 C44 54, 20 54, 13 50 Z"
          fill={hair}
        />
      )}
      {config.hairStyle === 'bun' && (
        <>
          <circle cx="32" cy="11" r="8" fill={hair} />
          <path d="M17 27 C17 15, 47 15, 47 27 L47 36 L17 36 Z" fill={hair} />
        </>
      )}

      <path d="M12 60 C15 47, 49 47, 52 60 Z" fill={backdrop.ring} opacity="0.88" />
      <rect x="27" y="40" width="10" height="10" rx="4" fill={skin.shadow} />

      <circle cx="18.5" cy="31" r="3.4" fill={skin.shadow} />
      <circle cx="45.5" cy="31" r="3.4" fill={skin.shadow} />
      <rect x="19" y="17" width="26" height="28" rx="13" fill={skin.base} />

      {config.hairStyle === 'short' && (
        <path
          d="M18 27 C18 15, 46 15, 46 27 C43 21, 21 21, 18 27 Z"
          fill={hair}
        />
      )}
      {config.hairStyle === 'wavy' && (
        <path
          d="M17 28 C16 14, 48 13, 47 28 C44 23, 39 20, 32 22 C26 20, 21 23, 17 28 Z"
          fill={hair}
        />
      )}
      {config.hairStyle === 'long' && (
        <path
          d="M17 27 C19 16, 45 16, 47 27 C40 21, 24 21, 17 27 Z"
          fill={hair}
        />
      )}
      {config.hairStyle === 'bun' && (
        <path d="M18 26 C20 17, 44 17, 46 26 C40 22, 24 22, 18 26 Z" fill={hair} />
      )}

      <path d="M23 26 Q26 24.5 29 26" stroke={hair} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M35 26 Q38 24.5 41 26" stroke={hair} strokeWidth="1.6" strokeLinecap="round" fill="none" />

      <circle cx="26" cy="30" r="2.7" fill="#ffffff" />
      <circle cx="38" cy="30" r="2.7" fill="#ffffff" />
      <circle cx="26" cy="30" r="1.75" fill={eyes} />
      <circle cx="38" cy="30" r="1.75" fill={eyes} />
      <circle cx="26.5" cy="29.4" r="0.6" fill="#ffffff" />
      <circle cx="38.5" cy="29.4" r="0.6" fill="#ffffff" />

      <path d="M32 30.5 L31 34.5 L33 35" stroke={skin.shadow} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M28 38 Q32 41 36 38" stroke="#8a4b43" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {config.beard === 'short' && (
        <path
          d="M20 34 C20 43, 44 43, 44 34 C43 40, 21 40, 20 34 Z"
          fill={hair}
          opacity="0.45"
        />
      )}
      {config.beard === 'full' && (
        <path
          d="M19 32 C18 44, 46 44, 45 32 L43 39 C40 46, 24 46, 21 39 Z"
          fill={hair}
        />
      )}
      {config.beard === 'full' && (
        <path d="M28 38 Q32 40.5 36 38" stroke="#f8fafc" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      )}
    </svg>
  )
}
