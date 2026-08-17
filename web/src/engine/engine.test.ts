import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import {
  advancePhase,
  buildEncounterRecord,
  contentIdentity,
  createEncounterState,
  hexDistance,
  hexKey,
  legality,
  minionIntents,
  replayRecord,
  ESCALATION_MAX,
  escalationStartRound,
  forecast,
  highestTier,
  resolve,
  runScenario,
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

// A Hero who cannot die of attrition, for tests about clocks and rotation
// rather than about survival.
function immortalHero(state: EncounterState): EncounterState {
  state.heroes[state.primaryHeroId].maxHealth = 5000
  state.heroes[state.primaryHeroId].health = 5000
  return state
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
  it('loads and validates the full content port from data/', () => {
    expect(Object.keys(catalog.cards)).toHaveLength(12)
    expect(Object.keys(catalog.keywords)).toHaveLength(9)
    expect(Object.keys(catalog.programs).sort()).toEqual(['embermaw_brood', 'embermaw_embers', 'embermaw_hunt'])
    expect(catalog.programs.embermaw_hunt.instant_beats.map((beat) => beat.kind)).toEqual([
      'turn_toward_player',
      'raking_claw',
      'scorch_last_pattern',
    ])
    expect(catalog.programs.embermaw_embers.instant_beats.map((beat) => beat.kind)).toEqual([
      'turn_toward_player',
      'cinder_breath',
      'scorch_last_pattern',
    ])
    expect(catalog.encounters.embermaw_prototype.boss_programs).toEqual(['embermaw_hunt', 'embermaw_embers', 'embermaw_brood'])
    expect(catalog.encounters.embermaw_prototype.player_deck.reduce((total, entry) => total + entry.copies, 0)).toBe(20)
    expect(catalog.decks.aegis_controlled_test_deck.encounter).toBe('embermaw_prototype')
  })
})

describe('Boss Program rotation', () => {
  it('loops Hunt, Ember, then Brood across Rounds', () => {
    let state = start()
    // Rotation is what is under test: give the idle hero enough Health to
    // survive the accumulating boss pressure and Whelp bites (D-006).
    hero(state).maxHealth = 500
    hero(state).health = 500
    expect(state.currentProgramId).toBe('embermaw_hunt')
    state = stepPhases(state, 5).state
    expect(state.round).toBe(2)
    expect(state.currentProgramId).toBe('embermaw_embers')
    state = stepPhases(state, 5).state
    expect(state.currentProgramId).toBe('embermaw_brood')
    state = stepPhases(state, 5).state
    expect(state.currentProgramId).toBe('embermaw_hunt')
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
    expect(boss(state).health).toBe(48)
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
    // A Boss Row resolves in the batch that OPENS its window (ADR 0024):
    // leaving Loadout lands in Boss Instant with the Instant Row resolved,
    // every boss fact stamped with the Boss's own phase.
    const instant = advancePhase(catalog, state)
    state = instant.state
    expect(state.phase).toBe('instant')
    const beatFacts = instant.facts.filter((fact) => fact.kind === 'resolve_boss')
    expect(beatFacts.map((fact) => fact.detail.beatId)).toEqual(['turn_to_tank', 'raking_claw', 'claw_scorch'])
    expect(beatFacts.every((fact) => fact.phase === 'instant')).toBe(true)
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
    expect(state.phase).toBe('quick')

    // Ending the Quick Window opens Boss Incoming with its Row resolved.
    const incoming = advancePhase(catalog, state)
    state = incoming.state
    expect(state.phase).toBe('incoming')
    expect(hero(state).health).toBe(25)
    const spawns = incoming.facts.filter((fact) => fact.kind === 'spawn_minion')
    expect(spawns).toHaveLength(2)
    expect(incoming.facts.filter((fact) => fact.kind === 'resolve_boss').every((fact) => fact.phase === 'incoming')).toBe(true)
    expect(state.board.entities.whelp_1).toMatchObject({ kind: 'minion', health: 2, coords: { q: -2, r: 1 } })
    expect(state.board.entities.whelp_2).toMatchObject({ kind: 'minion', coords: { q: -1, r: 2 } })

    state = advancePhase(catalog, state).state
    expect(state.phase).toBe('slow')

    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.phase).toBe('loadout')
    expect(state.round).toBe(2)
    expect(hero(state).hand).toHaveLength(4)
    expect(Object.keys(state.board.hazards)).toHaveLength(0)
    expect(wrap.facts.some((fact) => fact.kind === 'round_start')).toBe(true)
  })
})

