import { create } from 'zustand'
import { axialToPixel, BOARD_WIDTH, HEX_SIZE } from '@/board/layout'
import { DEFAULT_ENCOUNTER_ID, FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { hasFinishedFirstTurn } from './onboarding'
import {
  advancePhase,
  cardWindowSpeed,
  createEncounterState,
  getEntityIdAt,
  resolve,
  runScenario,
  type Axial,
  type EncounterActionInput,
  type EncounterState,
  type ResolvedActionFact,
  type ScenarioStep,
} from '@/engine'
import { buildRecordExport, buildScenarioExport } from './exports'

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

export interface WorkbenchStore {
  catalog: ReturnType<typeof loadCatalog>
  // Which authored Encounter this session is playing. A first-time player
  // opens the First Turn variant; Scenario replay and every export name the
  // Encounter that actually produced the line.
  encounterId: string
  seed: number
  entries: HistoryEntry[]
  index: number
  activeScenarioId: string | null
  sessionStartedAt: string
  targetingSlotIndex: number | null
  draggingCardId: string | null
  // Tap path (accessibility contract): a selected Compact Card acts on the
  // next tapped Slot or move destination, mirroring the drag gestures.
  selectedCardId: string | null
  // Slot Replacement discards the Top Card and its whole Charge Stack, so it
  // never fires from a raw gesture: it parks here until confirmed.
  pendingReplacement: { cardInstanceId: string; slotIndex: number } | null
  // The piece whose Stat Panel is open. Persistent gauges left the HUD, so
  // tapping a piece's tile is how health is read; the panel follows the
  // piece (and the playout's staggered values) until dismissed or the tap
  // lands on an empty hex. Session transitions close it; ordinary play
  // (submits, advances) leaves it up as a live gauge.
  inspectedEntityId: string | null
  heroRoutePreview: boolean
  // The hex the pointer is currently over, or null when it is off the board.
  // Presentation only: the board already paints where the Hero may step, and
  // this is what the Hand reads to know a move is being lined up at one of
  // those hexes rather than merely available.
  hoveredHexKey: string | null
  showCoordinates: boolean
  lastRejection: string | null
  submit: (action: EncounterActionInput) => void
  advance: () => void
  // Replays the Encounter this session opened, with the same seed or a new
  // one. Which Encounter that is stays fixed for the session.
  restart: (seed?: number) => void
  loadScenario: (scenarioId: string) => void
  timeTravelTo: (index: number) => void
  exportScenario: () => string
  exportRecord: () => Promise<string>
  fireSlot: (slotIndex: number) => void
  hexClicked: (coords: Axial) => void
  cardDroppedOnHex: (cardInstanceId: string, coords: Axial) => void
  cardDroppedOnSlot: (cardInstanceId: string, slotIndex: number) => void
  cancelTargeting: () => void
  confirmReplacement: () => void
  cancelReplacement: () => void
  dismissInspect: () => void
  setDraggingCard: (cardInstanceId: string | null) => void
  setHoveredHex: (key: string | null) => void
  selectCard: (cardInstanceId: string) => void
  setHeroRoutePreview: (previewing: boolean) => void
  toggleCoordinates: () => void
  clearRejection: () => void
}

const catalog = loadCatalog()

export type WorkbenchCatalog = ReturnType<typeof loadCatalog>

export const selectState = (store: WorkbenchStore): EncounterState => store.entries[store.index].state

const SCENARIO_STEP_KINDS = new Set(['load_slot', 'charge_slot', 'fire_slot', 'move_hero', 'discard_for_stamina'])

// Fact ids run globally across the timeline; both live play and Scenario
// replay number through these two helpers.
function numberFacts(firstId: number, produced: ResolvedActionFact[]): FactEntry[] {
  return produced.map((fact, offset) => ({ ...fact, id: firstId + offset }))
}

function nextFactId(entries: HistoryEntry[], index: number): number {
  for (let position = index; position >= 0; position -= 1) {
    const facts = entries[position].facts
    if (facts.length > 0) {
      return facts[facts.length - 1].id + 1
    }
  }
  return 1
}

function initialEntry(encounterId: string, seed: number): HistoryEntry {
  return { label: 'Encounter start', step: null, state: createEncounterState(catalog, encounterId, seed), facts: [] }
}

// A returning player skips the training wheels: the scripted first turn and
// its wider opening Hand belong to the first visit only.
const OPENING_ENCOUNTER_ID = hasFinishedFirstTurn() ? DEFAULT_ENCOUNTER_ID : FIRST_TURN_ENCOUNTER_ID

// Every session transition drops in-flight gesture state the same way.
const CLEARED_INTERACTION = {
  targetingSlotIndex: null,
  selectedCardId: null,
  draggingCardId: null,
  pendingReplacement: null,
  lastRejection: null,
  hoveredHexKey: null,
} as const

export const useWorkbench = create<WorkbenchStore>((set, get) => {
  function pushEntry(label: string, step: ScenarioStep | null, state: EncounterState, produced: ResolvedActionFact[]): void {
    const { entries, index } = get()
    const kept = entries.slice(0, index + 1)
    kept.push({ label, step, state, facts: numberFacts(nextFactId(entries, index), produced) })
    set({ entries: kept, index: kept.length - 1 })
  }

  return {
    catalog,
    encounterId: OPENING_ENCOUNTER_ID,
    seed: catalog.encounters[OPENING_ENCOUNTER_ID].random_seed,
    entries: [initialEntry(OPENING_ENCOUNTER_ID, catalog.encounters[OPENING_ENCOUNTER_ID].random_seed)],
    index: 0,
    activeScenarioId: null,
    sessionStartedAt: new Date().toISOString(),
    targetingSlotIndex: null,
    draggingCardId: null,
    selectedCardId: null,
    pendingReplacement: null,
    inspectedEntityId: null,
    heroRoutePreview: false,
    hoveredHexKey: null,
    showCoordinates: false,
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
        ...CLEARED_INTERACTION,
      })
    },

    timeTravelTo: (index) => {
      const { entries } = get()
      const clamped = Math.max(0, Math.min(index, entries.length - 1))
      set({ index: clamped, inspectedEntityId: null, ...CLEARED_INTERACTION })
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
      const { targetingSlotIndex, selectedCardId } = get()
      const state = selectState(get())
      if (targetingSlotIndex !== null) {
        const target = Object.values(state.board.entities).find(
          (entity) => entity.coords.q === coords.q && entity.coords.r === coords.r && entity.kind === 'minion',
        )
        if (!target) {
          set({ lastRejection: 'The Top Card needs a Minion target.' })
          return
        }
        set({ targetingSlotIndex: null })
        get().submit({ kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: targetingSlotIndex, targetId: target.id })
        return
      }
      // Tap path for movement: a selected Compact Card discards to move the
      // Hero to the tapped hex, mirroring drag-card-to-hex.
      if (selectedCardId !== null) {
        get().cardDroppedOnHex(selectedCardId, coords)
        return
      }
      // A bare tap inspects: a tile holding a piece opens that piece's Stat
      // Panel, an empty hex closes it. Occupancy is the board's question
      // (ADR 0017), so the engine answers it.
      const tappedId = getEntityIdAt(state.board, coords)
      set({ inspectedEntityId: tappedId === '' ? null : tappedId })
    },

    // Dragging a hand card to an adjacent legal hex discards it for 1 Stamina
    // and moves the Hero.
    cardDroppedOnHex: (cardInstanceId, coords) => {
      const state = selectState(get())
      // A dropped card is no longer in flight. The browser skips dragend
      // when the dragged element unmounts under it, so the drop itself is
      // what ends the gesture — otherwise the HUD keeps offering to place a
      // card that has already landed.
      set({ selectedCardId: null, draggingCardId: null, hoveredHexKey: null })
      get().submit({ kind: 'move_hero', sourceId: state.primaryHeroId, destination: coords, cardInstanceId })
    },

    // Dragging onto an empty Slot prepares; onto an occupied Slot it replaces
    // during Loadout and charges during a player window.
    cardDroppedOnSlot: (cardInstanceId, slotIndex) => {
      const state = selectState(get())
      const hero = state.heroes[state.primaryHeroId]
      const slot = hero.actionBar[slotIndex]
      set({ selectedCardId: null, draggingCardId: null, hoveredHexKey: null })
      if (slot.topCard !== null && state.phase !== 'loadout') {
        get().submit({ kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId })
        return
      }
      if (slot.topCard !== null) {
        if (slot.placedThisLoadout) {
          // The Slot began this Loadout empty: re-loading just swaps the
          // tentative card back to hand. Nothing kept is destroyed, so no
          // confirmation stands in the way.
          get().submit({ kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId })
          return
        }
        // Replacing a kept bundle discards all of it — confirm first.
        set({ pendingReplacement: { cardInstanceId, slotIndex }, lastRejection: null })
        return
      }
      get().submit({ kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId })
    },

    confirmReplacement: () => {
      const { pendingReplacement } = get()
      if (pendingReplacement === null) {
        return
      }
      const state = selectState(get())
      set({ pendingReplacement: null })
      get().submit({
        kind: 'load_slot',
        sourceId: state.primaryHeroId,
        slotIndex: pendingReplacement.slotIndex,
        cardInstanceId: pendingReplacement.cardInstanceId,
      })
    },

    cancelReplacement: () => set({ pendingReplacement: null }),

    cancelTargeting: () => set({ targetingSlotIndex: null }),
    dismissInspect: () => set({ inspectedEntityId: null }),
    setDraggingCard: (cardInstanceId) =>
      set({ draggingCardId: cardInstanceId, ...(cardInstanceId !== null ? { selectedCardId: null } : { hoveredHexKey: null }) }),
    // Pointer motion reports every frame it moves and dragover repeats on the
    // same hex; only a change is a change, or the board would re-render on
    // events that said nothing.
    setHoveredHex: (key) => set((store) => (store.hoveredHexKey === key ? store : { hoveredHexKey: key })),
    selectCard: (cardInstanceId) =>
      set((store) => ({
        selectedCardId: store.selectedCardId === cardInstanceId ? null : cardInstanceId,
        targetingSlotIndex: null,
        lastRejection: null,
      })),
    setHeroRoutePreview: (previewing) => set({ heroRoutePreview: previewing }),
    toggleCoordinates: () => set((store) => ({ showCoordinates: !store.showCoordinates })),
    clearRejection: () => set({ lastRejection: null }),
  }
})

