'use client'

import { useState } from 'react'
import { SlidersHorizontal, Sparkles, Users } from 'lucide-react'
import { ProfileAvatar } from '@/components/ProfileAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { containsCodeOrSql } from '@/lib/authSecurity'
import {
  AVATAR_PRESETS,
  type BeardStyle,
  type BgAccent,
  type BoringAvatarVariant,
  type EyeColor,
  type HairColor,
  type HairStyle,
  type ProfileAvatarConfig,
  type SkinTone,
} from './avatarStore'

const BORING_VARIANTS: Array<{ id: BoringAvatarVariant; label: string }> = [
  { id: 'beam', label: 'Beam' },
  { id: 'marble', label: 'Marble' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'bauhaus', label: 'Bauhaus' },
  { id: 'ring', label: 'Ring' },
  { id: 'pixel', label: 'Pixel' },
]

const HAIR_STYLES: Array<{ id: HairStyle; label: string }> = [
  { id: 'short', label: 'Corti' },
  { id: 'wavy', label: 'Mossi' },
  { id: 'long', label: 'Lunghi' },
  { id: 'bun', label: 'Raccolti' },
  { id: 'bald', label: 'Rasato' },
]

const HAIR_COLORS: Array<{ id: HairColor; label: string; swatch: string }> = [
  { id: 'blonde', label: 'Biondi', swatch: '#e5b94c' },
  { id: 'brown', label: 'Castani', swatch: '#6b4226' },
  { id: 'black', label: 'Neri', swatch: '#1e293b' },
  { id: 'red', label: 'Rossi', swatch: '#b44c26' },
  { id: 'gray', label: 'Grigi', swatch: '#94a3b8' },
]

const BEARDS: Array<{ id: BeardStyle; label: string }> = [
  { id: 'none', label: 'No barba' },
  { id: 'short', label: 'Barba corta' },
  { id: 'full', label: 'Barba folta' },
]

const EYES: Array<{ id: EyeColor; label: string; swatch: string }> = [
  { id: 'brown', label: 'Marroni', swatch: '#4e311d' },
  { id: 'blue', label: 'Azzurri', swatch: '#2b8cbe' },
  { id: 'green', label: 'Verdi', swatch: '#1e8c5a' },
  { id: 'hazel', label: 'Nocciola', swatch: '#9a6b24' },
  { id: 'gray', label: 'Grigi', swatch: '#5c6e7e' },
]

const SKINS: Array<{ id: SkinTone; swatch: string; label: string }> = [
  { id: 'fair', swatch: '#fbdcc4', label: 'Chiara' },
  { id: 'light', swatch: '#f1c29d', label: 'Media chiara' },
  { id: 'medium', swatch: '#d99b6c', label: 'Olivastra' },
  { id: 'tan', swatch: '#a66a44', label: 'Scura' },
]

const BACKDROPS: Array<{ id: BgAccent; label: string; swatch: string }> = [
  { id: 'sky', label: 'Oceano', swatch: '#7aa6bd' },
  { id: 'emerald', label: 'Smeraldo', swatch: '#34d399' },
  { id: 'amber', label: 'Ambra', swatch: '#f59e0b' },
  { id: 'slate', label: 'Grafite', swatch: '#91a2ae' },
]

