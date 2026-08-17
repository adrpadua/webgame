import { useState } from 'react'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench, type WorkbenchStore } from '@/store/workbench'
import type { EncounterState, Phase } from '@/engine'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { encounterTerms, phaseDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { Modal } from './Modal'
import { slotCanFire } from './slots'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS } from './theme'

// One word per phase, in the Encounter's own vocabulary and its own colour:
// amber beats (Instant, Incoming) belong to the Boss, green Quick and blue
// Slow are yours, grey Loadout is setup. The tones are the same ones the
// How to Play guide's timeline diagram and the Phase Banner wear — the
// track the tutorial teaches is the track the HUD shows. Change together.
const PHASES: { phase: Phase; label: string; activeClass: string }[] = [
  { phase: 'loadout', label: 'Loadout', activeClass: 'bg-zinc-600 text-zinc-50 shadow-zinc-950' },
  { phase: 'instant', label: 'Instant', activeClass: 'bg-amber-500 text-amber-950 shadow-amber-900' },
  { phase: 'quick', label: 'Quick', activeClass: 'bg-glass-400 text-glass-950 shadow-glass-900' },
  { phase: 'incoming', label: 'Incoming', activeClass: 'bg-amber-500 text-amber-950 shadow-amber-900' },
  { phase: 'slow', label: 'Slow', activeClass: 'bg-gold-400 text-gold-950 shadow-gold-900' },
]

// The Round track plus the one control that moves it. Holding the track
// explains the window you are standing in. The five chips stay on one
// unwrapped row: at phone width they used to wrap and push the track into a
// second line under the Next button.
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

export function PhaseControl() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const advance = useWorkbench((store) => store.advance)
  const restart = useWorkbench((store) => store.restart)
  const step = useFirstTurnStep()
  const hold = useHold(phaseDetail(state.phase, true))
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
    // for the Continue bar between moments and waits out a moment still
    // playing, in either pacing mode — the beats resolve as their window
    // opens, and Next must never silently fast-forward the telling.
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
    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-1.5" data-phase={state.phase}>
      <button
        type="button"
        {...hold.holdProps}
        data-testid="phase-track"
        aria-label={`Current phase: ${state.phase}`}
        className={`flex min-h-11 flex-1 items-center gap-1 text-left ${FOCUS_RING_CLASS}`}
      >
        {PHASES.map((entry) => (
          <span
            key={entry.phase}
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase transition-all duration-300 ${
              state.phase === entry.phase ? `scale-105 font-bold shadow-md ${entry.activeClass}` : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {entry.label}
          </span>
        ))}
      </button>
      <button
        type="button"
        {...clockHold.holdProps}
        data-testid="round-display"
        aria-label={`Round ${state.round} of ${state.roundLimit}`}
        className={`min-h-11 min-w-11 shrink-0 text-[11px] font-semibold text-zinc-400 ${FOCUS_RING_CLASS}`}
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
          <h2 id="phase-skip-title" className="text-sm font-bold text-amber-300">
            {pendingSkip.title}
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-zinc-200">{pendingSkip.body}</p>
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
              className={`wb-plate wb-plate-sm wb-face-steel wb-acc-none min-h-12 flex-1 text-sm font-bold text-zinc-100 transition hover:brightness-125 ${FOCUS_RING_CLASS}`}
            >
              Skip anyway
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
