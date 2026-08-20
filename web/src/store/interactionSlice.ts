import type { StateCreator } from 'zustand'
import { fireTargeting, getEntityIdAt, hexKey, isLegalMove, legality, type Axial, type EncounterActionInput } from '@/engine'
import { catalog } from './catalog'
import { selectState } from './selectors'
import type { WorkbenchStore } from './workbench'

// In-flight gesture state: everything the player has begun but not yet
// committed to the Encounter. None of it is on the timeline, none of it
// survives a session transition, and none of it is rules — the engine is
// asked every question about legality and targeting (ADR 0013), so this
// slice only decides which gesture the player is in the middle of.

export interface InteractionSlice {
  targetingSlotIndex: number | null
  draggingCardId: string | null
  // Tap path (accessibility contract): a selected Compact Card acts on the
  // next tapped Slot or move destination, mirroring the drag gestures.
  selectedCardId: string | null
  // Slot Replacement discards the Top Card and its whole Charge Stack, so it
  // never fires from a raw gesture: it parks here until confirmed.
  pendingReplacement: { cardInstanceId: string; slotIndex: number } | null
  // A move dragged straight from the Hero. The gesture names a destination
  // and nothing else, but every move is paid for with a discarded hand card
  // (ADR 0011), so it parks here until the player picks the card that pays.
  pendingMove: { destination: Axial } | null
  // The piece whose Stat Panel is open. Persistent gauges left the HUD, so
  // tapping a piece's tile is how health is read; the panel follows the
  // piece (and the playout's staggered values) until dismissed or the tap
  // lands on an empty hex. Session transitions close it; ordinary play
  // (submits, advances) leaves it up as a live gauge.
  inspectedEntityId: string | null
  // Bumped when the player taps the primary Hero's tile: the Hero Frame is
  // the Hero's readout (D-065), so the tap pulses the frame instead of
  // opening a Stat Panel. A counter rather than a flag, so every tap replays
  // the pulse.
  heroFramePulse: number
  heroRoutePreview: boolean
  // The hex the pointer is currently over, or null when it is off the board.
  // Presentation only: the board already paints where the Hero may step, and
  // this is what the Hand reads to know a move is being lined up at one of
  // those hexes rather than merely available.
  hoveredHexKey: string | null
  showCoordinates: boolean
  lastRejection: string | null
  fireSlot: (slotIndex: number) => void
  hexClicked: (coords: Axial) => void
  cardDroppedOnHex: (cardInstanceId: string, coords: Axial) => void
  cardDroppedOnSlot: (cardInstanceId: string, slotIndex: number) => void
  heroDraggedToHex: (coords: Axial) => void
  payForMove: (cardInstanceId: string) => void
  cancelMove: () => void
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

// Every session transition drops in-flight gesture state the same way. The
// session slice spreads this into its own sets, which is the whole reason it
// is a value rather than an action: a restart and a time travel must not be
// able to disagree about what "no gesture in flight" means.
export const CLEARED_INTERACTION = {
  targetingSlotIndex: null,
  selectedCardId: null,
  draggingCardId: null,
  pendingReplacement: null,
  pendingMove: null,
  lastRejection: null,
  hoveredHexKey: null,
} as const

// The fields a fresh session starts from, gestures included. Inspection is
// listed separately from CLEARED_INTERACTION because undo deliberately keeps
// an open Stat Panel and a session transition does not.
export const INITIAL_INTERACTION = {
  ...CLEARED_INTERACTION,
  inspectedEntityId: null,
  heroFramePulse: 0,
  heroRoutePreview: false,
  showCoordinates: false,
} as const

export const createInteractionSlice: StateCreator<WorkbenchStore, [], [], InteractionSlice> = (set, get) => ({
  ...INITIAL_INTERACTION,

  // Targeting mode is an engine query: the Workbench never decides which
  // Card payloads need a Piece or a hex.
  fireSlot: (slotIndex) => {
    const state = selectState(get())
    if (fireTargeting(catalog, state, state.primaryHeroId, slotIndex).mode !== 'none') {
      set({ targetingSlotIndex: slotIndex, lastRejection: null })
      return
    }
    get().submit({ kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex })
  },

  hexClicked: (coords) => {
    const { targetingSlotIndex, selectedCardId, pendingMove } = get()
    const state = selectState(get())
    // A move waiting on a card is answered in the Hand. Touching the board
    // again is the player reconsidering the hex, so the offer comes down —
    // and a fresh drag from the Hero simply names a new destination.
    if (pendingMove !== null) {
      set({ pendingMove: null })
      return
    }
    if (targetingSlotIndex !== null) {
      const targeting = fireTargeting(catalog, state, state.primaryHeroId, targetingSlotIndex)
      if (targeting.mode === 'hex') {
        const action: EncounterActionInput = {
          kind: 'fire_slot',
          sourceId: state.primaryHeroId,
          slotIndex: targetingSlotIndex,
          targetHex: coords,
        }
        const verdict = legality(catalog, state, action)
        if (!verdict.legal) {
          set({ lastRejection: verdict.reason })
          return
        }
        set({ targetingSlotIndex: null })
        get().submit(action)
        return
      }
      const targetId = getEntityIdAt(state.board, coords)
      const action: EncounterActionInput = {
        kind: 'fire_slot',
        sourceId: state.primaryHeroId,
        slotIndex: targetingSlotIndex,
        ...(targetId === '' ? {} : { targetId }),
      }
      const verdict = legality(catalog, state, action)
      if (!verdict.legal) {
        set({ lastRejection: verdict.reason })
        return
      }
      set({ targetingSlotIndex: null })
      get().submit(action)
      return
    }
    // Tap path for movement: a selected Compact Card discards to move the
    // Hero to the tapped hex, mirroring drag-card-to-hex.
    if (selectedCardId !== null) {
      get().cardDroppedOnHex(selectedCardId, coords)
      return
    }
    // A bare tap inspects: a tile holding an Enemy opens that piece's Stat
    // Panel, an empty hex closes it. Occupancy is the board's question
    // (ADR 0017), so the engine answers it. The Hero's readout is the
    // persistent Hero Frame (D-065): tapping the Hero pulses the frame —
    // the tap points at the chrome that answers it — and closes any open
    // Enemy panel rather than opening one.
    const tappedId = getEntityIdAt(state.board, coords)
    if (tappedId !== '' && state.heroes[tappedId] !== undefined) {
      set({ inspectedEntityId: null, heroFramePulse: get().heroFramePulse + 1 })
      return
    }
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

  // Dragging the Hero itself onto a legal hex. The gesture is the whole
  // sentence except its price, so this only agrees the destination: the
  // move resolves once a card is named to pay for it. Every reason the
  // move cannot happen is answered here rather than through a rejected
  // action, so a refused drag never costs a card.
  heroDraggedToHex: (coords) => {
    const state = selectState(get())
    // A release that landed off the board is not an intent to move.
    if (!state.active || state.board.hexes[hexKey(coords)] === undefined) {
      return
    }
    // A Top Card waiting for a Minion owns the next hex the player names,
    // however they name it: dragging from the Hero to the Minion picks it,
    // rather than reading as a move onto an occupied hex.
    if (get().targetingSlotIndex !== null) {
      get().hexClicked(coords)
      return
    }
    if (state.phase !== 'quick') {
      set({ lastRejection: 'The Hero moves only during the Quick Window.' })
      return
    }
    if (!isLegalMove(state.board, state.primaryHeroId, coords)) {
      set({ lastRejection: 'That hex is not a legal move destination.' })
      return
    }
    if (state.heroes[state.primaryHeroId].hand.length === 0) {
      set({ lastRejection: 'Moving costs a card, and the Hand is empty.' })
      return
    }
    set({ pendingMove: { destination: coords }, lastRejection: null })
  },

  // The named card pays and the Hero moves — through the same handler the
  // card drag and the tap path use, so all three gestures resolve one way.
  payForMove: (cardInstanceId) => {
    const { pendingMove } = get()
    if (pendingMove === null) {
      return
    }
    set({ pendingMove: null })
    get().cardDroppedOnHex(cardInstanceId, pendingMove.destination)
  },

  cancelMove: () => set({ pendingMove: null }),

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
})
