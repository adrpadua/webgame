import type { Card } from '@/engine'

// Inline SVG art for the play surface. Everything ships in the bundle — no
// asset pipeline, no network fetches — and inherits color from the parent
// via currentColor so the same mark works across tones and themes.

interface IconProps {
  className?: string
}

// The lock head on a Slot: living gold, keyhole cut, inside a ward ring.
// The ring is the glance-distance Primed signal — broken while the Slot
// charges, closed at full stack with a second faint ring outside it. That
// outer ring is bloom drawn as a concentric line rather than a blur, which is
// how it survives flat cel shading: a lock seating is the one gold bloom the
// interface direction permits. A ring closing is a shape change, so it reads
// in peripheral vision and without colour, where a brighter gold would not.
//
// Spent — fired this window — reopens the ring, dulls the head, and draws one
// runeglass strike across it: what a player is about to lose, not what they
// are holding. Primed and Spent share a full Charge Stack and mean opposite
// things, so they cannot share a picture (CONTEXT.md, Primed).
export type LockState = 'empty' | 'open' | 'charging' | 'primed' | 'spent'

export function LockHead({ state, className }: IconProps & { state: LockState }) {
  const head = state === 'primed' ? '#c8a344' : state === 'charging' ? '#a98b39' : state === 'spent' ? '#6a5a2e' : '#6e7b93'
  const ring = state === 'primed' ? '#c8a344' : state === 'charging' ? '#c8a344' : state === 'spent' ? '#5a5238' : '#5e6b82'
  return (
    <svg viewBox="0 0 22 22" className={className} aria-hidden="true" data-lock-state={state}>
      {state === 'primed' && <circle cx="11" cy="11" r="10" fill="none" stroke="#c8a344" strokeWidth="1" opacity="0.34" />}
      <circle
        cx="11"
        cy="11"
        r="8.4"
        fill="none"
        stroke={ring}
        strokeWidth="1.5"
        strokeDasharray={state === 'primed' ? undefined : state === 'charging' ? '8 4' : '7 5'}
      />
      <circle cx="11" cy="11" r="6.2" fill={head} />
      <path d="M11 7.6a1.7 1.7 0 0 0-.8 3.2l-.7 3.4h3l-.7-3.4A1.7 1.7 0 0 0 11 7.6Z" fill="#141b27" />
      {state === 'spent' && <path d="M4 18 18 4" stroke="#62d2e6" strokeWidth="1.4" opacity="0.85" />}
    </svg>
  )
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

// --- The Round track's five windows --------------------------------------
// Flat marks, one per phase, so the HUD's phase row can drop its words: five
// labels never fit a phone's width and the last one was always cut off. Each
// silhouette says what its window is for — cards set out, the Boss's
// immediate strike, your fast window, the telegraphed beat landing, the slow
// mechanism — and each is distinct at 18px, where a colour difference alone
// would not be. They are paired with their words in the How to Play guide,
// via PHASE_TRACK; see phaseTrack.tsx.

// Loadout: two cards set out, nothing fired.
export function DeckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      <rect x="2" y="6" width="8" height="11" rx="1.5" opacity="0.55" />
      <rect x="9" y="3" width="9" height="11" rx="1.5" />
    </svg>
  )
}

// Boss Instant: it lands the moment the window opens.
export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      <path d="M11.6 2 4 11.4h4.2L7.9 18l7.6-9.4h-4.2L11.6 2Z" />
    </svg>
  )
}

// Quick Window: yours, and fast.
export function SwiftIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 5 5 5-5 5M11 5l5 5-5 5" />
    </svg>
  )
}

// Boss Incoming: the telegraphed beat coming down on the board.
export function ImpactIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2.5v8.5M5.5 7.5 10 12l4.5-4.5M4 16.5h12" />
    </svg>
  )
}

// Slow Window: yours again, on the mechanism you wound up.
export function HourglassIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      <path d="M4.5 3h11v1.7h-11zM4.5 15.3h11V17h-11z" />
      <path d="M6.3 4.7h7.4L10 10l3.7 5.3H6.3L10 10 6.3 4.7Z" />
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
  attack: { text: 'text-coral-400', icon: SwordIcon },
  guard: { text: 'text-glass-400', icon: ShieldIcon },
  heal: { text: 'text-ceramic-300', icon: HeartIcon },
  utility: { text: 'text-ceramic-400', icon: HexIcon },
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
  attack: { from: 'from-coral-950', glyph: 'text-coral-500' },
  guard: { from: 'from-glass-950', glyph: 'text-glass-500' },
  heal: { from: 'from-ceramic-950', glyph: 'text-ceramic-400' },
  utility: { from: 'from-steel-950', glyph: 'text-steel-400' },
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
      className={`relative flex items-center justify-center overflow-hidden bg-linear-to-br ${tone.from} via-steel-950 to-navy-950 ${className ?? ''}`}
    >
      <Glyph className={`h-14 w-14 ${tone.glyph} opacity-70`} />
      <div className="absolute inset-x-0 bottom-1 text-center text-[9px] tracking-[0.3em] text-steel-600 uppercase">{effect}</div>
    </div>
  )
}
