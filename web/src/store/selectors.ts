import type { EncounterState, HeroState, Outcome, Phase, SlotState } from '@/engine'
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
// always new. The only selectors that actually cut a render are the ones that
// come back as a primitive and compare by value — a component subscribed to
// `selectPhase` re-renders when the phase changes and sits still through every
// Charge, shot, and step that does not touch it.
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
// which is exactly what reading the whole Encounter means.

export const selectState = (store: TimelinePosition): EncounterState => store.entries[store.index].state

export const selectPhase = (store: WorkbenchStore): Phase => selectState(store).phase
export const selectRound = (store: WorkbenchStore): number => selectState(store).round
export const selectActive = (store: WorkbenchStore): boolean => selectState(store).active
export const selectOutcome = (store: WorkbenchStore): Outcome => selectState(store).outcome
export const selectOutcomeReason = (store: WorkbenchStore): string => selectState(store).outcomeReason
export const selectEscalation = (store: WorkbenchStore): number => selectState(store).escalation
export const selectBossPhase = (store: WorkbenchStore): number => selectState(store).bossPhase
export const selectPrimaryHeroId = (store: WorkbenchStore): string => selectState(store).primaryHeroId
export const selectBossId = (store: WorkbenchStore): string => selectState(store).bossId
export const selectCurrentProgramId = (store: WorkbenchStore): string | null => selectState(store).currentProgramId
export const selectPhaseBreakText = (store: WorkbenchStore): string => selectState(store).phaseBreakText
export const selectRoundLimit = (store: WorkbenchStore): number => selectState(store).roundLimit
export const selectEnrageText = (store: WorkbenchStore): string => selectState(store).enrageText

// The primary Hero, for the components that read most of one. Re-fires on
// every action for the reason at the top of this file; it is here so that
// `selectState(store).heroes[selectState(store).primaryHeroId]` is written
// once rather than in nine components.
export const selectPrimaryHero = (store: WorkbenchStore): HeroState | undefined => {
  const state = selectState(store)
  return state.heroes[state.primaryHeroId]
}

export const selectSlot = (store: WorkbenchStore, slotIndex: number): SlotState | undefined => selectPrimaryHero(store)?.actionBar[slotIndex]

// How many cards are in the primary Hero's hand — a number, so a component
// that only lays the row out does not re-render when the cards change.
export const selectHandSize = (store: WorkbenchStore): number => selectPrimaryHero(store)?.hand.length ?? 0

export const selectCanUndo = (store: TimelinePosition): boolean => selectUndoTarget(store) !== null

// Whether a given card instance is the one the player has picked up, by
// either gesture. Both come back as booleans, so a card in a five-card Hand
// re-renders when its own selection changes and not when its neighbour's does.
export const selectIsSelected = (cardInstanceId: string) => (store: WorkbenchStore) => store.selectedCardId === cardInstanceId
export const selectIsDragging = (cardInstanceId: string) => (store: WorkbenchStore) => store.draggingCardId === cardInstanceId

// The card the player is offering to a Slot right now, by either gesture —
// what the Action Bar reads to show what each Slot would do with it.
export const selectIncomingCardId = (store: WorkbenchStore): string | null => store.selectedCardId ?? store.draggingCardId

export const selectIsMovePending = (store: WorkbenchStore): boolean => store.pendingMove !== null
