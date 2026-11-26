'use client'

import { Check } from 'lucide-react'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import {
  AVATAR_COLOR_OPTIONS,
  getAvatarPalette,
  type ProfileAvatarConfig,
} from './avatarStore'

export function AvatarCustomizer({
  value,
  onChange,
}: {
  value: ProfileAvatarConfig
  onChange: (next: ProfileAvatarConfig) => void
}) {
  const current = getAvatarPalette(value.bgAccent)

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3 dark:bg-[#111f2c]/60">
      <div className="flex items-center gap-3">
        <ProfileAvatar config={value} className="size-11" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Colore avatar</p>
          <p className="text-[11px] text-muted-foreground">Selezionato: {current.label}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {AVATAR_COLOR_OPTIONS.map(option => {
          const active = value.bgAccent === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-label={`Colore avatar ${option.label}`}
              aria-pressed={active}
              onClick={() => onChange({ bgAccent: option.id })}
              className={`flex h-9 items-center justify-center rounded-xl border transition-transform active:scale-95 ${
                active
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'border-border/70 opacity-90 hover:opacity-100'
              }`}
              style={{
                backgroundColor: option.bg,
                borderColor: option.ring,
                color: option.icon,
              }}
            >
              {active ? (
                <Check className="size-4" strokeWidth={2.5} />
              ) : (
                <span className="size-3 rounded-full" style={{ backgroundColor: option.ring }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
