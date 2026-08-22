import { describe, expect, it } from 'vitest'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import { escalationActionsForRoundEnd } from './escalation'
import {
  advancePhase,
  buildCatalog,
  hexDistance,
  hexKey,
  ESCALATION_MAX,
  escalationModifiers,
  escalationStartRound,
  resolve,
    type EncounterState,
  type ResolvedActionFact,
  } from '@/engine'

import { catalog, start, boss, immortalHero, startBroodSecond, standingMinionCatalog, stepPhases, answerDemands, answeredRound } from './testkit'

describe('Demand disclosure (D-041)', () => {
  function chargedReasons(result: { facts: ResolvedActionFact[] }): string[] {
    return result.facts
      .filter((fact) => fact.kind === 'gain_escalation' && fact.succeeded)
      .map((fact) => (fact.resolutionFact as Record<string, unknown>)?.escalation_reason as string)
  }

  it('never charges proximity on a Round whose program does not demand it', () => {
    // Camp out of reach for the whole fight and check every charge against the
    // program that actually ran. Round 1 is Hunt Pattern, which carries no
    // proximity demand, and used to be billed anyway.
    let state = immortalHero(start(1))
    state.board.entities[state.primaryHeroId].coords = { q: -2, r: 2 }
    let guard = 0
    while (state.active && guard < 40) {
      guard += 1
      const program = catalog.programs[state.currentProgramId ?? '']
      const result = advancePhase(catalog, state)
      if (chargedReasons(result).includes('unanswered_proximity')) {
        const demands = [...program.instant_beats, ...program.incoming_beats].some((beat) => beat.kind === 'demand_proximity')
        expect(demands, `Round ${state.round} charged proximity but ${state.currentProgramId} never showed the Beat`).toBe(true)
      }
      state = result.state
    }
  })

  it('still charges a standing Minion whichever program is up', () => {
    // The other scope, and the reason it is not one rule: a Minion is on the
    // board regardless of which program runs, so its demand outlives the Beat
    // that spawned it and any priced Beat in the pool sets its cost. Proven
    // against a Minion that can still be standing at a Round end (D-063).
    const standing = standingMinionCatalog()
    let state = immortalHero(startBroodSecond())
    let charged = false
    let guard = 0
    while (state.active && guard < 40) {
      guard += 1
      const program = standing.programs[state.currentProgramId ?? '']
      const result = advancePhase(standing, state)
      if (chargedReasons(result).includes('unanswered_minions')) {
        charged = true
        if (![...program.instant_beats, ...program.incoming_beats].some((beat) => beat.kind === 'spawn_minions')) {
          // Exactly the case pool scope exists for.
          expect(Object.values(result.state.board.entities).some((entity) => entity.kind === 'minion')).toBe(true)
        }
      }
      state = result.state
    }
    expect(charged).toBe(true)
  })

  it('reads the proximity demand as adjacency, and nothing looser', () => {
    // The distance the demand asks for is a bare `1` in the engine, and every
    // other test here camps at the rim — far enough that loosening it to 2, or
    // to 3, would have changed no result. That makes the boundary the thing
    // worth asserting: one hex out is answered, two hexes out is not.
    const state = start()
    state.currentProgramId = 'embermaw_brood'
    expect(
      [...catalog.programs.embermaw_brood.instant_beats, ...catalog.programs.embermaw_brood.incoming_beats].some(
        (beat) => beat.kind === 'demand_proximity',
      ),
    ).toBe(true)

    const bossCoords = boss(state).coords
    function reasonsStandingAt(coords: { q: number; r: number }): string[] {
      state.board.entities[state.primaryHeroId].coords = { ...coords }
      return escalationActionsForRoundEnd(catalog, state)
        .filter((action) => action.kind === 'gain_escalation')
        .map((action) => action.reason)
    }

    const adjacent = { q: 0, r: 0 }
    const twoOut = { q: -1, r: 1 }
    expect(hexDistance(adjacent, bossCoords)).toBe(1)
    expect(hexDistance(twoOut, bossCoords)).toBe(2)
    expect(reasonsStandingAt(adjacent)).not.toContain('unanswered_proximity')
    expect(reasonsStandingAt(twoOut)).toContain('unanswered_proximity')
  })
})

