import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import {
  advancePhase,
  buildCatalog,
  combatantRef,
  createEncounterState,
  getEntityIdAt,
  hexCounterRef,
  neighbors,
  resolve,
  type EncounterState,
} from '@/engine'

// Terminal-state evaluation as a stated, tested rule (engine-hardening P5,
// D-096) rather than the incidental shape of the resolution recursion. The
// four clauses each have a test — node-boundary evaluation, the fired card's
// atomic batch, refusal-with-a-fact after the ending, and victory winning
// mutual zero — and every ending here is produced by a real resolver tree or
// phase script, never by hand-setting an outcome (engine-hardening follow-up
// P4): the simultaneity clause is exercised through one fired card that
// zeroes both sides, the refusal clause through a detonation's own siblings
// and through the Boss's instant row cut off mid-script.

const shipped = loadCatalog()

// The probe arena for the real-tree endings. One card kills in both
// directions at once — lethal Boss damage plus a scale Reader that turns the
// chosen ally's Brand into damage on them — so a self-cover fire is a single
// authored batch that puts the Boss and the last Hero at zero together. The
// Bomb Whelp carries the shipped Whelp's fuse shape, and the claw program is
// two lethal hits so the second has an ended Encounter to be refused by.
const probe = buildCatalog({
  cards: [
    {
      id: 'last_stand',
      title: 'Last Stand',
      speed: 'quick',
      target_type: 'ally',
      range_tiles: 2,
      boss_damage: 99,
      reads: [{ verb: 'scale', counter: 'brand', on: 'target', effect: 'target_damage', per: 2 }],
      tags: ['tank'],
    },
    { id: 'fuel', title: 'Fuel', speed: 'quick', boss_damage: 1, range_tiles: 3, tags: ['tank'] },
  ],
  heroes: [
    { id: 'warden', title: 'Warden', max_health: 20 },
    { id: 'aria', title: 'Aria', max_health: 20 },
    { id: 'zeke', title: 'Zeke', max_health: 20 },
  ],
  keywords: [
    { id: 'tank', title: 'Tank', kind: 'role' },
    { id: 'overflow', title: 'Overflow', kind: 'trait' },
    { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
    { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
  ],
  counters: [{ id: 'brand', title: 'Brand', host: 'combatant', max: 2 }],
  bosses: [{ id: 'probe_boss', title: 'Probe Boss', max_health: 40 }],
  chargeModifiers: [],
  hazards: [],
  minions: [{ id: 'bomb_whelp', title: 'Bomb Whelp', max_health: 3, explode_damage: 5, explode_radius: 1 }],
  programs: [
    { id: 'probe_program', title: 'Probe Program', instant_beats: [], incoming_beats: [] },
    {
      id: 'claw_program',
      title: 'Claw Program',
      instant_beats: [
        {
          id: 'claw_a',
          title: 'Claw A',
          kind: 'targeted_hit',
          target_selector: 'tank',
          range_tiles: 1,
          damage: 99,
          damage_keywords: ['tank_hit'],
        },
        {
          id: 'claw_b',
          title: 'Claw B',
          kind: 'targeted_hit',
          target_selector: 'tank',
          range_tiles: 1,
          damage: 99,
          damage_keywords: ['tank_hit'],
        },
      ],
      incoming_beats: [],
    },
  ],
  encounters: [
    {
      id: 'probe_mutual',
      title: 'Probe Mutual',
      party: [{ hero: 'warden', start: { q: 0, r: 0 } }],
      boss: 'probe_boss',
      round_limit: 6,
      board_radius: 2,
      boss_start: { q: 1, r: 0 },
      slot_count: 1,
      hand_refill_target: 4,
      player_deck: [
        { card: 'last_stand', copies: 2 },
        { card: 'fuel', copies: 6 },
      ],
      boss_programs: ['probe_program'],
      random_seed: 7,
    },
    {
      id: 'probe_blast',
      title: 'Probe Blast',
      party: [
        { hero: 'aria', start: { q: 0, r: 0 } },
        { hero: 'zeke', start: { q: 1, r: 0 } },
      ],
      boss: 'probe_boss',
      round_limit: 6,
      board_radius: 2,
      boss_start: { q: -2, r: 0 },
      slot_count: 1,
      hand_refill_target: 4,
      player_deck: [{ card: 'fuel', copies: 8 }],
      boss_programs: ['probe_program'],
      random_seed: 7,
    },
    {
      id: 'probe_claw',
      title: 'Probe Claw',
      party: [{ hero: 'warden', start: { q: 0, r: 0 } }],
      boss: 'probe_boss',
      round_limit: 6,
      board_radius: 2,
      boss_start: { q: 1, r: 0 },
      slot_count: 1,
      hand_refill_target: 4,
      player_deck: [{ card: 'fuel', copies: 8 }],
      boss_programs: ['claw_program'],
      random_seed: 7,
    },
  ],
})

describe('terminal-state evaluation (D-096)', () => {
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

  it('mutual zero through one real tree is a victory: the Boss is asked first', () => {
    // The simultaneity clause produced by resolution rather than staged by
    // hand: a self-cover Last Stand is one fired batch whose Boss damage and
    // Brand-scaled self damage both land before the single deferred terminal
    // evaluation, which asks about the Boss first.
    const state = createEncounterState(probe, 'probe_mutual')
    const heroId = state.primaryHeroId
    const branded = resolve(probe, state, {
      kind: 'place_counter',
      sourceId: state.bossId,
      hostRef: combatantRef(heroId),
      counterId: 'brand',
      amount: 1,
      reasonText: 'probe',
    })
    expect(branded.facts[0].succeeded).toBe(true)
    const staged = branded.state
    const hero = staged.heroes[heroId]
    hero.health = 1
    staged.board.entities[heroId].health = 1
    const stand = hero.deck.concat(hero.hand).find((card) => card.cardId === 'last_stand')!
    const charge = hero.hand.find((card) => card.instanceId !== stand.instanceId)!
    hero.actionBar[0] = { topCard: stand, charges: [charge], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
    staged.phase = 'quick'
    const fired = resolve(probe, staged, { kind: 'fire_slot', sourceId: heroId, slotIndex: 0, targetId: heroId })

    expect(fired.state.outcome).toBe('victory')
    expect(fired.state.outcomeReason).toBe('The Boss is defeated.')
    // Both zeros came from resolved damage inside the one batch: the Boss's
    // hit first, the Hero's after it, neither refused. `dealt` records the
    // health actually lost, so each side reports its whole remaining bar.
    const damage = fired.facts.filter((fact) => fact.kind === 'damage')
    expect(damage.map((fact) => [fact.succeeded, fact.detail.dealt])).toEqual([
      [true, 40],
      [true, 1],
    ])
    expect(fired.state.board.entities[fired.state.bossId].health).toBeLessThanOrEqual(0)
    expect(fired.state.heroes[heroId].health).toBeLessThanOrEqual(0)
  })

  it('a lethal detonation refuses its remaining blast siblings with recorded facts', () => {
    // One blast catches the last living Hero and a Downed body, in that
    // order (the caught list is sorted, and aria sorts before zeke). The
    // first damage ends the Encounter at its node boundary; the second is a
    // sibling in the same detonation tree, so it must appear on the stream as
    // a refusal. A second due fuse sits on the board to pin the script edge:
    // the phase script stops submitting once the Encounter is over, so the
    // second Whelp neither detonates nor leaves a fact.
    let state = createEncounterState(probe, 'probe_blast')
    for (const [minionId, coords] of [
      ['bomb_1', { q: 0, r: 1 }],
      ['bomb_2', { q: -1, r: 1 }],
    ] as const) {
      const spawned = resolve(probe, state, {
        kind: 'spawn_minion',
        sourceId: state.bossId,
        minionId,
        coords,
        minionContentId: 'bomb_whelp',
      })
      expect(spawned.facts[0].succeeded).toBe(true)
      state = spawned.state
    }
    state.round = 2
    state.phase = 'quick'
    state.heroes.aria.health = 1
    state.board.entities.aria.health = 1
    state.heroes.zeke.status = 'downed'
    state.heroes.zeke.downedRound = 1
    state.heroes.zeke.health = 0
    state.board.entities.zeke.health = 0

    const advanced = advancePhase(probe, state)
    expect(advanced.state.outcome).toBe('defeat')
    expect(advanced.state.outcomeReason).toBe('The Party has fallen.')
    const damage = advanced.facts.filter((fact) => fact.kind === 'damage')
    expect(damage.map((fact) => [fact.sourceId, fact.succeeded, fact.reason])).toEqual([
      ['bomb_1', true, ''],
      ['bomb_1', false, 'The Encounter has already ended.'],
    ])
    // The script edge: exactly one detonation resolved, and the second Whelp
    // is still standing on the board with its fuse spent nowhere.
    expect(advanced.facts.filter((fact) => fact.kind === 'detonate_minion')).toHaveLength(1)
    expect(advanced.state.board.entities.bomb_2).toBeDefined()
  })

  it('a lethal instant Beat ends the row mid-script, and the next Beat is refused on the stream', () => {
    // The phase-boundary half of clause 3: the Boss's instant row is a real
    // script of resolve_boss actions, and a first claw that fells the solo
    // Hero must not suppress the facts before the boundary — its own hit —
    // while the second claw shows up refused rather than silently dropped.
    const state = createEncounterState(probe, 'probe_claw')
    const heroId = state.primaryHeroId
    state.heroes[heroId].health = 1
    state.board.entities[heroId].health = 1

    const advanced = advancePhase(probe, state)
    expect(advanced.state.outcome).toBe('defeat')
    expect(advanced.state.outcomeReason).toBe('A Hero has fallen.')
    const beats = advanced.facts.filter((fact) => fact.kind === 'resolve_boss')
    expect(beats).toHaveLength(2)
    expect(beats[0].succeeded).toBe(true)
    expect(beats[1].succeeded).toBe(false)
    expect(beats[1].reason).toBe('The Encounter has already ended.')
    // The facts preceding the boundary are intact: the first claw's damage
    // resolved and felled the Hero before anything was refused.
    const damage = advanced.facts.filter((fact) => fact.kind === 'damage')
    expect(damage[0].succeeded).toBe(true)
    expect(damage[0].sequence).toBeLessThan(beats[1].sequence)
    expect(advanced.state.heroes[heroId].health).toBeLessThanOrEqual(0)
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