describe('Minion end-step intent (D-006)', () => {
  it('a distant Whelp advances toward its Hero; an arrived Whelp bites', () => {
    // Round 1's Incoming Brood Call spawns two Whelps at distance 2; reach Slow.
    let state = stepPhases(start(), 4).state
    expect(state.phase).toBe('slow')
    const heroCoords = state.board.entities[state.primaryHeroId].coords
    const spawned = Object.values(state.board.entities)
      .filter((entity) => entity.kind === 'minion')
      .map((entity) => ({ id: entity.id, distance: hexDistance(entity.coords, heroCoords) }))
    expect(spawned).toHaveLength(2)
    expect(spawned.every(({ distance }) => distance === 2)).toBe(true)

    // The projection derives from the live state: both intend to advance.
    const advanceIntents = minionIntents(catalog, state)
    expect(advanceIntents).toHaveLength(2)
    expect(advanceIntents.every((intent) => intent.damage === 0 && intent.destination !== null)).toBe(true)

    // Round 1 wrap: no bites yet — the creep is the deadline.
    const healthBefore = hero(state).health
    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.round).toBe(2)
    expect(wrap.facts.filter((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)).toHaveLength(0)
    expect(hero(state).health).toBe(healthBefore)
    for (const { id } of spawned) {
      expect(hexDistance(state.board.entities[id].coords, heroCoords)).toBe(1)
    }

    // Round 2: the arrived Whelps bite; the Round's fresh Brood spawns only advance.
    state = stepPhases(state, 4).state
    expect(state.phase).toBe('slow')
    const round2Health = hero(state).health
    const wrap2 = advancePhase(catalog, state)
    const bites = wrap2.facts.filter((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)
    expect(bites).toHaveLength(2)
    expect(bites.every((fact) => fact.resolutionFact?.damage_classification === 'raid_hit')).toBe(true)
    expect(hero(wrap2.state).health).toBe(round2Health - 2)
    // A Raid Hit from a Minion never grants Riposte Ready.
    expect((wrap2.state.statusEffects[state.primaryHeroId] ?? []).some((effect) => effect.id === 'riposte_ready')).toBe(false)
  })

  it('a cleared Whelp takes no end-step action', () => {
    let state = stepPhases(start(), 4).state
    const whelps = Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')
    state = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: whelps[0].id,
      amount: 2,
      reasonText: 'test clear',
    }).state
    const wrap = advancePhase(catalog, state)
    const moves = wrap.facts.filter((fact) => fact.kind === 'move_minion')
    expect(moves).toHaveLength(1)
    expect(moves[0].sourceId).toBe(whelps[1].id)
  })
})

describe('Fortify Slow commitment (D-019)', () => {
  it('lands its Armor at the next Round start, after the wipe, in time for the Instant Row', () => {
    // Reach Round 1's Slow Window and fire a charged Fortify.
    let state = stepPhases(start(), 4).state
    expect(state.phase).toBe('slow')
    hero(state).hand = [card('f1', 'fortify'), card('f2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f2' }).state
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = fired.state
    expect(fired.facts[0].succeeded).toBe(true)
    // No Armor yet: the commitment is banked as the Fortified status.
    expect(hero(state).armor).toBe(0)
    expect(fired.facts[0].resolutionFact).toMatchObject({ status_event: { status_id: 'fortified', event: 'granted', reason: 'slow_commitment' } })

    // Round start wipes Armor first, then the commitment lands.
    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.round).toBe(2)
    expect(hero(state).armor).toBe(6)
    expect(state.statusEffects[state.primaryHeroId] ?? []).toHaveLength(0)

    // The banked Armor answers Round 2's INSTANT row (Ember Pattern opens
    // with Cinder Breath): 5 requested, fully blocked, zero Health loss —
    // pressure nothing fired inside Round 2 could have pre-blocked.
    const healthBefore = hero(state).health
    const instant = advancePhase(catalog, state)
    state = instant.state
    expect(state.phase).toBe('instant')
    expect(hero(state).health).toBe(healthBefore)
    expect(hero(state).armor).toBe(1)

    // The leftover Armor is ordinary Armor: the next Round start wipes it.
    state = stepPhases(state, 4).state
    expect(state.round).toBe(3)
    expect(hero(state).armor).toBe(0)
  })
})

