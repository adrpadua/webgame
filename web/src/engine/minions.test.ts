import { describe, expect, it } from 'vitest'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import {
  advancePhase,
  combatantRef,
  hexDistance,
  parseHexKey,
  getEntityIdAt,
  minionDetonations,
  minionIntents,
  escalationModifiers,
  resolve,
    type EncounterState,
  type ResolvedActionFact,
  } from '@/engine'

import { catalog, hero, boss, immortalHero, startBroodSecond, stepPhases } from './testkit'

describe('Minion end-step intent (D-006)', () => {
  it('a distant Whelp advances toward its Hero; an adjacent Whelp bites', () => {
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
    expect(advanceIntents.every((intent) => intent.damage === 0 && intent.route.length > 0)).toBe(true)

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

    // The bite is adjacency-gated, and adjacency is what the creep buys. Since
    // the fuse (D-063) the arrival Round's end step is the only one a Whelp
    // gets — it detonates on the next Incoming Row — so a Whelp bites only
    // when it arrives already next to its Hero. Put one there and take that
    // Round's wrap instead.
    let adjacent = stepPhases(immortalHero(startBroodSecond()), 9).state
    const biter = Object.values(adjacent.board.entities).filter((entity) => entity.kind === 'minion')[0]
    adjacent.board.entities[biter.id].coords = { q: heroCoords.q + 1, r: heroCoords.r }
    const biteHealth = hero(adjacent).health
    const wrap2 = advancePhase(catalog, adjacent)
    adjacent = wrap2.state
    const bites = wrap2.facts.filter((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)
    expect(bites).toHaveLength(1)
    expect(bites.every((fact) => ((fact.resolutionFact?.damage_keywords as string[]) ?? []).includes('raid_hit'))).toBe(true)
    expect(hero(adjacent).health).toBe(biteHealth - 1)
    // A Raid Hit from a Minion never grants Riposte Ready.
    expect((adjacent.counters[combatantRef(adjacent.primaryHeroId)] ?? []).some((effect) => effect.id === 'riposte_ready')).toBe(false)
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
    // A Minion crosses the board on the same action the Boss does since D-072;
    // `move_minion` retired with the separate movement rule it carried.
    const moves = wrap.facts.filter((fact) => fact.kind === 'traverse_piece')
    expect(moves).toHaveLength(1)
    expect(moves[0].sourceId).toBe(whelps[1].id)
  })
})
describe('Minion detonation (D-063)', () => {
  // Round 2 is the Brood Round on this seed, so its Slow Window is the board
  // with two freshly arrived Whelps on it — the state every test here starts
  // from. Nine phase steps reach it (D-036: the pinned opener calls no Whelps).
  function arrivalRound(): EncounterState {
    const state = stepPhases(immortalHero(startBroodSecond()), 9).state
    expect(state.round).toBe(2)
    expect(state.phase).toBe('slow')
    expect(Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')).toHaveLength(2)
    return state
  }

  // From the arrival Round's Slow Window to the Quick Window of the Round
  // after it: the last window the party has before the fuses run out.
  function fuseWindow(state: EncounterState): EncounterState {
    const next = stepPhases(state, 3).state
    expect(next.round).toBe(3)
    expect(next.phase).toBe('quick')
    return next
  }

  it('holds its fuse through the Round it arrives in', () => {
    const state = arrivalRound()
    // Nothing is due yet: the Whelps arrived this Round, so the projection is
    // empty and the Round's own wrap detonates nothing.
    expect(minionDetonations(catalog, state)).toHaveLength(0)
    const wrap = advancePhase(catalog, state)
    expect(wrap.facts.filter((fact) => fact.kind === 'detonate_minion')).toHaveLength(0)
    expect(Object.values(wrap.state.board.entities).filter((entity) => entity.kind === 'minion')).toHaveLength(2)
  })

  it('detonates on the next Round’s Incoming Row, before the Boss acts', () => {
    let state = fuseWindow(arrivalRound())
    // The projection is live for the whole Round the fuse burns through, so
    // the party can see the deadline in the window that can still answer it.
    const pending = minionDetonations(catalog, state)
    expect(pending).toHaveLength(2)
    expect(pending.every((blast) => blast.damage === 3 && blast.heroIds.includes(state.primaryHeroId))).toBe(true)

    const result = advancePhase(catalog, state)
    state = result.state
    expect(state.phase).toBe('incoming')
    const blasts = result.facts.filter((fact) => fact.kind === 'detonate_minion')
    expect(blasts).toHaveLength(2)
    expect(blasts.every((fact) => fact.succeeded)).toBe(true)
    // Before the Boss: a Whelp's clock was set when it arrived, so what the
    // Boss does this Round must not decide when it runs out.
    const firstBeat = result.facts.findIndex((fact) => fact.kind === 'resolve_boss')
    expect(firstBeat).toBeGreaterThan(result.facts.findIndex((fact) => fact.kind === 'detonate_minion'))
    // Both Whelps are consumed by their own blasts, and the Hero standing
    // between them takes both. Counted off the blasts' own facts rather than
    // off the Hero's total, because the Boss's Incoming Row resolves in this
    // same batch and its damage is not the thing under test.
    expect(Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')).toHaveLength(0)
    const damage = result.facts.filter((fact) => fact.resolutionFact?.minion_detonation === true && fact.kind === 'damage')
    expect(damage).toHaveLength(2)
    expect(damage.map((fact) => fact.resolutionFact?.health_loss)).toEqual([3, 3])
    expect(damage.every((fact) => ((fact.resolutionFact?.damage_keywords as string[]) ?? []).includes('raid_hit'))).toBe(true)
  })

  it('leaves without a Minion Defeat, so nobody is credited a kill', () => {
    const result = advancePhase(catalog, fuseWindow(arrivalRound()))
    // A Minion Defeat is a damage action reducing a Minion to 0 Health, and it
    // records `target_removed`. A detonation removes the Minion with no damage
    // action at all: the Whelp is gone, and no fact claims it was killed.
    expect(result.facts.some((fact) => fact.resolutionFact?.target_removed === true)).toBe(false)
    expect(Object.values(result.state.board.entities).filter((entity) => entity.kind === 'minion')).toHaveLength(0)
  })

  it('burns Heroes only, never the Boss or another Minion', () => {
    // The Burst rule pointed the other way: a player Burst never touches a
    // Hero, so an Enemy blast never touches an Enemy. Park a Whelp against the
    // Boss and check the ledger — a party that could bait a blast into
    // Embermaw would be handed Boss damage it never dealt.
    const state = fuseWindow(arrivalRound())
    const whelps = Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')
    const bossCoords = state.board.entities[state.bossId].coords
    state.board.entities[whelps[0].id].coords = { q: bossCoords.q + 1, r: bossCoords.r - 1 }
    expect(hexDistance(state.board.entities[whelps[0].id].coords, bossCoords)).toBe(1)
    const bossHealth = boss(state).health
    const result = advancePhase(catalog, state)
    const struck = result.facts
      .filter((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_detonation === true)
      .map((fact) => fact.detail.targetId)
    expect(struck).toEqual([state.primaryHeroId])
    expect(boss(result.state).health).toBe(bossHealth)
  })

  it('misses a Hero who stood outside the blast', () => {
    // The second answer, and the one a party without a spare Sweeping Blow
    // actually has: the blast reaches one hex, so a step is an answer to it.
    const state = fuseWindow(arrivalRound())
    for (const whelp of Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')) {
      expect(hexDistance(whelp.coords, state.board.entities[state.primaryHeroId].coords)).toBe(1)
    }
    // Derived rather than written down: which hex is clear of every fuse
    // depends on where the brood arrived, and the spawn candidates are content.
    const whelps = Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')
    const clear = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .find((coords) => getEntityIdAt(state.board, coords) === '' && whelps.every((whelp) => hexDistance(whelp.coords, coords) > catalog.minions.whelp.explode_radius))
    expect(clear).toBeDefined()
    state.board.entities[state.primaryHeroId].coords = clear!
    expect(minionDetonations(catalog, state).every((blast) => blast.heroIds.length === 0)).toBe(true)
    const health = hero(state).health
    const result = advancePhase(catalog, state)
    expect(result.facts.filter((fact) => fact.kind === 'detonate_minion')).toHaveLength(2)
    expect(result.facts.some((fact) => fact.resolutionFact?.minion_detonation === true && fact.kind === 'damage')).toBe(false)
    expect(hero(result.state).health).toBe(health)
  })

  it('sharpens with the Whelp damage threshold', () => {
    // `minion_damage_bonus` is Whelp damage, not only the bite: the Escalation
    // Threshold that authors it has to reach the blast too, or the Whelp gets
    // *safer* the deeper the collapse goes.
    const state = fuseWindow(arrivalRound())
    state.escalation = 3
    expect(escalationModifiers(state).minionDamageBonus).toBe(1)
    const result = advancePhase(catalog, state)
    const damage = result.facts.filter((fact) => fact.resolutionFact?.minion_detonation === true && fact.kind === 'damage')
    expect(damage.map((fact) => fact.resolutionFact?.health_loss)).toEqual([4, 4])
    expect(result.facts.filter((fact) => fact.kind === 'detonate_minion').every((fact) => fact.detail.blastDamage === 4)).toBe(true)
  })

  const detonationCharges = (facts: ResolvedActionFact[]) =>
    facts.filter((fact) => fact.kind === 'gain_escalation' && fact.resolutionFact?.escalation_reason === 'unanswered_minions')

  it('charges the spawning Beat’s price once for a Round a Whelp went off in', () => {
    // Reaching the fuse is the demand going unanswered, so Brood Call's
    // authored `escalation_if_unanswered` is billed here rather than at the
    // Round-end step a detonating Whelp never reaches. Once per Round, which
    // is the rate the Round-end demand charged at: this is the same demand
    // moved, not a second one, and billing each Whelp separately front-loads
    // the same total and pulls the collapse forward across the sweep.
    const state = fuseWindow(arrivalRound())
    const price = Object.values(catalog.programs)
      .flatMap((program) => [...program.instant_beats, ...program.incoming_beats])
      .find((beat) => beat.kind === 'spawn_minions')!.escalation_if_unanswered
    expect(price).toBeGreaterThan(0)
    const before = state.escalation
    const result = advancePhase(catalog, state)
    expect(result.facts.filter((fact) => fact.kind === 'detonate_minion')).toHaveLength(2)
    expect(detonationCharges(result.facts)).toHaveLength(1)
    expect(result.state.escalation).toBe(before + price)
    // Charged where the fuse ran out, so the Round-end step does not bill the
    // same brood a second time on a board with no Minion left standing.
    expect(detonationCharges(advancePhase(catalog, stepPhases(result.state, 1).state).facts)).toHaveLength(0)
  })

  it('charges nothing for a brood the party cleared before the fuse', () => {
    let state = fuseWindow(arrivalRound())
    for (const whelp of Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')) {
      state = resolve(catalog, state, { kind: 'damage', sourceId: state.primaryHeroId, targetId: whelp.id, amount: 2, reasonText: 'test clear' }).state
    }
    const before = state.escalation
    const result = advancePhase(catalog, state)
    expect(result.facts.filter((fact) => fact.kind === 'detonate_minion')).toHaveLength(0)
    expect(detonationCharges(result.facts)).toHaveLength(0)
    expect(result.state.escalation).toBe(before)
  })

  it('never detonates a Minion with no authored fuse', () => {
    // Both halves are authored (`explode_damage`, `explode_radius`), so a
    // Minion without them creeps and bites exactly as it did before D-063.
    const fuseless = structuredClone(catalog)
    fuseless.minions.whelp.explode_damage = 0
    fuseless.minions.whelp.explode_radius = 0
    let state = stepPhases(immortalHero(startBroodSecond()), 9).state
    state = stepPhases(state, 3).state
    expect(minionDetonations(fuseless, state)).toHaveLength(0)
    const result = advancePhase(fuseless, state)
    expect(result.facts.filter((fact) => fact.kind === 'detonate_minion')).toHaveLength(0)
    expect(Object.values(result.state.board.entities).filter((entity) => entity.kind === 'minion')).toHaveLength(2)
  })
})
