import { buildEncounterRecord, type ContentCatalog, type ScenarioStep } from '@/engine'
import type { HistoryEntry } from './workbench'

// Pure serializers over the session timeline: what leaves the Workbench as a
// Scenario or an Encounter Record is built here, away from gesture state.

export function stepsUpTo(entries: HistoryEntry[], index: number): ScenarioStep[] {
  return entries
    .slice(1, index + 1)
    .map((entry) => entry.step)
    .filter((step): step is ScenarioStep => step !== null)
}

export function buildScenarioExport(entries: HistoryEntry[], index: number, encounterId: string, seed: number): string {
  const scenario = {
    id: 'session-export',
    title: 'Session export',
    version: 1,
    description: 'Exported from a live Workbench session.',
    encounter: encounterId,
    seed,
    steps: stepsUpTo(entries, index),
  }
  return JSON.stringify(scenario, null, 2)
}

export async function buildRecordExport(
  catalog: ContentCatalog,
  entries: HistoryEntry[],
  index: number,
  encounterId: string,
  sessionStartedAt: string,
): Promise<string> {
  const finalState = entries[index].state
  const record = await buildEncounterRecord(catalog, {
    encounterId,
    steps: stepsUpTo(entries, index),
    facts: entries.slice(0, index + 1).flatMap((entry) => entry.facts),
    initialState: entries[0].state,
    finalState,
    meta: {
      recordId: `rec_${Date.now().toString(36)}`,
      startedAt: sessionStartedAt,
      endedAt: new Date().toISOString(),
      abandonReason: finalState.active ? 'exported_mid_encounter' : undefined,
    },
  })
  return JSON.stringify(record, null, 2)
}
