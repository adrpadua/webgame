import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { createEncounterState, hexKey, type CardInstance, type EncounterState, type Phase, type SlotState } from '@/engine'
import { handFace, movePrepped, payingKeywords, shownKeywords, type MoveGesture } from './handFace'

// The Hand's face is derived, never set: it has to follow the rules that make
// a card in hand mean something different in the Quick Window than in the
// Loadout Step, and follow the gesture the player is halfway through.

const catalog = loadCatalog()

const NO_GESTURE: MoveGesture = { hoveredHexKey: null, draggingCardId: null, selectedCardId: null, heroRoutePreview: false }

function opening(phase: Phase): EncounterState {
  return { ...createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID), phase }
}

function instance(cardId: string, suffix: string): CardInstance {
  return { instanceId: `${cardId}-${suffix}`, cardId }
}

// Places a Top Card in Slot 0 without going through a Loadout, so a case can
// name the exact Slot state it is about.
function withSlot(state: EncounterState, slot: Partial<SlotState>): EncounterState {
  const hero = state.heroes[state.primaryHeroId]
  const [first, ...rest] = hero.actionBar
  return {
    ...state,
    heroes: { ...state.heroes, [hero.id]: { ...hero, actionBar: [{ ...first, ...slot }, ...rest] } },
  }
}

// A hex the Hero could step to on the opening board, and one it could not.
function adjacentHexKey(state: EncounterState): string {
  const hero = state.board.entities[state.primaryHeroId]
  return hexKey({ q: hero.coords.q - 1, r: hero.coords.r })
}

describe('hand face', () => {
  it('shows the card as itself where it is chosen as a Top Card, or cannot be played at all', () => {
    expect(handFace(opening('loadout'), false)).toBe('card')
    expect(handFace(opening('instant'), false)).toBe('card')
    expect(handFace(opening('incoming'), false)).toBe('card')
  })

  it('leads with Keywords in both player windows', () => {
    expect(handFace(opening('quick'), false)).toBe('keywords')
    expect(handFace(opening('slow'), false)).toBe('keywords')
  })

  it('becomes movement currency while a move is being lined up', () => {
    expect(handFace(opening('quick'), true)).toBe('stamina')
  })

  it('keeps the card face once the Encounter has ended', () => {
    expect(handFace({ ...opening('quick'), active: false }, false)).toBe('card')
  })
})

describe('move prep', () => {
  it('reads a dragged card held over an adjacent legal hex', () => {
    const state = opening('quick')
    expect(movePrepped(state, state.primaryHeroId, { ...NO_GESTURE, hoveredHexKey: adjacentHexKey(state), draggingCardId: 'card-1' })).toBe(true)
  })

  it('reads a selected card, and the Hero held for a route preview', () => {
    const state = opening('quick')
    const hoveredHexKey = adjacentHexKey(state)
    expect(movePrepped(state, state.primaryHeroId, { ...NO_GESTURE, hoveredHexKey, selectedCardId: 'card-1' })).toBe(true)
    expect(movePrepped(state, state.primaryHeroId, { ...NO_GESTURE, hoveredHexKey, heroRoutePreview: true })).toBe(true)
  })

  it('needs a hex that is hovered, adjacent, and legal', () => {
    const state = opening('quick')
    const hero = state.board.entities[state.primaryHeroId]
    expect(movePrepped(state, state.primaryHeroId, { ...NO_GESTURE, draggingCardId: 'card-1' })).toBe(false)
    // The Hero's own tile: a legal move of zero length is still not a move.
    expect(movePrepped(state, state.primaryHeroId, { ...NO_GESTURE, hoveredHexKey: hexKey(hero.coords), draggingCardId: 'card-1' })).toBe(false)
    // Two hexes out, and off the board entirely.
    expect(movePrepped(state, state.primaryHeroId, { ...NO_GESTURE, hoveredHexKey: hexKey({ q: hero.coords.q - 2, r: hero.coords.r }), draggingCardId: 'card-1' })).toBe(false)
    expect(movePrepped(state, state.primaryHeroId, { ...NO_GESTURE, hoveredHexKey: '9,9', draggingCardId: 'card-1' })).toBe(false)
  })

  it('never reads a move outside the one window movement is legal in', () => {
    const state = opening('slow')
    const gesture = { ...NO_GESTURE, hoveredHexKey: adjacentHexKey(state), draggingCardId: 'card-1' }
    expect(movePrepped(state, state.primaryHeroId, gesture)).toBe(false)
    // Slow wears the Keyword face, and no gesture over the board changes it:
    // there is nothing to spend Stamina on until the next Quick Window.
    expect(handFace(state, movePrepped(state, state.primaryHeroId, gesture))).toBe('keywords')
  })

  it('lines up nothing with an empty gesture', () => {
    const state = opening('quick')
    expect(movePrepped(state, state.primaryHeroId, { ...NO_GESTURE, hoveredHexKey: adjacentHexKey(state) })).toBe(false)
  })
})

describe('shown keywords', () => {
  it('leaves the Role marker off a card in hand', () => {
    // Every Elian card is tagged tank, so the mark tells two cards apart on
    // none of them.
    expect(catalog.cards.iron_guard.tags).toEqual(['tank', 'guard'])
    expect(shownKeywords(catalog, catalog.cards.iron_guard.tags)).toEqual(['guard'])
  })

  it('keeps the authored order of everything else', () => {
    expect(shownKeywords(catalog, ['attack', 'tank', 'guard'])).toEqual(['attack', 'guard'])
  })

  it('keeps a Role marker when it is the only Keyword the card has', () => {
    expect(shownKeywords(catalog, ['tank'])).toEqual(['tank'])
  })

  it('passes through a Keyword it has never heard of', () => {
    expect(shownKeywords(catalog, ['nonesuch'])).toEqual(['nonesuch'])
  })
})

describe('paying keywords', () => {
  it('names the Keywords a loaded Top Card would pay off', () => {
    // Iron Guard: "Gain 1 Armor for each charged Guard card."
    const state = withSlot(opening('quick'), { topCard: instance('iron_guard', 'top') })
    expect([...payingKeywords(catalog, state, state.primaryHeroId)]).toEqual(['guard'])
  })

  it('names none for a modifier that counts every charge alike', () => {
    // Steady Strike pays for the Charge itself, whatever Keyword brought it,
    // so no card in hand is the better one to tuck.
    const state = withSlot(opening('quick'), { topCard: instance('steady_strike', 'top') })
    expect(payingKeywords(catalog, state, state.primaryHeroId).size).toBe(0)
  })

  it('stays quiet for a Slot that cannot take the card', () => {
    const full = withSlot(opening('quick'), {
      topCard: instance('iron_guard', 'top'),
      charges: [instance('steady_strike', 'a'), instance('steady_strike', 'b'), instance('steady_strike', 'c')],
    })
    expect(payingKeywords(catalog, full, full.primaryHeroId).size).toBe(0)
    const fired = withSlot(opening('quick'), { topCard: instance('iron_guard', 'top'), activatedWindow: 'quick' })
    expect(payingKeywords(catalog, fired, fired.primaryHeroId).size).toBe(0)
  })

  it('stays quiet with no Top Card anywhere', () => {
    expect(payingKeywords(catalog, opening('quick'), 'elian').size).toBe(0)
  })
})
