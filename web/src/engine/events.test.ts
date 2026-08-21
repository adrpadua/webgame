import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import {
  ENCOUNTER_SOURCE,
  buildCatalog,
  combatantRef,
  createEncounterState,
  hexCounterRef,
  readSubscriberMatches,
  resolve,
  type EncounterState,
  type ResolvedActionFact,
} from '@/engine'

// The subscriber-ordering rule (ADR 0041), pinned by assertion rather than by
// fingerprint. A sealed-Record replay proves *an* order held; only this test
// says it is *the stated* order: raise order, then Party seat order for Hero
// hosts (board creation order for everything else), then the registry row's
// declared `hears` order, then authored index within a host. The
// `subscriber_matches` entries on the raising action's fact detail are the
// observable — the same record the fact log answers "what fired and why" with.
//
// Staged on the real Elian + Maren duo (the Brand trial party), per the ADR:
// the Healer merge landed the first party where the order is observable, so
// the content under test is the shipped content, not a stand-in.

const catalog = loadCatalog()
const DUO_ENCOUNTER = 'embermaw_attrition_trial'

function startDuo(): EncounterState {
  return createEncounterState(catalog, DUO_ENCOUNTER)
}

function mark(state: EncounterState, hostId: string, counterId: string, amount = 1): EncounterState {
  const placed = resolve(catalog, state, {
    kind: 'place_counter',
    sourceId: state.bossId,
    hostRef: combatantRef(hostId),
    counterId,
    amount,
    reasonText: 'probe',
  })
  expect(placed.facts[0].succeeded).toBe(true)
  return placed.state
}

function damageFact(facts: ResolvedActionFact[]): ResolvedActionFact {
  const fact = facts.find((entry) => entry.kind === 'damage')
  expect(fact).toBeDefined()
  return fact!
}

