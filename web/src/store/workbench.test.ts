import { beforeEach, describe, expect, it } from 'vitest'
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
