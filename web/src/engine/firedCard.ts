import { hexDistance, hexesWithinRadius, type Axial } from './hex'
import { cardChargeCap, type ContentCatalog } from './content/catalog'
import {
  combatantRef,
  counterEvent,
  counterHostRef,
  createFortified,
  createFromDefinition,
  placeCounter,
  readerCount,
  readerSubject,
  spendCounter,
} from './counters'
import { raiseCounterSpent, raiseSlotFired } from './events'
import { recordSubscriberMatches, succeed } from './facts'
import { syncHeroEntity } from './downed'
import { OVERFLOW } from './keywords'
import type { Card, CardReader } from './content/schemas'
import type { ChargeModifier } from './content/schemas'
import type { EncounterActionInput } from './actions'
import type { CardInstance, EncounterState, HeroState, ResolvedActionFact } from './types'

// The Fired Card — everything that happens between a legal fire_slot and the
// ordered batch of generated actions it becomes. One module because it is one
// concept: the Charge arithmetic, the Reader verbs the fire executes (scale
// and spend; gate belongs to legality and fires before this module is ever
// reached), the recipients and the overflow conversion, the burst geometry,
// the Counter placements, the raises, and the draw. It used to be smeared
// over the fire_slot case in resolve.ts, a cardResolver.ts that never once
// changed without it, and two line-for-line copies of the effect-mapping
// switch — with the cost-spend → charge arithmetic → scale → resolution-spend
// ordering held only by comments at the call site. Here the ordering IS the
// implementation, and the public seam is one function.
//
// The interface mirrors the resolver's other deep cases (displacement,
// traversal): mutate the draft, record onto the fact, push the generated
// consequences. `resolve.ts` stays the only caller.

interface FireEffects {
  armor: number
  armorNextRound: number
  healing: number
  bossDamage: number
  targetDamage: number
  drawCount: number
  burstRadius: number
  pushTiles: number
  pullTiles: number
}

function matchingCount(modifier: ChargeModifier, chargeStack: Card[], tokenCharges: number): number {
  if (modifier.keyword_id === '') {
    return chargeStack.length + tokenCharges
  }
  return chargeStack.filter((card) => card.tags.includes(modifier.keyword_id)).length
}

// The one statement of which effect a bonus lands on, shared by the Charge
// Modifier loop and the scale Readers — the two used to carry line-for-line
// copies of this switch in two files, which is exactly the divergence risk a
// deep module exists to close.
function addEffect(effects: FireEffects, effect: ChargeModifier['effect'], bonus: number): void {
  switch (effect) {
    case 'armor':
      effects.armor += bonus
      break
    case 'healing':
      effects.healing += bonus
      break
    case 'boss_damage':
      effects.bossDamage += bonus
      break
    case 'target_damage':
      effects.targetDamage += bonus
      break
  }
}

// A tucked card always adds one Charge but grants no universal bonus; only
// the Top Card's explicit Charge Modifiers read the Charge Stack.
// `tokenCharges` is a fixed Slot's earned Charge count (D-064): a token has
// no card and no Keywords, so it matches only keyword-less modifiers — which
// the catalog enforces is the only kind a Signature carries.
export function resolveFire(catalog: ContentCatalog, card: Card, chargeStack: Card[], tokenCharges = 0): FireEffects {
  const result: FireEffects = {
    armor: card.armor_delta,
    armorNextRound: card.armor_next_round,
    healing: card.healing,
    bossDamage: card.boss_damage,
    targetDamage: card.damage,
    drawCount: card.draw_count,
    burstRadius: card.burst_radius,
    pushTiles: card.push_tiles,
    pullTiles: card.pull_tiles,
  }
  for (const modifierId of card.charge_modifiers) {
    const modifier = catalog.chargeModifiers[modifierId]
    if (!modifier) {
      continue
    }
    const bonus = modifier.amount_per_match * matchingCount(modifier, chargeStack, tokenCharges)
    addEffect(result, modifier.effect, bonus)
  }
  return result
}

