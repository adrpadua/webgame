import { neighbors } from './board'
import { legality } from './legality'
import { hexesWithinRadius, parseHexKey, type Axial } from './hex'
import type { ContentCatalog } from './content/catalog'
import type { EncounterActionInput } from './actions'
import type { EncounterState } from './types'

export interface FireTargeting {
  mode: 'none' | 'piece' | 'hex'
  legalTargetIds: string[]
  legalHexes: Axial[]
  previewHexes: Axial[]
}

export function fireTargeting(
  catalog: ContentCatalog,
  state: EncounterState,
  heroId: string,
  slotIndex: number,
  hoveredHex?: Axial,
): FireTargeting {
  const slot = state.heroes[heroId]?.actionBar[slotIndex]
  const card = slot?.topCard ? catalog.cards[slot.topCard.cardId] : undefined
  if (!card) {
    return { mode: 'none', legalTargetIds: [], legalHexes: [], previewHexes: [] }
  }
  if (card.burst_radius > 0) {
    const legalHexes = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .filter((targetHex) => legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex, targetHex }).legal)
    const hoveredIsLegal =
      hoveredHex !== undefined && legalHexes.some((coords) => coords.q === hoveredHex.q && coords.r === hoveredHex.r)
    return {
      mode: 'hex',
      legalTargetIds: [],
      legalHexes,
      previewHexes: hoveredIsLegal ? hexesWithinRadius(state.board.hexes, hoveredHex, card.burst_radius) : [],
    }
  }
  const appliedStatus = card.applies_status === '' ? undefined : catalog.statuses[card.applies_status]
  if (card.damage > 0 || card.push_tiles > 0 || card.pull_tiles > 0 || appliedStatus?.applies_to === 'enemy') {
    const legalTargetIds = Object.keys(state.board.entities)
      .sort()
      .filter((targetId) => legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex, targetId }).legal)
    return { mode: 'piece', legalTargetIds, legalHexes: [], previewHexes: [] }
  }
  return { mode: 'none', legalTargetIds: [], legalHexes: [], previewHexes: [] }
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
  hero.actionBar.forEach((_slot, slotIndex) => {
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
    const targeting = fireTargeting(catalog, state, heroId, slotIndex)
    const fireActions: EncounterActionInput[] =
      targeting.mode === 'hex'
        ? targeting.legalHexes.map((targetHex) => ({ kind: 'fire_slot', sourceId: heroId, slotIndex, targetHex }))
        : targeting.mode === 'piece'
          ? targeting.legalTargetIds.map((targetId) => ({ kind: 'fire_slot', sourceId: heroId, slotIndex, targetId }))
          : [{ kind: 'fire_slot', sourceId: heroId, slotIndex }]
    for (const fireAction of fireActions) {
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
