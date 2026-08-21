import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { createEncounterState, hexDistance, parseHexKey, type CardInstance, type EncounterState, type Phase, type SlotState } from '@/engine'
import {
  readSlot,
  slotCanFire,
  slotIncoming,
  slotLabel,
  slotOutOfWindow,
  slotStateName,
  slotTakesCharge,
  slotTone,
  slotWantedKeywords,
  type SlotIncoming,
  type SlotStateName,
} from './slots'

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
    expect(slotCanFire(catalog, armed('steady_strike'), 'elian', 0)).toBe(true)
  })

  it('leaves it dark from outside the Top Card\'s reach (D-073)', () => {
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
    expect(slotCanFire(catalog, state, state.primaryHeroId, 0)).toBe(false)
  })

  it('leaves a Minion-seeking Slot dark while the board holds no Minion to hit', () => {
    // The other half of the same predicate, and the one that was always true:
    // Sweeping Blow needs a piece, and the opening board has none.
    expect(slotCanFire(catalog, armed('sweeping_blow'), 'elian', 0)).toBe(false)
  })

  it('leaves it dark out of window, uncharged, or already fired', () => {
    expect(slotCanFire(catalog, armed('steady_strike', 'slow'), 'elian', 0)).toBe(false)
    const uncharged = armed('steady_strike')
    uncharged.heroes[uncharged.primaryHeroId].actionBar[0].charges = []
    expect(slotCanFire(catalog, uncharged, uncharged.primaryHeroId, 0)).toBe(false)
    const spent = armed('steady_strike')
    spent.heroes[spent.primaryHeroId].actionBar[0].activatedWindow = 'quick'
    expect(slotCanFire(catalog, spent, spent.primaryHeroId, 0)).toBe(false)
  })
})

describe('slot state name', () => {
  const cap = 3

  it('names the stack: empty, loaded, charged, full', () => {
    expect(slotStateName(slotState({}), 0)).toBe('empty')
    expect(slotStateName(slotState({ topCard: instance('iron_guard', 'top') }), cap)).toBe('loaded')
    expect(slotStateName(slotState({ topCard: instance('iron_guard', 'top'), charges: [instance('fortify', 'a')] }), cap)).toBe('charged')
    const full = slotState({
      topCard: instance('iron_guard', 'top'),
      charges: [instance('fortify', 'a'), instance('fortify', 'b'), instance('fortify', 'c')],
    })
    expect(slotStateName(full, cap)).toBe('full')
  })

  // Fired outranks the stack: a spent Slot still holds its Charges until the
  // window ends, and reading it as Full would say it can fire again.
  it('names a spent Slot fired however charged it is', () => {
    const spent = slotState({
      topCard: instance('iron_guard', 'top'),
      charges: [instance('fortify', 'a'), instance('fortify', 'b'), instance('fortify', 'c')],
      activatedWindow: 'quick',
    })
    expect(slotStateName(spent, cap)).toBe('fired')
  })
})

describe('what an in-hand card would do to a Slot', () => {
  it('answers nothing when the player is holding nothing', () => {
    expect(slotIncoming(catalog, opening('quick'), 'elian', slotState({}), 0, null)).toBeNull()
  })

  it('prepares into an empty Slot, and charges an occupied one in a player window', () => {
    const state = opening('quick')
    const card = state.heroes[state.primaryHeroId].hand[0].instanceId
    expect(slotIncoming(catalog, state, state.primaryHeroId, slotState({}), 0, card)?.action).toBe('Prepare')
    expect(slotIncoming(catalog, state, state.primaryHeroId, slotState({ topCard: instance('iron_guard', 'top') }), 0, card)?.action).toBe('Charge')
  })

  // The Loadout distinction the confirmation modal exists for: a card placed
  // this Loadout into a Slot that began it empty is tentative, so landing
  // another swaps it back to hand. Replace destroys a kept bundle.
  it('swaps a tentative card in Loadout and replaces a kept one', () => {
    const state = opening('loadout')
    const card = state.heroes[state.primaryHeroId].hand[0].instanceId
    const tentative = slotState({ topCard: instance('iron_guard', 'top'), placedThisLoadout: true })
    const kept = slotState({ topCard: instance('iron_guard', 'top'), placedThisLoadout: false })
    expect(slotIncoming(catalog, state, state.primaryHeroId, tentative, 0, card)?.action).toBe('Swap')
    expect(slotIncoming(catalog, state, state.primaryHeroId, kept, 0, card)?.action).toBe('Replace')
  })

  // Legality is the engine's answer, not the plate's (ADR 0013). Charging
  // during a Boss row is refused, so the badge is struck through rather than
  // promising a move the rules would reject.
  it('takes its legality from the engine', () => {
    const bossRow = opening('instant')
    const card = bossRow.heroes[bossRow.primaryHeroId].hand[0].instanceId
    expect(slotIncoming(catalog, bossRow, bossRow.primaryHeroId, slotState({ topCard: instance('iron_guard', 'top') }), 0, card)?.legal).toBe(false)
  })
})

