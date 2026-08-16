import { neighbors } from './board'
import { legality } from './legality'
import type { ContentCatalog } from './content/catalog'
import type { EncounterActionInput } from './actions'
import type { EncounterState, SlotState } from './types'

function fireTargetCandidates(catalog: ContentCatalog, state: EncounterState, slot: SlotState): string[] {
  if (slot.topCard === null) {
    return []
  }
  const card = catalog.cards[slot.topCard.cardId]
  if (card.damage <= 0) {
    return ['']
  }
  return Object.values(state.board.entities)
    .filter((entity) => entity.kind === 'minion')
    .map((entity) => entity.id)
}

// Enumerates every currently legal player action for a Hero, by asking the
// same legality predicate that gates resolution.
export function legalActions(catalog: ContentCatalog, state: EncounterState, heroId: string): EncounterActionInput[] {
  const actions: EncounterActionInput[] = []
  if (!state.active) {
    return actions
  }
  const hero = state.heroes[heroId]
  if (!hero) {
    return actions
  }
  hero.actionBar.forEach((slot, slotIndex) => {
    for (const card of hero.hand) {
      const loadAction: EncounterActionInput = { kind: 'load_slot', sourceId: heroId, slotIndex, cardInstanceId: card.instanceId }
      if (legality(catalog, state, loadAction).legal) {
        actions.push(loadAction)
      }
      const chargeAction: EncounterActionInput = { kind: 'charge_slot', sourceId: heroId, slotIndex, cardInstanceId: card.instanceId }
      if (legality(catalog, state, chargeAction).legal) {
        actions.push(chargeAction)
      }
    }
    for (const targetId of fireTargetCandidates(catalog, state, slot)) {
      const fireAction: EncounterActionInput = { kind: 'fire_slot', sourceId: heroId, slotIndex, targetId }
      if (legality(catalog, state, fireAction).legal) {
        actions.push(fireAction)
      }
    }
  })
  const entity = state.board.entities[heroId]
  if (hero.hand.length > 0 && entity) {
    for (const destination of neighbors(state.board.hexes, entity.coords)) {
      const moveAction: EncounterActionInput = {
        kind: 'move_hero',
        sourceId: heroId,
        destination,
        cardInstanceId: hero.hand[0].instanceId,
      }
      if (legality(catalog, state, moveAction).legal) {
        actions.push(moveAction)
      }
    }
  }
  return actions
}
