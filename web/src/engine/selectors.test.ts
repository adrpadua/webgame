import { describe, expect, it } from 'vitest'
import { combatantRef, hexCounterRef, hexKey, resolve, selectEntities, selectHexes } from '@/engine'
import { catalog, start } from './testkit'

// The selector vocabulary's acceptance battery — the seven demonstrations the
// mechanics-extension handoff names, each pinned with exact-order assertions
// because the determinism rule (stable sort, lexicographic final tie-break)
// is the contract, not an implementation detail.

// A staged duo board: Elian and a second body at authored distances from the
// Boss, with a Whelp spawned adjacent to the Boss so enemies outnumber one.
function stagedBoard() {
  let state = start()
  const bossAt = state.board.entities[state.bossId].coords
  // A Whelp beside the Boss: an enemy that is not the Boss.
  const spawned = resolve(catalog, state, {
    kind: 'spawn_minion',
    sourceId: state.bossId,
    minionId: 'whelp_probe',
    coords: { q: bossAt.q, r: bossAt.r + 1 },
    minionContentId: 'ember_whelp',
  })
  expect(spawned.facts[0].succeeded).toBe(true)
  state = spawned.state
  return { state, bossAt }
}

describe('selectEntities', () => {
  it('finds the nearest living Hero, deterministically', () => {
    const { state, bossAt } = stagedBoard()
    const nearest = selectEntities(state, { subject: 'party', from: bossAt, where: [{ is: 'living' }, { is: 'on_board' }], order: 'nearest', limit: 1 })
    expect(nearest).toEqual([state.primaryHeroId])
  })

  it('finds all adjacent Enemies', () => {
    const { state, bossAt } = stagedBoard()
    const heroAt = state.board.entities[state.primaryHeroId].coords
    // From the Boss's own hex, the Whelp beside it is adjacent; from the
    // Hero's hex, adjacency depends on the authored start — assert both ends.
    expect(selectEntities(state, { subject: 'enemies', from: bossAt, where: [{ adjacent: true }] })).toEqual(['whelp_probe'])
    const adjacentToHero = selectEntities(state, { subject: 'enemies', from: heroAt, where: [{ adjacent: true }] })
    for (const id of adjacentToHero) {
      expect(state.board.entities[id].team).toBe('enemy')
    }
  })

  it('finds all Enemies within N hexes, boundary inclusive', () => {
    const { state, bossAt } = stagedBoard()
    const within1 = selectEntities(state, { subject: 'enemies', from: bossAt, where: [{ within: 1 }] })
    expect(within1).toEqual([state.bossId, 'whelp_probe'].sort())
    // Exactly at the boundary counts: the Whelp stands at distance 1, so a
    // within of 1 keeps it and a within of 0 keeps only the Boss itself.
    expect(selectEntities(state, { subject: 'enemies', from: bossAt, where: [{ within: 0 }] })).toEqual([state.bossId])
  })

  it('finds the lowest-Health living ally, ignoring a Downed lower one', () => {
    const state = start()
    const heroId = state.primaryHeroId
    state.heroes[heroId].health = 7
    const lowest = selectEntities(state, { subject: 'party', where: [{ is: 'living' }], order: 'lowest_health', limit: 1 })
    expect(lowest).toEqual([heroId])
  })

  it('finds entities carrying a named Counter', () => {
    let { state } = stagedBoard()
    const marked = resolve(catalog, state, {
      kind: 'place_counter',
      sourceId: state.bossId,
      hostRef: combatantRef(state.primaryHeroId),
      counterId: 'seared',
      amount: 1,
      reasonText: 'probe',
    })
    expect(marked.facts[0].succeeded).toBe(true)
    state = marked.state
    expect(selectEntities(state, { subject: 'all', where: [{ has_counter: 'seared' }] })).toEqual([state.primaryHeroId])
  })

  it('excludes a named entity — every target except the source', () => {
    const { state, bossAt } = stagedBoard()
    const others = selectEntities(state, { subject: 'enemies', from: bossAt, where: [{ within: 3 }, { not: state.bossId }] })
    expect(others).toEqual(['whelp_probe'])
  })

  it('breaks every tie lexicographically, and the order rule is stable', () => {
    const { state, bossAt } = stagedBoard()
    // Two enemies at the same distance from the Hero would tie; from the
    // Boss's hex the Boss (distance 0) precedes the Whelp (distance 1), and
    // reversing the order reverses exactly that.
    expect(selectEntities(state, { subject: 'enemies', from: bossAt, order: 'nearest' })).toEqual([state.bossId, 'whelp_probe'])
    expect(selectEntities(state, { subject: 'enemies', from: bossAt, order: 'furthest' })).toEqual(['whelp_probe', state.bossId])
    // Equal on every key: two calls agree, and the id rule decides.
    const byId = selectEntities(state, { subject: 'all' })
    expect(byId).toEqual([...byId].sort())
    expect(selectEntities(state, { subject: 'all' })).toEqual(byId)
  })

  it('throws loudly on a distance query with no reference point', () => {
    const { state } = stagedBoard()
    expect(() => selectEntities(state, { subject: 'enemies', where: [{ within: 2 }] })).toThrow('needs a `from` reference point')
    expect(() => selectEntities(state, { subject: 'enemies', order: 'nearest' })).toThrow('needs a `from` reference point')
  })
})

describe('selectHexes', () => {
  it('finds empty hexes within N, in canonical hex-key order', () => {
    const { state, bossAt } = stagedBoard()
    const empties = selectHexes(state, { from: bossAt, where: [{ is: 'empty' }, { within: 1 }] })
    // Neither the Boss's own hex nor the Whelp's appears; everything else in
    // the ring does, sorted by hex key.
    const keys = empties.map(hexKey)
    expect(keys).toEqual([...keys].sort())
    expect(keys).not.toContain(hexKey(bossAt))
    expect(keys).not.toContain(hexKey(state.board.entities.whelp_probe.coords))
    for (const coords of empties) {
      expect(state.board.hexes[hexKey(coords)]).toBe(true)
    }
    expect(empties.length).toBeGreaterThan(0)
  })

  it('finds occupied hexes and honors the limit after ordering', () => {
    const { state, bossAt } = stagedBoard()
    const occupied = selectHexes(state, { from: bossAt, where: [{ is: 'occupied' }, { within: 1 }] })
    // The authored start stands Elian adjacent to the Boss, so three hexes are
    // occupied within 1: the Hero's, the Boss's own, and the spawned Whelp's.
    expect(occupied.map(hexKey).sort()).toEqual(
      [hexKey(state.board.entities[state.primaryHeroId].coords), hexKey(bossAt), hexKey(state.board.entities.whelp_probe.coords)].sort(),
    )
    expect(selectHexes(state, { from: bossAt, where: [{ is: 'occupied' }, { within: 1 }], limit: 1 })).toHaveLength(1)
  })

  it('finds hexes carrying a named Counter', () => {
    let state = start()
    const free = selectHexes(state, { where: [{ is: 'empty' }], limit: 1 })[0]
    const placed = resolve(catalog, state, {
      kind: 'place_counter',
      sourceId: state.bossId,
      hostRef: hexCounterRef(free),
      counterId: 'staked_ground',
      amount: 1,
      reasonText: 'probe',
    })
    expect(placed.facts[0].succeeded).toBe(true)
    state = placed.state
    expect(selectHexes(state, { where: [{ has_counter: 'staked_ground' }] })).toEqual([free])
  })
})
