import { cardChargeCap, cardWindowSpeed, slotChargeCount, type EncounterState, type SlotState } from '@/engine'
import type { WorkbenchCatalog } from '@/store/workbench'

// One definition of "this Slot can fire right now": loaded, holding at least
// one Charge, not yet activated, and its Top Card's window matches the
// current phase of an active Encounter. The Action Bar's glow and the coach
// prompts both read this so they can never disagree.
export function slotCanFire(catalog: WorkbenchCatalog, state: EncounterState, slot: SlotState): boolean {
  if (!state.active || slot.topCard === null || slotChargeCount(slot) === 0 || slot.activatedWindow !== null) {
    return false
  }
  return cardWindowSpeed(catalog.cards[slot.topCard.cardId]) === state.phase
}

// The Keywords this Slot's Top Card is hunting for: every Keyword its Charge
// Modifiers name. A modifier that counts every charge alike (Charged Assault)
// names none and asks for none — any card in hand suits it equally, so there
// is nothing to look for. Authored order, no duplicates.
export function slotWantedKeywords(catalog: WorkbenchCatalog, slot: SlotState): string[] {
  if (slot.topCard === null) {
    return []
  }
  const wanted: string[] = []
  for (const modifierId of catalog.cards[slot.topCard.cardId].charge_modifiers) {
    const keywordId = catalog.chargeModifiers[modifierId]?.keyword_id ?? ''
    if (keywordId !== '' && !wanted.includes(keywordId)) {
      wanted.push(keywordId)
    }
  }
  return wanted
}

// One definition of "this Slot is waiting for the other window": a player
// window is open, the Slot holds an unfired Top Card, and that card fires in
// the window this one is not. The Action Bar reads this to turn the Slot
// visibly off — a quick Slot in the Slow Window cannot fire however charged
// it is, and a plate that stays lit through a window it cannot act in is
// asserting a move the rules deny.
//
// Deliberately false outside Quick and Slow: in Loadout and the Boss's rows
// no Slot fires, so "out of window" would dim the whole bar and say nothing.
// And deliberately false once the Slot has fired — Fired is its own state,
// and a spent Slot must not look merely parked.
export function slotOutOfWindow(catalog: WorkbenchCatalog, state: EncounterState, slot: SlotState): boolean {
  if (!state.active || (state.phase !== 'quick' && state.phase !== 'slow')) {
    return false
  }
  if (slot.topCard === null || slot.activatedWindow !== null) {
    return false
  }
  return cardWindowSpeed(catalog.cards[slot.topCard.cardId]) !== state.phase
}

// One definition of "this Slot can take another Charge right now", mirroring
// the engine's charge_slot rule: it holds a Top Card, has not activated in
// this window, and its Charge Stack is not already at the Top Card's Charge
// Value. The Slot's own want marks and the Hand's live Keywords both read
// this, so the two ends of the same offer can never disagree.
export function slotTakesCharge(catalog: WorkbenchCatalog, state: EncounterState, slot: SlotState): boolean {
  // A Signature Slot never takes a hand card: its Charge is earned through
  // its standing clause alone (D-057).
  if (slot.topCard === null || slot.fixed || slot.activatedWindow === state.phase) {
    return false
  }
  return slot.charges.length < cardChargeCap(catalog.cards[slot.topCard.cardId])
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