export function AvatarCustomizer({
  value,
  onChange,
}: {
  value: ProfileAvatarConfig
  onChange: (next: ProfileAvatarConfig) => void
}) {
  const [mode, setMode] = useState<'preset' | 'advanced' | 'boring'>(() =>
    value.renderMode === 'boring' ? 'boring' : 'preset',
  )

  const updateField = <K extends keyof ProfileAvatarConfig>(key: K, fieldVal: ProfileAvatarConfig[K]) => {
    onChange({
      ...value,
      renderMode: 'portrait',
      presetId: null,
      [key]: fieldVal,
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3 dark:bg-[#111f2c]/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <ProfileAvatar config={value} className="size-12" />
          <div>
            <p className="text-xs font-semibold text-foreground">Foto / Icona Profilo</p>
            <p className="text-[11px] text-muted-foreground">Ritratto SVG o Boring Avatars</p>
          </div>
        </div>
        <div className="inline-flex flex-wrap rounded-xl border border-border/60 bg-background/60 p-0.5">
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
              mode === 'preset' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
            }`}
          >
            <Users className="size-3" />
            Preset
          </button>
          <button
            type="button"
            onClick={() => setMode('advanced')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
              mode === 'advanced' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
            }`}
          >
            <SlidersHorizontal className="size-3" />
            Avanzata
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('boring')
              onChange({
                ...value,
                renderMode: 'boring',
                boringVariant: value.boringVariant ?? 'beam',
                boringSeed: value.boringSeed || 'NutriFlow',
              })
            }}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
              mode === 'boring' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
            }`}
          >
            <Sparkles className="size-3" />
            Geometrico
          </button>
        </div>
      </div>

      {mode === 'preset' ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {AVATAR_PRESETS.map(preset => {
            const active = value.renderMode !== 'boring' && value.presetId === preset.id
            return (
              <Button
                key={preset.id}
                type="button"
                variant={active ? 'secondary' : 'outline'}
                onClick={() => onChange({ ...preset.config, renderMode: 'portrait' })}
                className={`h-auto min-w-0 flex-col gap-1 rounded-xl px-1.5 py-2 text-[11px] whitespace-normal ${
                  active ? 'border-primary/50 bg-primary/15 text-primary' : ''
                }`}
              >
                <ProfileAvatar config={preset.config} className="size-9" />
                <span className="line-clamp-1 w-full text-center font-medium leading-tight">
                  {preset.label}
                </span>
              </Button>
            )
          })}
        </div>
      ) : mode === 'boring' ? (
        <div className="space-y-2.5 text-xs">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Stile Boring Avatars (SVG leggero)</p>
            <div className="flex flex-wrap gap-1.5">
              {BORING_VARIANTS.map(item => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={value.boringVariant === item.id ? 'secondary' : 'outline'}
                  onClick={() =>
                    onChange({
                      ...value,
                      renderMode: 'boring',
                      presetId: null,
                      boringVariant: item.id,
                    })
                  }
                  className={`h-8 gap-1.5 rounded-lg px-2.5 text-[11px] ${
                    value.boringVariant === item.id ? 'border-primary/40 bg-primary/15 text-primary' : ''
                  }`}
                >
                  <ProfileAvatar
                    config={{ ...value, renderMode: 'boring', boringVariant: item.id }}
                    className="size-4"
                  />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Seme / Variante</p>
              <Input
                value={value.boringSeed ?? 'NutriFlow'}
                maxLength={32}
                placeholder="Es. Antonio, Atleta..."
                className="h-9 text-xs"
                onChange={e => {
                  const raw = e.target.value
                  if (containsCodeOrSql(raw)) return
                  onChange({
                    ...value,
                    renderMode: 'boring',
                    presetId: null,
                    boringSeed: raw,
                  })
                }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Palette colori</p>
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                {BACKDROPS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    onClick={() =>
                      onChange({
                        ...value,
                        renderMode: 'boring',
                        presetId: null,
                        bgAccent: item.id,
                      })
                    }
                    className={`h-8 rounded-lg border transition-transform active:scale-95 ${
                      value.bgAccent === item.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'
                    }`}
                    style={{ backgroundColor: item.swatch }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 text-xs">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Taglio capelli</p>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_STYLES.map(item => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={value.hairStyle === item.id ? 'secondary' : 'outline'}
                  onClick={() => updateField('hairStyle', item.id)}
                  className={`h-8 rounded-lg px-2.5 text-[11px] ${
                    value.hairStyle === item.id ? 'border-primary/40 bg-primary/15 text-primary' : ''
                  }`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Colore capelli</p>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_COLORS.map(item => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={value.hairColor === item.id ? 'secondary' : 'outline'}
                  onClick={() => updateField('hairColor', item.id)}
                  className={`h-8 gap-1.5 rounded-lg px-2.5 text-[11px] ${
                    value.hairColor === item.id ? 'border-primary/40 bg-primary/15 text-primary' : ''
                  }`}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.swatch }} />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Barba</p>
            <div className="flex flex-wrap gap-1.5">
              {BEARDS.map(item => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={value.beard === item.id ? 'secondary' : 'outline'}
                  onClick={() => updateField('beard', item.id)}
                  className={`h-8 rounded-lg px-2.5 text-[11px] ${
                    value.beard === item.id ? 'border-primary/40 bg-primary/15 text-primary' : ''
                  }`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Colore occhi</p>
            <div className="flex flex-wrap gap-1.5">
              {EYES.map(item => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={value.eyeColor === item.id ? 'secondary' : 'outline'}
                  onClick={() => updateField('eyeColor', item.id)}
                  className={`h-8 gap-1.5 rounded-lg px-2.5 text-[11px] ${
                    value.eyeColor === item.id ? 'border-primary/40 bg-primary/15 text-primary' : ''
                  }`}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.swatch }} />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Carnagione</p>
              <div className="grid grid-cols-4 gap-1">
                {SKINS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    onClick={() => updateField('skinTone', item.id)}
                    className={`h-7 rounded-lg border transition-transform active:scale-95 ${
                      value.skinTone === item.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'
                    }`}
                    style={{ backgroundColor: item.swatch }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Cornice</p>
              <div className="grid grid-cols-4 gap-1">
                {BACKDROPS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    onClick={() => updateField('bgAccent', item.id)}
                    className={`h-7 rounded-lg border transition-transform active:scale-95 ${
                      value.bgAccent === item.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'
                    }`}
                    style={{ backgroundColor: item.swatch }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
