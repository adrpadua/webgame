import { z } from 'zod'
import { axialSchema } from './grammar'
import { hexDistance } from '../hex'
import type { ContentCatalog } from './schemas'

// The Encounter concept: the fight's authored terms — party seats, arena,
// clock, programs, thresholds — plus the evaluation deck that overrides its
// list, and every rule about them.

// One authored Escalation Threshold (ADR 0027). Values `1` through `4` carry
// effects; the wipe at `5` is a rule the engine owns, not authored content, so
// there is one authority for the end of the fight.
export const escalationThresholdSchema = z.object({
  value: z.number().int().min(1).max(4),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  boss_damage_bonus: z.number().int().min(0).default(0),
  extra_spawn_count: z.number().int().min(0).default(0),
  minion_damage_bonus: z.number().int().min(0).default(0),
  // Structural thresholds (D-031): hexes permanently Scorched when this
  // threshold is crossed, so escalation is felt as the arena closing rather
  // than as another damage number. Authored per hex and validated — no
  // authored hex may be adjacent to the Boss, or the Guarded Front itself
  // could burn and the Tank's own answer would become unreachable.
  scorch_hexes: z.array(axialSchema).default([]),
})

// A Phase Trigger is authored, never inferred: CONTEXT.md requires every one
// of them to be shown in the Encounter Briefing and tracked visibly, which is
// only possible if the condition is content. Both halves are optional and
// either one fires it — a health-only trigger never fires against a slow deck,
// and a round-only trigger never rewards a fast one (ADR 0023).
export const phaseTriggerSchema = z.object({
  boss_health_at_or_below: z.number().int().min(1).optional(),
  round_at_or_after: z.number().int().min(2).optional(),
})

export const deckEntrySchema = z.object({
  card: z.string().min(1),
  copies: z.number().int().min(1),
})

// One seat in the Party: which Hero fills it, and the two things the *fight*
// decides about them rather than the Hero definition does. Deck and Slot
// count stay on the Encounter for now because the solo slice authored them
// there; a per-seat deck is the increment that arrives with the second
// authored Hero, not this one.
export const partyMemberSchema = z.object({
  // The Hero in this seat, by id from data/heroes/ (ADR 0034).
  hero: z.string().min(1),
  start: axialSchema,
  // This seat's decklist. Empty falls back to the Encounter's `player_deck`,
  // which is what every solo Encounter authored before the Party existed and
  // what evaluation decks still override.
  //
  // A seat needs its own deck for a reason beyond convenience: a Hero's Role
  // is not stored anywhere, it is *read back* out of the Role Keyword every
  // card in their deck carries (ADR 0034). Two seats sharing one deck are
  // therefore two seats with the same Role, and a Boss Beat that selects by
  // Role could never tell them apart — a party of one Hero played twice.
  deck: z.array(z.object({ card: z.string().min(1), copies: z.number().int().min(1) })).default([]),
  // Whether this Hero's Signature Slot is installed at setup (D-064). The
  // teaching slice sets this false and keeps its two-Slot bar until its
  // scripted first turn learns the third; everywhere else the printed card
  // is part of what fielding the Hero means, so the default is true.
  fields_signature: z.boolean().default(true),
})

