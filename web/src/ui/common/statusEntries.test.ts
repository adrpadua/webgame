import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { createEncounterState, hexKey, resolve, type Axial, type EncounterState } from '@/engine'
import { counterEntries, groundEntries } from './statusIcons'

// What one tile hands the HUD. Run against the real catalog rather than a
// fixture, for the reason `attrition.test.ts` gives: the claim is about what
// `data/hazards/` reads as on screen, and a hand-built Hazard would prove the
// builder against itself.

const catalog = loadCatalog()
const HEX: Axial = { q: 0, r: 0 }
const KEY = hexKey(HEX)

function start(): EncounterState {
  return createEncounterState(catalog, 'embermaw_prototype')
}

function burn(state: EncounterState, hazardId: string, options: { permanent?: boolean; at?: Axial } = {}): EncounterState {
  return resolve(catalog, state, {
    kind: 'apply_hazard',
    sourceId: state.bossId,
    coords: options.at ?? HEX,
    hazardId,
    fallbackDurationRounds: 1,
    ...(options.permanent === true ? { permanent: true } : {}),
  }).state
}

describe('groundEntries', () => {
  it('says nothing about plain ground', () => {
    expect(groundEntries(catalog, start(), KEY)).toEqual([])
  })

  it('reads a Hazard as its authored self — title, mark, rules text', () => {
    const [scorched, ...rest] = groundEntries(catalog, burn(start(), 'scorched'), KEY)
    expect(rest).toEqual([])
    expect(scorched.title).toBe(catalog.hazards.scorched.title)
    expect(scorched.rulesText).toBe(catalog.hazards.scorched.rules_text)
    expect(scorched.mark).toEqual({ glyph: 'flame', material: 'ember' })
    expect(scorched.badge).toBe('Ground')
  })

  it('prints the ground’s own numbers: its clock, its toll, and what it refuses', () => {
    const [scorched] = groundEntries(catalog, burn(start(), 'scorched'), KEY)
    expect(scorched.stats).toEqual([
      { label: 'On this ground', value: '1 round left' },
      { label: 'Damage on entry', value: '1' },
      { label: 'Entry', value: 'No willing step' },
    ])
  })

  // Physics outranks choice (D-075): a hex nothing can enter has already
  // answered whether a Hero would choose to.
  it('says nothing enters impassable ground, and never both answers at once', () => {
    const [collapsed] = groundEntries(catalog, burn(start(), 'collapsed'), KEY)
    expect(collapsed.stats).toContainEqual({ label: 'Entry', value: 'Nothing enters' })
    expect(collapsed.stats.filter((stat) => stat.label === 'Entry')).toHaveLength(1)
  })

  it('counts a second Hazard of one kind rather than drawing a second square', () => {
    const twice = burn(burn(start(), 'scorched'), 'scorched')
    const entries = groundEntries(catalog, twice, KEY)
    expect(entries).toHaveLength(1)
    expect(entries[0].count).toBe(2)
  })

  it('draws no clock on permanent ground — the arena does not recover (D-031)', () => {
    const [collapsed] = groundEntries(catalog, burn(start(), 'collapsed', { permanent: true }), KEY)
    expect(collapsed.remainingRounds).toBe(0)
    expect(collapsed.stats[0]).toEqual({ label: 'On this ground', value: 'Permanent' })
  })

  it('answers for the hex it was asked about and no other', () => {
    const elsewhere = burn(start(), 'scorched', { at: { q: 1, r: 0 } })
    expect(groundEntries(catalog, elsewhere, KEY)).toEqual([])
    expect(groundEntries(catalog, elsewhere, hexKey({ q: 1, r: 0 }))).toHaveLength(1)
  })

  // Ground is not the piece standing on it: the two trays read separate
  // hosts, so a Hero on burning floor carries nothing the floor carries.
  it('leaves the piece standing on it out of the reading', () => {
    const state = start()
    const burnt = burn(state, 'scorched', { at: state.board.entities[state.primaryHeroId].coords })
    const key = hexKey(state.board.entities[state.primaryHeroId].coords)
    expect(groundEntries(catalog, burnt, key)).toHaveLength(1)
    expect(counterEntries(catalog, burnt, state.primaryHeroId)).toEqual([])
  })
})