// `spend` at one timing. Records what actually came off rather than what was
// asked for, because a cost that could not be paid in full is exactly the
// thing a fact log should not round up.
function spendCardReaders(
  draft: EncounterState,
  card: Card,
  action: Extract<EncounterActionInput, { kind: 'fire_slot' }>,
  timing: CardReader['timing'],
): Record<string, unknown>[] {
  const spent: Record<string, unknown>[] = []
  for (const reader of card.reads) {
    if (reader.verb !== 'spend' || reader.timing !== timing) {
      continue
    }
    const ref = readerSubject(action, card.target_type, reader.on)
    const removed = ref === null ? 0 : spendCounter(draft, ref, reader.counter, reader.amount)
    if (removed > 0) {
      spent.push({ counter_id: reader.counter, host: ref, amount: removed, timing })
    }
  }
  return spent
}

// `scale`: every held Counter adds `per` to one of the Card's effects. The
// effect names come from the enum Charge Modifiers already use, so no new
// effect vocabulary arrives with the Reader vocabulary.
function applyScaleReaders(
  catalog: ContentCatalog,
  draft: EncounterState,
  effects: FireEffects,
  card: Card,
  action: Extract<EncounterActionInput, { kind: 'fire_slot' }>,
): void {
  for (const reader of card.reads) {
    if (reader.verb !== 'scale') {
      continue
    }
    const bonus = reader.per * readerCount(catalog, draft, reader, readerSubject(action, card.target_type, reader.on))
    addEffect(effects, reader.effect, bonus)
  }
}

// The fact context every blow a Card deals carries. The Card's own damage
// Keywords ride it so a Counter can answer what the party throws, not just
// what the Boss does (D-049) — the party's damage was unkeyworded while only
// Boss Beats classified theirs, which left an event-Keyword Reader working in
// one direction only.
function cardDamageContext(card: Card, extra?: Record<string, unknown>): Record<string, unknown> | undefined {
  const keywords = card.damage_keywords.length > 0 ? { damage_keywords: [...card.damage_keywords] } : undefined
  if (keywords === undefined && extra === undefined) {
    return undefined
  }
  return { ...keywords, ...extra }
}

// Explicit Card draws use the same first-class draw and shuffle actions as
// Round refill (ADR 0015). Plan the sequence from pile sizes without mutating
// them; the generated actions perform every state change in recorded order.
export function cardDrawActions(hero: HeroState, sourceId: string, drawCount: number): EncounterActionInput[] {
  const actions: EncounterActionInput[] = []
  let deckCount = hero.deck.length
  let discardCount = hero.discard.length
  for (let draw = 0; draw < drawCount; draw += 1) {
    if (deckCount === 0 && discardCount > 0) {
      actions.push({ kind: 'shuffle_deck', sourceId, label: 'discard_shuffle' })
      deckCount = discardCount
      discardCount = 0
    }
    actions.push({ kind: 'draw_card', sourceId })
    deckCount = Math.max(deckCount - 1, 0)
  }
  return actions
}

