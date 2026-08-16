import type { EncounterState, Phase, StatusInstance } from './types'

export const RIPOSTE_READY = 'riposte_ready'
export const SHIELD_SLAM = 'shield_slam'
export const TANK_HIT = 'tank_hit'

export function getStatuses(state: EncounterState, entityId: string): StatusInstance[] {
  return state.statusEffects[entityId] ?? []
}

export function getStatus(state: EncounterState, entityId: string, statusId: string): StatusInstance | undefined {
  return getStatuses(state, entityId).find((effect) => effect.id === statusId)
}

export function hasStatus(state: EncounterState, entityId: string, statusId: string): boolean {
  return getStatus(state, entityId, statusId) !== undefined
}

export function addStatus(state: EncounterState, entityId: string, effect: StatusInstance): boolean {
  if (!state.board.entities[entityId]) {
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

export function createRiposteReady(sourceId: string, sourceBeatId: string, round: number, phase: Phase): StatusInstance {
  return {
    id: RIPOSTE_READY,
    title: 'Riposte Ready',
    remainingRounds: 1,
    triggers: ['on_slot_fired'],
    armorOnRoundStart: 0,
    damageReduction: 0,
    bonusBossDamageOnSlotFired: 2,
    triggerReason: 'qualifying_tank_hit',
    expiresAtWindowEnd: 'quick',
    consumeOnCardId: SHIELD_SLAM,
    sourceId,
    sourceBeatId,
    triggerRound: round,
    triggerPhase: phase,
  }
}
