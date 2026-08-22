import { cardChargeCap, cardWindowSpeed, fireTargeting, legality, slotChargeCount, type Card, type EncounterState, type SlotState } from '@/engine'
import type { WorkbenchCatalog } from '@/store/workbench'

// One definition of "this Slot can fire right now": loaded, holding at least
// one Charge, not yet activated, its Top Card's window matches the current
// phase of an active Encounter — and the rules would actually accept the shot.
// The Action Bar's glow and the coach prompts both read this so they can never
// disagree.
//
// That last clause is the engine's, not this module's: the Slot is offered
// only if some fire from it is legal (ADR 0013). Before every ability carried
// a reach (D-073) the window match was the whole answer, because a charged
// Steady Strike could always fire — there was no board position that refused
// it. Now there is, and a plate that stayed lit from out of reach would be
// asserting a move the rules deny.
export function slotCanFire(catalog: WorkbenchCatalog, state: EncounterState, heroId: string, slotIndex: number): boolean {
  const slot = state.heroes[heroId]?.actionBar[slotIndex]
  if (!state.active || !slot || slot.topCard === null || slotChargeCount(slot) === 0 || slot.activatedWindow !== null) {
    return false
  }
  if (cardWindowSpeed(catalog.cards[slot.topCard.cardId]) !== state.phase) {
    return false
  }
  // A card that selects something can fire if anything legal is selectable;
  // one that selects nothing is asked directly. Both questions are the
  // engine's, so the bar and the resolver cannot drift apart. The switch is
  // exhaustive on the targeting modes: an ally card once fell through to the
  // untargeted question here, which legality refuses, so its plate never lit
  // however legal the shot was (engine-hardening follow-up P0).
  const targeting = fireTargeting(catalog, state, heroId, slotIndex)
  switch (targeting.mode) {
    case 'piece':
    case 'ally':
      return targeting.legalTargetIds.length > 0
    case 'hex':
      return targeting.legalHexes.length > 0
    case 'board_slot':
      return targeting.legalSlots.length > 0
    case 'none':
      return legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex }).legal
    default: {
      const undecided: never = targeting.mode
      throw new Error(`fire targeting mode ${String(undecided)} has no can-fire decision`)
    }
  }
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
  // its standing clause alone (D-064).
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

// ---------------------------------------------------------------------------
// The whole reading of one Slot
//
// Everything above answers one question about a Slot. What the plate needs is
// all of them at once plus the three decisions built on top — which state word
// applies, what an in-hand card would do here, and which tone the plate wears
// — so `readSlot` composes them into a single value the component renders
// without deciding anything.
//
// These three used to live inside the component: the state name as a local
// helper, the incoming action as a mutable `let` block, and the tone as eight
// ternaries nested inside a className template literal. All three are rules —
// the tone's precedence especially, which is an ordering argument — and none
// of them could be tested where they sat. That is what moved.
// ---------------------------------------------------------------------------

export type SlotStateName = 'empty' | 'loaded' | 'charged' | 'full' | 'fired'

// The state word, and the aria-label's name for the state. Empty prints
// nothing: the plate's own `+` says it, and "Slot 2: empty" is built whole
// below rather than from this table.
export const SLOT_STATE_LABEL: Record<SlotStateName, string> = {
  empty: '',
  loaded: 'Loaded',
  charged: 'Charged',
  full: 'Full',
  fired: 'Fired',
}

export function slotStateName(slot: SlotState, chargeCap: number): SlotStateName {
  if (slot.topCard === null) {
    return 'empty'
  }
  if (slot.activatedWindow !== null) {
    return 'fired'
  }
  if (slot.charges.length === chargeCap) {
    return 'full'
  }
  return slot.charges.length > 0 ? 'charged' : 'loaded'
}

// What landing the in-hand card here would do. A card placed into a Slot that
// began this Loadout empty is tentative, so landing another card there Swaps
// it back to hand; Replace — and its confirmation — is reserved for bundles
// the Slot carried into the Round.
export type SlotIncomingAction = 'Prepare' | 'Charge' | 'Replace' | 'Swap'

export interface SlotIncoming {
  action: SlotIncomingAction
  // Whether the engine would accept it. Asked of `legality` rather than
  // decided here (ADR 0013): the plate must never offer a move the rules
  // would refuse, and it must never refuse one they would take.
  legal: boolean
}