describe('Authored Status Effects (D-032 to D-034)', () => {
  // No live card applies a status yet — the first one changes the damage
  // economy and owes the deck-evaluation gate — so the vocabulary is proven
  // against a catalog variant, the pattern the acceleration test established.
  function withStatusCard(cardId: string, patch: Record<string, unknown>) {
    const variant = structuredClone(catalog)
    variant.cards[cardId] = { ...variant.cards.steady_strike, id: cardId, title: 'Test Card', boss_damage: 0, damage: 0, ...patch }
    return variant
  }

  function firedAt(variant: ReturnType<typeof withStatusCard>, cardId: string, targetId?: string) {
    let state = start()
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', cardId), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
    return resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId })
  }

  it('authors every status in the catalog, and validates card references', () => {
    expect(Object.keys(catalog.statuses).sort()).toEqual(['fortified', 'sundered', 'weakened'])
    expect(catalog.statuses.sundered).toMatchObject({ applies_to: 'enemy', damage_taken_bonus: 1, stacking: false })
    expect(catalog.statuses.weakened).toMatchObject({ applies_to: 'enemy', damage_dealt_penalty: 1 })
    // Fortified's definition is authored; its Armor amount still rides the card.
    expect(catalog.statuses.fortified).toMatchObject({ applies_to: 'hero', stacking: true, triggers: ['on_round_start'] })
  })

  it('lands an enemy status on the Boss with no range requirement', () => {
    // The Boss is selectable for a status but never range-gated, which keeps
    // the positionless `boss_damage` ruling intact.
    const variant = withStatusCard('sunder_test', { applies_status: 'sundered', target_type: 'piece', range_tiles: 0 })
    const state = start()
    const fired = firedAt(variant, 'sunder_test', state.bossId)
    expect(fired.facts[0].succeeded).toBe(true)
    expect(fired.state.statusEffects[state.bossId]?.[0]).toMatchObject({ id: 'sundered', damageTakenBonus: 1 })
  })

  it('raises damage the Sundered Boss takes', () => {
    const variant = withStatusCard('sunder_test', { applies_status: 'sundered', target_type: 'piece', range_tiles: 0 })
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
    const variant = withStatusCard('weaken_test', { applies_status: 'weakened', target_type: 'piece', range_tiles: 0 })
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

  it('refuses a second copy of a non-stacking status', () => {
    const variant = withStatusCard('sunder_test', { applies_status: 'sundered', target_type: 'piece', range_tiles: 0 })
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
    expect(first.facts[0].detail.appliedStatusGranted).toBe(true)
    const second = resolve(variant, first.state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 1, targetId: state.bossId })
    expect(second.facts[0].succeeded).toBe(true)
    expect(second.facts[0].detail.appliedStatusGranted).toBe(false)
    expect(second.state.statusEffects[state.bossId] ?? []).toHaveLength(1)
  })

  it('refuses an enemy-facing status with no Enemy target', () => {
    const variant = withStatusCard('sunder_test', { applies_status: 'sundered', target_type: 'piece', range_tiles: 0 })
    const fired = firedAt(variant, 'sunder_test', undefined)
    expect(fired.facts[0].succeeded).toBe(false)
    expect(fired.facts[0].reason).toContain('Enemy target')
  })

  it('still lands Fortified from its authored definition (D-019 unchanged)', () => {
    let state = stepPhases(start(), 4).state
    expect(state.phase).toBe('slow')
    hero(state).hand = [card('f1', 'fortify'), card('f2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f2' }).state
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    const fortified = fired.state.statusEffects[state.primaryHeroId]?.find((effect) => effect.id === 'fortified')
    expect(fortified).toMatchObject({ title: catalog.statuses.fortified.title, stacking: true, armorOnRoundStart: 6 })
  })
})

describe('Forecast Row (D-021, ADR 0026)', () => {
  it('previews the next Round\'s whole program at family level', () => {
    const state = start()
    expect(state.currentProgramId).toBe('embermaw_hunt')
    const ahead = forecast(catalog, state)!
    // Family level only: a title, the union of counter tags, and a tier. No
    // target, magnitude, or hex — those belong to Incoming and Instant.
    expect(ahead).toMatchObject({
      programId: 'embermaw_embers',
      title: catalog.programs.embermaw_embers.title,
      tier: 'structural',
    })
    expect(ahead.counterTags).toEqual(['Position', 'Move', 'Interrupt', 'Kill Adds', 'Mitigate'])
    expect(Object.keys(ahead)).not.toContain('damage')
  })

  it('follows the rotation a Round ahead, and loops with it', () => {
    let state = immortalHero(start())
    expect(forecast(catalog, state)?.programId).toBe('embermaw_embers')
    state = stepPhases(state, 5).state
    expect(state.currentProgramId).toBe('embermaw_embers')
    expect(forecast(catalog, state)?.programId).toBe('embermaw_brood')
    state = stepPhases(state, 5).state
    expect(state.currentProgramId).toBe('embermaw_brood')
    // Looping: the Forecast wraps to the first program rather than emptying.
    expect(forecast(catalog, state)?.programId).toBe('embermaw_hunt')
  })

  it('is a pure read: asking for it never changes the Encounter', () => {
    const state = start()
    const before = structuredClone(state)
    forecast(catalog, state)
    expect(state).toEqual(before)
  })

  it('stops forecasting once the Encounter is resolved', () => {
    const state = start()
    state.active = false
    expect(forecast(catalog, state)).toBeNull()
  })

  it('empties rather than wrapping when a program list does not loop', () => {
    const state = start()
    state.loopPrograms = false
    state.programIndex = state.programIds.length - 1
    expect(forecast(catalog, state)).toBeNull()
  })
})

