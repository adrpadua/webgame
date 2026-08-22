import { describe, expect, it } from 'vitest'
import { DEFAULT_ENCOUNTER_ID, FIRST_TURN_ENCOUNTER_ID } from '@/content'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import {
  programAnswerTags,
  createEncounterState,
  highestTier,
  programPredictability,
    type EncounterState,
  type ResolvedActionFact,
  } from '@/engine'

import { catalog, start, hero, boss, immortalHero, stepPhases, answeredRound } from './testkit'

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
    // Round 1 is the teaching Round: the one Round a first-time player cannot
    // have learned anything about, so the author keeps it rather than the seed.
    // This is why a phase's first program carries no `severe` Beat (D-036) —
    // together they make the opening Round teach instead of end the run.
    const opener = catalog.encounters.embermaw_prototype.boss_programs[0]
    for (const seed of [1, 2, 3, 7, 42, 1337, 20260817]) {
      const state = start(seed)
      expect(state.programSequence[0]).toBe(opener)
      expect(state.currentProgramId).toBe(opener)
    }
  })

  it('gives different seeds different orders', () => {
    // The point of the change. If this ever collapses to one order, the
    // schedule is deducible from the Round counter and there is nothing to
    // learn by playing.
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => start(seed).programSequence.join(',')))
    expect(orders.size).toBeGreaterThan(1)
  })

  it('keeps the Round after the opener unknowable from the Round number alone', () => {
    // Carried over from the deleted Forecast Row suite, which is where this
    // property was asserted. The row is gone (ADR 0031) but the property it
    // depended on is now the design's foundation rather than one row's excuse:
    // with no forecast, the only way to know what is coming is to have met this
    // Boss before, and that is worth nothing if Round 2 is a constant.
    //
    // Round 2 specifically, because Round 1 is pinned to the authored opener —
    // it is the one Round that is supposed to be the same every time.
    const secondRound = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => start(seed).programSequence[1]))
    expect(secondRound.size).toBeGreaterThan(1)
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
    // ADR 0025, and it outlived the row that first motivated it: a committed
    // Scenario and a sealed Encounter Record both replay by re-running the
    // seed, so a roll at a Round boundary would make replay depend on when the
    // boundary was crossed. Advancing moves the cursor, never the sequence.
    let state = immortalHero(start(4))
    const resolved = [...state.programSequence]
    for (let round = 0; round < 3; round += 1) {
      state = stepPhases(state, 5).state
      expect(state.programSequence).toEqual(resolved)
    }
  })
})

// The substance of the differentiation pass: three programs that were the same
// six Beats under three names now ask for three different answers. With no
// Forecast Row (ADR 0031) this is what there is to learn — three programs a
// player can tell apart after meeting them, rather than one program wearing
// three titles.
// The instrument that turns "is this countable?" from an argument into a number
// (D-038). It assumes nothing about how the order is generated — it groups real
// sequences by observed prefix and asks what the modal continuation is worth —
// so it cannot be satisfied by a generator that only looks random.
describe('Boss Program predictability (D-038)', () => {
  const SEEDS = 800

  it('measures the order as neither fixed nor uniform', () => {
    const measured = programPredictability(catalog, 'embermaw_prototype', SEEDS)
    // Round 1 is pinned to the authored opener, so naming it is recall rather
    // than prediction and it is excluded from the estimate.
    expect(measured.perRound[0].round).toBe(2)
    expect(measured.meanAccuracy).toBeLessThan(1)
    expect(measured.meanAccuracy).toBeGreaterThan(measured.uniformBaseline)
    expect(measured.reliable).toBe(true)
  })

  it('keeps every Round that is not a cycle end near a coin flip', () => {
    // This bound is what caught a real defect in the bag. The no-repeat rule
    // used to swap a colliding program into slot 1, a fixed position, which
    // concentrated the distribution enough to measure: Round 5 read 68% where a
    // shuffle should give about 50%. Displacing to a uniformly chosen later slot
    // fixed it. A generator that leaks position information fails here.
    const measured = programPredictability(catalog, 'embermaw_prototype', SEEDS)
    const uncertain = measured.perRound.filter((entry) => entry.accuracy < 1)
    expect(uncertain.length).toBeGreaterThan(0)
    for (const entry of uncertain) {
      expect(entry.accuracy, `Round ${entry.round} is ${(100 * entry.accuracy).toFixed(0)}% predictable`).toBeLessThan(0.6)
    }
  })

  it('records the ceiling a full-bag deal imposes', () => {
    // Not a defect — a consequence, recorded so it is not rediscovered. Dealing
    // every program exactly once per cycle is what keeps total fight pressure
    // seed-invariant, and it necessarily makes the last slot in a cycle
    // deducible. This is the ceiling on how unpredictable program order alone
    // can be, and the standing argument for varying content *inside* a program
    // (the Module Slot, D-024).
    const measured = programPredictability(catalog, 'embermaw_prototype', SEEDS)
    expect(measured.certainRounds).toBeGreaterThan(0)
    expect(measured.certainRounds).toBeLessThan(measured.perRound.length)
  })
})

