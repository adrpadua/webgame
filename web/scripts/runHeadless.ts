// Headless Encounter runner (ADR 0019, M3): runs Scenarios and verifies
// Encounter Records outside the browser, through the same engine seam.
//
// Usage (from web/):
//   npx vite-node scripts/runHeadless.ts -- --scenario embermaw_solo_ceiling [--record out.json]
//   npx vite-node scripts/runHeadless.ts -- --replay path/to/record.json
import { readFileSync, writeFileSync } from 'node:fs'
import { loadCatalog } from '../src/content'
import { buildEncounterRecord, replayRecord, runScenario, type EncounterRecordV2 } from '../src/engine'

const catalog = loadCatalog()
const args = process.argv.slice(2).filter((arg) => arg !== '--')

function flagValue(name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const scenarioId = flagValue('--scenario')
const replayPath = flagValue('--replay')
const recordOut = flagValue('--record')

if (scenarioId) {
  const scenario = catalog.scenarios[scenarioId]
  if (!scenario) {
    console.error(`Unknown Scenario: ${scenarioId}. Available: ${Object.keys(catalog.scenarios).join(', ')}`)
    process.exit(1)
  }
  const startedAt = new Date().toISOString()
  const replay = runScenario(catalog, scenario)
  const state = replay.state
  const boss = state.board.entities[state.bossId]
  const hero = state.heroes[state.primaryHeroId]
  console.log(`Scenario: ${scenario.title} (seed ${scenario.seed}, ${scenario.steps.length} steps)`)
  console.log(`Outcome: ${state.active ? 'ongoing' : state.outcome} — round ${state.round}, boss ${boss?.health ?? 0} HP, hero ${hero.health} HP`)
  console.log(`Facts: ${replay.facts.length} (${replay.facts.filter((fact) => !fact.succeeded).length} rejected)`)
  if (recordOut) {
    const record = await buildEncounterRecord(catalog, {
      encounterId: scenario.encounter,
      steps: scenario.steps,
      facts: replay.facts,
      initialState: replay.entries[0].state,
      finalState: state,
      meta: {
        recordId: `rec_headless_${scenario.id}`,
        startedAt,
        endedAt: new Date().toISOString(),
        abandonReason: state.active ? 'headless_run_ended' : undefined,
      },
    })
    writeFileSync(recordOut, `${JSON.stringify(record, null, 2)}\n`)
    console.log(`Encounter Record (schema_version 2) written to ${recordOut}`)
  }
  process.exit(0)
}

if (replayPath) {
  const record = JSON.parse(readFileSync(replayPath, 'utf8')) as EncounterRecordV2
  if (record.schema_version !== 2) {
    console.error(`Unsupported schema_version: ${record.schema_version} (expected 2)`)
    process.exit(1)
  }
  const result = await replayRecord(catalog, record)
  console.log(`Record: ${record.record_id} (${record.encounter}, seed ${record.seed}, ${record.steps.length} steps)`)
  console.log(`Recorded end: ${record.outcome} / ${record.end_kind} at round ${record.rounds_played}`)
  console.log(`Replayed fingerprint: ${result.fingerprint}`)
  console.log(`Recorded  fingerprint: ${record.final_state_fingerprint}`)
  if (result.finalStateMatches && result.fingerprintMatches) {
    console.log('REPLAY MATCH: the headless replay reached an identical final state.')
    process.exit(0)
  }
  console.error('REPLAY MISMATCH: the replayed final state differs from the record.')
  process.exit(1)
}

console.log('Usage: runHeadless --scenario <id> [--record out.json] | --replay <record.json>')
console.log(`Scenarios: ${Object.keys(catalog.scenarios).join(', ')}`)
process.exit(1)
