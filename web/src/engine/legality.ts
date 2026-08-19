import { cardChargeCap, cardNeedsPieceTarget, cardWindowSpeed, type ContentCatalog } from './content/catalog'
import { hexDistance, hexKey } from './hex'
import { isLegalMove } from './board'
import { cardGatesPass } from './counters'
import { slotChargeCount } from './signature'
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

function rangeVerdict(
  state: EncounterState,
  sourceId: string,
  targetId: string,
  maximumRange: number,
  outsideReason: string,
): LegalityVerdict {
  const source = state.board.entities[sourceId]
  const target = state.board.entities[targetId]
  if (!source || !target) {
    return illegal('The selected piece is unavailable.')
  }
  const targetRange = hexDistance(source.coords, target.coords)
  return targetRange > maximumRange ? { ...illegal(outsideReason), targetRange } : { ...legal(), targetRange }
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
    case 'fire_slot': {
      const hero = state.heroes[action.sourceId]
      if (!hero || action.slotIndex < 0 || action.slotIndex >= hero.actionBar.length) {
        return illegal('Select a legal Slot.')
      }
      const slot = hero.actionBar[action.slotIndex]
      if (slot.topCard === null || slotChargeCount(slot) === 0) {
        return illegal(slot.fixed ? 'The Signature needs at least one earned Charge.' : 'A loaded Slot needs at least one charged card.')
      }
      if (slot.activatedWindow === state.phase) {
        return illegal('A Slot may fire only once in its matching window.')
      }
      const card = catalog.cards[slot.topCard.cardId]
      if (cardWindowSpeed(card) !== state.phase) {
        return illegal('The Top Card cannot fire in this window.')
      }
      const hasDisplacement = card.push_tiles > 0 || card.pull_tiles > 0
      let targetVerdict: LegalityVerdict | undefined
      // The Boss is the one target a card never has to name, and until D-067
      // it was the one target no card had to reach: `boss_damage` resolved
      // from anywhere on the board, so Steady Strike read as a melee swing and
      // played as artillery. It is checked here, ahead of the selected-target
      // rules, because it is the reach a card asserts by dealing Boss damage
      // at all — a card aimed at a Whelp still has to stand close enough to
      // land the half of itself that hits Embermaw.
      //
      // Held apart from `targetVerdict` rather than assigned into it: a card
      // that also names a piece or a hex reports *that* distance to the
      // surfaces reading `targetRange`, and the selected-target rules below
      // key off `targetVerdict` still being unset.
      let bossVerdict: LegalityVerdict | undefined
      if (card.boss_damage > 0) {
        bossVerdict = rangeVerdict(state, action.sourceId, state.bossId, card.range_tiles, "The Boss is outside the Top Card's range.")
        if (!bossVerdict.legal) {
          return bossVerdict
        }
      }
      // Every hex-targeting card needs a reachable on-board hex, not only a
      // Burst: since D-048 a card may also put a Counter on the ground, and
      // ground it cannot reach is the same illegal target either way.
      if (card.target_type === 'hex') {
        const targetHex = action.targetHex
        const source = state.board.entities[action.sourceId]
        if (!targetHex || !source || state.board.hexes[hexKey(targetHex)] === undefined) {
          return illegal('The Top Card needs an on-board hex target.')
        }
        const targetRange = hexDistance(source.coords, targetHex)
        if (targetRange > card.range_tiles) {
          return { ...illegal("The chosen hex is outside the Top Card's range."), targetRange }
        }
        targetVerdict = { ...legal(), targetRange }
      }
      // A Slot-targeting card needs a Slot holding a prepared card (D-035,
      // reachable since D-048). Counters ride the Top Card, so an empty Slot
      // has nothing to carry them.
      if (card.target_type === 'board_slot') {
        const slotIndex = action.targetSlotIndex
        const targetSlot = slotIndex === undefined ? undefined : state.heroes[action.sourceId]?.actionBar[slotIndex]
        if (!targetSlot || targetSlot.topCard === null) {
          return illegal('The Top Card needs a prepared Slot to attach to.')
        }
      }
      if (card.damage > 0 && card.burst_radius === 0) {
        const targetId = action.targetId ?? ''
        const target = state.board.entities[targetId]
        if (!target || target.kind !== 'minion') {
          return illegal('The Top Card needs a Minion target.')
        }
        const verdict = rangeVerdict(state, action.sourceId, targetId, card.range_tiles, "The chosen Minion is outside the Top Card's range.")
        if (!verdict.legal) {
          return verdict
        }
        targetVerdict = verdict
      }
      if (hasDisplacement) {
        const targetId = action.targetId ?? ''
        const target = state.board.entities[targetId]
        if (!target || targetId === action.sourceId) {
          return illegal('The Top Card needs another piece target.')
        }
        const verdict = rangeVerdict(state, action.sourceId, targetId, card.range_tiles, "The chosen piece is outside the Top Card's range.")
        if (!verdict.legal) {
          return verdict
        }
        targetVerdict = verdict
      }
      // A card that places a Counter on a piece, or reads one there, needs an
      // Enemy, and every Enemy answers the same reach (D-034 and D-047 chose
      // one rule per target kind; D-067 collapsed them to one). The Boss was
      // the exception, exempted to stay consistent with positionless
      // `boss_damage` — so the exemption went out with the ruling that
      // justified it, and marking Embermaw now costs the same footwork as
      // marking a Whelp.
      if (cardNeedsPieceTarget(card)) {
        const targetId = action.targetId ?? ''
        const target = state.board.entities[targetId]
        if (!target || target.team !== 'enemy') {
          return illegal('The Top Card needs an Enemy target.')
        }
        if (targetVerdict === undefined) {
          targetVerdict = rangeVerdict(state, action.sourceId, targetId, card.range_tiles, "The chosen Enemy is outside the Top Card's range.")
          if (!targetVerdict.legal) {
            return targetVerdict
          }
        }
      }
      // Every `gate` the Card declares has to pass, and they AND together.
      // Checked here so the Slot simply is not firable, and so the targeting
      // projection the board draws from never offers an illegal piece.
      if (!cardGatesPass(catalog, state, card, action)) {
        return illegal('The Top Card needs more Counters than are there.')
      }
      return targetVerdict ?? bossVerdict ?? legal()
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
    default:
      // Generated actions (damage, hazards, spawns, phase bookkeeping) carry
      // no pre-resolution rule; their failures are resolution-time outcomes.
      return legal()
  }
}
