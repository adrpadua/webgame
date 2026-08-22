import type { StateCreator } from 'zustand'
import { DEFAULT_ENCOUNTER_ID, FIRST_TURN_ENCOUNTER_ID } from '@/content'
import { advancePhase, createEncounterState, resolve, resolvePlayerCommand, runScenario, type EncounterState, type PlayerCommandInput,
  type SystemActionInput, type ResolvedActionFact, type ScenarioStep } from '@/engine'
import { catalog } from './catalog'
import { buildRecordExport, buildScenarioExport } from './exports'
import { CLEARED_INTERACTION } from './interactionSlice'
import { hasFinishedFirstTurn } from './onboarding'
import { numberFacts, nextFactId, selectUndoTarget, type HistoryEntry } from './sessionTimeline'
import { selectState } from './selectors'
import type { WorkbenchStore } from './workbench'

// The Encounter session: which Encounter is being played, and the timeline of
// states it has passed through. Every mutation of the rules state lands here
// and nowhere else — actions go through `resolve`, phases through
// `advancePhase`, and both arrive as a new entry rather than as an edit, so
// time travel, undo, and Scenario replay are all the same operation on the
// same list.

export interface SessionSlice {
  // Which authored Encounter this session is playing. A first-time player
  // opens the First Turn variant; Scenario replay and every export name the
  // Encounter that actually produced the line.
  encounterId: string
  seed: number
  entries: HistoryEntry[]
  index: number
  activeScenarioId: string | null
  sessionStartedAt: string
  // The UI's half of the external command seam (engine-hardening P1): only a
  // Player Command crosses it, typed at the boundary rather than filtered
  // after the fact.
  submit: (action: PlayerCommandInput) => void
  submitSystemAction: (action: SystemActionInput) => void
  advance: () => void
  // Replays the Encounter this session opened, with the same seed or a new
  // one. Which Encounter that is stays fixed for the session.
  restart: (seed?: number) => void
  startEncounter: (encounterId: string) => void
  loadScenario: (scenarioId: string) => void
  timeTravelTo: (index: number) => void
  // Takes back the player's own last action, within the window they took it
  // in. See selectUndoTarget.
  undo: () => void
  exportScenario: () => string
  exportRecord: () => Promise<string>
}

// Which action kinds are worth replaying. A Scenario is an action prefix, so
// only the actions that move the Encounter belong in one.

function initialEntry(encounterId: string, seed: number): HistoryEntry {
  return { label: 'Encounter start', step: null, state: createEncounterState(catalog, encounterId, seed), facts: [] }
}

// A returning player skips the training wheels: the scripted first turn and
// its wider opening Hand belong to the first visit only.
export const OPENING_ENCOUNTER_ID = hasFinishedFirstTurn() ? DEFAULT_ENCOUNTER_ID : FIRST_TURN_ENCOUNTER_ID

