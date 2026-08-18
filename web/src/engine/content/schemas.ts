import { z } from 'zod'

// Zod schemas are the single definition of every content shape (ADR 0020).
// The JSON payloads under data/ are validated at load; TypeScript types are
// inferred from these schemas rather than written by hand.

export const axialSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
})

// The one tag namespace. Everything taggable joins here — card tags, the Role
// a Beat selects, the kind of damage a Beat deals, the answers a Program
// demands — so a pivot can be written against any of them and the validator
// can check every reference. Keywords carry no behaviour and never will: a
// Keyword is a join key, and the moment one grows a mechanical field the
// payload is welded to the marker again.
export const keywordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  // One namespace lets anything join on anything; the discriminator is what
  // still catches a category error. `damage_classification: "guard"` is
  // spelled correctly and remains nonsense, and only `kind` can say so.
  //
  // `role`       — the Role a card belongs to, and what a Beat may select.
  // `trait`      — what a card does; the axis a Charge Modifier matches on.
  // `damage_type`— what kind of blow a damage action is.
  // `answer`     — the response a Boss Program demands, shown in the Forecast.
  //
  // A Role Keyword replaces the old `role_marker` flag: every card in a Hero's
  // deck carries their Role, so it distinguishes nothing between two cards in
  // hand and the glance surfaces leave it off. That is a consequence of being
  // a Role, not a separate fact to keep in sync.
  kind: z.enum(['role', 'trait', 'damage_type', 'answer']),
})

export const chargeModifierSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  keyword_id: z.string().default(''),
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']),
  amount_per_match: z.number().int().min(1),
})

// What a Counter does while it is held, and when it does it (D-045). A
// Counter is inert on its own — a named, counted marker — and a Reader is the
// only thing that turns a count into an effect. The payload lives here rather
// than on the marker, so what a Counter *means* is decided by what reads it.
// That is the whole reason a marker is worth having: three cards may place
// Ash, and the cards that read Ash decide what Ash is worth.
export const counterReaderSchema = z.object({
  when: z.enum(['round_start', 'host_takes_damage', 'host_deals_damage', 'slot_fired']),
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']),
  // Signed, and applied once per Counter held: Sundered raises what its host
  // takes at `1`, Weakened lowers what its host deals at `-1`, and Fortified
  // banks Armor at `1` per Counter so the count *is* the stored Armor. Zero is
  // refused by the catalog rather than allowed as a Reader that does nothing.
  per: z.number().int().default(1),
})

// A Counter: identity, host, bounds, and what reads it. Counters replace the
// Status Effect definition (D-045). The two named payload fields D-034 chose
// are gone — an Enemy-facing Counter is one whose Readers happen to fire on
// an Enemy's events, not a separate kind of thing with its own schema.
export const counterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  keywords: z.array(z.string()).default([]),
  // Phase 1 hosts Counters on combatants only. `hex`, `slot`, and `encounter`
  // are sketched and unbuilt, so authoring them would be a promise the rules
  // do not keep.
  host: z.literal('combatant').default('combatant'),
  // The stacking rule, as a number. `1` is the old non-stacking behaviour: a
  // second placement is refused rather than refreshing. Anything higher
  // accumulates, which is how Fortified's additive stacking (D-019) survives
  // without a `stacking` flag.
  max: z.number().int().min(1).default(1),
  // `0` means no clock — the Counter sits until something spends it. That is
  // the axis a duration cannot express, and the more interesting one.
  duration_rounds: z.number().int().min(0).default(0),
  readers: z.array(counterReaderSchema).default([]),
})