describe('Consequence Tier ladder (D-021, ADR 0026)', () => {
  const everyBeat = Object.values(catalog.programs).flatMap((program) => [
    ...program.instant_beats.map((beat) => ({ beat, program })),
    ...program.incoming_beats.map((beat) => ({ beat, program })),
  ])

  it('rates a Beat that can cross an Escalation Threshold as severe', () => {
    // An Escalation Threshold crossing is one of D-025's run-ending outcomes,
    // so such a Beat is severe by definition and must reach the Forecast Row.
    for (const { beat } of everyBeat) {
      if (beat.escalation_if_unanswered > 0) {
        expect(beat.consequence_tier).toBe('severe')
      }
    }
  })

  it('rates a Beat that spawns or changes the board at least structural', () => {
    for (const { beat } of everyBeat) {
      if (beat.minion !== undefined || beat.hazard !== undefined) {
        expect(highestTier({ ...catalog.programs.embermaw_hunt, instant_beats: [beat], incoming_beats: [] })).not.toBe('chip')
      }
    }
  })

  it('keeps the first program free of severe Beats, because Round 1 is never forecast', () => {
    // The one honest hole in the ladder: at the pull there is no earlier Round
    // to have forecast Round 1, so its program may not carry a severe Beat.
    const firstProgramId = catalog.encounters.embermaw_prototype.boss_programs[0]
    expect(highestTier(catalog.programs[firstProgramId])).not.toBe('severe')
  })
})

