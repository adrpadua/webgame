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