// Reach is content (ADR 0020). It used to be three engine constants for two
// Beats: `forwardCone`'s default parameter, a second literal at the telegraph
// call site, and a bare `1` in the Escalation step. The only place a reader
// could find the number was inside a `rules_text` string, which nothing checks.
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

  it('derives the start Round so automatic ticks alone reach the top at the Encounter Clock', () => {
    expect(escalationStartRound(8)).toBe(4)
    expect(start().escalationStartRound).toBe(4)
    // Five ticks from the start Round through the clock: 4, 5, 6, 7, 8.
    expect(8 - escalationStartRound(8) + 1).toBe(ESCALATION_MAX)
  })

  it('does not tick before the start Round, then ticks once per Round end', () => {
    let state = immortal()
    for (let index = 1; index < 4; index += 1) {
      state = answeredRound(state)
      expect(state.escalation).toBe(0)
    }
    expect(state.round).toBe(4)
    state = answeredRound(state)
    expect(state.escalation).toBe(1)
    state = answeredRound(state)
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
        answerDemands(state)
      }
    }
    expect(state.active).toBe(false)
    expect(state.outcome).toBe('defeat')
    expect(state.outcomeReason).toBe('Enrage: Embermaw overwhelms the party.')
    expect(state.round).toBe(9)
    expect(state.escalation).toBe(ESCALATION_MAX)
  })

  it('accelerates from an unanswered Whelp, so the collapse arrives early', () => {
    // Embermaw prices Brood Call at 0, because since D-063 a Whelp detonates
    // before it can reach a Round end and a demand nothing can leave standing
    // is a price nothing can pay. The mechanism is proven against a catalog
    // variant that both prices the Beat and removes the fuse. Nothing else
    // changes: same passive Hero, adds never cleared, and the fight now ends
    // before the Encounter Clock.
    const priced = standingMinionCatalog()
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
    //
    // The answer is the same one D-063 tightened the deadline on: killing the
    // Whelp. Stepping out of its blast dodges the damage but not the price, so
    // the demand the deck has to be able to answer is still "clear the add".
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

  it('prices a Counter demand only because the deck can answer it (D-003)', () => {
    // The same rule as Brood Call's, for the demand kind that arrived after it.
    // The guard above was written per-kind — `spawn_minions` and nothing else —
    // so the rule it states did not travel to the next demand: Stoke the Forge
    // was priced against a deck with no way to cool Heat, and every check in
    // the suite passed. A demand the deck cannot answer is a tax, and the
    // sweep says so plainly — pricing Heat with no Quench in the list pinned
    // every policy's run to exactly five Rounds, spread 5-5.
    const encounter = catalog.encounters.embermaw_prototype
    const priced = Object.values(catalog.programs)
      .flatMap((program) => [...program.instant_beats, ...program.incoming_beats])
      .filter((beat) => beat.kind === 'place_counter' && beat.escalation_if_unanswered > 0)
    expect(priced.length).toBeGreaterThan(0)
    for (const beat of priced) {
      const answers = encounter.player_deck.filter((entry) =>
        catalog.cards[entry.card].reads.some((reader) => reader.verb === 'spend' && reader.counter === beat.counter),
      )
      expect(answers.length, `${beat.id} is priced but no card in the deck spends ${beat.counter}`).toBeGreaterThan(0)
    }
  })

  it('does not count a Whelp that arrived this Round as unanswered', () => {
    // Whelps spawn in the Incoming Row, so no player window can reach them
    // before the Round-end step: counting them would be a second automatic
    // tick rather than earned acceleration.
    //
    // Against the priced, fuseless variant (D-063): with the live content the
    // demand costs 0 and no Minion survives to a Round end, so this Round's
    // zero would be zero whatever the grace rule said.
    const standing = standingMinionCatalog()
    let state = immortalHero(startBroodSecond())
    for (let step = 0; step < PHASES_TO_BROOD_SLOW; step += 1) {
      state = advancePhase(standing, state).state
    }
    expect(state.phase).toBe('slow')
    expect(state.round).toBe(2)
    expect(Object.values(state.board.entities).some((entity) => entity.kind === 'minion')).toBe(true)
    state = advancePhase(standing, state).state
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
        heroes: Object.values(catalog.heroes),
        bosses: Object.values(catalog.bosses),
        keywords: Object.values(catalog.keywords),
        chargeModifiers: Object.values(catalog.chargeModifiers),
        hazards: Object.values(catalog.hazards),
        minions: Object.values(catalog.minions),
        counters: Object.values(catalog.counters),
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
        heroes: Object.values(catalog.heroes),
        bosses: Object.values(catalog.bosses),
        keywords: Object.values(catalog.keywords),
        chargeModifiers: Object.values(catalog.chargeModifiers),
        hazards: Object.values(catalog.hazards),
        minions: Object.values(catalog.minions),
        counters: Object.values(catalog.counters),
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

  it('keeps every threshold at or below the value live, not only the current band', () => {
    // Cumulative is what lets a Boss raise the same axis twice at different
    // bands, and it is the reason a threshold can be authored as a step up
    // rather than as a replacement. Reading only the exact band is the quiet
    // failure: nothing errors, the widened Brood Call simply stops happening
    // from Escalation 3 upward, and every other Escalation test still passes
    // because each one pins a single band.
    const state = start()
    for (let value = 0; value <= ESCALATION_MAX; value += 1) {
      state.escalation = value
      const live = state.escalationThresholds.filter((threshold) => threshold.value <= value)
      expect(escalationModifiers(state), `Escalation ${value}`).toEqual({
        bossDamageBonus: live.reduce((sum, threshold) => sum + threshold.boss_damage_bonus, 0),
        extraSpawnCount: live.reduce((sum, threshold) => sum + threshold.extra_spawn_count, 0),
        minionDamageBonus: live.reduce((sum, threshold) => sum + threshold.minion_damage_bonus, 0),
      })
    }

    // The loop above mirrors the implementation's own arithmetic, so it cannot
    // be the whole guard. This is the authored consequence stated on its own
    // terms: Embermaw widens the Brood Call at 2 and sharpens Whelp bites at 3,
    // on different axes, so at 3 both have to be live at once.
    state.escalation = 3
    const atThree = escalationModifiers(state)
    expect(atThree.extraSpawnCount).toBeGreaterThan(0)
    expect(atThree.minionDamageBonus).toBeGreaterThan(0)
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