describe('Escalation as the single clock (D-023, ADR 0027)', () => {
  // A passive Hero who never clears an add: give them enough Health that
  // Escalation, not attrition, is what ends the fight.
  function immortal(seed?: number): EncounterState {
    return immortalHero(start(seed))
  }

  function clearMinions(state: EncounterState): void {
    for (const entity of Object.values(state.board.entities)) {
      if (entity.kind === 'minion') {
        delete state.board.entities[entity.id]
      }
    }
  }

  it('derives the start Round so automatic ticks alone reach the top at the Encounter Clock', () => {
    expect(escalationStartRound(8)).toBe(4)
    expect(start().escalationStartRound).toBe(4)
    // Five ticks from the start Round through the clock: 4, 5, 6, 7, 8.
    expect(8 - escalationStartRound(8) + 1).toBe(ESCALATION_MAX)
  })

  it('does not tick before the start Round, then ticks once per Round end', () => {
    let state = immortal()
    for (let round = 1; round < 4; round += 1) {
      const wrap = stepPhases(state, 5)
      // Clear each Round's Whelps so only the automatic tick can move the value.
      state = wrap.state
      clearMinions(state)
      expect(state.escalation).toBe(0)
    }
    expect(state.round).toBe(4)
    state = stepPhases(state, 5).state
    clearMinions(state)
    expect(state.escalation).toBe(1)
    state = stepPhases(state, 5).state
    clearMinions(state)
    expect(state.escalation).toBe(2)
  })

  it('ends the fight at the end of Round 8 on automatic ticks alone', () => {
    // Boundary identity with the retired round-limit check: a party that
    // answers every demand reaches the wipe exactly where the old clock ended.
    let state = immortal()
    let guard = 0
    while (state.active && guard < 60) {
      guard += 1
      const wrap = advancePhase(catalog, state)
      state = wrap.state
      if (state.phase === 'slow') {
        clearMinions(state)
      }
    }
    expect(state.active).toBe(false)
    expect(state.outcome).toBe('defeat')
    expect(state.outcomeReason).toBe('Enrage: Embermaw overwhelms the party.')
    expect(state.round).toBe(9)
    expect(state.escalation).toBe(ESCALATION_MAX)
  })

  it('accelerates from an unanswered Whelp, so the collapse arrives early', () => {
    // Embermaw authors the penalty at 0 while the live deck has no Whelp
    // answer (D-003), so the trigger is proven against a catalog variant that
    // does price it. Nothing else changes: same passive Hero, adds never
    // cleared, and the fight now ends before the Encounter Clock.
    const priced = structuredClone(catalog)
    for (const program of Object.values(priced.programs)) {
      for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
        if (beat.kind === 'brood_call') {
          beat.escalation_if_unanswered = 1
        }
      }
    }
    let state = immortal()
    let guard = 0
    while (state.active && guard < 60) {
      guard += 1
      state = advancePhase(priced, state).state
    }
    expect(state.active).toBe(false)
    expect(state.outcomeReason).toBe('Enrage: Embermaw overwhelms the party.')
    expect(state.round).toBeLessThan(9)
    expect(state.escalation).toBe(ESCALATION_MAX)
  })

  it('leaves the live encounter unaccelerated while no Whelp answer exists (D-003)', () => {
    // A demand the deck cannot answer must not be priced: every authored
    // Brood Call carries 0 until the Whelp-clearing card ships.
    for (const program of Object.values(catalog.programs)) {
      for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
        if (beat.kind === 'brood_call') {
          expect(beat.escalation_if_unanswered).toBe(0)
        }
      }
    }
  })

  it('does not count a Whelp that arrived this Round as unanswered', () => {
    // Whelps spawn in the Incoming Row, so no player window can reach them
    // before the Round-end step: counting them would be a second automatic
    // tick rather than earned acceleration.
    let state = immortal()
    state = stepPhases(state, 4).state
    expect(state.phase).toBe('slow')
    expect(Object.values(state.board.entities).some((entity) => entity.kind === 'minion')).toBe(true)
    state = stepPhases(state, 1).state
    expect(state.round).toBe(2)
    expect(state.escalation).toBe(0)
  })

  it('permanently Scorches the arena at a structural threshold (D-031)', () => {
    const threshold = catalog.encounters.embermaw_prototype.escalation_thresholds.find((entry) => entry.value === 1)!
    expect(threshold.scorch_hexes.length).toBeGreaterThan(0)
    expect(threshold.boss_damage_bonus).toBe(0)

    const state = immortal()
    state.escalation = 0
    const crossed = resolve(catalog, state, { kind: 'gain_escalation', sourceId: 'encounter', amount: 1, reason: 'automatic_tick', beatId: '' })
    for (const coords of threshold.scorch_hexes) {
      const hazards = crossed.state.board.hazards[hexKey(coords)] ?? []
      expect(hazards.some((hazard) => hazard.id === 'scorched' && hazard.permanent === true)).toBe(true)
    }
    // Permanent means permanent: the Round boundary does not clear it, unlike
    // the Scorch a Cinder Breath leaves behind.
    const later = stepPhases(crossed.state, 5).state
    const first = threshold.scorch_hexes[0]
    expect((later.board.hazards[hexKey(first)] ?? []).some((hazard) => hazard.permanent === true)).toBe(true)
  })

  it('never Scorches a hex adjacent to the Boss, so the Guarded Front cannot burn', () => {
    // The acceleration lesson in another form: an effect that removes the
    // Tank's own answer is a problem the party cannot answer.
    const encounter = catalog.encounters.embermaw_prototype
    for (const threshold of encounter.escalation_thresholds) {
      for (const coords of threshold.scorch_hexes) {
        expect(hexDistance(coords, encounter.boss_start)).toBeGreaterThan(1)
      }
    }
  })

  it('still applies a numeric threshold when one is authored', () => {
    // The read-time modifiers stay supported for Bosses that want them; what
    // D-031 changed is Embermaw's authored content, not the mechanism.
    const claw = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'raking_claw')!
    const state = start()
    state.escalation = 1
    state.escalationThresholds = [{ value: 1, title: 'Test Band', rules_text: '', boss_damage_bonus: 2, extra_spawn_count: 0, minion_damage_bonus: 0, scorch_hexes: [] }]
    const hit = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    expect(hit.facts.find((fact) => fact.kind === 'damage')?.resolutionFact).toMatchObject({ requested: 6, escalation_bonus: 2 })
  })

  it('raises Whelp bite damage at threshold 3', () => {
    const biting = stepPhases(immortal(), 4).state
    biting.escalation = 3
    const heroCoords = biting.board.entities[biting.primaryHeroId].coords
    const whelp = Object.values(biting.board.entities).find((entity) => entity.kind === 'minion')!
    biting.board.entities[whelp.id].coords = { ...heroCoords, q: heroCoords.q + 1 }
    const bite = advancePhase(catalog, biting)
    const biteFact = bite.facts.find((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)
    expect(biteFact?.resolutionFact).toMatchObject({ requested: 2, escalation_bonus: 1 })
  })

  it('widens the Brood Call at threshold 2, and the telegraph does not lie', () => {
    const state = start()
    state.escalation = 2
    // refreshTelegraphs runs on the way into a player window; step to Quick.
    const quick = stepPhases(state, 2).state
    expect(quick.telegraphedSpawnHexes).toHaveLength(3)
    const incoming = advancePhase(catalog, quick)
    expect(incoming.facts.filter((fact) => fact.kind === 'spawn_minion')).toHaveLength(3)
  })

  it('records every Escalation gain with its reason and crossed thresholds', () => {
    const state = immortal()
    state.round = state.roundLimit
    state.phase = 'slow'
    const wrap = advancePhase(catalog, state)
    const gain = wrap.facts.find((fact) => fact.kind === 'gain_escalation')
    expect(gain?.resolutionFact).toMatchObject({
      escalation_before: 0,
      escalation_after: 1,
      escalation_reason: 'automatic_tick',
      thresholds_crossed: ['Ashen Verge'],
    })
  })
})