export function slotWindowLabel(cardId: string): 'Quick' | 'Slow' {
  return cardWindowSpeed(catalog.cards[cardId]) === 'quick' ? 'Quick' : 'Slow'
}

// Automation hook: the browser smoke and other tools export the live
// session's Scenario and Encounter Record through the window object.
declare global {
  interface Window {
    __workbench?: {
      exportRecord: () => Promise<string>
      exportScenario: () => string
      hexRects: () => { key: string; left: number; right: number; top: number; bottom: number }[]
    }
  }
}
if (typeof window !== 'undefined') {
  window.__workbench = {
    exportRecord: () => useWorkbench.getState().exportRecord(),
    exportScenario: () => useWorkbench.getState().exportScenario(),
    // Every hex's on-screen bounding box, so a browser check can ask whether
    // an overlay covers a hex rather than whether it overlaps the canvas —
    // the canvas is a hexagon's bounding box and its corners are empty.
    hexRects: () => {
      const canvas = document.querySelector('[data-testid="board"] canvas')
      const state = selectState(useWorkbench.getState())
      if (!canvas || !state) {
        return []
      }
      const bounds = canvas.getBoundingClientRect()
      const scale = bounds.width / BOARD_WIDTH
      const half = HEX_SIZE * scale
      return Object.keys(state.board.hexes).map((key) => {
        const [q, r] = key.split(',').map(Number)
        const { x, y } = axialToPixel({ q, r })
        const cx = bounds.left + x * scale
        const cy = bounds.top + y * scale
        return { key, left: cx - half * 0.866, right: cx + half * 0.866, top: cy - half, bottom: cy + half }
      })
    },
  }
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
      encounterId: saved.encounterId ?? OPENING_ENCOUNTER_ID,
      activeScenarioId: saved.activeScenarioId ?? null,
    })
  }
  import.meta.hot.dispose((data) => {
    const { entries, index, seed, encounterId, activeScenarioId } = useWorkbench.getState()
    data.workbench = { entries, index, seed, encounterId, activeScenarioId }
  })
  import.meta.hot.accept()
}
