import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import {
  advancePhase,
  createEncounterState,
  hexKey,
  legality,
  resolve,
  type EncounterState,
  type ResolvedActionFact,
} from '@/engine'

const catalog = loadCatalog()

function start(seed?: number): EncounterState {
  return createEncounterState(catalog, 'embermaw_prototype', seed)
}

function hero(state: EncounterState) {
  return state.heroes[state.primaryHeroId]
}

function boss(state: EncounterState) {
  return state.board.entities[state.bossId]
}

// Tests may fabricate hand and Slot contents: the engine reads card identity
// from the content catalog, and instances are plain data.
function card(instanceId: string, cardId: string) {
  return { instanceId, cardId }
}

function stepPhases(state: EncounterState, count: number): { state: EncounterState; facts: ResolvedActionFact[] } {
  let current = state
  const facts: ResolvedActionFact[] = []
  for (let index = 0; index < count; index += 1) {
    const result = advancePhase(catalog, current)
    current = result.state
    facts.push(...result.facts)
  }
  return { state: current, facts }
}

describe('content catalog', () => {
  it('loads and validates the M1 payloads from data/', () => {
    expect(Object.keys(catalog.cards).sort()).toEqual(['fortify', 'iron_guard', 'shield_slam', 'steady_strike', 'sweeping_blow'])
    expect(Object.keys(catalog.keywords)).toHaveLength(10)
    expect(catalog.programs.embermaw_hunt.instant_beats.map((beat) => beat.kind)).toEqual([
      'turn_toward_player',
      'raking_claw',
      'scorch_last_pattern',
    ])
    expect(catalog.encounters.embermaw_prototype.player_deck.reduce((total, entry) => total + entry.copies, 0)).toBe(20)
  })
})

describe('encounter setup', () => {
  it('creates the seeded initial state', () => {
    const state = start()
    expect(state.phase).toBe('loadout')
    expect(state.round).toBe(1)
    expect(state.active).toBe(true)
    expect(hero(state).hand).toHaveLength(4)
    expect(hero(state).deck).toHaveLength(16)
    expect(hero(state).actionBar).toHaveLength(2)
    expect(boss(state).health).toBe(36)
    expect(boss(state).facing).toBe(4)
    expect(hero(state).health).toBe(34)
    expect(state.rng.choices.length).toBeGreaterThanOrEqual(19)
    expect(state.rng.choices[0].label).toBe('initial_deck_shuffle')
  })

  it('telegraphs the Incoming Row at start', () => {
    const state = start()
    expect(state.telegraphs[hexKey({ q: 0, r: 1 })]).toBe('breath')
    expect(state.telegraphs[hexKey({ q: -1, r: 1 })]).toBe('breath')
    expect(state.telegraphs[hexKey({ q: -2, r: 1 })]).toBe('brood')
    expect(state.telegraphedSpawnHexes).toEqual([
      { q: -2, r: 1 },
      { q: -1, r: 2 },
    ])
  })

  it('is deterministic for a fixed seed', () => {
    const first = start(42)
    const second = start(42)
    expect(second).toEqual(first)
    const firstAdvanced = stepPhases(first, 5)
    const secondAdvanced = stepPhases(second, 5)
    expect(secondAdvanced.state).toEqual(firstAdvanced.state)
    expect(secondAdvanced.facts).toEqual(firstAdvanced.facts)
  })
})

describe('phase cycle', () => {
  it('runs one full Round: Loadout, Boss Instant, Quick, Boss Incoming, Slow', () => {
    let state = start()
    state = advancePhase(catalog, state).state
    expect(state.phase).toBe('instant')

    const instant = advancePhase(catalog, state)
    state = instant.state
    expect(state.phase).toBe('quick')
    const beatFacts = instant.facts.filter((fact) => fact.kind === 'resolve_boss')
    expect(beatFacts.map((fact) => fact.detail.beatId)).toEqual(['turn_to_tank', 'raking_claw', 'claw_scorch'])
    expect(hero(state).health).toBe(30)
    const clawFact = instant.facts.find((fact) => fact.kind === 'damage')
    expect(clawFact?.resolutionFact).toMatchObject({
      requested: 4,
      prevented: 0,
      health_loss: 4,
      damage_classification: 'tank_hit',
      guarded_front: true,
    })
    expect(state.board.hazards[hexKey({ q: 0, r: 0 })]?.[0]?.id).toBe('scorched')

    state = advancePhase(catalog, state).state
    expect(state.phase).toBe('incoming')

    const incoming = advancePhase(catalog, state)
    state = incoming.state
    expect(state.phase).toBe('slow')
    expect(hero(state).health).toBe(25)
    const spawns = incoming.facts.filter((fact) => fact.kind === 'spawn_minion')
    expect(spawns).toHaveLength(2)
    expect(state.board.entities.whelp_1).toMatchObject({ kind: 'minion', health: 2, coords: { q: -2, r: 1 } })
    expect(state.board.entities.whelp_2).toMatchObject({ kind: 'minion', coords: { q: -1, r: 2 } })

    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.phase).toBe('loadout')
    expect(state.round).toBe(2)
    expect(hero(state).hand).toHaveLength(4)
    expect(Object.keys(state.board.hazards)).toHaveLength(0)
    expect(wrap.facts.some((fact) => fact.kind === 'round_start')).toBe(true)
  })
})