export const encounterSchema = z.object({
  id: z.string().min(1),
  // Whether the Encounter Picker offers this Encounter to players. Default
  // false, so an evaluation Encounter — a probe authored to be measured, not
  // played (D-076's measure-first-promote-later) — never ships by omission:
  // shipping is the explicit act, exactly like promoting a measured deck.
  player_facing: z.boolean().default(false),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  // The Party this Encounter fields, in order. CONTEXT.md defines a Party as
  // two to four Heroes; `1` stays legal because the teaching slice and the
  // Ashen Trial are solo, and a solo fight is a Party of one rather than a
  // different kind of Encounter — which is the whole point of making the
  // seat a list. The first seat is the primary Hero: the one the HUD's Hero
  // Frame reads (ADR 0033) and the one a solo Scenario replays.
  party: z.array(partyMemberSchema).min(1).max(4),
  // The Boss this Encounter fields, by id from data/bosses/ (ADR 0040).
  // Identity and health ride the Boss definition; the Encounter keeps what
  // the fight decides — where it starts, what it plays, how long it runs.
  // The id doubles as the board entity id, which is what keeps committed
  // Scenarios addressing `embermaw` byte-identical across the promotion.
  boss: z.string().min(1),
  round_limit: z.number().int().min(1),
  enrage_text: z.string().default('The Encounter Clock expired.'),
  board_radius: z.number().int().min(1).max(8),
  boss_start: axialSchema,
  slot_count: z.number().int().min(1).max(8),
  hand_refill_target: z.number().int().min(1).max(12),
  // What a Revived Hero comes back on, as a fraction of their maximum, rounded
  // up (ADR 0036). Authored rather than compiled in because it decides how
  // forgiving the whole fight is — the mistake `range_tiles` was before D-043,
  // where the number that set the difficulty lived where no designer could
  // reach it. `0.25` is CONTEXT.md's baseline.
  revive_health_fraction: z.number().min(0.05).max(1).default(0.25),
  player_deck: z.array(deckEntrySchema).min(1),
  boss_programs: z.array(z.string()).min(1),
  loop_boss_programs: z.boolean().default(true),
  // Phase II. Without both of these an Encounter has one phase and its
  // Programs loop unchanged to the Encounter Clock, which is what the
  // Ashen Trial did until ADR 0023.
  phase_trigger: phaseTriggerSchema.optional(),
  phase_two_programs: z.array(z.string()).default([]),
  phase_break_text: z.string().default(''),
  random_seed: z.number().int(),
  minion_spawn_candidates: z.array(axialSchema).default([]),
  escalation_thresholds: z.array(escalationThresholdSchema).default([]),
})

export const evaluationDeckSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  encounter: z.string().min(1),
  player_deck: z.array(deckEntrySchema).min(1),
})

export type EscalationThreshold = z.infer<typeof escalationThresholdSchema>
export type PartyMember = z.infer<typeof partyMemberSchema>
export type EncounterDefinition = z.infer<typeof encounterSchema>
export type EvaluationDeck = z.infer<typeof evaluationDeckSchema>

