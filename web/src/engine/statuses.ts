import type { StatusDefinition } from './content/schemas'
import type { EncounterState, Phase, StatusInstance } from './types'

export const RIPOSTE_READY = 'riposte_ready'
export const FORTIFIED = 'fortified'
export const SHIELD_SLAM = 'shield_slam'

export function getStatuses(state: EncounterState, entityId: string): StatusInstance[] {
  return state.statusEffects[entityId] ?? []
}

export function getStatus(state: EncounterState, entityId: string, statusId: string): StatusInstance | undefined {
  return getStatuses(state, entityId).find((effect) => effect.id === statusId)
}

export function hasStatus(state: EncounterState, entityId: string, statusId: string): boolean {
  return getStatus(state, entityId, statusId) !== undefined
}

// The entity gate has always accepted any board entity, so an Enemy could
// always host a status; what D-034 added is a payload that does something
// (`damageTakenBonus`, `damageDealtPenalty`) and this stacking rule.
export function addStatus(state: EncounterState, entityId: string, effect: StatusInstance): boolean {
  if (!state.board.entities[entityId]) {
    return false
  }
  if (!effect.stacking && hasStatus(state, entityId, effect.id)) {
    return false
  }
  if (!state.statusEffects[entityId]) {
    state.statusEffects[entityId] = []
  }
  state.statusEffects[entityId].push(effect)
  return true
}

export function removeStatus(state: EncounterState, entityId: string, statusId: string): boolean {
  const effects = getStatuses(state, entityId)
  const index = effects.findIndex((effect) => effect.id === statusId)
  if (index < 0) {
    return false
  }
  effects.splice(index, 1)
  state.statusEffects[entityId] = effects
  return true
}

// Round upkeep: window-scoped effects never expire by round; round-scoped
// effects expire when their remaining rounds run out.
export function statusExpiresOnRoundAdvance(effect: StatusInstance): boolean {
  if (effect.expiresAtWindowEnd !== '') {
    return false
  }
  effect.remainingRounds -= 1
  return effect.remainingRounds <= 0
}

// The Round's upkeep across every combatant holding a status — the Boss and
// its Minions included. The mechanism was always two-sided (D-032) but the
// tick ran over Heroes alone, so an authored `duration_rounds` meant nothing
// on an Enemy: Sundered landed once and never came off. A status held by a
// piece that has left the board goes with it, so a Minion's affliction cannot
// outlive the Minion.
export function roundUpkeep(state: EncounterState): { entityId: string; effect: StatusInstance }[] {
  const expired: { entityId: string; effect: StatusInstance }[] = []
  for (const entityId of Object.keys(state.statusEffects)) {
    if (!state.board.entities[entityId] && !state.heroes[entityId]) {
      delete state.statusEffects[entityId]
      continue
    }
    const remaining: StatusInstance[] = []
    for (const effect of getStatuses(state, entityId)) {
      if (statusExpiresOnRoundAdvance(effect)) {
        expired.push({ entityId, effect })
      } else {
        remaining.push(effect)
      }
    }
    state.statusEffects[entityId] = remaining
  }
  return expired
}

export function statusEvent(effect: StatusInstance, event: string, reason: string): Record<string, unknown> {
  return {
    status_id: effect.id,
    event,
    reason,
    expires_at_window_end: effect.expiresAtWindowEnd,
    source_id: effect.sourceId,
    source_beat_id: effect.sourceBeatId,
    trigger_round: effect.triggerRound,
    trigger_phase: effect.triggerPhase,
  }
}

// A Slow-window Armor commitment (D-019): the Armor lands at the NEXT Round
// start, after the wipe, so Fortify answers the next Round's pressure —
// including Instant-row hits nothing else can pre-block.
export function createFortified(catalog: { statuses: Record<string, StatusDefinition> }, sourceCardId: string, amount: number, round: number, phase: Phase): StatusInstance {
  const definition = catalog.statuses[FORTIFIED]
  return {
    id: FORTIFIED,
    title: definition?.title ?? 'Fortified',
    remainingRounds: definition?.duration_rounds ?? 1,
    triggers: definition ? [...definition.triggers] : ['on_round_start'],
    armorOnRoundStart: amount,
    damageReduction: 0,
    bonusBossDamageOnSlotFired: 0,
    bonusBossDamageOffPayoff: 0,
    damageTakenBonus: 0,
    damageDealtPenalty: 0,
    stacking: definition?.stacking ?? true,
    triggerReason: 'slow_commitment',
    expiresAtWindowEnd: '',
    consumeOnCardId: '',
    sourceId: sourceCardId,
    sourceBeatId: '',
    triggerRound: round,
    triggerPhase: phase,
  }
}

export function createRiposteReady(sourceId: string, sourceBeatId: string, round: number, phase: Phase): StatusInstance {
  return {
    id: RIPOSTE_READY,
    title: 'Riposte Ready',
    remainingRounds: 1,
    triggers: ['on_slot_fired'],
    armorOnRoundStart: 0,
    damageReduction: 0,
    bonusBossDamageOnSlotFired: 2,
    bonusBossDamageOffPayoff: 1,
    damageTakenBonus: 0,
    damageDealtPenalty: 0,
    stacking: false,
    triggerReason: 'qualifying_tank_hit',
    expiresAtWindowEnd: 'quick',
    consumeOnCardId: SHIELD_SLAM,
    sourceId,
    sourceBeatId,
    triggerRound: round,
    triggerPhase: phase,
  }
}

// Builds a live instance from an authored definition (D-033). Amounts a card
// supplies — Fortify's stored Armor, for instance — are passed in rather than
// authored on the status, so one definition serves cards of different sizes.
export function createFromDefinition(
  definition: StatusDefinition,
  source: { sourceId: string; sourceBeatId?: string; round: number; phase: Phase; armorOnRoundStart?: number },
): StatusInstance {
  return {
    id: definition.id,
    title: definition.title,
    remainingRounds: definition.duration_rounds,
    triggers: [...definition.triggers],
    armorOnRoundStart: source.armorOnRoundStart ?? 0,
    damageReduction: 0,
    bonusBossDamageOnSlotFired: 0,
    bonusBossDamageOffPayoff: 0,
    damageTakenBonus: definition.damage_taken_bonus,
    damageDealtPenalty: definition.damage_dealt_penalty,
    stacking: definition.stacking,
    triggerReason: 'authored_status',
    expiresAtWindowEnd: '',
    consumeOnCardId: '',
    sourceId: source.sourceId,
    sourceBeatId: source.sourceBeatId ?? '',
    triggerRound: source.round,
    triggerPhase: source.phase,
  }
}