// What a Card does with Counters when it fires. Three verbs, and no way to
// combine them with boolean logic: every `gate` has to pass, and that is the
// entire grammar. The moment this wants `or`, what is being written is an
// interpreter, and the mechanic belongs in engine code instead — the escape
// hatch a Beat kind already provides.
export const cardReaderSchema = z.object({
  // gate:  refuse the fire unless the count qualifies.
  // scale: add `per` to an effect for each Counter held.
  // spend: remove Counters.
  verb: z.enum(['gate', 'scale', 'spend']),
  // Exactly one of these names what is read. `counter_keyword` matches every
  // Counter carrying that Keyword, which is the Charge Modifier's
  // match-by-keyword generalised off the Charge Stack.
  counter: z.string().default(''),
  counter_keyword: z.string().default(''),
  // A closed set of subjects, never a path expression. Phase 1 reads the
  // firing Hero or the Card's chosen target and nothing else.
  on: z.enum(['self', 'target']).default('target'),
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']).default('target_damage'),
  at_least: z.number().int().min(1).default(0),
  per: z.number().int().default(0),
  amount: z.number().int().min(1).default(0),
  // A cost is paid before the Card's effects are computed and is not refunded
  // if they come to nothing; a resolution spend happens after. The difference
  // is visible whenever a Card both scales off a Counter and spends it.
  timing: z.enum(['cost', 'resolution']).default('cost'),
})

export const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  speed: z.enum(['quick', 'slow', 'fast']),
  max_charge: z.number().int().min(0).default(2),
  target_type: z.enum(['none', 'hex', 'board_slot', 'piece']).default('none'),
  armor_delta: z.number().int().default(0),
  armor_next_round: z.number().int().min(0).default(0),
  healing: z.number().int().default(0),
  boss_damage: z.number().int().default(0),
  range_tiles: z.number().int().default(0),
  damage: z.number().int().default(0),
  draw_count: z.number().int().min(0).max(3).default(0),
  burst_radius: z.number().int().min(0).default(0),
  push_tiles: z.number().int().min(0).default(0),
  pull_tiles: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  charge_modifiers: z.array(z.string()).default([]),
  // The Counter this card places, if any. Where it lands comes from
  // `target_type`, which D-033 made load-bearing and D-045 leaves alone:
  // `none` places on the firing Hero, `piece` on a selected Enemy,
  // `board_slot` on an ally's Top Card (canon, unbuilt — D-035).
  places_counter: z.string().default(''),
  counter_amount: z.number().int().min(1).default(1),
  // What this card reads before and while it resolves (D-045).
  reads: z.array(cardReaderSchema).default([]),
})

export const hazardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  duration_rounds: z.number().int().min(1).default(1),
  enter_damage: z.number().int().min(0).default(0),
  blocks_voluntary_movement: z.boolean().default(false),
})

export const minionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  max_health: z.number().int().min(1),
  attack_damage: z.number().int().min(0).default(0),
})

export const bossBeatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  // Beat kinds name the mechanic, never one Boss's flavour for it. `title` and
  // `rules_text` carry the flavour, and the parameters a Boss varies —
  // `hazard`, `minion`, `damage` — are authored fields, so a kind that named
  // Embermaw's version of the mechanic was duplicating a field it could not
  // keep in sync: nothing stopped a frost Boss authoring `hazard: "frozen"` on
  // a Beat kind called `cinder_breath`.
  kind: z.enum([
    'turn_toward_player',
    'advance_toward_player',
    'demand_proximity',
    'targeted_hit',
    'hazard_last_impact',
    'forward_cone',
    'spawn_minions',
    'warning',
  ]),
  counter_tags: z.array(z.string()).default([]),
  // Consequence Tier (ADR 0026): sets the earliest horizon this Beat may
  // appear in. `chip` anywhere, `structural` no later than Incoming, `severe`
  // in the Forecast Row first. Authored rather than derived, and validated —
  // see the ladder tests.
  consequence_tier: z.enum(['chip', 'structural', 'severe']).default('chip'),
  target_selector: z.string().default(''),
  damage_classification: z.string().default(''),
  damage: z.number().int().default(0),
  unguarded_bonus: z.number().int().min(0).default(0),
  // Escalation acceleration (ADR 0027): what it costs to leave this Beat's
  // demand standing at a Round end. Only the living-Minion demand is
  // supported, so today this rides `spawn_minions`.
  escalation_if_unanswered: z.number().int().min(0).default(0),
  // How far an `advance_toward_player` Beat closes. Distance is authored because
  // it is the Boss's counter-pressure against standing out of reach, and how
  // hard that pressure bites is a per-Boss identity question (D-041).
  move_tiles: z.number().int().min(0).default(0),
  duration_rounds: z.number().int().min(1).default(1),
  // A permanent Hazard survives the Round boundary (D-039). This is how a Beat
  // writes to the arena for good, which is what makes mitigation protect
  // standing room instead of only Health — the currency that was never the
  // binding one. `duration_rounds` is ignored when this is set.
  permanent: z.boolean().default(false),
  hazard: z.string().optional(),
  minion: z.string().optional(),
  count: z.number().int().min(1).max(12).default(2),
})

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

