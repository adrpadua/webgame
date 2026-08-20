// Verification harness (issue 02, transient): replay a sealed Encounter
// Record under THIS checkout's dispatch path and report the evidence —
// finalStateMatches, the fingerprint pair, and a structural diff of the final
// state and the recorded fact stream so any divergence is named rather than
// summarized.
//
// Usage (from web/): npx vite-node scripts/verifyReplay.ts -- <record.json>
import { readFileSync } from 'node:fs'
import { loadCatalog } from '../src/content'
import { replayRecord, type EncounterRecordV2, type RecordedAction, type ResolvedActionFact } from '../src/engine'

const recordPath = process.argv.slice(2).filter((arg) => arg !== '--')[0]
if (!recordPath) {
  throw new Error('pass the sealed record path')
}
const catalog = loadCatalog()
const record = JSON.parse(readFileSync(recordPath, 'utf8')) as EncounterRecordV2
const result = await replayRecord(catalog, record)
console.log(
  JSON.stringify(
    {
      record: recordPath,
      finalStateMatches: result.finalStateMatches,
      fingerprintMatches: result.fingerprintMatches,
      replayFingerprint: result.fingerprint,
      recordedFingerprint: record.final_state_fingerprint,
    },
    null,
    2,
  ),
)

function diff(a: unknown, b: unknown, path: string, out: string[]): void {
  if (JSON.stringify(a) === JSON.stringify(b)) {
    return
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) {
      diff((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`, out)
    }
    return
  }
  out.push(`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`)
}

const stateDiffs: string[] = []
diff(record.final_state, result.state, 'final_state', stateDiffs)
console.log(`\nfinal-state leaf diffs (recorded -> replayed): ${stateDiffs.length}`)
for (const line of stateDiffs.slice(0, 40)) {
  console.log(`  ${line}`)
}

const projected: RecordedAction[] = result.facts.map((fact: ResolvedActionFact) => {
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
})
const factDiffs: string[] = []
diff(record.actions, projected, 'actions', factDiffs)
const buckets = new Map<string, number>()
const unexpected: string[] = []
for (const line of factDiffs) {
  const key = line.includes('subscriber_matches')
    ? 'detail.subscriber_matches (added by ADR 0041 fact-detail recording)'
    : line.includes('takenDelta')
      ? 'detail.takenDelta (removed with the pre-registry dispatch)'
      : 'UNEXPECTED'
  buckets.set(key, (buckets.get(key) ?? 0) + 1)
  if (key === 'UNEXPECTED') {
    unexpected.push(line)
  }
}
console.log(`\nfact-stream leaf diffs (recorded -> replayed): ${factDiffs.length}`)
for (const [bucket, count] of buckets) {
  console.log(`  ${count} × ${bucket}`)
}
for (const line of unexpected.slice(0, 40)) {
  console.log(`  ! ${line}`)
}
