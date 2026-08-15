import { cardChargeCap, cardWindowSpeed, type ContentCatalog } from './content/catalog'
import { hexDistance } from './hex'
import { isLegalMove } from './board'
import { getStatus } from './statuses'
import type { EncounterActionInput } from './actions'
import type { CardInstance, EncounterState, HeroState, LegalityVerdict } from './types'

function legal(): LegalityVerdict {
  return { legal: true, reason: '' }
}

function illegal(reason: string): LegalityVerdict {
  return { legal: false, reason }
}

function handCard(hero: HeroState | undefined, cardInstanceId: string): CardInstance | undefined {
  return hero?.hand.find((card) => card.instanceId === cardInstanceId)
}

// The single statement of every pre-resolution rule (ADR 0014): an action is
// applied if and only if this predicate calls it legal.
export function legality(catalog: ContentCatalog, state: EncounterState, action: EncounterActionInput): LegalityVerdict {
  if (!state.active) {
    return illegal('The Encounter has already ended.')
  }
  switch (action.kind) {
    case 'load_slot': {
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
      if (hero.actionBar[action.slotIndex].topCard !== null && state.phase !== 'loadout') {
        return illegal('Replacing a Slot is only allowed during Loadout.')
      }
      return legal()
    }
    case 'charge_slot': {
      const hero = state.heroes[action.sourceId]
      const card = handCard(hero, action.cardInstanceId)
      if (!hero || !card) {
        return illegal('The chosen hand card is unavailable.')
      }
      if (action.slotIndex < 0 || action.slotIndex >= hero.actionBar.length || (state.phase !== 'quick' && state.phase !== 'slow')) {
        return illegal('Charging requires a legal Slot during Quick or Slow.')
      }
      const slot = hero.actionBar[action.slotIndex]
      if (
        slot.topCard === null ||
        slot.activatedWindow === state.phase ||
        slot.charges.length >= cardChargeCap(catalog.cards[slot.topCard.cardId])
      ) {
        return illegal('That Slot cannot accept another charge.')
      }
      return legal()
    }
    case 'fire_slot': {
      const hero = state.heroes[action.sourceId]
      if (!hero || action.slotIndex < 0 || action.slotIndex >= hero.actionBar.length) {
        return illegal('Select a legal Slot.')
      }
      const slot = hero.actionBar[action.slotIndex]
      if (slot.topCard === null || slot.charges.length === 0) {
        return illegal('A loaded Slot needs at least one charged card.')
      }
      if (slot.activatedWindow === state.phase) {
        return illegal('A Slot may fire only once in its matching window.')
      }
      const card = catalog.cards[slot.topCard.cardId]
      if (cardWindowSpeed(card) !== state.phase) {
        return illegal('The Top Card cannot fire in this window.')
      }
      if (card.damage > 0) {
        const targetId = action.targetId ?? ''
        const target = state.board.entities[targetId]
        const source = state.board.entities[action.sourceId]
        if (!target || target.kind !== 'minion') {
          return illegal('The Top Card needs a Minion target.')
        }
        const targetRange = hexDistance(source.coords, target.coords)
        if (targetRange > card.range_tiles) {
          return { ...illegal("The chosen Minion is outside the Top Card's range."), targetRange }
        }
        return { ...legal(), targetRange }
      }
      return legal()
    }
    case 'move_hero': {
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
    case 'discard_for_stamina': {
      // Stamina exists only as the Quick Window movement payment; a bare
      // discard is retained for action-catalog parity with the frozen
      // reference but is held to the same window (see the working note).
      const hero = state.heroes[action.sourceId]
      if (!hero || state.phase !== 'quick' || !handCard(hero, action.cardInstanceId)) {
        return illegal('Discarding for Stamina requires the Quick Window and a hand card.')
      }
      return legal()
    }
    case 'resolve_boss': {
      if (!action.beat) {
        return illegal('Boss resolution needs an authored beat.')
      }
      return legal()
    }
    case 'expire_status': {
      const effect = getStatus(state, action.targetId, action.statusId)
      if (!effect || effect.expiresAtWindowEnd !== action.window || state.phase !== action.window) {
        return illegal('The Status Effect is not eligible to expire at this boundary.')
      }
      return legal()
    }
    default:
      // Generated actions (damage, hazards, spawns, phase bookkeeping) carry
      // no pre-resolution rule; their failures are resolution-time outcomes.
      return legal()
  }
}
