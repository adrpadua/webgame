import { describe, expect, it } from 'vitest'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import {
  combatantRef,
  createEncounterState,
  fireTargeting,
  hexDistance,
  parseHexKey,
  hexKey,
  legality,
  legalActions,
  resolve,
  runScenario,
    type EncounterState,
    type Scenario,
} from '@/engine'

import { catalog, start, hero, boss, card, stepPhases } from './testkit'

describe('Authored card reach (D-073)', () => {
  // The card side of the rule the Beats already answered (D-043): reach is a
  // property every ability carries, and `boss_damage` no longer resolves from
  // wherever the Hero happens to stand.
  //
  // Steady Strike is the card that made the gap visible. Its rules text is a
  // melee swing and its data said nothing about distance, so a Guardian parked
  // three hexes clear of Embermaw hit exactly as hard as one holding the
  // Guarded Front — the range-camping line D-017 had to answer with authored
  // Boss pressure because the card itself would not.
  const strike = catalog.cards.steady_strike

  // Fire a charged Steady Strike from `coords`, with the Boss left where the
  // Encounter placed it. Phases are stepped first and the Hero is moved
  // afterwards, so the Instant Row's advance cannot close the distance the
  // test is measuring.
  function strikeFrom(coords: { q: number; r: number }) {
    let state = stepPhases(start(), 2).state
    expect(state.phase).toBe('quick')
    state.board.entities[state.primaryHeroId].coords = { ...coords }
    hero(state).hand = [card('s1', 'steady_strike'), card('s2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 's1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 's2' }).state
    return resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
  }

  it('authors a reach on every card that touches anything past its own Hero', () => {
    // Stated as a property of the deck rather than as a list of card ids, so a
    // new attack cannot be added without one. The catalog refuses this at load
    // too; this is the same rule read back off the shipped content.
    for (const authored of Object.values(catalog.cards)) {
      const reaches =
        authored.boss_damage > 0 ||
        authored.damage > 0 ||
        authored.push_tiles > 0 ||
        authored.pull_tiles > 0 ||
        authored.target_type === 'hex' ||
        authored.target_type === 'piece' ||
        authored.target_type === 'ally'
      expect(authored.range_tiles >= 1, `${authored.id} reaches: ${reaches}, range_tiles: ${authored.range_tiles}`).toBe(reaches)
    }
  })

  it('lands Boss damage from inside the authored reach and from nowhere further out', () => {
    // Read against `range_tiles` rather than a literal `1`, the contract D-043
    // wrote for the cone and D-062 for the claw: lengthening Steady Strike's
    // reach in `data/` has to move the hit with it.
    const bossCoords = boss(start()).coords
    let inReachHexes = 0
    let outOfReachHexes = 0
    for (const key of Object.keys(start().board.hexes)) {
      const [q, r] = key.split(',').map(Number)
      const distance = hexDistance({ q, r }, bossCoords)
      if (distance === 0) {
        continue
      }
      const fired = strikeFrom({ q, r })
      const inReach = distance <= strike.range_tiles
      expect(fired.facts[0].succeeded, `hex ${key} at distance ${distance}`).toBe(inReach)
      if (inReach) {
        inReachHexes += 1
        expect(fired.facts.some((fact) => fact.kind === 'damage' && fact.succeeded)).toBe(true)
      } else {
        outOfReachHexes += 1
        expect(fired.facts[0].reason).toBe("The Boss is outside the Top Card's range.")
        // A refused fire spends nothing: the Slot keeps its Charge Stack and
        // may still fire this window from a hex that reaches.
        expect(fired.state.heroes[fired.state.primaryHeroId].actionBar[0].charges).toHaveLength(1)
        expect(boss(fired.state).health).toBe(boss(start()).health)
      }
    }
    // Both halves were actually exercised — an arena where every hex is in
    // reach, or none is, would pass the loop above having proven nothing.
    expect(inReachHexes).toBeGreaterThan(0)
    expect(outOfReachHexes).toBeGreaterThan(0)
  })

  it('offers no fire action from out of reach, so the bar never lights a Slot the rules refuse', () => {
    // `legalActions` and `fireTargeting` ask the same predicate the resolver
    // does (ADR 0013), so the Action Bar cannot advertise the shot that
    // `strikeFrom` above is refused.
    let state = stepPhases(start(), 2).state
    const bossCoords = boss(state).coords
    const furthest = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .sort((left, right) => hexDistance(right, bossCoords) - hexDistance(left, bossCoords))[0]
    expect(hexDistance(furthest, bossCoords)).toBeGreaterThan(strike.range_tiles)
    state.board.entities[state.primaryHeroId].coords = furthest
    hero(state).hand = [card('s1', 'steady_strike'), card('s2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 's1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 's2' }).state

    const fires = legalActions(catalog, state, state.primaryHeroId).filter((action) => action.kind === 'fire_slot' && action.slotIndex === 0)
    expect(fires).toEqual([])
  })
})
describe('area damage cards', () => {
  function withBurstCard(patch: Record<string, unknown> = {}) {
    const variant = structuredClone(catalog)
    variant.cards.burst_test = {
      ...variant.cards.sweeping_blow,
      id: 'burst_test',
      title: 'Burst Test',
      target_type: 'hex',
      range_tiles: 1,
      damage: 1,
      burst_radius: 1,
      ...patch,
    }
    return variant
  }

  function readyBurst(variant: ReturnType<typeof withBurstCard>): EncounterState {
    let state = start()
    for (const [minionId, coords] of [
      ['whelp_a', { q: -2, r: 0 }],
      ['whelp_b', { q: -1, r: 1 }],
      ['whelp_far', { q: 0, r: 2 }],
    ] as const) {
      state = resolve(variant, state, {
        kind: 'spawn_minion',
        sourceId: state.bossId,
        minionId,
        coords,
        minionContentId: 'ember_whelp',
      }).state
    }
    state.phase = 'quick'
    hero(state).actionBar[0] = {
      topCard: card('burst', 'burst_test'),
      charges: [card('charge', 'iron_guard')],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
    return state
  }

  it('centres on empty ground and damages every nearby Enemy but no ally', () => {
    const variant = withBurstCard()
    const state = readyBurst(variant)
    const heroHealthBefore = hero(state).health
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.facts[0].succeeded).toBe(true)
    expect(fired.state.board.entities.whelp_a.health).toBe(1)
    expect(fired.state.board.entities.whelp_b.health).toBe(1)
    expect(fired.state.board.entities.whelp_far.health).toBe(2)
    expect(hero(fired.state).health).toBe(heroHealthBefore)
  })

  it('emits one damage fact per Enemy in stable id order and records its footprint', () => {
    const variant = withBurstCard()
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.targetId)).toEqual(['whelp_a', 'whelp_b'])
    expect(fired.facts[0].detail).toMatchObject({
      burstCenter: { q: -1, r: 0 },
      burstHexes: [
        { q: -1, r: 0 },
        { q: -2, r: 0 },
        { q: -2, r: 1 },
        { q: -1, r: -1 },
        { q: -1, r: 1 },
        { q: 0, r: -1 },
        { q: 0, r: 0 },
      ],
    })
  })

  it('includes the Boss as an Enemy and deals ordinary target damage', () => {
    const variant = withBurstCard({ burst_radius: 2 })
    const state = readyBurst(variant)
    const healthBefore = boss(state).health
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(boss(fired.state).health).toBe(healthBefore - 1)
    expect(fired.facts.find((fact) => fact.kind === 'damage' && fact.detail.targetId === state.bossId)?.detail.amount).toBe(1)
  })

  it('applies target-damage Charge Modifiers to every affected Enemy', () => {
    const variant = withBurstCard({ charge_modifiers: ['burst_damage'] })
    variant.chargeModifiers.burst_damage = {
      ...variant.chargeModifiers.each_charge_boss_damage,
      id: 'burst_damage',
      title: 'Burst Damage',
      effect: 'target_damage',
    }
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.state.board.entities.whelp_a).toBeUndefined()
    expect(fired.state.board.entities.whelp_b).toBeUndefined()
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.amount)).toEqual([2, 2])
  })

  it('damages every captured Minion before a lethal hit ends the Encounter', () => {
    const variant = withBurstCard({ burst_radius: 2, damage: 99 })
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.state.outcome).toBe('victory')
    expect(fired.state.board.entities.whelp_a).toBeUndefined()
    expect(fired.state.board.entities.whelp_b).toBeUndefined()
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.targetId)).toEqual([
      'whelp_a',
      'whelp_b',
      state.bossId,
    ])
  })

  it('finishes every Burst hit before a mixed Card applies lethal direct Boss damage', () => {
    const variant = withBurstCard({ burst_radius: 2, damage: 1, boss_damage: 99 })
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.state.outcome).toBe('victory')
    expect(fired.state.board.entities.whelp_a.health).toBe(1)
    expect(fired.state.board.entities.whelp_b.health).toBe(1)
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.targetId)).toEqual([
      'whelp_a',
      'whelp_b',
      state.bossId,
    ])
  })

  it('leaves the Signature Charge alone when a Burst that includes the Boss fires (D-064)', () => {
    // Under D-015 a Boss-damage card cashed the riposte for a graded bonus.
    // The Signature deletes that route in both directions: deck cards cannot
    // charge it, and firing one cannot spend what it earned.
    const variant = withBurstCard({ burst_radius: 2, damage: 1 })
    let state = readyBurst(variant)
    hero(state).armor = 5
    state = resolve(variant, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { damage_keywords: ['tank_hit'] },
    }).state
    const signatureSlot = () => hero(state).actionBar.find((slot) => slot.fixed)
    expect(signatureSlot()?.earnedCharges).toBe(1)
    const bossHealthBefore = boss(state).health
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(state.board.entities.whelp_a.health).toBe(2)
    expect(fired.state.board.entities.whelp_a.health).toBe(1)
    // The Boss takes only the Burst's own hit; no graded riposte bonus rides it.
    expect(boss(fired.state).health).toBe(bossHealthBefore - 1)
    state = fired.state
    expect(signatureSlot()?.earnedCharges).toBe(1)
  })

  it('keeps radius zero on the existing single-Minion path', () => {
    const variant = withBurstCard({ target_type: 'piece', burst_radius: 0 })
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'whelp_b',
    })
    expect(fired.state.board.entities.whelp_a.health).toBe(2)
    expect(fired.state.board.entities.whelp_b.health).toBe(1)
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.targetId)).toEqual(['whelp_b'])
  })

  it('requires an on-board centre within the Card range', () => {
    const variant = withBurstCard()
    const state = readyBurst(variant)
    expect(legality(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })).toMatchObject({
      legal: false,
      reason: 'The Top Card needs an on-board hex target.',
    })
    expect(
      legality(variant, state, {
        kind: 'fire_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        targetHex: { q: -2, r: 0 },
      }),
    ).toMatchObject({ legal: false, reason: "The chosen hex is outside the Top Card's range.", targetRange: 2 })
    expect(
      legality(variant, state, {
        kind: 'fire_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        targetHex: { q: -1, r: 0 },
      }),
    ).toMatchObject({ legal: true, targetRange: 1 })
  })

  it('offers legal hex centres and previews the hovered burst footprint', () => {
    const variant = withBurstCard()
    const state = readyBurst(variant)
    const targeting = fireTargeting(variant, state, state.primaryHeroId, 0, { q: -1, r: 0 })
    expect(targeting.mode).toBe('hex')
    expect(targeting.legalHexes.map(hexKey)).toContain('-1,0')
    expect(targeting.previewHexes.map(hexKey)).toEqual(['-1,0', '-2,0', '-2,1', '-1,-1', '-1,1', '0,-1', '0,0'])
  })

  it('replays the same burst centre to the same ordered facts and state', () => {
    const variant = withBurstCard({ burst_radius: 1 })
    variant.encounters.embermaw_prototype.player_deck = [{ card: 'burst_test', copies: 4 }]
    const seeded = createEncounterState(variant, 'embermaw_prototype', 70)
    const [top, charge] = hero(seeded).hand
    const scenario: Scenario = {
      id: 'burst-replay',
      title: 'Burst replay',
      version: 1,
      description: '',
      encounter: 'embermaw_prototype',
      seed: 70,
      steps: [
        { action: { kind: 'load_slot', sourceId: seeded.primaryHeroId, slotIndex: 0, cardInstanceId: top.instanceId } },
        { advance: true },
        { advance: true },
        { action: { kind: 'charge_slot', sourceId: seeded.primaryHeroId, slotIndex: 0, cardInstanceId: charge.instanceId } },
        { action: { kind: 'fire_slot', sourceId: seeded.primaryHeroId, slotIndex: 0, targetHex: { q: 0, r: -1 } } },
      ],
    }
    const first = runScenario(variant, scenario)
    const second = runScenario(variant, scenario)
    expect(second.facts).toEqual(first.facts)
    expect(second.state).toEqual(first.state)
    expect(first.facts.filter((fact) => fact.kind === 'damage' && fact.sourceId === seeded.primaryHeroId).map((fact) => fact.detail.targetId)).toEqual([
      seeded.bossId,
    ])
  })
})
describe('card draw effects', () => {
  function withDrawCard(patch: Record<string, unknown> = {}) {
    const variant = structuredClone(catalog)
    variant.cards.draw_test = {
      ...variant.cards.iron_guard,
      id: 'draw_test',
      title: 'Draw Test',
      rules_text: 'Draw 2 cards.',
      speed: 'quick',
      target_type: 'none',
      armor_delta: 0,
      armor_next_round: 0,
      healing: 0,
      boss_damage: 0,
      damage: 0,
      range_tiles: 0,
      draw_count: 2,
      burst_radius: 0,
      push_tiles: 0,
      pull_tiles: 0,
      charge_modifiers: [],
      places_counter: '',
      ...patch,
    }
    return variant
  }

  function readyDraw(variant: ReturnType<typeof withDrawCard>): EncounterState {
    const state = createEncounterState(variant, 'embermaw_prototype', 71)
    state.phase = 'quick'
    hero(state).actionBar[0] = {
      topCard: card('draw-top', 'draw_test'),
      charges: [card('draw-charge', 'iron_guard')],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
    return state
  }

  it('draws the authored count even when that exceeds the Round refill target', () => {
    const variant = withDrawCard()
    const state = readyDraw(variant)
    const handBefore = hero(state).hand.length
    const deckBefore = hero(state).deck.length
    expect(handBefore).toBe(hero(state).refillTarget)

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(hero(fired.state).hand).toHaveLength(handBefore + 2)
    expect(hero(fired.state).deck).toHaveLength(deckBefore - 2)
    expect(hero(fired.state).hand.length).toBeGreaterThan(hero(fired.state).refillTarget)
    expect(fired.facts.filter((fact) => fact.kind === 'draw_card')).toHaveLength(2)
  })

  it('reshuffles the discard when an explicit draw exhausts the deck midway through', () => {
    const variant = withDrawCard()
    const state = readyDraw(variant)
    const [lastInDeck, ...recyclable] = hero(state).deck.slice(0, 3)
    hero(state).deck = [lastInDeck]
    hero(state).discard = recyclable
    const handBefore = hero(state).hand.length

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(hero(fired.state).hand).toHaveLength(handBefore + 2)
    expect(fired.facts.map((fact) => fact.kind)).toEqual(['fire_slot', 'draw_card', 'shuffle_deck', 'draw_card'])
    expect(fired.state.rng.choices.at(-1)?.label).toBe('discard_shuffle')
  })

  it('records successful no-op draws when both piles are exhausted', () => {
    const variant = withDrawCard()
    const state = readyDraw(variant)
    hero(state).deck = []
    hero(state).discard = []
    const handBefore = [...hero(state).hand]

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    const draws = fired.facts.filter((fact) => fact.kind === 'draw_card')

    expect(fired.facts[0].succeeded).toBe(true)
    expect(hero(fired.state).hand).toEqual(handBefore)
    expect(draws).toHaveLength(2)
    expect(draws.every((fact) => fact.succeeded && fact.detail.drawn === false)).toBe(true)
  })

  it('emits draws after the Card damage and on-fire Counter consequences', () => {
    const variant = withDrawCard({ boss_damage: 1, range_tiles: 1, draw_count: 1 })
    const state = readyDraw(variant)
    state.counters[combatantRef(state.primaryHeroId)] = [
      {
        id: 'draw_order_counter',
        title: 'Draw Order Counter',
        count: 1,
        max: 1,
        remainingRounds: 1,
        readers: [{ when: 'slot_fired', event_keyword: '', effect: 'boss_damage', per: 1 }],
        triggerReason: 'draw_order_test',
        sourceId: 'test',
        sourceBeatId: '',
        triggerRound: state.round,
        triggerPhase: state.phase,
      },
    ]

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(fired.facts.slice(1).map((fact) => [fact.kind, fact.detail.reasonText ?? ''])).toEqual([
      ['damage', 'Draw Test'],
      ['damage', 'counter_reader'],
      ['draw_card', ''],
    ])
  })

  it('finishes the authored draws after lethal Boss damage resolves first', () => {
    const variant = withDrawCard({ boss_damage: 1, range_tiles: 1, draw_count: 1 })
    const state = readyDraw(variant)
    state.board.entities[state.bossId].health = 1
    const handBefore = hero(state).hand.length

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(fired.facts.map((fact) => fact.kind)).toEqual(['fire_slot', 'damage', 'draw_card'])
    expect(fired.facts.every((fact) => fact.succeeded)).toBe(true)
    expect(fired.facts.at(-1)?.detail.drawn).toBe(true)
    expect(hero(fired.state).hand).toHaveLength(handBefore + 1)
    expect(fired.state).toMatchObject({ active: false, outcome: 'victory' })
  })
})