describe('subscriber ordering on the Elian + Maren duo (ADR 0041)', () => {
  it('answers one blow in the stated sequence: raise order, seat order, authored order within a host', () => {
    // Two Counters on Elian (the target) and one on Maren (the source), so one
    // blow is answered by three Readers across both raises' stances — and both
    // Signatures' Grants read the resolved half of the same blow.
    let state = startDuo()
    state = mark(state, 'elian', 'sundered')
    state = mark(state, 'elian', 'seared')
    state = mark(state, 'maren', 'heat')
    const hit = resolve(catalog, state, {
      kind: 'damage',
      sourceId: 'maren',
      targetId: 'elian',
      amount: 2,
      reasonText: 'probe',
      factContext: { damage_keywords: ['tank_hit'] },
    })
    const fact = damageFact(hit.facts)
    expect(fact.detail.subscriber_matches).toEqual([
      // The damage_incoming raise fires first (raise order), hosts in Party
      // seat order — elian holds seat 0, maren seat 1 — and Elian's two
      // Counters answer in the order they sit on them (authored index within a
      // host: sundered landed before seared).
      { event: 'damage_incoming', host: 'elian', kind: 'reader', id: 'sundered', when: 'host_damage_incoming', delta: 1 },
      { event: 'damage_incoming', host: 'elian', kind: 'reader', id: 'seared', when: 'host_damage_incoming', delta: 1 },
      { event: 'damage_incoming', host: 'maren', kind: 'reader', id: 'heat', when: 'host_deals_damage', delta: 1 },
      // The damage_resolved raise fires second, the same seat order: Elian's
      // Riposte reads the blow he took (and refuses — health was lost), then
      // Maren's Underwriting reads the blow she landed and banks the earn.
      // D-087: the grant entry carries why and the stack after — the read-back the old singular signature_event could not give the dealing side.
      { event: 'damage_resolved', host: 'elian', kind: 'grant', id: 'elian_riposte', when: 'host_takes_damage', outcome: 'not_granted', reason: 'health_lost', charges: 0 },
      { event: 'damage_resolved', host: 'maren', kind: 'grant', id: 'marens_underwriting', when: 'host_deals_damage', outcome: 'charge_granted', reason: 'standing_clause', charges: 1 },
    ])
    // The recorded deltas are the ones that moved the number: 2 requested + 3.
    expect(fact.resolutionFact).toMatchObject({ requested: 5, health_loss: 5 })
  })

  it('orders hosts by Party seat, not by the raise naming the target first', () => {
    // The discriminating case: Elian (seat 0) strikes Maren (seat 1). The
    // damage step names its hosts target-then-source, so an implementation
    // that kept the raise's own argument order would answer Maren first. Seat
    // order says the *source* answers first here, because he holds seat 0.
    let state = startDuo()
    state = mark(state, 'maren', 'seared')
    state = mark(state, 'elian', 'heat')
    const hit = resolve(catalog, state, { kind: 'damage', sourceId: 'elian', targetId: 'maren', amount: 1, reasonText: 'probe' })
    expect(damageFact(hit.facts).detail.subscriber_matches).toEqual([
      { event: 'damage_incoming', host: 'elian', kind: 'reader', id: 'heat', when: 'host_deals_damage', delta: 1 },
      { event: 'damage_incoming', host: 'maren', kind: 'reader', id: 'seared', when: 'host_damage_incoming', delta: 1 },
    ])
  })

  it('orders Hero seats ahead of board-creation hosts', () => {
    // Same discriminator against a non-Hero host: Elian strikes the Boss. The
    // raise names the Boss (the target) first; the rule says every Party seat
    // answers before any board-entity host does.
    let state = startDuo()
    state = mark(state, state.bossId, 'sundered')
    state = mark(state, 'elian', 'heat')
    const hit = resolve(catalog, state, { kind: 'damage', sourceId: 'elian', targetId: state.bossId, amount: 1, reasonText: 'probe' })
    expect(damageFact(hit.facts).detail.subscriber_matches).toEqual([
      { event: 'damage_incoming', host: 'elian', kind: 'reader', id: 'heat', when: 'host_deals_damage', delta: 1 },
      { event: 'damage_incoming', host: 'embermaw_branded', kind: 'reader', id: 'sundered', when: 'host_damage_incoming', delta: 1 },
    ])
  })
})

