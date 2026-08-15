// The Encounter Engine seam (ADR 0014, translated per ADR 0019):
// createEncounterState / resolve / advancePhase / legality / legalActions,
// plus the content catalog and the shared rules vocabulary types.

export { createEncounterState } from './setup'
export { resolve } from './resolve'
export { advancePhase } from './advancePhase'
export { legality } from './legality'
export { legalActions } from './legalActions'
export { buildCatalog, cardChargeCap, cardWindowSpeed, type ContentCatalog, type RawContent } from './content/catalog'
export * from './content/schemas'
export type * from './types'
export type { EncounterActionInput, ActionKind } from './actions'
export { ENCOUNTER_SOURCE } from './actions'
export { hexKey, parseHexKey, hexDistance, axialEquals, type Axial, type HexKey } from './hex'
export { facingName, axialDeltaFor, normalizeFacing } from './facing'
export { currentProgram } from './timeline'
export { getStatuses } from './statuses'
export { isLegalMove, neighbors, isGuardedFront } from './board'
