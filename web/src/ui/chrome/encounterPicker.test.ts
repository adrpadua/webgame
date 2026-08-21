import { beforeEach, describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { selectState, useWorkbench } from '@/store/workbench'
import { encounterChoices } from './encounterChoice'

// The Encounter Picker (the single-player reachability pass): the one
// shipped way to change fights, and the gate that keeps evaluation probes
// out of players' hands. The offer is authored — `player_facing` on the
// Encounter — so shipping a fight is an explicit act, like promoting a
// measured deck (D-076).

const catalog = loadCatalog()

function store() {
  return useWorkbench.getState()
}

describe('the encounter offer', () => {
  it('offers every player-facing Encounter and no probe', () => {
    const ids = encounterChoices(catalog).map((choice) => choice.id)
    expect(ids).toContain('embermaw_first_turn')
    expect(ids).toContain('embermaw_prototype')
    expect(ids).toContain('embermaw_attrition_trial')
    for (const id of ids) {
      expect(catalog.encounters[id].player_facing).toBe(true)
    }
    // The evaluation Encounters exist in the catalog and are absent from the
    // offer — measured, never played.
    expect(ids).not.toContain('embermaw_attrition_solo_probe')
    expect(catalog.encounters.embermaw_attrition_solo_probe).toBeDefined()
  })

  it('names the party size the fight fields', () => {
    const byId = Object.fromEntries(encounterChoices(catalog).map((choice) => [choice.id, choice]))
    expect(byId.embermaw_prototype.partySize).toBe(1)
    expect(byId.embermaw_attrition_trial.partySize).toBe(2)
  })
})

describe('starting an Encounter', () => {
  beforeEach(() => {
    store().restart()
  })

  it('starts a fresh session on the authored seed', () => {
    store().startEncounter('embermaw_attrition_trial')
    const state = selectState(store())
    expect(state.encounterId).toBe('embermaw_attrition_trial')
    expect(state.partyHeroIds).toEqual(['elian', 'maren'])
    expect(store().seed).toBe(catalog.encounters.embermaw_attrition_trial.random_seed)
    expect(store().entries.length).toBe(1)
  })

  it('refuses an evaluation probe', () => {
    const before = selectState(store()).encounterId
    store().startEncounter('embermaw_attrition_solo_probe')
    expect(selectState(store()).encounterId).toBe(before)
    expect(store().lastRejection).toContain('embermaw_attrition_solo_probe')
  })

  it('keeps the teaching script off every other Encounter', async () => {
    // The defect the picker exposed: the first-turn script gated on Round 1
    // alone, so the Brand trial's opening wore the teaching banner.
    const { firstTurnStep } = await import('../onboarding/firstTurnScript')
    store().startEncounter('embermaw_attrition_trial')
    expect(firstTurnStep(catalog, selectState(store()))).toBeNull()
    store().startEncounter('embermaw_first_turn')
    expect(firstTurnStep(catalog, selectState(store()))).not.toBeNull()
  })
})
