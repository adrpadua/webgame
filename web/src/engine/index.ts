// The Encounter Engine seam (ADR 0014, translated per ADR 0019):
// createEncounterState / resolve / advancePhase / legality / legalActions,
// plus the content catalog and the shared rules vocabulary types.

export { createEncounterState } from './setup'
export { resolve } from './resolve'
export { advancePhase } from './advancePhase'
export { legality } from './legality'
export { legalActions } from './legalActions'
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
export { hexKey, parseHexKey, hexDistance, axialEquals, axialAdd, type Axial, type HexKey } from './hex'
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
export { currentProgram } from './timeline'
export { getStatuses } from './statuses'
export { getEntityIdAt, isLegalMove, neighbors, isGuardedFront } from './board'
export { minionIntent, minionIntents, type MinionIntent } from './minions'
export { ESCALATION_MAX, escalationModifiers, escalationStartRound, type EscalationModifiers } from './escalation'
export { forecast, highestTier, nextProgramId, programCounterTags, type ConsequenceTier, type Forecast } from './forecast'
