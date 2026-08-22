import { expect } from 'vitest'
import { loadCatalog } from '@/content'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import {
  advancePhase,
  combatantRef,
  createEncounterState,
  type ContentCatalog,
  type EncounterState,
  type ResolvedActionFact,
  } from '@/engine'


// Test support only — the shared fixtures and staging helpers the engine's
// seam test files import. Never imported by the app; not a test file itself,
// so vitest does not try to run it. Extracted whole from the old monolithic
// engine.test.ts when it split along the module seams (engine-deepening
// candidate 6).

export const catalog = loadCatalog()

export function start(seed?: number): EncounterState {
  return createEncounterState(catalog, 'embermaw_prototype', seed)
}

export function hero(state: EncounterState) {
  return state.heroes[state.primaryHeroId]
}

export function boss(state: EncounterState) {
  return state.board.entities[state.bossId]
}

// Tests may fabricate hand and Slot contents: the engine reads card identity
// from the content catalog, and instances are plain data.
export function card(instanceId: string, cardId: string) {
  return { instanceId, cardId }
}

// A Hero who cannot die of attrition, for tests about clocks and rotation
// rather than about survival.
export function immortalHero(state: EncounterState): EncounterState {
  state.heroes[state.primaryHeroId].maxHealth = 5000
  state.heroes[state.primaryHeroId].health = 5000
  return state
}

// The Boss's program order is rolled from the seed (D-037), and the pinned
// opener never calls Whelps — so a test that needs Whelps has to ask for a seed
// that produces them early rather than assume Round 1 does. Seed 3 puts Brood
// Pattern second, the earliest a Brood Call can land.
export const BROOD_SECOND_SEED = 3

export function startBroodSecond(): EncounterState {
  const state = start(BROOD_SECOND_SEED)
  // Guard the fixture here so a bag-ordering change fails in one obvious place
  // rather than in whichever Whelp test happens to run first.
  expect(state.programSequence[1]).toBe('embermaw_brood')
  return state
}

// A catalog whose Whelps have no fuse and whose Brood Calls are priced.
//
// Two engine rules — pool-scoped demand pricing (D-041) and Escalation
// acceleration from a standing Minion (ADR 0027) — need a Minion that can
// still be on the board at a Round end. Since D-063 no live Minion can be:
// a Whelp detonates on the Incoming Row of the Round after it arrives, so it
// never reaches the Round-end step it used to be billed at. The rules are
// architecture rather than Embermaw tuning, so they are proven here against
// content that still exercises them, exactly as the acceleration mechanism was
// proven against a priced variant while Embermaw authored the price at 0.
export function standingMinionCatalog(): ContentCatalog {
  const variant = structuredClone(catalog)
  variant.minions.whelp.explode_damage = 0
  variant.minions.whelp.explode_radius = 0
  for (const program of Object.values(variant.programs)) {
    for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
      if (beat.kind === 'spawn_minions') {
        beat.escalation_if_unanswered = 1
      }
    }
  }
  return variant
}

export function stepPhases(state: EncounterState, count: number): { state: EncounterState; facts: ResolvedActionFact[] } {
  let current = state
  const facts: ResolvedActionFact[] = []
  for (let index = 0; index < count; index += 1) {
    const result = advancePhase(catalog, current)
    current = result.state
    facts.push(...result.facts)
  }
  return { state: current, facts }
}

// Every standing demand answered, as a stand-in for the cards a party would
// spend answering them: Whelps cleared the way Sweeping Blow clears them, Heat
// drawn off the way Quench draws it off. Tests about anything other than
// acceleration need this, or they measure the automatic clock plus whatever the
// newest priced demand happens to charge — which is what several of them
// quietly started doing the moment Heat was priced.
export function answerDemands(state: EncounterState): void {
  for (const entity of Object.values(state.board.entities)) {
    if (entity.kind === 'minion') {
      delete state.board.entities[entity.id]
    }
  }
  delete state.counters[combatantRef(state.bossId)]
}

// One whole Round, answered in the Slow Window — the last player window before
// the Round-end step. Answering after the Round instead works only for a demand
// with a spawn-Round grace, and Heat has none.
export function answeredRound(state: EncounterState): EncounterState {
  const inSlow = stepPhases(state, 4).state
  answerDemands(inSlow)
  return stepPhases(inSlow, 1).state
}

