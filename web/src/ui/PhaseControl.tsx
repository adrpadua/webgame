import { useState } from 'react'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench, type WorkbenchStore } from '@/store/workbench'
import type { EncounterState } from '@/engine'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { encounterTerms, phaseDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { Modal } from './Modal'
import { PHASE_TRACK, roundTrackDetail, type PhaseMark } from './phaseTrack'
import { slotCanFire } from './slots'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS } from './theme'

// The Round track plus the one control that moves it.
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

// The actions Next would leave on the table, phrased for the window being
// skipped. Advisory only: "Skip anyway" always goes through.
interface SkipWarning {
  title: string
  body: string
}

const PLAYER_ACTION_KINDS = new Set(['load_slot', 'charge_slot', 'fire_slot', 'move_hero', 'discard_for_stamina'])

function skipWarning(store: WorkbenchStore, state: EncounterState): SkipWarning | null {
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  if (state.phase === 'loadout') {
    // An empty Slot does nothing all Round — but only warn while a hand
    // card could still fill it.
    if (hero.actionBar.some((slot) => slot.topCard === null) && hero.hand.length > 0) {
      return {
        title: 'Leave a Slot empty?',
        body: 'A Slot is still empty. A card prepared now can take Charge and fire later — an empty Slot does nothing all Round.',
      }
    }
    return null
  }
  if (state.phase !== 'quick' && state.phase !== 'slow') {
    return null
  }
  // Did the player do anything at all with this window? Facts carry their
  // round and phase, so the current window's actions are on the timeline.
  const acted = store.entries
    .slice(0, store.index + 1)
    .some((entry) =>
      entry.facts.some(
        (fact) =>
          fact.succeeded &&
          fact.round === state.round &&
          fact.phase === state.phase &&
          fact.sourceId === state.primaryHeroId &&
          PLAYER_ACTION_KINDS.has(fact.kind),
      ),
    )
  if (acted) {
    return null
  }
  // ...and is anything still possible? A fireable Slot or any hand card
  // (Charge, or a paid step during the Quick Window) counts.
  const canFire = hero.actionBar.some((slot) => slotCanFire(store.catalog, state, slot))
  if (!canFire && hero.hand.length === 0) {
    return null
  }
  const windowName = state.phase === 'quick' ? 'Quick Window' : 'Slow Window'
  return {
    title: `Skip the ${windowName}?`,
    body: canFire
      ? `You haven't used the ${windowName}: a Slot can fire right now, and a hand card could add Charge. The window closes when you move on.`
      : `You haven't used the ${windowName}: a hand card could still add Charge${state.phase === 'quick' ? ' or pay for a step' : ''}. The window closes when you move on.`,
  }
}

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
  const advance = useWorkbench((store) => store.advance)
  const restart = useWorkbench((store) => store.restart)
  const step = useFirstTurnStep()
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
  const nextGated = blocksTarget(step, 'next')
  const nextSpotlit = step !== null && step.targets.includes('next')
  // While a fatal batch is still replaying, the Restart control would give
  // the ending away; Next stays up (and inert — advance no-ops on an ended
  // Encounter) until the outcome reveal lands.
  const outcomeHeld = usePlayout((store) => store.outcomeHeld)
  // A Next that would waste the window parks here until the player decides.
  const [pendingSkip, setPendingSkip] = useState<SkipWarning | null>(null)

  // The scripted first turn narrates every press itself, so its Nexts skip
  // the warning.
  const onNext = () => {
    // While a Boss Row is replaying, Next serves the playout: it stands in
    // for the Continue bar — before the opening beat as well as between
    // moments — and waits out a moment still playing, in either pacing
    // mode. The beats resolve as their window opens, and Next must never
    // silently fast-forward the telling.
    const playout = usePlayout.getState()
    if (playout.awaitingContinue) {
      playout.continuePlayout()
      return
    }
    if (playout.activeBeatId !== null) {
      return
    }
    if (step === null && state.active) {
      const warning = skipWarning(useWorkbench.getState(), state)
      if (warning) {
        setPendingSkip(warning)
        return
      }
    }
    advance()
  }
  const confirmSkip = () => {
    setPendingSkip(null)
    advance()
  }

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
      {state.active || outcomeHeld ? (
        <button
          type="button"
          data-testid="next-phase"
          onClick={onNext}
          className={`wb-plate wb-plate-sm wb-face-gold wb-acc-gold min-h-12 shrink-0 text-sm font-bold text-gold-950 transition hover:brightness-110 active:translate-y-px ${FOCUS_RING_CLASS} ${
            nextSpotlit ? SPOTLIGHT_CLASS : ''
          } ${nextGated ? GATED_CLASS : ''}`}
        >
          Next
        </button>
      ) : (
        <button
          type="button"
          data-testid="restart"
          onClick={() => restart()}
          className={`wb-plate wb-plate-sm wb-face-gold wb-acc-gold min-h-12 shrink-0 text-sm font-bold text-gold-950 transition hover:brightness-110 active:translate-y-px ${FOCUS_RING_CLASS}`}
        >
          Restart
        </button>
      )}
      {pendingSkip !== null && (
        <Modal
          onDismiss={() => setPendingSkip(null)}
          labelledBy="phase-skip-title"
          accentBorderClass="wb-acc-ember"
          testId="phase-skip-confirm"
        >
          <h2 id="phase-skip-title" className="text-sm font-bold text-ember-300">
            {pendingSkip.title}
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-ceramic-300">{pendingSkip.body}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              autoFocus
              data-testid="cancel-skip"
              onClick={() => setPendingSkip(null)}
              className={`wb-plate wb-plate-sm wb-face-gold wb-acc-gold min-h-12 flex-1 text-sm font-bold text-gold-950 transition hover:brightness-110 ${FOCUS_RING_CLASS}`}
            >
              Stay
            </button>
            <button
              type="button"
              data-testid="confirm-skip"
              onClick={confirmSkip}
              className={`wb-plate wb-plate-sm wb-face-steel wb-acc-none min-h-12 flex-1 text-sm font-bold text-ceramic-200 transition hover:brightness-125 ${FOCUS_RING_CLASS}`}
            >
              Skip anyway
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
