// The Encounter Engine seam (ADR 0014, translated per ADR 0019):
// createEncounterState / resolve / advancePhase / legality / legalActions,
// plus the content catalog and the shared rules vocabulary types.

export { createEncounterState } from './setup'
export { resolve } from './resolve'
export { advancePhase } from './advancePhase'
export { legality } from './legality'
export { legalActions } from './legalActions'
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
export type { EncounterActionInput, ActionKind } from './actions'
export { ENCOUNTER_SOURCE } from './actions'
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
export { buildProgramSequence, currentProgram } from './timeline'
export { combatantRef, counterCount, counterCountByKeyword, getCounters, hexCounterRef, slotRef, type CounterRef } from './counters'
export { getEntityIdAt, isLegalMove, neighbors, isGuardedFront } from './board'
export { minionIntent, minionIntents, type MinionIntent } from './minions'
export { ESCALATION_MAX, escalationModifiers, escalationStartRound, type EscalationModifiers } from './escalation'
export { forecast, highestTier, nextProgramId, programAnswerTags, type ConsequenceTier, type Forecast } from './forecast'
export { programPredictability, type ProgramPredictability, type RoundPredictability } from './predictability'
