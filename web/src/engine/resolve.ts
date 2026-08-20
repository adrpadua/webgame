import { addEntity, addHazard, advanceBoardRound, damageEntity, facingAlong, facingToward, getHazards, isGuardedFront, isOccupied, isOnBoard, isTraversable, moveEntity } from './board'
import { axialAdd, axialSubtract, hexDistance, hexesWithinRadius, type Axial } from './hex'
import { axialDeltaFor, directionForAxialDelta, FACING_NW } from './facing'
import type { ContentCatalog } from './content/catalog'
import type { Card } from './content/schemas'
import { resolveFire, type FireEffects } from './cardResolver'
import { legality } from './legality'
import { resolveBossBeat, advanceProgram, applyPhaseBreak, phaseBreakDue } from './timeline'
import { minionDetonation } from './minions'
import { ESCALATION_MAX, escalationModifiers } from './escalation'
import { shuffle } from './rng'
import {
  counterEvent,
  createFortified,
  createFromDefinition,
  placeCounter,
  roundUpkeep,
  readerSum,
  spendCounter,
  counterHostRef,
  UNDERWRITTEN,
  readerCount,
  readerSubject,
  combatantRef,
  slotRef,
  clearCounters,
  hexCounterRef,
  type CounterRef,
} from './counters'
import { evaluateGrantsFor, evaluateStandingGrants } from './signature'
import { canBeDowned, goDowned, incapacitateHero, livingHeroIds, reviveHero } from './downed'
import { cardChargeCap } from './content/catalog'
import { OVERFLOW, RAID_HIT, TANK_HIT } from './keywords'
import { ENCOUNTER_SOURCE, type EncounterActionInput } from './actions'
import type { CardReader } from './content/schemas'
import type { CardInstance, EncounterState, HazardInstance, HeroState, Phase, ResolveResult, ResolvedActionFact } from './types'

// The reducer seam (ADR 0019): resolve(state, action) returns the next
// immutable snapshot plus the facts produced. The draft is a structuredClone,
// so resolution can mutate freely while callers keep every prior snapshot.
export function resolve(catalog: ContentCatalog, state: EncounterState, action: EncounterActionInput): ResolveResult {
  const draft = structuredClone(state)
  const facts: ResolvedActionFact[] = []
  applyAction(catalog, draft, action, facts, 0)
  return { state: draft, facts }
}

// Depth-first resolution matching the reference apply(): resolve the action,
// record it, then resolve everything it generated, then check resolution.
export function applyAction(
  catalog: ContentCatalog,
  draft: EncounterState,
  action: EncounterActionInput,
  facts: ResolvedActionFact[],
  depth: number,
  deferTerminalCheck = false,
): void {
  const generated: EncounterActionInput[] = []
  const presentation = factPresentation(action)
  const fact: ResolvedActionFact = {
    sequence: facts.length,
    depth,
    round: draft.round,
    phase: draft.phase,
    kind: action.kind,
    sourceId: action.sourceId,
    succeeded: false,
    reason: '',
    title: presentation.title,
    detail: presentation.detail,
  }
  resolveOne(catalog, draft, action, fact, generated)
  facts.push(fact)
  // A fired Card is one authored consequence batch. Its ordered generated
  // actions all resolve before victory or defeat closes global legality, so a
  // lethal hit can be recorded before later Status and draw consequences
  // without suppressing them. Minion defeat remains immediate inside damage.
  const deferGeneratedTerminalCheck = deferTerminalCheck || action.kind === 'fire_slot'
  for (const followup of generated) {
    applyAction(catalog, draft, followup, facts, depth + 1, deferGeneratedTerminalCheck)
  }
  if (!deferTerminalCheck) {
    checkResolution(draft)
  }
}

export function checkResolution(draft: EncounterState): void {
  if (!draft.active) {
    return
  }
  const boss = draft.board.entities[draft.bossId]
  if (draft.bossId === '' || !boss || boss.health <= 0) {
    draft.active = false
    draft.outcome = 'victory'
    draft.outcomeReason = 'The Boss is defeated.'
    return
  }
  // Defeat is the whole Party out at once (ADR 0036), not any one Hero
  // falling. A Hero at zero is `Downed` or `Incapacitated` and the fight goes
  // on around them; solo, `canBeDowned` is false and the first zero ends it,
  // which is why both authored solo Encounters behave exactly as before.
  if (draft.partyHeroIds.length > 0 && livingHeroIds(draft).length === 0) {
    draft.active = false
    draft.outcome = 'defeat'
    draft.outcomeReason = draft.partyHeroIds.length === 1 ? 'A Hero has fallen.' : 'The Party has fallen.'
  }
}

