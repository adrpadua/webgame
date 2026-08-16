import { advancePhase } from './advancePhase'
import { resolve } from './resolve'
import { createEncounterState } from './setup'
import type { ContentCatalog } from './content/catalog'
import type { Scenario, ScenarioStep } from './content/schemas'
import type { EncounterState, ResolvedActionFact } from './types'

export interface ScenarioReplayEntry {
  step: ScenarioStep | null
  state: EncounterState
  facts: ResolvedActionFact[]
}

export interface ScenarioReplayResult {
  state: EncounterState
  facts: ResolvedActionFact[]
  // One entry per replay position: the seeded initial state, then the state
  // after each step. Time travel and debugging read this trail.
  entries: ScenarioReplayEntry[]
}

// Replaying a Scenario is a fold over its steps: every step goes through the
// same reducer seam the Workbench uses, so a Scenario is always rules-legal
// and lands on a reachable state (never a snapshot).
export function runScenario(catalog: ContentCatalog, scenario: Scenario): ScenarioReplayResult {
  let state = createEncounterState(catalog, scenario.encounter, scenario.seed)
  const entries: ScenarioReplayEntry[] = [{ step: null, state, facts: [] }]
  const allFacts: ResolvedActionFact[] = []
  for (const step of scenario.steps) {
    const result = 'advance' in step ? advancePhase(catalog, state) : resolve(catalog, state, step.action)
    state = result.state
    allFacts.push(...result.facts)
    entries.push({ step, state, facts: result.facts })
  }
  return { state, facts: allFacts, entries }
}