describe('Raking Claw counter-pressure (D-017)', () => {
  it('adds the unguarded bonus only when the Guarded Front is unheld', () => {
    const claw = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'raking_claw')!
    // Holding the front: the authored 4 lands with no bonus recorded.
    let state = start()
    const held = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    const heldFact = held.facts.find((fact) => fact.kind === 'damage')
    expect(heldFact?.resolutionFact).toMatchObject({ requested: 4, guarded_front: true })
    expect(heldFact?.resolutionFact?.unguarded_bonus).toBeUndefined()
    // Abandoning the front: the same claw still lands (movement does not
    // evade it) and rakes for the authored 4 + 3.
    state = start()
    state.board.entities[state.primaryHeroId].coords = { q: -2, r: 0 }
    const unheld = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    const unheldFact = unheld.facts.find((fact) => fact.kind === 'damage')
    expect(unheldFact?.resolutionFact).toMatchObject({ requested: 7, unguarded_bonus: 3, guarded_front: false })
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

  // Ruled (working note §6): the Slot Activation Limit blocks further
  // charges only within the activation window, per CONTEXT.md — and
  // prototype-rules.md now says the same. This test pins the ruled behavior.
  it('allows charging a fired Quick Slot again once that window has ended', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike'), card('h2', 'iron_guard'), card('h3', 'iron_guard')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h1' }).state
    state = stepPhases(state, 2).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h2' }).state
    state = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 }).state
    const sameWindow = legality(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h3',
    })
    expect(sameWindow.legal).toBe(false)
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('slow')
    const nextWindow = legality(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h3',
    })
    expect(nextWindow.legal).toBe(true)
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

  it('holds a bare discard-for-Stamina to the Quick Window', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike')]
    const inLoadout = legality(catalog, state, { kind: 'discard_for_stamina', sourceId: state.primaryHeroId, cardInstanceId: 'h1' })
    expect(inLoadout).toMatchObject({ legal: false, reason: 'Discarding for Stamina requires the Quick Window and a hand card.' })
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    const discard = resolve(catalog, state, { kind: 'discard_for_stamina', sourceId: state.primaryHeroId, cardInstanceId: 'h1' })
    expect(discard.facts[0].succeeded).toBe(true)
    expect(discard.state.heroes[state.primaryHeroId].discard.map((entry) => entry.instanceId)).toContain('h1')
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
    const state = start()
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
    hero(state).actionBar[0] = { topCard: card('s1', 'shield_slam'), charges: [card('s2', 'iron_guard')], activatedWindow: null, placedThisLoadout: false }
    const bossHealthBefore = boss(state).health
    const slam = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = slam.state
    expect(boss(state).health).toBe(bossHealthBefore - 5)
    expect(state.statusEffects[state.primaryHeroId] ?? []).toHaveLength(0)
    const damageFact = slam.facts.find((fact) => fact.kind === 'damage')
    expect(damageFact?.resolutionFact).toMatchObject({ base_amount: 3, status_bonus: 2, payoff_card_id: 'shield_slam' })
  })

  it('consumes Riposte Ready for +1 when a non-Shield-Slam Boss-damage card fires', () => {
    let state = start()
    hero(state).armor = 5
    state = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_classification: 'tank_hit' },
    }).state
    expect(state.statusEffects[state.primaryHeroId]?.[0]?.id).toBe('riposte_ready')

    state.phase = 'quick'
    hero(state).actionBar[0] = { topCard: card('s1', 'steady_strike'), charges: [card('s2', 'iron_guard')], activatedWindow: null, placedThisLoadout: false }
    const bossHealthBefore = boss(state).health
    const strike = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = strike.state
    // Steady Strike: 2 base + 1 per charged card + 1 off-payoff Riposte bonus.
    expect(boss(state).health).toBe(bossHealthBefore - 4)
    expect(state.statusEffects[state.primaryHeroId] ?? []).toHaveLength(0)
    const damageFact = strike.facts.find((fact) => fact.kind === 'damage')
    expect(damageFact?.resolutionFact).toMatchObject({ base_amount: 3, status_bonus: 1, payoff_card_id: 'steady_strike' })
  })

  it('does not consume Riposte Ready when a card with no Boss damage fires', () => {
    let state = start()
    hero(state).armor = 5
    state = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_classification: 'tank_hit' },
    }).state
    expect(state.statusEffects[state.primaryHeroId]?.[0]?.id).toBe('riposte_ready')

    state.phase = 'quick'
    hero(state).actionBar[0] = { topCard: card('g1', 'iron_guard'), charges: [card('g2', 'steady_strike')], activatedWindow: null, placedThisLoadout: false }
    const guard = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = guard.state
    expect(state.statusEffects[state.primaryHeroId]?.[0]?.id).toBe('riposte_ready')
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

