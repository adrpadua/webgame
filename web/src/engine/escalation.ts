import type { ContentCatalog } from './content/catalog'
import type { EncounterActionInput } from './actions'
import { ENCOUNTER_SOURCE } from './actions'
import { hexDistance } from './hex'
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

// The demands a Beat can leave standing at a Round end, and how to tell.
// ADR 0027 shipped with one kind and called a general predicate "the second
// Boss's problem"; the second demand arrived first (D-041), so the shape is
// generalised rather than special-cased. Each entry pairs a Beat kind with the
// question its demand asks, and the price is always authored on the Beat.
const DEMANDS: {
  kind: string
  reason: string
  // Where the price is read from, and the two cases are genuinely different.
  // `pool`: the demand's standing outlives the Beat that created it — a Minion
  // is on the board whichever program is up, so any priced Beat in the pool
  // sets its cost. `program`: the Beat creates the demand for its own Round
  // only, so the price must come from the program that actually ran. Charging
  // those from the pool bills the party on a Round the Timeline never showed
  // the Beat, which is ADR 0027's disclosure rule broken from the inside.
  scope: 'pool' | 'program'
  // `rangeTiles` is the authored reach of the Beat that set the price, so a
  // demand that asks a distance question asks the authored one. A demand with
  // no distance in it simply ignores the argument.
  standing: (state: EncounterState, rangeTiles: number) => boolean
}[] = [
  {
    kind: 'spawn_minions',
    reason: 'unanswered_minions',
    scope: 'pool',
    // A Minion that arrived this Round is not an unanswered demand: it spawns
    // in the Incoming Row, so no player window could reach it before this step.
    // Only one that survived a full Round counts, which is what makes
    // acceleration earned rather than a second automatic tick.
    standing: (state) =>
      Object.values(state.board.entities).some(
        (entity) => entity.kind === 'minion' && (entity.spawnedRound ?? state.round) < state.round,
      ),
  },
  {
    kind: 'demand_proximity',
    reason: 'unanswered_proximity',
    scope: 'program',
    // Range camping, closed structurally rather than numerically. Standing out
    // of reach used to be a complete answer to everything except the Tank Hit,
    // because the only distance-punished Beat was a range-2 cone and the
    // Guarded Front's bonus made being close *safer*. Boss movement cannot fix
    // that — chasing a camper only pushes them onto the front. A demand that
    // being far *is* the failure of cannot be dodged by being far.
    standing: (state, rangeTiles) => {
      const boss = state.board.entities[state.bossId]
      if (!boss) {
        return false
      }
      return !Object.keys(state.heroes).some((heroId) => {
        const piece = state.board.entities[heroId]
        return piece !== undefined && hexDistance(piece.coords, boss.coords) <= rangeTiles
      })
    },
  },
]

// The authored terms of one demand: what it costs to leave standing, which Beat
// set that cost, and how far that Beat reaches. All three come off the same
// Beat, so the question a demand asks and the price it charges can never be
// read from different content.
function demandTerms(
  catalog: ContentCatalog,
  state: EncounterState,
  kind: string,
  scope: 'pool' | 'program',
): { amount: number; beatId: string; rangeTiles: number } {
  let amount = 0
  let beatId = ''
  let rangeTiles = 0
  const programIds = scope === 'pool' ? state.programIds : state.currentProgramId === null ? [] : [state.currentProgramId]
  for (const programId of programIds) {
    const program = catalog.programs[programId]
    if (!program) {
      continue
    }
    for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
      if (beat.kind === kind && beat.escalation_if_unanswered > amount) {
        amount = beat.escalation_if_unanswered
        beatId = beat.id
        rangeTiles = beat.range_tiles
      }
    }
  }
  return { amount, beatId, rangeTiles }
}

// The Round-end Escalation step: the automatic tick once it has begun, then
// acceleration for any demand still standing. Acceleration is live from Round
// 1 — that is what lets an ignored demand pull the collapse forward.
export function escalationActionsForRoundEnd(catalog: ContentCatalog, state: EncounterState): EncounterActionInput[] {
  const actions: EncounterActionInput[] = []
  if (state.round >= state.escalationStartRound) {
    actions.push({ kind: 'gain_escalation', sourceId: ENCOUNTER_SOURCE, amount: 1, reason: 'automatic_tick', beatId: '' })
  }
  for (const demand of DEMANDS) {
    // Terms first, then the question. The Beat that sets the price is also the
    // Beat that sets the reach, so asking before pricing would mean asking a
    // distance question with no authored distance to ask it about.
    const terms = demandTerms(catalog, state, demand.kind, demand.scope)
    if (terms.amount > 0 && demand.standing(state, terms.rangeTiles)) {
      actions.push({ kind: 'gain_escalation', sourceId: ENCOUNTER_SOURCE, amount: terms.amount, reason: demand.reason, beatId: terms.beatId })
    }
  }
  return actions
}
