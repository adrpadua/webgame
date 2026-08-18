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
// buys, and the reading is in the shape: a bar filling left to right in the
// Boss's coral as the fight escalates, with the last band — the one that
// ends it — already washed in at the far end, and a fuse burning through the
// first band while the automatic ticks are still dormant so a clock that
// cannot move yet does not read as one that has stopped. What each band DOES
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

// Automatic ticks begin late by derivation (ADR 0027), so on Embermaw the
// value is still 0 at the end of Round 3 and the gauge draws the same empty
// track three Rounds running. That reads as a broken clock rather than a
// dormant one: the one thing a player checks a clock for is whether it moved,
// and this one cannot move yet.
//
// So the dormant Rounds get a fuse: the stretch of track the first tick will
// claim, filling as the start Round approaches, in the same washed coral the
// wipe band already uses for a band that is real but not yet reached. It
// carries no number the rules do not have — it is Rounds elapsed toward the
// first tick — and it lands exactly on the first band boundary at the moment
// the tick does, so the clock takes over from the fuse rather than restarting
// behind it.
//
// Returned as a fraction of the whole track, 0 once the ticks have begun.
export function escalationFuseFraction(round: number, startRound: number): number {
  if (round >= startRound) {
    return 0
  }
  return round / startRound / ESCALATION_MAX
}

// What the gauge announces. The dormant schedule belongs here and not only in
// the popup: `Next: Ashen Verge` on its own tells a screen reader the band is
// imminent, when it can be three Rounds away.
export function escalationGaugeLabel(state: EncounterState): string {
  const next = nextEscalationPip(escalationPips(state.escalation, state.escalationThresholds))
  const dormant = state.round < state.escalationStartRound
  return [
    `Escalation ${state.escalation} of ${ESCALATION_MAX}.`,
    dormant ? `Automatic ticks begin at the end of Round ${state.escalationStartRound}.` : '',
    next === null ? '' : `Next: ${next.title}.`,
  ]
    .filter((part) => part !== '')
    .join(' ')
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
  const hold = useHold(escalationDetail(state, enrageText))
  const fuse = escalationFuseFraction(state.round, state.escalationStartRound)
  return (
    <span
      {...hold.holdProps}
      data-testid="escalation-gauge"
      data-escalation={state.escalation}
      data-fuse={fuse > 0}
      role="meter"
      aria-valuenow={state.escalation}
      aria-valuemin={0}
      aria-valuemax={ESCALATION_MAX}
      aria-label={escalationGaugeLabel(state)}
      tabIndex={0}
      // The bar is 8px tall, but the gauge is operable — held for its detail, and
      // reachable by keyboard — so it takes the same 44px target every other
      // control does. The smoke check only scans button and input, so this one
      // is honoured on the rule's intent rather than under its selector.
      className={`flex min-h-11 shrink-0 items-center gap-1.5 ${FOCUS_RING_CLASS}`}
    >
      {/* The gauge language the Hero's panel and the Boss line already speak
          (theme.ts): a dark track, and a fill measured from the left. Here it
          is drawn compact, and divided at the band boundaries so the five
          steps are still countable — a bar that only slides is a percentage,
          and Escalation moves in bands that each land once. */}
      <span className="relative block h-2 w-16 overflow-hidden rounded-sm bg-steel-950 ring-1 ring-steel-800 ring-inset" aria-hidden="true">
        {/* The last band ends the fight, so its stretch of the track is
            washed in the Boss's own colour before the clock ever reaches it. */}
        <span className="absolute inset-y-0 right-0 w-1/5 bg-coral-900/70" />
        {/* The fuse burning through the first band while the ticks are still
            dormant — under the fill, so acceleration from an unanswered
            demand simply covers it. */}
        {fuse > 0 && <span className="absolute inset-y-0 left-0 bg-coral-900/70 transition-[width] duration-300" style={{ width: `${fuse * 100}%` }} />}
        <span
          className="absolute inset-y-0 left-0 bg-coral-500 transition-[width] duration-300"
          style={{ width: `${(state.escalation / ESCALATION_MAX) * 100}%` }}
        />
        {pips.slice(0, -1).map((pip) => (
          <span
            key={pip.value}
            data-crossed={pip.crossed}
            className="absolute inset-y-0 w-px bg-steel-950"
            style={{ left: `${(pip.value / ESCALATION_MAX) * 100}%` }}
          />
        ))}
      </span>
    </span>
  )
}
