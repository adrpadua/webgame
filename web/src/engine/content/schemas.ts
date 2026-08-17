import { z } from 'zod'

// Zod schemas are the single definition of every content shape (ADR 0020).
// The JSON payloads under data/ are validated at load; TypeScript types are
// inferred from these schemas rather than written by hand.

export const axialSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
})

export const keywordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  // A Keyword that marks which Role a card belongs to rather than what it
  // does. Every card in a Hero's deck carries theirs, so it distinguishes
  // nothing between two cards in hand and the HUD leaves it off the glance
  // surfaces. It is still an ordinary Keyword to the rules: a Charge Modifier
  // may name it, and the Detail Popup still lists it.
  role_marker: z.boolean().default(false),
})

export const chargeModifierSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  keyword_id: z.string().default(''),
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']),
  amount_per_match: z.number().int().min(1),
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
  tags: z.array(z.string()).default([]),
  charge_modifiers: z.array(z.string()).default([]),
  // The status this card applies, if any (D-033). Where it lands comes from
  // `target_type`, which this finally makes load-bearing: `none` applies to
  // the firing Hero, `piece` to a selected Enemy, `board_slot` to an ally's
  // Top Card.
  applies_status: z.string().default(''),
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

// A Status Effect definition (D-033). Statuses were engine-only until now:
// Riposte Ready and Fortified were constructed in code at hardcoded moments.
// Authoring them here makes them shared vocabulary — one Sundered, with one
// title, one rules text, and one answer to whether it stacks.
export const statusSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  // Which side of the fight the payload is written for. The mechanism is the
  // same for both; only the fields that matter differ (D-032).
  applies_to: z.enum(['hero', 'enemy']),
  triggers: z.array(z.enum(['on_round_start', 'on_enter_hex', 'on_damage_taken', 'on_slot_fired'])).default([]),
  // Per-status rather than one global rule, because canon already holds both
  // behaviours: Riposte Ready never stacks, Fortified stacks additively.
  stacking: z.boolean().default(false),
  duration_rounds: z.number().int().min(1).default(1),
  // Enemy-facing payload (D-034). Two named fields rather than a general
  // effect list, following the ADR 0021 precedent.
  damage_taken_bonus: z.number().int().min(0).default(0),
  damage_dealt_penalty: z.number().int().min(0).default(0),
})

export const bossBeatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  kind: z.enum(['turn_toward_player', 'raking_claw', 'scorch_last_pattern', 'cinder_breath', 'brood_call', 'warning']),
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
  // supported, so today this rides `brood_call`.
  escalation_if_unanswered: z.number().int().min(0).default(0),
  duration_rounds: z.number().int().min(1).default(1),
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
  brood_spawn_candidates: z.array(axialSchema).default([]),
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
  z.object({ kind: z.literal('fire_slot'), sourceId: z.string(), slotIndex: z.number().int().min(0), targetId: z.string().optional() }),
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
export type StatusDefinition = z.infer<typeof statusSchema>
export type EscalationThreshold = z.infer<typeof escalationThresholdSchema>
export type BossBeat = z.infer<typeof bossBeatSchema>
export type BossProgram = z.infer<typeof bossProgramSchema>
export type EncounterDefinition = z.infer<typeof encounterSchema>
export type EvaluationDeck = z.infer<typeof evaluationDeckSchema>
export type ScenarioAction = z.infer<typeof scenarioActionSchema>
export type ScenarioStep = z.infer<typeof scenarioStepSchema>
export type Scenario = z.infer<typeof scenarioSchema>
