import { beforeEach, describe, expect, it } from 'vitest'
import { selectPilotId, selectState, useWorkbench } from './workbench'

// The control cursor (the character-switching pass): one player pilots the
// whole Party by switching which Hero the consoles operate. The design came
// out of the party-switching research note — BG3's portrait gesture over
// Spirit Island's window-scoped commit model — and these are its contracts:
// gestures route to the pilot, switching drops in-flight gestures and keeps
// commitments, the cursor survives undo, and a session that no longer fields
// the named Hero falls back to seat 0 instead of stranding control.

function store() {
  return useWorkbench.getState()
}

function state() {
  return selectState(store())
}

// The two-seat Brand trial, entered through the Scenario the debug rail
// offers, exactly as a player reaches it.
function openTrialQuickWindow(): void {
  store().loadScenario('brand_trial_opening')
  while (state().phase !== 'quick') {
    store().advance()
  }
}

describe('the control cursor', () => {
  beforeEach(() => {
    openTrialQuickWindow()
    useWorkbench.setState({ controlledHeroId: null })
  })

  it('defaults to seat 0 and switches only to a fielded party member', () => {
    expect(selectPilotId(store())).toBe('guardian')
    store().switchControl('maren')
    expect(selectPilotId(store())).toBe('maren')
    store().switchControl('embermaw')
    expect(selectPilotId(store())).toBe('maren')
    store().switchControl('nobody')
    expect(selectPilotId(store())).toBe('maren')
  })

  it('routes the gestures to the pilot', () => {
    store().switchControl('maren')
    const hand = state().heroes.maren.hand
    const card = hand[0]
    store().cardDroppedOnSlot(card.instanceId, 0)
    // The load landed on Maren's bar, not the guardian's.
    expect(state().heroes.maren.actionBar[0].topCard?.instanceId).toBe(card.instanceId)
    expect(state().heroes.guardian.actionBar[0].topCard?.instanceId).not.toBe(card.instanceId)
  })

  it('drops in-flight gestures on switch, and keeps commitments', () => {
    const card = state().heroes.guardian.hand[0]
    store().cardDroppedOnSlot(card.instanceId, 0)
    useWorkbench.setState({ targetingSlotIndex: 0, selectedCardId: 'anything' })
    store().switchControl('maren')
    // Nothing dangles (the Spirit Island rule): the armed targeting and the
    // held card are gone...
    expect(store().targetingSlotIndex).toBeNull()
    expect(store().selectedCardId).toBeNull()
    // ...but the committed load stays: Slots and Charges are engine state.
    expect(state().heroes.guardian.actionBar[0].topCard?.instanceId).toBe(card.instanceId)
  })

  it('survives undo — the window, not the character, is the commit boundary', () => {
    store().switchControl('maren')
    const card = state().heroes.maren.hand[0]
    store().cardDroppedOnSlot(card.instanceId, 0)
    store().undo()
    expect(selectPilotId(store())).toBe('maren')
  })

  it('falls back to seat 0 when the session stops fielding the Hero', () => {
    store().switchControl('maren')
    // The solo prototype has no maren seat: the cursor still names her, but
    // the pilot the consoles read is the seat the Encounter actually fields.
    store().loadScenario('embermaw_solo_ceiling')
    expect(selectPilotId(store())).toBe('guardian')
  })
})
