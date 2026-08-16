import { useState } from 'react'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench, type WorkbenchStore } from '@/store/workbench'
import type { EncounterState, Phase } from '@/engine'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { phaseDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { Modal } from './Modal'
import { usePresentedPhase } from './usePresentedPhase'
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
  { phase: 'quick', label: 'Quick', activeClass: 'bg-emerald-500 text-emerald-950 shadow-emerald-900' },
  { phase: 'incoming', label: 'Incoming', activeClass: 'bg-amber-500 text-amber-950 shadow-amber-900' },
  { phase: 'slow', label: 'Slow', activeClass: 'bg-sky-500 text-sky-950 shadow-sky-900' },
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
  const advance = useWorkbench((store) => store.advance)
  const restart = useWorkbench((store) => store.restart)
  const step = useFirstTurnStep()
  // The presented phase, not state.phase: the track must not light the
  // player's chip while Boss Beats are still replaying on screen.
  const shownPhase = usePresentedPhase()
  const hold = useHold(phaseDetail(shownPhase, true))
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
    // While a prompt-paced boss track is replaying, Next serves the playout:
    // it stands in for the Continue bar between moments and waits out a
    // moment still playing — it must never silently fast-forward unplayed
    // beats. Auto playouts (the scripted first turn) keep Next as the
    // script's own control.
    const playout = usePlayout.getState()
    if (playout.awaitingContinue) {
      playout.continuePlayout()
      return
    }
    if (playout.paced && playout.activeBeatId !== null) {
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
    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-1.5" data-phase={shownPhase}>
      <button
        type="button"
        {...hold.holdProps}
        data-testid="phase-track"
        aria-label={`Current phase: ${shownPhase}`}
        className={`flex min-h-11 flex-1 items-center gap-1 rounded-lg text-left ${FOCUS_RING_CLASS}`}
      >
        {PHASES.map((entry) => (
          <span
            key={entry.phase}
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase transition-all duration-300 ${
              shownPhase === entry.phase ? `scale-105 font-bold shadow-md ${entry.activeClass}` : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {entry.label}
          </span>
        ))}
      </button>
      {state.active || outcomeHeld ? (
        <button
          type="button"
          data-testid="next-phase"
          onClick={onNext}
          className={`min-h-12 shrink-0 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-95 ${FOCUS_RING_CLASS} ${
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
          className={`min-h-12 shrink-0 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-500 active:scale-95 ${FOCUS_RING_CLASS}`}
        >
          Restart
        </button>
      )}
      {pendingSkip !== null && (
        <Modal
          onDismiss={() => setPendingSkip(null)}
          labelledBy="phase-skip-title"
          accentBorderClass="border-amber-500"
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
              className={`min-h-12 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 ${FOCUS_RING_CLASS}`}
            >
              Stay
            </button>
            <button
              type="button"
              data-testid="confirm-skip"
              onClick={confirmSkip}
              className={`min-h-12 flex-1 rounded-lg bg-zinc-700 text-sm font-bold text-zinc-100 transition hover:bg-zinc-600 ${FOCUS_RING_CLASS}`}
            >
              Skip anyway
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