export function slotIncoming(
  catalog: WorkbenchCatalog,
  state: EncounterState,
  heroId: string,
  slot: SlotState,
  slotIndex: number,
  incomingCardId: string | null,
): SlotIncoming | null {
  if (incomingCardId === null) {
    return null
  }
  const action: SlotIncomingAction =
    slot.topCard === null ? 'Prepare' : state.phase === 'loadout' ? (slot.placedThisLoadout ? 'Swap' : 'Replace') : 'Charge'
  const legal = legality(catalog, state, {
    kind: action === 'Charge' ? 'charge_slot' : 'load_slot',
    sourceId: heroId,
    slotIndex,
    cardInstanceId: incomingCardId,
  }).legal
  return { action, legal }
}

// The plate's tone, as a name rather than a class string: a Slot is a raked
// oathsteel plate whose state lives in its face and its leading-edge accent,
// and which of the six readings applies is a question of precedence.
//
// The order is the argument. An offer outranks everything — a card held over
// the bar is a Charge offer, and charging is the move an off Slot still owns.
// Out-of-window is consulted *before* Full, because Full's gold says "can
// fire" and that is the one claim a Slot waiting for the other window must
// not make. Fired sits below it so a spent Slot reads spent rather than
// merely parked.
export type SlotTone = 'offer' | 'offer-replace' | 'live' | 'off' | 'loaded' | 'empty'

export function slotTone(reading: {
  incoming: SlotIncoming | null
  canFire: boolean
  outOfWindow: boolean
  stateName: SlotStateName
  hasCard: boolean
}): SlotTone {
  if (reading.incoming !== null && reading.incoming.legal) {
    return reading.incoming.action === 'Replace' ? 'offer-replace' : 'offer'
  }
  if (reading.canFire) {
    return 'live'
  }
  if (reading.outOfWindow) {
    return 'off'
  }
  if (reading.stateName === 'full') {
    return 'live'
  }
  if (reading.stateName === 'fired') {
    return 'off'
  }
  return reading.hasCard ? 'loaded' : 'empty'
}

export interface SlotReading {
  card: Card | null
  chargeCap: number
  chargeCount: number
  stateName: SlotStateName
  canFire: boolean
  outOfWindow: boolean
  // The Keywords this Top Card is hunting for, and whether it can act on one
  // right now. Held apart on purpose: the appetite is the card's and holds all
  // window long, while the ability to take a Charge moves with the stack.
  wanted: string[]
  takesCharge: boolean
  incoming: SlotIncoming | null
  tone: SlotTone
}

// `slot` must be the Slot `state` holds at `slotIndex`. Every other answer
// here is a function of the value passed in, but `canFire` asks the engine
// whether a fire from that *index* would be legal (D-073) — so a Slot read
// out of position answers for whatever is really seated there.
export function readSlot(
  catalog: WorkbenchCatalog,
  state: EncounterState,
  heroId: string,
  slot: SlotState,
  slotIndex: number,
  incomingCardId: string | null,
): SlotReading {
  const card = slot.topCard ? catalog.cards[slot.topCard.cardId] : null
  const chargeCap = card ? cardChargeCap(card) : 0
  const stateName = slotStateName(slot, chargeCap)
  const canFire = slotCanFire(catalog, state, heroId, slotIndex)
  const outOfWindow = slotOutOfWindow(catalog, state, slot)
  const incoming = slotIncoming(catalog, state, heroId, slot, slotIndex, incomingCardId)
  return {
    card,
    chargeCap,
    chargeCount: slot.charges.length,
    stateName,
    canFire,
    outOfWindow,
    wanted: slotWantedKeywords(catalog, slot),
    takesCharge: slotTakesCharge(catalog, state, slot),
    incoming,
    tone: slotTone({ incoming, canFire, outOfWindow, stateName, hasCard: card !== null }),
  }
}

// What a screen reader is told. The want marks are the only thing on the
// plate with no word beside them, so the label is where they are spoken.
export function slotLabel(catalog: WorkbenchCatalog, reading: SlotReading, slotIndex: number): string {
  const position = `Slot ${slotIndex + 1}`
  if (reading.card === null) {
    return `${position}: empty`
  }
  const window = reading.outOfWindow ? `, fires in the ${cardWindowSpeed(reading.card) === 'quick' ? 'Quick' : 'Slow'} Window` : ''
  const appetite =
    reading.wanted.length > 0 && reading.takesCharge
      ? `, takes ${reading.wanted.map((keywordId) => catalog.keywords[keywordId]?.title ?? keywordId).join(' or ')} cards`
      : ''
  return `${position}: ${reading.card.title}, ${SLOT_STATE_LABEL[reading.stateName]}${window}${appetite}`
}
