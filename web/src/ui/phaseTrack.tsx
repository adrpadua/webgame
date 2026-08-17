import type { ComponentType } from 'react'
import type { Phase } from '@/engine'
import type { HoldDetail } from './HoldPopover'
import { BoltIcon, DeckIcon, HourglassIcon, ImpactIcon, SwiftIcon } from './icons'

// The Round's five windows in one table: a mark, a word, and a tone.
//
// The tone says who the window belongs to — coral Instant and Incoming are
// the Boss's, runeglass Quick and living-gold Slow are yours, steel Loadout
// is setup. The mark says what the window is for, which is the half that has
// to survive on the HUD: the phase row shows marks alone, because five words
// do not fit a phone's width and the row cut the last one off.
//
// The How to Play guide's timeline shows the same marks WITH their words, so
// the tutorial is where a player learns to read the row. Both render from
// this table, so the guide can never teach a mark the HUD does not wear.
// The Phase Banner names each window as it opens and speaks the same tones.
export interface PhaseMark {
  phase: Phase
  label: string
  Icon: ComponentType<{ className?: string }>
  // What the mark wears while its window is the live one. Anything else on
  // the row stays a quiet steel, which is the palette's readable dim step.
  activeClass: string
  // The same tone as the rule under the live mark — a second, colourless
  // channel for "you are here", for anyone the colour alone does not reach.
  barClass: string
}

export const PHASE_TRACK: PhaseMark[] = [
  { phase: 'loadout', label: 'Loadout', Icon: DeckIcon, activeClass: 'text-ceramic-200', barClass: 'bg-ceramic-300' },
  { phase: 'instant', label: 'Instant', Icon: BoltIcon, activeClass: 'text-coral-300', barClass: 'bg-coral-400' },
  { phase: 'quick', label: 'Quick', Icon: SwiftIcon, activeClass: 'text-glass-300', barClass: 'bg-glass-400' },
  { phase: 'incoming', label: 'Incoming', Icon: ImpactIcon, activeClass: 'text-coral-300', barClass: 'bg-coral-400' },
  { phase: 'slow', label: 'Slow', Icon: HourglassIcon, activeClass: 'text-gold-300', barClass: 'bg-gold-400' },
]

// The Round, drawn: the same five marks the row wears, each with its word,
// in order, with the live one lit. Held from the track itself.
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
            <mark.Icon className={`h-[18px] w-[18px] shrink-0 ${live ? mark.activeClass : 'text-steel-500'}`} />
            {/* The same rule the row draws under its live mark, so "you are
                here" reads the same way in both places — and reads at all
                without colour, which two of the five windows share. */}
            <span className={`h-0.5 w-4 rounded-full ${live ? mark.barClass : 'bg-transparent'}`} />
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
  const mark = PHASE_TRACK.find((entry) => entry.phase === phase)
  return {
    id: 'round-track',
    title: 'The Round',
    badge: mark?.label,
    tone: 'neutral',
    diagram: <RoundTrackDiagram phase={phase} />,
    text: 'Every Round runs these five windows in order. Two belong to the Boss and two are yours; Next moves you to the one after this.',
  }
}
