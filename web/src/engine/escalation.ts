import type { ContentCatalog } from './content/catalog'
import type { EncounterActionInput } from './actions'
import { ENCOUNTER_SOURCE } from './actions'
import type { EncounterState } from './types'

// Escalation is the encounter's only clock (ADR 0027): one fixed 0–5 scale on
// every Boss, so the party reads the approaching collapse without arithmetic.
// Boss identity lives in the effects at each threshold, never in the length of
// the bar.
export const ESCALATION_MAX = 5

// Automatic ticks start late, by derivation, so ticks alone reach the top
// threshold exactly at the Encounter Clock: a 0–5 scale ticking from Round 1
// would be a five-Round clock, contradicting the eight-Round budget the solo
// slice is calibrated against. On an eight-Round clock the ticks land at the
// ends of Rounds 4–8 and the wipe fires where the old round-limit check did.
export function escalationStartRound(roundLimit: number): number {
  return Math.max(1, roundLimit - (ESCALATION_MAX - 1))
}

export interface EscalationModifiers {
  bossDamageBonus: number
  extraSpawnCount: number
  minionDamageBonus: number
}

// Thresholds are cumulative: every threshold at or below the current value is
// live, so a Boss can raise the same axis twice at different bands.
export function escalationModifiers(state: EncounterState): EscalationModifiers {
  const modifiers: EscalationModifiers = { bossDamageBonus: 0, extraSpawnCount: 0, minionDamageBonus: 0 }
  for (const threshold of state.escalationThresholds) {
    if (threshold.value > state.escalation) {
      continue
    }
    modifiers.bossDamageBonus += threshold.boss_damage_bonus
    modifiers.extraSpawnCount += threshold.extra_spawn_count
    modifiers.minionDamageBonus += threshold.minion_damage_bonus
  }
  return modifiers
}

// The authored penalty for leaving the living-Minion demand standing, taken
// from the Beats that create it. One demand kind is supported deliberately: a
// general unanswered-demand predicate is the second Boss's problem, the same
// restraint ADR 0021 exercised for the unguarded bonus.
function unansweredMinionPenalty(catalog: ContentCatalog, state: EncounterState): { amount: number; beatId: string } {
  // A Minion that arrived this Round is not an unanswered demand: it spawns in
  // the Incoming Row, so no player window could reach it before this step.
  // Only one that survived a full Round counts, which is what makes
  // acceleration earned rather than a second automatic tick.
  const alive = Object.values(state.board.entities).some(
    (entity) => entity.kind === 'minion' && (entity.spawnedRound ?? state.round) < state.round,
  )
  if (!alive) {
    return { amount: 0, beatId: '' }
  }
  let amount = 0
  let beatId = ''
  for (const programId of state.programIds) {
    const program = catalog.programs[programId]
    if (!program) {
      continue
    }
    for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
      if (beat.kind === 'spawn_minions' && beat.escalation_if_unanswered > amount) {
        amount = beat.escalation_if_unanswered
        beatId = beat.id
      }
    }
  }
  return { amount, beatId }
}

// The Round-end Escalation step: the automatic tick once it has begun, then
// acceleration for any demand still standing. Acceleration is live from Round
// 1 — that is what lets an ignored demand pull the collapse forward.
export function escalationActionsForRoundEnd(catalog: ContentCatalog, state: EncounterState): EncounterActionInput[] {
  const actions: EncounterActionInput[] = []
  if (state.round >= state.escalationStartRound) {
    actions.push({ kind: 'gain_escalation', sourceId: ENCOUNTER_SOURCE, amount: 1, reason: 'automatic_tick', beatId: '' })
  }
  const penalty = unansweredMinionPenalty(catalog, state)
  if (penalty.amount > 0) {
    actions.push({ kind: 'gain_escalation', sourceId: ENCOUNTER_SOURCE, amount: penalty.amount, reason: 'unanswered_minions', beatId: penalty.beatId })
  }
  return actions
}
