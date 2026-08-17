import { addEntity, addHazard, advanceBoardRound, damageEntity, getHazards, isGuardedFront, moveEntity } from './board'
import { axialSubtract } from './hex'
import { directionForAxialDelta, FACING_NW } from './facing'
import type { ContentCatalog } from './content/catalog'
import type { Card } from './content/schemas'
import { resolveFire } from './cardResolver'
import { legality } from './legality'
import { resolveBossBeat, advanceProgram } from './timeline'
import { ESCALATION_MAX } from './escalation'
import { shuffle } from './rng'
import {
  addStatus,
  createFortified,
  createFromDefinition,
  createRiposteReady,
  getStatuses,
  hasStatus,
  removeStatus,
  RIPOSTE_READY,
  statusEvent,
  statusExpiresOnRoundAdvance,
  TANK_HIT,
} from './statuses'
import { ENCOUNTER_SOURCE, type EncounterActionInput } from './actions'
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
  for (const followup of generated) {
    applyAction(catalog, draft, followup, facts, depth + 1)
  }
  checkResolution(draft)
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
      const effects = resolveFire(catalog, card, slot.charges.map((charge) => catalog.cards[charge.cardId]))
      const baseBossDamage = effects.bossDamage
      hero.armor += effects.armor
      hero.health = Math.min(hero.maxHealth, hero.health + effects.healing)
      slot.activatedWindow = draft.phase
      syncHeroEntity(draft, action.sourceId)
      const consumed = consumeStatusesForSlot(draft, action.sourceId, card, effects.bossDamage > 0)
      effects.bossDamage += consumed.bonusBossDamage
      if (consumed.events.length > 0) {
        fact.resolutionFact = { status_event: consumed.events[0] }
      }
      if (effects.armorNextRound > 0) {
        const fortified = createFortified(catalog, card.id, effects.armorNextRound, draft.round, draft.phase)
        addStatus(draft, action.sourceId, fortified)
        if (consumed.events.length === 0) {
          fact.resolutionFact = { status_event: statusEvent(fortified, 'granted', fortified.triggerReason) }
        }
      }
      // An authored status (D-033). `target_type` decides where it lands: a
      // selected Enemy for an enemy-facing status, the firing Hero otherwise.
      // `board_slot` — an ally's Top Card — is canon but unbuilt (D-035).
      if (card.applies_status !== '') {
        const definition = catalog.statuses[card.applies_status]
        if (definition) {
          const targetId = definition.applies_to === 'enemy' ? (action.targetId ?? '') : action.sourceId
          const applied = createFromDefinition(definition, { sourceId: card.id, round: draft.round, phase: draft.phase })
          const granted = addStatus(draft, targetId, applied)
          fact.detail.appliedStatus = definition.id
          fact.detail.appliedStatusTarget = targetId
          fact.detail.appliedStatusGranted = granted
          if (consumed.events.length === 0) {
            fact.resolutionFact = { status_event: statusEvent(applied, granted ? 'granted' : 'refused', granted ? 'authored_status' : 'already_present') }
          }
        }
      }
      succeed(fact)
      if (effects.bossDamage > 0) {
        let factContext: Record<string, unknown> | undefined
        if (consumed.bonusBossDamage > 0) {
          factContext = {
            base_amount: baseBossDamage,
            status_bonus: consumed.bonusBossDamage,
            status_id: (consumed.events[0] as { status_id: string }).status_id,
            payoff_card_id: card.id,
          }
        }
        generated.push({
          kind: 'damage',
          sourceId: action.sourceId,
          targetId: draft.bossId,
          amount: effects.bossDamage,
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
        })
      }
      generated.push(...slotFiredStatusActions(draft, action.sourceId))
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
      for (const hazard of getHazards(draft.board, action.destination)) {
        if (hazard.enterDamage > 0) {
          generated.push({
            kind: 'damage',
            sourceId: 'hazard',
            targetId: action.sourceId,
            amount: hazard.enterDamage,
            reasonText: hazard.id,
          })
        }
      }
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
      const resolutionFact = applyDamage(draft, action.targetId, action.amount, action.sourceId)
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
      evaluateDamageStatus(draft, action, resolutionFact)
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
    case 'expire_status': {
      removeStatus(draft, action.targetId, action.statusId)
      fact.resolutionFact = { status_event: structuredClone(action.statusEvent) }
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
        for (const effect of getStatuses(draft, heroId)) {
          if (effect.triggers.includes('on_round_start')) {
            hero.armor += effect.armorOnRoundStart
          }
        }
        draft.statusEffects[heroId] = getStatuses(draft, heroId).filter((effect) => !statusExpiresOnRoundAdvance(effect))
      }
      advanceProgram(draft)
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
      if (!hero || hero.deck.length === 0) {
        fail(fact, 'The deck has no card to draw.')
        break
      }
      const card = hero.deck.pop() as CardInstance
      hero.hand.push(card)
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

interface ConsumedStatuses {
  bonusBossDamage: number
  events: Record<string, unknown>[]
}

