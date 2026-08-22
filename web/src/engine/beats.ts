import type { BossBeat } from './content/schemas'

// The Boss Beat kind vocabulary, as one table — the `EVENT_REGISTRY` shape
// (ADR 0041) applied to the other closed kind set the engine dispatches on.
// The facts a kind asserts about itself live here, once: whether it reaches
// (and so must author `range_tiles`), whether it moves without an allowance
// to spend, and whether leaving it unanswered is a priced demand — and from
// which scope that price is read. The consumers stay where they are — the
// catalog validates with these facts, the timeline resolves the kinds, the
// Escalation step asks its standing questions — but none of them re-declares
// the vocabulary: the Record over `BossBeat['kind']` refuses to compile until
// a new kind declares its row, which is what "no silent fallthrough" means at
// authoring time.

export type DemandScope = 'pool' | 'program'

interface BeatKindRow {
  // A reaching kind asserts a distance and must author `range_tiles` — the
  // membership that was `RANGED_BEAT_KINDS` (D-062, D-073).
  reaches: boolean
  // A kind whose only effect is the move spends no allowance and carries a
  // movement clause by identity — `advance_toward_player`'s clause in the old
  // `beatMoves` predicate (D-074, D-079).
  movesWithoutAllowance: boolean
  // Leaving this kind unanswered is a demand (ADR 0027, D-041), priced from
  // the program pool or from the running program only. The Escalation step's
  // `DEMANDS` table asks each demand's standing question; a module-load guard
  // there keeps that table and this column agreeing both ways.
  demand: DemandScope | null
}

export const BEAT_REGISTRY: Record<BossBeat['kind'], BeatKindRow> = {
  turn_toward_player: { reaches: false, movesWithoutAllowance: false, demand: null },
  advance_toward_player: { reaches: false, movesWithoutAllowance: true, demand: null },
  demand_proximity: { reaches: true, movesWithoutAllowance: false, demand: 'program' },
  targeted_hit: { reaches: true, movesWithoutAllowance: false, demand: null },
  hazard_last_impact: { reaches: false, movesWithoutAllowance: false, demand: null },
  forward_cone: { reaches: true, movesWithoutAllowance: false, demand: null },
  spawn_minions: { reaches: false, movesWithoutAllowance: false, demand: 'pool' },
  place_counter: { reaches: false, movesWithoutAllowance: false, demand: 'pool' },
}

// Why *this* Beat needs a reach, named rather than counted so the authoring
// error can say which clause asked for one — the same shape `cardReachingEffects`
// takes on the card side (D-073).
//
// The list is longer than the registry's `reaches` column because one of the
// two reasons is a field rather than a kind: a `place_counter` reaches only
// when it is aimed at a Hero, which a kind column could not express.
//
// A movement clause used to be a third reason, on the grounds that the mover has
// to know how close is close enough. It is not a reach — it is a Standoff, and
// since D-079 it has its own field. The tell was `advance_toward_player`, whose
// only effect is the move: it reaches nothing whatsoever and this function
// demanded a reach off it anyway.
export function beatReachReasons(beat: BossBeat): string[] {
  const reasons: string[] = []
  if (BEAT_REGISTRY[beat.kind].reaches) {
    reasons.push(`a ${beat.kind}`)
  }
  if (beat.kind === 'place_counter' && beat.counter_target === 'hero') {
    reasons.push('marking a Hero')
  }
  return reasons
}

// A Beat carries a movement clause when it has an allowance to spend, or when
// it teleports — which spends nothing and is therefore the one movement a
// distance of zero does not rule out.
export function beatMoves(beat: BossBeat): boolean {
  return beat.move_tiles > 0 || beat.traversal === 'teleport' || BEAT_REGISTRY[beat.kind].movesWithoutAllowance
}
