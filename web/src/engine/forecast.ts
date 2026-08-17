import type { ContentCatalog } from './content/catalog'
import type { BossBeat, BossProgram } from './content/schemas'
import type { EncounterState } from './types'

export type ConsequenceTier = BossBeat['consequence_tier']

const TIER_ORDER: Record<ConsequenceTier, number> = { chip: 0, structural: 1, severe: 2 }

export function highestTier(program: BossProgram): ConsequenceTier {
  let highest: ConsequenceTier = 'chip'
  for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
    if (TIER_ORDER[beat.consequence_tier] > TIER_ORDER[highest]) {
      highest = beat.consequence_tier
    }
  }
  return highest
}

// The union of a program's counter tags, in first-appearance order across
// Instant then Incoming: what kind of answer the next Round will want.
export function programCounterTags(program: BossProgram): string[] {
  const tags: string[] = []
  for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
    for (const tag of beat.counter_tags) {
      if (!tags.includes(tag)) {
        tags.push(tag)
      }
    }
  }
  return tags
}

// The Boss Program the next Round will run, without mutating anything —
// `advanceProgram` owns the real move at `round_start`.
// A plain lookahead into the resolved sequence. This is the whole reason the
// order is rolled at setup (D-037): reading one step ahead has to be a read,
// not a roll, or the Forecast Row would be resolving randomness a Round before
// the window that answers it (ADR 0025).
export function nextProgramId(state: EncounterState): string | null {
  return state.programSequence[state.programIndex + 1] ?? null
}

export interface Forecast {
  programId: string
  title: string
  // Family level only: what kind of problem is developing, never its
  // parameters. Targets, magnitudes, and hexes belong to the Incoming and
  // Instant rows (ADR 0026).
  counterTags: string[]
  tier: ConsequenceTier
  rulesText: string
}

// The Forecast Row projection (D-021, ADR 0026): next Round's whole Boss
// Program at family level. A Forecast never resolves — it is next Round's
// program shown a Round early, not a fourth resolution step — so this is a
// pure read, the same shape as `minionIntents`.
//
// Round 1 is deliberately not forecast: at the pull there is no earlier Round
// to have shown it, which is why a first program may carry no `severe` Beat.
// The Encounter Briefing covers what the Boss can do before the fight; the
// Forecast Row covers when.
export function forecast(catalog: ContentCatalog, state: EncounterState): Forecast | null {
  if (!state.active) {
    return null
  }
  const programId = nextProgramId(state)
  if (programId === null) {
    return null
  }
  const program = catalog.programs[programId]
  if (!program) {
    return null
  }
  return {
    programId,
    title: program.title,
    counterTags: programCounterTags(program),
    tier: highestTier(program),
    rulesText: program.rules_text,
  }
}