describe('loadout swaps', () => {
  it('swaps a card placed this Loadout back to hand instead of discarding it', () => {
    let state = start()
    const [first, second] = hero(state).hand
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: hero(state).id, slotIndex: 0, cardInstanceId: first.instanceId }).state
    const swap = resolve(catalog, state, { kind: 'load_slot', sourceId: hero(state).id, slotIndex: 0, cardInstanceId: second.instanceId })
    state = swap.state
    expect(hero(state).actionBar[0].topCard?.instanceId).toBe(second.instanceId)
    // The first card came straight back to hand — nothing hit the discard.
    expect(hero(state).discard).toHaveLength(0)
    expect(hero(state).hand.some((held) => held.instanceId === first.instanceId)).toBe(true)
    expect(swap.facts[0].detail.returnedToHand).toBe(first.cardId)
  })

  it('keeps Replace destructive for a Slot that entered the Loadout occupied', () => {
    let state = start()
    const first = hero(state).hand[0]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: hero(state).id, slotIndex: 0, cardInstanceId: first.instanceId }).state
    // A full Round later, the same Slot content is a kept bundle.
    state = stepPhases(state, 5).state
    expect(state.phase).toBe('loadout')
    expect(hero(state).actionBar[0].placedThisLoadout).toBe(false)
    const replacement = hero(state).hand[0]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: hero(state).id, slotIndex: 0, cardInstanceId: replacement.instanceId }).state
    expect(hero(state).discard.some((card) => card.instanceId === first.instanceId)).toBe(true)
    expect(hero(state).hand.some((card) => card.instanceId === first.instanceId)).toBe(false)
  })
})

