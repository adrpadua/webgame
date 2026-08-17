import type { ComponentType } from 'react'
import type { Phase } from '@/engine'
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
