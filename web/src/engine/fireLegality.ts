import { cardNeedsPieceTarget, cardWindowSpeed, type ContentCatalog } from './content/catalog'
import { hexDistance, hexKey } from './hex'
import { cardGatesPass } from './counters'
import { slotChargeCount } from './signature'
import { legal, illegal } from './verdicts'
import type { PlayerCommandInput } from './actions'
import type { EncounterState, LegalityVerdict } from './types'

// The fire_slot validator — the legality module's one deep cluster, held as
// one focused function rather than six fragments because its targeting
// families are ORDER-SENSITIVE: the Boss-reach check runs ahead of every
// selected-target rule, later families key off `targetVerdict` still being
// unset, and the returned verdict prefers the selected target's range over
// the Boss's. Splitting that threading across files would trade one deep
// implementation for six shallow interfaces passing verdict state around.
// The public seam stays `legality()` in `legality.ts`; this file is
// implementation behind it (engine-hardening P3).

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

export function fireSlotLegality(
  catalog: ContentCatalog,
  state: EncounterState,
  action: Extract<PlayerCommandInput, { kind: 'fire_slot' }>,
): LegalityVerdict {
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
  // The Boss is the one target a card never has to name, and until D-073
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
  // one rule per target kind; D-073 collapsed them to one). The Boss was
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
  // An `ally` target is a living party member within the card's range.
  // The firing Hero qualifies — a Healer covering herself is a worse use
  // of the card, never an illegal one, and refusing it would leave a solo
  // Party unable to fire its own preservation cards at all.
  if (card.target_type === 'ally') {
    const targetId = action.targetId ?? ''
    const target = state.board.entities[targetId]
    if (!target || target.team !== 'party') {
      return illegal('The Top Card needs an ally target.')
    }
    if ((state.heroes[targetId]?.health ?? 0) <= 0) {
      return illegal('That ally is Downed.')
    }
    if (targetId !== action.sourceId) {
      targetVerdict = rangeVerdict(state, action.sourceId, targetId, card.range_tiles, "The chosen ally is outside the Top Card's range.")
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
