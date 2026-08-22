import { neighbors } from './board'
import { legality } from './legality'
import { hexesWithinRadius, parseHexKey, type Axial } from './hex'
import { cardNeedsPieceTarget, type ContentCatalog } from './content/catalog'
import type { PlayerCommandInput, SlotTarget } from './actions'
import { DIMINISHED_ACTIONS } from './downed'
import type { EncounterState } from './types'

export interface FireTargeting {
  mode: 'none' | 'piece' | 'hex' | 'ally' | 'board_slot'
  legalTargetIds: string[]
  legalHexes: Axial[]
  legalSlots: SlotTarget[]
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
    return { mode: 'none', legalTargetIds: [], legalHexes: [], legalSlots: [], previewHexes: [] }
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
      legalSlots: [],
      previewHexes: hoveredIsLegal ? hexesWithinRadius(state.board.hexes, hoveredHex, card.burst_radius) : [],
    }
  }
  // A `board_slot` card attaches to a prepared Slot (D-035, reachable since
  // D-048), so its legal set is Slot indexes, not pieces or ground. The mode
  // existed in the schema and in legality before it existed here — the P0 of
  // the engine-hardening follow-up: a family `legality()` accepts and this
  // function does not name falls to 'none', offers an untargeted fire, and is
  // refused — a card that loads and nothing can play.
  if (card.target_type === 'board_slot') {
    const legalSlots = state.partyHeroIds.flatMap((ownerId) =>
      (state.heroes[ownerId]?.actionBar ?? [])
        .map((_slot, ownedIndex) => ({ heroId: ownerId, slotIndex: ownedIndex }))
        .filter((targetSlot) => legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex, targetSlot }).legal),
    )
    return { mode: 'board_slot', legalTargetIds: [], legalHexes: [], legalSlots, previewHexes: [] }
  }
  // An `ally` card targets a living party member (ADR 0035); the legal set
  // comes from the same legality predicate every mode asks, so range and the
  // Downed refusal live in one place.
  if (card.target_type === 'ally') {
    const legalTargetIds = Object.keys(state.board.entities)
      .sort()
      .filter((targetId) => legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex, targetId }).legal)
    return { mode: 'ally', legalTargetIds, legalHexes: [], legalSlots: [], previewHexes: [] }
  }
  if (card.damage > 0 || card.push_tiles > 0 || card.pull_tiles > 0 || cardNeedsPieceTarget(card)) {
    const legalTargetIds = Object.keys(state.board.entities)
      .sort()
      .filter((targetId) => legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex, targetId }).legal)
    return { mode: 'piece', legalTargetIds, legalHexes: [], legalSlots: [], previewHexes: [] }
  }
  return { mode: 'none', legalTargetIds: [], legalHexes: [], legalSlots: [], previewHexes: [] }
}

// The fire_slot command for every target a mode admits. The switch is
// exhaustive on purpose — the P0 defect was exactly a mode ('ally') that
// existed above but fell through a two-way ternary here into the untargeted
// branch, where legality refused every fire it offered. The `never` default
// makes the compiler demand an enumeration decision for any future family
// before it can ship half-supported.
function fireCommands(targeting: FireTargeting, heroId: string, slotIndex: number): PlayerCommandInput[] {
  switch (targeting.mode) {
    case 'hex':
      return targeting.legalHexes.map((targetHex) => ({ kind: 'fire_slot', sourceId: heroId, slotIndex, targetHex }))
    case 'piece':
    case 'ally':
      return targeting.legalTargetIds.map((targetId) => ({ kind: 'fire_slot', sourceId: heroId, slotIndex, targetId }))
    case 'board_slot':
      return targeting.legalSlots.map((targetSlot) => ({ kind: 'fire_slot', sourceId: heroId, slotIndex, targetSlot }))
    case 'none':
      return [{ kind: 'fire_slot', sourceId: heroId, slotIndex }]
    default: {
      const undecided: never = targeting.mode
      throw new Error(`fire targeting mode ${String(undecided)} has no enumeration decision`)
    }
  }
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
// same legality predicate that gates resolution. This is the complete
// concrete action space, payments included: a card-consuming command is
// offered once per hand card that could pay it, because discarding card A
// and discarding card B leave different hands and are therefore different
// moves to the consumers this API exists for — AI, search, hints, and
// simulation (D-107). It used to offer one representative action with
// `hand[0]` on the theory that fuel choice is presentation's question, which
// quietly contradicted the completeness claim above (engine-hardening
// follow-up P1).
// If a UI consumer ever wants one compact affordance per command, that
// grouping is a projection built above this API — no such consumer exists
// today — and the whole contract is revisitable when the resumable-resolution
// seam arrives, whose incremental questions would subsume payment choice.
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
  // refuse; this offers each Downed ally once per hand card that could pay.
  for (const allyId of state.partyHeroIds) {
    if (allyId === heroId || state.heroes[allyId]?.status !== 'downed') {
      continue
    }
    for (const card of hero.hand) {
      const reviveAction: PlayerCommandInput = { kind: 'revive_ally', sourceId: heroId, targetId: allyId, cardInstanceId: card.instanceId }
      if (legality(catalog, state, reviveAction).legal) {
        actions.push(reviveAction)
      }
    }
  }
  for (const card of hero.hand) {
    const discardAction: PlayerCommandInput = { kind: 'discard_for_stamina', sourceId: heroId, cardInstanceId: card.instanceId }
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
    for (const fireAction of fireCommands(targeting, heroId, slotIndex)) {
      if (legality(catalog, state, fireAction).legal) {
        actions.push(fireAction)
      }
    }
  })
  const entity = state.board.entities[heroId]
  if (entity) {
    for (const destination of neighbors(state.board.hexes, entity.coords)) {
      for (const card of hero.hand) {
        const moveAction: PlayerCommandInput = {
          kind: 'move_hero',
          sourceId: heroId,
          destination,
          cardInstanceId: card.instanceId,
        }
        if (legality(catalog, state, moveAction).legal) {
          actions.push(moveAction)
        }
      }
    }
  }
  return actions
}
