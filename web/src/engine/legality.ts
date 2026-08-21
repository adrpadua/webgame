import { cardChargeCap, type ContentCatalog } from './content/catalog'
import { hexDistance } from './hex'
import { isLegalMove } from './board'
import { fireSlotLegality } from './fireLegality'
import { legal, illegal } from './verdicts'
import type { EncounterActionInput } from './actions'
import type { CardInstance, EncounterState, HeroState, LegalityVerdict } from './types'

// The single statement of every pre-resolution rule (ADR 0014): an action is
// applied if and only if this predicate calls it legal, and nothing outside
// this module reimplements gameplay legality. The seam is `legality()` alone
// (engine-hardening P3); the per-command validators below and the fire_slot
// cluster in `fireLegality.ts` are implementation behind it, named so the
// dispatch reads as a table of contents.

function handCard(hero: HeroState | undefined, cardInstanceId: string): CardInstance | undefined {
  return hero?.hand.find((card) => card.instanceId === cardInstanceId)
}

function loadSlotLegality(state: EncounterState, action: Extract<EncounterActionInput, { kind: 'load_slot' }>): LegalityVerdict {
  const hero = state.heroes[action.sourceId]
  const card = handCard(hero, action.cardInstanceId)
  if (!hero || !card) {
    return illegal('The chosen hand card is unavailable.')
  }
  if (
    action.slotIndex < 0 ||
    action.slotIndex >= hero.actionBar.length ||
    (state.phase !== 'loadout' && state.phase !== 'quick' && state.phase !== 'slow')
  ) {
    return illegal('Loading a Slot requires a legal Slot during Loadout, Quick, or Slow.')
  }
  // The Signature Slot is not replaceable at Loadout or ever (ADR 0032):
  // its Top Card is printed on the Hero.
  if (hero.actionBar[action.slotIndex].fixed) {
    return illegal('The Signature Slot never takes a prepared card.')
  }
  if (hero.actionBar[action.slotIndex].topCard !== null && state.phase !== 'loadout') {
    return illegal('Replacing a Slot is only allowed during Loadout.')
  }
  return legal()
}

function chargeSlotLegality(
  catalog: ContentCatalog,
  state: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'charge_slot' }>,
): LegalityVerdict {
  const hero = state.heroes[action.sourceId]
  const card = handCard(hero, action.cardInstanceId)
  if (!hero || !card) {
    return illegal('The chosen hand card is unavailable.')
  }
  if (action.slotIndex < 0 || action.slotIndex >= hero.actionBar.length || (state.phase !== 'quick' && state.phase !== 'slow')) {
    return illegal('Charging requires a legal Slot during Quick or Slow.')
  }
  const slot = hero.actionBar[action.slotIndex]
  // Earned, never bought (D-064): hand cards physically cannot flow into
  // the Signature, which is what protects the other Slots' fuel and ADR
  // 0002's Slot Tension by construction.
  if (slot.fixed) {
    return illegal('The Signature Slot charges only through its standing clause.')
  }
  if (
    slot.topCard === null ||
    slot.activatedWindow === state.phase ||
    slot.charges.length >= cardChargeCap(catalog.cards[slot.topCard.cardId])
  ) {
    return illegal('That Slot cannot accept another charge.')
  }
  return legal()
}

function reviveAllyLegality(state: EncounterState, action: Extract<EncounterActionInput, { kind: 'revive_ally' }>): LegalityVerdict {
  // The rescue's whole cost is adjacency plus a card, so both are checked
  // here and neither is checked anywhere else (ADR 0036).
  const rescuer = state.heroes[action.sourceId]
  if (!rescuer || rescuer.status !== 'living') {
    return illegal('Only a living Hero can revive an ally.')
  }
  const fallen = state.heroes[action.targetId]
  if (!fallen || fallen.status !== 'downed') {
    return illegal('That ally is not Downed.')
  }
  if (!rescuer.hand.some((card) => card.instanceId === action.cardInstanceId)) {
    return illegal('Reviving an ally costs a card from hand.')
  }
  const rescuerAt = state.board.entities[action.sourceId]?.coords
  const fallenAt = state.board.entities[action.targetId]?.coords
  if (!rescuerAt || !fallenAt || hexDistance(rescuerAt, fallenAt) > 1) {
    return illegal('You must be adjacent to the Downed ally.')
  }
  return legal()
}

function diminishedActionLegality(
  state: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'diminished_action' }>,
): LegalityVerdict {
  const hero = state.heroes[action.sourceId]
  if (!hero || hero.status !== 'incapacitated') {
    return illegal('Only an Incapacitated Hero takes a diminished action.')
  }
  // The two ally-facing choices need a living ally to aim at; a Party with
  // none is a Party that has already lost.
  if (action.action !== 'reduce_escalation') {
    const ally = action.targetId === undefined ? undefined : state.heroes[action.targetId]
    if (!ally || ally.status !== 'living') {
      return illegal('That action needs a living ally.')
    }
  }
  return legal()
}

function moveHeroLegality(state: EncounterState, action: Extract<EncounterActionInput, { kind: 'move_hero' }>): LegalityVerdict {
  const hero = state.heroes[action.sourceId]
  const card = handCard(hero, action.cardInstanceId)
  if (!hero || state.phase !== 'quick' || !card) {
    return illegal('Hero movement requires the Quick Window and a hand card for Stamina.')
  }
  if (!isLegalMove(state.board, action.sourceId, action.destination)) {
    return illegal('That hex is not a legal move destination.')
  }
  return legal()
}

function discardForStaminaLegality(
  state: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'discard_for_stamina' }>,
): LegalityVerdict {
  // Stamina exists only as the Quick Window movement payment; a bare
  // discard is retained for action-catalog parity with the frozen
  // reference but is held to the same window (see the working note).
  const hero = state.heroes[action.sourceId]
  if (!hero || state.phase !== 'quick' || !handCard(hero, action.cardInstanceId)) {
    return illegal('Discarding for Stamina requires the Quick Window and a hand card.')
  }
  return legal()
}

export function legality(catalog: ContentCatalog, state: EncounterState, action: EncounterActionInput): LegalityVerdict {
  if (!state.active) {
    return illegal('The Encounter has already ended.')
  }
  switch (action.kind) {
    case 'load_slot':
      return loadSlotLegality(state, action)
    case 'charge_slot':
      return chargeSlotLegality(catalog, state, action)
    case 'fire_slot':
      return fireSlotLegality(catalog, state, action)
    case 'revive_ally':
      return reviveAllyLegality(state, action)
    case 'diminished_action':
      return diminishedActionLegality(state, action)
    case 'move_hero':
      return moveHeroLegality(state, action)
    case 'discard_for_stamina':
      return discardForStaminaLegality(state, action)
    case 'resolve_boss':
      return action.beat ? legal() : illegal('Boss resolution needs an authored beat.')
    default:
      // Generated actions (damage, hazards, spawns, phase bookkeeping) carry
      // no pre-resolution rule; their failures are resolution-time outcomes.
      return legal()
  }
}
