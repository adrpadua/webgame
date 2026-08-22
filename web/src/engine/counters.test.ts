import { describe, expect, it } from 'vitest'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import { escalationActionsForRoundEnd } from './escalation'
import {
  advancePhase,
  combatantRef,
  hexCounterRef,
  slotRef,
  hexDistance,
  parseHexKey,
  hexKey,
  legality,
  resolve,
    type EncounterState,
  type ResolvedActionFact,
  } from '@/engine'

import { catalog, start, hero, boss, card, immortalHero, startBroodSecond, stepPhases } from './testkit'

describe('Fortify Slow commitment (D-019)', () => {
  it('lands its Armor at the next Round start, after the wipe, in time for the Instant Row', () => {
    // Reach Round 1's Slow Window and fire a charged Fortify. The seed is fixed
    // so the next Round is Brood Pattern, whose Instant Row carries the Raking
    // Claw — the banked Armor has to answer a hit that lands before any Round-2
    // window opens, and only a claw-carrying program provides one.
    let state = stepPhases(startBroodSecond(), 4).state
    expect(state.phase).toBe('slow')
    hero(state).hand = [card('f1', 'fortify'), card('f2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f2' }).state
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = fired.state
    expect(fired.facts[0].succeeded).toBe(true)
    // No Armor yet: the commitment is banked as the Fortified status.
    expect(hero(state).armor).toBe(0)
    expect(fired.facts[0].resolutionFact).toMatchObject({ counter_event: { counter_id: 'fortified', event: 'placed', reason: 'slow_commitment' } })

    // Round start wipes Armor first, then the commitment lands.
    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.round).toBe(2)
    expect(hero(state).armor).toBe(6)
    expect(state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)

    // The banked Armor answers Round 2's INSTANT row (Brood Pattern's Raking
    // Claw): 4 requested, fully blocked, zero Health loss — pressure nothing
    // fired inside Round 2 could have pre-blocked.
    const healthBefore = hero(state).health
    const instant = advancePhase(catalog, state)
    state = instant.state
    expect(state.phase).toBe('instant')
    expect(hero(state).health).toBe(healthBefore)
    expect(hero(state).armor).toBe(2)

    // The leftover Armor is ordinary Armor: the next Round start wipes it.
    state = stepPhases(state, 4).state
    expect(state.round).toBe(3)
    expect(hero(state).armor).toBe(0)
  })
})
describe('Authored Counters (D-032 to D-034, D-047)', () => {
  // No live card places a Counter yet — the first one changes the damage
  // economy and owes the deck-evaluation gate — so the vocabulary is proven
  // against a catalog variant, the pattern the acceleration test established.
  function withStatusCard(cardId: string, patch: Record<string, unknown>) {
    const variant = structuredClone(catalog)
    variant.cards[cardId] = { ...variant.cards.steady_strike, id: cardId, title: 'Test Card', boss_damage: 0, damage: 0, ...patch }
    return variant
  }

  function firedAt(variant: ReturnType<typeof withStatusCard>, cardId: string, targetId?: string, from?: EncounterState) {
    let state = from ?? start()
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', cardId), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
    return resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId })
  }

  it('authors every Counter as a marker plus Readers, with no payload of its own', () => {
    expect(Object.keys(catalog.counters)).toEqual(expect.arrayContaining(['fortified', 'sundered', 'weakened']))
    // D-034's two named payload fields are gone. What a Counter does is a
    // Reader, and which side it is "for" is just which event its Reader
    // fires on — Sundered raises what its host takes, Weakened lowers what
    // its host deals, and neither declares a side.
    expect(catalog.counters.sundered).toMatchObject({
      max: 1,
      duration_rounds: 1,
      readers: [{ when: 'host_damage_incoming', effect: 'target_damage', per: 1 }],
    })
    expect(catalog.counters.weakened).toMatchObject({
      readers: [{ when: 'host_deals_damage', effect: 'target_damage', per: -1 }],
    })
    // Fortified's banked Armor is its count, so additive stacking (D-019)
    // needs no flag: `max` above 1 is the whole rule.
    expect(catalog.counters.fortified).toMatchObject({
      duration_rounds: 1,
      readers: [{ when: 'round_start', effect: 'armor', per: 1 }],
    })
    expect(catalog.counters.fortified.max).toBeGreaterThan(1)
  })

  it('lands a Counter on the Boss, and refuses it from outside the card\'s reach', () => {
    // The Boss answers the same reach every other Enemy does (D-073). It was
    // the one target exempt from range, to stay consistent with positionless
    // `boss_damage`; that ruling is gone, and so is the exemption.
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 1 })
    const state = start()
    const fired = firedAt(variant, 'sunder_test', state.bossId)
    expect(fired.facts[0].succeeded).toBe(true)
    expect(fired.state.counters[combatantRef(state.bossId)]?.[0]).toMatchObject({
      id: 'sundered',
      count: 1,
      readers: [{ when: 'host_damage_incoming', effect: 'target_damage', per: 1 }],
    })

    // The same card and the same Boss, from the far side of the arena. The
    // hex is picked as the furthest one on the board rather than written down,
    // because Embermaw closes a hex of its own during the Instant Row (D-041)
    // and a hand-picked hex would only be out of reach until it did.
    const stepped = structuredClone(state)
    const bossCoords = stepped.board.entities[stepped.bossId].coords
    const furthest = Object.keys(stepped.board.hexes)
      .map(parseHexKey)
      .sort((left, right) => hexDistance(right, bossCoords) - hexDistance(left, bossCoords))[0]
    stepped.board.entities[stepped.primaryHeroId].coords = furthest
    const refused = firedAt(variant, 'sunder_test', stepped.bossId, stepped)
    expect(refused.facts[0]).toMatchObject({ succeeded: false, reason: "The chosen Enemy is outside the Top Card's range." })
    expect(refused.state.counters[combatantRef(stepped.bossId)]).toBeUndefined()
  })

  it('raises damage the Sundered Boss takes', () => {
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 1 })
    const state = start()
    const sundered = firedAt(variant, 'sunder_test', state.bossId).state
    const before = sundered.board.entities[sundered.bossId].health
    const hit = resolve(catalog, sundered, {
      kind: 'damage',
      sourceId: sundered.primaryHeroId,
      targetId: sundered.bossId,
      amount: 3,
      reasonText: 'test',
    })
    expect(hit.facts[0].resolutionFact).toMatchObject({ requested: 4 })
    expect(hit.state.board.entities[hit.state.bossId].health).toBe(before - 4)
  })

  it('lowers damage a Weakened Enemy deals', () => {
    const variant = withStatusCard('weaken_test', { places_counter: 'weakened', target_type: 'piece', range_tiles: 1 })
    const state = start()
    const weakened = firedAt(variant, 'weaken_test', state.bossId).state
    const healthBefore = hero(weakened).health
    const armorBefore = hero(weakened).armor
    const hit = resolve(catalog, weakened, {
      kind: 'damage',
      sourceId: weakened.bossId,
      targetId: weakened.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
    })
    expect(hit.facts[0].resolutionFact).toMatchObject({ requested: 3 })
    expect(healthBefore - hit.state.heroes[weakened.primaryHeroId].health + armorBefore).toBeGreaterThan(0)
  })

  it('refuses a second copy of a max-1 Counter', () => {
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 1 })
    let state = stepPhases(start(), 2).state
    expect(state.phase).toBe('quick')
    // Two Slots, same quick-speed card, one window: the Slot activation limit
    // is per Slot, so the second fire is legal and the status is what refuses.
    hero(state).hand = [card('a1', 'sunder_test'), card('a2', 'steady_strike'), card('b1', 'sunder_test'), card('b2', 'steady_strike')]
    for (const [slotIndex, top, charge] of [
      [0, 'a1', 'a2'],
      [1, 'b1', 'b2'],
    ] as const) {
      state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId: top }).state
      state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId: charge }).state
    }
    const first = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(first.facts[0].succeeded).toBe(true)
    expect(first.facts[0].detail.placedCounterAmount).toBe(1)
    const second = resolve(variant, first.state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 1, targetId: state.bossId })
    expect(second.facts[0].succeeded).toBe(true)
    // A max-1 Counter refuses the second placement by landing zero of it,
    // which is the old non-stacking flag expressed as arithmetic.
    expect(second.facts[0].detail.placedCounterAmount).toBe(0)
    expect(second.state.counters[combatantRef(state.bossId)] ?? []).toHaveLength(1)
  })

  it('refuses a piece-targeting Counter with no Enemy target', () => {
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 1 })
    const fired = firedAt(variant, 'sunder_test', undefined)
    expect(fired.facts[0].succeeded).toBe(false)
    expect(fired.facts[0].reason).toContain('Enemy target')
  })

  it('ticks a Counter down at the Round boundary and takes it off', () => {
    // The mechanism was two-sided from D-032, but the Round's tick ran over
    // the Heroes alone: an authored `duration_rounds` meant nothing on an
    // Enemy, so a single Sunder marked the Boss for the rest of the fight.
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 1 })
    const opening = start()
    let state = immortalHero(firedAt(variant, 'sunder_test', opening.bossId).state)
    expect(state.counters[combatantRef(state.bossId)]).toHaveLength(1)
    expect(state.counters[combatantRef(state.bossId)][0].remainingRounds).toBe(1)

    const round = state.round
    const facts: ResolvedActionFact[] = []
    for (let index = 0; index < 3; index += 1) {
      const step = advancePhase(variant, state)
      state = step.state
      facts.push(...step.facts)
    }
    expect(state.round).toBe(round + 1)
    expect(state.counters[combatantRef(state.bossId)] ?? []).toHaveLength(0)

    // The Round's own fact says what left, so a client never has to diff two
    // states to narrate an expiry.
    const roundStart = facts.find((fact) => fact.kind === 'round_start')!
    expect(roundStart.detail.expiredCounters).toEqual([
      expect.objectContaining({ host: combatantRef(state.bossId), counter_id: 'sundered', event: 'expired', reason: 'duration_elapsed' }),
    ])

    // And the Boss takes plain damage again.
    const hit = resolve(catalog, state, { kind: 'damage', sourceId: state.primaryHeroId, targetId: state.bossId, amount: 3, reasonText: 'test' })
    expect(hit.facts[0].resolutionFact).toMatchObject({ requested: 3 })
  })

  it('gives a Minion the same Counter clock, and lets neither outlive it', () => {
    // Range is the only thing that differs from the Boss (D-034), so the
    // card reaches across the board and the subject stays the clock.
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 8 })
    let state = immortalHero(start())
    const taken = new Set(Object.values(state.board.entities).map((entity) => hexKey(entity.coords)))
    const [q, r] = Object.keys(state.board.hexes)
      .find((key) => !taken.has(key))!
      .split(',')
      .map(Number)
    state = resolve(variant, state, {
      kind: 'spawn_minion',
      sourceId: state.bossId,
      minionId: 'status_whelp',
      coords: { q, r },
      minionContentId: 'ember_whelp',
    }).state
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', 'sunder_test'), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
    state = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: 'status_whelp' }).state
    expect(state.counters[combatantRef('status_whelp')]).toHaveLength(1)

    // Sundered raises what the Whelp takes: 1 requested becomes 2, which is
    // the Whelp's whole Health, so the same hit also proves the cleanup.
    const killed = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: 'status_whelp',
      amount: 1,
      reasonText: 'test',
    })
    expect(killed.facts[0].resolutionFact).toMatchObject({ requested: 2, target_removed: true })
    expect(killed.state.counters[combatantRef('status_whelp')]).toBeUndefined()
  })

  it('drops a Counter held by a piece that has left the board', () => {
    // Belt and braces on the Round's upkeep: whatever removed the piece, the
    // Round start must not carry its afflictions forward.
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 1 })
    const opening = start()
    let state = immortalHero(firedAt(variant, 'sunder_test', opening.bossId).state)
    state.counters[combatantRef('ghost_whelp')] = [...state.counters[combatantRef(state.bossId)]]
    for (let index = 0; index < 3; index += 1) {
      state = advancePhase(variant, state).state
    }
    expect(state.counters[combatantRef('ghost_whelp')]).toBeUndefined()
  })

  it('still lands Fortified from its authored definition (D-019 unchanged)', () => {
    let state = stepPhases(start(), 4).state
    expect(state.phase).toBe('slow')
    hero(state).hand = [card('f1', 'fortify'), card('f2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f2' }).state
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    const fortified = fired.state.counters[combatantRef(state.primaryHeroId)]?.find((counter) => counter.id === 'fortified')
    // The banked Armor is the count now: six Counters, one Reader paying one
    // Armor each. Same six Armor, arrived at by counting rather than by a
    // dedicated field on the marker.
    expect(fortified).toMatchObject({
      title: catalog.counters.fortified.title,
      count: 6,
      readers: [{ when: 'round_start', effect: 'armor', per: 1 }],
    })
  })
})
describe('Counter Readers — gate, scale, spend (D-047)', () => {
  // A Counter that is nothing but a marker, so every number in these tests
  // comes from a Reader rather than from the Counter itself. This is the
  // point of the vocabulary: Ash means whatever the cards that read Ash say
  // it means, and Ash itself says nothing.
  const ASH = {
    id: 'ash',
    title: 'Ash',
    rules_text: 'Cinders cling to what they touch.',
    keywords: ['guard'],
    host: 'combatant' as const,
    max: 5,
    duration_rounds: 0,
    readers: [],
  }

  function withAsh(cards: Record<string, Record<string, unknown>>) {
    const variant = structuredClone(catalog)
    variant.counters.ash = { ...ASH }
    for (const [cardId, patch] of Object.entries(cards)) {
      // Charge Modifiers off: these tests are about what a Reader adds, and a
      // charged Steady Strike would fold its own bonus into every number.
      variant.cards[cardId] = { ...variant.cards.steady_strike, id: cardId, title: cardId, boss_damage: 0, damage: 0, charge_modifiers: [], ...patch }
    }
    return variant
  }

  // Puts `count` Ash on a piece directly. Placement has its own tests; these
  // are about what reading them does.
  function withAshOn(variant: ReturnType<typeof withAsh>, state: EncounterState, entityId: string, count: number) {
    state.counters[combatantRef(entityId)] = [
      {
        id: 'ash',
        title: 'Ash',
        count,
        max: variant.counters.ash.max,
        remainingRounds: 0,
        readers: [],
        triggerReason: 'test',
        sourceId: 'test',
        sourceBeatId: '',
        triggerRound: state.round,
        triggerPhase: state.phase,
      },
    ]
    return state
  }

  function armed(variant: ReturnType<typeof withAsh>, cardId: string) {
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', cardId), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    return resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
  }

  it('scales a Card effect by the Counters its target is holding', () => {
    const variant = withAsh({
      cinder_reap: {
        target_type: 'piece',
        range_tiles: 8,
        damage: 0,
        boss_damage: 1,
        reads: [{ verb: 'scale', counter: 'ash', on: 'target', effect: 'boss_damage', per: 2, at_least: 0, amount: 0, timing: 'cost', counter_keyword: '' }],
      },
    })
    let state = armed(variant, 'cinder_reap')
    state = withAshOn(variant, state, state.bossId, 3)
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    // 1 printed + 2 per Ash × 3 held.
    expect(before - fired.state.board.entities[state.bossId].health).toBe(7)
  })

  it('gates a Card on a count, and the gate is an ordinary legality verdict', () => {
    const variant = withAsh({
      ash_pact: {
        target_type: 'piece',
        range_tiles: 8,
        boss_damage: 4,
        reads: [{ verb: 'gate', counter: 'ash', on: 'target', at_least: 3, per: 0, amount: 0, effect: 'target_damage', timing: 'cost', counter_keyword: '' }],
      },
    })
    let state = armed(variant, 'ash_pact')
    const fire = { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId } as const

    state = withAshOn(variant, state, state.bossId, 2)
    const short = legality(variant, state, fire)
    expect(short.legal).toBe(false)
    expect(short.reason).toContain('Counters')
    // Illegal at the predicate means illegal at resolution: the two are the
    // same question asked once.
    expect(resolve(variant, state, fire).facts[0].succeeded).toBe(false)

    state = withAshOn(variant, state, state.bossId, 3)
    expect(legality(variant, state, fire).legal).toBe(true)
    expect(resolve(variant, state, fire).facts[0].succeeded).toBe(true)
  })

  it('pays a cost before the same Card scales off what is left', () => {
    // The ordinary reading of paying for something, and the reason `timing`
    // exists: spend 2 of 3 Ash, then scale off the 1 remaining.
    const variant = withAsh({
      ash_burn: {
        target_type: 'piece',
        range_tiles: 8,
        boss_damage: 0,
        reads: [
          { verb: 'spend', counter: 'ash', on: 'target', amount: 2, timing: 'cost', at_least: 0, per: 0, effect: 'target_damage', counter_keyword: '' },
          { verb: 'scale', counter: 'ash', on: 'target', per: 3, effect: 'boss_damage', timing: 'cost', at_least: 0, amount: 0, counter_keyword: '' },
        ],
      },
    })
    let state = armed(variant, 'ash_burn')
    state = withAshOn(variant, state, state.bossId, 3)
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(before - fired.state.board.entities[state.bossId].health).toBe(3)
    expect(fired.state.counters[combatantRef(state.bossId)][0].count).toBe(1)
    expect(fired.facts[0].detail.spentCounters).toEqual([{ counter_id: 'ash', host: combatantRef(state.bossId), amount: 2, timing: 'cost' }])
  })

  it('spends at resolution after scaling, when the Card says so', () => {
    const variant = withAsh({
      ash_late: {
        target_type: 'piece',
        range_tiles: 8,
        boss_damage: 0,
        reads: [
          { verb: 'spend', counter: 'ash', on: 'target', amount: 2, timing: 'resolution', at_least: 0, per: 0, effect: 'target_damage', counter_keyword: '' },
          { verb: 'scale', counter: 'ash', on: 'target', per: 3, effect: 'boss_damage', timing: 'cost', at_least: 0, amount: 0, counter_keyword: '' },
        ],
      },
    })
    let state = armed(variant, 'ash_late')
    state = withAshOn(variant, state, state.bossId, 3)
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    // Same card, same board, one field different: 3 Ash scale before the
    // spend rather than after.
    expect(before - fired.state.board.entities[state.bossId].health).toBe(9)
    expect(fired.state.counters[combatantRef(state.bossId)][0].count).toBe(1)
  })

  it('reads every Counter carrying a Keyword, not just one named Counter', () => {
    // The Charge Modifier's match-by-keyword lifted off the Charge Stack: a
    // card can be written before the Counter it will one day read exists.
    const variant = withAsh({
      keyword_reap: {
        target_type: 'piece',
        range_tiles: 8,
        boss_damage: 0,
        reads: [{ verb: 'scale', counter_keyword: 'guard', on: 'target', per: 2, effect: 'boss_damage', timing: 'cost', at_least: 0, amount: 0, counter: '' }],
      },
    })
    let state = armed(variant, 'keyword_reap')
    state = withAshOn(variant, state, state.bossId, 2)
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(before - fired.state.board.entities[state.bossId].health).toBe(4)
  })

  it('places several Counters at once and stops at the authored max', () => {
    const variant = withAsh({
      ash_spread: { target_type: 'piece', range_tiles: 8, places_counter: 'ash', counter_amount: 4 },
    })
    let state = armed(variant, 'ash_spread')
    const first = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(first.facts[0].detail.placedCounterAmount).toBe(4)

    // A second cast onto a max-5 stack lands the 1 that fits and says so,
    // rather than refusing outright or overfilling.
    state = armed(variant, 'ash_spread')
    state.counters = structuredClone(first.state.counters)
    const second = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(second.facts[0].detail.placedCounterAmount).toBe(1)
    expect(second.state.counters[combatantRef(state.bossId)][0].count).toBe(5)
  })
})
describe('The Boss marks too (D-051)', () => {
  it('banks Heat on itself, and every Heat makes its blows land harder', () => {
    // The half Counters were missing: the party could mark the Boss and the
    // Boss could not mark back. Heat is the Boss marking itself, which the
    // party watches accrue and may spend a card cooling.
    let state = immortalHero(start())
    const heatBeat = catalog.programs.embermaw_embers.instant_beats.find((beat) => beat.kind === 'place_counter')!
    expect(heatBeat).toMatchObject({ counter: 'heat', counter_target: 'self' })
    const banked = heatBeat.counter_amount

    const placed = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: heatBeat, track: 'instant' })
    state = placed.state
    expect(state.counters[combatantRef(state.bossId)][0]).toMatchObject({ id: 'heat', count: banked })

    // Every Heat, one more damage on everything it throws. Read off the
    // authored amount rather than a literal, because the amount is a tuning
    // dial: pinning it here would make retuning the Beat fail this test for a
    // reason that has nothing to do with whether Heat is read at all.
    const hit = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'test',
    })
    expect(hit.facts[0].resolutionFact).toMatchObject({ requested: 4 + banked })
  })

  it('marks the Party when the Beat says hero, not itself', () => {
    // `counter_target` is the whole direction of the mark, and getting it
    // backwards would put the Boss's own debuff on the Boss.
    const state = immortalHero(start())
    const beat = {
      ...catalog.programs.embermaw_embers.instant_beats.find((b) => b.kind === 'place_counter')!,
      counter_target: 'hero' as const,
      range_tiles: 1,
    }
    const marked = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat, track: 'instant' })
    expect(marked.state.counters[combatantRef(state.primaryHeroId)]?.[0]).toMatchObject({ id: 'heat', count: beat.counter_amount })
    expect(marked.state.counters[combatantRef(state.bossId)] ?? []).toHaveLength(0)
  })

  it('reaches for the Hero it marks, and comes up short from the far side (D-074)', () => {
    // The Boss side of D-073. Marking the Party was the last thing a Beat could
    // do to a Hero from anywhere on the board, and it stayed that way only
    // because no authored Beat marked a Hero.
    const beat = {
      ...catalog.programs.embermaw_embers.instant_beats.find((b) => b.kind === 'place_counter')!,
      counter_target: 'hero' as const,
      range_tiles: 1,
    }
    const state = immortalHero(start())
    const bossCoords = boss(state).coords
    const furthest = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .sort((left, right) => hexDistance(right, bossCoords) - hexDistance(left, bossCoords))[0]
    expect(hexDistance(furthest, bossCoords)).toBeGreaterThan(beat.range_tiles)
    state.board.entities[state.primaryHeroId].coords = furthest

    const missed = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat, track: 'instant' })
    expect(missed.state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)
    // Marking itself measures nothing: the same Beat aimed inward still lands
    // from the same hex.
    const inward = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: { ...beat, counter_target: 'self' as const, range_tiles: 0 }, track: 'instant' })
    expect(inward.state.counters[combatantRef(state.bossId)]?.[0]).toMatchObject({ id: 'heat' })
  })

  // The price. Heat used to pay out only in Boss damage, and the sweep said
  // what that was worth: trading two Steady Strike for two Quench cost the
  // damage plan a fifth of its damage and moved the Round the run ended on by
  // 0.00. A decision that cannot reach the clock is not a decision (ADR 0027),
  // so a Counter left at its cap is now a standing demand like a Minion is.
  it('bills a Counter left at its cap, and not one below it', () => {
    let state = immortalHero(start())
    const cap = catalog.counters.heat.max
    expect(cap).toBeGreaterThan(1)
    // A one-at-a-time Stoke, so the stack can be walked up to the cap and the
    // boundary asked on both sides of it. The shipped Beat banks the cap in one
    // go, which would only ever show the billed side.
    const heatBeat = { ...catalog.programs.embermaw_embers.instant_beats.find((beat) => beat.kind === 'place_counter')!, counter_amount: 1 }
    const reasons = (source: typeof catalog): string[] =>
      escalationActionsForRoundEnd(source, state)
        .filter((action) => action.kind === 'gain_escalation')
        .map((action) => action.reason)

    expect(reasons(catalog)).not.toContain('unanswered_counter')
    for (let placed = 1; placed < cap; placed += 1) {
      state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: heatBeat, track: 'instant' }).state
      expect(reasons(catalog)).not.toContain('unanswered_counter')
    }
    state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: heatBeat, track: 'instant' }).state
    expect(reasons(catalog)).toContain('unanswered_counter')

    // And the threshold is the Counter's authored cap, not a literal. Raise the
    // cap and the same stack stops being billed — which is what makes `max`
    // load-bearing rather than decorative, and what gives the demand its slack:
    // Heat can be ignored for a while and then cannot.
    const deeper = structuredClone(catalog)
    deeper.counters.heat.max = cap + 1
    expect(reasons(deeper)).not.toContain('unanswered_counter')
  })

  it('asks the Hero for a Beat that marks the Hero', () => {
    // The demand reads where the Beat actually places it. Reading only the Boss
    // would price half the mechanic: a Counter piled onto a Hero would sit at
    // its cap unanswered and cost nothing.
    const marking = structuredClone(catalog)
    const beat = marking.programs.embermaw_embers.instant_beats.find((entry) => entry.kind === 'place_counter')!
    beat.counter_target = 'hero'
    beat.range_tiles = 1
    let state = immortalHero(start())
    const reasons = (): string[] =>
      escalationActionsForRoundEnd(marking, state)
        .filter((action) => action.kind === 'gain_escalation')
        .map((action) => action.reason)

    // The Boss at its own cap answers nothing here: this Beat marks the Party.
    const onSelf = { ...beat, counter_target: 'self' as const }
    state = resolve(marking, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: onSelf, track: 'instant' }).state
    expect(reasons()).not.toContain('unanswered_counter')
    state = resolve(marking, state, { kind: 'resolve_boss', sourceId: state.bossId, beat, track: 'instant' }).state
    expect(reasons()).toContain('unanswered_counter')
  })

  it('stops banking at the authored cap, and says so', () => {
    let state = immortalHero(start())
    const heatBeat = catalog.programs.embermaw_embers.instant_beats.find((beat) => beat.kind === 'place_counter')!
    const cap = catalog.counters.heat.max
    let last
    for (let index = 0; index < cap + 2; index += 1) {
      last = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: heatBeat, track: 'instant' })
      state = last.state
    }
    expect(state.counters[combatantRef(state.bossId)][0].count).toBe(cap)
    // The Beat past the cap records that nothing landed rather than pretending.
    const placement = last!.facts.find((fact) => fact.kind === 'place_counter')!
    expect(placement.detail.placedCounterAmount).toBe(0)
  })
})
describe('Ground that burns for good (D-050)', () => {
  // The open question D-048 logged, answered: a structural Threshold closes
  // the arena, and a hex nobody can stand on should not keep paying out what
  // was banked there. Temporary weather is different — the ground outlives it.
  function withGroundCounter() {
    const variant = structuredClone(catalog)
    variant.counters.embers = {
      id: 'embers', title: 'Embers', rules_text: '', keywords: [],
      host: 'hex', max: 3, duration_rounds: 0, readers: [],
    }
    variant.cards.scatter = {
      ...variant.cards.steady_strike, id: 'scatter', title: 'Scatter', boss_damage: 0, damage: 0,
      charge_modifiers: [], target_type: 'hex', range_tiles: 2, burst_radius: 0,
      places_counter: 'embers', counter_amount: 2,
    }
    return variant
  }

  function marked(variant: ReturnType<typeof withGroundCounter>) {
    let state = immortalHero(start())
    state = advancePhase(variant, advancePhase(variant, state).state).state
    hero(state).hand = [card('s1', 'scatter'), card('s2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 's1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 's2' }).state
    const ground = state.board.entities[state.primaryHeroId].coords
    state = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: ground }).state
    expect(state.counters[hexCounterRef(ground)]).toHaveLength(1)
    return { state, ground }
  }

  it('takes the Counters on a hex with it when the burn is permanent', () => {
    const variant = withGroundCounter()
    const { state, ground } = marked(variant)
    const burnt = resolve(variant, state, {
      kind: 'apply_hazard',
      sourceId: state.bossId,
      coords: ground,
      hazardId: 'scorched',
      fallbackDurationRounds: 1,
      permanent: true,
    })
    expect(burnt.facts[0].detail.clearedHexCounters).toBe(true)
    expect(burnt.state.counters[hexCounterRef(ground)]).toBeUndefined()
  })

  it('leaves them alone when the Hazard is weather the ground outlives', () => {
    const variant = withGroundCounter()
    const { state, ground } = marked(variant)
    const burnt = resolve(variant, state, {
      kind: 'apply_hazard',
      sourceId: state.bossId,
      coords: ground,
      hazardId: 'scorched',
      fallbackDurationRounds: 1,
    })
    expect(burnt.facts[0].detail.clearedHexCounters).toBeUndefined()
    expect(burnt.state.counters[hexCounterRef(ground)]).toHaveLength(1)
  })
})
describe('Quench, the first Card that reads a Counter (D-052)', () => {
  it('scales off the Heat it is about to remove, then removes it', () => {
    // `resolution` timing is the whole card: it scales off the full Heat and
    // cools afterwards, so a hotter Boss is a bigger hit *and* a bigger cool.
    //
    // Run against a Boss that can bank deeper than Quench draws off, so the
    // partial cool is visible. Live Heat caps at exactly what Quench removes —
    // the cap is what the Escalation demand is priced at (ADR 0027), and one
    // Quench is meant to be a complete answer — which would make every cool a
    // full one and leave the clamp in `spendCounter` unexercised.
    const deeper = structuredClone(catalog)
    deeper.counters.heat.max = 3
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    const heatBeat = { ...deeper.programs.embermaw_embers.instant_beats.find((beat) => beat.kind === 'place_counter')!, counter_amount: 1 }
    for (let index = 0; index < 3; index += 1) {
      state = resolve(deeper, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: heatBeat, track: 'instant' }).state
    }
    expect(state.counters[combatantRef(state.bossId)][0].count).toBe(3)

    hero(state).hand = [card('q1', 'quench'), card('q2', 'steady_strike')]
    state = resolve(deeper, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'q1' }).state
    state = resolve(deeper, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'q2' }).state
    const before = state.board.entities[state.bossId].health
    const fired = resolve(deeper, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })

    // 2 printed + 1 per Heat × 3 held.
    expect(before - fired.state.board.entities[state.bossId].health).toBe(5)
    expect(fired.state.counters[combatantRef(state.bossId)][0].count).toBe(1)
  })

  it('is a plain 2 with the Boss cold, so it is never a dead card', () => {
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    hero(state).hand = [card('q1', 'quench'), card('q2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'q1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'q2' }).state
    const before = state.board.entities[state.bossId].health
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(before - fired.state.board.entities[state.bossId].health).toBe(2)
  })

  it('is in the deck because the demand it answers is priced (D-003)', () => {
    // Promotion, and the reason for it. Quench sat in the candidate deck while
    // Heat paid out only in Boss damage: the sweep measured the trade at a
    // fifth of the damage plan's output for 0.00 Rounds, which is not a card
    // worth a slot. Pricing Heat in Escalation changed the reading and made the
    // promotion mandatory rather than optional — D-003 forbids pricing a demand
    // the deck cannot answer, and Quench is the only answer authored.
    const live = catalog.encounters.embermaw_prototype.player_deck.map((entry) => entry.card)
    expect(live).toContain('quench')
    // The candidate deck stays, unchanged, as the before-picture the promotion
    // was argued from.
    expect(catalog.decks.aegis_heat_answer.player_deck.map((entry) => entry.card)).toContain('quench')
    expect(catalog.decks.aegis_heat_answer.encounter).toBe('embermaw_prototype')
  })
})
describe('Counter hosts — ground and prepared cards (D-048)', () => {
  function withHosts(counters: Record<string, Record<string, unknown>>, cards: Record<string, Record<string, unknown>>) {
    const variant = structuredClone(catalog)
    for (const [id, patch] of Object.entries(counters)) {
      variant.counters[id] = { id, title: id, rules_text: '', keywords: [], host: 'combatant', max: 5, duration_rounds: 0, readers: [], ...patch }
    }
    for (const [cardId, patch] of Object.entries(cards)) {
      variant.cards[cardId] = { ...variant.cards.steady_strike, id: cardId, title: cardId, boss_damage: 0, damage: 0, charge_modifiers: [], ...patch }
    }
    return variant
  }

  function armed(variant: ReturnType<typeof withHosts>, cardId: string, slotIndex = 0) {
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', cardId), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId: 't1' }).state
    return resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId: 't2' }).state
  }

  const heroHex = (state: EncounterState) => state.board.entities[state.primaryHeroId].coords

  // stepPhases reads the module catalog; these tests hold variant cards in
  // Slots, so they need the variant's own advance.
  function steps(variant: ReturnType<typeof withHosts>, state: EncounterState, count: number): EncounterState {
    let current = state
    for (let index = 0; index < count; index += 1) {
      current = advancePhase(variant, current).state
    }
    return current
  }

  it('puts a Counter on ground, where it outlives whoever was standing there', () => {
    const variant = withHosts(
      { embers: { host: 'hex', max: 3 } },
      {
        scatter: { target_type: 'hex', range_tiles: 2, burst_radius: 0, places_counter: 'embers', counter_amount: 2 },
        reap: {
          target_type: 'hex',
          range_tiles: 2,
          burst_radius: 0,
          boss_damage: 0,
          reads: [{ verb: 'scale', counter: 'embers', on: 'target', per: 3, effect: 'boss_damage', timing: 'cost', at_least: 0, amount: 0, counter_keyword: '' }],
        },
      },
    )
    let state = armed(variant, 'scatter')
    const ground = heroHex(state)
    const scattered = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: ground })
    expect(scattered.facts[0].detail.placedCounterAmount).toBe(2)
    expect(scattered.state.counters[hexCounterRef(ground)][0]).toMatchObject({ id: 'embers', count: 2 })
    // Ground is not a piece: nothing about the Hero standing on it is
    // recorded, and moving off changes nothing.
    expect(scattered.state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)

    state = armed(variant, 'reap')
    state.counters = structuredClone(scattered.state.counters)
    const before = state.board.entities[state.bossId].health
    const reaped = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: ground })
    expect(before - reaped.state.board.entities[state.bossId].health).toBe(6)
  })

  it('refuses a hex Counter aimed off the board or out of range', () => {
    const variant = withHosts(
      { embers: { host: 'hex', max: 3 } },
      { scatter: { target_type: 'hex', range_tiles: 1, burst_radius: 0, places_counter: 'embers' } },
    )
    const state = armed(variant, 'scatter')
    const fire = (targetHex: { q: number; r: number }) =>
      legality(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex })
    expect(fire({ q: 99, r: 99 }).legal).toBe(false)
    const far = { q: heroHex(state).q + 3, r: heroHex(state).r }
    expect(fire(far).legal).toBe(false)
    expect(fire(heroHex(state)).legal).toBe(true)
  })

  it('puts a Counter on a prepared Slot, and drops it when that Slot is re-loaded', () => {
    // D-035's attachment, reachable at last. The Counter rides the prepared
    // card rather than the Slot's position, so swapping the card drops it.
    const variant = withHosts(
      { oath: { host: 'slot', max: 1 } },
      { bind: { target_type: 'board_slot', places_counter: 'oath' } },
    )
    let state = armed(variant, 'bind', 0)
    // Slot 1 holds a prepared card for the Counter to ride.
    hero(state).hand = [card('s1', 'iron_guard')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 1, cardInstanceId: 's1' }).state

    const bound = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetSlot: { heroId: state.primaryHeroId, slotIndex: 1 } })
    expect(bound.facts[0].succeeded).toBe(true)
    expect(bound.state.counters[slotRef(state.primaryHeroId, 1)][0]).toMatchObject({ id: 'oath', count: 1 })

    // Replacing a Slot is a Loadout action, so the swap happens next Round.
    const after = steps(variant, bound.state, 3)
    expect(after.phase).toBe('loadout')
    expect(after.counters[slotRef(after.primaryHeroId, 1)]).toHaveLength(1)
    hero(after).hand = [card('s2', 'iron_guard')]
    const reloaded = resolve(variant, after, { kind: 'load_slot', sourceId: after.primaryHeroId, slotIndex: 1, cardInstanceId: 's2' })
    expect(reloaded.facts[0].succeeded).toBe(true)
    expect(reloaded.facts[0].detail.clearedSlotCounters).toBe(true)
    expect(reloaded.state.counters[slotRef(after.primaryHeroId, 1)]).toBeUndefined()
  })

  it('refuses a Slot Counter aimed at an empty Slot', () => {
    const variant = withHosts(
      { oath: { host: 'slot', max: 1 } },
      { bind: { target_type: 'board_slot', places_counter: 'oath' } },
    )
    const state = armed(variant, 'bind', 0)
    // Slot 1 is the empty one: slot 2 is the Signature now, and a Signature
    // Slot always holds its printed Top Card (D-064).
    const verdict = legality(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetSlot: { heroId: state.primaryHeroId, slotIndex: 1 } })
    expect(verdict.legal).toBe(false)
    expect(verdict.reason).toContain('prepared Slot')
  })

  it('drops ground Counters when the hex leaves the board', () => {
    // The upkeep asks whether the host is still there, not what kind of host
    // it was. Note what this does *not* prove: no live mechanic removes a hex.
    // A structural Escalation Threshold lays a permanent Hazard on ground
    // (D-031) rather than taking it off the board, so a Counter on Scorched
    // ground survives today. This deletes the hex directly to reach the
    // liveness rule; whether Scorch should also drop Counters is a design
    // question nobody has answered.
    const variant = withHosts(
      { embers: { host: 'hex', max: 3 } },
      { scatter: { target_type: 'hex', range_tiles: 2, burst_radius: 0, places_counter: 'embers' } },
    )
    let state = armed(variant, 'scatter')
    const ground = heroHex(state)
    state = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: ground }).state
    expect(state.counters[hexCounterRef(ground)]).toHaveLength(1)

    delete state.board.hexes[hexKey(ground)]
    state = steps(variant, state, 3)
    expect(state.counters[hexCounterRef(ground)]).toBeUndefined()
  })
})
describe('Event Keywords — Readers that answer one kind of blow (D-049)', () => {
  // The fact stream already carried what a blow was made of; D-049 is what
  // lets content read it. A Reader with no `event_keyword` answers every blow
  // of its kind, and one that names a Keyword answers only blows carrying it —
  // the same Reader with one field different.
  function withWard(eventKeyword: string) {
    const variant = structuredClone(catalog)
    variant.counters.warded = {
      id: 'warded',
      title: 'Warded',
      rules_text: 'Answers one kind of blow.',
      keywords: [],
      host: 'combatant',
      max: 1,
      duration_rounds: 0,
      readers: [{ when: 'host_damage_incoming', event_keyword: eventKeyword, effect: 'target_damage', per: -2 }],
    }
    return variant
  }

  function warded(variant: ReturnType<typeof withWard>) {
    const state = immortalHero(start())
    state.counters[combatantRef(state.primaryHeroId)] = [
      {
        id: 'warded',
        title: 'Warded',
        count: 1,
        max: 1,
        remainingRounds: 0,
        readers: variant.counters.warded.readers.map((reader) => ({ ...reader })),
        triggerReason: 'test',
        sourceId: 'test',
        sourceBeatId: '',
        triggerRound: state.round,
        triggerPhase: state.phase,
      },
    ]
    return state
  }

  const blow = (state: EncounterState, keywords: string[]) => ({
    kind: 'damage' as const,
    sourceId: state.bossId,
    targetId: state.primaryHeroId,
    amount: 5,
    reasonText: 'test',
    factContext: { damage_keywords: keywords },
  })

  it('answers only the blows carrying its Keyword', () => {
    const variant = withWard('raid_hit')
    const state = warded(variant)
    expect(resolve(variant, state, blow(state, ['raid_hit'])).facts[0].resolutionFact).toMatchObject({ requested: 3 })
    // A Tank Hit is a different kind of blow, so the ward is silent.
    expect(resolve(variant, state, blow(state, ['tank_hit'])).facts[0].resolutionFact).toMatchObject({ requested: 5 })
    // And a blow made of nothing named goes through untouched.
    expect(resolve(variant, state, blow(state, [])).facts[0].resolutionFact).toMatchObject({ requested: 5 })
  })

  it('answers every blow when it names no Keyword', () => {
    const variant = withWard('')
    const state = warded(variant)
    for (const keywords of [['raid_hit'], ['tank_hit'], []]) {
      expect(resolve(variant, state, blow(state, keywords)).facts[0].resolutionFact).toMatchObject({ requested: 3 })
    }
  })

  it('matches one Keyword out of several a blow carries', () => {
    // Plural is the point: a blow can be aimed at the Tank *and* made of
    // fire, and a ward against one still answers it.
    const variant = withWard('raid_hit')
    const state = warded(variant)
    expect(resolve(variant, state, blow(state, ['tank_hit', 'raid_hit'])).facts[0].resolutionFact).toMatchObject({ requested: 3 })
  })

  it("keywords the party's own damage, so a Reader can answer what a Hero throws", () => {
    // The gap this closes: only Boss Beats classified their damage, so an
    // event-Keyword Reader worked in one direction only.
    const variant = structuredClone(catalog)
    variant.cards.ember_jab = {
      ...variant.cards.steady_strike,
      id: 'ember_jab',
      title: 'Ember Jab',
      charge_modifiers: [],
      boss_damage: 4,
      damage: 0,
      damage_keywords: ['raid_hit'],
    }
    variant.counters.warded = {
      id: 'warded',
      title: 'Warded',
      rules_text: '',
      keywords: [],
      host: 'combatant',
      max: 1,
      duration_rounds: 0,
      readers: [{ when: 'host_damage_incoming', event_keyword: 'raid_hit', effect: 'target_damage', per: -3 }],
    }
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    hero(state).hand = [card('t1', 'ember_jab'), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
    state.counters[combatantRef(state.bossId)] = [
      {
        id: 'warded',
        title: 'Warded',
        count: 1,
        max: 1,
        remainingRounds: 0,
        readers: variant.counters.warded.readers.map((reader) => ({ ...reader })),
        triggerReason: 'test',
        sourceId: 'test',
        sourceBeatId: '',
        triggerRound: state.round,
        triggerPhase: state.phase,
      },
    ]
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    expect(before - fired.state.board.entities[state.bossId].health).toBe(1)
  })
})

// The tier ladder, in the reduced form that outlived the Forecast Row.
// ADR 0026 claimed the ladder and the row "stand or fall together"; that was
// half right. The disclosure half fell with the row — `severe` no longer means
// "must be forecast first", because nothing is forecast. What these tests keep
// is the authoring discipline underneath it, which the opener rule (D-036)
// depends on: a Beat that can end the run has to be labelled as one, or the
// rule that keeps such Beats out of a phase's first program has nothing to
// check against.