// D-039. Mitigation used to protect only Health, which the sweep showed was
// never the binding constraint — runs end at Escalation with Health to spare,
// so Armor bought nothing that reached the ending. It now protects standing
// room. The rule that keeps it honest is Tank Principle 1 generalised: perfect
// play may change the *shape* of the loss, never the total.
describe('Program identity (D-036)', () => {
  it('gives each Phase I program a distinct set of demands', () => {
    const tags = (id: string) => programAnswerTags(catalog.programs[id]).sort().join(',')
    const hunt = tags('embermaw_hunt')
    const embers = tags('embermaw_embers')
    const brood = tags('embermaw_brood')
    expect(new Set([hunt, embers, brood]).size).toBe(3)
    // Named explicitly, because "they differ" is weaker than "they differ in
    // the way the design intends": Armor answers Hunt, footwork answers Ember,
    // and only Brood asks anyone to kill something.
    expect(programAnswerTags(catalog.programs.embermaw_brood)).toContain('kill_adds')
    expect(programAnswerTags(catalog.programs.embermaw_embers)).not.toContain('mitigate')
    expect(programAnswerTags(catalog.programs.embermaw_embers)).not.toContain('kill_adds')
    expect(programAnswerTags(catalog.programs.embermaw_hunt)).not.toContain('kill_adds')
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
    // Rounds 2, 3 and 4 open on the Phase I loop. Answered Rounds, because a
    // party that leaves every demand standing does not reach Round 5 alive —
    // and this test is about the Phase break, not about the clock.
    state = answeredRound(state)
    expect(state.round).toBe(2)
    expect(state.bossPhase).toBe(1)
    state = answeredRound(answeredRound(state))
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
describe('Consequence Tier ladder (D-021, ADR 0031)', () => {
  const everyBeat = Object.values(catalog.programs).flatMap((program) => [
    ...program.instant_beats.map((beat) => ({ beat, program })),
    ...program.incoming_beats.map((beat) => ({ beat, program })),
  ])

  it('rates a Beat that can cross an Escalation Threshold as severe', () => {
    // An Escalation Threshold crossing is one of D-025's run-ending outcomes,
    // so such a Beat is severe by definition — which is what keeps it out of
    // the first program of a phase, the one Round nobody can have learned.
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
    const heroHealth = catalog.heroes[catalog.encounters.embermaw_prototype.party[0].hero].max_health
    for (const { beat } of everyBeat) {
      if (beat.consequence_tier !== 'severe') {
        continue
      }
      const lethalFromFull = beat.damage + beat.unguarded_bonus >= heroHealth
      expect(
        lethalFromFull || beat.escalation_if_unanswered > 0,
        `${beat.id} is authored severe but neither downs a Hero from full health (${beat.damage}+${beat.unguarded_bonus} vs ${heroHealth}) nor adds Escalation`,
      ).toBe(true)
    }
  })

  it('rates every Escalation-adding Beat severe, and nothing else', () => {
    // Content earned the tier, which the previous version of this test invited:
    // Brood Call is now priced (D-036), and a Beat that can add Escalation is
    // severe by definition because a Threshold crossing is one of D-025's
    // run-ending outcomes. Every severe Beat here is severe for that reason —
    // Embermaw still has no single hit that downs a Hero from full health.
    //
    // Stated as the rule in both directions rather than as a roll-call. The
    // roll-call listed one entry per *appearance*, so it counted how many
    // programs happened to field a Beat — and an evaluation Encounter, which
    // fields variants of the shipped programs on purpose (D-076), doubled every
    // number without breaking a single rule. The distinct ids are still named,
    // because which Beats these are is worth reading; how many times each is
    // authored is not this test's business.
    const severe = everyBeat.filter(({ beat }) => beat.consequence_tier === 'severe')
    const priced = everyBeat.filter(({ beat }) => beat.escalation_if_unanswered > 0)
    expect([...new Set(severe.map(({ beat }) => beat.id))].sort()).toEqual(['brood_call', 'stoke_the_forge', 'within_reach'])
    expect(severe.every(({ beat }) => beat.escalation_if_unanswered > 0)).toBe(true)
    expect(priced.every(({ beat }) => beat.consequence_tier === 'severe')).toBe(true)
    const worst = Math.max(...everyBeat.map(({ beat }) => beat.damage + beat.unguarded_bonus))
    expect(worst).toBeLessThan(catalog.heroes[catalog.encounters.embermaw_prototype.party[0].hero].max_health)
  })

})
describe('The evaluation probes (D-076)', () => {
  // An evaluation Encounter earns its place by exercising what it was built to
  // measure. `--deck` has the same hazard one level down: a candidate list that
  // stops containing the candidate measures the shipped deck twice and reports
  // it as evidence.
  const PROBES = ['embermaw_traversal_probe', 'embermaw_terrain_probe'] as const
  const beatsOf = (encounterId: string) => {
    const probe = catalog.encounters[encounterId]
    return [...probe.boss_programs, ...probe.phase_two_programs]
      .flatMap((id) => catalog.programs[id] ?? [])
      .flatMap((program) => [...program.instant_beats, ...program.incoming_beats])
  }

  it('the traversal probe exercises every traversal kind, and ground that stops one', () => {
    const beats = beatsOf('embermaw_traversal_probe')
    const kinds = new Set(beats.filter((beat) => beat.move_tiles > 0 || beat.traversal !== 'walk').map((beat) => beat.traversal))
    expect([...kinds].sort()).toEqual(['jump', 'teleport'])
    // Walk is the shipped Boss's answer, so the probe measures the two kinds
    // nothing else does — and the ground that tells a walker from a jumper.
    const laid = new Set(beats.map((beat) => beat.hazard).filter((id): id is string => id !== undefined))
    expect([...laid].some((id) => catalog.hazards[id]?.impassable)).toBe(true)
  })

  it('the terrain probe moves exactly as the shipped fight does, so ground is its only axis', () => {
    // The traversal probe changed movement and terrain together, which left
    // the terrain half unattributable. This one holds movement at the shipped
    // Boss's: same clauses, same kinds, same distances — the collapsed floor
    // is the whole difference.
    const shippedMoves = beatsOf('embermaw_prototype')
      .filter((beat) => beat.move_tiles > 0 || beat.traversal !== 'walk')
      .map((beat) => `${beat.id}:${beat.traversal}:${beat.move_tiles}`)
      .sort()
    const probeMoves = beatsOf('embermaw_terrain_probe')
      .filter((beat) => beat.move_tiles > 0 || beat.traversal !== 'walk')
      .map((beat) => `${beat.id}:${beat.traversal}:${beat.move_tiles}`)
      .sort()
    expect(probeMoves).toEqual(shippedMoves)
    const laid = new Set(beatsOf('embermaw_terrain_probe').map((beat) => beat.hazard).filter((id): id is string => id !== undefined))
    expect([...laid].some((id) => catalog.hazards[id]?.impassable)).toBe(true)
  })

  for (const probeId of PROBES) {
    it(`${probeId} changes nothing but the axis it is measuring`, () => {
      // The comparison is only worth running while the probe differs from the
      // shipped fight in one place. Board, Boss, deck, clock and thresholds are
      // held equal on purpose; if one of them drifts, a delta stops being
      // attributable and the acceptance bar quietly stops meaning anything.
      const probe = catalog.encounters[probeId]
      const shipped = catalog.encounters.embermaw_prototype
      // `boss` covers what boss_id and boss_health used to: one definition,
      // shared by reference since ADR 0040, cannot drift between the fights.
      for (const field of ['board_radius', 'boss', 'round_limit', 'slot_count', 'hand_refill_target'] as const) {
        expect(probe[field], `${probeId} drifted from the shipped fight on ${field}`).toEqual(shipped[field])
      }
      expect(probe.player_deck).toEqual(shipped.player_deck)
      expect(probe.escalation_thresholds).toEqual(shipped.escalation_thresholds)
      expect(probe.minion_spawn_candidates).toEqual(shipped.minion_spawn_candidates)
      expect(probe.party).toEqual(shipped.party)
    })

    it(`${probeId} stays out of the Workbench, because it is not a fight anybody plays`, () => {
      // Reachable by id from the sweep and by nothing else: the play surface
      // names its Encounters through two constants, and neither is this.
      expect(DEFAULT_ENCOUNTER_ID).not.toBe(probeId)
      expect(FIRST_TURN_ENCOUNTER_ID).not.toBe(probeId)
    })
  }
})
