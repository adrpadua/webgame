import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { cardSchema } from './content/schemas'
import {
  advancePhase,
  buildCatalog,
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
  programCounterTags,
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

// The Boss's program order is rolled from the seed (D-037), and the pinned
// opener never calls Whelps — so a test that needs Whelps has to ask for a seed
// that produces them early rather than assume Round 1 does. Seed 3 puts Brood
// Pattern second, the earliest a Brood Call can land.
const BROOD_SECOND_SEED = 3

function startBroodSecond(): EncounterState {
  const state = start(BROOD_SECOND_SEED)
  // Guard the fixture here so a bag-ordering change fails in one obvious place
  // rather than in whichever Whelp test happens to run first.
  expect(state.programSequence[1]).toBe('embermaw_brood')
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
  // Presence, not census. A count or an exhaustive id list turns "a designer
  // authored a new card" into a failing suite, which teaches the design team
  // that adding content breaks the build. What the engine actually depends on
  // is that the content it names is *there* and still says what it said.
  it('loads and validates the full content port from data/', () => {
    expect(Object.keys(catalog.cards)).toEqual(
      expect.arrayContaining(['steady_strike', 'iron_guard', 'sweeping_blow', 'fortify', 'shield_slam']),
    )
    expect(Object.keys(catalog.keywords)).toEqual(expect.arrayContaining(['guard', 'attack', 'tank']))
    expect(Object.keys(catalog.programs)).toEqual(
      expect.arrayContaining([
        'embermaw_ashfall',
        'embermaw_brood',
        'embermaw_embers',
        'embermaw_hunt',
        'embermaw_molting',
      ]),
    )
    expect(catalog.programs.embermaw_hunt.instant_beats.map((beat) => beat.kind)).toEqual([
      'turn_toward_player',
      'targeted_hit',
      'hazard_last_impact',
    ])
    expect(catalog.programs.embermaw_embers.instant_beats.map((beat) => beat.kind)).toEqual([
      'turn_toward_player',
      'hazard_last_impact',
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

  // The audience for a content error is a designer who edited a JSON file and
  // has never opened the parser. It has to name the file and the field.
  describe('validation errors', () => {
    const empty = { cards: [], keywords: [], chargeModifiers: [], hazards: [], minions: [], programs: [], encounters: [] }

    it('names the file and every bad field', () => {
      const bad = {
        source: 'data/cards/probe_bulwark.json',
        payload: { id: 'probe_bulwark', title: 'Probe Bulwark', speed: 'instant', max_charge: 'two' },
      }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(
        /Invalid card in data\/cards\/probe_bulwark\.json — .*speed:.*max_charge:/s,
      )
    })

    it('falls back to the authored id when there is no file', () => {
      const bad = { id: 'probe_bulwark', title: 'Probe Bulwark', speed: 'instant' }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(/Invalid card in id "probe_bulwark" — speed:/)
    })

    it('names both files behind a duplicate id', () => {
      const entry = (source: string) => ({ source, payload: { id: 'guard', title: 'Guard' } })
      expect(() => buildCatalog({ ...empty, keywords: [entry('data/keywords/guard.json'), entry('data/keywords/guard_copy.json')] })).toThrow(
        'Duplicate keyword id "guard": defined in data/keywords/guard.json and again in data/keywords/guard_copy.json',
      )
    })
  })
})

// D-037. A fixed `(index + 1) % length` rotation made the Forecast Row
// decorative: after one cycle the next program was deducible from the Round
// number, so the third horizon disclosed nothing a player could not already
// count. The order is now drawn from the seed, at setup.
describe('Boss Program order (D-037)', () => {
  it('walks the resolved sequence, Round by Round', () => {
    let state = start()
    // Order is what is under test: give the idle hero enough Health to survive
    // the accumulating boss pressure and Whelp bites (D-006).
    hero(state).maxHealth = 500
    hero(state).health = 500
    expect(state.currentProgramId).toBe(state.programSequence[0])
    for (let round = 2; round <= 4; round += 1) {
      state = stepPhases(state, 5).state
      expect(state.round).toBe(round)
      expect(state.currentProgramId).toBe(state.programSequence[round - 1])
    }
  })

  it('pins Round 1 to the authored opener on every seed', () => {
    // Round 1 is the teaching Round and the one Round the Forecast Row can
    // never have disclosed (ADR 0026), so the author keeps it.
    const opener = catalog.encounters.embermaw_prototype.boss_programs[0]
    for (const seed of [1, 2, 3, 7, 42, 1337, 20260817]) {
      const state = start(seed)
      expect(state.programSequence[0]).toBe(opener)
      expect(state.currentProgramId).toBe(opener)
    }
  })

  it('gives different seeds different orders', () => {
    // The point of the change. If this ever collapses to one order, the
    // Forecast Row is decorative again.
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => start(seed).programSequence.join(',')))
    expect(orders.size).toBeGreaterThan(1)
  })

  it('deals each program about as often as a fixed rotation would', () => {
    // Bags, not independent draws: changing *when* a demand lands must not
    // change how much of it the fight contains, or this would be a difficulty
    // change wearing a variety change's clothes.
    for (const seed of [1, 2, 3, 4, 5]) {
      const cycle = start(seed).programSequence.slice(0, 3)
      expect([...cycle].sort()).toEqual(['embermaw_brood', 'embermaw_embers', 'embermaw_hunt'])
    }
  })

  it('never repeats a program back to back while three are available', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const sequence = start(seed).programSequence
      for (let index = 1; index < sequence.length; index += 1) {
        expect(sequence[index], `seed ${seed} repeated ${sequence[index]} at ${index}`).not.toBe(sequence[index - 1])
      }
    }
  })

  it('resolves the order at setup, so nothing rolls at a Round boundary', () => {
    // ADR 0025: the Forecast Row shows next Round's program a full Round early,
    // so the roll has to have happened before any window opened. Advancing must
    // not change the sequence, only the cursor into it.
    let state = immortalHero(start(4))
    const resolved = [...state.programSequence]
    for (let round = 0; round < 3; round += 1) {
      state = stepPhases(state, 5).state
      expect(state.programSequence).toEqual(resolved)
    }
  })
})

