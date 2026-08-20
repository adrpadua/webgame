import { useState } from 'react'
import { useCatalog } from '@/content/CatalogContext'
import type { ContentCatalog, EncounterState } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectPilotId, selectState, useWorkbench, type WorkbenchStore } from '@/store/workbench'
import { blocksTarget } from '../onboarding/firstTurnScript'
import { AdvanceIcon, PlayIcon, RestartIcon } from '../common/icons'
import { Modal } from '../common/Modal'
import { slotCanFire } from './slots'
import { useFirstTurnStep } from '../onboarding/useFirstTurn'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS } from '../common/theme'

// The Action Bar's right rail: the one control that moves the fight forward.
//
// It used to be a word — `Next` — parked in the phase strip at the top of
// the frame, which put the most-pressed control in the interface as far from
// the thumb as the surface allows, and beside a readout that is otherwise
// pure information. It says the same three things it always did, now as a
// mark, because two of twelve units has room for a glyph and not a label.
//
// The three states were always here; only the second was hidden inside the
// handler. Playing the next beat of a Boss Row and closing the window are
// different moves — that distinction is why the docked prompt says "Up next"
// rather than "Next" — so the rail draws them as different shapes rather
// than relying on the player to know which press they are making.

// The actions Next would leave on the table, phrased for the window being
// skipped. Advisory only: "Skip anyway" always goes through.
interface SkipWarning {
  title: string
  body: string
}

const PLAYER_ACTION_KINDS = new Set(['load_slot', 'charge_slot', 'fire_slot', 'move_hero', 'discard_for_stamina'])

function skipWarning(catalog: ContentCatalog, store: WorkbenchStore, state: EncounterState): SkipWarning | null {
  const pilotId = selectPilotId(store)
  const hero = state.heroes[pilotId]
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
          fact.sourceId === pilotId &&
          PLAYER_ACTION_KINDS.has(fact.kind),
      ),
    )
  if (acted) {
    return null
  }
  // ...and is anything still possible? A fireable Slot or any hand card
  // (Charge, or a paid step during the Quick Window) counts.
  const canFire = hero.actionBar.some((_slot, slotIndex) => slotCanFire(catalog, state, pilotId, slotIndex))
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

export function AdvanceControl() {
  const catalog = useCatalog()
  const state = useWorkbench(selectState)
  const advance = useWorkbench((store) => store.advance)
  const restart = useWorkbench((store) => store.restart)
  const step = useFirstTurnStep()
  // While a fatal batch is still replaying, Restart would give the ending
  // away; the rail stays on Next (and inert — advance no-ops on an ended
  // Encounter) until the outcome reveal lands.
  const outcomeHeld = usePlayout((store) => store.outcomeHeld)
  const awaitingContinue = usePlayout((store) => store.awaitingContinue)
  // The Beat playing right now, published on the control that plays it. The
  // rail already waits this state out (see onPress), and it is what the smoke
  // suite holds a prompt's promise against: the card names the Beat the press
  // will play, and this says which one actually went. The Boss Beat chips
  // carried that reading until the program strip was removed (D-060); nothing
  // else on the surface reports it, and a press that plays a different Beat
  // from the one it advertised is the defect the pacing exists to prevent.
  const activeBeatId = usePlayout((store) => store.activeBeatId)
  // A Next that would waste the window parks here until the player decides.
  const [pendingSkip, setPendingSkip] = useState<SkipWarning | null>(null)

  const gated = blocksTarget(step, 'next')
  const spotlit = step !== null && step.targets.includes('next')

  // The scripted first turn narrates every press itself, so its presses skip
  // the warning.
  const onPress = () => {
    // While a Boss Row is replaying, the rail serves the playout: it stands
    // in for the docked Continue prompt — before the opening beat as well as
    // between moments — and waits out a moment still playing, in either
    // pacing mode. The beats resolve as their window opens, and this must
    // never silently fast-forward the telling.
    const playout = usePlayout.getState()
    if (playout.awaitingContinue) {
      playout.continuePlayout()
      return
    }
    if (playout.activeBeatId !== null) {
      return
    }
    if (step === null && state.active) {
      const warning = skipWarning(catalog, useWorkbench.getState(), state)
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

  const ended = !state.active && !outcomeHeld
  const Icon = ended ? RestartIcon : awaitingContinue ? PlayIcon : AdvanceIcon
  const label = ended ? 'Restart the Encounter' : awaitingContinue ? 'Continue: play the next Boss Beat' : 'Next: close this window'

  return (
    <>
      <button
        type="button"
        data-testid={ended ? 'restart' : 'next-phase'}
        data-rail={ended ? 'restart' : awaitingContinue ? 'continue' : 'next'}
        data-playing-beat={activeBeatId ?? undefined}
        aria-label={label}
        onClick={ended ? () => restart() : onPress}
        // The rail is the Action Bar's live gold, the same face a Slot wears
        // when it can fire — pressing it is always a move. Its mark is held
        // to the plate's middle, so it takes the centred inset: the cut is
        // half as deep there, and the glyph keeps the room the full rake
        // would have spent.
        className={`wb-plate wb-plate-lg wb-plate-centered wb-face-gold wb-acc-gold col-span-2 flex min-h-20 items-center justify-center text-gold-950 transition hover:brightness-110 active:translate-y-px ${FOCUS_RING_CLASS} ${
          spotlit ? SPOTLIGHT_CLASS : ''
        } ${gated ? GATED_CLASS : ''}`}
      >
        <Icon className="h-7 w-7" />
      </button>
      {pendingSkip !== null && (
        <Modal onDismiss={() => setPendingSkip(null)} labelledBy="phase-skip-title" accentBorderClass="wb-acc-ember" testId="phase-skip-confirm">
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
    </>
  )
}
