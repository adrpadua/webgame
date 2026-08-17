import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { createEncounterState, type CardInstance, type EncounterState, type Phase, type SlotState } from '@/engine'
import { slotTakesCharge, slotWantedKeywords } from './slots'

// The Slot's two offers, held apart on purpose: what its Top Card is hunting
// for is a fact about the card and holds all window long, while whether it
// can take one right now moves with the Charge Stack and the activation. The
// Action Bar draws the first and dims it by the second.

const catalog = loadCatalog()

function instance(cardId: string, suffix: string): CardInstance {
  return { instanceId: `${cardId}-${suffix}`, cardId }
}

function slotState(slot: Partial<SlotState>): SlotState {
  return { topCard: null, charges: [], activatedWindow: null, placedThisLoadout: false, ...slot }
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
