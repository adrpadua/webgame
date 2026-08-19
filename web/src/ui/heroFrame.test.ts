import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { createEncounterState, resolve, type EncounterState } from '@/engine'
import { signatureControl } from './heroFrame'

// The Signature control's face (D-065): one closed state machine shared by
// the Hero Frame and these tests, the way `slots.ts` predicates are shared
// with the Action Bar. Each face is pinned against a state the engine
// actually produced, not a hand-built Slot.

const catalog = loadCatalog()

function start(): EncounterState {
  return createEncounterState(catalog, 'embermaw_prototype')
}

// The zero-loss guarded-front Tank Hit: the standing clause's earn.
function absorbTankHit(state: EncounterState): EncounterState {
  state.heroes[state.primaryHeroId].armor = 5
  return resolve(catalog, state, {
    kind: 'damage',
    sourceId: state.bossId,
    targetId: state.primaryHeroId,
    amount: 4,
    reasonText: 'Raking Claw',
    factContext: { damage_keywords: ['tank_hit'] },
  }).state
}

describe('the Signature control', () => {
  it('is absent where the Encounter fields no Signature', () => {
    const state = createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID)
    expect(signatureControl(catalog, state)).toBeNull()
  })

  it('starts empty, with the authored resource title', () => {
    const control = signatureControl(catalog, start())
    expect(control).toMatchObject({ face: 'empty', charges: 0, cap: 2, resourceTitle: 'Ripostes' })
    expect(control?.card.id).toBe('elian_riposte')
  })

  it('banks out of window and ignites in the Quick Window', () => {
    let state = absorbTankHit(start())
    // Loadout: a Charge is held but the Quick Window has not opened.
    expect(signatureControl(catalog, state)).toMatchObject({ face: 'banked', charges: 1 })
    state = { ...state, phase: 'quick' }
    expect(signatureControl(catalog, state)).toMatchObject({ face: 'ready', charges: 1 })
  })

  it('reads spent after firing, and empty once the window turns', () => {
    let state = absorbTankHit(start())
    state = { ...state, phase: 'quick' }
    const control = signatureControl(catalog, state)
    state = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: control?.slotIndex ?? -1 }).state
    expect(signatureControl(catalog, state)).toMatchObject({ face: 'spent', charges: 0 })
  })
})