describe('legality edges', () => {
  it('requires a Minion target in range for a piece-targeting Top Card', () => {
    const state = start()
    hero(state).actionBar[0] = { topCard: card('s1', 'sweeping_blow'), charges: [card('s2', 'iron_guard')], activatedWindow: null, placedThisLoadout: false }
    state.phase = 'quick'
    const noTarget = legality(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    expect(noTarget).toMatchObject({ legal: false, reason: 'The Top Card needs a Minion target.' })

    // Spawn the whelps (they arrive at range > 1 from the hero start).
    let played = start()
    played.heroes[played.primaryHeroId].actionBar[0] = {
      topCard: card('s1', 'sweeping_blow'),
      charges: [card('s2', 'iron_guard')],
      activatedWindow: null,
      placedThisLoadout: false,
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

  it('ends in Enrage Defeat when Escalation reaches its top threshold', () => {
    const state = start()
    // The state the fight is in at the end of Round 8 under automatic ticks
    // alone: four ticks banked (ends of Rounds 4-7), the fifth lands here.
    state.round = state.roundLimit
    state.escalation = ESCALATION_MAX - 1
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
    const state = start()
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

describe('Scenarios', () => {
  it('replays the committed solo-ceiling line: deep, legal, and short of Boss defeat (D-016)', () => {
    const scenario = catalog.scenarios.embermaw_solo_ceiling
    expect(scenario).toBeDefined()
    const replay = runScenario(catalog, scenario)
    // The solo ceiling holds: the strongest searched line loses without killing the Boss.
    expect(replay.state.outcome).toBe('defeat')
    expect(replay.state.active).toBe(false)
    expect(replay.state.board.entities[replay.state.bossId].health).toBeGreaterThan(0)
    // Every player-submitted step must have resolved legally. Boss-row beats
    // may be legitimately refused after the killing hit resolves the fight.
    const playerKinds = new Set(['load_slot', 'charge_slot', 'fire_slot', 'move_hero'])
    const submitted = replay.facts.filter((fact) => fact.depth === 0 && playerKinds.has(fact.kind))
    expect(submitted.length).toBeGreaterThan(0)
    expect(submitted.every((fact) => fact.succeeded)).toBe(true)
  })

  it('replays the committed passive line to Defeat', () => {
    const scenario = catalog.scenarios.embermaw_enrage_defeat
    expect(scenario).toBeDefined()
    const replay = runScenario(catalog, scenario)
    expect(replay.state.outcome).toBe('defeat')
    expect(replay.state.active).toBe(false)
  })

  it('lands the Round 3 jump point mid-Encounter with Whelps on the board', () => {
    const scenario = catalog.scenarios.embermaw_round3_brood
    expect(scenario).toBeDefined()
    const replay = runScenario(catalog, scenario)
    expect(replay.state.active).toBe(true)
    expect(replay.state.round).toBe(3)
    expect(replay.state.currentProgramId).toBe('embermaw_brood')
    expect(Object.values(replay.state.board.entities).filter((entity) => entity.kind === 'minion').length).toBeGreaterThan(0)
  })

  it('replays deterministically', () => {
    const scenario = catalog.scenarios.embermaw_solo_ceiling
    const first = runScenario(catalog, scenario)
    const second = runScenario(catalog, scenario)
    expect(second.state).toEqual(first.state)
    expect(second.facts).toEqual(first.facts)
    expect(first.entries).toHaveLength(scenario.steps.length + 1)
  })
})

describe('Encounter Records (schema_version 2)', () => {
  const meta = { recordId: 'rec_test', startedAt: '2026-08-15T00:00:00Z', endedAt: '2026-08-15T00:10:00Z' }

  it('seals a completed Scenario run and replays it to an identical final state', async () => {
    const scenario = catalog.scenarios.embermaw_solo_ceiling
    const replay = runScenario(catalog, scenario)
    const record = await buildEncounterRecord(catalog, {
      encounterId: scenario.encounter,
      steps: scenario.steps,
      facts: replay.facts,
      initialState: replay.entries[0].state,
      finalState: replay.state,
      meta,
    })
    expect(record.schema_version).toBe(2)
    expect(record.seed).toBe(scenario.seed)
    expect(record.outcome).toBe('defeat')
    expect(record.end_kind).toBe('defeat')
    expect(record.abandon_reason).toBe('')
    expect(record.content_identity.fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(record.content_identity.ids).toContain('encounter:embermaw_prototype')
    expect(record.content_identity.ids).toContain('boss_program:embermaw_brood')
    expect(record.rng_audit.length).toBeGreaterThan(0)

    const verification = await replayRecord(catalog, record)
    expect(verification.finalStateMatches).toBe(true)
    expect(verification.fingerprintMatches).toBe(true)
  })

  it('classifies submitted, generated, and rejected actions', async () => {
    let state = start()
    const facts: ResolvedActionFact[] = []
    const initialState = state
    // A rejected submission: charging during Loadout is illegal.
    const heroCard = hero(state).hand[0]
    const rejected = resolve(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: heroCard.instanceId,
    })
    state = rejected.state
    facts.push(...rejected.facts)
    // Two advances cross Boss Instant; the first carries its generated actions.
    for (let step = 0; step < 2; step += 1) {
      const result = advancePhase(catalog, state)
      state = result.state
      facts.push(...result.facts)
    }
    const record = await buildEncounterRecord(catalog, {
      encounterId: 'embermaw_prototype',
      steps: [{ advance: true }, { advance: true }],
      facts,
      initialState,
      finalState: state,
      meta: { ...meta, abandonReason: 'exported_mid_encounter' },
    })
    expect(record.outcome).toBe('abandoned')
    expect(record.end_kind).toBe('abandoned')
    expect(record.abandon_reason).toBe('exported_mid_encounter')
    expect(record.actions.some((action) => !action.succeeded && action.reason !== '')).toBe(true)
    expect(record.actions.some((action) => action.depth > 0 && action.kind === 'damage')).toBe(true)
    expect(record.actions.some((action) => action.resolution_fact?.damage_classification === 'tank_hit')).toBe(true)
  })

  it('marks Encounter Clock expiry as end_kind end_of_clock', async () => {
    const state = start()
    state.round = state.roundLimit
    state.escalation = ESCALATION_MAX - 1
    state.phase = 'slow'
    const wrap = advancePhase(catalog, state)
    const record = await buildEncounterRecord(catalog, {
      encounterId: 'embermaw_prototype',
      steps: [{ advance: true }],
      facts: wrap.facts,
      initialState: state,
      finalState: wrap.state,
      meta,
    })
    expect(record.outcome).toBe('defeat')
    expect(record.end_kind).toBe('end_of_clock')
  })

  it('detects a tampered record on replay', async () => {
    const scenario = catalog.scenarios.embermaw_enrage_defeat
    const replay = runScenario(catalog, scenario)
    const record = await buildEncounterRecord(catalog, {
      encounterId: scenario.encounter,
      steps: scenario.steps,
      facts: replay.facts,
      initialState: replay.entries[0].state,
      finalState: replay.state,
      meta,
    })
    const tampered = structuredClone(record)
    tampered.final_state.heroes[tampered.final_state.primaryHeroId].health = 99
    const verification = await replayRecord(catalog, tampered)
    expect(verification.finalStateMatches).toBe(false)
    expect(verification.fingerprintMatches).toBe(true)
  })

  it('computes a stable content identity fingerprint', async () => {
    const first = await contentIdentity(catalog, 'embermaw_prototype')
    const second = await contentIdentity(catalog, 'embermaw_prototype')
    expect(second.fingerprint).toBe(first.fingerprint)
    expect(first.ids.length).toBeGreaterThanOrEqual(10)
  })
})

describe('hand refresh', () => {
  it('shuffles the discard back in only when the deck runs out', () => {
    const state = start()
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