export function resolveFiredCard(
  catalog: ContentCatalog,
  draft: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'fire_slot' }>,
  fact: ResolvedActionFact,
  generated: EncounterActionInput[],
): void {
  const hero = draft.heroes[action.sourceId]
  const slot = hero.actionBar[action.slotIndex]
  const topCard = slot.topCard as CardInstance
  const card = catalog.cards[topCard.cardId]
  // A fixed Slot's Charge is a token count, and firing spends the whole
  // stack while the Top Card stays — ADR 0032's inversion of ADR 0008.
  // The count is read before the spend so the Charge Modifiers and the
  // full-bank rider both see what was actually paid.
  const spentSignatureCharges = slot.fixed ? slot.earnedCharges : 0
  // A cost is paid before the Card's effects are computed, so a Card
  // that both scales off a Counter and spends it as a cost scales off
  // what is left — the ordinary reading of paying for something.
  const spentEarly = spendCardReaders(draft, card, action, 'cost')
  const effects = resolveFire(
    catalog,
    card,
    slot.charges.map((charge) => catalog.cards[charge.cardId]),
    spentSignatureCharges,
  )
  applyScaleReaders(catalog, draft, effects, card, action)
  if (slot.fixed) {
    slot.earnedCharges = 0
    fact.detail.spentSignatureCharges = spentSignatureCharges
  }
  if (spentEarly.length > 0) {
    fact.detail.spentCounters = spentEarly
  }
  const baseBossDamage = effects.bossDamage
  const burstCenter = effects.burstRadius > 0 ? (action.targetHex as Axial) : null
  const burstHexes = burstCenter === null ? [] : hexesWithinRadius(draft.board.hexes, burstCenter, effects.burstRadius)
  const burstEnemyIds =
    burstCenter === null
      ? []
      : Object.values(draft.board.entities)
          .filter((entity) => entity.team === 'enemy' && hexDistance(entity.coords, burstCenter) <= effects.burstRadius)
          .map((entity) => entity.id)
          .sort()
  const burstIncludesBoss = burstEnemyIds.includes(draft.bossId)
  if (burstCenter !== null) {
    fact.detail.burstCenter = { ...burstCenter }
    fact.detail.burstHexes = burstHexes
  }
  // Preservation lands on the chosen ally; everything else the card does
  // still comes from the firing Hero. An `ally` card with no valid target
  // cannot reach here — legality refuses it — so the fallback to `hero` is
  // the untargeted case, which is every card authored before the Party.
  const recipient = card.target_type === 'ally' ? (draft.heroes[action.targetId ?? ''] ?? hero) : hero
  recipient.armor += effects.armor
  const healthBeforeHealing = recipient.health
  recipient.health = Math.min(recipient.maxHealth, recipient.health + effects.healing)
  if (recipient.id !== hero.id) {
    fact.detail.preservedAlly = recipient.id
  }
  // The overflow conversion (D-080): on a card carrying the Keyword,
  // healing beyond what the ally could hold converts one-to-one into Boss
  // damage — capped at the *printed* healing, so a scaled-up heal cannot
  // convert more than the card promises and a full-health target cannot
  // turn a heal into a full-value damage card. Emitted as an ordinary
  // damage action so the Restorative's `host_deals_damage` earn reads it
  // the same way it reads any blow.
  let overflowConverted = 0
  // The conversion is care spent on *someone else* (D-103). Overflow on
  // the firing Hero was the Restorative's strongest and least thoughtful
  // line: at full Health she could aim Surplus of Care at herself for the
  // card's whole printed value in Boss damage, with no ally to read, no
  // Beat to name, and no reason ever to do anything else with it. Firing
  // an `ally` card on yourself stays legal — the schema's rule, and what
  // keeps a solo Party able to play its own deck — it simply converts
  // nothing, so the surplus has to be genuinely surplus to someone.
  if (card.tags.includes(OVERFLOW) && effects.healing > 0 && recipient.id !== hero.id) {
    const absorbed = recipient.health - healthBeforeHealing
    overflowConverted = Math.min(effects.healing - absorbed, card.healing)
    if (overflowConverted > 0) {
      fact.detail.overflowConverted = overflowConverted
    }
  }
  // A healing Burst restores every party Hero standing in it, mirroring
  // the damage Burst's rule for Enemies — the paper Radial pattern. The
  // chosen-recipient heal above and this are exclusive in practice: a
  // burst card targets a hex, so its `recipient` is the firing Hero, who
  // is healed here only if they stand inside their own pattern.
  if (burstCenter !== null && effects.healing > 0) {
    for (const partyHero of Object.values(draft.heroes)) {
      if (partyHero.status !== 'living' || partyHero.id === recipient.id) {
        continue
      }
      const at = draft.board.entities[partyHero.id]?.coords
      if (at !== undefined && hexDistance(at, burstCenter) <= effects.burstRadius) {
        partyHero.health = Math.min(partyHero.maxHealth, partyHero.health + effects.healing)
        syncHeroEntity(draft, partyHero.id)
      }
    }
  }
  slot.activatedWindow = draft.phase
  syncHeroEntity(draft, action.sourceId)
  if (recipient.id !== hero.id) {
    syncHeroEntity(draft, recipient.id)
  }
  if (effects.armorNextRound > 0) {
    const fortified = createFortified(catalog, card.id, draft.round, draft.phase)
    // Fortify's stored Armor is the number of Counters placed, so the
    // amount still rides the card and the Counter stays a bare marker.
    const banked = fortified === null ? 0 : placeCounter(draft, combatantRef(action.sourceId), fortified, effects.armorNextRound)
    if (fortified !== null) {
      fact.resolutionFact = { counter_event: counterEvent({ ...fortified, count: banked }, 'placed', fortified.triggerReason) }
    }
  }
  // An authored Counter. Where it lands is the Counter's `host` read
  // through what the card targeted (D-033, kept by D-047, widened by
  // D-048). `board_slot` reaches a prepared Slot; solo that is one of the
  // firing Hero's own, since there is no ally to attach to yet.
  if (card.places_counter !== '') {
    const definition = catalog.counters[card.places_counter]
    if (definition) {
      // Where a Counter lands is the Counter's `host` read through the
      // card's chosen target (D-048): a combatant Counter goes on the
      // selected piece or on the firing Hero, a hex Counter onto the
      // chosen ground, a slot Counter onto the chosen prepared card. The
      // catalog already refused any card whose `target_type` cannot
      // supply the host its Counter needs, so this cannot fall through.
      const hostRef = counterHostRef(definition.host, action, card.target_type)
      const placing = createFromDefinition(definition, { sourceId: card.id, round: draft.round, phase: draft.phase })
      const placed = hostRef === null ? 0 : placeCounter(draft, hostRef, placing, card.counter_amount)
      fact.detail.placedCounter = definition.id
      fact.detail.placedCounterTarget = hostRef ?? ''
      fact.detail.placedCounterAmount = placed
      fact.resolutionFact = {
        counter_event: counterEvent({ ...placing, count: placed }, placed > 0 ? 'placed' : 'refused', placed > 0 ? 'authored_counter' : 'at_max'),
      }
    }
  }
  // A `resolution` spend happens after the card's effects are computed, so
  // a card that both scales off a Counter and spends it sees the full
  // count; a `cost` spend was already paid before `resolveFire` ran.
  const spentLate = spendCardReaders(draft, card, action, 'resolution')
  if (spentLate.length > 0) {
    fact.detail.spentCounters = [...((fact.detail.spentCounters as unknown[]) ?? []), ...spentLate]
  }
  succeed(fact)
  if (burstCenter !== null) {
    // Every non-Boss Enemy resolves first. The Boss receives one combined
    // ordinary damage action for Burst damage, any direct Boss damage,
    // and the one-shot Riposte bonus. Keeping the Boss last guarantees a
    // lethal hit cannot suppress sibling Burst consequences.
    for (const targetId of burstEnemyIds.filter((enemyId) => enemyId !== draft.bossId)) {
      generated.push({
        kind: 'damage',
        sourceId: action.sourceId,
        targetId,
        amount: effects.targetDamage,
        reasonText: card.title,
        factContext: cardDamageContext(card),
      })
    }
    const bossAmount = baseBossDamage + (burstIncludesBoss ? effects.targetDamage : 0)
    if (bossAmount > 0) {
      generated.push({
        kind: 'damage',
        sourceId: action.sourceId,
        targetId: draft.bossId,
        amount: bossAmount,
        reasonText: card.title,
        factContext: cardDamageContext(card),
      })
    }
  } else {
    if (baseBossDamage > 0) {
      generated.push({
        kind: 'damage',
        sourceId: action.sourceId,
        targetId: draft.bossId,
        amount: baseBossDamage,
        reasonText: card.title,
        factContext: cardDamageContext(card),
      })
    }
    if (overflowConverted > 0) {
      generated.push({
        kind: 'damage',
        sourceId: action.sourceId,
        targetId: draft.bossId,
        amount: overflowConverted,
        reasonText: `${card.title} (overflow)`,
        factContext: cardDamageContext(card),
      })
    }
    if (effects.targetDamage > 0) {
      generated.push({
        kind: 'damage',
        sourceId: action.sourceId,
        targetId: action.targetId ?? '',
        amount: effects.targetDamage,
        reasonText: card.title,
        factContext: cardDamageContext(card),
      })
    }
  }
  if (effects.pushTiles > 0 || effects.pullTiles > 0) {
    generated.push({
      kind: 'displace_piece',
      sourceId: action.sourceId,
      targetId: action.targetId ?? '',
      distance: effects.pushTiles > 0 ? effects.pushTiles : effects.pullTiles,
      movement: effects.pushTiles > 0 ? 'push' : 'pull',
      reasonText: card.title,
    })
  }
  // The full-bank rider (D-064 decision 13): a fixed Slot fired at its
  // whole Charge cap also marks the Boss. Pushed after the card's own
  // damage actions, so the follow-through opens the wound and the rider's
  // own hit never benefits from it — the ordering the ruling specified.
  // The Counter follows the card's Boss damage, not its `target_type`.
  if (slot.fixed && card.full_charge.places_counter !== '' && spentSignatureCharges >= cardChargeCap(card)) {
    generated.push({
      kind: 'place_counter',
      sourceId: action.sourceId,
      // An enemy-facing Signature's rider follows its Boss damage (the
      // Riposte's Sundered). A preservation Signature's rider extends the
      // cover to a second ally — deterministically the firing Hero, the
      // one party member the single-target gesture could not choose
      // (D-080): the card already covered the chosen ally above.
      hostRef: combatantRef(card.target_type === 'ally' ? action.sourceId : draft.bossId),
      counterId: card.full_charge.places_counter,
      amount: card.full_charge.counter_amount,
      reasonText: 'signature_full_bank',
    })
  }
  // A mark came off (D-102), raised before the Slot's own raise because
  // the spends are what the fire did, not what firing it was: both
  // timings in one pass, cost entries first.
  const spentAll = [...spentEarly, ...spentLate]
  if (spentAll.length > 0) {
    recordSubscriberMatches(fact.detail, raiseCounterSpent(catalog, draft, action.sourceId, spentAll))
  }
  // The Slot fired: one raise, heard by the Grant first and the Reader
  // second (the registry row's order, ADR 0041). `effect_landed` is what
  // stops a tempo earn being farmed by firing an empty Slot at nothing
  // (ADR 0037). A `spend` counts: a Card whose whole effect is striking a
  // mark off an ally landed one, and reading it as having landed nothing
  // was the gap D-102 found while authoring the first Card that does only
  // that.
  const slotRaise = raiseSlotFired(catalog, draft, action.sourceId, {
    ...(fact.resolutionFact ?? {}),
    effect_landed:
      effects.bossDamage > 0 ||
      effects.targetDamage > 0 ||
      effects.armor > 0 ||
      effects.healing > 0 ||
      effects.armorNextRound > 0 ||
      card.places_counter !== '' ||
      spentAll.length > 0,
  })
  recordSubscriberMatches(fact.detail, slotRaise.matches)
  generated.push(...slotRaise.generated)
  generated.push(...cardDrawActions(hero, action.sourceId, effects.drawCount))
}
