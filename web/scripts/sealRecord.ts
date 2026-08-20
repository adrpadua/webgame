// Verification harness (issue 02, transient): seal the committed Brand-trial
// duo Scenario as an Encounter Record — replay it through the engine at this
// checkout and write the schema_version 2 record, so the same fight can be
// folded through another checkout's dispatch path and compared.
//
// Usage (from web/): npx vite-node scripts/sealRecord.ts -- <out.json>
import { writeFileSync } from 'node:fs'
import { loadCatalog } from '../src/content'
import { buildEncounterRecord, createEncounterState, runScenario } from '../src/engine'

const out = process.argv.slice(2).filter((arg) => arg !== '--')[0] ?? 'sealed-record.json'
const catalog = loadCatalog()
const scenario = catalog.scenarios.brand_trial_duo_line
if (!scenario) {
  throw new Error('brand_trial_duo_line is not in the catalog')
}
const initialState = createEncounterState(catalog, scenario.encounter, scenario.seed)
const replay = runScenario(catalog, scenario)
const record = await buildEncounterRecord(catalog, {
  encounterId: scenario.encounter,
  steps: scenario.steps,
  facts: replay.facts,
  initialState,
  finalState: replay.state,
  meta: { recordId: 'brand-trial-duo-seal', startedAt: '2026-08-20T00:00:00Z', endedAt: '2026-08-20T00:00:00Z' },
})
writeFileSync(out, `${JSON.stringify(record)}\n`)
console.log(
  JSON.stringify(
    {
      out,
      outcome: record.outcome,
      end_kind: record.end_kind,
      rounds_played: record.rounds_played,
      actions: record.actions.length,
      content_fingerprint: record.content_identity.fingerprint,
      final_state_fingerprint: record.final_state_fingerprint,
    },
    null,
    2,
  ),
)
