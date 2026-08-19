import type { ComponentType } from 'react'
import type { Phase } from '@/engine'
import type { HoldDetail } from './HoldPopover'
import { BoltIcon, DeckIcon, HourglassIcon, ImpactIcon, SwiftIcon } from './icons'

// The Round's five windows in one table: a mark, a word, an owner, and the
// tones for every state the HUD wears it in.
//
// The owner is the fact the row exists to show — coral Instant and Incoming
// are the Boss's, runeglass Quick and living-gold Slow are yours, steel
// Loadout is setup. It used to be spoken only by the live window's tint,
// which meant four-fifths of the row said nothing: every resting mark was
// the same steel, and a player could not see the Round's shape — strike,
// answer, strike, answer — without advancing through it. Now every mark
// wears its owner at rest (a dim step of the same tone the live state uses),
// and carries a wedge that says the same thing without colour: the Boss's
// windows point down at the board, yours point up from it. Loadout carries
// no wedge — nothing fires there, and the blank is the signal.
//
// The mark says what the window is for. The live window is not a tinted mark
// but a lit chip — a raked plate in the owner's material with the window's
// word on it — so "you are here" is a shape, a word, and a face, not an 18px
// hue shift. Only the live word is printed, which is what lets a word onto
// the row at all: five words never fit a phone's width, one always does.
//
// The How to Play guide's timeline shows the same marks WITH their words and
// wedges, so the tutorial is where a player learns to read the row. Both
// render from this table, so the guide can never teach a mark the HUD does
// not wear. The Phase Banner names each window as it opens, from the same
// titles.

// Who acts in a window. 'setup' is Loadout: the player operates it, but
// nothing strikes and nothing fires, so it sits outside the strike/answer
// alternation the wedges draw.
export type PhaseOwner = 'setup' | 'boss' | 'player'

export interface PhaseMark {
  phase: Phase
  label: string
  // The window's full name — "Boss Incoming", not "Incoming" — for the
  // places with room for a sentence: the Phase Banner and the track's
  // accessible name.
  title: string
  owner: PhaseOwner
  Icon: ComponentType<{ className?: string }>
  // What the mark wears while its window is the live one.
  activeClass: string
  // The rule under the live mark in the diagrams — the same tone as the
  // active state, as a bar.
  barClass: string
  // What the mark wears at rest: a dim step of its owner's tone, so the
  // Round's shape reads before any window opens. Each rest step clears the
  // 3:1 non-text floor on the band's steel-950 ground while staying under
  // the lit chip, so the live window still wins the row.
  restClass: string
  // The live chip's face: the owner's material lit, with the face's own
  // 950-step ink, which is the pairing every lit plate in the chrome uses.
  faceClass: string
}

export const PHASE_TRACK: PhaseMark[] = [
  {
    phase: 'loadout',
    label: 'Loadout',
    title: 'Loadout',
    owner: 'setup',
    Icon: DeckIcon,
    activeClass: 'text-ceramic-200',
    barClass: 'bg-ceramic-300',
    restClass: 'text-steel-500',
    faceClass: 'wb-face-ceramic text-ceramic-950',
  },
  {
    phase: 'instant',
    label: 'Instant',
    title: 'Boss Instant',
    owner: 'boss',
    Icon: BoltIcon,
    activeClass: 'text-coral-300',
    barClass: 'bg-coral-400',
    restClass: 'text-coral-500',
    faceClass: 'wb-face-coral text-coral-950',
  },
  {
    phase: 'quick',
    label: 'Quick',
    title: 'Quick Window',
    owner: 'player',
    Icon: SwiftIcon,
    activeClass: 'text-glass-300',
    barClass: 'bg-glass-400',
    restClass: 'text-glass-600',
    faceClass: 'wb-face-glass text-glass-950',
  },
  {
    phase: 'incoming',
    label: 'Incoming',
    title: 'Boss Incoming',
    owner: 'boss',
    Icon: ImpactIcon,
    activeClass: 'text-coral-300',
    barClass: 'bg-coral-400',
    restClass: 'text-coral-500',
    faceClass: 'wb-face-coral text-coral-950',
  },
  {
    phase: 'slow',
    label: 'Slow',
    title: 'Slow Window',
    owner: 'player',
    Icon: HourglassIcon,
    activeClass: 'text-gold-300',
    barClass: 'bg-gold-400',
    restClass: 'text-gold-600',
    faceClass: 'wb-face-gold text-gold-950',
  },
]

