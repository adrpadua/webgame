import { create } from 'zustand'
import { cardWindowSpeed } from '@/engine'
import { catalog, type WorkbenchCatalog } from './catalog'
import { installDevBridge } from './devBridge'
import { createInteractionSlice, type InteractionSlice } from './interactionSlice'
import { createSessionSlice, OPENING_ENCOUNTER_ID, type SessionSlice } from './sessionSlice'
import { keepSessionAcrossHotUpdates } from './hmr'

// The Workbench store, composed from two slices that answer two different
// questions:
//
//   sessionSlice     — what has happened in this Encounter (the timeline)
//   interactionSlice — what the player is in the middle of doing (gestures)
//
// They are one store rather than two because a gesture resolving is a
// timeline entry: `hexClicked` ends in `submit`, and `advance` clears every
// gesture in flight. Splitting them into separate stores would put that
// handoff across a boundary and let the two disagree about whether a move is
// still pending. Splitting them into slices instead keeps the handoff a plain
// call through `get()` while giving each concern its own file, its own
// documented state shape, and its own reasons.
//
// Nothing here decides a rule. Every question about legality, targeting, and
// occupancy goes to the engine (ADR 0013, ADR 0017); this is the seam between
// a pointer and a resolved action, and no more.

export type WorkbenchStore = SessionSlice & InteractionSlice

export const useWorkbench = create<WorkbenchStore>()((...args) => ({
  ...createSessionSlice(...args),
  ...createInteractionSlice(...args),
}))

export { catalog, OPENING_ENCOUNTER_ID }
export type { WorkbenchCatalog }

// The store's public reading surface. Selectors live in `selectors.ts` and the
// timeline's own rules in `sessionTimeline.ts`; both are re-exported here so a
// component has one import for "how do I read the Workbench".
export {
  selectActive,
  selectBossPhase,
  selectCanUndo,
  selectCurrentProgramId,
  selectOutcome,
  selectOutcomeReason,
  selectPhase,
  selectPhaseBreakText,
  selectState,
} from './selectors'
export { selectUndoTarget, type FactEntry, type HistoryEntry, type TimelinePosition } from './sessionTimeline'

export function slotWindowLabel(cardId: string): 'Quick' | 'Slow' {
  return cardWindowSpeed(catalog.cards[cardId]) === 'quick' ? 'Quick' : 'Slow'
}

installDevBridge(useWorkbench)
keepSessionAcrossHotUpdates(useWorkbench)
