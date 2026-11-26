import { User } from 'lucide-react'
import { getAvatarPalette, type ProfileAvatarConfig } from '@/features/profile/avatarStore'

export function ProfileAvatar({
  config,
  className = 'size-9',
}: {
  config: ProfileAvatarConfig
  className?: string
}) {
  const palette = getAvatarPalette(config.bgAccent)

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full border`}
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.ring,
        color: palette.icon,
      }}
      aria-hidden="true"
    >
      <User className="size-[52%]" strokeWidth={2} />
    </span>
  )
}
