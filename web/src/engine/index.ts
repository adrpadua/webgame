// The Encounter Engine seam (ADR 0014, translated per ADR 0019):
// createEncounterState / resolve / advancePhase / legality / legalActions,
// plus the content catalog and the shared rules vocabulary types.

export { createEncounterState } from './setup'
// `checkResolution` is deliberately not exported: it mutates authoritative
// state without producing a fact, so public consumers cross `resolve()` or
// `advancePhase()` instead (engine-hardening follow-up P4). Internal engine
// callers import it from './resolve' directly.
export { resolve } from './resolve'
export { advancePhase } from './advancePhase'
export { escalationActionsForRoundEnd } from './escalation'
export { legality } from './legality'
export { legalActions, ENUMERATED_COMMAND_KINDS } from './legalActions'
export { fireTargeting, type FireTargeting } from './legalActions'
export { runScenario, type ScenarioReplayEntry, type ScenarioReplayResult } from './scenario'
export {
  buildEncounterRecord,
  contentIdentity,
  replayRecord,
  stateFingerprint,
  type ContentIdentity,
  type EncounterRecordV2,
  type RecordInput,
  type RecordMeta,
  type RecordReplayResult,
  type RecordedAction,
} from './record'
export { canonicalStringify, sha256Hex } from './canonical'
export { buildCatalog, cardChargeCap, cardWindowSpeed, type ContentCatalog, type RawContent } from './content/catalog'
export * from './content/schemas'
export type * from './types'
export type { EncounterActionInput, ActionKind, PlayerCommandInput, PlayerCommandKind, SystemActionInput } from './actions'
export { ENCOUNTER_SOURCE, PLAYER_COMMAND_KINDS, isPlayerCommand } from './actions'
export { hexKey, parseHexKey, hexDistance, hexesWithinRadius, axialEquals, axialAdd, type Axial, type HexKey } from './hex'
export {
  facingName,
  axialDeltaFor,
  normalizeFacing,
  VALID_FACINGS,
  FACING_E,
  FACING_NE,
  FACING_NW,
  FACING_W,
  FACING_SW,
  FACING_SE,
} from './facing'
export { buildProgramSequence, currentProgram, selectBeatTarget } from './timeline'
export { keywordTitle, heroRole, TANK } from './keywords'
export { combatantRef, counterCount, readCounterEvent, counterCountByKeyword, getCounters, hexCounterRef, slotRef, type CounterRef } from './counters'
export { slotChargeCount } from './signature'
export {
  EVENT_REGISTRY,
  evaluatedGrantWhens,
  hostOrder,
  readableReaderPairs,
  readSubscriberMatches,
  type EventRow,
  type EventSubscription,
  type SubscriberMatch,
} from './events'
export { DIMINISHED_ACTIONS, isLivingHero, livingHeroIds, rescueDeadlineRound, type DiminishedAction } from './downed'
export { getEntityIdAt, isLegalMove, neighbors, isGuardedFront, guardedFrontHex, facingToward, facingAlong, isTraversable, traversalRoute, type Traversal } from './board'
export {
  minionIntent,
  minionIntents,
  minionDetonation,
  minionDetonations,
  detonationDue,
  type MinionIntent,
  type MinionDetonation,
} from './minions'
export { ESCALATION_MAX, escalationModifiers, escalationStartRound, type EscalationModifiers } from './escalation'
export { highestTier, programAnswerTags, type ConsequenceTier } from './consequence'
export { programPredictability, type ProgramPredictability, type RoundPredictability } from './predictability'