describe('the tone a plate wears', () => {
  function tone(over: Partial<Parameters<typeof slotTone>[0]>) {
    return slotTone({ incoming: null, canFire: false, outOfWindow: false, stateName: 'loaded', hasCard: true, ...over })
  }
  const offer: SlotIncoming = { action: 'Charge', legal: true }

  it('reads the plain states', () => {
    expect(tone({ stateName: 'empty', hasCard: false })).toBe('empty')
    expect(tone({})).toBe('loaded')
    expect(tone({ canFire: true })).toBe('live')
    expect(tone({ stateName: 'full' })).toBe('live')
    expect(tone({ stateName: 'fired' })).toBe('off')
    expect(tone({ outOfWindow: true })).toBe('off')
  })

  it('marks a Replace apart from every other offer', () => {
    expect(tone({ incoming: offer })).toBe('offer')
    expect(tone({ incoming: { action: 'Replace', legal: true } })).toBe('offer-replace')
  })

  // The precedence, which is the whole reason this is a function. An offer
  // outranks everything: charging is the move an off Slot still owns.
  it('lets a legal offer outrank an out-of-window Slot', () => {
    expect(tone({ incoming: offer, outOfWindow: true, stateName: 'charged' })).toBe('offer')
  })

  it('ignores an offer the rules would refuse', () => {
    expect(tone({ incoming: { action: 'Charge', legal: false }, canFire: true })).toBe('live')
  })

  // Out-of-window is consulted before Full on purpose: Full's gold says "can
  // fire", and that is the one claim a Slot awaiting its window must not make.
  it('dims a Full Slot that is waiting for the other window', () => {
    expect(tone({ outOfWindow: true, stateName: 'full' })).toBe('off')
  })
})

describe('what a screen reader is told', () => {
  const state = opening('quick')

  it('names an empty Slot by position', () => {
    const reading = readSlot(catalog, state, state.primaryHeroId, slotState({}), 1, null)
    expect(slotLabel(catalog, reading, 1)).toBe('Slot 2: empty')
  })

  it('names the card and its state', () => {
    const reading = readSlot(catalog, state, state.primaryHeroId, slotState({ topCard: instance('steady_strike', 'top') }), 0, null)
    expect(slotLabel(catalog, reading, 0)).toBe('Slot 1: Steady Strike, Loaded')
  })

  // The want marks are the only thing on the plate with no word beside them,
  // so the label is the one place they are spoken.
  it('speaks the want marks while the Slot can still act on one', () => {
    const reading = readSlot(catalog, state, state.primaryHeroId, slotState({ topCard: instance('iron_guard', 'top') }), 0, null)
    expect(slotLabel(catalog, reading, 0)).toContain('takes Guard cards')
  })

  it('says which window a Slot waiting on the other one fires in', () => {
    // fortify fires slow, so it is out of window during Quick.
    const reading = readSlot(catalog, state, state.primaryHeroId, slotState({ topCard: instance('fortify', 'top') }), 0, null)
    expect(slotLabel(catalog, reading, 0)).toContain('fires in the Slow Window')
  })
})

describe('reading a whole Slot', () => {
  it('collects every answer the plate renders from one call', () => {
    const state = opening('quick')
    const charged = slotState({ topCard: instance('steady_strike', 'top'), charges: [instance('iron_guard', 'a')] })
    // Seated, not merely passed: `canFire` asks the engine whether any fire
    // from *this Slot index* is legal (D-073), so a Slot the state does not
    // hold at that index answers for the empty one it does.
    state.heroes[state.primaryHeroId].actionBar[0] = charged
    const reading = readSlot(catalog, state, state.primaryHeroId, charged, 0, null)
    expect(reading.card?.id).toBe('steady_strike')
    expect(reading.chargeCount).toBe(1)
    expect(reading.stateName).toBe('charged')
    expect(reading.outOfWindow).toBe(false)
    expect(reading.incoming).toBeNull()
    expect(reading.tone).toBe('live')
  })

  it('agrees with the predicates it composes', () => {
    const state = opening('slow')
    const quickSlot = slotState({ topCard: instance('steady_strike', 'top') })
    const reading = readSlot(catalog, state, state.primaryHeroId, quickSlot, 0, null)
    expect(reading.outOfWindow).toBe(slotOutOfWindow(catalog, state, quickSlot))
    expect(reading.takesCharge).toBe(slotTakesCharge(catalog, state, quickSlot))
    expect(reading.wanted).toEqual(slotWantedKeywords(catalog, quickSlot))
    expect(reading.stateName).toBe<SlotStateName>('loaded')
  })
})
