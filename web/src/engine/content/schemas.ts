import { z } from 'zod'
import { PLAYER_COMMAND_KINDS } from '../actions'
import { DIMINISHED_ACTIONS } from '../downed'
import { axialSchema } from './grammar'
import type { Card } from './card'
import type { ChargeModifier } from './card'
import type { CounterDefinition } from './counterDef'
import type { Minion } from './minionDef'
import type { BossProgram } from './program'
import type { Hero } from './hero'
import type { EncounterDefinition, EvaluationDeck } from './encounter'

// Zod schemas are the single definition of every content shape (ADR 0020) —
// and since the concept split (engine-deepening candidate 3) each concept's
// schema lives WITH its cross-field rules and derived properties in its own
// module: `card.ts`, `counterDef.ts`, `minionDef.ts`, `program.ts`,
// `hero.ts`, `encounter.ts`, on the shared primitives in `grammar.ts`. This
// file keeps two jobs: the simple shapes with no rules of their own
// (Keyword, Boss, Hazard) plus the Scenario command seam, and the
// compatibility surface — every name that has ever been imported from here
// is re-exported below, so a concept moving house never breaks a caller.

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

// A Boss as first-class authored content, the same promotion Heroes got in
// ADR 0034 and for the same trigger: three Encounters now field Embermaw with
// hand-kept copies of its title and health, and the traversal probe (D-076)
// only stays comparable to the shipped fight while those copies agree — an
// agreement a test was holding by hand. What a Boss *is* lives here; what the
// fight decides — start hex, Programs, thresholds, the clock — stays on the
// Encounter. Its substance still lives in its Programs: this file is identity
// and the health pool, nothing more, until a Boss needs more.
export const bossSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  max_health: z.number().int().min(1),
})

export const hazardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  duration_rounds: z.number().int().min(1).default(1),
  enter_damage: z.number().int().min(0).default(0),
  // The two questions ground answers about being entered, and the axis between
  // them is **physics versus choice** (D-075).
  //
  // `blocks_voluntary_movement` is choice: a Hero may not *elect* to walk here.
  // It is fire you would not step into, so a shove can still put you on it.
  // `impassable` is physics: nothing enters, by any means — a paid step, a
  // traversal, or a Push. Ground can be both, either, or neither.
  //
  // The axis started out as Hero-versus-Enemy (D-074), which produced a rule
  // that read as a bug the first time anyone authored a wall: ground marked
  // impassable stopped a Whelp and Embermaw and let the Tank stroll through it.
  // Who is moving was never the question.
  blocks_voluntary_movement: z.boolean().default(false),
  impassable: z.boolean().default(false),
  // Whether this ground burns the side that laid it — authored per Hazard
  // rather than decided by the engine (D-074), because which terrain stops a
  // Boss and which terrain burns it is a per-encounter design decision, the
  // kind a fight can be built around.
  //
  // D-042 made this an engine rule — an Enemy was immune to its own side's
  // Hazards, full stop — which is the right default and the wrong place for
  // it: Embermaw walking
  // through its own fire is an arbitrary decision about Embermaw, not a fact
  // about fire. Authored, a later Boss can be built to be lured onto its own
  // ground, which is a fight the engine rule made unauthorable.
  damages_source_team: z.boolean().default(false),
})

export type Keyword = z.infer<typeof keywordSchema>
export type Boss = z.infer<typeof bossSchema>
export type Hazard = z.infer<typeof hazardSchema>

