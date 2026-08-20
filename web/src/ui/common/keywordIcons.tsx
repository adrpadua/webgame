import { HeartIcon, HexIcon, ShieldIcon, SwordIcon } from './icons'

// Keyword glyphs.
//
// A Keyword is a hook: it does nothing on the card that carries it and
// everything where it meets a Top Card's Charge Modifier. That makes it the
// Hero's own vocabulary rather than the game's — Elian's Guard is a gate
// plate seating, and another Hero's Guard is whatever their object does — so
// the marks are keyed by Hero. A Hero with no authored set falls back to the
// neutral marks below rather than borrowing someone else's identity.
//
// The set is one family on purpose: open line art at a single weight, which
// separates it at a glance from the filled effect icons on the same card.

interface IconProps {
  className?: string
}

export type KeywordIcon = (props: IconProps) => React.ReactElement

function glyph(path: React.ReactNode): KeywordIcon {
  return function Glyph({ className }: IconProps) {
    return (
      <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    )
  }
}

// Elian Voss, Shield Wall: the folding Gate Rig. Every mark is a part of that
// object doing its job — the panel, the buttress, the plug, the brace.
const GUARDIAN_KEYWORDS: Record<string, KeywordIcon> = {
  // The gate panel itself, ribbed down the middle.
  guard: glyph(
    <>
      <path d="M4 4h12v7c0 3-2.6 4.7-6 5.5C6.6 15.7 4 14 4 11V4Z" />
      <path d="M10 4v12.2" />
    </>,
  ),
  // A shield boss driven forward: the Tank's attack is a slam, not a blade.
  attack: glyph(
    <>
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.6v2.4M10 15v2.4M2.6 10H5M15 10h2.4M4.8 4.8 6.5 6.5M13.5 13.5l1.7 1.7M15.2 4.8 13.5 6.5M6.5 13.5l-1.7 1.7" />
    </>,
  ),
  // The buttress: an arch planted on the ground, holding the line.
  tank: glyph(
    <>
      <path d="M7 16V8a3 3 0 0 1 6 0v8" />
      <path d="M3.5 16h13" />
    </>,
  ),
  // The plug turning: setup and pressure in the same motion.
  tempo: glyph(
    <>
      <path d="M15.6 7.4A6 6 0 1 0 16 10" />
      <path d="M15.6 3.8v3.6H12" />
      <circle cx="10" cy="10" r="1.4" />
    </>,
  ),
  // The challenge called out: a horn, and the sound leaving it.
  threat: glyph(
    <>
      <path d="M5 8.2v3.6l6 3.2V5L5 8.2Z" />
      <path d="M14.2 7.6c1.1 1.4 1.1 3.4 0 4.8M16.8 5.4c2 2.6 2 6.6 0 9.2" />
    </>,
  ),
  // Ground claimed and held.
  board: glyph(
    <>
      <path d="M10 2.4 16.6 6v8L10 17.6 3.4 14V6L10 2.4Z" />
      <path d="M10 7.2 12.6 10 10 12.8 7.4 10 10 7.2Z" fill="currentColor" stroke="none" />
    </>,
  ),
  // Tumblers seating one after another: power that stacks.
  growth: glyph(<path d="M5 15.5v-3M10 15.5v-6.5M15 15.5v-10" />),
  // The gate catching a blow and turning it aside.
  reaction: glyph(
    <>
      <path d="M5.5 3.4v13.2" />
      <path d="M16.5 5 10 10l6.5 5" />
    </>,
  ),
  // Plates braced into one another: the party held together.
  support: glyph(
    <>
      <path d="M8.4 4.6H5.2v10.8h3.2M11.6 4.6h3.2v10.8h-3.2" />
      <path d="M7.8 10h4.4" />
    </>,
  ),
}

// A Hero without an authored set gets the game's neutral marks: the shared
// effect icons where one already means the same thing, and a plain runeglass
// pip everywhere else. It is deliberately impersonal — a keyword mark that
// reads as somebody else's object is worse than one that reads as none.
const NEUTRAL_KEYWORD = glyph(<path d="M10 3.4 16.6 10 10 16.6 3.4 10 10 3.4Z" />)

const NEUTRAL_KEYWORDS: Record<string, KeywordIcon> = {
  attack: SwordIcon,
  guard: ShieldIcon,
  support: HeartIcon,
  board: HexIcon,
}

const HERO_KEYWORDS: Record<string, Record<string, KeywordIcon>> = {
  guardian: GUARDIAN_KEYWORDS,
}

export function keywordIcon(heroId: string, keywordId: string): KeywordIcon {
  return HERO_KEYWORDS[heroId]?.[keywordId] ?? NEUTRAL_KEYWORDS[keywordId] ?? NEUTRAL_KEYWORD
}

// Stamina: one card, one hex. The mark is a gate plate stepping — a boot
// print inside the plate's own silhouette — so movement reads as the Hero's
// own mechanism rather than as a generic arrow.
export function StaminaIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.4 2.8h7.2v9.4l3 3.4v1.6H8.8L6.4 14H3.4v-4l3-2.6V2.8Z" />
      <path d="M6.4 7.4h7.2" />
    </svg>
  )
}