const MARK_BY_PHASE = Object.fromEntries(PHASE_TRACK.map((mark) => [mark.phase, mark])) as Record<Phase, PhaseMark>

// The one lookup every consumer of a single window uses, so a phase can
// never render a mark, title, or tone the track does not carry.
export function phaseMark(phase: Phase): PhaseMark {
  return MARK_BY_PHASE[phase]
}

// The owner, said without colour: the Boss's windows point down at the
// board, yours point up from it. Coral and gold are both warm, so on the
// row the wedge is the channel that separates Slow from Incoming for anyone
// the hues do not reach — and it is why the alternation strike, answer,
// strike, answer reads as a rhythm rather than a palette. Setup renders the
// wedge's empty seat, so the marks above stay aligned across all five.
export function OwnerWedge({ owner, className }: { owner: PhaseOwner; className?: string }) {
  if (owner === 'setup') {
    return <span className={className} aria-hidden="true" />
  }
  return (
    <svg viewBox="0 0 10 6" className={className} aria-hidden="true" fill="currentColor" data-owner={owner}>
      {owner === 'boss' ? <path d="M0 0h10L5 6 0 0Z" /> : <path d="M0 6 5 0l5 6H0Z" />}
    </svg>
  )
}

// The Round, drawn: the same five marks the row wears, each with its word
// and its wedge, in order, with the live one lit. Held from the track
// itself.
//
// Drawn rather than listed for the reason the Escalation ladder is: what a
// player needs here is the shape of the Round and where they stand in it,
// and five rows of text is a table of data. Rendering from PHASE_TRACK is
// what makes it a legend as well as a map — the marks in the popup are the
// marks on the row by construction, so the popup can never teach one the
// HUD does not wear.
function RoundTrackDiagram({ phase }: { phase: Phase }) {
  return (
    <div className="flex items-start justify-between gap-1 bg-navy-950 px-3 py-3">
      {PHASE_TRACK.map((mark) => {
        const live = mark.phase === phase
        return (
          <div key={mark.phase} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <mark.Icon className={`h-[18px] w-[18px] shrink-0 ${live ? mark.activeClass : mark.restClass}`} />
            {/* The rule marks "you are here" the way the row's lit chip
                does — a channel that reads without colour, which Incoming
                and Slow's warm tones alone would not. */}
            <span className={`h-0.5 w-4 rounded-full ${live ? mark.barClass : 'bg-transparent'}`} />
            <OwnerWedge owner={mark.owner} className={`h-1.5 w-2.5 shrink-0 ${live ? mark.activeClass : mark.restClass}`} />
            <span className={`text-center text-[9px] leading-tight font-semibold ${live ? 'text-ceramic-200' : 'text-steel-500'}`}>
              {mark.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// The whole Round in one popup, for the track as a whole.
//
// Each mark carries its own window's detail on hover, which is what a mouse
// is for. Touch has no hover, and a press on a mark bubbles to the track
// underneath it, so a finger could only ever open the track's popup — which
// meant pressing Slow and reading Loadout. The track's popup is now the one
// a finger actually wants: every window, in order, with this one marked.
export function roundTrackDetail(phase: Phase): HoldDetail {
  const mark = phaseMark(phase)
  return {
    id: 'round-track',
    title: 'The Round',
    badge: mark.label,
    tone: 'neutral',
    diagram: <RoundTrackDiagram phase={phase} />,
    text: 'Every Round runs these five windows in order. The coral down-wedges are the Boss striking; the up-wedges are your windows to answer. Next moves you to the one after this.',
  }
}