function resolveOne(
  catalog: ContentCatalog,
  draft: EncounterState,
  action: EncounterActionInput,
  fact: ResolvedActionFact,
  generated: EncounterActionInput[],
): void {
  const verdict = legality(catalog, draft, action)
  if (verdict.targetRange !== undefined) {
    fact.detail.targetRange = verdict.targetRange
  }
  if (!verdict.legal) {
    fact.succeeded = false
    fact.reason = verdict.reason
    return
  }
  switch (action.kind) {
    case 'load_slot': {
      const hero = draft.heroes[action.sourceId]
      const card = takeFromHand(hero, action.cardInstanceId)
      const slot = hero.actionBar[action.slotIndex]
      if (slot.topCard !== null) {
        if (slot.placedThisLoadout && draft.phase === 'loadout') {
          // The Slot began this Loadout empty, so its content is tentative:
          // re-loading swaps the previous card (and anything tucked under
          // it) back to hand rather than discarding a decision the player
          // only just made.
          hero.hand.push(slot.topCard, ...slot.charges)
          fact.detail.returnedToHand = slot.topCard.cardId
        } else {
          hero.discard.push(slot.topCard, ...slot.charges)
        }
      } else if (draft.phase === 'loadout') {
        slot.placedThisLoadout = true
      }
      slot.topCard = card
      slot.charges = []
      slot.activatedWindow = null
      // A Slot's Counters ride the prepared card, not the Slot's position, so
      // loading a different card drops them (D-048). Nothing transfers: the
      // thing they were attached to has left.
      if (clearCounters(draft, slotRef(action.sourceId, action.slotIndex))) {
        fact.detail.clearedSlotCounters = true
      }
      succeed(fact)
      break
    }
    case 'charge_slot': {
      const hero = draft.heroes[action.sourceId]
      const card = takeFromHand(hero, action.cardInstanceId)
      hero.actionBar[action.slotIndex].charges.push(card)
      succeed(fact)
      break
    }
    case 'fire_slot': {
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
      if (card.tags.includes(OVERFLOW) && effects.healing > 0) {
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
      // The Slot fired. A Signature may earn from its own Hero's tempo
      // (ADR 0037); `effect_landed` is what stops that earn being farmed by
      // firing an empty Slot at nothing.
      evaluateGrantsFor(catalog, draft, action.sourceId, 'slot_fired', {
        resolutionFact: {
          ...(fact.resolutionFact ?? {}),
          effect_landed:
            effects.bossDamage > 0 ||
            effects.targetDamage > 0 ||
            effects.armor > 0 ||
            effects.healing > 0 ||
            effects.armorNextRound > 0 ||
            card.places_counter !== '',
        },
      })
      generated.push(...slotFiredCounterActions(draft, action.sourceId))
      generated.push(...cardDrawActions(hero, action.sourceId, effects.drawCount))
      break
    }
    case 'move_hero': {
      const hero = draft.heroes[action.sourceId]
      const fromCoords = draft.board.entities[action.sourceId].coords
      const card = takeFromHand(hero, action.cardInstanceId)
      hero.discard.push(card)
      moveEntity(draft.board, action.sourceId, action.destination)
      draft.board.entities[action.sourceId].facing = directionForAxialDelta(axialSubtract(action.destination, fromCoords))
      succeed(fact)
      generated.push(...hazardEntryActions(draft, action.sourceId, action.destination))
      break
    }
    case 'displace_piece': {
      resolveDisplacement(draft, action, fact, generated)
      break
    }
    case 'traverse_piece': {
      resolveTraversal(draft, action, fact, generated)
      break
    }
    case 'resolve_boss': {
      generated.push(...resolveBossBeat(catalog, draft, action.sourceId, action.beat, action.track))
      succeed(fact)
      break
    }
    case 'apply_hazard': {
      const definition = action.hazardId === null ? null : catalog.hazards[action.hazardId]
      const hazard: HazardInstance = definition
        ? {
            id: definition.id,
            title: definition.title,
            remainingRounds: definition.duration_rounds,
            enterDamage: definition.enter_damage,
            blocksVoluntaryMovement: definition.blocks_voluntary_movement,
            impassable: definition.impassable,
            damagesSourceTeam: definition.damages_source_team,
          }
        : {
            id: 'scorched',
            title: 'Scorched',
            remainingRounds: Math.max(action.fallbackDurationRounds, 1),
            enterDamage: 1,
            blocksVoluntaryMovement: true,
            impassable: false,
            damagesSourceTeam: false,
          }
      if (action.permanent === true) {
        hazard.permanent = true
      }
      // The Encounter itself acts for the Boss: a structural Escalation
      // Threshold closing the arena (D-031) is the Boss's pressure, not
      // neutral weather, so it lays an Enemy Hazard.
      hazard.sourceTeam = draft.board.entities[action.sourceId]?.team ?? 'enemy'
      if (!addHazard(draft.board, action.coords, hazard)) {
        fail(fact, 'The hazard could not be applied to that hex.')
        break
      }
      // Ground that burns away for good takes its Counters with it (D-050).
      // A permanent Hazard is D-031's arena closing, and a hex nobody can
      // stand on should not keep paying out what was banked there — a
      // structural Threshold has to cost the party, and a marked hex that
      // survived its own burning would make the collapse a windfall for
      // whoever had marked it. Only permanent Hazards do this: a temporary
      // one is weather the ground outlives.
      if (hazard.permanent === true && clearCounters(draft, hexCounterRef(action.coords))) {
        fact.detail.clearedHexCounters = true
      }
      succeed(fact)
      break
    }
    case 'spawn_minion': {
      const minion = action.minionContentId ? catalog.minions[action.minionContentId] : undefined
      const health = minion ? minion.max_health : 2
      if (!addEntity(draft.board, action.minionId, 'minion', action.coords, health, FACING_NW, 'enemy', minion?.title ?? 'Minion')) {
        fail(fact, 'The Minion spawn hex is unavailable.')
        break
      }
      draft.board.entities[action.minionId].spawnedRound = draft.round
      if (minion) {
        draft.board.entities[action.minionId].contentId = minion.id
      }
      succeed(fact)
      break
    }
    case 'detonate_minion': {
      // The fuse running out (D-063). The blast is derived here rather than
      // carried on the action, so the footprint the fact records is the one
      // the hexes were actually taken from.
      const minion = draft.board.entities[action.sourceId]
      const detonation = minionDetonation(catalog, draft, action.sourceId)
      if (!minion || !detonation) {
        fail(fact, 'That Minion has no fuse to run out.')
        break
      }
      const bonus = escalationModifiers(draft).minionDamageBonus
      fact.detail.blastCenter = { ...detonation.center }
      fact.detail.blastHexes = detonation.hexes
      fact.detail.blastDamage = detonation.damage + bonus
      fact.detail.minionTitle = minion.title
      fact.resolutionFact = {
        minion_detonation: true,
        blast_hexes: detonation.hexes.length,
        heroes_caught: [...detonation.heroIds],
        ...(bonus > 0 ? { escalation_bonus: bonus } : {}),
      }
      // The Minion is consumed by its own blast: it leaves the board as part
      // of this action, the way a Minion Defeat leaves inside the damage that
      // killed it. This is deliberately NOT a Minion Defeat — no damage action
      // removed it, so nothing records `target_removed` and no Hero is
      // credited with a kill they did not make.
      delete draft.board.entities[action.sourceId]
      delete draft.counters[combatantRef(action.sourceId)]
      succeed(fact)
      for (const heroId of detonation.heroIds) {
        generated.push({
          kind: 'damage',
          sourceId: action.sourceId,
          targetId: heroId,
          amount: detonation.damage + bonus,
          reasonText: `${minion.title} detonates`,
          factContext: {
            minion_detonation: true,
            damage_keywords: [RAID_HIT],
            ...(bonus > 0 ? { escalation_bonus: bonus } : {}),
          },
        })
      }
      break
    }
    case 'damage': {
      // The Keywords a blow carries decide which Readers answer it (D-049),
      // so they have to reach resolution rather than only the fact log they
      // are merged into afterwards.
      const damageKeywords = (action.factContext?.damage_keywords as string[] | undefined) ?? []
      const resolutionFact = applyDamage(draft, action.targetId, action.amount, action.sourceId, damageKeywords)
      for (const [key, value] of Object.entries(action.factContext ?? {})) {
        if (!(key in resolutionFact)) {
          resolutionFact[key] = value
        }
      }
      if (!resolutionFact.target_available) {
        fail(fact, 'The damage target is unavailable.')
        break
      }
      fact.detail.dealt = resolutionFact.health_loss
      // Zero health is a state change, not the end of the fight (ADR 0036).
      // Solo, `canBeDowned` is false and `checkResolution` ends it below.
      const struck = draft.heroes[action.targetId]
      if (struck && struck.status === 'living' && struck.health <= 0 && canBeDowned(draft, action.targetId)) {
        goDowned(draft, action.targetId)
        fact.detail.downed = action.targetId
        resolutionFact.downed = true
      }
      evaluateTankHitAbsorption(draft, action, resolutionFact)
      evaluateStandingGrants(catalog, draft, action, resolutionFact)
      fact.resolutionFact = resolutionFact
      succeed(fact)
      break
    }
    case 'incapacitate_hero': {
      incapacitateHero(draft, action.sourceId)
      fact.detail.incapacitated = action.sourceId
      succeed(fact)
      break
    }
    case 'revive_ally': {
      const rescuer = draft.heroes[action.sourceId]
      const encounter = catalog.encounters[draft.encounterId]
      // The card is spent whether or not the rescue is generous: paying for
      // the save is the decision, and legality already refused every case
      // where the save could not happen at all.
      rescuer.discard.push(takeFromHand(rescuer, action.cardInstanceId))
      const restored = reviveHero(draft, action.targetId, encounter?.revive_health_fraction ?? 0.25)
      fact.detail.revived = action.targetId
      fact.detail.restoredHealth = restored
      succeed(fact)
      break
    }
    case 'diminished_action': {
      // An Incapacitated Hero has no cards and no board presence, so each of
      // these is free and none of them touches the Boss's health (ADR 0036).
      const ally = action.targetId === undefined ? undefined : draft.heroes[action.targetId]
      if (action.action === 'grant_ally_armor' && ally) {
        ally.armor += 1
        fact.detail.armoredAlly = ally.id
      }
      if (action.action === 'ally_draws_card' && ally) {
        generated.push(...cardDrawActions(ally, ally.id, 1))
        fact.detail.drewForAlly = ally.id
      }
      if (action.action === 'reduce_escalation') {
        // The one that is not aimed at a single ally: it buys the Party a
        // little of the clock back, which is the contribution an Incapacitated
        // Hero can still make to a fight they can no longer stand in. It is
        // also the only effect in the game that moves Escalation *down*, which
        // is why it is worth measuring before the diminished set grows.
        draft.escalation = Math.max(0, draft.escalation - 1)
        fact.detail.reducedEscalation = true
      }
      succeed(fact)
      break
    }
    case 'discard_for_stamina': {
      const hero = draft.heroes[action.sourceId]
      const card = takeFromHand(hero, action.cardInstanceId)
      hero.discard.push(card)
      succeed(fact)
      break
    }
    case 'place_counter': {
      const definition = catalog.counters[action.counterId]
      if (!definition) {
        fail(fact, `The Counter ${action.counterId} is not authored.`)
        break
      }
      const placing = createFromDefinition(definition, { sourceId: action.sourceId, round: draft.round, phase: draft.phase })
      const placed = placeCounter(draft, action.hostRef as CounterRef, placing, action.amount)
      fact.detail.placedCounter = definition.id
      fact.detail.placedCounterAmount = placed
      fact.resolutionFact = {
        counter_event: counterEvent({ ...placing, count: placed }, placed > 0 ? 'placed' : 'refused', placed > 0 ? action.reasonText : 'at_max'),
      }
      succeed(fact)
      break
    }
    case 'advance_phase': {
      clearWindowFlags(draft, action.fromPhase)
      if (action.fromPhase === 'loadout') {
        // Leaving Loadout locks the bar in: nothing on it is tentative any
        // more, so later re-loads are true Replacements.
        for (const hero of Object.values(draft.heroes)) {
          for (const slot of hero.actionBar) {
            slot.placedThisLoadout = false
          }
        }
      }
      draft.phase = action.toPhase
      draft.round = action.round
      succeed(fact)
      break
    }
    case 'round_start': {
      draft.round = action.round
      advanceBoardRound(draft.board)
      for (const heroId of Object.keys(draft.heroes)) {
        const hero = draft.heroes[heroId]
        hero.armor = 0
        // Fortified's banked Armor is its count times its Reader's `per`
        // (D-047), so two Fortify commitments are one stack of Counters and
        // the additive stacking D-019 asked for is just addition.
        hero.armor += Math.max(readerSum(draft, combatantRef(heroId), 'round_start', 'armor'), 0)
        // A Signature that accrues on a clock rather than on an event
        // (ADR 0037). Evaluated after the Armor grant so a Grant reads the
        // Round as it has settled, never mid-wipe.
        evaluateGrantsFor(catalog, draft, heroId, 'round_start')
      }
      // The Armor wipe is the Party's alone; the duration tick is every
      // combatant's. Running upkeep after the grant keeps Fortified's D-019
      // arc — pay out this Round's stored Armor, then expire — and gives an
      // Enemy-facing status the same honest clock on the Boss and its Minions.
      const expiredCounters = roundUpkeep(draft)
      if (expiredCounters.length > 0) {
        fact.detail.expiredCounters = expiredCounters.map(({ ref, counter }) => ({
          host: ref,
          ...counterEvent(counter, 'expired', 'duration_elapsed'),
        }))
      }
      // The Phase Break replaces this Round's rotation rather than following
      // it: Phase II opens on its own first Program, not on whichever Phase I
      // Program the loop happened to reach. Recorded on the Round's own fact
      // so the reveal has something authoritative to read — the presentation
      // never decides that a phase turned.
      if (phaseBreakDue(draft, action.round)) {
        applyPhaseBreak(draft)
        fact.detail.phaseBreak = draft.bossPhase
        fact.detail.phaseProgram = draft.currentProgramId ?? ''
      } else {
        advanceProgram(draft)
      }
      succeed(fact)
      break
    }
    case 'full_charge_cleanup': {
      const hero = draft.heroes[action.sourceId]
      const slot = hero?.actionBar[action.slotIndex]
      if (!hero || !slot || slot.topCard === null) {
        fail(fact, 'Full-Charge Cleanup requires an occupied Slot.')
        break
      }
      fact.detail.topCard = slot.topCard.cardId
      fact.detail.chargeCards = slot.charges.map((charge) => charge.cardId)
      hero.discard.push(slot.topCard, ...slot.charges)
      hero.actionBar[action.slotIndex] = { topCard: null, charges: [], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
      succeed(fact)
      break
    }
    case 'draw_card': {
      const hero = draft.heroes[action.sourceId]
      if (!hero) {
        fail(fact, 'The drawing Hero is unavailable.')
        break
      }
      if (hero.deck.length === 0) {
        fact.detail.drawn = false
        succeed(fact)
        break
      }
      const card = hero.deck.pop() as CardInstance
      hero.hand.push(card)
      fact.detail.drawn = true
      fact.detail.cardId = card.cardId
      fact.detail.cardInstanceId = card.instanceId
      succeed(fact)
      break
    }
    case 'shuffle_deck': {
      const hero = draft.heroes[action.sourceId]
      if (!hero || hero.deck.length > 0 || hero.discard.length === 0) {
        fail(fact, 'Reshuffling requires an empty deck and a non-empty discard pile.')
        break
      }
      hero.deck = hero.discard
      hero.discard = []
      shuffle(draft.rng, hero.deck, action.label)
      succeed(fact)
      break
    }
    case 'gain_escalation': {
      const before = draft.escalation
      draft.escalation = Math.min(ESCALATION_MAX, before + action.amount)
      const crossedThresholds = draft.escalationThresholds.filter(
        (threshold) => threshold.value > before && threshold.value <= draft.escalation,
      )
      const crossed = crossedThresholds.map((threshold) => threshold.title)
      // A structural threshold changes the arena for good, so unlike the
      // read-time modifiers it has to ride generated actions (D-031).
      for (const threshold of crossedThresholds) {
        for (const coords of threshold.scorch_hexes) {
          generated.push({
            kind: 'apply_hazard',
            sourceId: ENCOUNTER_SOURCE,
            coords,
            hazardId: 'scorched',
            fallbackDurationRounds: 1,
            permanent: true,
          })
        }
      }
      fact.resolutionFact = {
        escalation_before: before,
        escalation_after: draft.escalation,
        escalation_reason: action.reason,
        thresholds_crossed: crossed,
        ...(action.beatId === '' ? {} : { boss_beat_id: action.beatId }),
      }
      succeed(fact)
      break
    }
    case 'end_of_clock': {
      draft.round = action.round
      draft.active = false
      draft.outcome = 'defeat'
      draft.outcomeReason = action.reason
      succeed(fact)
      break
    }
  }
}

// Explicit Card draws use the same first-class draw and shuffle actions as
// Round refill (ADR 0015). Plan the sequence from pile sizes without mutating
// them; the generated actions perform every state change in recorded order.
function cardDrawActions(hero: HeroState, sourceId: string, drawCount: number): EncounterActionInput[] {
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

function resolveDisplacement(
  draft: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'displace_piece' }>,
  fact: ResolvedActionFact,
  generated: EncounterActionInput[],
): void {
  const source = draft.board.entities[action.sourceId]
  const target = draft.board.entities[action.targetId]
  if (!source || !target) {
    fail(fact, 'The displacement target is unavailable.')
    return
  }

  const from = { ...target.coords }
  const entered: Axial[] = []
  const requestedDistance = Math.max(Math.floor(action.distance), 0)
  let stopReason: 'complete' | 'edge' | 'occupied' | 'blocked' = 'complete'
  for (let step = 0; step < requestedDistance; step += 1) {
    const direction =
      action.movement === 'push'
        ? facingToward(source.coords, target.coords, target.facing)
        : facingToward(target.coords, source.coords, target.facing)
    const destination = axialAdd(target.coords, axialDeltaFor(direction))
    if (!isOnBoard(draft.board, destination)) {
      stopReason = 'edge'
      break
    }
    if (isOccupied(draft.board, destination, action.targetId)) {
      stopReason = 'occupied'
      break
    }
    // Ground a walker routes around stops a shove too (D-072). A displacement
    // is deliberately dumber than a traversal — it re-aims each hex and has no
    // route to reconsider — but "impassable" cannot mean "impassable unless
    // pushed", or Drive Back would be the one way onto ground the arena has
    // taken away.
    if (!isTraversable(draft.board, action.targetId, destination)) {
      stopReason = 'blocked'
      break
    }
    moveEntity(draft.board, action.targetId, destination)
    entered.push({ ...destination })
  }

  fact.resolutionFact = {
    from,
    to: { ...target.coords },
    requested_distance: requestedDistance,
    actual_distance: entered.length,
    stop_reason: stopReason,
  }
  succeed(fact)
  for (const coords of entered) {
    generated.push(...hazardEntryActions(draft, action.targetId, coords))
  }
}

// A Beat's movement clause landing (D-074). The route was decided when the Beat
// resolved, so this only has to walk it — but it re-checks each hex rather than
// trusting the plan, because anything generated between the two could have put
// a piece in the way.
//
// Hazard entry fires per hex entered, which is where a walker and a jumper come
// apart: a walker's path is every hex it crossed and it pays for all of them, a
// jumper's is the one it landed on.
function resolveTraversal(
  draft: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'traverse_piece' }>,
  fact: ResolvedActionFact,
  generated: EncounterActionInput[],
): void {
  const mover = draft.board.entities[action.sourceId]
  if (!mover) {
    fail(fact, 'The traversing piece is unavailable.')
    return
  }
  const from = { ...mover.coords }
  const entered: Axial[] = []
  let stopReason: 'complete' | 'blocked' = 'complete'
  for (const coords of action.path) {
    if (!moveEntity(draft.board, action.sourceId, coords)) {
      stopReason = 'blocked'
      break
    }
    entered.push({ ...coords })
  }
  // A piece ends a traversal facing the way it went, the same rule a Hero's
  // paid step follows. Computed from what it actually entered rather than from
  // what it planned, so a route cut short faces where it stopped.
  mover.facing = facingAlong(entered, from, mover.facing)
  fact.resolutionFact = {
    from,
    to: { ...mover.coords },
    facing: mover.facing,
    traversal: action.traversal,
    requested_distance: action.path.length,
    actual_distance: entered.length,
    stop_reason: stopReason,
  }
  succeed(fact)
  for (const coords of entered) {
    generated.push(...hazardEntryActions(draft, action.sourceId, coords))
  }
}

function hazardEntryActions(draft: EncounterState, targetId: string, coords: Axial): EncounterActionInput[] {
  const enteringTeam = draft.board.entities[targetId]?.team
  return getHazards(draft.board, coords)
    .filter((hazard) => hazard.enterDamage > 0)
    // Immune to your own side's ground (D-042), unless the ground says
    // otherwise (D-074). The rule is still the default and still the right one
    // — without it a Boss advancing across its own permanent Ash Trail chips
    // itself, crediting a Hero with Boss damage they never dealt, against a
    // D-016 margin once down to 2 — but it is now the Hazard's decision rather
    // than the engine's, so a Boss can be authored to be lured onto its own.
    .filter((hazard) => hazard.damagesSourceTeam === true || hazard.sourceTeam === undefined || hazard.sourceTeam !== enteringTeam)
    .map((hazard) => ({
      kind: 'damage' as const,
      sourceId: 'hazard',
      targetId,
      amount: hazard.enterDamage,
      reasonText: hazard.id,
    }))
}

function succeed(fact: ResolvedActionFact): void {
  fact.succeeded = true
  fact.reason = ''
}

function fail(fact: ResolvedActionFact, reason: string): void {
  fact.succeeded = false
  fact.reason = reason
}

function takeFromHand(hero: HeroState, cardInstanceId: string): CardInstance {
  const index = hero.hand.findIndex((card) => card.instanceId === cardInstanceId)
  const [card] = hero.hand.splice(index, 1)
  return card
}

function syncHeroEntity(draft: EncounterState, heroId: string): void {
  const entity = draft.board.entities[heroId]
  if (entity) {
    entity.health = draft.heroes[heroId].health
  }
}

// A Slot's activation flag lives exactly as long as its window.
function clearWindowFlags(draft: EncounterState, window: Phase): void {
  for (const hero of Object.values(draft.heroes)) {
    for (const slot of hero.actionBar) {
      if (slot.activatedWindow === window) {
        slot.activatedWindow = null
      }
    }
  }
}

// Counters that answer a fired Slot with bonus Boss damage through an authored
// Reader rather than through graded consumption.
function slotFiredCounterActions(draft: EncounterState, entityId: string): EncounterActionInput[] {
  const bonus = readerSum(draft, combatantRef(entityId), 'slot_fired', 'boss_damage')
  if (bonus <= 0 || draft.bossId === entityId) {
    return []
  }
  return [{ kind: 'damage', sourceId: entityId, targetId: draft.bossId, amount: bonus, reasonText: 'counter_reader' }]
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
    switch (reader.effect) {
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
}

function applyDamage(
  draft: EncounterState,
  targetId: string,
  amount: number,
  sourceId = '',
  damageKeywords: string[] = [],
): Record<string, unknown> {
  // Counters ride damage resolution that already existed, through Readers
  // rather than through two named payload fields (D-047): the source's
  // Weakened lowers what it deals at `-1` a Counter, the target's Sundered
  // raises what it takes at `+1`. Both resolve before mitigation, so Armor
  // still answers the number the Party can read.
  const dealtDelta = sourceId === '' ? 0 : readerSum(draft, combatantRef(sourceId), 'host_deals_damage', 'target_damage', damageKeywords)
  const takenDelta = readerSum(draft, combatantRef(targetId), 'host_takes_damage', 'target_damage', damageKeywords)
  const requested = Math.max(amount + dealtDelta + takenDelta, 0)
  // Armor is the only mitigation there has ever been: the old per-Counter
  // `damageReduction` field was never set by anything and left with D-047.
  const hero = draft.heroes[targetId]
  if (hero) {
    // The Underwritten cover (D-080): a Hero holding it converts this blow
    // into healing instead of taking it, and the blow spends the cover.
    // Checked before Armor, because a converted blow was never mitigated —
    // the Armor stays for the next one the cover no longer answers.
    if (requested > 0 && spendCounter(draft, combatantRef(targetId), UNDERWRITTEN, 1) > 0) {
      const restored = Math.min(requested, hero.maxHealth - hero.health)
      hero.health += restored
      syncHeroEntity(draft, targetId)
      return { requested, prevented: requested, health_loss: 0, converted_to_healing: restored, target_available: true }
    }
    const armorBlocked = Math.min(hero.armor, requested)
    hero.armor -= armorBlocked
    const remaining = requested - armorBlocked
    const dealt = Math.min(remaining, hero.health)
    hero.health = Math.max(hero.health - dealt, 0)
    syncHeroEntity(draft, targetId)
    return { requested, prevented: armorBlocked, health_loss: dealt, target_available: true }
  }
  const target = draft.board.entities[targetId]
  const healthBefore = target?.health ?? 0
  const dealt = damageEntity(draft.board, targetId, requested)
  if (healthBefore <= 0) {
    return { requested, prevented: 0, health_loss: 0, target_available: false }
  }
  const resolutionFact: Record<string, unknown> = { requested, prevented: 0, health_loss: dealt, target_available: true }
  // Minion Defeat is part of damage resolution: the Minion leaves the board
  // before the damage action completes, and the fact records target_removed.
  if (target?.kind === 'minion' && dealt > 0 && dealt === healthBefore) {
    delete draft.board.entities[targetId]
    delete draft.counters[combatantRef(targetId)]
    resolutionFact.target_removed = true
  }
  return resolutionFact
}

// One predicate, two rewards (D-039). Absorbing a Tank Hit on the Guarded
// Front for zero Health loss decides where the Beat's ash falls — and, since
// D-064, it is also the event Elian's Signature standing clause reads. The
// absorption half stays an engine rule because the ash spill is Boss
// resolution, not a Hero's power; the Grant half lives in `signature.ts`.
function evaluateTankHitAbsorption(
  draft: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'damage' }>,
  resolutionFact: Record<string, unknown>,
): void {
  if (action.sourceId !== draft.bossId || action.targetId !== draft.primaryHeroId) {
    return
  }
  if (!((resolutionFact.damage_keywords as string[] | undefined) ?? []).includes(TANK_HIT)) {
    return
  }
  const guardedFront = isGuardedFront(draft.board, draft.bossId, draft.primaryHeroId)
  resolutionFact.guarded_front = guardedFront
  draft.previousImpactAbsorbed = (resolutionFact.health_loss as number) === 0 && guardedFront
}

// One per-kind mapping produces both the fact log title and the serializable
// detail payload, so the two never drift apart.
function factPresentation(action: EncounterActionInput): { title: string; detail: Record<string, unknown> } {
  const detail = structuredClone(action) as unknown as Record<string, unknown>
  delete detail.kind
  delete detail.sourceId
  switch (action.kind) {
    case 'load_slot':
      return { title: `Load Slot ${action.slotIndex + 1}`, detail }
    case 'charge_slot':
      return { title: `Charge Slot ${action.slotIndex + 1}`, detail }
    case 'fire_slot':
      return { title: `Fire Slot ${action.slotIndex + 1}`, detail }
    case 'move_hero':
      return { title: `Move to (${action.destination.q}, ${action.destination.r})`, detail }
    case 'displace_piece': {
      const verb = action.movement === 'push' ? 'Push' : 'Pull'
      return { title: `${verb} ${action.targetId} ${action.distance}`, detail }
    }
    case 'traverse_piece': {
      const landing = action.path.at(-1)
      const where = landing === undefined ? 'nowhere' : `(${landing.q}, ${landing.r})`
      const verb = action.traversal === 'walk' ? 'advances' : action.traversal === 'jump' ? 'leaps' : 'appears'
      return { title: `${action.sourceId} ${verb} to ${where}`, detail }
    }
    case 'resolve_boss':
      return { title: `Boss Beat: ${action.beat.title}`, detail: { beatId: action.beat.id, beatTitle: action.beat.title, track: action.track } }
    case 'apply_hazard':
      return { title: `Hazard at (${action.coords.q}, ${action.coords.r})`, detail }
    case 'spawn_minion':
      return { title: `Spawn ${action.minionId}`, detail }
    case 'detonate_minion':
      return { title: `${action.sourceId} detonates`, detail }
    case 'damage':
      return { title: `Damage ${action.amount} to ${action.targetId} (${action.reasonText})`, detail }
    case 'discard_for_stamina':
      return { title: 'Discard for Stamina', detail }
    case 'incapacitate_hero':
      return { title: `${action.sourceId} is Incapacitated`, detail }
    case 'revive_ally':
      return { title: `Revive ${action.targetId}`, detail }
    case 'diminished_action':
      return { title: `Incapacitated: ${action.action.replace(/_/g, ' ')}`, detail }
    case 'place_counter':
      return { title: `${action.reasonText}: ${action.amount} ${action.counterId}`, detail }
    case 'advance_phase':
      return { title: `Phase: ${action.fromPhase} to ${action.toPhase}`, detail }
    case 'round_start':
      return { title: `Round ${action.round} begins`, detail }
    case 'full_charge_cleanup':
      return { title: `Full-Charge Cleanup: Slot ${action.slotIndex + 1}`, detail }
    case 'draw_card':
      return { title: 'Draw a card', detail }
    case 'shuffle_deck':
      return { title: `Shuffle deck (${action.label})`, detail }
    case 'gain_escalation':
      return { title: `Escalation +${action.amount} (${action.reason})`, detail }
    case 'end_of_clock':
      return { title: 'End of the Encounter Clock', detail }
  }
}
