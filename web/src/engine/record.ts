import { canonicalStringify, sha256Hex } from './canonical'
import { runScenario } from './scenario'
import { reachableEncounterContent, type ContentCatalog } from './content/catalog'
import type { Scenario, ScenarioStep } from './content/schemas'
import type { EncounterState, ResolvedActionFact } from './types'
import type { RngChoice } from './rng'

// Encounter Record schema_version 2 (ADR 0019): the envelope concepts of the
// v1 contract — seed, content identity fingerprint, submitted/generated/
// rejected actions, Resolution Facts, end kind, initial/final snapshots,
// axial { q, r } — with field shapes following the TS state model. v1
// records remain readable history, not a compatibility target.

export type RecordEndKind = 'victory' | 'defeat' | 'end_of_clock' | 'abandoned'

export interface RecordedAction {
  sequence: number
  depth: number
  round: number
  phase: string
  kind: string
  source_id: string
  succeeded: boolean
  reason: string
  title: string
  detail: Record<string, unknown>
  resolution_fact?: Record<string, unknown>
}

export interface ContentIdentity {
  encounter: string
  ids: string[]
  fingerprint: string
}

export interface EncounterRecordV2 {
  schema_version: 2
  record_id: string
  started_at: string
  ended_at: string
  encounter: string
  seed: number
  content_identity: ContentIdentity
  outcome: 'victory' | 'defeat' | 'abandoned'
  end_kind: RecordEndKind
  end_reason: string
  abandon_reason: string
  rounds_played: number
  steps: ScenarioStep[]
  actions: RecordedAction[]
  rng_audit: RngChoice[]
  initial_state: EncounterState
  final_state: EncounterState
  final_state_fingerprint: string
}

export interface RecordMeta {
  recordId: string
  startedAt: string
  endedAt: string
  abandonReason?: string
}

export interface RecordInput {
  encounterId: string
  steps: ScenarioStep[]
  facts: ResolvedActionFact[]
  initialState: EncounterState
  finalState: EncounterState
  meta: RecordMeta
}

// Content identity: the selected Encounter plus every authored definition
// reachable from it, keyed by stable IDs. The fingerprint hashes the
// canonical definitions, so any content change starts a new evidence cohort.
export async function contentIdentity(catalog: ContentCatalog, encounterId: string): Promise<ContentIdentity> {
  const reachable = reachableEncounterContent(catalog, encounterId)
  const ids = [...reachable.keys()].sort()
  const definitions = ids.map((id) => ({ id, definition: reachable.get(id) }))
  return { encounter: encounterId, ids, fingerprint: await sha256Hex(canonicalStringify(definitions)) }
}

export async function stateFingerprint(state: EncounterState): Promise<string> {
  return sha256Hex(canonicalStringify(state))
}

function recordedAction(fact: ResolvedActionFact): RecordedAction {
  const action: RecordedAction = {
    sequence: fact.sequence,
    depth: fact.depth,
    round: fact.round,
    phase: fact.phase,
    kind: fact.kind,
    source_id: fact.sourceId,
    succeeded: fact.succeeded,
    reason: fact.reason,
    title: fact.title,
    detail: fact.detail,
  }
  if (fact.resolutionFact) {
    action.resolution_fact = fact.resolutionFact
  }
  return action
}

export async function buildEncounterRecord(catalog: ContentCatalog, input: RecordInput): Promise<EncounterRecordV2> {
  const { finalState } = input
  const abandoned = finalState.active
  const endedByClock = input.facts.some((fact) => fact.kind === 'end_of_clock' && fact.succeeded)
  const endKind: RecordEndKind = abandoned ? 'abandoned' : finalState.outcome === 'victory' ? 'victory' : endedByClock ? 'end_of_clock' : 'defeat'
  return {
    schema_version: 2,
    record_id: input.meta.recordId,
    started_at: input.meta.startedAt,
    ended_at: input.meta.endedAt,
    encounter: input.encounterId,
    seed: input.initialState.rng.seed,
    content_identity: await contentIdentity(catalog, input.encounterId),
    outcome: abandoned ? 'abandoned' : finalState.outcome === 'victory' ? 'victory' : 'defeat',
    end_kind: endKind,
    end_reason: abandoned ? (input.meta.abandonReason ?? 'abandoned') : finalState.outcomeReason,
    abandon_reason: abandoned ? (input.meta.abandonReason ?? 'abandoned') : '',
    rounds_played: finalState.round,
    steps: input.steps,
    actions: input.facts.map(recordedAction),
    rng_audit: finalState.rng.choices,
    initial_state: input.initialState,
    final_state: finalState,
    final_state_fingerprint: await stateFingerprint(finalState),
  }
}

export interface RecordReplayResult {
  state: EncounterState
  facts: ResolvedActionFact[]
  finalStateMatches: boolean
  fingerprint: string
  fingerprintMatches: boolean
}

// Deterministic replay: fold the record's submitted-action prefix from its
// seed and compare against the recorded final snapshot. A mismatch means the
// rules, the content, or the record changed.
export async function replayRecord(catalog: ContentCatalog, record: EncounterRecordV2): Promise<RecordReplayResult> {
  const scenario: Scenario = {
    id: `replay-${record.record_id}`,
    title: `Replay of ${record.record_id}`,
    version: 1,
    description: '',
    encounter: record.encounter,
    seed: record.seed,
    steps: record.steps,
  }
  const replay = runScenario(catalog, scenario)
  const fingerprint = await stateFingerprint(replay.state)
  return {
    state: replay.state,
    facts: replay.facts,
    finalStateMatches: canonicalStringify(replay.state) === canonicalStringify(record.final_state),
    fingerprint,
    fingerprintMatches: fingerprint === record.final_state_fingerprint,
  }
}
