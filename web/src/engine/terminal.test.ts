import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { buildCatalog, checkResolution, createEncounterState, getEntityIdAt, hexCounterRef, neighbors, resolve, type EncounterState } from '@/engine'

// Terminal-state evaluation as a stated, tested rule (engine-hardening P5,
// D-095) rather than the incidental shape of the resolution recursion. Four
// clauses, one test each: node-boundary evaluation, the fired card's atomic
// batch, refusal-with-a-fact after the ending, and victory winning mutual
// zero.

const shipped = loadCatalog()

describe('terminal-state evaluation (D-095)', () => {
  it('a fired card is one atomic batch: the lethal hit does not suppress the draw it rode in with', () => {
    // A card that kills the Boss AND draws. Under per-node evaluation the
    // victory would land before the draw and refuse it; the fired-card
    // exception resolves the whole batch first.
    const fixture = buildCatalog({
      cards: [
        { id: 'finisher', title: 'Finisher', speed: 'quick', boss_damage: 99, range_tiles: 3, draw_count: 1, tags: ['tank'] },
        { id: 'fuel', title: 'Fuel', speed: 'quick', boss_damage: 1, range_tiles: 3, tags: ['tank'] },
      ],
      heroes: [{ id: 'warden', title: 'Warden', max_health: 20 }],
      keywords: [
        { id: 'tank', title: 'Tank', kind: 'role' },
        { id: 'overflow', title: 'Overflow', kind: 'trait' },
        { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
        { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
      ],
      counters: [],
      bosses: [{ id: 'probe_boss', title: 'Probe Boss', max_health: 40 }],
      chargeModifiers: [],
      hazards: [],
      minions: [],
      programs: [{ id: 'probe_program', title: 'Probe Program', instant_beats: [], incoming_beats: [] }],
      encounters: [
        {
          id: 'probe_finish',
          title: 'Probe Finish',
          party: [{ hero: 'warden', start: { q: 0, r: 0 } }],
          boss: 'probe_boss',
          round_limit: 6,
          board_radius: 2,
          boss_start: { q: 1, r: 0 },
          slot_count: 1,
          hand_refill_target: 4,
          player_deck: [
            { card: 'finisher', copies: 2 },
            { card: 'fuel', copies: 6 },
          ],
          boss_programs: ['probe_program'],
          random_seed: 7,
        },
      ],
    })
    const state = createEncounterState(fixture, 'probe_finish')
    const hero = state.heroes[state.primaryHeroId]
    const finisher = hero.deck.concat(hero.hand).find((card) => card.cardId === 'finisher')!
    hero.actionBar[0] = { topCard: finisher, charges: [hero.hand[0]], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
    state.phase = 'quick'
    const fired = resolve(fixture, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(fired.state.outcome).toBe('victory')
    // The draw is a sibling AFTER the lethal damage in the same batch, and it
    // still resolved: the fact stream shows the whole authored card, then the
    // ending.
    const drawFact = fired.facts.find((fact) => fact.kind === 'draw_card')
    expect(drawFact?.succeeded).toBe(true)
    const damageFact = fired.facts.find((fact) => fact.kind === 'damage')
    expect(damageFact?.succeeded).toBe(true)
    expect(drawFact!.sequence).toBeGreaterThan(damageFact!.sequence)
  })

  it('mutual zero is a victory: the Boss is asked first', () => {
    // The simultaneity clause at its narrowest: one evaluation over a state
    // where both the Boss and the last Hero stand at zero.
    const state = createEncounterState(shipped, 'embermaw_prototype')
    state.board.entities[state.bossId].health = 0
    state.heroes[state.primaryHeroId].health = 0
    state.board.entities[state.primaryHeroId].health = 0
    checkResolution(state)
    expect(state.active).toBe(false)
    expect(state.outcome).toBe('victory')
    expect(state.outcomeReason).toBe('The Boss is defeated.')
  })

  it('after a mid-tree ending, the rest of the tree is refused with a recorded fact, never silently skipped', () => {
    // A solo Hero at 1 health walks across two lethal Staked hexes (D-092
    // content). The first footstep's damage ends the Encounter; the second
    // footstep's damage must appear on the fact stream as a refusal.
    let state = createEncounterState(shipped, 'embermaw_prototype')
    const heroId = state.primaryHeroId
    state.heroes[heroId].health = 1
    state.board.entities[heroId].health = 1
    // The path is computed from actually-free ground so the walk cannot be
    // blocked short: a free neighbor of the Hero, then a free neighbor of
    // that hex which is not the start.
    const heroAt = state.board.entities[heroId].coords
    const free = (coords: { q: number; r: number }): boolean => getEntityIdAt(state.board, coords) === ''
    const first = neighbors(state.board.hexes, heroAt).find(free)!
    const second = neighbors(state.board.hexes, first).find(
      (coords) => free(coords) && !(coords.q === heroAt.q && coords.r === heroAt.r),
    )!
    const path = [first, second]
    for (const coords of path) {
      const placed = resolve(shipped, state, {
        kind: 'place_counter',
        sourceId: state.bossId,
        hostRef: hexCounterRef(coords),
        counterId: 'staked_ground',
        amount: 2,
        reasonText: 'probe',
      })
      expect(placed.facts[0].succeeded).toBe(true)
      state = placed.state
    }
    const walked = resolve(shipped, state, {
      kind: 'traverse_piece',
      sourceId: heroId,
      path,
      traversal: 'walk',
      reasonText: 'last march',
    })
    expect(walked.state.outcome).toBe('defeat')
    const damage = walked.facts.filter((fact) => fact.kind === 'damage')
    expect(damage).toHaveLength(2)
    expect(damage[0].succeeded).toBe(true)
    expect(damage[1].succeeded).toBe(false)
    expect(damage[1].reason).toBe('The Encounter has already ended.')
  })

  it('a post-terminal player command is refused, not resolved', () => {
    const state = createEncounterState(shipped, 'embermaw_prototype') as EncounterState
    state.active = false
    state.outcome = 'victory'
    const hero = state.heroes[state.primaryHeroId]
    const late = resolve(shipped, state, { kind: 'load_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: hero.hand[0].instanceId })
    expect(late.facts[0].succeeded).toBe(false)
    expect(late.facts[0].reason).toBe('The Encounter has already ended.')
  })
})
