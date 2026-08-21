import { useState } from 'react'
import { useCatalog } from '@/content/CatalogContext'
import type { ContentCatalog, EncounterState } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectPilotId, selectState, useWorkbench, type WorkbenchStore } from '@/store/workbench'
import { blocksTarget } from '../onboarding/firstTurnScript'
import { AdvanceIcon, PlayIcon, RestartIcon, UnactedIcon } from '../common/icons'
import { Modal } from '../common/Modal'
import { captureFrameBoxes } from '../party/controlSwap'
import { heroActed, heroCanAct, nextNudge } from '../party/unacted'
import { slotCanFire } from './slots'
import { useFirstTurnStep } from '../onboarding/useFirstTurn'
import { FOCUS_RING_CLASS, GATED_CLASS, NUDGE_RING_CLASS, SPOTLIGHT_CLASS } from '../common/theme'

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
//
// A fourth state arrived with the Party. Total War's campaign map turns its
// end-turn button into "a unit has not moved" and hands each press to one of
// them, becoming end-turn again once none are left; the rail does the same
// with the console, because the same failure is available here — a seat you
// are not piloting can sit out a whole window in silence. The rule for who is
// waiting lives in `../party/unacted.ts`, shared with the frames that breathe,
// and it caps the cycle at one offer per seat per window so the rail can
// always be pressed back to Next.

// The actions Next would leave on the table, phrased for the window being
// skipped. Advisory only: "Skip anyway" always goes through.
interface SkipWarning {
  title: string
  body: string
}

function skipWarning(catalog: ContentCatalog, store: WorkbenchStore, state: EncounterState): SkipWarning | null {
  const pilotId = selectPilotId(store)
  const hero = state.heroes[pilotId]
  if (!hero) {
    return null
  }
  if (state.phase === 'loadout') {
    // An empty Slot does nothing all Round — but only warn while a hand
    // card could still fill it. Deliberately not gated on whether the pilot
    // has already loaded something: the warning is about the Slot left empty,
    // not about an unused window, so a Hero who filled one of two still hears
    // it.
    if (heroCanAct(catalog, state, pilotId)) {
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
  // Did the pilot do anything at all with this window, and is anything still
  // possible? Both are the nudge's own questions, asked of the one Hero whose
  // frame does not nudge — the pilot's console is the bottom half of the
  // screen, so the rail never offers them and this warning is their half of
  // the same rule.
  if (heroActed(store, pilotId) || !heroCanAct(catalog, state, pilotId)) {
    return null
  }
  const canFire = hero.actionBar.some((_slot, slotIndex) => slotCanFire(catalog, state, pilotId, slotIndex))
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

  // Who the rail would hand the console to, or null when it is Next. A
  // primitive, so this subscription cuts a render on every action that does
  // not change the answer. Suppressed while the scripted turn is running and
  // while a Boss Row is being told: the rail belongs to those two first, and
  // both are states the player is being walked through rather than asked to
  // fill.
  const nudgeHeroId = useWorkbench((store) =>
    step !== null || awaitingContinue || activeBeatId !== null
      ? null
      : nextNudge(catalog, store, selectPilotId(store), store.nudgedHeroIds),
  )
  const nudgeToUnacted = useWorkbench((store) => store.nudgeToUnacted)
  const nudgeTitle = nudgeHeroId === null ? '' : state.board.entities[nudgeHeroId]?.title ?? nudgeHeroId

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
    // The unacted press: hand the console to the seat that is still waiting,
    // and do not close the window. The offer is recorded by the same action,
    // so pressing again walks to the next one and then to Next itself.
    if (nudgeHeroId !== null) {
      // The console changes hands here too, so the frames trade places here
      // too — measured before the store is written, exactly as a tap on the
      // frame itself does it (`ui/party/controlSwap.ts`).
      captureFrameBoxes()
      nudgeToUnacted(nudgeHeroId)
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
  // An ended Encounter never nudges without this line either — `heroCanAct`
  // refuses an inactive state — but Restart outranks every other reading of
  // the rail, and saying so here is cheaper than trusting a chain of two.
  const nudging = !ended && nudgeHeroId !== null
  const Icon = ended ? RestartIcon : awaitingContinue ? PlayIcon : nudging ? UnactedIcon : AdvanceIcon
  const label = ended
    ? 'Restart the Encounter'
    : awaitingContinue
      ? 'Continue: play the next Boss Beat'
      : nudging
        ? `${nudgeTitle} has not acted this window: tap to take control`
        : 'Next: close this window'

  return (
    <>
      <button
        type="button"
        data-testid={ended ? 'restart' : 'next-phase'}
        data-rail={ended ? 'restart' : awaitingContinue ? 'continue' : nudging ? 'unacted' : 'next'}
        data-nudge-hero={nudging && nudgeHeroId !== null ? nudgeHeroId : undefined}
        data-playing-beat={activeBeatId ?? undefined}
        aria-label={label}
        onClick={ended ? () => restart() : onPress}
        // The rail is the Action Bar's live gold, the same face a Slot wears
        // when it can fire — pressing it is always a move. Its mark is held
        // to the plate's middle, so it takes the centred inset: the cut is
        // half as deep there, and the glyph keeps the room the full rake
        // would have spent.
        // The nudge wears the ring rather than a second face: the rail is
        // already the bar's one gold plate, so what has to change is that it
        // is *asking* — and a ring is the mark this interface has always used
        // for a press it is waiting on.
        className={`wb-plate wb-plate-lg wb-plate-centered wb-face-gold wb-acc-gold col-span-2 flex min-h-20 items-center justify-center text-gold-950 transition hover:brightness-110 active:translate-y-px ${FOCUS_RING_CLASS} ${
          spotlit ? SPOTLIGHT_CLASS : nudging ? NUDGE_RING_CLASS : ''
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
