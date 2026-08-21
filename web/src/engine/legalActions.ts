import { neighbors } from './board'
import { legality } from './legality'
import { hexesWithinRadius, parseHexKey, type Axial } from './hex'
import { cardNeedsPieceTarget, type ContentCatalog } from './content/catalog'
import type { PlayerCommandInput } from './actions'
import { DIMINISHED_ACTIONS } from './downed'
import type { EncounterState } from './types'

export interface FireTargeting {
  mode: 'none' | 'piece' | 'hex' | 'ally'
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
  // Hex mode belongs to every hex-targeting card, not only Bursts: since
  // D-048 a card may put a Counter on the ground, and D-086's first consumer
  // is exactly that — a zero-burst zone card. Keyed off burst_radius alone,
  // such a card fell to mode 'none', offered an untargeted fire, and was
  // refused by the legality that demands the hex — a card the catalog loads
  // and nothing can play.
  if (card.burst_radius > 0 || card.target_type === 'hex') {
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
  // An `ally` card targets a living party member (ADR 0035); the legal set
  // comes from the same legality predicate every mode asks, so range and the
  // Downed refusal live in one place.
  if (card.target_type === 'ally') {
    const legalTargetIds = Object.keys(state.board.entities)
      .sort()
      .filter((targetId) => legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex, targetId }).legal)
    return { mode: 'ally', legalTargetIds, legalHexes: [], previewHexes: [] }
  }
  if (card.damage > 0 || card.push_tiles > 0 || card.pull_tiles > 0 || cardNeedsPieceTarget(card)) {
    const legalTargetIds = Object.keys(state.board.entities)
      .sort()
      .filter((targetId) => legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex, targetId }).legal)
    return { mode: 'piece', legalTargetIds, legalHexes: [], previewHexes: [] }
  }
  return { mode: 'none', legalTargetIds: [], legalHexes: [], previewHexes: [] }
}

// The command kinds this enumeration considers. Guarded against
// `PLAYER_COMMAND_KINDS` by the command-space contract test, so a new player
// command cannot be added to the vocabulary without a decision here — the
// Priority 2 invariant of the engine-hardening handoff: `legalActions` is the
// complete legal player action space, the one API the UI, AI, hints, and
// simulation all read.
export const ENUMERATED_COMMAND_KINDS = [
  'load_slot',
  'charge_slot',
  'fire_slot',
  'move_hero',
  'discard_for_stamina',
  'revive_ally',
  'diminished_action',
] as const

// Enumerates every currently legal player command for a Hero, by asking the
// same legality predicate that gates resolution. Card-consuming enumerations
// follow the movement convention: one representative action with `hand[0]`
// rather than the hand-sized cross-product, because the *choice of fuel* is
// presentation's question and "is this command available" is this API's.
export function legalActions(catalog: ContentCatalog, state: EncounterState, heroId: string): PlayerCommandInput[] {
  const actions: PlayerCommandInput[] = []
  if (!state.active) {
    return actions
  }
  const hero = state.heroes[heroId]
  if (!hero) {
    return actions
  }
  // An Incapacitated Hero's whole action space is the diminished vocabulary
  // (ADR 0036): three choices, the two ally-facing ones aimed at each living
  // ally in seat order.
  for (const diminished of DIMINISHED_ACTIONS) {
    const targets = diminished === 'reduce_escalation' ? [undefined] : state.partyHeroIds.filter((allyId) => state.heroes[allyId]?.status === 'living')
    for (const targetId of targets) {
      const diminishedAction: PlayerCommandInput = { kind: 'diminished_action', sourceId: heroId, action: diminished, targetId }
      if (legality(catalog, state, diminishedAction).legal) {
        actions.push(diminishedAction)
      }
    }
  }
  // The rescue (ADR 0036): adjacency and the card cost are legality's to
  // refuse; this offers each Downed ally with the representative hand card.
  if (hero.hand.length > 0) {
    for (const allyId of state.partyHeroIds) {
      if (allyId === heroId || state.heroes[allyId]?.status !== 'downed') {
        continue
      }
      const reviveAction: PlayerCommandInput = { kind: 'revive_ally', sourceId: heroId, targetId: allyId, cardInstanceId: hero.hand[0].instanceId }
      if (legality(catalog, state, reviveAction).legal) {
        actions.push(reviveAction)
      }
    }
    const discardAction: PlayerCommandInput = { kind: 'discard_for_stamina', sourceId: heroId, cardInstanceId: hero.hand[0].instanceId }
    if (legality(catalog, state, discardAction).legal) {
      actions.push(discardAction)
    }
  }
  hero.actionBar.forEach((_slot, slotIndex) => {
    for (const card of hero.hand) {
      const loadAction: PlayerCommandInput = { kind: 'load_slot', sourceId: heroId, slotIndex, cardInstanceId: card.instanceId }
      if (legality(catalog, state, loadAction).legal) {
        actions.push(loadAction)
      }
      const chargeAction: PlayerCommandInput = { kind: 'charge_slot', sourceId: heroId, slotIndex, cardInstanceId: card.instanceId }
      if (legality(catalog, state, chargeAction).legal) {
        actions.push(chargeAction)
      }
    }
    const targeting = fireTargeting(catalog, state, heroId, slotIndex)
    const fireActions: PlayerCommandInput[] =
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
      const moveAction: PlayerCommandInput = {
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