// The substance of the differentiation pass: three programs that were the same
// six Beats under three names now ask for three different answers, which is
// what gives the Forecast Row something to disclose.
describe('Program identity (D-036)', () => {
  it('gives each Phase I program a distinct set of demands', () => {
    const tags = (id: string) => programCounterTags(catalog.programs[id]).sort().join(',')
    const hunt = tags('embermaw_hunt')
    const embers = tags('embermaw_embers')
    const brood = tags('embermaw_brood')
    expect(new Set([hunt, embers, brood]).size).toBe(3)
    // Named explicitly, because "they differ" is weaker than "they differ in
    // the way the design intends": Armor answers Hunt, footwork answers Ember,
    // and only Brood asks anyone to kill something.
    expect(programCounterTags(catalog.programs.embermaw_brood)).toContain('Kill Adds')
    expect(programCounterTags(catalog.programs.embermaw_embers)).not.toContain('Mitigate')
    expect(programCounterTags(catalog.programs.embermaw_embers)).not.toContain('Kill Adds')
    expect(programCounterTags(catalog.programs.embermaw_hunt)).not.toContain('Kill Adds')
  })

  it('keeps the first program of every phase free of severe Beats', () => {
    // Round 1 and the Phase Break are both unforecast: no earlier Round could
    // have shown them, so neither may open on a severe Beat. Phase II's list is
    // ordered for exactly this reason.
    const encounter = catalog.encounters.embermaw_prototype
    expect(highestTier(catalog.programs[encounter.boss_programs[0]])).not.toBe('severe')
    expect(highestTier(catalog.programs[encounter.phase_two_programs[0]])).not.toBe('severe')
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
    expect(opened.state.currentProgramId).toBe('embermaw_ashfall')
    // The reveal has something authoritative to read, and it is recorded on
    // the Round's own fact — before any Instant Beat resolves.
    const breakFact = opened.facts.find((fact) => fact.kind === 'round_start' && fact.detail.phaseBreak !== undefined)
    expect(breakFact?.detail).toMatchObject({ phaseBreak: 2, phaseProgram: 'embermaw_ashfall' })
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
    expect(state.currentProgramId).toBe('embermaw_ashfall')
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
    // Phase II opens on its authored first program for the same reason Round 1
    // does: a Phase Break is reached mid-fight and was never forecast.
    expect(state.currentProgramId).toBe('embermaw_ashfall')
    const phaseTwo = [...state.phaseTwoSequence]
    for (let step = 1; step <= 2; step += 1) {
      state = stepPhases(state, 5).state
      expect(state.currentProgramId).toBe(phaseTwo[step])
      expect(catalog.encounters.embermaw_prototype.phase_two_programs).toContain(state.currentProgramId)
    }
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
    // The Boss's script is rolled before the party's deck: by the time any
    // window opens, nothing about its plan is still undecided (ADR 0025).
    expect(state.rng.choices[0].label).toBe('boss_program_order_opening')
    expect(state.rng.choices.some((choice) => choice.label === 'initial_deck_shuffle')).toBe(true)
  })

  it('telegraphs the Incoming Row at start', () => {
    const state = start()
    expect(state.telegraphs[hexKey({ q: 0, r: 1 })]).toBe('cone')
    expect(state.telegraphs[hexKey({ q: -1, r: 1 })]).toBe('cone')
    // Hunt Pattern calls no Whelps, so the opening Round telegraphs no spawns.
    // Round 1 asks the Tank to hold and then step out of the cone, nothing else
    // (D-036).
    expect(state.telegraphedSpawnHexes).toEqual([])
    expect(Object.values(state.telegraphs)).not.toContain('spawn')
  })

  it('telegraphs the spawn hexes on the Round that actually calls Whelps', () => {
    const state = stepPhases(immortalHero(startBroodSecond()), 5).state
    expect(state.currentProgramId).toBe('embermaw_brood')
    expect(state.telegraphedSpawnHexes.length).toBeGreaterThan(0)
    expect(Object.values(state.telegraphs)).toContain('spawn')
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
    // Round 1 is Hunt Pattern, which calls no Whelps (D-036): the opening Round
    // is the claw and the cone, and nothing else.
    expect(incoming.facts.filter((fact) => fact.kind === 'spawn_minion')).toHaveLength(0)
    expect(incoming.facts.filter((fact) => fact.kind === 'resolve_boss').every((fact) => fact.phase === 'incoming')).toBe(true)

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

  it('spawns the Brood Call Whelps at the telegraphed hexes on a Brood Round', () => {
    // The spawn half of the Round walk, moved to the Round that actually calls
    // Whelps now that the opener does not.
    let state = immortalHero(startBroodSecond())
    state = stepPhases(state, 7).state
    expect(state.round).toBe(2)
    expect(state.phase).toBe('quick')
    const incoming = advancePhase(catalog, state)
    state = incoming.state
    expect(state.phase).toBe('incoming')
    const spawns = incoming.facts.filter((fact) => fact.kind === 'spawn_minion')
    expect(spawns).toHaveLength(2)
    const whelps = Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')
    expect(whelps).toHaveLength(2)
    expect(whelps.every((whelp) => whelp.health === 2)).toBe(true)
  })
})

describe('Minion end-step intent (D-006)', () => {
  it('a distant Whelp advances toward its Hero; an arrived Whelp bites', () => {
    // Brood Pattern's Incoming Row spawns two Whelps at distance 2. It runs on
    // Round 2 for this seed, so reach that Round's Slow Window (D-036: the
    // pinned opener calls no Whelps).
    let state = stepPhases(immortalHero(startBroodSecond()), 9).state
    expect(state.round).toBe(2)
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

    // The spawn Round's wrap: no bites yet — the creep is the deadline.
    const healthBefore = hero(state).health
    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.round).toBe(3)
    expect(wrap.facts.filter((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)).toHaveLength(0)
    expect(hero(state).health).toBe(healthBefore)
    for (const { id } of spawned) {
      expect(hexDistance(state.board.entities[id].coords, heroCoords)).toBe(1)
    }

    // The following Round: the arrived Whelps bite.
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
    let state = stepPhases(immortalHero(startBroodSecond()), 9).state
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
    expect(fired.facts[0].resolutionFact).toMatchObject({ status_event: { status_id: 'fortified', event: 'granted', reason: 'slow_commitment' } })

    // Round start wipes Armor first, then the commitment lands.
    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.round).toBe(2)
    expect(hero(state).armor).toBe(6)
    expect(state.statusEffects[state.primaryHeroId] ?? []).toHaveLength(0)

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
    expect(Object.keys(catalog.statuses)).toEqual(expect.arrayContaining(['fortified', 'sundered', 'weakened']))
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
    const state = startBroodSecond()
    expect(state.currentProgramId).toBe('embermaw_hunt')
    const ahead = forecast(catalog, state)!
    // Family level only: a title, the union of counter tags, and a tier. No
    // target, magnitude, or hex — those belong to Incoming and Instant.
    expect(ahead).toMatchObject({
      programId: 'embermaw_brood',
      title: catalog.programs.embermaw_brood.title,
      tier: 'severe',
    })
    expect(ahead.counterTags).toEqual(['Position', 'Mitigate', 'Kill Adds'])
    expect(Object.keys(ahead)).not.toContain('damage')
  })

  it('tells the party something the Round number does not (D-037)', () => {
    // The whole reason the order is seeded. Under the old fixed rotation this
    // set had exactly one member on every seed, which made the third horizon
    // decorative: a player could read the next program off the Round counter.
    const secondRoundForecasts = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => forecast(catalog, start(seed))!.programId),
    )
    expect(secondRoundForecasts.size).toBeGreaterThan(1)
  })

  it('follows the resolved order a Round ahead', () => {
    let state = immortalHero(start(4))
    const sequence = [...state.programSequence]
    for (let index = 0; index < 3; index += 1) {
      expect(state.currentProgramId).toBe(sequence[index])
      expect(forecast(catalog, state)?.programId).toBe(sequence[index + 1])
      state = stepPhases(state, 5).state
    }
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

  it('empties at the end of the resolved order rather than wrapping', () => {
    const state = start()
    state.programIndex = state.programSequence.length - 1
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

  it('holds severe to its measured floor: lethal from full health, or Escalation-adding', () => {
    // The floor is what makes the tier a per-Beat property. Without it, "can
    // down a Hero" depends on accumulated attrition — measured at 9.7 average
    // health entering Phase II against a 34 maximum, which would make nearly
    // every Beat severe by the late Rounds and the tier meaningless.
    const encounter = catalog.encounters.embermaw_prototype
    for (const { beat } of everyBeat) {
      if (beat.consequence_tier !== 'severe') {
        continue
      }
      const lethalFromFull = beat.damage + beat.unguarded_bonus >= encounter.player_health
      expect(
        lethalFromFull || beat.escalation_if_unanswered > 0,
        `${beat.id} is authored severe but neither downs a Hero from full health (${beat.damage}+${beat.unguarded_bonus} vs ${encounter.player_health}) nor adds Escalation`,
      ).toBe(true)
    }
  })

  it('rates Brood Call severe on the Escalation clause, not on its damage', () => {
    // Content earned the tier, which the previous version of this test invited:
    // Brood Call is now priced (D-036), and a Beat that can add Escalation is
    // severe by definition because a Threshold crossing is one of D-025's
    // run-ending outcomes. Every severe Beat here is severe for that reason —
    // Embermaw still has no single hit that downs a Hero from full health.
    const severe = everyBeat.filter(({ beat }) => beat.consequence_tier === 'severe')
    expect(severe.map(({ beat }) => beat.id).sort()).toEqual(['brood_call', 'brood_call'])
    expect(severe.every(({ beat }) => beat.escalation_if_unanswered > 0)).toBe(true)
    const worst = Math.max(...everyBeat.map(({ beat }) => beat.damage + beat.unguarded_bonus))
    expect(worst).toBeLessThan(catalog.encounters.embermaw_prototype.player_health)
  })

})

describe('Escalation as the single clock (D-023, ADR 0027)', () => {
  // A passive Hero who never clears an add: give them enough Health that
  // Escalation, not attrition, is what ends the fight.
  function immortal(seed?: number): EncounterState {
    return immortalHero(start(seed))
  }

  // Whelps only arrive on a Brood Round, and the pinned opener is not one
  // (D-036), so tests about the Whelp demand step to Round 2 on a seed that
  // schedules Brood Pattern there. Slow of Round 2 is nine phase steps in.
  const PHASES_TO_BROOD_SLOW = 9
  const PHASES_TO_BROOD_QUICK = 7

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
        if (beat.kind === 'spawn_minions') {
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

  it('prices Brood Call only because the deck can answer it (D-003)', () => {
    // D-003 forbids pricing a demand the deck cannot answer. The old form of
    // this test asserted a blanket `0`, which read as the rule but was really a
    // snapshot of one encounter's tuning — and it hid the fact that the premise
    // had gone stale: the starter deck carries Sweeping Blow, which one-shots a
    // Whelp. State the rule instead, so pricing and answerability can never
    // drift apart.
    const encounter = catalog.encounters.embermaw_prototype
    const priced = Object.values(catalog.programs)
      .flatMap((program) => [...program.instant_beats, ...program.incoming_beats])
      .filter((beat) => beat.kind === 'spawn_minions' && beat.escalation_if_unanswered > 0)
    expect(priced.length).toBeGreaterThan(0)
    const whelpHealth = catalog.minions.whelp.max_health
    const answers = encounter.player_deck.filter((entry) => {
      const card = catalog.cards[entry.card]
      return card.target_type === 'piece' && card.damage >= whelpHealth
    })
    expect(
      answers.length,
      `Brood Call is priced but no card in the deck deals ${whelpHealth}+ to a piece`,
    ).toBeGreaterThan(0)
  })

  it('does not count a Whelp that arrived this Round as unanswered', () => {
    // Whelps spawn in the Incoming Row, so no player window can reach them
    // before the Round-end step: counting them would be a second automatic
    // tick rather than earned acceleration.
    let state = immortalHero(startBroodSecond())
    state = stepPhases(state, PHASES_TO_BROOD_SLOW).state
    expect(state.phase).toBe('slow')
    expect(state.round).toBe(2)
    expect(Object.values(state.board.entities).some((entity) => entity.kind === 'minion')).toBe(true)
    state = stepPhases(state, 1).state
    expect(state.round).toBe(3)
    // Automatic ticks have not begun either, so a nonzero value here could only
    // have come from the Whelps that just landed.
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

  // The acceleration lesson in another form: an effect that removes the Tank's
  // own answer is a problem the party cannot answer. The rule is enforced at
  // load for every Encounter, so a new arena inherits it instead of having to
  // remember it.
  describe('the Guarded Front cannot burn (D-031)', () => {
    it('holds for every authored Encounter', () => {
      for (const encounter of Object.values(catalog.encounters)) {
        for (const threshold of encounter.escalation_thresholds) {
          for (const coords of threshold.scorch_hexes) {
            expect(hexDistance(coords, encounter.boss_start)).toBeGreaterThan(1)
          }
        }
      }
    })

    it('is rejected at load, naming the Encounter and the hex', () => {
      const encounter = structuredClone(catalog.encounters.embermaw_prototype)
      // One hex north-east of the Boss: adjacent, and therefore part of the
      // Guarded Front the Tank is written to hold.
      encounter.escalation_thresholds[0].scorch_hexes = [
        { q: encounter.boss_start.q, r: encounter.boss_start.r + 1 },
      ]
      const raw = {
        cards: Object.values(catalog.cards),
        keywords: Object.values(catalog.keywords),
        chargeModifiers: Object.values(catalog.chargeModifiers),
        hazards: Object.values(catalog.hazards),
        minions: Object.values(catalog.minions),
        statuses: Object.values(catalog.statuses),
        programs: Object.values(catalog.programs),
        encounters: [{ source: 'data/encounters/ashen_trial_variant.json', payload: encounter }],
      }
      expect(() => buildCatalog(raw)).toThrow(
        /Encounter embermaw_prototype \(data\/encounters\/ashen_trial_variant\.json\) threshold 1 \("Ashen Verge"\) Scorches \(1, 0\), which is adjacent to the Boss at \(1, -1\)/,
      )
    })

    it('accepts the same threshold one hex further out', () => {
      const encounter = structuredClone(catalog.encounters.embermaw_prototype)
      encounter.escalation_thresholds[0].scorch_hexes = [
        { q: encounter.boss_start.q, r: encounter.boss_start.r + 2 },
      ]
      const raw = {
        cards: Object.values(catalog.cards),
        keywords: Object.values(catalog.keywords),
        chargeModifiers: Object.values(catalog.chargeModifiers),
        hazards: Object.values(catalog.hazards),
        minions: Object.values(catalog.minions),
        statuses: Object.values(catalog.statuses),
        programs: Object.values(catalog.programs),
        encounters: [encounter],
      }
      expect(() => buildCatalog(raw)).not.toThrow()
    })
  })

  it('still applies a numeric threshold when one is authored', () => {
    // The read-time modifiers stay supported for Bosses that want them; what
    // D-031 changed is Embermaw's authored content, not the mechanism.
    const claw = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'targeted_hit')!
    const state = start()
    state.escalation = 1
    state.escalationThresholds = [{ value: 1, title: 'Test Band', rules_text: '', boss_damage_bonus: 2, extra_spawn_count: 0, minion_damage_bonus: 0, scorch_hexes: [] }]
    const hit = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    expect(hit.facts.find((fact) => fact.kind === 'damage')?.resolutionFact).toMatchObject({ requested: 6, escalation_bonus: 2 })
  })

  it('raises Whelp bite damage at threshold 3', () => {
    const biting = stepPhases(immortalHero(startBroodSecond()), PHASES_TO_BROOD_SLOW).state
    biting.escalation = 3
    const heroCoords = biting.board.entities[biting.primaryHeroId].coords
    const whelp = Object.values(biting.board.entities).find((entity) => entity.kind === 'minion')!
    biting.board.entities[whelp.id].coords = { ...heroCoords, q: heroCoords.q + 1 }
    const bite = advancePhase(catalog, biting)
    const biteFact = bite.facts.find((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)
    expect(biteFact?.resolutionFact).toMatchObject({ requested: 2, escalation_bonus: 1 })
  })

  it('widens the Brood Call at threshold 2, and the telegraph does not lie', () => {
    const state = immortalHero(startBroodSecond())
    state.escalation = 2
    // refreshTelegraphs runs on the way into a player window; step to the Brood
    // Round's Quick Window.
    const quick = stepPhases(state, PHASES_TO_BROOD_QUICK).state
    expect(quick.currentProgramId).toBe('embermaw_brood')
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
    const claw = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'targeted_hit')!
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

describe('impact memory across a missed Beat', () => {
  it('leaves the last connected hit standing for hazard_last_impact when a cone misses', () => {
    // `hazard_last_impact` burns wherever the Boss last actually connected,
    // so the memory only moves when a Beat impacts something. A miss is not an
    // impact of zero hexes; it is no impact, and Ash Trail keeps its target.
    // Without that distinction a dodged Cinder Breath would silently disarm
    // the scorch behind it, which is the reward for good footwork paying out
    // twice.
    const hunt = catalog.programs.embermaw_hunt
    const claw = hunt.instant_beats.find((beat) => beat.kind === 'targeted_hit')!
    const trail = hunt.instant_beats.find((beat) => beat.kind === 'hazard_last_impact')!
    const breath = hunt.incoming_beats.find((beat) => beat.kind === 'forward_cone')!

    let state = start()
    const struck = { ...state.board.entities[state.primaryHeroId].coords }

    // The targeted hit cannot be evaded, so it is what writes the memory.
    state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' }).state
    expect(state.previousImpactedHexes).toEqual([struck])

    // Step out of the forward cone. The breath impacts nothing...
    state.board.entities[state.primaryHeroId].coords = { q: -1, r: 0 }
    const missed = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: breath, track: 'incoming' })
    state = missed.state
    expect(missed.facts.some((fact) => fact.kind === 'damage')).toBe(false)
    // ...and so it does not get to overwrite what the claw struck.
    expect(state.previousImpactedHexes).toEqual([struck])

    // Ash Trail therefore still burns the ground the claw actually hit. The
    // assertion reads the Beat's own generated hazard rather than the board,
    // because the missed breath Scorches its whole cone on the way past and
    // that cone covers the struck hex too.
    const scorch = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: trail, track: 'instant' })
    const applied = scorch.facts.filter((fact) => fact.kind === 'apply_hazard')
    expect(applied.map((fact) => fact.detail.coords)).toEqual([struck])
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
    let state = immortalHero(startBroodSecond())
    state = stepPhases(state, 9).state
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

    // Spawn the whelps (they arrive at range > 1 from the hero start), which
    // now means reaching the Brood Round rather than Round 1.
    let played = immortalHero(startBroodSecond())
    played.heroes[played.primaryHeroId].actionBar[0] = {
      topCard: card('s1', 'sweeping_blow'),
      charges: [card('s2', 'iron_guard')],
      activatedWindow: null,
      placedThisLoadout: false,
    }
    played = stepPhases(played, 9).state
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

  it('lands the jump point mid-Encounter with Whelps on the board', () => {
    // Asserted by the property the fixture exists for, not by a Round number:
    // program order is seeded (D-037), so which Round carries a Brood Call is
    // not a fact this fixture can pin.
    const scenario = catalog.scenarios.embermaw_brood_pressure
    expect(scenario).toBeDefined()
    const replay = runScenario(catalog, scenario)
    expect(replay.state.active).toBe(true)
    expect(replay.state.round).toBeGreaterThan(1)
    expect(replay.state.phase).toBe('loadout')
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
    // The solo ceiling now ends at the clock rather than at zero Health: with
    // Brood Call priced (D-036), the deepest surviving push runs out of Rounds
    // before it runs out of Hero. `outcome` stays `defeat`; `end_kind` is what
    // distinguishes the two ways to lose.
    expect(record.end_kind).toBe('end_of_clock')
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
