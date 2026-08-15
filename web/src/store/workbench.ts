import { create } from 'zustand'
import { loadCatalog } from '@/content'
import {
  advancePhase,
  cardWindowSpeed,
  createEncounterState,
  resolve,
  runScenario,
  type Axial,
  type EncounterActionInput,
  type EncounterState,
  type ResolvedActionFact,
  type ScenarioStep,
} from '@/engine'

const ENCOUNTER_ID = 'embermaw_prototype'

export interface FactEntry extends ResolvedActionFact {
  id: number
}

// One position on the session timeline: the state after a step, the facts
// that step produced, and the step itself (null for the seeded start).
// Time travel walks these entries; submitting from an earlier position
// branches by truncating the future, exactly like replaying a shorter prefix.
export interface HistoryEntry {
  label: string
  step: ScenarioStep | null
  state: EncounterState
  facts: FactEntry[]
}

interface WorkbenchStore {
  catalog: ReturnType<typeof loadCatalog>
  seed: number
  entries: HistoryEntry[]
  index: number
  activeScenarioId: string | null
  targetingSlotIndex: number | null
  draggingCardId: string | null
  lastRejection: string | null
  submit: (action: EncounterActionInput) => void
  advance: () => void
  restart: (seed?: number) => void
  loadScenario: (scenarioId: string) => void
  timeTravelTo: (index: number) => void
  exportScenario: () => string
  fireSlot: (slotIndex: number) => void
  hexClicked: (coords: Axial) => void
  cardDroppedOnHex: (cardInstanceId: string, coords: Axial) => void
  cardDroppedOnSlot: (cardInstanceId: string, slotIndex: number) => void
  cancelTargeting: () => void
  setDraggingCard: (cardInstanceId: string | null) => void
  clearRejection: () => void
}

const catalog = loadCatalog()

export const selectState = (store: WorkbenchStore): EncounterState => store.entries[store.index].state

const SCENARIO_STEP_KINDS = new Set(['load_slot', 'charge_slot', 'fire_slot', 'move_hero', 'discard_for_stamina'])

function renumberFacts(entries: HistoryEntry[], index: number, produced: ResolvedActionFact[]): FactEntry[] {
  let nextId = 1
  for (let position = 0; position <= index; position += 1) {
    const facts = entries[position].facts
    if (facts.length > 0) {
      nextId = facts[facts.length - 1].id + 1
    }
  }
  return produced.map((fact) => ({ ...fact, id: nextId++ }))
}

function initialEntry(seed: number): HistoryEntry {
  return { label: 'Encounter start', step: null, state: createEncounterState(catalog, ENCOUNTER_ID, seed), facts: [] }
}

