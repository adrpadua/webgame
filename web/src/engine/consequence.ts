import type { BossBeat, BossProgram } from './content/schemas'

// Consequence Tiers, and what a program asks for.
//
// This module used to be `forecast.ts` and its main export was the Forecast Row
// — next Round's program shown a Round early. That row is gone (ADR 0031). What
// survives is the vocabulary it was built on, because the tier is still doing
// work that has nothing to do with disclosure.
//
// ADR 0026 said the tier ladder and the row "stand or fall together". Half of
// that is right. The disclosure half falls: `Severe` no longer means "must
// appear in the Forecast Row first", because there is no such row. The fairness
// half survives and matters more than before — the first program of every phase
// carries no `Severe` Beat (D-036), so the one Round nobody can have learned
// yet cannot be the one that ends the run. Under learn-by-playing that is not a
// nicety; it is the rule that makes the first attempt teach instead of just
// kill.

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

// The union of a program's answer tags, in first-appearance order across
// Instant then Incoming: what kind of answer this Round wants. Read by the
// authoring tests that keep the three Phase I programs asking different
// questions (D-036) — a distinctness the player now has to notice by playing
// rather than by reading it off a row.
export function programAnswerTags(program: BossProgram): string[] {
  const tags: string[] = []
  for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
    for (const tag of beat.answer_tags) {
      if (!tags.includes(tag)) {
        tags.push(tag)
      }
    }
  }
  return tags
}
