import type { ContentCatalog } from './content/catalog'
import type { EncounterActionInput } from './actions'
import { ENCOUNTER_SOURCE } from './actions'
import { BEAT_REGISTRY } from './beats'
import { combatantRef, counterCount } from './counters'
import { hexDistance } from './hex'
import { livingHeroIds } from './downed'
import type { BossBeat } from './content/schemas'
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

// Everything authored on the Beat that set a demand's price. One record rather
// than a per-kind argument list, so a demand asks the question its own content
// authored — a distance demand reads `rangeTiles`, a Counter demand reads
// `counterId`, `counterTarget` and `threshold` — and simply ignores the fields
// it has no question about. The alternative, a union per kind, would buy type
// safety the table cannot use: `DEMANDS` is iterated, so every entry is reached
// through the same call site whatever its kind.
interface DemandTerms {
  amount: number
  beatId: string
  rangeTiles: number
  counterId: string
  counterTarget: 'self' | 'hero'
  threshold: number
}

// The demands a Beat can leave standing at a Round end, and how to tell.
// ADR 0027 shipped with one kind and called a general predicate "the second
// Boss's problem"; the second demand arrived first (D-041), so the shape is
// generalised rather than special-cased. Each entry pairs a Beat kind with the
// question its demand asks, and the price is always authored on the Beat.
const DEMANDS: {
  // Typed against the Beat-kind vocabulary, never a loose string: this table
  // matches by `beat.kind === kind`, so a stale entry after a kind rename
  // would not fail — the demand would simply never stand again and the party
  // would never be charged. The annotation makes the rename a compile error,
  // and the load guard below keeps this table and the Beat registry's demand
  // column agreeing both ways.
  kind: BossBeat['kind']
  reason: string
  // Where the price is read from, and the two cases are genuinely different.
  // `pool`: the demand's standing outlives the Beat that created it — a Minion
  // is on the board whichever program is up, so any priced Beat in the pool
  // sets its cost. `program`: the Beat creates the demand for its own Round
  // only, so the price must come from the program that actually ran. Charging
  // those from the pool bills the party on a Round the Timeline never showed
  // the Beat, which is ADR 0027's disclosure rule broken from the inside.
  scope: 'pool' | 'program'
  standing: (state: EncounterState, terms: DemandTerms) => boolean
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
    standing: (state, { rangeTiles }) => {
      const boss = state.board.entities[state.bossId]
      if (!boss) {
        return false
      }
      // Only a living Hero answers the demand (ADR 0036). A Downed body is
      // still on the board and still occupies its hex, so without this a
      // Party could park a corpse beside the Boss and dodge this charge for
      // the rest of the fight — being far is the failure being priced, and a
      // body is not standing anywhere.
      return !livingHeroIds(state).some((heroId) => {
        const piece = state.board.entities[heroId]
        return piece !== undefined && hexDistance(piece.coords, boss.coords) <= rangeTiles
      })
    },
  },
  {
    kind: 'place_counter',
    reason: 'unanswered_counter',
    // `pool`, for the same reason a Minion is: a Counter with no clock sits on
    // its host whichever program is up, so it is standing on the board rather
    // than belonging to the Round that placed it.
    scope: 'pool',
    // Priced at the cap, not at the first stack. A Counter the party must
    // answer every single Round is a tax, not a decision — and it would need a
    // grace Round besides, because a Counter placed in the Incoming Row has no
    // player window before the Round-end step. Pricing the cap gives the slack
    // for free: Heat can be ignored for several Rounds and then cannot, which
    // is a tempo decision rather than an upkeep. It also makes the Counter's
    // authored `max` load-bearing instead of decorative.
    standing: (state, { counterId, counterTarget, threshold }) => {
      if (counterId === '' || threshold < 1) {
        return false
      }
      // Asked where the Beat actually places it. A Boss marking itself and a
      // Boss marking the Party are the same mechanic pointed opposite ways
      // (D-051), and reading only the Boss would have priced half of it — a
      // Counter piled onto a Hero would sit at its cap unanswered and cost
      // nothing.
      const hosts =
        counterTarget === 'hero' ? Object.keys(state.heroes).map(combatantRef) : [combatantRef(state.bossId)]
      return hosts.some((ref) => counterCount(state, ref, counterId) >= threshold)
    },
  },
]

