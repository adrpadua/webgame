import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hexKey, isLegalMove, neighbors, type Axial } from '@/engine'
import { selectState, useWorkbench } from './workbench'

// The Hero-drag movement gesture. The board reports a destination and nothing
// else, so everything the gesture cannot know — the window, the legality of
// the hex, and which card pays for it — is settled here.

function store() {
  return useWorkbench.getState()
}

function state() {
  return selectState(store())
}

function heroCoords(): Axial {
  return state().board.entities[state().primaryHeroId].coords
}

function firstLegalDestination(): Axial {
  const destination = neighbors(state().board.hexes, heroCoords()).find((candidate) => isLegalMove(state().board, state().primaryHeroId, candidate))
  if (!destination) {
    throw new Error('The opening board must leave the Hero somewhere to step.')
  }
  return destination
}

function openQuickWindow(): void {
  store().restart()
  while (state().phase !== 'quick') {
    store().advance()
  }
}

afterEach(() => {
  delete store().catalog.cards.burst_test
})

describe('dragging the Hero to a hex', () => {
  beforeEach(() => {
    openQuickWindow()
  })

  it('agrees the destination without spending anything', () => {
    const handBefore = state().heroes[state().primaryHeroId].hand.length
    const stepsBefore = store().entries.length
    const destination = firstLegalDestination()

    store().heroDraggedToHex(destination)

    expect(store().pendingMove).toEqual({ destination })
    expect(store().lastRejection).toBeNull()
    // Nothing is paid and nothing reaches the timeline until a card is named.
    expect(state().heroes[state().primaryHeroId].hand).toHaveLength(handBefore)
    expect(store().entries).toHaveLength(stepsBefore)
  })

  it('moves the Hero and discards the named card once one is picked', () => {
    const hero = state().heroes[state().primaryHeroId]
    const paying = hero.hand[1]
    const destination = firstLegalDestination()

    store().heroDraggedToHex(destination)
    store().payForMove(paying.instanceId)

    expect(store().pendingMove).toBeNull()
    expect(heroCoords()).toEqual(destination)
    const after = state().heroes[state().primaryHeroId]
    expect(after.hand.map((card) => card.instanceId)).not.toContain(paying.instanceId)
    expect(after.discard.map((card) => card.instanceId)).toContain(paying.instanceId)
  })

  it('costs nothing when the prompt is dismissed', () => {
    const handBefore = state().heroes[state().primaryHeroId].hand.length
    const stepsBefore = store().entries.length
    const origin = heroCoords()

    store().heroDraggedToHex(firstLegalDestination())
    store().cancelMove()

    expect(store().pendingMove).toBeNull()
    expect(heroCoords()).toEqual(origin)
    expect(state().heroes[state().primaryHeroId].hand).toHaveLength(handBefore)
    expect(store().entries).toHaveLength(stepsBefore)
  })

  it('refuses an illegal destination before any card is asked for', () => {
    const bossCoords = state().board.entities[state().bossId].coords

    store().heroDraggedToHex(bossCoords)

    expect(store().pendingMove).toBeNull()
    expect(store().lastRejection).toContain('not a legal move destination')
  })

  it('says so when the window is wrong', () => {
    const destination = firstLegalDestination()
    while (state().phase === 'quick') {
      store().advance()
    }

    store().heroDraggedToHex(destination)

    expect(store().pendingMove).toBeNull()
    expect(store().lastRejection).toContain('Quick Window')
  })

  it('pulses the Hero Frame on a Hero tap instead of opening a panel (D-065)', () => {
    openQuickWindow()
    const pulseBefore = store().heroFramePulse
    store().hexClicked(heroCoords())
    // The Hero's readout is the persistent Hero Frame: the tap points at it.
    expect(store().inspectedEntityId).toBeNull()
    expect(store().heroFramePulse).toBe(pulseBefore + 1)
    // An Enemy tap still opens the Stat Panel, and it stays Enemy-only.
    store().hexClicked(state().board.entities[state().bossId].coords)
    expect(store().inspectedEntityId).toBe(state().bossId)
  })

  it('takes the offer down when the board is touched again', () => {
    const origin = heroCoords()
    store().heroDraggedToHex(firstLegalDestination())

    store().hexClicked(origin)

    expect(store().pendingMove).toBeNull()
    // The tap that called the move off is spent doing exactly that: it does
    // not also open the piece's Stat Panel underneath.
    expect(store().inspectedEntityId).toBeNull()
    expect(heroCoords()).toEqual(origin)
  })

  it('picks the target instead while a Top Card is waiting for a Minion', () => {
    const destination = firstLegalDestination()
    state().heroes[state().primaryHeroId].actionBar[0] = {
      topCard: { instanceId: 'targeting-card', cardId: 'sweeping_blow' },
      charges: [{ instanceId: 'targeting-charge', cardId: 'iron_guard' }],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
    useWorkbench.setState({ targetingSlotIndex: 0 })

    store().heroDraggedToHex(destination)

    // An empty hex is no Minion, so the targeting prompt says so and holds.
    expect(store().pendingMove).toBeNull()
    expect(store().targetingSlotIndex).toBe(0)
    expect(store().lastRejection).toContain('Minion')
    useWorkbench.setState({ targetingSlotIndex: null, lastRejection: null })
  })

  it('ignores a release that landed off the board', () => {
    const offBoard = { q: 99, r: 99 }
    expect(state().board.hexes[hexKey(offBoard)]).toBeUndefined()

    store().heroDraggedToHex(offBoard)

    expect(store().pendingMove).toBeNull()
    expect(store().lastRejection).toBeNull()
  })
})

describe('targeting a burst Card', () => {
  beforeEach(() => {
    openQuickWindow()
    store().catalog.cards.burst_test = {
      ...store().catalog.cards.sweeping_blow,
      id: 'burst_test',
      title: 'Burst Test',
      target_type: 'hex',
      range_tiles: 1,
      damage: 1,
      burst_radius: 1,
    }
    const live = state()
    live.board.entities.burst_whelp = {
      id: 'burst_whelp',
      kind: 'minion',
      coords: { q: -1, r: 0 },
      health: 2,
      maxHealth: 2,
      facing: 0,
      team: 'enemy',
      title: 'Burst Whelp',
    }
    live.heroes[live.primaryHeroId].actionBar[0] = {
      topCard: { instanceId: 'burst', cardId: 'burst_test' },
      charges: [{ instanceId: 'charge', cardId: 'iron_guard' }],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
  })

  it('fires at an empty legal hex and submits the centre to the engine', () => {
    const emptyCenter = { q: 0, r: -1 }
    expect(Object.values(state().board.entities).some((entity) => hexKey(entity.coords) === hexKey(emptyCenter))).toBe(false)

    store().fireSlot(0)
    expect(store().targetingSlotIndex).toBe(0)
    store().hexClicked(emptyCenter)

    expect(store().targetingSlotIndex).toBeNull()
    expect(state().board.entities.burst_whelp.health).toBe(1)
    expect(store().entries.at(-1)?.step).toEqual({
      action: { kind: 'fire_slot', sourceId: state().primaryHeroId, slotIndex: 0, targetHex: emptyCenter },
    })
  })

  it('keeps targeting open when the chosen hex is out of range', () => {
    const entriesBefore = store().entries.length
    store().fireSlot(0)
    store().hexClicked({ q: -2, r: 0 })

    expect(store().targetingSlotIndex).toBe(0)
    expect(store().entries).toHaveLength(entriesBefore)
    expect(store().lastRejection).toContain('outside')
  })
})
