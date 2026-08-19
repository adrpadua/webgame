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

// What a Counter does while it is held, and when it does it (D-047). A
// Counter is inert on its own — a named, counted marker — and a Reader is the
// only thing that turns a count into an effect. The payload lives here rather
// than on the marker, so what a Counter *means* is decided by what reads it.
// That is the whole reason a marker is worth having: three cards may place
// Ash, and the cards that read Ash decide what Ash is worth.
export const counterReaderSchema = z.object({
  when: z.enum(['round_start', 'host_takes_damage', 'host_deals_damage', 'slot_fired']),
  // Narrows a damage Reader to blows carrying one Keyword (D-049): empty
  // answers every blow, `raid_hit` answers only a Minion's bite. This is the
  // Reader reading the *event* rather than the host — the fact stream already
  // carried these Keywords, and this is what lets content read them.
  event_keyword: z.string().default(''),
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']),
  // Signed, and applied once per Counter held: Sundered raises what its host
  // takes at `1`, Weakened lowers what its host deals at `-1`, and Fortified
  // banks Armor at `1` per Counter so the count *is* the stored Armor. Zero is
  // refused by the catalog rather than allowed as a Reader that does nothing.
  per: z.number().int().default(1),
})

// A Counter: identity, host, bounds, and what reads it. Counters replace the
// Status Effect definition entirely (D-047). The two named payload fields
// D-034 chose are gone — an Enemy-facing Counter is one whose Readers happen
// to fire on an Enemy's events, not a separate kind of thing with its own
// schema.
export const counterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  keywords: z.array(z.string()).default([]),
  // What holds this Counter. A combatant is the Boss, a Hero, or a Minion; a
  // `hex` is ground, which outlives whoever is standing on it; a `slot` is a
  // prepared Top Card, which is D-035's ally attachment finally reachable.
  // `encounter` is deliberately absent — Escalation is the encounter-wide
  // counter, and its band effects are not `per`-count modifiers (D-048).
  host: z.enum(['combatant', 'hex', 'slot']).default('combatant'),
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
  // These floor at 0, not 1, because 0 is what an omitted field means and a
  // Reader only uses the one its verb needs. The real rule — a `gate` without
  // `at_least`, a `scale` without `per`, a `spend` without `amount` is a
  // Reader that does nothing — is a catalog check, where it can name the card.
  // Enforcing it here instead made every default invalid, which no test caught
  // because every test supplied all three fields by hand and no authored card
  // used `reads` at all until Quench.
  at_least: z.number().int().min(0).default(0),
  per: z.number().int().default(0),
  amount: z.number().int().min(0).default(0),
  // A cost is paid before the Card's effects are computed and is not refunded
  // if they come to nothing; a resolution spend happens after. The difference
  // is visible whenever a Card both scales off a Counter and spends it.
  timing: z.enum(['cost', 'resolution']).default('cost'),
})

// A Signature's standing clause: a Grant, the mirror of a Counter Reader
// (D-064). It answers one event from the same closed `when` set, narrowed by
// the same `event_keyword` mechanism (D-049), and produces a Charge on the
// fixed Slot where a Reader produces a number. Gates follow the cardReader
// rule verbatim: a closed enumerated set, every gate must pass, and there is
// no boolean combination — the moment this wants `or`, what is being written
// is an interpreter.
export const signatureGrantSchema = z.object({
  when: z.enum(['round_start', 'host_takes_damage', 'host_deals_damage', 'slot_fired']),
  event_keyword: z.string().default(''),
  // The closed gate list. `health_loss_zero` is the perfect block —
  // mitigation fully answered the blow — and `guarded_front` is the Warden
  // sentence as a predicate. Both already exist as engine computations; a
  // Grant only exposes them (D-064).
  gates: z.array(z.enum(['health_loss_zero', 'guarded_front'])).default([]),
  grants_charge: z.number().int().min(1).default(1),
})

// What a fixed card does only when fired at its full Charge cap — ADR 0008's
// anticipated "class-specific full-charge mechanics", first exercised by the
// Riposte's Sundered rider (D-064 decision 13). The Counter lands on the
// Boss, following the card's Boss damage rather than its `target_type`, and
// lands after that damage resolves: the follow-through opens the wound; the
// rider's own hit does not benefit.
export const fullChargeSchema = z.object({
  places_counter: z.string().default(''),
  counter_amount: z.number().int().min(1).default(1),
})