// A consumable payoff status (consumeOnCardId set) is cashed by ANY card that
// deals Boss damage: the named payoff card takes the full bonus, every other
// Boss-damage card takes the smaller off-payoff bonus. Cards that deal no Boss
// damage never consume it.
function consumeStatusesForSlot(draft: EncounterState, entityId: string, card: Card, dealsBossDamage: boolean): ConsumedStatuses {
  const result: ConsumedStatuses = { bonusBossDamage: 0, events: [] }
  const remaining = []
  for (const effect of getStatuses(draft, entityId)) {
    const consumes = effect.consumeOnCardId !== '' && dealsBossDamage && effect.triggers.includes('on_slot_fired')
    if (!consumes) {
      remaining.push(effect)
      continue
    }
    const isPayoffCard = effect.consumeOnCardId === card.id
    const bonus = isPayoffCard ? effect.bonusBossDamageOnSlotFired : effect.bonusBossDamageOffPayoff
    result.bonusBossDamage += bonus
    const event = statusEvent(effect, 'consumed', isPayoffCard ? 'matching_card_fired' : 'boss_damage_card_fired')
    event.card_id = card.id
    event.bonus_boss_damage = bonus
    result.events.push(event)
  }
  draft.statusEffects[entityId] = remaining
  return result
}

// Non-consumed statuses that respond to a fired Slot with bonus Boss damage.
function slotFiredStatusActions(draft: EncounterState, entityId: string): EncounterActionInput[] {
  const actions: EncounterActionInput[] = []
  for (const effect of getStatuses(draft, entityId)) {
    if (effect.consumeOnCardId !== '') {
      continue
    }
    if (effect.triggers.includes('on_slot_fired') && effect.bonusBossDamageOnSlotFired > 0 && draft.bossId !== entityId) {
      actions.push({
        kind: 'damage',
        sourceId: entityId,
        targetId: draft.bossId,
        amount: effect.bonusBossDamageOnSlotFired,
        reasonText: effect.id,
      })
    }
  }
  return actions
}

// Sums one enemy-facing payload field across a combatant's statuses (D-034).
function statusSum(draft: EncounterState, entityId: string, field: 'damageTakenBonus' | 'damageDealtPenalty'): number {
  let total = 0
  for (const effect of getStatuses(draft, entityId)) {
    if (effect.triggers.includes('on_damage_taken')) {
      total += effect[field]
    }
  }
  return total
}

function applyDamage(draft: EncounterState, targetId: string, amount: number, sourceId = ''): Record<string, unknown> {
  // The two enemy-facing fields ride damage resolution that already existed:
  // the source's Weakened lowers what it deals, the target's Sundered raises
  // what it takes. Both resolve before mitigation, so Armor still answers the
  // number the Party can read.
  const dealtPenalty = sourceId === '' ? 0 : statusSum(draft, sourceId, 'damageDealtPenalty')
  const takenBonus = statusSum(draft, targetId, 'damageTakenBonus')
  const requested = Math.max(amount - dealtPenalty + takenBonus, 0)
  let adjusted = requested
  let prevented = 0
  for (const effect of getStatuses(draft, targetId)) {
    const reduction = effect.triggers.includes('on_damage_taken') ? effect.damageReduction : 0
    const beforeReduction = adjusted
    adjusted = Math.max(adjusted - reduction, 0)
    prevented += beforeReduction - adjusted
  }
  const hero = draft.heroes[targetId]
  if (hero) {
    const armorBlocked = Math.min(hero.armor, adjusted)
    hero.armor -= armorBlocked
    const remaining = adjusted - armorBlocked
    const dealt = Math.min(remaining, hero.health)
    hero.health = Math.max(hero.health - dealt, 0)
    syncHeroEntity(draft, targetId)
    return { requested, prevented: prevented + armorBlocked, health_loss: dealt, target_available: true }
  }
  const target = draft.board.entities[targetId]
  const healthBefore = target?.health ?? 0
  const dealt = damageEntity(draft.board, targetId, adjusted)
  if (healthBefore <= 0) {
    return { requested, prevented, health_loss: 0, target_available: false }
  }
  const resolutionFact: Record<string, unknown> = { requested, prevented, health_loss: dealt, target_available: true }
  // Minion Defeat is part of damage resolution: the Minion leaves the board
  // before the damage action completes, and the fact records target_removed.
  if (target?.kind === 'minion' && dealt > 0 && dealt === healthBefore) {
    delete draft.board.entities[targetId]
    delete draft.statusEffects[targetId]
    resolutionFact.target_removed = true
  }
  return resolutionFact
}

// Riposte Ready: a qualifying Tank Hit against the Guarded Front with zero
// Health loss grants the status; the evaluation is always recorded.
function evaluateDamageStatus(
  draft: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'damage' }>,
  resolutionFact: Record<string, unknown>,
): void {
  if (action.sourceId !== draft.bossId || action.targetId !== draft.primaryHeroId) {
    return
  }
  if (resolutionFact.damage_classification !== TANK_HIT) {
    return
  }
  const guardedFront = isGuardedFront(draft.board, draft.bossId, draft.primaryHeroId)
  resolutionFact.guarded_front = guardedFront
  const evaluation: Record<string, unknown> = { status_id: RIPOSTE_READY, result: 'not_granted', reason: '' }
  if ((resolutionFact.health_loss as number) > 0) {
    evaluation.reason = 'health_lost'
  } else if (!guardedFront) {
    evaluation.reason = 'not_guarded_front'
  } else if (hasStatus(draft, draft.primaryHeroId, RIPOSTE_READY)) {
    evaluation.reason = 'already_active'
  } else {
    const effect = createRiposteReady(action.sourceId, (resolutionFact.boss_beat_id as string) ?? '', draft.round, draft.phase)
    addStatus(draft, draft.primaryHeroId, effect)
    evaluation.result = 'granted'
    evaluation.reason = effect.triggerReason
    resolutionFact.status_event = statusEvent(effect, 'granted', effect.triggerReason)
  }
  resolutionFact.status_evaluation = evaluation
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
    case 'expire_status':
      return { title: `Status expires: ${action.statusId}`, detail }
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
