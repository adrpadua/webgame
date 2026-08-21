import { useCatalog } from '@/content/CatalogContext'
import { selectState, useWorkbench } from '@/store/workbench'
import { EncounterPicker } from './EncounterPicker'
import { EscalationGauge } from './EscalationGauge'
import { encounterTerms, phaseDetail } from '../common/holdDetails'
import { useHold } from '../common/HoldPopover'
import { OwnerWedge, PHASE_TRACK, phaseMark, roundTrackDetail, type PhaseMark } from './phaseTrack'
import { FOCUS_RING_CLASS } from '../common/theme'

// The Round track, the Encounter Clock beside it, and the Escalation gauge
// stacked underneath: what the Round is doing, how far into the fight it is,
// and nothing that does it.
//
// The one control that moved the Round used to sit here too. It went to the
// Action Bar's right rail (AdvanceControl), which is where the thumb already
// is — leaving this band a readout, which is the direction the interface
// wants for it (docs/content/oathcraft-interface-direction.md).
//
// The track is five marks, one per window, each wearing its owner's tone at
// rest and its wedge — the Boss's windows point down at the board, yours
// point up — so the Round's shape, strike answer strike answer, reads
// before any window opens (see phaseTrack.tsx for the table and the
// reasoning). The live window is not a fifth tinted mark but the row's one
// lit chip: a raked plate in the owner's material carrying the window's
// word. One word always fits where five never did, and a lit plate is
// visible from the board the way an 18px hue shift was not.
//
// The rest of the words are still one gesture away, by whichever gesture
// the device has. Hovering a mark names its window and explains it; holding
// anywhere on the track draws the whole Round in order with the live window
// lit, which is the reading a finger cannot assemble a mark at a time.
//
// Under the track, on its own line, is the Escalation gauge. It used to ride
// the Boss program strip's header — the strip is gone, and the clock had to
// keep its permanent seat, so it came here. The seat is better than the one
// it left: the two readouts stack into one band that says where the Round is
// and where the fight is, in that order, and a bar given the whole width
// reads as the clock it is rather than as a 64px ornament beside a title.

// One window's mark. It carries its own detail so a mouse can learn the row
// a mark at a time; the track underneath it holds for touch.
//
// The live mark takes only the width its chip needs and the resting four
// split what remains, so the chip's word never squeezes a neighbour off the
// row — the marks give way instead, and they can: an icon and a wedge cost
// a fraction of a fifth.
function PhaseWindowMark({ mark, active }: { mark: PhaseMark; active: boolean }) {
  const hold = useHold(phaseDetail(mark.phase, active))
  const Icon = mark.Icon
  if (active) {
    return (
      <span
        {...hold.holdProps}
        data-testid="phase-mark"
        data-mark={mark.phase}
        data-owner={mark.owner}
        data-active={active}
        className="flex shrink-0 flex-col items-center gap-1 py-1"
      >
        <span className={`wb-plate wb-plate-xs ${mark.faceClass} flex items-center gap-1.5 py-1`}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[10px] leading-none font-black tracking-widest whitespace-nowrap uppercase">{mark.label}</span>
        </span>
        <OwnerWedge owner={mark.owner} className={`h-1.5 w-2.5 shrink-0 ${mark.activeClass}`} />
      </span>
    )
  }
  return (
    <span
      {...hold.holdProps}
      data-testid="phase-mark"
      data-mark={mark.phase}
      data-owner={mark.owner}
      data-active={active}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-1 ${mark.restClass}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 transition-colors duration-300" />
      {/* The owner, without colour: coral and gold are both warm, and the
          wedge is what keeps the Boss's windows and yours apart for anyone
          the hues do not reach. */}
      <OwnerWedge owner={mark.owner} className="h-1.5 w-2.5 shrink-0" />
    </span>
  )
}

export function PhaseControl() {
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  // Hover belongs to whichever mark the mouse is actually over; the track
  // itself answers a touch hold — and it answers with the whole Round.
  //
  // A press on a mark bubbles to this button, and both bindings arm the same
  // timer, so the outer one always won: on touch, pressing any mark opened
  // the live window's detail. Pressing Slow and reading Loadout is worse
  // than not asking. Rather than stop the press from bubbling — which would
  // make a 47px mark the only way to reach the popup — the track answers
  // with the thing a finger cannot get any other way: every window, in
  // order, with this one marked.
  const hold = useHold(roundTrackDetail(state.phase), { hover: false })
  // The Round mark. It used to read `2/8`, and the denominator was a rule
  // that no longer exists: ADR 0027 made Escalation the encounter's only
  // clock, and nothing in the engine ends an Encounter at `roundLimit` any
  // more — it survives as the authored budget the tick start derives from.
  // Worse than retired, it was misleading: since D-036 priced Brood Call, a
  // line that ignores its adds dies around Round 6, so `2/8` promised six
  // more Rounds to a party that had three. The clock is the Escalation gauge
  // on the line below, which is the only readout that answers to
  // acceleration; this is a coordinate — which Round the program pool and
  // every fact-log line are talking about.
  //
  // The nominal budget keeps its seat in the popup, where a qualifier fits:
  // `ticks alone` is what makes the number honest, because it says out loud
  // that nothing here has accelerated.
  const clockHold = useHold({
    ...encounterTerms(catalog, state),
    id: 'clock',
    title: 'Encounter Clock',
    badge: `Round ${state.round}`,
    stats: [{ label: 'Ticks alone reach the wipe', value: `Round ${state.roundLimit}` }],
  })
  return (
    <div className="border-b border-steel-800 bg-steel-950/60 px-3 py-1.5" data-testid="phase-band" data-phase={state.phase}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...hold.holdProps}
          data-testid="phase-track"
          aria-label={`Round track: ${phaseMark(state.phase).title}. Hold for every window in order.`}
          // min-w-0 lets the track shrink below its marks' natural width; without
          // it flex-1 will not go under content size and the row overflows the
          // surface, which then scrolls sideways under any focus or modal.
          className={`flex min-h-11 min-w-0 flex-1 items-center gap-1 text-left ${FOCUS_RING_CLASS}`}
        >
          {PHASE_TRACK.map((mark) => (
            <PhaseWindowMark key={mark.phase} mark={mark} active={state.phase === mark.phase} />
          ))}
        </button>
        <button
          type="button"
          {...clockHold.holdProps}
          data-testid="round-display"
          aria-label={`Round ${state.round}`}
          className={`min-h-11 min-w-11 shrink-0 text-[11px] font-semibold text-steel-400 ${FOCUS_RING_CLASS}`}
        >
          R{state.round}
        </button>
        <EncounterPicker />
      </div>
      <EscalationGauge state={state} enrageText={state.enrageText} />
    </div>
  )
}
