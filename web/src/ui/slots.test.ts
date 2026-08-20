import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { createEncounterState, hexDistance, parseHexKey, type CardInstance, type EncounterState, type Phase, type SlotState } from '@/engine'
import { slotCanFire, slotOutOfWindow, slotTakesCharge, slotWantedKeywords } from './slots'

// The Slot's two offers, held apart on purpose: what its Top Card is hunting
// for is a fact about the card and holds all window long, while whether it
// can take one right now moves with the Charge Stack and the activation. The
// Action Bar draws the first and dims it by the second.

const catalog = loadCatalog()

function instance(cardId: string, suffix: string): CardInstance {
  return { instanceId: `${cardId}-${suffix}`, cardId }
}

function slotState(slot: Partial<SlotState>): SlotState {
  return { topCard: null, charges: [], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0, ...slot }
}

function opening(phase: Phase): EncounterState {
  return { ...createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID), phase }
}

describe('slot wants', () => {
  it('names the Keyword a Charge Modifier is hunting for', () => {
    // Iron Guard: "Gain 1 Armor for each charged Guard card."
    expect(slotWantedKeywords(catalog, slotState({ topCard: instance('iron_guard', 'top') }))).toEqual(['guard'])
  })

  it('names none for a modifier that counts every charge alike', () => {
    expect(slotWantedKeywords(catalog, slotState({ topCard: instance('steady_strike', 'top') }))).toEqual([])
  })

  it('names none for a Top Card with no modifiers, and none for an empty Slot', () => {
    expect(slotWantedKeywords(catalog, slotState({ topCard: instance('unyielding_step', 'top') }))).toEqual([])
    expect(slotWantedKeywords(catalog, slotState({}))).toEqual([])
  })

  it('still names the want on a Slot that cannot take one right now', () => {
    // The card's appetite is the card's, not the window's: the Action Bar
    // dims the mark rather than dropping it, so it stays learnable.
    const full = slotState({
      topCard: instance('iron_guard', 'top'),
      charges: [instance('steady_strike', 'a'), instance('steady_strike', 'b'), instance('steady_strike', 'c')],
    })
    expect(slotWantedKeywords(catalog, full)).toEqual(['guard'])
    expect(slotTakesCharge(catalog, opening('quick'), full)).toBe(false)
  })
})

describe('slot takes charge', () => {
  const state = opening('quick')

  it('takes one while the stack is short of the Charge Value', () => {
    expect(slotTakesCharge(catalog, state, slotState({ topCard: instance('iron_guard', 'top') }))).toBe(true)
    expect(slotTakesCharge(catalog, state, slotState({ topCard: instance('iron_guard', 'top'), charges: [instance('fortify', 'a')] }))).toBe(true)
  })

  it('takes none once it has activated in this window', () => {
    expect(slotTakesCharge(catalog, state, slotState({ topCard: instance('iron_guard', 'top'), activatedWindow: 'quick' }))).toBe(false)
    // ...but a Slot that fired in the other window is still open here.
    expect(slotTakesCharge(catalog, state, slotState({ topCard: instance('iron_guard', 'top'), activatedWindow: 'slow' }))).toBe(true)
  })

  it('takes none into an empty Slot: there is no Top Card to charge', () => {
    expect(slotTakesCharge(catalog, state, slotState({}))).toBe(false)
  })
})

describe('slot out of window', () => {
  // steady_strike fires quick; fortify fires slow.
  const quickSlot = slotState({ topCard: instance('steady_strike', 'top'), charges: [instance('iron_guard', 'a')] })
  const slowSlot = slotState({ topCard: instance('fortify', 'top'), charges: [instance('iron_guard', 'b')] })

  it('is off in the window its Top Card does not fire in, on in its own', () => {
    expect(slotOutOfWindow(catalog, opening('slow'), quickSlot)).toBe(true)
    expect(slotOutOfWindow(catalog, opening('quick'), quickSlot)).toBe(false)
    expect(slotOutOfWindow(catalog, opening('quick'), slowSlot)).toBe(true)
    expect(slotOutOfWindow(catalog, opening('slow'), slowSlot)).toBe(false)
  })

  it('is never off outside the player windows: there dimming would say nothing', () => {
    for (const phase of ['loadout', 'instant', 'incoming'] as const) {
      expect(slotOutOfWindow(catalog, opening(phase), quickSlot)).toBe(false)
      expect(slotOutOfWindow(catalog, opening(phase), slowSlot)).toBe(false)
    }
  })

  it('yields to Fired: a spent Slot is spent, not parked', () => {
    expect(slotOutOfWindow(catalog, opening('slow'), { ...quickSlot, activatedWindow: 'quick' })).toBe(false)
  })

  it('is never off for an empty Slot, or once the Encounter ends', () => {
    expect(slotOutOfWindow(catalog, opening('slow'), slotState({}))).toBe(false)
    expect(slotOutOfWindow(catalog, { ...opening('slow'), active: false }, quickSlot)).toBe(false)
  })
})

describe('slot can fire', () => {
  // A charged, in-window Slot standing next to Embermaw.
  function armed(cardId: string, phase: Phase = 'quick'): EncounterState {
    const state = opening(phase)
    state.heroes[state.primaryHeroId].actionBar[0] = slotState({
      topCard: instance(cardId, 'top'),
      charges: [instance('iron_guard', 'a')],
    })
    return state
  }

  it('lights a charged Slot whose Top Card matches the window', () => {
    expect(slotCanFire(catalog, armed('steady_strike'), 0)).toBe(true)
  })

  it('leaves it dark from outside the Top Card\'s reach (D-070)', () => {
    // Reach is a rule about where the Hero stands, so the same charged Slot
    // answers differently from two hexes. The plate has to follow it, or it
    // asserts a shot the resolver refuses.
    const state = armed('steady_strike')
    const bossCoords = state.board.entities[state.bossId].coords
    const furthest = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .sort((left, right) => hexDistance(right, bossCoords) - hexDistance(left, bossCoords))[0]
    expect(hexDistance(furthest, bossCoords)).toBeGreaterThan(catalog.cards.steady_strike.range_tiles)
    state.board.entities[state.primaryHeroId].coords = furthest
    expect(slotCanFire(catalog, state, 0)).toBe(false)
  })

  it('leaves a Minion-seeking Slot dark while the board holds no Minion to hit', () => {
    // The other half of the same predicate, and the one that was always true:
    // Sweeping Blow needs a piece, and the opening board has none.
    expect(slotCanFire(catalog, armed('sweeping_blow'), 0)).toBe(false)
  })

  it('leaves it dark out of window, uncharged, or already fired', () => {
    expect(slotCanFire(catalog, armed('steady_strike', 'slow'), 0)).toBe(false)
    const uncharged = armed('steady_strike')
    uncharged.heroes[uncharged.primaryHeroId].actionBar[0].charges = []
    expect(slotCanFire(catalog, uncharged, 0)).toBe(false)
    const spent = armed('steady_strike')
    spent.heroes[spent.primaryHeroId].actionBar[0].activatedWindow = 'quick'
    expect(slotCanFire(catalog, spent, 0)).toBe(false)
  })
})
