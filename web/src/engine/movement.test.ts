import { describe, expect, it } from 'vitest'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import {
  advancePhase,
  hexDistance,
  parseHexKey,
  hexKey,
  neighbors,
  isLegalMove,
  legality,
  facingToward,
  getEntityIdAt,
  minionIntent,
  normalizeFacing,
  resolve,
    type EncounterState,
    } from '@/engine'

import { catalog, start, hero, boss, card, immortalHero, startBroodSecond, stepPhases } from './testkit'

describe('Own-side Hazard immunity (D-042)', () => {
  const scorch = (sourceTeam: 'party' | 'enemy') => ({
    id: 'scorched',
    title: 'Scorched',
    remainingRounds: 1,
    enterDamage: 1,
    blocksVoluntaryMovement: true,
    sourceTeam,
  })

  function drag(state: EncounterState, targetId: string, into: { q: number; r: number }) {
    // Park the target one hex short and pull it in, so the move is a real
    // displacement that runs the Hazard-entry path.
    const from = { q: into.q + 1, r: into.r }
    state.board.entities[targetId].coords = from
    state.board.entities[state.primaryHeroId].coords = { q: into.q - 1, r: into.r }
    return resolve(catalog, state, {
      kind: 'displace_piece',
      sourceId: state.primaryHeroId,
      targetId,
      distance: 1,
      movement: 'pull',
      reasonText: 'test',
    })
  }

  it('spares the Boss walking onto ground its own side laid', () => {
    const state = immortalHero(start())
    const hex = { q: 0, r: 0 }
    state.board.hazards[hexKey(hex)] = [scorch('enemy')]
    const before = boss(state).health
    const moved = drag(state, state.bossId, hex)
    expect(moved.state.board.entities[state.bossId].coords).toEqual(hex)
    expect(moved.state.board.entities[state.bossId].health).toBe(before)
  })

  it('still burns the Boss on ground the party laid', () => {
    // The half that makes this a rule about sides rather than about Enemies.
    const state = immortalHero(start())
    const hex = { q: 0, r: 0 }
    state.board.hazards[hexKey(hex)] = [scorch('party')]
    const before = boss(state).health
    const moved = drag(state, state.bossId, hex)
    expect(moved.state.board.entities[state.bossId].health).toBeLessThan(before)
  })

  it('lets the ground decline the immunity, so a Boss can be lured onto its own (D-074)', () => {
    // The immunity is the right default and was the wrong kind of rule: whether
    // Embermaw walks its own fire is a decision about Embermaw, not a fact
    // about fire. Authored, "trick it onto the hex it just burned" becomes a
    // fight somebody can build — and Embermaw's own Scorched keeps declining
    // to burn it, which is the line above.
    const state = immortalHero(start())
    const hex = { q: 0, r: 0 }
    state.board.hazards[hexKey(hex)] = [{ ...scorch('enemy'), damagesSourceTeam: true }]
    const before = boss(state).health
    const moved = drag(state, state.bossId, hex)
    expect(moved.state.board.entities[state.bossId].health).toBeLessThan(before)
    // The shipped ground is authored the other way, and the catalog says so
    // rather than the engine.
    expect(catalog.hazards.scorched.damages_source_team).toBe(false)
  })

  it('records the side that laid every Hazard the Encounter creates', () => {
    // Embermaw's own Beats and its structural Thresholds both act for the Boss,
    // so nothing it puts on the board should be missing a side.
    //
    // Escalation is left to climb on its own rather than assigned. Assigning it
    // skips the crossing that lays structural Scorch, and structural Scorch is
    // the only Hazard whose side comes from the fallback: it rides
    // `ENCOUNTER_SOURCE`, which is not a board entity, so `?? 'enemy'` decides
    // it. Pre-setting the value meant this test never once reached that branch,
    // and flipping the fallback to 'party' — which would hand the party the run
    // of a closing arena and start the Boss burning in it — left it passing.
    let state = immortalHero(start())
    let guard = 0
    while (state.active && guard < 40) {
      guard += 1
      state = advancePhase(catalog, state).state
      for (const hazards of Object.values(state.board.hazards)) {
        for (const hazard of hazards) {
          expect(hazard.sourceTeam).toBe('enemy')
        }
      }
    }

    // Proof the structural path ran at all, rather than the loop having only
    // ever seen Beat-laid ground: D-031's authored hexes have to be on the
    // board, and enemy-sided, by the time the clock has run out. Every
    // scorch-bearing Threshold is checked, not the first one found — automatic
    // ticks alone cross all of them, so picking one would leave the rest as
    // unexamined as they were before.
    const authored = catalog.encounters.embermaw_prototype.escalation_thresholds.filter(
      (threshold) => threshold.scorch_hexes.length > 0,
    )
    expect(authored.length).toBeGreaterThan(0)
    for (const threshold of authored) {
      for (const coords of threshold.scorch_hexes) {
        const laid = (state.board.hazards[hexKey(coords)] ?? []).find((hazard) => hazard.permanent === true)
        expect(laid?.sourceTeam, `Threshold ${threshold.value} never laid Scorch at ${hexKey(coords)}`).toBe('enemy')
      }
    }
  })
})
describe('Boss traversal (D-074)', () => {
  // Movement is a clause any Beat may carry, and how it crosses the board is
  // authored. Embermaw only ever walks one hex, so the vocabulary is proven
  // against catalog variants — the pattern the Counter and acceleration tests
  // established for content the live encounter does not exercise yet.
  const advance = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'advance_toward_player')!

  function movingBeat(patch: Partial<typeof advance> = {}) {
    return { ...advance, ...patch }
  }

  // Put the Hero on the hex furthest from the Boss, so a traversal has room to
  // be measured rather than being over before it starts.
  function apart(): EncounterState {
    const state = immortalHero(start())
    const bossCoords = boss(state).coords
    const furthest = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .sort((left, right) => hexDistance(right, bossCoords) - hexDistance(left, bossCoords))[0]
    state.board.entities[state.primaryHeroId].coords = furthest
    return state
  }

  function fire(state: EncounterState, beat: typeof advance) {
    return resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat, track: 'instant' })
  }

  it('walks its authored allowance and no further', () => {
    const state = apart()
    const before = hexDistance(boss(state).coords, state.board.entities[state.primaryHeroId].coords)
    const moved = fire(state, movingBeat({ move_tiles: 2, standoff_tiles: 1 })).state
    expect(hexDistance(boss(moved).coords, moved.board.entities[moved.primaryHeroId].coords)).toBe(before - 2)
  })

  it('stops at its authored standoff, spending nothing it does not need', () => {
    // Gloomhaven's rule, and the one that makes an advance readable: it comes
    // exactly close enough to do the thing it is about to do. Without it a Boss
    // authored to close 3 would walk into and past the Hero it is hunting.
    const state = apart()
    const generous = fire(state, movingBeat({ move_tiles: 8, standoff_tiles: 2 })).state
    expect(hexDistance(boss(generous).coords, generous.board.entities[generous.primaryHeroId].coords)).toBe(2)
  })

  // Both pieces on opposite rims, so a Beat has room to stop short of its reach
  // as well as inside it. `apart()` only moves the Hero, and Embermaw starts a
  // hex off the middle, which leaves three between them at most.
  function rimToRim(): EncounterState {
    const state = immortalHero(start())
    const hexes = Object.keys(state.board.hexes).map(parseHexKey)
    const [heroCoords, bossCoords] = hexes
      .flatMap((left) => hexes.map((right) => [left, right] as const))
      .sort(([leftA, rightA], [leftB, rightB]) => hexDistance(leftB, rightB) - hexDistance(leftA, rightA))[0]
    state.board.entities[state.primaryHeroId].coords = heroCoords
    boss(state).coords = bossCoords
    return state
  }

  it('stops where it wants to stand rather than where it can hit (D-079)', () => {
    // The split's whole point, in both directions, against a Beat that reaches
    // *and* moves. The reach is held fixed at 2 and only the standoff changes,
    // so nothing but the new field can be producing the difference.
    const striking = { ...advance, kind: 'targeted_hit' as const, damage: 1, range_tiles: 2, move_tiles: 8 }
    expect(hexDistance(boss(rimToRim()).coords, rimToRim().board.entities[rimToRim().primaryHeroId].coords)).toBe(4)

    // A brawler: it can hit from 2 and walks inside its own reach anyway.
    const brawler = fire(rimToRim(), { ...striking, standoff_tiles: 1 }).state
    expect(hexDistance(boss(brawler).coords, brawler.board.entities[brawler.primaryHeroId].coords)).toBe(1)

    // And a Boss that keeps its distance: the same reach of 2, stopping at 3.
    // Before the split neither of these was authorable — the reach it struck
    // with *was* the distance it closed to, so every mover stopped at exactly 2.
    const wary = fire(rimToRim(), { ...striking, standoff_tiles: 3 }).state
    expect(hexDistance(boss(wary).coords, wary.board.entities[wary.primaryHeroId].coords)).toBe(3)
  })

  it('does not move at all when it is already close enough', () => {
    // The Hero starts adjacent, and a standoff of 1 is already satisfied.
    const state = immortalHero(start())
    const bossBefore = { ...boss(state).coords }
    const fired = fire(state, movingBeat({ move_tiles: 3, standoff_tiles: 1 }))
    expect(fired.facts.some((fact) => fact.kind === 'traverse_piece')).toBe(false)
    expect(boss(fired.state).coords).toEqual(bossBefore)
  })

  it('walks around a piece in the way instead of stopping against it', () => {
    // The behaviour the retired `displace_piece` advance could not manage: it
    // re-aimed each step and stopped dead on the first occupied hex, so a Whelp
    // of Embermaw's own summoning could pin it in place.
    const state = apart()
    const bossCoords = boss(state).coords
    const heroCoords = state.board.entities[state.primaryHeroId].coords
    // Block every hex that gets the Boss closer, bar one.
    const closer = neighbors(state.board.hexes, bossCoords).filter((coords) => hexDistance(coords, heroCoords) < hexDistance(bossCoords, heroCoords))
    expect(closer.length).toBeGreaterThan(1)
    closer.slice(1).forEach((coords, index) => {
      state.board.entities[`blocker_${index}`] = {
        id: `blocker_${index}`,
        kind: 'minion',
        coords,
        health: 2,
        maxHealth: 2,
        facing: 0,
        team: 'enemy',
        title: 'Blocker',
      }
    })
    const moved = fire(state, movingBeat({ move_tiles: 1, standoff_tiles: 1 })).state
    expect(boss(moved).coords).toEqual(closer[0])
  })

  it('is stopped by ground that authors impassable, and walks ground that does not', () => {
    // The authored half of terrain (D-074). The same Beat, the same board, and
    // the only difference is what the Hazard says about being crossed.
    const bossCoords = boss(start()).coords
    const blockedRun = (impassable: boolean) => {
      const state = apart()
      for (const coords of neighbors(state.board.hexes, bossCoords)) {
        state.board.hazards[hexKey(coords)] = [
          { id: 'wall', title: 'Wall', remainingRounds: 9, enterDamage: 0, blocksVoluntaryMovement: false, impassable },
        ]
      }
      return fire(state, movingBeat({ move_tiles: 1, standoff_tiles: 1 })).state
    }
    // Walled in on every side, a walker has nowhere to go.
    expect(boss(blockedRun(true)).coords).toEqual(bossCoords)
    // The identical ground authored as crossable, and it moves.
    expect(boss(blockedRun(false)).coords).not.toEqual(bossCoords)
  })

  it('leaps the ground a walker has to go round, and lands somewhere it could stand', () => {
    const bossCoords = boss(start()).coords
    const walled = () => {
      const state = apart()
      for (const coords of neighbors(state.board.hexes, bossCoords)) {
        state.board.hazards[hexKey(coords)] = [
          { id: 'wall', title: 'Wall', remainingRounds: 9, enterDamage: 0, blocksVoluntaryMovement: false, impassable: true },
        ]
      }
      return state
    }
    // A walker is penned in by the ring; a jumper clears it.
    expect(boss(fire(walled(), movingBeat({ move_tiles: 2, standoff_tiles: 1 })).state).coords).toEqual(bossCoords)
    const leapt = fire(walled(), movingBeat({ move_tiles: 2, standoff_tiles: 1, traversal: 'jump' as const })).state
    expect(hexDistance(boss(leapt).coords, bossCoords)).toBe(2)
    // It cleared the ring rather than landing in it: the landing still has to
    // be ground it could stand on.
    expect(neighbors(leapt.board.hexes, bossCoords).some((coords) => hexDistance(coords, boss(leapt).coords) === 0)).toBe(false)
  })

  it('teleports into reach from anywhere, spending no allowance to do it', () => {
    const state = apart()
    const heroCoords = state.board.entities[state.primaryHeroId].coords
    const appeared = fire(state, movingBeat({ move_tiles: 0, standoff_tiles: 1, traversal: 'teleport' as const })).state
    expect(hexDistance(boss(appeared).coords, heroCoords)).toBe(1)
  })

  it('pays Hazard entry for every hex a walk crosses, and only for the landing on a jump', () => {
    // Where the two kinds actually come apart, stated as the bill rather than
    // as the route: a walker crosses the ground, a jumper clears it.
    const burn = (traversal: 'walk' | 'jump') => {
      const state = apart()
      for (const key of Object.keys(state.board.hexes)) {
        state.board.hazards[key] = [
          { id: 'coals', title: 'Coals', remainingRounds: 9, enterDamage: 1, blocksVoluntaryMovement: false, damagesSourceTeam: true, sourceTeam: 'enemy' },
        ]
      }
      return fire(state, movingBeat({ move_tiles: 3, standoff_tiles: 1, traversal })).state
    }
    const bossMaxHealth = boss(start()).maxHealth
    // A walker pays a hex at a time all the way in: the distance it had to
    // close, which is where it started minus the reach it stops at.
    const crossed = hexDistance(boss(apart()).coords, apart().board.entities[apart().primaryHeroId].coords) - 1
    expect(crossed).toBeGreaterThan(1)
    expect(bossMaxHealth - boss(burn('walk')).health).toBe(crossed)
    // A jumper pays once, for the hex it comes down on.
    expect(bossMaxHealth - boss(burn('jump')).health).toBe(1)
  })

  it('lets one Beat move and then hit, measured from where the move ended', () => {
    // The Gloomhaven monster-card shape: "Move 2, Attack 3" as one Beat with
    // one telegraph, rather than two Beats a Program has to keep in order.
    // Resolving the claw from the pre-move hex is the bug the ordering exists
    // to prevent — it would close the distance and swing at where it had been.
    const claw = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'targeted_hit')!
    const state = apart()
    const heroBefore = hero(state).health
    // Out of reach standing still: the claw alone lands nothing.
    expect(fire(state, claw).facts.some((fact) => fact.kind === 'damage')).toBe(false)
    // The same claw carrying a movement clause closes and connects.
    const lunge = { ...claw, move_tiles: 8, traversal: 'walk' as const }
    const landed = fire(state, lunge)
    expect(landed.facts.map((fact) => fact.kind)).toContain('traverse_piece')
    expect(hero(landed.state).health).toBeLessThan(heroBefore)
  })
})
describe('One movement rule for every piece (D-072)', () => {
  // The three places the reach-and-traversal rule was still leaking after
  // D-073 and D-074 closed it for Cards and Boss Beats.

  it('reads a Minion\'s bite reach off its content, not off a literal', () => {
    // It was `currentDistance <= 1` in the creep. A Whelp that bites at 2 was
    // unauthorable, which made every future Minion the same Minion.
    expect(catalog.minions.whelp.range_tiles).toBeGreaterThan(0)
    const reachy = structuredClone(catalog)
    reachy.minions.whelp.range_tiles = 2

    // Two hexes out: out of reach on the shipped Whelp, in reach on the variant.
    const state = stepPhases(immortalHero(startBroodSecond()), 9).state
    const whelp = Object.values(state.board.entities).find((entity) => entity.kind === 'minion')!
    const heroCoords = state.board.entities[state.primaryHeroId].coords
    const twoOut = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .find((coords) => hexDistance(coords, heroCoords) === 2 && !getEntityIdAt(state.board, coords))!
    state.board.entities[whelp.id].coords = twoOut

    expect(minionIntent(catalog, state, whelp.id)?.damage).toBe(0)
    expect(minionIntent(reachy, state, whelp.id)?.damage).toBeGreaterThan(0)
  })

  it('walks a Minion the way it walks the Boss, around what is in the way', () => {
    // The creep was this module's own rule — first neighbour in board order,
    // stopping dead against anything occupied — which is exactly what D-074
    // replaced for the Boss.
    const state = stepPhases(immortalHero(startBroodSecond()), 9).state
    const whelp = Object.values(state.board.entities).find((entity) => entity.kind === 'minion')!
    const heroCoords = state.board.entities[state.primaryHeroId].coords
    const threeOut = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .find((coords) => hexDistance(coords, heroCoords) === 2 && !getEntityIdAt(state.board, coords))!
    state.board.entities[whelp.id].coords = threeOut

    const route = minionIntent(catalog, state, whelp.id)!.route
    expect(route).toHaveLength(1)
    // Wall off the whole ring with ground authored impassable, and the creep
    // has nowhere to go — the authored terrain a Minion used to ignore
    // outright ("Scorched is Embermaw's element", in engine code).
    for (const coords of neighbors(state.board.hexes, threeOut)) {
      state.board.hazards[hexKey(coords)] = [
        { id: 'wall', title: 'Wall', remainingRounds: 9, enterDamage: 0, blocksVoluntaryMovement: false, impassable: true },
      ]
    }
    expect(minionIntent(catalog, state, whelp.id)!.route).toEqual([])
  })

  it('refuses a shove onto ground a walker would route around', () => {
    // A displacement is deliberately dumber than a traversal, but "impassable"
    // must not mean "impassable unless pushed" — that would make Drive Back the
    // one way onto ground the arena has taken away.
    const state = immortalHero(start())
    const heroCoords = state.board.entities[state.primaryHeroId].coords
    const bossCoords = boss(state).coords
    // Ring the Boss with ground authored impassable, so the shove is blocked
    // whichever edge it re-aims along.
    expect(hexDistance(bossCoords, heroCoords)).toBeGreaterThan(0)
    for (const coords of neighbors(state.board.hexes, bossCoords)) {
      state.board.hazards[hexKey(coords)] = [
        { id: 'wall', title: 'Wall', remainingRounds: 9, enterDamage: 0, blocksVoluntaryMovement: false, impassable: true },
      ]
    }
    const shoved = resolve(catalog, state, {
      kind: 'displace_piece',
      sourceId: state.primaryHeroId,
      targetId: state.bossId,
      distance: 1,
      movement: 'push',
      reasonText: 'test',
    })
    expect(shoved.facts[0].resolutionFact).toMatchObject({ actual_distance: 0, stop_reason: 'blocked' })
    expect(boss(shoved.state).coords).toEqual(bossCoords)
  })

  it('stops a Minion where it wants to stand rather than walking it onto the Hero', () => {
    // The shared rule has to be shared with the Minion's *own* numbers. A
    // Whelp standing off at 2 should halt two hexes out and bite from there;
    // running it in to melee would be the Boss's numbers deciding a Minion's
    // business.
    const reachy = structuredClone(catalog)
    reachy.minions.whelp.range_tiles = 2
    reachy.minions.whelp.standoff_tiles = 2
    reachy.minions.whelp.move_tiles = 3

    const state = stepPhases(immortalHero(startBroodSecond()), 9).state
    const whelp = Object.values(state.board.entities).find((entity) => entity.kind === 'minion')!
    // Both pieces on opposite rims, so there is room for the walk to overshoot
    // its reach if it is going to.
    const hexes = Object.keys(state.board.hexes).map(parseHexKey)
    const [heroCoords, far] = hexes
      .flatMap((left) => hexes.map((right) => [left, right] as const))
      .filter(([left, right]) => getEntityIdAt(state.board, left) === '' && getEntityIdAt(state.board, right) === '')
      .sort(([leftA, rightA], [leftB, rightB]) => hexDistance(leftB, rightB) - hexDistance(leftA, rightA))[0]
    expect(hexDistance(far, heroCoords)).toBeGreaterThan(3)
    state.board.entities[state.primaryHeroId].coords = heroCoords
    state.board.entities[whelp.id].coords = far

    const route = minionIntent(reachy, state, whelp.id)!.route
    expect(route.length).toBeGreaterThan(0)
    expect(hexDistance(route.at(-1)!, heroCoords)).toBe(reachy.minions.whelp.standoff_tiles)

    // And the Minion half of D-079: the same bite reach, one hex closer a
    // standoff, and the creep spends the allowance it was holding back. Before
    // the split these were one number and this Minion could not be authored.
    const eager = structuredClone(reachy)
    eager.minions.whelp.standoff_tiles = 1
    const closer = minionIntent(eager, state, whelp.id)!.route
    expect(hexDistance(closer.at(-1)!, heroCoords)).toBe(hexDistance(route.at(-1)!, heroCoords) - 1)
  })

  it('aims a moving cone from the facing the move left it in', () => {
    // The half of the facing rule the Beat side reads. A cone is drawn from
    // `bossFacing`, so a Beat that moves and then breathes has to read the
    // facing the move produced — reading the pre-move one points the cone
    // wherever it happened to be looking.
    const cone = catalog.programs.embermaw_hunt.incoming_beats.find((beat) => beat.kind === 'forward_cone')!
    const state = immortalHero(start())
    const bossCoords = boss(state).coords
    const away = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .filter((coords) => !getEntityIdAt(state.board, coords))
      .sort((left, right) => hexDistance(right, bossCoords) - hexDistance(left, bossCoords))[0]
    state.board.entities[state.primaryHeroId].coords = away
    // Facing the opposite way, so a stale read cannot reach the Hero.
    boss(state).facing = normalizeFacing(facingToward(bossCoords, away, 0) + 3)

    const still = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: cone, track: 'instant' })
    expect(still.facts.some((fact) => fact.kind === 'damage')).toBe(false)

    // The same cone carrying a movement clause turns as it closes, and lands.
    // Resolved on the Instant Row, because that is the only Row a Movement
    // Clause may be authored on (D-075) — the shape is a cone Beat that closes
    // before it breathes, not a telegraphed one.
    const lunging = { ...cone, move_tiles: 8, standoff_tiles: cone.range_tiles }
    const swept = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: lunging, track: 'instant' })
    expect(swept.facts.some((fact) => fact.kind === 'damage')).toBe(true)
  })

  it('leaves a traversing piece facing the way it went', () => {
    // Without this a Beat that moves and then hits draws its cone and its
    // Guarded Front from the way it was looking before it moved.
    const advance = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'advance_toward_player')!
    const state = immortalHero(start())
    const bossCoords = boss(state).coords
    const furthest = Object.keys(state.board.hexes)
      .map(parseHexKey)
      .sort((left, right) => hexDistance(right, bossCoords) - hexDistance(left, bossCoords))[0]
    state.board.entities[state.primaryHeroId].coords = furthest
    // Point the Boss the wrong way first, so a stale facing is visible.
    boss(state).facing = normalizeFacing(facingToward(bossCoords, furthest, 0) + 3)
    const facingBefore = boss(state).facing

    const moved = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: { ...advance, move_tiles: 1 }, track: 'instant' })
    expect(boss(moved.state).facing).not.toBe(facingBefore)
    // It faces the leg it travelled, which on a walk toward the Hero is toward
    // the Hero.
    expect(boss(moved.state).facing).toBe(facingToward(bossCoords, furthest, facingBefore))
  })
})
describe('Nothing arrives where nothing can stand (D-075)', () => {
  it('keeps every authored spawn candidate off ground the Encounter itself burns', () => {
    // The content half. Embermaw authored two of its five candidates on hexes
    // its own Escalation Thresholds scorch, so past Ashen Verge the brood was
    // arriving on ground the rules say nothing can stand on — and because
    // candidates are taken in authored order, those two were the *first* two.
    // Stated over the whole catalog rather than over Embermaw, so the next
    // Encounter cannot reintroduce it.
    for (const encounter of Object.values(catalog.encounters)) {
      const burnt = new Set(
        encounter.escalation_thresholds.flatMap((threshold) => threshold.scorch_hexes.map((coords) => hexKey(coords))),
      )
      const overlap = encounter.minion_spawn_candidates.filter((coords) => burnt.has(hexKey(coords)))
      expect(overlap.map(hexKey), `${encounter.id} spawns onto ground it burns`).toEqual([])
    }
  })

  it('stops a Hero paid step on impassable ground, not only an Enemy route', () => {
    // The axis is physics versus choice, not Hero versus Enemy (D-075). Under
    // the old framing, ground authored impassable stopped a Whelp and Embermaw
    // and let the Tank stroll through it, which is the rule reading as a bug
    // the first time anybody authors a wall.
    const state = start()
    const heroCoords = state.board.entities[state.primaryHeroId].coords
    const step = neighbors(state.board.hexes, heroCoords).find((coords) => isLegalMove(state.board, state.primaryHeroId, coords))!
    expect(isLegalMove(state.board, state.primaryHeroId, step)).toBe(true)

    state.board.hazards[hexKey(step)] = [
      { id: 'wall', title: 'Wall', remainingRounds: 9, enterDamage: 0, blocksVoluntaryMovement: false, impassable: true },
    ]
    expect(isLegalMove(state.board, state.primaryHeroId, step)).toBe(false)
    // And the same hex answers the other question separately: ground a Hero
    // merely declines to enter is still ground a shove can put them on.
    state.board.hazards[hexKey(step)] = [
      { id: 'coals', title: 'Coals', remainingRounds: 9, enterDamage: 1, blocksVoluntaryMovement: true, impassable: false },
    ]
    expect(isLegalMove(state.board, state.primaryHeroId, step)).toBe(false)
    expect(isLegalMove(state.board, state.primaryHeroId, step, 1, false)).toBe(true)
  })

  it('skips impassable ground when a Beat calls its brood, and telegraphs the hexes it will really use', () => {
    // The engine half, which is what makes the content half unauthorable
    // rather than merely fixed. Arriving is not moving, so the movement rules
    // never saw this one.
    const state = startBroodSecond()
    const call = catalog.programs.embermaw_brood.incoming_beats.find((beat) => beat.kind === 'spawn_minions')!
    const firstChoice = state.spawnCandidates[0]
    state.board.hazards[hexKey(firstChoice)] = [
      { id: 'burnt', title: 'Burnt', remainingRounds: 9, enterDamage: 0, blocksVoluntaryMovement: false, impassable: true },
    ]
    const called = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: call, track: 'incoming' })
    const arrived = called.facts.filter((fact) => fact.kind === 'spawn_minion' && fact.succeeded)
    expect(arrived.length).toBeGreaterThan(0)
    for (const fact of arrived) {
      expect(hexKey(fact.detail.coords as { q: number; r: number })).not.toBe(hexKey(firstChoice))
    }
    // And the telegraph agrees, because both now pick through one helper — it
    // used to hand-roll its own occupancy test, which is two copies of a rule
    // only one of which would have grown this clause.
    const telegraphed = stepPhases(state, 2).state
    expect(Object.entries(telegraphed.telegraphs).filter(([, kind]) => kind === 'spawn').map(([key]) => key)).not.toContain(hexKey(firstChoice))
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
describe('forced movement cards', () => {
  function withDisplacementCard(patch: Record<string, unknown>) {
    const variant = structuredClone(catalog)
    variant.cards.shove_test = {
      ...variant.cards.sweeping_blow,
      id: 'shove_test',
      title: 'Shove Test',
      damage: 0,
      range_tiles: 2,
      push_tiles: 0,
      pull_tiles: 0,
      ...patch,
    }
    return variant
  }

  function readyToFire(variant: ReturnType<typeof withDisplacementCard>, targetCoords: { q: number; r: number }) {
    let state = start()
    state = resolve(variant, state, {
      kind: 'spawn_minion',
      sourceId: state.bossId,
      minionId: 'shove_target',
      coords: targetCoords,
      minionContentId: 'ember_whelp',
    }).state
    state.phase = 'quick'
    hero(state).actionBar[0] = {
      topCard: card('shove', 'shove_test'),
      charges: [card('charge', 'iron_guard')],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
    return state
  }

  it('pushes a piece away from the firing Hero one hex at a time', () => {
    const variant = withDisplacementCard({ push_tiles: 1 })
    const state = readyToFire(variant, { q: -1, r: 0 })
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'shove_target',
    })
    expect(fired.facts[0].succeeded).toBe(true)
    expect(fired.state.board.entities.shove_target.coords).toEqual({ q: -2, r: 0 })
    expect(fired.facts.find((fact) => fact.kind === 'displace_piece')?.resolutionFact).toMatchObject({
      from: { q: -1, r: 0 },
      to: { q: -2, r: 0 },
      requested_distance: 1,
      actual_distance: 1,
      stop_reason: 'complete',
    })
  })

  it('requires a piece target within the Card range', () => {
    const variant = withDisplacementCard({ range_tiles: 1, push_tiles: 1 })
    const state = readyToFire(variant, { q: -2, r: 0 })
    expect(legality(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })).toMatchObject({
      legal: false,
      reason: 'The Top Card needs another piece target.',
    })
    expect(
      legality(variant, state, {
        kind: 'fire_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        targetId: 'shove_target',
      }),
    ).toMatchObject({ legal: false, reason: "The chosen piece is outside the Top Card's range.", targetRange: 2 })
  })

  it('still enforces an enemy Status target when the same Card displaces', () => {
    const variant = withDisplacementCard({ push_tiles: 1, places_counter: 'sundered' })
    const state = readyToFire(variant, { q: -2, r: 0 })
    state.board.entities.ally = {
      id: 'ally',
      kind: 'hero',
      coords: { q: -1, r: 0 },
      health: 10,
      maxHealth: 10,
      facing: 3,
      team: 'party',
      title: 'Ally',
    }
    expect(
      legality(variant, state, {
        kind: 'fire_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        targetId: 'ally',
      }),
    ).toMatchObject({ legal: false, reason: 'The Top Card needs an Enemy target.' })
  })

  it('pulls a piece toward the Hero and stops one hex short', () => {
    const variant = withDisplacementCard({ pull_tiles: 3 })
    const state = readyToFire(variant, { q: -2, r: 0 })
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'shove_target',
    })
    expect(fired.state.board.entities.shove_target.coords).toEqual({ q: -1, r: 0 })
    expect(fired.facts.find((fact) => fact.kind === 'displace_piece')?.resolutionFact).toMatchObject({
      requested_distance: 3,
      actual_distance: 1,
      stop_reason: 'occupied',
    })
  })

  it('stops a push at the board edge and records the partial distance', () => {
    const variant = withDisplacementCard({ push_tiles: 3 })
    const state = readyToFire(variant, { q: -1, r: 0 })
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'shove_target',
    })
    expect(fired.state.board.entities.shove_target.coords).toEqual({ q: -2, r: 0 })
    expect(fired.facts.find((fact) => fact.kind === 'displace_piece')?.resolutionFact).toMatchObject({
      requested_distance: 3,
      actual_distance: 1,
      stop_reason: 'edge',
    })
  })

  it('treats a fully occupied push as a successful zero-distance displacement', () => {
    const variant = withDisplacementCard({ push_tiles: 2 })
    let state = readyToFire(variant, { q: -1, r: 0 })
    state = resolve(variant, state, {
      kind: 'spawn_minion',
      sourceId: state.bossId,
      minionId: 'blocker',
      coords: { q: -2, r: 0 },
      minionContentId: 'ember_whelp',
    }).state
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'shove_target',
    })
    const displacement = fired.facts.find((fact) => fact.kind === 'displace_piece')
    expect(displacement).toMatchObject({ succeeded: true })
    expect(displacement?.resolutionFact).toMatchObject({ actual_distance: 0, stop_reason: 'occupied' })
    expect(fired.state.board.entities.shove_target.coords).toEqual({ q: -1, r: 0 })
  })

  it('applies enter damage from a Hazard on the destination hex', () => {
    const variant = withDisplacementCard({ push_tiles: 1 })
    let state = readyToFire(variant, { q: -1, r: 0 })
    state = resolve(variant, state, {
      kind: 'apply_hazard',
      // Party-laid, because the shove target is a Minion and an Enemy is immune
      // to its own side's ground (D-042). A Boss-laid Hazard here would test the
      // immunity rather than the entry-damage rule this case is about.
      sourceId: state.primaryHeroId,
      coords: { q: -2, r: 0 },
      hazardId: 'scorched',
      fallbackDurationRounds: 1,
    }).state
    const healthBefore = state.board.entities.shove_target.health
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'shove_target',
    })
    expect(fired.state.board.entities.shove_target.health).toBe(healthBefore - 1)
    expect(fired.facts.some((fact) => fact.kind === 'damage' && fact.sourceId === 'hazard')).toBe(true)
  })

  it('resolves damage before push so a defeated Minion is never displaced', () => {
    const variant = withDisplacementCard({ damage: 2, push_tiles: 2 })
    const state = readyToFire(variant, { q: -1, r: 0 })
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'shove_target',
    })
    expect(fired.state.board.entities.shove_target).toBeUndefined()
    expect(fired.facts.map((fact) => fact.kind).slice(1, 3)).toEqual(['damage', 'displace_piece'])
    expect(fired.facts.find((fact) => fact.kind === 'displace_piece')).toMatchObject({
      succeeded: false,
      reason: 'The displacement target is unavailable.',
    })
  })
})
