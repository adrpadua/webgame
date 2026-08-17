import type { Card } from '@/engine'

// Inline SVG art for the play surface. Everything ships in the bundle — no
// asset pipeline, no network fetches — and inherits color from the parent
// via currentColor so the same mark works across tones and themes.

interface IconProps {
  className?: string
}

// Embermaw the Broodmother: a horned drake head over a flame.
export function BossEmblem({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none">
      <path d="M24 44c-7-4-12-9-12-17l4 3 2-8 6 6 6-6 2 8 4-3c0 8-5 13-12 17Z" fill="currentColor" opacity="0.35" />
      <path
        d="M10 10c3 1 5 3 6 5 2-2 5-3 8-3s6 1 8 3c1-2 3-4 6-5-1 4-2 6-4 8 1 2 2 4 2 6 0 7-5 12-12 12S12 31 12 24c0-2 1-4 2-6-2-2-3-4-4-8Z"
        fill="currentColor"
      />
      <circle cx="19" cy="22" r="2" fill="#09090b" />
      <circle cx="29" cy="22" r="2" fill="#09090b" />
      <path d="M21 30h6l-3 4-3-4Z" fill="#09090b" />
    </svg>
  )
}

// Elian Voss, the party's shield: a crested kite shield.
export function HeroEmblem({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none">
      <path d="M24 4 40 10v12c0 10-6 18-16 22C14 40 8 32 8 22V10L24 4Z" fill="currentColor" />
      <path d="M24 9 35 13v9c0 8-4.5 14-11 17.5C17.5 36 13 30 13 22v-9l11-4Z" fill="#09090b" opacity="0.55" />
      <path d="M24 14v22M16 24h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function SwordIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 16 13 7l3-4-4 3-9 9Z" fill="currentColor" stroke="none" />
      <path d="m11.5 11.5 3 3M6 12l2 2M4.5 15.5 3 17" />
    </svg>
  )
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      <path d="M10 2 17 4.5v5C17 14 14.2 17 10 18.5 5.8 17 3 14 3 9.5v-5L10 2Z" />
    </svg>
  )
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      <path d="M10 17S3 12.5 3 7.6C3 5 5 3.2 7.2 3.2c1.2 0 2.2.5 2.8 1.4.6-.9 1.6-1.4 2.8-1.4C15 3.2 17 5 17 7.6c0 4.9-7 9.4-7 9.4Z" />
    </svg>
  )
}

export function BootIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      <path d="M6 2h5v7l5 4v3H8l-2-3H4v-4l2-2V2Z" />
    </svg>
  )
}

export function HexIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 2 17 6v8l-7 4-7-4V6l7-4Z" strokeLinejoin="round" />
    </svg>
  )
}

// The dominant effect a card has, in display-priority order. Drives both the
// stat line and the vignette so a card's art always matches what it does.
export type CardEffect = 'attack' | 'guard' | 'heal' | 'utility'

export function cardEffect(card: Card): CardEffect {
  if (card.damage > 0 || card.boss_damage > 0) {
    return 'attack'
  }
  if (card.armor_delta > 0) {
    return 'guard'
  }
  if (card.healing > 0) {
    return 'heal'
  }
  // No primary effect. No authored card lands here today; the bucket exists
  // so the union stays total for a future pure-utility card.
  return 'utility'
}

export const CARD_EFFECT_TONE: Record<CardEffect, { text: string; icon: typeof SwordIcon }> = {
  attack: { text: 'text-rose-400', icon: SwordIcon },
  guard: { text: 'text-glass-400', icon: ShieldIcon },
  heal: { text: 'text-ceramic-300', icon: HeartIcon },
  utility: { text: 'text-zinc-300', icon: HexIcon },
}

// One-glance stat line for a Compact Card: the card's primary numbers, e.g.
// "+4 Armor" or "2 dmg". Falls back to the tag family when a card is pure
// utility.
export function cardStatLine(card: Card): string {
  const parts: string[] = []
  if (card.damage > 0) {
    parts.push(`${card.damage} dmg`)
  }
  if (card.boss_damage > 0) {
    parts.push(`${card.boss_damage} boss dmg`)
  }
  if (card.armor_delta > 0) {
    parts.push(`+${card.armor_delta} Armor`)
  }
  if (card.healing > 0) {
    parts.push(`Heal ${card.healing}`)
  }
  return parts.join(' · ')
}

const VIGNETTE_TONE: Record<CardEffect, { from: string; glyph: string }> = {
  attack: { from: 'from-rose-950', glyph: 'text-rose-500' },
  guard: { from: 'from-glass-950', glyph: 'text-glass-500' },
  heal: { from: 'from-ceramic-950', glyph: 'text-ceramic-400' },
  utility: { from: 'from-zinc-900', glyph: 'text-zinc-400' },
}

// Card art vignette: an effect-toned panel with the effect glyph as a large
// watermark. Stands in for per-card painted art while staying meaningful —
// the color and glyph tell you what the card does before you read it.
export function CardArt({ card, className }: { card: Card; className?: string }) {
  const effect = cardEffect(card)
  const tone = VIGNETTE_TONE[effect]
  const Glyph = CARD_EFFECT_TONE[effect].icon
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-linear-to-br ${tone.from} via-zinc-900 to-zinc-950 ${className ?? ''}`}
    >
      <Glyph className={`h-14 w-14 ${tone.glyph} opacity-70`} />
      <div className="absolute inset-x-0 bottom-1 text-center text-[9px] tracking-[0.3em] text-zinc-600 uppercase">{effect}</div>
    </div>
  )
}
