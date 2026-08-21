import { beforeEach, describe, expect, it } from 'vitest'
import { catalog, selectPilotId, selectState, useWorkbench } from '@/store/workbench'
import { heroActed, heroCanAct, nextNudge, unactedHeroIds } from './unacted'

// The unacted nudge (Total War's "a unit has not moved", on a Party rather
// than an army): who still owes the open window an action, which seat the rail
// hands the console to, and the rule that stops it nagging forever.
//
// Driven through the real store on the two-seat Brand trial, the way a player
// reaches it, because the answer is a reading of the session timeline — a
// hand-built state has no facts to read and would prove nothing about whether
// acting actually clears a nudge.

function store() {
  return useWorkbench.getState()
}

function state() {
  return selectState(store())
}

function unacted(): string[] {
  return unactedHeroIds(catalog, store())
}

function railTarget(): string | null {
  return nextNudge(catalog, store(), selectPilotId(store()), store().nudgedHeroIds)
}

function openTrialQuickWindow(): void {
  store().loadScenario('brand_trial_opening')
  while (state().phase !== 'quick') {
    store().advance()
  }
}

// Any committed action by the pilot: a hand card into an empty Slot, which is
// a `load_slot` — one of the five kinds that count as using a window.
function actAsPilot(): void {
  const pilotId = selectPilotId(store())
  const card = state().heroes[pilotId].hand[0]
  const slotIndex = state().heroes[pilotId].actionBar.findIndex((slot) => !slot.fixed && slot.topCard === null)
  store().cardDroppedOnSlot(card.instanceId, slotIndex)
}

describe('who still owes this window an action', () => {
  beforeEach(() => {
    openTrialQuickWindow()
    useWorkbench.setState({ controlledHeroId: null, nudgedHeroIds: [] })
  })

  it('names every seat that has not acted, and drops one the moment it does', () => {
    expect(unacted()).toEqual(['elian', 'maren'])
    actAsPilot()
    expect(unacted()).toEqual(['maren'])
  })

  it('points the rail at the ally, never at the pilot', () => {
    // The pilot's own unused window is the skip warning's job — their console
    // is the bottom half of the screen — so the rail offers the seat the
    // player is not looking at.
    expect(railTarget()).toBe('maren')
    store().switchControl('maren')
    expect(railTarget()).toBe('elian')
  })

  it('hands the console over on the press, and remembers the offer', () => {
    store().nudgeToUnacted('maren')
    expect(selectPilotId(store())).toBe('maren')
    expect(store().nudgedHeroIds).toEqual(['maren'])
  })

  it('offers each seat once, then becomes Next — the window can always be closed', () => {
    // Maren is offered and takes control without acting; Elian is
    // offered and takes control back. Both are still unacted — their frames
    // keep breathing — but the rail has let go, so the next press advances.
    store().nudgeToUnacted('maren')
    store().nudgeToUnacted('elian')
    expect(unacted()).toEqual(['elian', 'maren'])
    expect(railTarget()).toBeNull()
  })

  it('forgets the offers when the window closes', () => {
    store().nudgeToUnacted('maren')
    expect(store().nudgedHeroIds).toEqual(['maren'])
    store().advance()
    expect(store().nudgedHeroIds).toEqual([])
  })

  it('counts an action in the window it was taken in, not the Round', () => {
    actAsPilot()
    const pilotId = selectPilotId(store())
    expect(heroActed(store(), pilotId)).toBe(true)
    // The Quick Window closes into the Boss's Incoming Row, then the Slow
    // Window opens: the same Round, a new window, and the Hero owes it an
    // action again.
    while (state().phase !== 'slow') {
      store().advance()
    }
    expect(heroActed(store(), pilotId)).toBe(false)
  })

  it("nudges nobody in the Boss's own rows", () => {
    while (state().phase !== 'incoming') {
      store().advance()
    }
    expect(unacted()).toEqual([])
    expect(railTarget()).toBeNull()
  })

  it('nudges nobody who could not act anyway', () => {
    const live = state()
    const stranded = structuredClone(live)
    // No cards to spend and no Slot that could fire: the window holds nothing
    // for this Hero, and a frame that nudged would be asserting a move the
    // rules would refuse.
    stranded.heroes.maren.hand = []
    stranded.heroes.maren.actionBar = stranded.heroes.maren.actionBar.map((slot) => ({ ...slot, topCard: null, charges: [] }))
    expect(heroCanAct(catalog, stranded, 'maren')).toBe(false)
    expect(heroCanAct(catalog, live, 'maren')).toBe(true)
  })

  it('nudges nobody on the floor — a Downed ally is rescued, not switched to', () => {
    const downed = structuredClone(state())
    downed.heroes.maren.status = 'downed'
    expect(heroCanAct(catalog, downed, 'maren')).toBe(false)
  })
})
