import type { EncounterState, Outcome, Phase } from '@/engine'
import { selectUndoTarget, type TimelinePosition } from './sessionTimeline'
import type { WorkbenchStore } from './workbench'

// Named readings of the store.
//
// Why these are almost all primitives
// -----------------------------------
// The rules engine hands back a deep `structuredClone` of the Encounter after
// every action (`resolve`, `advancePhase`), which is the right contract for a
// rules engine — nothing the renderer holds can alias state the engine is
// about to mutate — but it means the state tree has no structural sharing.
// `state.heroes[id]` is a brand-new object after *every* action, whether or
// not that Hero changed.
//
// So a selector that returns an object from inside `EncounterState` gives a
// component nothing: zustand compares with `Object.is`, and the reference is
// always new. `selectHero` would not be a narrower subscription than
// `selectState` — it would be the same subscription with more indirection.
// The only selectors that actually cut a render are the ones that come back
// as a primitive and compare by value: a component subscribed to
// `selectPhase` re-renders when the phase changes and sits still through
// every Charge, shot, and step that does not touch it.
//
// The rule for adding one: return a primitive. When a component genuinely
// needs several fields at once, subscribe to each primitive separately rather
// than building an object here — a fresh object would defeat the comparison
// this whole module exists to make possible.
//
// `selectState` is the deliberate exception, and the escape hatch. The entry's
// state object is stable between actions (the timeline holds it, nothing
// re-derives it), so subscribing to the root is correct for anything that
// really does read the whole Encounter — it just re-renders on every action,
// which is exactly what reading the whole Encounter means. Most of the play
// surface does exactly that, on purpose: PhaseControl, CoachMark, the Hand
// and the Slots each read broad enough slices that narrowing them would be
// contortion rather than architecture.
//
// This module holds the readings that are used, not a menu of the ones that
// could be. Add the selector when the component that wants it arrives.

export const selectState = (store: TimelinePosition): EncounterState => store.entries[store.index].state

// The pilot: the Hero the consoles operate and the gestures act as (D-088,
// the character-switching pass). The engine's `primaryHeroId` is seat 0 — the
// replay identity, the solo-Scenario anchor — and never moves; this cursor is
// UI state that defaults to it and is guarded against naming a Hero the
// current Encounter does not field, so a session transition into a solo
// Encounter simply falls back rather than stranding control.
export const selectPilotId = (store: WorkbenchStore): string => {
  const state = selectState(store)
  const cursor = store.controlledHeroId
  return cursor !== null && state.heroes[cursor] !== undefined ? cursor : state.primaryHeroId
}

export const selectPhase = (store: WorkbenchStore): Phase => selectState(store).phase
export const selectActive = (store: WorkbenchStore): boolean => selectState(store).active
export const selectOutcome = (store: WorkbenchStore): Outcome => selectState(store).outcome
export const selectOutcomeReason = (store: WorkbenchStore): string => selectState(store).outcomeReason
export const selectBossPhase = (store: WorkbenchStore): number => selectState(store).bossPhase
export const selectCurrentProgramId = (store: WorkbenchStore): string | null => selectState(store).currentProgramId
export const selectPhaseBreakText = (store: WorkbenchStore): string => selectState(store).phaseBreakText

export const selectCanUndo = (store: TimelinePosition): boolean => selectUndoTarget(store) !== null