describe('Slot rules', () => {
  it('loads, charges, and fires a Slot with Charge Modifiers', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike'), card('h2', 'iron_guard'), card('h3', 'iron_guard'), card('h4', 'fortify')]

    const load = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h1' })
    state = load.state
    expect(load.facts[0].succeeded).toBe(true)
    expect(hero(state).actionBar[0].topCard?.cardId).toBe('steady_strike')

    const chargeTooEarly = legality(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h2',
    })
    expect(chargeTooEarly).toMatchObject({ legal: false, reason: 'Charging requires a legal Slot during Quick or Slow.' })

    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')

    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h2' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h3' }).state
    expect(hero(state).actionBar[0].charges).toHaveLength(2)

    const bossHealthBefore = boss(state).health
    const fire = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = fire.state
    // Steady Strike: 2 boss damage plus 1 per charged card.
    expect(boss(state).health).toBe(bossHealthBefore - 4)
    expect(hero(state).actionBar[0].activatedWindow).toBe('quick')
    expect(hero(state).actionBar[0].charges).toHaveLength(2)

    const fireAgain = legality(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    expect(fireAgain).toMatchObject({ legal: false, reason: 'A Slot may fire only once in its matching window.' })
    const chargeAfterFire = legality(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h4',
    })
    expect(chargeAfterFire).toMatchObject({ legal: false, reason: 'That Slot cannot accept another charge.' })
  })

  it('only allows Slot Replacement during Loadout', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike'), card('h2', 'iron_guard')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h1' }).state
    state = stepPhases(state, 2).state
    const replaceInQuick = legality(catalog, state, {
      kind: 'load_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h2',
    })
    expect(replaceInQuick).toMatchObject({ legal: false, reason: 'Replacing a Slot is only allowed during Loadout.' })
    // An empty Slot still accepts a Top Card for free during a player window.
    const loadEmpty = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 1, cardInstanceId: 'h2' })
    expect(loadEmpty.facts[0].succeeded).toBe(true)
  })

  it('applies Full-Charge Cleanup only to a full Slot that activated', () => {
    let state = start()
    hero(state).hand = [
      card('h1', 'steady_strike'),
      card('h2', 'iron_guard'),
      card('h3', 'iron_guard'),
      card('h4', 'iron_guard'),
      card('h5', 'steady_strike'),
    ]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h1' }).state
    state = stepPhases(state, 2).state
    for (const instanceId of ['h2', 'h3', 'h4']) {
      state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: instanceId }).state
    }
    // Primed: full stack, not yet activated. Ending the window keeps it.
    const primedEnd = advancePhase(catalog, state)
    expect(primedEnd.facts.some((fact) => fact.kind === 'full_charge_cleanup')).toBe(false)
    expect(primedEnd.state.heroes[state.primaryHeroId].actionBar[0].topCard?.cardId).toBe('steady_strike')

    // Firing the full Slot, then ending the window, discards the bundle.
    state = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 }).state
    const discardBefore = hero(state).discard.length
    const cleanupEnd = advancePhase(catalog, state)
    const cleanupFact = cleanupEnd.facts.find((fact) => fact.kind === 'full_charge_cleanup')
    expect(cleanupFact?.succeeded).toBe(true)
    state = cleanupEnd.state
    expect(hero(state).actionBar[0].topCard).toBeNull()
    expect(hero(state).discard.length).toBe(discardBefore + 4)
  })
})

