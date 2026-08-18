import { selectState, useWorkbench } from '@/store/workbench'
import { encounterTerms, phaseDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { PHASE_TRACK, roundTrackDetail, type PhaseMark } from './phaseTrack'
import { FOCUS_RING_CLASS } from './theme'

// The Round track and the Encounter Clock beside it: what the Round is
// doing, and nothing that does it.
//
// The one control that moved the Round used to sit here too. It went to the
// Action Bar's right rail (AdvanceControl), which is where the thumb already
// is — leaving this band a readout, which is the direction the interface
// wants for it (docs/content/oathcraft-interface-direction.md).
//
// The track is five flat marks, one per window, in the phase tones (see
// phaseTrack.tsx). It used to be five labelled chips, and five words never
// fit: at phone width the row ran out of room and cut Slow in half. A mark
// costs a fifth of the width and does not truncate, so the whole Round is
// legible on the narrowest screen the game supports.
//
// The words are still one gesture away, by whichever gesture the device
// has. Hovering a mark names its window and explains it; holding anywhere
// on the track draws the whole Round in order with the live window lit,
// which is the reading a finger cannot assemble a mark at a time.

// One window's mark. It carries its own detail so a mouse can learn the row
// a mark at a time; the track underneath it holds for touch.
function PhaseWindowMark({ mark, active }: { mark: PhaseMark; active: boolean }) {
  const hold = useHold(phaseDetail(mark.phase, active))
  const Icon = mark.Icon
  return (
    <span
      {...hold.holdProps}
      data-testid="phase-mark"
      data-mark={mark.phase}
      data-active={active}
      className="flex flex-1 flex-col items-center gap-1 py-1"
    >
      <Icon className={`h-[18px] w-[18px] transition-colors duration-300 ${active ? mark.activeClass : 'text-steel-500'}`} />
      {/* The live window is marked twice: in tone, and by this rule under
          it. Colour alone would be the only channel otherwise, and two of
          the five windows share one. */}
      <span className={`h-0.5 w-4 rounded-full transition-colors duration-300 ${active ? mark.barClass : 'bg-transparent'}`} />
    </span>
  )
}

export function PhaseControl() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
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
  // The Encounter Clock, compact: the Boss line left the HUD, so the Round
  // count rides the phase row and the Encounter's terms are a hold away.
  const clockHold = useHold({
    ...encounterTerms(catalog, state),
    id: 'clock',
    title: 'Encounter Clock',
    badge: `Round ${state.round} of ${state.roundLimit}`,
  })
  return (
    <div className="flex items-center gap-2 border-b border-steel-800 bg-steel-950/60 px-3 py-1.5" data-phase={state.phase}>
      <button
        type="button"
        {...hold.holdProps}
        data-testid="phase-track"
        aria-label={`Round track: ${state.phase}. Hold for every window in order.`}
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
        aria-label={`Round ${state.round} of ${state.roundLimit}`}
        className={`min-h-11 min-w-11 shrink-0 text-[11px] font-semibold text-steel-400 ${FOCUS_RING_CLASS}`}
      >
        {state.round}/{state.roundLimit}
      </button>
    </div>
  )
}