// Completeness, both ways, at module load — the registry discipline (ADR
// 0041). Every Beat kind whose registry row declares a demand has its
// standing question here, at the declared scope; and no entry here asks a
// question the registry does not declare. Guarded rather than remembered,
// because a demand-carrying kind this table forgot would never charge and
// nothing else would notice.
for (const entry of DEMANDS) {
  if (BEAT_REGISTRY[entry.kind].demand !== entry.scope) {
    throw new Error(`DEMANDS prices '${entry.kind}' from the ${entry.scope}, but the Beat registry declares ${String(BEAT_REGISTRY[entry.kind].demand)}`)
  }
}
for (const [kind, row] of Object.entries(BEAT_REGISTRY)) {
  if (row.demand !== null && !DEMANDS.some((entry) => entry.kind === kind)) {
    throw new Error(`The Beat registry declares a demand for '${kind}', but DEMANDS has no standing question for it`)
  }
}

// The authored terms of one demand: what it costs to leave standing, which Beat
// set that cost, and everything that Beat says about the question being asked.
// All of it comes off the same Beat, so the question a demand asks and the
// price it charges can never be read from different content.
//
// The Counter threshold is the one term not authored on the Beat, because it
// is not the Beat's to set: the cap belongs to the Counter, and a Beat that
// could name its own threshold could name one the Counter can never reach.
// Pricing the cap also gives the demand its grace for free — a Counter placed
// in the Incoming Row has no player window before this step, so charging the
// first stack would be an upkeep tax rather than a decision.
function demandTerms(catalog: ContentCatalog, state: EncounterState, kind: BossBeat['kind'], scope: 'pool' | 'program'): DemandTerms {
  const terms: DemandTerms = { amount: 0, beatId: '', rangeTiles: 0, counterId: '', counterTarget: 'self', threshold: 0 }
  const programIds = scope === 'pool' ? state.programIds : state.currentProgramId === null ? [] : [state.currentProgramId]
  for (const programId of programIds) {
    const program = catalog.programs[programId]
    if (!program) {
      continue
    }
    for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
      if (beat.kind === kind && beat.escalation_if_unanswered > terms.amount) {
        terms.amount = beat.escalation_if_unanswered
        terms.beatId = beat.id
        terms.rangeTiles = beat.range_tiles
        terms.counterId = beat.counter
        terms.counterTarget = beat.counter_target
        terms.threshold = catalog.counters[beat.counter]?.max ?? 0
      }
    }
  }
  return terms
}

// What one unanswered Minion costs, and which Beat set that cost — the same
// pool lookup the Round-end step uses, exposed because a Minion with a fuse
// (D-063) is billed where it goes off rather than where it stands.
//
// A Whelp that reaches its fuse is a Whelp the party failed to answer, so it
// carries the price its spawning Beat authored. Priced per Minion rather than
// once per Round: the Round-end predicate could only ask whether *any* demand
// stood, and clearing one Whelp of two earned nothing under it. Here the
// answer is proportional — half the brood killed is half the acceleration.
export function minionDemandTerms(catalog: ContentCatalog, state: EncounterState): { amount: number; beatId: string } {
  const terms = demandTerms(catalog, state, 'spawn_minions', 'pool')
  return { amount: terms.amount, beatId: terms.beatId }
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
    if (terms.amount > 0 && demand.standing(state, terms)) {
      actions.push({ kind: 'gain_escalation', sourceId: ENCOUNTER_SOURCE, amount: terms.amount, reason: demand.reason, beatId: terms.beatId })
    }
  }
  return actions
}