describe('Stamina movement', () => {
  it('discards one hand card to move one hex during the Quick Window', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike'), card('h2', 'iron_guard')]

    const tooEarly = legality(catalog, state, {
      kind: 'move_hero',
      sourceId: state.primaryHeroId,
      destination: { q: -1, r: 0 },
      cardInstanceId: 'h1',
    })
    expect(tooEarly).toMatchObject({ legal: false, reason: 'Hero movement requires the Quick Window and a hand card for Stamina.' })

    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')

    const ontoBoss = legality(catalog, state, {
      kind: 'move_hero',
      sourceId: state.primaryHeroId,
      destination: { q: 1, r: -1 },
      cardInstanceId: 'h1',
    })
    expect(ontoBoss).toMatchObject({ legal: false, reason: 'That hex is not a legal move destination.' })

    // (0, 0) is Scorched after Ash Trail; the hazard blocks voluntary moves,
    // so pick a clean destination.
    const move = resolve(catalog, state, {
      kind: 'move_hero',
      sourceId: state.primaryHeroId,
      destination: { q: -1, r: 0 },
      cardInstanceId: 'h1',
    })
    state = move.state
    expect(move.facts[0].succeeded).toBe(true)
    expect(state.board.entities[state.primaryHeroId].coords).toEqual({ q: -1, r: 0 })
    expect(state.board.entities[state.primaryHeroId].facing).toBe(3)
    expect(hero(state).hand.map((entry) => entry.instanceId)).toEqual(['h2'])
    expect(hero(state).discard.map((entry) => entry.instanceId)).toContain('h1')
  })

  it('blocks voluntary movement onto a Scorched hex', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike')]
    state = stepPhases(state, 2).state
    // Ash Trail scorched the hero's own hex (0, 0); move away, then try to
    // move back onto it next window.
    state = resolve(catalog, state, {
      kind: 'move_hero',
      sourceId: state.primaryHeroId,
      destination: { q: -1, r: 0 },
      cardInstanceId: 'h1',
    }).state
    const backOntoScorched = legality(catalog, state, {
      kind: 'move_hero',
      sourceId: state.primaryHeroId,
      destination: { q: 0, r: 0 },
      cardInstanceId: hero(state).hand[0]?.instanceId ?? 'missing',
    })
    expect(backOntoScorched.legal).toBe(false)
  })
})

describe('damage and Resolution Facts', () => {
  it('Armor blocks before Health and the fact records prevention', () => {
    let state = start()
    hero(state).armor = 3
    const result = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_classification: 'tank_hit' },
    })
    expect(result.facts[0].resolutionFact).toMatchObject({
      requested: 4,
      prevented: 3,
      health_loss: 1,
      target_available: true,
      status_evaluation: { status_id: 'riposte_ready', result: 'not_granted', reason: 'health_lost' },
    })
    expect(result.state.heroes[state.primaryHeroId].health).toBe(33)
    expect(result.state.heroes[state.primaryHeroId].armor).toBe(0)
  })

  it('grants Riposte Ready on a fully blocked Tank Hit at the Guarded Front', () => {
    let state = start()
    hero(state).armor = 5
    const hit = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_classification: 'tank_hit' },
    })
    state = hit.state
    expect(hit.facts[0].resolutionFact).toMatchObject({
      health_loss: 0,
      guarded_front: true,
      status_evaluation: { result: 'granted', reason: 'qualifying_tank_hit' },
    })
    expect(state.statusEffects[state.primaryHeroId]?.[0]?.id).toBe('riposte_ready')

    // A legal Shield Slam consumes Riposte Ready for 2 bonus Boss damage.
    state.phase = 'quick'
    hero(state).actionBar[0] = { topCard: card('s1', 'shield_slam'), charges: [card('s2', 'iron_guard')], activatedWindow: '' }
    const bossHealthBefore = boss(state).health
    const slam = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = slam.state
    expect(boss(state).health).toBe(bossHealthBefore - 5)
    expect(state.statusEffects[state.primaryHeroId] ?? []).toHaveLength(0)
    const damageFact = slam.facts.find((fact) => fact.kind === 'damage')
    expect(damageFact?.resolutionFact).toMatchObject({ base_amount: 3, status_bonus: 2, payoff_card_id: 'shield_slam' })
  })

  it('expires an unconsumed Riposte Ready at the end of the Quick Window', () => {
    let state = start()
    hero(state).armor = 5
    state = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { damage_classification: 'tank_hit' },
    }).state
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    const endQuick = advancePhase(catalog, state)
    const expiry = endQuick.facts.find((fact) => fact.kind === 'expire_status')
    expect(expiry?.succeeded).toBe(true)
    expect(endQuick.state.statusEffects[state.primaryHeroId] ?? []).toHaveLength(0)
  })

  it('removes a Minion the moment damage defeats it', () => {
    let state = start()
    state = stepPhases(state, 4).state
    expect(state.board.entities.whelp_1).toBeDefined()
    const kill = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: 'whelp_1',
      amount: 2,
      reasonText: 'Sweeping Blow',
    })
    expect(kill.facts[0].resolutionFact).toMatchObject({ health_loss: 2, target_removed: true })
    expect(kill.state.board.entities.whelp_1).toBeUndefined()
    // A later action against the removed Minion fails as unavailable.
    const late = resolve(catalog, kill.state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: 'whelp_1',
      amount: 2,
      reasonText: 'Sweeping Blow',
    })
    expect(late.facts[0]).toMatchObject({ succeeded: false, reason: 'The damage target is unavailable.' })
  })
})

