import { createEncounterState } from './setup'
import type { ContentCatalog } from './content/catalog'

// How well can the best possible predictor guess next Round's Boss Program?
//
// This was built to check that ADR 0028's seeded order gave the Forecast Row
// something to disclose. The row is gone (ADR 0031), and the measurement it was
// built to justify is now the more important of the two: with nothing telling
// the player what is coming, this number *is* the learning curve.
//
// Read it as a band rather than a target. At `1` the order is a fixed rotation
// and a second run teaches nothing it did not already give away — memorisation,
// not mastery. At the uniform floor the order is noise, and no amount of play
// makes the next Round more knowable, so experience buys nothing either. The
// design wants the middle: enough structure that meeting a Boss repeatedly pays
// off, enough residue that it never becomes recitation.
//
// The number needs measuring rather than arguing because a bag of three
// programs is a short shuffle, and by the end of a cycle a player who has been
// paying attention knows exactly what is left.
//
// The estimate deliberately assumes **nothing** about how the order is
// generated. It groups real generated sequences by their observed prefix and
// asks what the modal continuation is worth — which is the Bayes-optimal
// accuracy given perfect memory of the fight so far. A metric that re-derived
// the bag rule would move with the implementation and could never catch the
// implementation being wrong; this one is measured against what the generator
// actually emits.

export interface RoundPredictability {
  // The Round being predicted, 1-based. Round 1 is excluded: it is pinned to the
  // authored opener, so naming it is recall, not prediction.
  round: number
  // Best-possible accuracy in [0, 1]. `1` means a perfect counter is never
  // wrong about this Round.
  accuracy: number
  // How many distinct histories reach this Round, and the smallest sample
  // behind any one of them. A tiny group inflates accuracy — one sample always
  // looks perfectly predictable — so this is reported rather than hidden.
  distinctHistories: number
  smallestHistory: number
}

export interface ProgramPredictability {
  perRound: RoundPredictability[]
  // Mean best-possible accuracy across the predictable Rounds. `1/n` would be
  // a pool drawn uniformly at random; `1` is a fixed rotation.
  meanAccuracy: number
  // Rounds a perfect counter is never wrong about.
  certainRounds: number
  // The floor under `meanAccuracy` for this pool size, for scale: a uniform
  // random draw from the pool.
  uniformBaseline: number
  // False when some history is too thinly sampled to trust the estimate.
  reliable: boolean
}

const MIN_HISTORY_SAMPLES = 10

export function programPredictability(
  catalog: ContentCatalog,
  encounterId: string,
  seeds = 2000,
): ProgramPredictability {
  const encounter = catalog.encounters[encounterId]
  const roundLimit = Math.max(encounter.round_limit, 1)
  const sequences: string[][] = []
  for (let seed = 1; seed <= seeds; seed += 1) {
    sequences.push(createEncounterState(catalog, encounterId, seed).programSequence)
  }

  const perRound: RoundPredictability[] = []
  // Position `index` is the program for Round `index + 1`, predicted from
  // Rounds 1..index. Start at 1 because Round 1 is authored, and stop at the
  // clock because no player ever sees past it.
  for (let index = 1; index < roundLimit; index += 1) {
    const byHistory = new Map<string, Map<string, number>>()
    for (const sequence of sequences) {
      if (sequence.length <= index) {
        continue
      }
      const history = sequence.slice(0, index).join('>')
      const next = sequence[index]
      const outcomes = byHistory.get(history) ?? new Map<string, number>()
      outcomes.set(next, (outcomes.get(next) ?? 0) + 1)
      byHistory.set(history, outcomes)
    }
    if (byHistory.size === 0) {
      continue
    }
    // Weighted by how often each history occurs, which is what summing the
    // modal counts and dividing by the total does.
    let correct = 0
    let total = 0
    let smallest = Number.POSITIVE_INFINITY
    for (const outcomes of byHistory.values()) {
      const counts = [...outcomes.values()]
      const groupTotal = counts.reduce((sum, count) => sum + count, 0)
      correct += Math.max(...counts)
      total += groupTotal
      smallest = Math.min(smallest, groupTotal)
    }
    perRound.push({
      round: index + 1,
      accuracy: correct / total,
      distinctHistories: byHistory.size,
      smallestHistory: smallest,
    })
  }

  const meanAccuracy =
    perRound.length === 0 ? 1 : perRound.reduce((sum, entry) => sum + entry.accuracy, 0) / perRound.length
  const poolSize = Math.max(encounter.boss_programs.length, 1)
  return {
    perRound,
    meanAccuracy,
    certainRounds: perRound.filter((entry) => entry.accuracy === 1).length,
    uniformBaseline: 1 / poolSize,
    reliable: perRound.every((entry) => entry.smallestHistory >= MIN_HISTORY_SAMPLES),
  }
}
