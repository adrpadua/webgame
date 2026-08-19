import { addEntity, addHazard, advanceBoardRound, damageEntity, facingToward, getHazards, isGuardedFront, isOccupied, isOnBoard, moveEntity } from './board'
import { axialAdd, axialSubtract, hexDistance, hexesWithinRadius, type Axial } from './hex'
import { axialDeltaFor, directionForAxialDelta, FACING_NW } from './facing'
import type { ContentCatalog } from './content/catalog'
import type { Card } from './content/schemas'
import { resolveFire, type FireEffects } from './cardResolver'
import { legality } from './legality'
import { resolveBossBeat, advanceProgram, applyPhaseBreak, phaseBreakDue } from './timeline'
import { ESCALATION_MAX } from './escalation'
import { shuffle } from './rng'
import {
  counterEvent,
  createFortified,
  createFromDefinition,
  createRiposteReady,
  getCounters,
  hasCounter,
  placeCounter,
  removeCounter,
  RIPOSTE_READY,
  roundUpkeep,
  readerSum,
  spendCounter,
  counterHostRef,
  readerCount,
  readerSubject,
  combatantRef,
  slotRef,
  clearCounters,
  type CounterRef,
} from './counters'
import { TANK_HIT } from './keywords'
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
  // One-player slice rule (docs/rules/prototype-rules.md): reducing Elian
  // Voss to 0 health is defeat. CONTEXT.md's Downed/Revive states presuppose
  // a multi-Hero Party and are deferred with it — see the working note.
  for (const hero of Object.values(draft.heroes)) {
    if (hero.health <= 0) {
      draft.active = false
      draft.outcome = 'defeat'
      draft.outcomeReason = 'A Hero has fallen.'
      return
    }
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
      // A cost is paid before the Card's effects are computed, so a Card
      // that both scales off a Counter and spends it as a cost scales off
      // what is left — the ordinary reading of paying for something.
      const spentEarly = spendCardReaders(draft, card, action, 'cost')
      const effects = resolveFire(catalog, card, slot.charges.map((charge) => catalog.cards[charge.cardId]))
      applyScaleReaders(catalog, draft, effects, card, action)
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
      hero.armor += effects.armor
      hero.health = Math.min(hero.maxHealth, hero.health + effects.healing)
      slot.activatedWindow = draft.phase
      syncHeroEntity(draft, action.sourceId)
      const consumed = consumeCountersForSlot(draft, action.sourceId, card, baseBossDamage > 0 || burstIncludesBoss)
      if (consumed.events.length > 0) {
        fact.resolutionFact = { counter_event: consumed.events[0] }
      }
      if (effects.armorNextRound > 0) {
        const fortified = createFortified(catalog, card.id, draft.round, draft.phase)
        // Fortify's stored Armor is the number of Counters placed, so the
        // amount still rides the card and the Counter stays a bare marker.
        const banked = fortified === null ? 0 : placeCounter(draft, combatantRef(action.sourceId), fortified, effects.armorNextRound)
        if (fortified !== null && consumed.events.length === 0) {
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
          if (consumed.events.length === 0) {
            fact.resolutionFact = {
              counter_event: counterEvent({ ...placing, count: placed }, placed > 0 ? 'placed' : 'refused', placed > 0 ? 'authored_counter' : 'at_max'),
            }
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
        const bossBaseAmount = baseBossDamage + (burstIncludesBoss ? effects.targetDamage : 0)
        const bossAmount = bossBaseAmount + consumed.bonusBossDamage
        const factContext = cardDamageContext(card, payoffContext(card, consumed, bossBaseAmount))
        if (bossAmount > 0) {
          generated.push({
            kind: 'damage',
            sourceId: action.sourceId,
            targetId: draft.bossId,
            amount: bossAmount,
            reasonText: card.title,
            factContext,
          })
        }
      } else {
        if (baseBossDamage + consumed.bonusBossDamage > 0) {
          const factContext = cardDamageContext(card, payoffContext(card, consumed, baseBossDamage))
          generated.push({
            kind: 'damage',
            sourceId: action.sourceId,
            targetId: draft.bossId,
            amount: baseBossDamage + consumed.bonusBossDamage,
            reasonText: card.title,
            factContext,
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
    case 'resolve_boss': {
      generated.push(...resolveBossBeat(draft, action.sourceId, action.beat, action.track))
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
          }
        : {
            id: 'scorched',
            title: 'Scorched',
            remainingRounds: Math.max(action.fallbackDurationRounds, 1),
            enterDamage: 1,
            blocksVoluntaryMovement: true,
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
    case 'move_minion': {
      const entity = draft.board.entities[action.sourceId]
      if (!entity) {
        fail(fact, 'The Minion no longer exists.')
        break
      }
      const fromCoords = entity.coords
      moveEntity(draft.board, action.sourceId, action.destination)
      entity.facing = directionForAxialDelta(axialSubtract(action.destination, fromCoords))
      succeed(fact)
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
      evaluateRiposteGrant(draft, action, resolutionFact)
      fact.resolutionFact = resolutionFact
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
    case 'expire_counter': {
      removeCounter(draft, action.hostRef as CounterRef, action.counterId)
      fact.resolutionFact = { counter_event: structuredClone(action.counterEvent) }
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
      hero.actionBar[action.slotIndex] = { topCard: null, charges: [], activatedWindow: null, placedThisLoadout: false }
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
  let stopReason: 'complete' | 'edge' | 'occupied' = 'complete'
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

function hazardEntryActions(draft: EncounterState, targetId: string, coords: Axial): EncounterActionInput[] {
  const enteringTeam = draft.board.entities[targetId]?.team
  return getHazards(draft.board, coords)
    .filter((hazard) => hazard.enterDamage > 0)
    // Immune to your own side's ground (D-042). Without this a Boss advancing
    // across its own permanent Ash Trail chips itself, crediting a Hero with
    // Boss damage they never dealt — against a D-016 margin already down to 2.
    .filter((hazard) => hazard.sourceTeam === undefined || hazard.sourceTeam !== enteringTeam)
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

interface ConsumedCounters {
  bonusBossDamage: number
  events: Record<string, unknown>[]
}

// A consumable payoff Counter (consumeOnCardId set) is cashed by ANY card
// that deals Boss damage: the named payoff card takes the full bonus, every
// other Boss-damage card takes the smaller off-payoff bonus. Cards that deal
// no Boss damage never consume it. Graded consumption is engine-only (D-015,
// D-033) — it is exactly what the Reader vocabulary models badly.
function consumeCountersForSlot(draft: EncounterState, entityId: string, card: Card, dealsBossDamage: boolean): ConsumedCounters {
  const result: ConsumedCounters = { bonusBossDamage: 0, events: [] }
  const remaining = []
  const ref = combatantRef(entityId)
  for (const counter of getCounters(draft, ref)) {
    if (counter.consumeOnCardId === '' || !dealsBossDamage) {
      remaining.push(counter)
      continue
    }
    const isPayoffCard = counter.consumeOnCardId === card.id
    const bonus = isPayoffCard ? counter.bonusBossDamageOnSlotFired : counter.bonusBossDamageOffPayoff
    result.bonusBossDamage += bonus
    const event = counterEvent(counter, 'consumed', isPayoffCard ? 'matching_card_fired' : 'boss_damage_card_fired')
    event.card_id = card.id
    event.bonus_boss_damage = bonus
    result.events.push(event)
  }
  draft.counters[ref] = remaining
  return result
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

// The consumed-Counter half of a Boss-damage fact context, which the burst
// and non-burst branches both need to say the same way.
function payoffContext(card: Card, consumed: ConsumedCounters, baseAmount: number): Record<string, unknown> | undefined {
  if (consumed.bonusBossDamage <= 0) {
    return undefined
  }
  return {
    base_amount: baseAmount,
    counter_bonus: consumed.bonusBossDamage,
    counter_id: (consumed.events[0] as { counter_id: string }).counter_id,
    payoff_card_id: card.id,
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

// Riposte Ready: a qualifying Tank Hit against the Guarded Front with zero
// Health loss grants the status; the evaluation is always recorded.
function evaluateRiposteGrant(
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
  // One predicate, two rewards (D-039). Absorbing a Tank Hit on the Guarded
  // Front for zero Health loss grants Riposte Ready *and* decides where the
  // Beat's ash falls — the throughput payoff for a party, the standing-room
  // payoff for a line that cannot win. It never reduces the ash.
  draft.previousImpactAbsorbed = (resolutionFact.health_loss as number) === 0 && guardedFront
  const evaluation: Record<string, unknown> = { counter_id: RIPOSTE_READY, result: 'not_granted', reason: '' }
  if ((resolutionFact.health_loss as number) > 0) {
    evaluation.reason = 'health_lost'
  } else if (!guardedFront) {
    evaluation.reason = 'not_guarded_front'
  } else if (hasCounter(draft, combatantRef(draft.primaryHeroId), RIPOSTE_READY)) {
    evaluation.reason = 'already_active'
  } else {
    const counter = createRiposteReady(action.sourceId, (resolutionFact.boss_beat_id as string) ?? '', draft.round, draft.phase)
    placeCounter(draft, combatantRef(draft.primaryHeroId), counter)
    evaluation.result = 'granted'
    evaluation.reason = counter.triggerReason
    resolutionFact.counter_event = counterEvent({ ...counter, count: 1 }, 'placed', counter.triggerReason)
  }
  resolutionFact.counter_evaluation = evaluation
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
      const verb = action.movement === 'push' ? 'Push' : action.movement === 'advance' ? 'Advance' : 'Pull'
      return { title: `${verb} ${action.targetId} ${action.distance}`, detail }
    }
    case 'resolve_boss':
      return { title: `Boss Beat: ${action.beat.title}`, detail: { beatId: action.beat.id, beatTitle: action.beat.title, track: action.track } }
    case 'apply_hazard':
      return { title: `Hazard at (${action.coords.q}, ${action.coords.r})`, detail }
    case 'spawn_minion':
      return { title: `Spawn ${action.minionId}`, detail }
    case 'move_minion':
      return { title: `${action.sourceId} advances to (${action.destination.q}, ${action.destination.r})`, detail }
    case 'damage':
      return { title: `Damage ${action.amount} to ${action.targetId} (${action.reasonText})`, detail }
    case 'discard_for_stamina':
      return { title: 'Discard for Stamina', detail }
    case 'expire_counter':
      return { title: `Counter expires: ${action.counterId}`, detail }
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