describe('legality edges', () => {
  it('requires a Minion target in range for a piece-targeting Top Card', () => {
    let state = start()
    hero(state).actionBar[0] = { topCard: card('s1', 'sweeping_blow'), charges: [card('s2', 'iron_guard')], activatedWindow: '' }
    state.phase = 'quick'
    const noTarget = legality(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    expect(noTarget).toMatchObject({ legal: false, reason: 'The Top Card needs a Minion target.' })

    // Spawn the whelps (they arrive at range > 1 from the hero start).
    let played = start()
    played.heroes[played.primaryHeroId].actionBar[0] = {
      topCard: card('s1', 'sweeping_blow'),
      charges: [card('s2', 'iron_guard')],
      activatedWindow: '',
    }
    played = stepPhases(played, 4).state
    played.phase = 'quick'
    const outOfRange = legality(catalog, played, {
      kind: 'fire_slot',
      sourceId: played.primaryHeroId,
      slotIndex: 0,
      targetId: 'whelp_2',
    })
    expect(outOfRange).toMatchObject({ legal: false, reason: "The chosen Minion is outside the Top Card's range." })
    expect(outOfRange.targetRange).toBeGreaterThan(1)
  })

  it('rejects every action after the Encounter ends', () => {
    let state = start()
    boss(state).health = 1
    const win = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: state.bossId,
      amount: 1,
      reasonText: 'Steady Strike',
    })
    state = win.state
    expect(state).toMatchObject({ active: false, outcome: 'victory', outcomeReason: 'The Boss is defeated.' })
    const afterEnd = legality(catalog, state, { kind: 'draw_card', sourceId: state.primaryHeroId })
    expect(afterEnd).toMatchObject({ legal: false, reason: 'The Encounter has already ended.' })
    expect(advancePhase(catalog, state).facts).toHaveLength(0)
  })

  it('ends in Enrage Defeat when the Encounter Clock expires', () => {
    let state = start()
    state.round = state.roundLimit
    state.phase = 'slow'
    const wrap = advancePhase(catalog, state)
    expect(wrap.facts.at(-1)?.kind).toBe('end_of_clock')
    expect(wrap.state).toMatchObject({
      active: false,
      outcome: 'defeat',
      outcomeReason: 'Enrage: Embermaw overwhelms the party.',
    })
  })

  it('ends in defeat when the Hero falls', () => {
    let state = start()
    hero(state).health = 3
    const hit = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 5,
      reasonText: 'Raking Claw',
    })
    expect(hit.state).toMatchObject({ active: false, outcome: 'defeat', outcomeReason: 'A Hero has fallen.' })
  })
})

describe('hand refresh', () => {
  it('shuffles the discard back in only when the deck runs out', () => {
    let state = start()
    const heroState = hero(state)
    // Empty the deck into the discard so the end-of-Round refill must reshuffle.
    heroState.discard = [...heroState.deck, ...heroState.hand]
    heroState.deck = []
    heroState.hand = []
    state.phase = 'slow'
    const wrap = advancePhase(catalog, state)
    const kinds = wrap.facts.map((fact) => fact.kind)
    expect(kinds).toContain('shuffle_deck')
    expect(kinds.filter((kind) => kind === 'draw_card')).toHaveLength(4)
    expect(wrap.state.heroes[state.primaryHeroId].hand).toHaveLength(4)
    const shuffleChoices = wrap.state.rng.choices.filter((choice) => choice.label === 'discard_shuffle')
    expect(shuffleChoices.length).toBeGreaterThan(0)
  })
})