export const bossProgramSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  instant_beats: z.array(bossBeatSchema),
  incoming_beats: z.array(bossBeatSchema),
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

export const encounterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  primary_hero_id: z.string().min(1),
  primary_hero_title: z.string().min(1),
  boss_id: z.string().min(1),
  boss_title: z.string().min(1),
  round_limit: z.number().int().min(1),
  enrage_text: z.string().default('The Encounter Clock expired.'),
  board_radius: z.number().int().min(1).max(8),
  player_start: axialSchema,
  boss_start: axialSchema,
  player_health: z.number().int().min(1),
  boss_health: z.number().int().min(1),
  slot_count: z.number().int().min(1).max(8),
  hand_refill_target: z.number().int().min(1).max(12),
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

// The player-submitted action subset a Scenario may carry. Generated actions
// (boss beats, damage, hazards, bookkeeping) are re-derived by the replay.
export const scenarioActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('load_slot'), sourceId: z.string(), slotIndex: z.number().int().min(0), cardInstanceId: z.string() }),
  z.object({ kind: z.literal('charge_slot'), sourceId: z.string(), slotIndex: z.number().int().min(0), cardInstanceId: z.string() }),
  z.object({
    kind: z.literal('fire_slot'),
    sourceId: z.string(),
    slotIndex: z.number().int().min(0),
    targetId: z.string().optional(),
    targetHex: axialSchema.optional(),
  }),
  z.object({ kind: z.literal('move_hero'), sourceId: z.string(), destination: axialSchema, cardInstanceId: z.string() }),
  z.object({ kind: z.literal('discard_for_stamina'), sourceId: z.string(), cardInstanceId: z.string() }),
])

export const scenarioStepSchema = z.union([
  z.object({ advance: z.literal(true) }),
  z.object({ action: scenarioActionSchema }),
])

// A Scenario is a named, versioned sequence of Encounter actions replayed
// from a seeded initial state — never a state snapshot.
export const scenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.number().int().min(1),
  description: z.string().default(''),
  encounter: z.string().min(1),
  seed: z.number().int(),
  steps: z.array(scenarioStepSchema),
})

export type Keyword = z.infer<typeof keywordSchema>
export type ChargeModifier = z.infer<typeof chargeModifierSchema>
export type Card = z.infer<typeof cardSchema>
export type Hazard = z.infer<typeof hazardSchema>
export type Minion = z.infer<typeof minionSchema>
export type CounterDefinition = z.infer<typeof counterSchema>
export type CounterReader = z.infer<typeof counterReaderSchema>
export type CardReader = z.infer<typeof cardReaderSchema>
export type EscalationThreshold = z.infer<typeof escalationThresholdSchema>
export type BossBeat = z.infer<typeof bossBeatSchema>
export type BossProgram = z.infer<typeof bossProgramSchema>
export type EncounterDefinition = z.infer<typeof encounterSchema>
export type EvaluationDeck = z.infer<typeof evaluationDeckSchema>
export type ScenarioAction = z.infer<typeof scenarioActionSchema>
export type ScenarioStep = z.infer<typeof scenarioStepSchema>
export type Scenario = z.infer<typeof scenarioSchema>
