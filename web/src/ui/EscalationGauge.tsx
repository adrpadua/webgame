import { ESCALATION_MAX, type EncounterState, type EscalationThreshold } from '@/engine'
import { useHold } from './HoldPopover'
import type { HoldDetail } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// Escalation is the encounter's only clock (ADR 0027), and its whole reason for
// existing over a plain round limit is that the party should FEEL the collapse
// approaching. A clock nobody can see does not do that, so the value gets a
// permanent seat rather than living in a debug readout.
//
// It rides the program strip's header because Escalation is a Boss value and
// the strip is the Boss's own surface — and because the header survives the
// strip collapsing, so the clock never goes away. The phase row was the other
// candidate and lost: its five phase chips already overflow at phone width.

export interface EscalationPip {
  value: number
  crossed: boolean
  title: string
  // The top threshold ends the fight. It is the engine's rule rather than
  // authored content, so it has no threshold entry to take a title from.
  isWipe: boolean
}

// Derived, not stored: the gauge reads the same authored thresholds the engine
// resolves, so it can never show a band the rules do not have.
export function escalationPips(escalation: number, thresholds: EscalationThreshold[]): EscalationPip[] {
  return Array.from({ length: ESCALATION_MAX }, (_, index) => {
    const value = index + 1
    const authored = thresholds.find((threshold) => threshold.value === value)
    const isWipe = value === ESCALATION_MAX
    return {
      value,
      crossed: escalation >= value,
      title: authored?.title ?? (isWipe ? 'The end of the fight' : 'No effect at this band'),
      isWipe,
    }
  })
}

// The next band the party is walking into — the actionable half of the gauge.
export function nextEscalationPip(pips: EscalationPip[]): EscalationPip | null {
  return pips.find((pip) => !pip.crossed) ?? null
}

export function escalationDetail(state: EncounterState, enrageText: string): HoldDetail {
  const pips = escalationPips(state.escalation, state.escalationThresholds)
  const next = nextEscalationPip(pips)
  const ticksBegin = state.round < state.escalationStartRound
  return {
    id: 'escalation',
    title: 'Escalation',
    badge: `${state.escalation} of ${ESCALATION_MAX}`,
    tone: 'boss',
    stats: pips.map((pip) => ({
      label: `${pip.crossed ? '✦' : '·'} ${pip.value}`,
      value: pip.isWipe ? enrageText : pip.title,
    })),
    text:
      'The Boss gains 1 Escalation at the end of every Round once it starts, and more when a demand is left standing. Each band changes the fight for good. The last one ends it.',
    hint: ticksBegin
      ? `Automatic ticks begin at the end of Round ${state.escalationStartRound}.`
      : next === null
        ? 'Nothing left to escalate.'
        : `Next: ${next.title}.`,
  }
}

export function EscalationGauge({ state, enrageText }: { state: EncounterState; enrageText: string }) {
  const pips = escalationPips(state.escalation, state.escalationThresholds)
  const next = nextEscalationPip(pips)
  const hold = useHold(escalationDetail(state, enrageText))
  return (
    <span
      {...hold.holdProps}
      data-testid="escalation-gauge"
      data-escalation={state.escalation}
      role="meter"
      aria-valuenow={state.escalation}
      aria-valuemin={0}
      aria-valuemax={ESCALATION_MAX}
      aria-label={`Escalation ${state.escalation} of ${ESCALATION_MAX}.${next === null ? '' : ` Next: ${next.title}.`}`}
      tabIndex={0}
      // The pips are 8px, but the gauge is operable — held for its detail, and
      // reachable by keyboard — so it takes the same 44px target every other
      // control does. The smoke check only scans button and input, so this one
      // is honoured on the rule's intent rather than under its selector.
      className={`flex min-h-11 shrink-0 items-center gap-1.5 ${FOCUS_RING_CLASS}`}
    >
      <span className="text-[9px] tracking-widest text-steel-500 uppercase">Escalation</span>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {pips.map((pip) => (
          <span
            key={pip.value}
            data-crossed={pip.crossed}
            // Crossed bands read in the Boss's own coral; pending bands are
            // hollow. The wipe keeps a heavier ring at every state, because
            // "one more and the fight is over" is worth seeing before it lands.
            className={`h-2 w-2 rounded-full border ${
              pip.crossed
                ? pip.isWipe
                  ? 'border-coral-300 bg-coral-400'
                  : 'border-coral-500 bg-coral-500'
                : pip.isWipe
                  ? 'border-coral-700 bg-transparent'
                  : 'border-steel-600 bg-transparent'
            }`}
          />
        ))}
      </span>
    </span>
  )
}
