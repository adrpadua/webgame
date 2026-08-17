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
// candidate and lost: it is already the width of the Round track.
//
// The gauge carries no label. A word costs more room than the reading it
// buys, and the reading is in the shape: five bars climbing left to right,
// filling in the Boss's coral as the fight escalates. What each band DOES
// is the popup's job, and the popup teaches it as a ladder rather than
// telling it as a list.

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

// What a band is called on the ladder. The wipe has no authored threshold to
// name it, so it quotes the Encounter's own enrage line rather than inventing
// a phrase for the end of the fight.
export function escalationBandLabel(pip: EscalationPip, enrageText: string): string {
  return pip.isWipe ? enrageText : pip.title
}

// The ladder: every band the fight still has, in order, on the Boss's rail.
// This is the popup's whole point — the gauge on the strip says how far the
// clock has run, and this says what the runs cost. It is drawn rather than
// listed because a list of five rows reads as a table of data, and the thing
// a player has to feel here is a climb with a floor and a last step.
function EscalationLadder({ pips, enrageText }: { pips: EscalationPip[]; enrageText: string }) {
  const next = nextEscalationPip(pips)
  return (
    <div className="bg-navy-950 px-3 py-2.5">
      {pips.map((pip, index) => {
        const isNext = pip.value === next?.value
        const last = index === pips.length - 1
        return (
          <div key={pip.value} className="grid grid-cols-[10px_1fr] gap-x-2.5">
            <div className="flex flex-col items-center">
              <span
                className={`mt-0.5 rounded-full border ${
                  pip.crossed
                    ? pip.isWipe
                      ? 'h-2.5 w-2.5 border-coral-200 bg-coral-400'
                      : 'h-2 w-2 border-coral-500 bg-coral-500'
                    : pip.isWipe
                      ? 'h-2.5 w-2.5 border-coral-500 bg-coral-950'
                      : `h-2 w-2 bg-navy-950 ${isNext ? 'border-coral-400' : 'border-steel-600'}`
                }`}
              />
              {/* The rail between bands is the fight's own progress: coral
                  behind the clock, steel ahead of it. */}
              {!last && <span className={`w-px flex-1 ${pip.crossed ? 'bg-coral-500' : 'bg-steel-700'}`} />}
            </div>
            <div className={`flex items-baseline justify-between gap-2 ${last ? '' : 'pb-2'}`}>
              <span
                className={`text-[11px] leading-snug ${
                  pip.crossed ? 'font-semibold text-coral-200' : pip.isWipe ? 'text-coral-300' : isNext ? 'text-ceramic-200' : 'text-steel-500'
                }`}
              >
                {escalationBandLabel(pip, enrageText)}
              </span>
              {isNext && <span className="shrink-0 text-[9px] font-semibold tracking-widest text-steel-500 uppercase">Next</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
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
    diagram: <EscalationLadder pips={pips} enrageText={enrageText} />,
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
      // The bars are a few pixels wide, but the gauge is operable — held for its detail, and
      // reachable by keyboard — so it takes the same 44px target every other
      // control does. The smoke check only scans button and input, so this one
      // is honoured on the rule's intent rather than under its selector.
      className={`flex min-h-11 shrink-0 items-center gap-1.5 ${FOCUS_RING_CLASS}`}
    >
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        {pips.map((pip, index) => (
          <span
            key={pip.value}
            data-crossed={pip.crossed}
            // Each band stands taller than the one before it, so the gauge
            // says "escalation" as a shape and needs no word above it.
            // Crossed bands read in the Boss's own coral; pending bands are
            // hollow. The wipe keeps a heavier edge at every state, because
            // "one more and the fight is over" is worth seeing before it lands.
            style={{ height: 6 + index * 2 }}
            className={`w-[6px] rounded-[1px] border ${
              pip.crossed
                ? pip.isWipe
                  ? 'border-coral-200 bg-coral-400'
                  : 'border-coral-500 bg-coral-500'
                : pip.isWipe
                  ? 'border-coral-700 bg-steel-900'
                  : 'border-steel-600 bg-steel-900'
            }`}
          />
        ))}
      </span>
    </span>
  )
}
