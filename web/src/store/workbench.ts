import { create } from 'zustand'
import { loadCatalog } from '@/content'
import {
  advancePhase,
  createEncounterState,
  resolve,
  cardWindowSpeed,
  type Axial,
  type EncounterActionInput,
  type EncounterState,
  type ResolvedActionFact,
} from '@/engine'

const ENCOUNTER_ID = 'embermaw_prototype'

export interface FactEntry extends ResolvedActionFact {
  id: number
}

interface WorkbenchStore {
  catalog: ReturnType<typeof loadCatalog>
  seed: number
  state: EncounterState
  facts: FactEntry[]
  targetingSlotIndex: number | null
  draggingCardId: string | null
  lastRejection: string | null
  submit: (action: EncounterActionInput) => void
  advance: () => void
  restart: (seed?: number) => void
  fireSlot: (slotIndex: number) => void
  hexClicked: (coords: Axial) => void
  cardDroppedOnHex: (cardInstanceId: string, coords: Axial) => void
  cardDroppedOnSlot: (cardInstanceId: string, slotIndex: number) => void
  cancelTargeting: () => void
  setDraggingCard: (cardInstanceId: string | null) => void
  clearRejection: () => void
}

const catalog = loadCatalog()

function appendFacts(existing: FactEntry[], produced: ResolvedActionFact[]): FactEntry[] {
  let nextId = existing.length > 0 ? existing[existing.length - 1].id + 1 : 1
  const entries = produced.map((fact) => ({ ...fact, id: nextId++ }))
  return [...existing, ...entries]
}

export const useWorkbench = create<WorkbenchStore>((set, get) => ({
  catalog,
  seed: catalog.encounters[ENCOUNTER_ID].random_seed,
  state: createEncounterState(catalog, ENCOUNTER_ID),
  facts: [],
  targetingSlotIndex: null,
  draggingCardId: null,
  lastRejection: null,

  submit: (action) => {
    const { state, facts } = get()
    const result = resolve(catalog, state, action)
    const submitted = result.facts[0]
    set({
      state: result.state,
      facts: appendFacts(facts, result.facts),
      lastRejection: submitted && !submitted.succeeded ? submitted.reason : null,
    })
  },

  advance: () => {
    const { state, facts } = get()
    const result = advancePhase(catalog, state)
    set({ state: result.state, facts: appendFacts(facts, result.facts), targetingSlotIndex: null, lastRejection: null })
  },

  restart: (seed) => {
    const nextSeed = seed ?? get().seed
    set({
      seed: nextSeed,
      state: createEncounterState(catalog, ENCOUNTER_ID, nextSeed),
      facts: [],
      targetingSlotIndex: null,
      draggingCardId: null,
      lastRejection: null,
    })
  },

  // Tapping a prepared Slot: a piece-targeting Top Card first needs a Minion
  // selected on the board; everything else fires immediately.
  fireSlot: (slotIndex) => {
    const { state } = get()
    const hero = state.heroes[state.primaryHeroId]
    const topCard = hero.actionBar[slotIndex]?.topCard
    if (topCard && catalog.cards[topCard.cardId].damage > 0) {
      set({ targetingSlotIndex: slotIndex, lastRejection: null })
      return
    }
    get().submit({ kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex })
  },

  hexClicked: (coords) => {
    const { state, targetingSlotIndex } = get()
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
    const { state } = get()
    get().submit({ kind: 'move_hero', sourceId: state.primaryHeroId, destination: coords, cardInstanceId })
  },

  // Dragging onto an empty Slot prepares; onto an occupied Slot it replaces
  // during Loadout and charges during a player window.
  cardDroppedOnSlot: (cardInstanceId, slotIndex) => {
    const { state } = get()
    const hero = state.heroes[state.primaryHeroId]
    const slot = hero.actionBar[slotIndex]
    const kind = slot.topCard !== null && state.phase !== 'loadout' ? 'charge_slot' : 'load_slot'
    get().submit({ kind, sourceId: state.primaryHeroId, slotIndex, cardInstanceId })
  },

  cancelTargeting: () => set({ targetingSlotIndex: null }),
  setDraggingCard: (cardInstanceId) => set({ draggingCardId: cardInstanceId }),
  clearRejection: () => set({ lastRejection: null }),
}))

export function slotWindowLabel(cardId: string): 'Quick' | 'Slow' {
  return cardWindowSpeed(catalog.cards[cardId]) === 'quick' ? 'Quick' : 'Slow'
}

// Keep the running Encounter alive across hot updates: rules and UI edits
// re-execute this module, then re-adopt the previous session's state.
if (import.meta.hot) {
  const saved = import.meta.hot.data.workbench as Partial<WorkbenchStore> | undefined
  if (saved?.state) {
    useWorkbench.setState({ state: saved.state, facts: saved.facts ?? [], seed: saved.seed })
  }
  import.meta.hot.dispose((data) => {
    const { state, facts, seed } = useWorkbench.getState()
    data.workbench = { state, facts, seed }
  })
  import.meta.hot.accept()
}
