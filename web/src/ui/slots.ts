import { cardWindowSpeed, type EncounterState, type SlotState } from '@/engine'
import type { WorkbenchCatalog } from '@/store/workbench'

// One definition of "this Slot can fire right now": loaded, holding at least
// one Charge, not yet activated, and its Top Card's window matches the
// current phase of an active Encounter. The Action Bar's glow and the coach
// prompts both read this so they can never disagree.
export function slotCanFire(catalog: WorkbenchCatalog, state: EncounterState, slot: SlotState): boolean {
  if (!state.active || slot.topCard === null || slot.charges.length === 0 || slot.activatedWindow !== null) {
    return false
  }
  return cardWindowSpeed(catalog.cards[slot.topCard.cardId]) === state.phase
}

// One definition of "the Hand can act right now": the current phase is a
// player window in which a hand card has at least one legal action. Per the
// engine's legality rules a card can be loaded in Loadout, Quick, or Slow
// and charged in Quick or Slow, so the Boss rows — Instant and Incoming —
// are the phases in which every card in hand is inert. The Hand reads this
// so it never asserts, at full brightness, a choice the rules deny.
export function handCanAct(state: EncounterState): boolean {
  return state.active && (state.phase === 'loadout' || state.phase === 'quick' || state.phase === 'slow')
}