export const createSessionSlice: StateCreator<WorkbenchStore, [], [], SessionSlice> = (set, get) => {
  // Appends one position to the timeline, truncating any future the player
  // had walked back from: submitting from an earlier position branches.
  function pushEntry(label: string, step: ScenarioStep | null, state: EncounterState, produced: ResolvedActionFact[]): void {
    const { entries, index } = get()
    const kept = entries.slice(0, index + 1)
    kept.push({ label, step, state, facts: numberFacts(nextFactId(entries, index), produced) })
    set({ entries: kept, index: kept.length - 1 })
  }

  const openingSeed = catalog.encounters[OPENING_ENCOUNTER_ID].random_seed

  return {
    encounterId: OPENING_ENCOUNTER_ID,
    seed: openingSeed,
    entries: [initialEntry(OPENING_ENCOUNTER_ID, openingSeed)],
    index: 0,
    activeScenarioId: null,
    sessionStartedAt: new Date().toISOString(),

    submit: (action) => {
      const state = selectState(get())
      // Player commands cross the runtime trust boundary, the same parse the
      // Scenario seam uses (engine-hardening issue 04) — so the live submit
      // path exercises the exact validation a future untrusted client will
      // meet. A typed Workbench action failing it is a Workbench bug; it
      // surfaces on the rejection channel rather than vanishing.
      const submission = resolvePlayerCommand(catalog, state, action)
      if (!submission.accepted) {
        set({ lastRejection: submission.reason })
        return
      }
      const { result } = submission
      const submitted = result.facts[0]
      pushEntry(submitted?.title ?? submission.action.kind, { action: submission.action } as ScenarioStep, result.state, result.facts)
      set({ lastRejection: submitted && !submitted.succeeded ? submitted.reason : null })
    },

    // The debug injection seam, deliberately not `submit`: a System Action is
    // the engine's to generate, so pushing one from outside is a Workbench
    // debug affordance rather than play. It records NO scenario step — a
    // replay re-derives system actions from commands and the seed, so an
    // injected one is invisible to time travel and exports by design, the
    // hole `submit` used to hide behind a silent null step.
    submitSystemAction: (action) => {
      const state = selectState(get())
      const result = resolve(catalog, state, action)
      const submitted = result.facts[0]
      pushEntry(submitted?.title ?? action.kind, null, result.state, result.facts)
      set({ lastRejection: submitted && !submitted.succeeded ? submitted.reason : null })
    },

    advance: () => {
      const state = selectState(get())
      // An ended Encounter has no phase to advance; recording the no-op
      // would add an empty step to the timeline (and to exports).
      if (!state.active) {
        return
      }
      const result = advancePhase(catalog, state)
      pushEntry(`Advance (${state.phase} ends)`, { advance: true }, result.state, result.facts)
      set(CLEARED_INTERACTION)
    },

    restart: (seed) => {
      const { encounterId } = get()
      const nextSeed = seed ?? get().seed
      set({
        seed: nextSeed,
        entries: [initialEntry(encounterId, nextSeed)],
        index: 0,
        activeScenarioId: null,
        sessionStartedAt: new Date().toISOString(),
        inspectedEntityId: null,
        inspectedHexKey: null,
        ...CLEARED_INTERACTION,
      })
    },

    // The Encounter Picker's one verb: a fresh session in a different
    // Encounter, on that Encounter's authored seed — the same seed a first
    // boot would deal, so "pick it again" replays the same opening. Only a
    // player-facing Encounter is startable: an evaluation probe is authored
    // to be measured, never played (D-076), and refusing it here means the
    // picker cannot drift into offering one.
    startEncounter: (encounterId) => {
      const encounter = catalog.encounters[encounterId]
      if (!encounter || !encounter.player_facing) {
        set({ lastRejection: `Unknown encounter: ${encounterId}` })
        return
      }
      set({
        encounterId,
        seed: encounter.random_seed,
        entries: [initialEntry(encounterId, encounter.random_seed)],
        index: 0,
        activeScenarioId: null,
        sessionStartedAt: new Date().toISOString(),
        inspectedEntityId: null,
        ...CLEARED_INTERACTION,
      })
    },

    // A Scenario replays through the same reducer seam, so the whole line it
    // produces is walkable with time travel afterward.
    loadScenario: (scenarioId) => {
      const scenario = catalog.scenarios[scenarioId]
      if (!scenario) {
        set({ lastRejection: `Unknown Scenario: ${scenarioId}` })
        return
      }
      const replay = runScenario(catalog, scenario)
      const entries: HistoryEntry[] = []
      let firstId = 1
      for (const entry of replay.entries) {
        const label =
          entry.step === null ? `Scenario: ${scenario.title}` : 'advance' in entry.step ? 'Advance' : entry.facts[0]?.title ?? 'Action'
        entries.push({ label, step: entry.step, state: entry.state, facts: numberFacts(firstId, entry.facts) })
        firstId += entry.facts.length
      }
      set({
        encounterId: scenario.encounter,
        seed: scenario.seed,
        entries,
        index: entries.length - 1,
        activeScenarioId: scenarioId,
        sessionStartedAt: new Date().toISOString(),
        inspectedEntityId: null,
        inspectedHexKey: null,
        ...CLEARED_INTERACTION,
      })
    },

    timeTravelTo: (index) => {
      const { entries } = get()
      const clamped = Math.max(0, Math.min(index, entries.length - 1))
      set({ index: clamped, inspectedEntityId: null, inspectedHexKey: null, ...CLEARED_INTERACTION })
    },

    // Undo rides the same seam time travel does: move the index back and the
    // next action truncates the branch, which is what taking something back
    // is. Unlike time travel it keeps the Stat Panel open — a player undoing
    // a shot is usually watching the bar it moved, and closing the readout
    // would hide the thing the press was about. A panel whose piece the
    // rewind removed from the board closes itself.
    undo: () => {
      const target = selectUndoTarget(get())
      if (target === null) {
        return
      }
      set({ index: target, ...CLEARED_INTERACTION })
    },

    // The current session up to the viewed position, as a Scenario payload:
    // a named, versioned action-prefix plus the seed — never a snapshot.
    exportScenario: () => {
      const { entries, index, seed, encounterId } = get()
      return buildScenarioExport(entries, index, encounterId, seed)
    },

    // Encounter Record schema_version 2: the session timeline up to the
    // viewed position, sealed with content identity and state fingerprints.
    exportRecord: async () => {
      const { entries, index, sessionStartedAt, encounterId } = get()
      return buildRecordExport(catalog, entries, index, encounterId, sessionStartedAt)
    },
  }
}