export function validateEncounters(catalog: ContentCatalog, encounterAt: (id: string) => string): void {
  for (const encounter of Object.values(catalog.encounters)) {
    // Every Hero the Party fields has to exist before the fight can start,
    // and the error names the Encounter file because that is the one being
    // edited when the reference breaks.
    if (!catalog.bosses[encounter.boss]) {
      throw new Error(`${encounterAt(encounter.id)} references unknown boss ${encounter.boss}`)
    }
    const seated = new Set<string>()
    for (const seat of encounter.party) {
      if (!catalog.heroes[seat.hero]) {
        throw new Error(`${encounterAt(encounter.id)} references unknown hero ${seat.hero}`)
      }
      // One Hero cannot hold two seats: the Party is keyed by Hero id
      // everywhere downstream — board entities, Counter hosts, Slot refs —
      // so a duplicate would be two seats quietly sharing one health pool.
      if (seated.has(seat.hero)) {
        throw new Error(`${encounterAt(encounter.id)} seats ${seat.hero} twice; one Hero holds one seat`)
      }
      seated.add(seat.hero)
      for (const entry of seat.deck) {
        if (!catalog.cards[entry.card]) {
          throw new Error(`${encounterAt(encounter.id)} seat ${seat.hero} references unknown card ${entry.card}`)
        }
        if (catalog.cards[entry.card].fixed) {
          throw new Error(`${encounterAt(encounter.id)} seat ${seat.hero} lists ${entry.card}, which is fixed; a Signature is never in the deck`)
        }
      }
    }
    // Two Heroes cannot open on the same hex. Occupancy is a board rule the
    // rest of the game enforces move by move; setup is the one place it could
    // be authored past.
    const starts = new Map<string, string>()
    for (const seat of encounter.party) {
      const key = `${seat.start.q},${seat.start.r}`
      const held = starts.get(key)
      if (held !== undefined) {
        throw new Error(
          `${encounterAt(encounter.id)} starts ${seat.hero} on (${seat.start.q}, ${seat.start.r}), where ${held} already stands`,
        )
      }
      starts.set(key, seat.hero)
    }
    for (const entry of encounter.player_deck) {
      if (!catalog.cards[entry.card]) {
        throw new Error(`${encounterAt(encounter.id)} deck references unknown card ${entry.card}`)
      }
      // A fixed card is never in the deck — it is never drawn and never
      // discarded, and a deck copy would be exactly the hand-charging route
      // D-064 closes.
      if (catalog.cards[entry.card].fixed) {
        throw new Error(`${encounterAt(encounter.id)} deck lists ${entry.card}, which is fixed; a Signature is never in the deck`)
      }
    }
    for (const programId of encounter.boss_programs) {
      if (!catalog.programs[programId]) {
        throw new Error(`${encounterAt(encounter.id)} references unknown Boss Program ${programId}`)
      }
    }
    for (const programId of encounter.phase_two_programs) {
      if (!catalog.programs[programId]) {
        throw new Error(`${encounterAt(encounter.id)} references unknown Phase II Boss Program ${programId}`)
      }
    }
    // The Guarded Front has to stay standable (D-031). A Scorched hex beside
    // the Boss burns the one tile the Tank's whole kit is written for, so
    // Escalation would remove the party's answer rather than raise the
    // question — the acceleration lesson in another form. Held for every
    // Encounter, because a new arena is exactly where the rule is easiest to
    // author past by accident.
    for (const threshold of encounter.escalation_thresholds) {
      for (const coords of threshold.scorch_hexes) {
        if (hexDistance(coords, encounter.boss_start) <= 1) {
          throw new Error(
            `${encounterAt(encounter.id)} threshold ${threshold.value} ("${threshold.title}") Scorches (${coords.q}, ${coords.r}), which is adjacent to the Boss at (${encounter.boss_start.q}, ${encounter.boss_start.r}) — the Guarded Front must stay standable`,
          )
        }
      }
    }
    // The Round-end step prices one demand per kind, taking the dearest priced
    // Beat in the pool and asking *its* question (`escalation.ts`). That is
    // fine while every priced Beat of a kind asks the same question, and a
    // silent drop the moment two disagree: two priced `place_counter` Beats
    // naming different Counters would leave the cheaper Counter authored with a
    // price and never billed, and two `demand_proximity` Beats at different
    // reaches would bill the party at a distance one of them never asked
    // about. Neither shows up as a failure — it shows up as a demand that
    // quietly does nothing, which is exactly the shape this pass was written to
    // stop shipping. Refuse the content instead.
    const pooled = [...encounter.boss_programs, ...encounter.phase_two_programs]
      .flatMap((programId) => catalog.programs[programId] ?? [])
      .flatMap((program) => [...program.instant_beats, ...program.incoming_beats])
      .filter((beat) => beat.escalation_if_unanswered > 0)
    for (const kind of new Set(pooled.map((beat) => beat.kind))) {
      const sameKind = pooled.filter((beat) => beat.kind === kind)
      for (const field of ['counter', 'range_tiles'] as const) {
        const asked = new Set(sameKind.map((beat) => beat[field]))
        if (asked.size > 1) {
          throw new Error(
            `${encounterAt(encounter.id)} prices ${sameKind.length} ${kind} Beats (${sameKind.map((beat) => beat.id).join(', ')}) that disagree on ${field} (${[...asked].join(', ')}); the Round-end step prices one ${kind} demand, so all of them must ask the same question`,
          )
        }
      }
    }
  }}

export function validateDecks(catalog: ContentCatalog): void {
  for (const deck of Object.values(catalog.decks)) {
    if (!catalog.encounters[deck.encounter]) {
      throw new Error(`Deck ${deck.id} references unknown encounter ${deck.encounter}`)
    }
    for (const entry of deck.player_deck) {
      if (!catalog.cards[entry.card]) {
        throw new Error(`Deck ${deck.id} references unknown card ${entry.card}`)
      }
    }
  }}

export function validateScenarios(catalog: ContentCatalog): void {
  for (const scenario of Object.values(catalog.scenarios)) {
    if (!catalog.encounters[scenario.encounter]) {
      throw new Error(`Scenario ${scenario.id} references unknown encounter ${scenario.encounter}`)
    }
  }}