// The player-submitted command subset a Scenario may carry — the external
// command seam (Priority 1 of the engine-hardening handoff). Generated
// actions (boss beats, damage, hazards, bookkeeping) are re-derived by the
// replay, so a System Action here would be a client authoring consequences;
// the schema structurally refuses it, and the guard below keeps this list
// equal to `PLAYER_COMMAND_KINDS` so a new command cannot be added to one
// surface and forgotten on the other.
export const scenarioActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('load_slot'), sourceId: z.string(), slotIndex: z.number().int().min(0), cardInstanceId: z.string() }),
  z.object({ kind: z.literal('charge_slot'), sourceId: z.string(), slotIndex: z.number().int().min(0), cardInstanceId: z.string() }),
  z.object({
    kind: z.literal('fire_slot'),
    sourceId: z.string(),
    slotIndex: z.number().int().min(0),
    targetId: z.string().optional(),
    targetHex: axialSchema.optional(),
    targetSlot: z.object({ heroId: z.string(), slotIndex: z.number().int().min(0) }).optional(),
  }),
  z.object({ kind: z.literal('move_hero'), sourceId: z.string(), destination: axialSchema, cardInstanceId: z.string() }),
  z.object({ kind: z.literal('discard_for_stamina'), sourceId: z.string(), cardInstanceId: z.string() }),
  z.object({ kind: z.literal('revive_ally'), sourceId: z.string(), targetId: z.string(), cardInstanceId: z.string() }),
  z.object({
    kind: z.literal('diminished_action'),
    sourceId: z.string(),
    action: z.enum(DIMINISHED_ACTIONS),
    targetId: z.string().optional(),
  }),
])

// The seam and the vocabulary must agree, at module load, the same way the
// event registry refuses an unheard `when`: a Player Command the Scenario
// schema cannot carry is a command no committed Scenario or sealed Record
// could replay.
{
  const carried = new Set(scenarioActionSchema.options.map((option) => option.shape.kind.value as string))
  for (const kind of PLAYER_COMMAND_KINDS) {
    if (!carried.has(kind)) {
      throw new Error(`scenarioActionSchema cannot carry player command ${kind}; add its entry or remove the command`)
    }
  }
  for (const kind of carried) {
    if (!(PLAYER_COMMAND_KINDS as readonly string[]).includes(kind)) {
      throw new Error(`scenarioActionSchema carries ${kind}, which is not a player command; a replay re-derives system actions`)
    }
  }
}

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

export type ScenarioAction = z.infer<typeof scenarioActionSchema>
export type ScenarioStep = z.infer<typeof scenarioStepSchema>
export type Scenario = z.infer<typeof scenarioSchema>

// The record maps buildCatalog assembles and every rule reads. Lives here
// rather than in catalog.ts so the concept modules can take it without a
// cycle through the module that composes them.
export interface ContentCatalog {
  cards: Record<string, Card>
  heroes: Record<string, Hero>
  bosses: Record<string, Boss>
  keywords: Record<string, Keyword>
  chargeModifiers: Record<string, ChargeModifier>
  hazards: Record<string, Hazard>
  minions: Record<string, Minion>
  counters: Record<string, CounterDefinition>
  programs: Record<string, BossProgram>
  encounters: Record<string, EncounterDefinition>
  decks: Record<string, EvaluationDeck>
  scenarios: Record<string, Scenario>
}

// The compatibility surface: the concept modules' names, re-exported.
export { axialSchema, AUTHORED_WHENS, type AuthoredWhen } from './grammar'
export {
  cardSchema,
  cardReaderSchema,
  chargeModifierSchema,
  signatureGrantSchema,
  fullChargeSchema,
  type Card,
  type CardReader,
  type ChargeModifier,
  type SignatureGrant,
} from './card'
export { counterSchema, counterReaderSchema, type CounterDefinition, type CounterReader } from './counterDef'
export { minionSchema, type Minion } from './minionDef'
export { bossBeatSchema, bossProgramSchema, type BossBeat, type BossProgram } from './program'
export { heroSchema, type Hero } from './hero'
export {
  encounterSchema,
  evaluationDeckSchema,
  escalationThresholdSchema,
  phaseTriggerSchema,
  deckEntrySchema,
  partyMemberSchema,
  type EncounterDefinition,
  type EvaluationDeck,
  type EscalationThreshold,
  type PartyMember,
} from './encounter'
