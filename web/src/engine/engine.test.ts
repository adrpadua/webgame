import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { cardSchema } from './content/schemas'
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
    expect(Object.keys(catalog.programs).sort()).toEqual([
      'embermaw_ashfall',
      'embermaw_brood',
      'embermaw_embers',
      'embermaw_hunt',
      'embermaw_molting',
    ])
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

  // ADR 0022 removed Presence. The schema strips keys it does not declare
  // rather than rejecting them, so a card reintroducing the stat would load
  // silently and carry a field nothing reads — which is how a deleted
  // concept comes back. Pin both halves: no card declares it, and a card
  // that tries does not keep it.
  it('carries no trace of Presence (ADR 0022)', () => {
    for (const card of Object.values(catalog.cards)) {
      expect(Object.keys(card).filter((key) => key.includes('presence'))).toEqual([])
    }
    const parsed = cardSchema.parse({
      id: 'presence_probe',
      title: 'Presence Probe',
      speed: 'quick',
      presence_delta: 2,
    })
    expect(parsed).not.toHaveProperty('presence_delta')
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

// ADR 0023. Three Programs looping unchanged meant Round 7 played like Round
// 2 and the fight never escalated. Phase II is built from the Beat kinds that
// already exist, at harder values, and the dual trigger is kept as authored:
// a Health-only trigger never fires against a slow deck, and a Round-only one
// never rewards a fast one.
describe('Phase Trigger (ADR 0023)', () => {
  // Rotation and the break are what is under test throughout, so the idle
  // hero is given enough Health to outlast the pressure it never answers.
  function durableStart(): EncounterState {
    const state = start()
    hero(state).maxHealth = 500
    hero(state).health = 500
    return state
  }

  it('opens in Phase I on the Phase I Programs', () => {
    const state = durableStart()
    expect(state.bossPhase).toBe(1)
    expect(state.currentProgramId).toBe('embermaw_hunt')
    expect(state.phaseTrigger).toEqual({ bossHealthAtOrBelow: 18, roundAtOrAfter: 5 })
  })

  it('breaks on the Round half of the trigger, before Phase II’s first Instant Row', () => {
    let state = durableStart()
    // Rounds 2, 3 and 4 open on the Phase I loop.
    state = stepPhases(state, 5).state
    expect(state.round).toBe(2)
    expect(state.bossPhase).toBe(1)
    state = stepPhases(state, 10).state
    expect(state.round).toBe(4)
    expect(state.bossPhase).toBe(1)
    // Round 5 opens Phase II, and it opens on Phase II's own first Program
    // rather than wherever the Phase I loop had reached.
    const opened = stepPhases(state, 5)
    expect(opened.state.round).toBe(5)
    expect(opened.state.bossPhase).toBe(2)
    expect(opened.state.currentProgramId).toBe('embermaw_molting')
    // The reveal has something authoritative to read, and it is recorded on
    // the Round's own fact — before any Instant Beat resolves.
    const breakFact = opened.facts.find((fact) => fact.kind === 'round_start' && fact.detail.phaseBreak !== undefined)
    expect(breakFact?.detail).toMatchObject({ phaseBreak: 2, phaseProgram: 'embermaw_molting' })
    const firstBeat = opened.facts.findIndex((fact) => fact.kind === 'boss_beat')
    const breakIndex = opened.facts.indexOf(breakFact as ResolvedActionFact)
    expect(breakIndex).toBeGreaterThanOrEqual(0)
    if (firstBeat >= 0) {
      expect(breakIndex).toBeLessThan(firstBeat)
    }
  })

  it('breaks on the Health half before the Round half is reached', () => {
    let state = durableStart()
    boss(state).health = 18
    state = stepPhases(state, 5).state
    expect(state.round).toBe(2)
    expect(state.bossPhase).toBe(2)
    expect(state.currentProgramId).toBe('embermaw_molting')
  })

  it('waits for the Round boundary when the Health half is met mid-Round', () => {
    let state = durableStart()
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    // A trigger reached inside a player window takes effect after the Round
    // finishes, never mid-window (CONTEXT.md, Phase Trigger).
    boss(state).health = 10
    expect(state.bossPhase).toBe(1)
    state = stepPhases(state, 2).state
    expect(state.bossPhase).toBe(1)
    state = stepPhases(state, 1).state
    expect(state.round).toBe(2)
    expect(state.bossPhase).toBe(2)
  })

  it('sheds the scales: turns one edge clockwise and changes nothing else', () => {
    // Measured against a control that crosses the same Round boundary without
    // breaking. Hazards expire on their own duration at every boundary, so
    // only a side-by-side comparison separates what the break did from what
    // the boundary was going to do anyway.
    const pre = stepPhases(durableStart(), 4).state
    const control = structuredClone(pre)
    const breaking = structuredClone(pre)
    breaking.board.entities[breaking.bossId].health = 18
    const after = stepPhases(breaking, 1).state
    const afterControl = stepPhases(control, 1).state
    expect(after.bossPhase).toBe(2)
    expect(afterControl.bossPhase).toBe(1)
    // Facings run counter-clockwise from E, so one edge clockwise is one step
    // back around the ring. The turn is the Boss's own, not a re-facing at
    // the hero — no Instant Beat has resolved yet.
    expect(after.board.entities[after.bossId].facing).toBe((afterControl.board.entities[afterControl.bossId].facing + 5) % 6)
    // Whelps and Scorched ground are exactly what the boundary left, and the
    // break deals no damage of its own: it is a readability beat.
    const minions = (state: EncounterState) => Object.values(state.board.entities).filter((entity) => entity.kind === 'minion').length
    expect(Object.keys(after.board.hazards).sort()).toEqual(Object.keys(afterControl.board.hazards).sort())
    expect(minions(after)).toBe(minions(afterControl))
    expect(hero(after).health).toBe(hero(afterControl).health)
  })

  it('loops Phase II and never returns to Phase I', () => {
    let state = durableStart()
    boss(state).health = 18
    state = stepPhases(state, 5).state
    expect(state.currentProgramId).toBe('embermaw_molting')
    state = stepPhases(state, 5).state
    expect(state.currentProgramId).toBe('embermaw_ashfall')
    state = stepPhases(state, 5).state
    expect(state.currentProgramId).toBe('embermaw_molting')
    expect(state.bossPhase).toBe(2)
  })

  it('leaves an Encounter with no authored Phase II in one phase', () => {
    let state = createEncounterState(catalog, 'embermaw_first_turn')
    expect(state.phaseTrigger).toBeNull()
    hero(state).maxHealth = 500
    hero(state).health = 500
    boss(state).health = 1
    state = stepPhases(state, 25).state
    expect(state.round).toBeGreaterThanOrEqual(5)
    expect(state.bossPhase).toBe(1)
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

  it('ends in Enrage Defeat when the Encounter Clock expires', () => {
    const state = start()
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