// The remaining level — the registry row's declared `hears` order — needs a
// Grant and a Reader answering the same event on one host, which no shipped
// duo content stages: nothing authored subscribes both kinds to `slot_fired`
// or `round_start` today. A hand-built catalog supplies the pair, and the two
// rows are asserted in both directions so the order is provably the row's
// declaration, not a global kind precedence.
describe("the registry row's declared hears order", () => {
  const fixture = buildCatalog({
    cards: [
      { id: 'probe_strike', title: 'Probe Strike', speed: 'quick', boss_damage: 1, range_tiles: 1, tags: ['tank'] },
      {
        id: 'probe_signature',
        title: 'Probe Signature',
        speed: 'quick',
        fixed: true,
        resource_title: 'Echoes',
        max_charge: 4,
        standing: [
          { when: 'slot_fired', gates: ['effect_landed'], grants_charge: 1 },
          { when: 'round_start', gates: [], grants_charge: 1 },
        ],
      },
    ],
    heroes: [{ id: 'warden', title: 'Warden', max_health: 20, signature_card: 'probe_signature' }],
    keywords: [
      { id: 'tank', title: 'Tank', kind: 'role' },
      { id: 'overflow', title: 'Overflow', kind: 'trait' },
      { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
      { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
    ],
    counters: [
      {
        id: 'echo',
        title: 'Echo',
        host: 'combatant',
        max: 3,
        // Two Readers on one Counter: the second observable for authored index
        // within a host, told apart by their `per`.
        readers: [
          { when: 'slot_fired', effect: 'boss_damage', per: 1 },
          { when: 'slot_fired', effect: 'boss_damage', per: 2 },
        ],
      },
      {
        id: 'stockpile',
        title: 'Stockpile',
        host: 'combatant',
        max: 5,
        duration_rounds: 1,
        readers: [{ when: 'round_start', effect: 'armor', per: 1 }],
      },
    ],
    bosses: [{ id: 'probe_boss', title: 'Probe Boss', max_health: 40 }],
    chargeModifiers: [],
    hazards: [],
    minions: [],
    programs: [{ id: 'probe_program', title: 'Probe Program', instant_beats: [], incoming_beats: [] }],
    encounters: [
      {
        id: 'probe_party',
        title: 'Probe Party',
        party: [{ hero: 'warden', start: { q: 0, r: 0 } }],
        boss: 'probe_boss',
        round_limit: 6,
        board_radius: 2,
        boss_start: { q: 1, r: 0 },
        slot_count: 1,
        hand_refill_target: 4,
        player_deck: [{ card: 'probe_strike', copies: 4 }],
        boss_programs: ['probe_program'],
        random_seed: 7,
      },
    ],
  })

  function startFixture(counterId: string, amount: number): EncounterState {
    const state = createEncounterState(fixture, 'probe_party')
    const placed = resolve(fixture, state, {
      kind: 'place_counter',
      sourceId: state.bossId,
      hostRef: combatantRef('warden'),
      counterId,
      amount,
      reasonText: 'probe',
    })
    expect(placed.facts[0].succeeded).toBe(true)
    return placed.state
  }

  it('slot_fired hears the Grant before the Reader, and one host answers in authored index order', () => {
    const state = startFixture('echo', 1)
    state.phase = 'quick'
    state.heroes.warden.actionBar[0].topCard = { instanceId: 'strike_probe', cardId: 'probe_strike' }
    state.heroes.warden.actionBar[0].charges = [{ instanceId: 'fuel_probe', cardId: 'probe_strike' }]
    const after = resolve(fixture, state, { kind: 'fire_slot', sourceId: 'warden', slotIndex: 0 })
    expect(after.facts[0].succeeded).toBe(true)
    expect(after.facts[0].detail.subscriber_matches).toEqual([
      { event: 'slot_fired', host: 'warden', kind: 'grant', id: 'probe_signature', when: 'slot_fired', outcome: 'charge_granted', reason: 'standing_clause', charges: 1 },
      { event: 'slot_fired', host: 'warden', kind: 'reader', id: 'echo', when: 'slot_fired', delta: 1 },
      { event: 'slot_fired', host: 'warden', kind: 'reader', id: 'echo', when: 'slot_fired', delta: 2 },
    ])
  })

  it('round_start hears the Reader before the Grant — the row decides, not the kind', () => {
    const state = startFixture('stockpile', 2)
    const after = resolve(fixture, state, { kind: 'round_start', sourceId: ENCOUNTER_SOURCE, round: 2 })
    expect(after.facts[0].succeeded).toBe(true)
    expect(after.facts[0].detail.subscriber_matches).toEqual([
      { event: 'round_start', host: 'warden', kind: 'reader', id: 'stockpile', when: 'round_start', delta: 2 },
      { event: 'round_start', host: 'warden', kind: 'grant', id: 'probe_signature', when: 'round_start', outcome: 'charge_granted', reason: 'standing_clause', charges: 1 },
    ])
  })
})

describe('Stake the Line, the first authored hex_entered consumer (D-086)', () => {
  // The shipped catalog end to end: the card plants the ground, the ground
  // bites the walker. Friend and foe alike — no team immunity, per the D-086
  // row's deliberate deferral.
  function stakedState(): { state: EncounterState; hex: { q: number; r: number } } {
    const state = createEncounterState(catalog, 'embermaw_prototype')
    const hero = state.heroes[state.primaryHeroId]
    const staked = { instanceId: 'stake-probe', cardId: 'stake_the_line' }
    hero.actionBar[0] = { topCard: staked, charges: [{ instanceId: 'fuel', cardId: 'steady_strike' }], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
    state.phase = 'slow'
    const heroAt = state.board.entities[state.primaryHeroId].coords
    const hex = { q: heroAt.q, r: heroAt.r - 1 }
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: hex })
    expect(fired.facts[0].succeeded).toBe(true)
    expect(fired.facts[0].detail).toMatchObject({ placedCounter: 'staked_ground', placedCounterAmount: 2 })
    return { state: fired.state, hex }
  }

  it('plants 2 Stakes on reachable ground, and the ground kills the Whelp that walks in', () => {
    const { state, hex } = stakedState()
    const spawnAt = { q: hex.q, r: hex.r - 1 }
    const spawned = resolve(catalog, state, {
      kind: 'spawn_minion',
      sourceId: state.bossId,
      minionId: 'whelp_probe',
      coords: spawnAt,
      minionContentId: 'whelp',
    })
    expect(spawned.facts[0].succeeded).toBe(true)
    const walked = resolve(catalog, spawned.state, {
      kind: 'traverse_piece',
      sourceId: 'whelp_probe',
      path: [hex],
      traversal: 'walk',
      reasonText: 'creep',
    })
    const bitten = damageFact(walked.facts)
    expect(bitten.detail).toMatchObject({ targetId: 'whelp_probe', amount: 2 })
    // 2 Stakes against 2 health: the add died to ground, no Hero credited.
    expect(bitten.resolutionFact).toMatchObject({ health_loss: 2, target_removed: true })
    expect(walked.state.board.entities.whelp_probe).toBeUndefined()
  })

  it('bites friend and foe alike', () => {
    const { state, hex } = stakedState()
    const healthBefore = state.heroes[state.primaryHeroId].health
    const stepped = resolve(catalog, state, {
      kind: 'traverse_piece',
      sourceId: state.primaryHeroId,
      path: [hex],
      traversal: 'walk',
      reasonText: 'careless step',
    })
    expect(stepped.state.heroes[state.primaryHeroId].health).toBe(healthBefore - 2)
  })
})

describe('the paired reader (D-087)', () => {
  it('reads Grant outcomes back off the record through readSubscriberMatches, and answers nothing with nothing', () => {
    // The reader is the one consumer-facing path — the sweep's sigGrant/
    // sigWaste columns and the board's earn floats both read through it — so
    // this asserts the read-back the old singular signature_event could not
    // give: a dealing-side earn (Maren's) with its reason and its stack.
    const state = createEncounterState(loadCatalog(), 'embermaw_attrition_trial')
    const maren = state.partyHeroIds.find((id) => id !== state.primaryHeroId)!
    const result = resolve(loadCatalog(), state, {
      kind: 'damage',
      sourceId: maren,
      targetId: state.bossId,
      amount: 2,
      reasonText: 'Strike the Entry',
    })
    const grants = readSubscriberMatches(result.facts[0].detail).filter((match) => match.kind === 'grant')
    expect(grants).toEqual([
      expect.objectContaining({ host: maren, when: 'host_deals_damage', outcome: 'charge_granted', reason: 'standing_clause', charges: 1 }),
    ])
    expect(readSubscriberMatches(undefined)).toEqual([])
    expect(readSubscriberMatches({})).toEqual([])
  })
})

describe('the hex_entered raise (D-086)', () => {
  // Ground's first Reader: a hex-hosted Counter answering the footstep. The
  // path carries the honesty (D-074): a walker's path lists every hex it
  // crosses, a jumper's only the one it lands on, so the raise inherits who
  // pays for what without a rule of its own.
  const fixture = buildCatalog({
    cards: [{ id: 'probe_strike', title: 'Probe Strike', speed: 'quick', boss_damage: 1, range_tiles: 1, tags: ['tank'] }],
    heroes: [{ id: 'warden', title: 'Warden', max_health: 20 }],
    keywords: [
      { id: 'tank', title: 'Tank', kind: 'role' },
      { id: 'overflow', title: 'Overflow', kind: 'trait' },
      { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
      { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
    ],
    counters: [
      {
        id: 'caltrops',
        title: 'Caltrops',
        host: 'hex',
        max: 2,
        readers: [{ when: 'host_entered', effect: 'target_damage', per: 2 }],
      },
    ],
    bosses: [{ id: 'probe_boss', title: 'Probe Boss', max_health: 40 }],
    chargeModifiers: [],
    hazards: [],
    minions: [],
    programs: [{ id: 'probe_program', title: 'Probe Program', instant_beats: [], incoming_beats: [] }],
    encounters: [
      {
        id: 'probe_party',
        title: 'Probe Party',
        party: [{ hero: 'warden', start: { q: 0, r: 0 } }],
        boss: 'probe_boss',
        round_limit: 6,
        board_radius: 2,
        boss_start: { q: 1, r: 0 },
        slot_count: 1,
        hand_refill_target: 4,
        player_deck: [{ card: 'probe_strike', copies: 4 }],
        boss_programs: ['probe_program'],
        random_seed: 7,
      },
    ],
  })

  function markedGround(): EncounterState {
    let state = createEncounterState(fixture, 'probe_party')
    for (const coords of [
      { q: 1, r: -1 },
      { q: 0, r: -1 },
    ]) {
      const placed = resolve(fixture, state, {
        kind: 'place_counter',
        sourceId: state.bossId,
        hostRef: hexCounterRef(coords),
        counterId: 'caltrops',
        amount: 1,
        reasonText: 'probe',
      })
      expect(placed.facts[0].succeeded).toBe(true)
      state = placed.state
    }
    return state
  }

  it('a walker pays every marked hex it crosses, one damage action per Counter, matches appended on one fact', () => {
    const state = markedGround()
    const walked = resolve(fixture, state, {
      kind: 'traverse_piece',
      sourceId: state.bossId,
      path: [
        { q: 1, r: -1 },
        { q: 0, r: -1 },
      ],
      traversal: 'walk',
      reasonText: 'probe walk',
    })
    const damage = walked.facts.filter((fact) => fact.kind === 'damage' && fact.succeeded)
    expect(damage.map((fact) => fact.detail)).toEqual([
      expect.objectContaining({ targetId: state.bossId, amount: 2 }),
      expect.objectContaining({ targetId: state.bossId, amount: 2 }),
    ])
    expect(walked.state.board.entities[state.bossId].health).toBe(36)
    // Two raises on the one traverse fact — appended, never overwritten.
    expect(readSubscriberMatches(walked.facts[0].detail)).toEqual([
      { event: 'hex_entered', host: 'hex:1,-1', kind: 'reader', id: 'caltrops', when: 'host_entered', delta: 2 },
      { event: 'hex_entered', host: 'hex:0,-1', kind: 'reader', id: 'caltrops', when: 'host_entered', delta: 2 },
    ])
  })

  it('a jumper pays only where it lands', () => {
    const state = markedGround()
    const jumped = resolve(fixture, state, {
      kind: 'traverse_piece',
      sourceId: state.bossId,
      path: [{ q: 0, r: -1 }],
      traversal: 'jump',
      reasonText: 'probe jump',
    })
    expect(jumped.facts.filter((fact) => fact.kind === 'damage' && fact.succeeded)).toHaveLength(1)
    expect(jumped.state.board.entities[state.bossId].health).toBe(38)
    expect(readSubscriberMatches(jumped.facts[0].detail)).toEqual([
      { event: 'hex_entered', host: 'hex:0,-1', kind: 'reader', id: 'caltrops', when: 'host_entered', delta: 2 },
    ])
  })
})