export const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  speed: z.enum(['quick', 'slow', 'fast']),
  // A Signature card (D-064, ADR 0032): printed on a Hero, never in the deck,
  // never drawn, never replaceable, never discarded. Its Slot charges only
  // through the `standing` Grants below — hand cards physically cannot reach
  // it — and firing spends the whole stack while the card stays. Only a card
  // an Encounter names as its `signature_card` may set this.
  fixed: z.boolean().default(false),
  standing: z.array(signatureGrantSchema).default([]),
  full_charge: fullChargeSchema.default({ places_counter: '', counter_amount: 1 }),
  // What the Hero Frame calls this Signature's earned Charges (D-065):
  // Elian's are "Ripostes", Kessa's will be "Momentum". Empty falls back to
  // the card title. Presentation vocabulary only — the rules say Charges.
  resource_title: z.string().default(''),
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
  // `target_type`, which D-033 made load-bearing and D-047 leaves alone:
  // `none` places on the firing Hero, `piece` on a selected piece,
  // `board_slot` on a prepared Slot — solo, one of the firing Hero's own,
  // since D-035's ally has no seat at the table yet.
  places_counter: z.string().default(''),
  counter_amount: z.number().int().min(1).default(1),
  // What this card's damage is made of, so a Counter can answer it (D-049).
  // The party's damage was unkeyworded while only Boss Beats classified
  // theirs, which left "increase fire damage by 1" authorable in one
  // direction only.
  damage_keywords: z.array(z.string()).default([]),
  // What this card reads before and while it resolves (D-047).
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
  // A Minion's fuse (D-063). A Minion authoring a blast detonates on the
  // Incoming Row of the Round after it arrived, and the pair is authored here
  // rather than defaulted for the reason a Beat's reach is (D-043): how far a
  // blast reaches is the whole difference between one a step answers and one
  // it does not, and ADR 0020 puts that decision in `data/`.
  //
  // Both or neither, enforced in the catalog: damage with no radius is a blast
  // that hits nothing, and a radius with no damage is a fuse that does nothing.
  explode_damage: z.number().int().min(0).default(0),
  explode_radius: z.number().int().min(0).max(3).default(0),
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
    'place_counter',
  ]),
  answer_tags: z.array(z.string()).default([]),
  // What a `place_counter` Beat places, and where (D-051). `self` is the Boss
  // marking itself — pressure the party can see accruing and choose to spend
  // cards suppressing — and `hero` is the Boss marking the Party, which is the
  // half Counters were missing: they could mark the Boss and it could not mark
  // back.
  counter: z.string().default(''),
  counter_amount: z.number().int().min(1).default(1),
  counter_target: z.enum(['self', 'hero']).default('self'),
  // Consequence Tier (ADR 0031). It once set the earliest horizon a Beat could
  // appear in, which the Forecast Row's removal retired. What it sets now is
  // where a Beat may *open*: `severe` marks a Beat that can end a run, and no
  // phase's first program may carry one, because the opening Round is the one
  // nobody can have learned yet (D-036). Authored rather than derived, and
  // validated — see the ladder tests.
  consequence_tier: z.enum(['chip', 'structural', 'severe']).default('chip'),
  target_selector: z.string().default(''),
  // The Keywords this Beat's damage carries (D-049). Plural because "who it
  // is aimed at" and "what it is made of" are two axes: a blow can be a Tank
  // Hit *and* fire, and one string holding both would be the category error
  // the `kind` discriminator exists to prevent.
  damage_keywords: z.array(z.string()).default([]),
  damage: z.number().int().default(0),
  unguarded_bonus: z.number().int().min(0).default(0),
  // Escalation acceleration (ADR 0027): what it costs to leave this Beat's
  // demand standing at a Round end. Carried by any Beat kind the Escalation
  // step knows how to price — `spawn_minions`, `demand_proximity` and
  // `place_counter` today.
  escalation_if_unanswered: z.number().int().min(0).default(0),
  // How far this Beat reaches, in hexes. Authored rather than defaulted,
  // because reach is the whole difference between a Beat that footwork answers
  // and one it does not, and ADR 0020 puts that kind of decision in `data/`.
  //
  // It arrived late: `forward_cone` carried its reach as a default parameter on
  // `forwardCone` *and* as a second literal at the telegraph call site, and
  // `demand_proximity` carried its own as a bare `1` in the Escalation step.
  // Three constants for two Beats, none of them content, and the only place the
  // number appeared to a reader was inside a `rules_text` string.
  //
  // `targeted_hit` reads it too since D-062. It was deliberately rangeless
  // under D-017, which wanted a hit footwork could not answer; D-041 gave that
  // job to `demand_proximity`, which prices standing out of reach in Escalation
  // instead — so the claw was left as the one Beat whose reach was infinite for
  // a reason that had moved somewhere better.
  range_tiles: z.number().int().min(0).default(0),
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
  // The Hero's Signature (D-064): a `fixed: true` card installed as an
  // always-present third Slot at setup. Empty means the Hero fields no
  // Signature in this Encounter — the teaching slice keeps its two-Slot bar
  // until its script learns the third.
  signature_card: z.string().default(''),
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
export type SignatureGrant = z.infer<typeof signatureGrantSchema>
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