export const useWorkbench = create<WorkbenchStore>((set, get) => {
  function pushEntry(label: string, step: ScenarioStep | null, state: EncounterState, produced: ResolvedActionFact[]): void {
    const { entries, index } = get()
    const kept = entries.slice(0, index + 1)
    kept.push({ label, step, state, facts: renumberFacts(entries, index, produced) })
    set({ entries: kept, index: kept.length - 1 })
  }

  return {
    catalog,
    seed: catalog.encounters[ENCOUNTER_ID].random_seed,
    entries: [initialEntry(catalog.encounters[ENCOUNTER_ID].random_seed)],
    index: 0,
    activeScenarioId: null,
    targetingSlotIndex: null,
    draggingCardId: null,
    lastRejection: null,

    submit: (action) => {
      const state = selectState(get())
      const result = resolve(catalog, state, action)
      const submitted = result.facts[0]
      const step = SCENARIO_STEP_KINDS.has(action.kind) ? ({ action } as ScenarioStep) : null
      pushEntry(submitted?.title ?? action.kind, step, result.state, result.facts)
      set({ lastRejection: submitted && !submitted.succeeded ? submitted.reason : null })
    },

    advance: () => {
      const state = selectState(get())
      const result = advancePhase(catalog, state)
      pushEntry(`Advance (${state.phase} ends)`, { advance: true }, result.state, result.facts)
      set({ targetingSlotIndex: null, lastRejection: null })
    },

    restart: (seed) => {
      const nextSeed = seed ?? get().seed
      set({
        seed: nextSeed,
        entries: [initialEntry(nextSeed)],
        index: 0,
        activeScenarioId: null,
        targetingSlotIndex: null,
        draggingCardId: null,
        lastRejection: null,
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
      let nextId = 1
      for (const entry of replay.entries) {
        const label =
          entry.step === null ? `Scenario: ${scenario.title}` : 'advance' in entry.step ? 'Advance' : entry.facts[0]?.title ?? 'Action'
        entries.push({
          label,
          step: entry.step,
          state: entry.state,
          facts: entry.facts.map((fact) => ({ ...fact, id: nextId++ })),
        })
      }
      set({
        seed: scenario.seed,
        entries,
        index: entries.length - 1,
        activeScenarioId: scenarioId,
        targetingSlotIndex: null,
        draggingCardId: null,
        lastRejection: null,
      })
    },

    timeTravelTo: (index) => {
      const { entries } = get()
      const clamped = Math.max(0, Math.min(index, entries.length - 1))
      set({ index: clamped, targetingSlotIndex: null, lastRejection: null })
    },

    // The current session up to the viewed position, as a Scenario payload:
    // a named, versioned action-prefix plus the seed — never a snapshot.
    exportScenario: () => {
      const { entries, index, seed } = get()
      const steps = entries
        .slice(1, index + 1)
        .map((entry) => entry.step)
        .filter((step): step is ScenarioStep => step !== null)
      const scenario = {
        id: 'session-export',
        title: 'Session export',
        version: 1,
        description: 'Exported from a live Workbench session.',
        encounter: ENCOUNTER_ID,
        seed,
        steps,
      }
      return JSON.stringify(scenario, null, 2)
    },

    // Tapping a prepared Slot: a piece-targeting Top Card first needs a Minion
    // selected on the board; everything else fires immediately.
    fireSlot: (slotIndex) => {
      const state = selectState(get())
      const hero = state.heroes[state.primaryHeroId]
      const topCard = hero.actionBar[slotIndex]?.topCard
      if (topCard && catalog.cards[topCard.cardId].damage > 0) {
        set({ targetingSlotIndex: slotIndex, lastRejection: null })
        return
      }
      get().submit({ kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex })
    },

    hexClicked: (coords) => {
      const { targetingSlotIndex } = get()
      const state = selectState(get())
      if (targetingSlotIndex === null) {
        return
      }
      const target = Object.values(state.board.entities).find(
        (entity) => entity.coords.q === coords.q && entity.coords.r === coords.r && entity.kind === 'minion',
      )
      if (!target) {
        set({ lastRejection: 'The Top Card needs a Minion target.' })
        return
      }
      set({ targetingSlotIndex: null })
      get().submit({ kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: targetingSlotIndex, targetId: target.id })
    },

    // Dragging a hand card to an adjacent legal hex discards it for 1 Stamina
    // and moves the Hero.
    cardDroppedOnHex: (cardInstanceId, coords) => {
      const state = selectState(get())
      get().submit({ kind: 'move_hero', sourceId: state.primaryHeroId, destination: coords, cardInstanceId })
    },

    // Dragging onto an empty Slot prepares; onto an occupied Slot it replaces
    // during Loadout and charges during a player window.
    cardDroppedOnSlot: (cardInstanceId, slotIndex) => {
      const state = selectState(get())
      const hero = state.heroes[state.primaryHeroId]
      const slot = hero.actionBar[slotIndex]
      const kind = slot.topCard !== null && state.phase !== 'loadout' ? 'charge_slot' : 'load_slot'
      get().submit({ kind, sourceId: state.primaryHeroId, slotIndex, cardInstanceId })
    },

    cancelTargeting: () => set({ targetingSlotIndex: null }),
    setDraggingCard: (cardInstanceId) => set({ draggingCardId: cardInstanceId }),
    clearRejection: () => set({ lastRejection: null }),
  }
})

export function slotWindowLabel(cardId: string): 'Quick' | 'Slow' {
  return cardWindowSpeed(catalog.cards[cardId]) === 'quick' ? 'Quick' : 'Slow'
}

// Keep the running Encounter alive across hot updates: rules and UI edits
// re-execute this module, then re-adopt the previous session's timeline.
if (import.meta.hot) {
  const saved = import.meta.hot.data.workbench as Partial<WorkbenchStore> | undefined
  if (saved?.entries && saved.entries.length > 0) {
    useWorkbench.setState({
      entries: saved.entries,
      index: saved.index ?? saved.entries.length - 1,
      seed: saved.seed,
      activeScenarioId: saved.activeScenarioId ?? null,
    })
  }
  import.meta.hot.dispose((data) => {
    const { entries, index, seed, activeScenarioId } = useWorkbench.getState()
    data.workbench = { entries, index, seed, activeScenarioId }
  })
  import.meta.hot.accept()
}
