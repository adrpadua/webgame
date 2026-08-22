import { describe, expect, it } from 'vitest'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import { escalationActionsForRoundEnd } from './escalation'
import {
  advancePhase,
  buildCatalog,
  createEncounterState,
  hexDistance,
  hexKey,
  isGuardedFront,
  guardedFrontHex,
  neighbors,
  resolve,
    type EncounterState,
    } from '@/engine'

import { catalog, start, hero, boss, stepPhases } from './testkit'

describe('Ash Trail displacement (D-039)', () => {
  // Round 1 is Hunt Pattern on every seed, and Hunt is the program that pairs a
  // targeted hit with `hazard_last_impact`.
  function throughInstant(state: EncounterState): EncounterState {
    return advancePhase(catalog, state).state
  }

  it('burns the hex the Tank stood on when the hit drew blood', () => {
    const state = throughInstant(start())
    const heroKey = hexKey({ q: 0, r: 0 })
    expect(hero(state).health).toBeLessThan(hero(state).maxHealth)
    expect(state.board.hazards[heroKey]?.[0]?.permanent).toBe(true)
  })

  it('spills behind the Tank when the hit was fully absorbed', () => {
    // Enough Armor to eat the claw whole while holding the Guarded Front.
    const armored = start()
    armored.heroes[armored.primaryHeroId].armor = 20
    const state = throughInstant(armored)
    expect(hero(state).health).toBe(hero(state).maxHealth)

    const heroCoords = state.board.entities[state.primaryHeroId].coords
    const bossCoords = state.board.entities[state.bossId].coords
    const burnt = Object.keys(state.board.hazards)
    expect(burnt).not.toContain(hexKey(heroCoords))
    expect(burnt).toHaveLength(1)
    // Behind means further from the Boss, which is the whole point: the ground
    // the Tank has to keep standing on to keep absorbing survives longer.
    const [q, r] = burnt[0].split(',').map(Number)
    expect(hexDistance({ q, r }, bossCoords)).toBeGreaterThan(hexDistance(heroCoords, bossCoords))
  })

  it('costs the same number of hexes either way', () => {
    // The invariant that keeps this honest against Tank Principle 1. If a clean
    // absorb ever burnt fewer hexes than a sloppy one, perfect play would stop
    // the bleed rather than slow it, and the arena would stop closing for a
    // good Tank — sustain creep in a new denomination.
    const sloppy = throughInstant(start())
    const clean = start()
    clean.heroes[clean.primaryHeroId].armor = 20
    const absorbed = throughInstant(clean)
    expect(Object.keys(absorbed.board.hazards)).toHaveLength(Object.keys(sloppy.board.hazards).length)
  })

  it('burns under the Tank anyway with nowhere left to spill', () => {
    // Backed against the rim, absorbing cleanly buys nothing. The bleed refuses
    // to stop even for perfect play, which is the rule stated as geometry.
    //
    // The Boss is placed against the same corner rather than left at its start.
    // Since D-062 the claw reaches one hex, so a Tank in the far corner is a
    // Tank the Beat never touches — and a Beat that misses lays no Trail at
    // all, which would pass this assertion for the wrong reason.
    const state = start()
    const heroId = state.primaryHeroId
    const rim = { q: -2, r: 2 }
    state.board.entities[heroId].coords = { ...rim }
    state.board.entities[state.bossId].coords = { q: -1, r: 1 }
    state.heroes[heroId].armor = 20
    const after = throughInstant(state)
    expect(hero(after).health).toBe(hero(after).maxHealth)
    // Either it spilled to a real hex further out, or it burnt the rim itself —
    // never nothing.
    expect(Object.keys(after.board.hazards).length).toBeGreaterThan(0)
  })

  it('does not count a hit absorbed away from the Guarded Front as absorbed', () => {
    // The displacement is what holding the front buys. Armor alone must not buy
    // it, or the Tank can stand anywhere, soak a blow, and still move the Trail
    // — which is the reward without the position that earns it. The predicate
    // is zero Health loss *there*; both halves are load-bearing.
    //
    // The other three tests in this suite all keep the Hero on the front, so
    // dropping the `guardedFront` half of the predicate left every one of them
    // passing. This is the case that separates the halves.
    //
    // The predicate is reached only by damage carrying the `Tank Hit` Keyword,
    // and the claw is the only Beat that carries it — so the case has to be
    // built from the claw rather than from the cone, which never gets there.
    //
    // The Boss is deliberately left facing where it started instead of being
    // walked through `turn_toward_player`. Since D-062 that ordering is what
    // makes the case unreachable in Embermaw's live content: the turn snaps the
    // facing onto the Tank, and a snapped facing puts every hex in a reach-1
    // claw's range *on* the Guarded Front. The engine rule is still general — a
    // Boss whose claw reaches two, or that claws without turning first, lands
    // exactly this hit — so it stays guarded here rather than deleted with the
    // content that used to produce it.
    const hunt = catalog.programs.embermaw_hunt
    const claw = hunt.instant_beats.find((beat) => beat.kind === 'targeted_hit')!
    const trail = hunt.instant_beats.find((beat) => beat.kind === 'hazard_last_impact')!

    const state = start()
    const bossCoords = state.board.entities[state.bossId].coords
    const front = guardedFrontHex(state.board, state.bossId)!
    // In the claw's reach, off the front, and with ground further out — so the
    // assertion discriminates rather than falling back to the rim case above.
    const stood = neighbors(state.board.hexes, bossCoords).find(
      (coords) =>
        hexKey(coords) !== hexKey(front) &&
        neighbors(state.board.hexes, coords).some((out) => hexDistance(out, bossCoords) > hexDistance(coords, bossCoords)),
    )!
    state.board.entities[state.primaryHeroId].coords = { ...stood }
    // More than the claw deals, so Health never moves.
    state.heroes[state.primaryHeroId].armor = 20
    const hit = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    expect(hero(hit.state).health).toBe(hero(hit.state).maxHealth)
    expect(isGuardedFront(hit.state.board, hit.state.bossId, hit.state.primaryHeroId)).toBe(false)
    expect(hit.facts.find((fact) => fact.kind === 'damage')?.resolutionFact).toMatchObject({ guarded_front: false, health_loss: 0 })

    // Burnt under them, not spilled behind them. Read off the Trail's own
    // generated Hazard rather than the board, so a key with nothing under it
    // cannot satisfy the assertion while the ground stays clear.
    const scorch = resolve(catalog, hit.state, { kind: 'resolve_boss', sourceId: hit.state.bossId, beat: trail, track: 'instant' })
    expect(scorch.facts.filter((fact) => fact.kind === 'apply_hazard').map((fact) => fact.detail.coords)).toEqual([stood])
  })
})

// D-041. Escalation acceleration is only legitimate if the Timeline showed the
// demand: ADR 0027 requires a Beat that can add Escalation to disclose it. A
// demand priced from the whole pool violates that on any Round whose program
// does not carry the Beat.
describe('Authored Beat reach', () => {
  // Round 1 is Hunt Pattern on every seed, and Hunt's Incoming Row is a cone.
  const TO_QUICK = 2

  // Round-trip a built catalog back through the loader, so a content rule can
  // be tested by editing content rather than by hand-assembling payloads.
  function rebuild(source: typeof catalog) {
    return buildCatalog({
      cards: Object.values(source.cards),
      heroes: Object.values(source.heroes),
      bosses: Object.values(source.bosses),
      keywords: Object.values(source.keywords),
      chargeModifiers: Object.values(source.chargeModifiers),
      hazards: Object.values(source.hazards),
      minions: Object.values(source.minions),
      counters: Object.values(source.counters),
      programs: Object.values(source.programs),
      encounters: Object.values(source.encounters),
    })
  }

  function coneTelegraph(state: EncounterState): string[] {
    return Object.entries(state.telegraphs)
      .filter(([, kind]) => kind === 'cone')
      .map(([key]) => key)
      .sort()
  }

  function scorchedByIncoming(state: EncounterState): string[] {
    return advancePhase(catalog, state)
      .facts.filter((fact) => fact.kind === 'apply_hazard' && fact.succeeded)
      .map((fact) => hexKey((fact.detail as { coords: { q: number; r: number } }).coords))
      .sort()
  }

  it('draws the telegraph and burns the ground from the same authored number', () => {
    // The telegraph must not lie. It used to agree with the resolution by
    // coincidence — two separate literals that happened to both be 2 — so
    // either could have been edited alone. Both now read `beat.range_tiles`,
    // and this compares what the party was shown against what landed.
    const quick = stepPhases(start(), TO_QUICK).state
    expect(quick.phase).toBe('quick')
    const shown = coneTelegraph(quick)
    expect(shown.length).toBeGreaterThan(0)
    expect(scorchedByIncoming(quick)).toEqual(shown)
  })

  it('moves both of them together when the authored number changes', () => {
    // Proof the field is read rather than decorative, and that nothing kept a
    // private copy: shortening the reach has to shrink the preview and the
    // footprint alike. Against the old two-literal form this failed.
    const shortened = structuredClone(catalog)
    for (const program of Object.values(shortened.programs)) {
      for (const beat of program.incoming_beats) {
        if (beat.kind === 'forward_cone') {
          beat.range_tiles = 1
        }
      }
    }
    const full = stepPhases(start(), TO_QUICK).state
    let short = createEncounterState(shortened, 'embermaw_prototype')
    for (let step = 0; step < TO_QUICK; step += 1) {
      short = advancePhase(shortened, short).state
    }
    expect(coneTelegraph(short).length).toBeLessThan(coneTelegraph(full).length)
    expect(
      advancePhase(shortened, short)
        .facts.filter((fact) => fact.kind === 'apply_hazard' && fact.succeeded).length,
    ).toBeLessThan(scorchedByIncoming(full).length)
  })

  it('asks the proximity demand at the authored distance', () => {
    // The companion to D-041's adjacency guard, which pins what the authored
    // `1` means. This pins that the number is the one being read: widen the
    // demand's reach and a Hero two hexes out stops being billed.
    const widened = structuredClone(catalog)
    for (const program of Object.values(widened.programs)) {
      for (const beat of program.incoming_beats) {
        if (beat.kind === 'demand_proximity') {
          beat.range_tiles = 2
        }
      }
    }
    const state = start()
    state.currentProgramId = 'embermaw_brood'
    state.board.entities[state.primaryHeroId].coords = { q: -1, r: 1 }
    expect(hexDistance({ q: -1, r: 1 }, boss(state).coords)).toBe(2)
    const reasons = (source: typeof catalog) =>
      escalationActionsForRoundEnd(source, state)
        .filter((action) => action.kind === 'gain_escalation')
        .map((action) => action.reason)
    expect(reasons(catalog)).toContain('unanswered_proximity')
    expect(reasons(widened)).not.toContain('unanswered_proximity')
  })

  it('refuses content that asks a distance question without answering it', () => {
    const missing = structuredClone(catalog)
    const beat = missing.programs.embermaw_hunt.incoming_beats.find((entry) => entry.kind === 'forward_cone')!
    beat.range_tiles = 0
    expect(() => rebuild(missing)).toThrow(/authors no range_tiles/)
  })

  it('refuses priced Beats of one kind that ask different questions', () => {
    // The Round-end step prices one demand per kind — the dearest priced Beat
    // in the pool, asking *its* question — so two priced Beats of a kind that
    // disagree mean one of them is authored with a price and silently never
    // billed. Both halves of the rule, because the two fields fail differently:
    // a second reach bills the party at a distance the cheaper Beat never asked
    // about, and a second Counter leaves the cheaper Counter uncharged.
    const twoReaches = structuredClone(catalog)
    const proximity = twoReaches.programs.embermaw_brood.incoming_beats.find((beat) => beat.kind === 'demand_proximity')!
    proximity.range_tiles = 2
    expect(() => rebuild(twoReaches)).toThrow(/disagree on range_tiles/)

    const twoCounters = structuredClone(catalog)
    const heat = twoCounters.programs.embermaw_embers.instant_beats.find((beat) => beat.kind === 'place_counter')!
    twoCounters.counters.chill = { ...twoCounters.counters[heat.counter], id: 'chill' }
    twoCounters.programs.embermaw_hunt.instant_beats.push({ ...heat, id: 'stoke_elsewhere', counter: 'chill' })
    expect(() => rebuild(twoCounters)).toThrow(/disagree on counter/)
  })

  it('refuses a claw with no reach authored', () => {
    // Both halves of the rule reach `targeted_hit` since D-062. A claw that
    // authors nothing would fall to the schema default of `0` and silently
    // stop connecting from any hex at all — a Beat that resolves to nothing,
    // which is the shape D-054 deleted a whole Beat kind over.
    const rangeless = structuredClone(catalog)
    const claw = rangeless.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'targeted_hit')!
    claw.range_tiles = 0
    expect(() => rebuild(rangeless)).toThrow(/authors no range_tiles/)
  })

  it('still refuses a reach on a Beat kind that asks no distance question', () => {
    // The other half, on a kind that genuinely has no distance to read: a reach
    // nothing consults is a number an author can set and watch do nothing.
    const ranged = structuredClone(catalog)
    const turn = ranged.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'turn_toward_player')!
    turn.range_tiles = 2
    expect(() => rebuild(ranged)).toThrow(/must not author range_tiles/)
  })

  // Two of the three reasons a Beat needs a reach are fields rather than kinds
  // (D-074), which is why the kind list alone stopped being able to state the
  // rule.
  it('refuses a Minion that bites without saying how far, and a reach on one that never bites', () => {
    // Both halves again, on the last piece whose reach lived in engine code
    // (D-072). Nothing tested the Minion rules at all until now, which is how
    // the bite's hardcoded `1` survived two passes over the same defect.
    const mute = structuredClone(catalog)
    mute.minions.whelp.range_tiles = 0
    expect(() => rebuild(mute)).toThrow(/bites for 1 but authors no range_tiles/)

    const harmless = structuredClone(catalog)
    harmless.minions.whelp.attack_damage = 0
    expect(() => rebuild(harmless)).toThrow(/but has no attack to reach with/)

    const idle = structuredClone(catalog)
    idle.minions.whelp.attack_damage = 0
    idle.minions.whelp.range_tiles = 0
    expect(() => rebuild(idle)).toThrow(/but has no attack to close for/)

    const blink = structuredClone(catalog)
    blink.minions.whelp.traversal = 'teleport'
    expect(() => rebuild(blink)).toThrow(/teleports but authors move_tiles/)

    const grounded = structuredClone(catalog)
    grounded.minions.whelp.traversal = 'jump'
    grounded.minions.whelp.move_tiles = 0
    expect(() => rebuild(grounded)).toThrow(/authors traversal jump but no move_tiles/)
  })

  it('refuses a Minion that would creep into position and never bite (D-079)', () => {
    // The one place the two numbers are constrained against each other. A Beat
    // may stand off outside its own reach — that is a Boss keeping its distance
    // — but a Minion has exactly one behaviour, creep until you can bite, so a
    // standoff outside the bite is provably a Minion that never attacks.
    const coy = structuredClone(catalog)
    coy.minions.whelp.standoff_tiles = 2
    expect(() => rebuild(coy)).toThrow(/stops at 2 but bites at 1, so it would creep into position and never attack/)

    // And the both-or-neither halves, against the allowance rather than the
    // bite: a Minion that never travels has nowhere it is trying to stand.
    const aimless = structuredClone(catalog)
    aimless.minions.whelp.standoff_tiles = 0
    expect(() => rebuild(aimless)).toThrow(/travels but authors no standoff_tiles/)

    const rooted = structuredClone(catalog)
    rooted.minions.whelp.move_tiles = 0
    expect(() => rebuild(rooted)).toThrow(/authors standoff_tiles 1 but never travels/)
  })

  it('refuses a Beat that marks a Hero without saying how far it reaches', () => {
    const marking = structuredClone(catalog)
    const stoke = marking.programs.embermaw_embers.instant_beats.find((entry) => entry.kind === 'place_counter')!
    stoke.counter_target = 'hero'
    expect(() => rebuild(marking)).toThrow(/marking a Hero but authors no range_tiles/)
    // Aimed back at itself it measures nothing, and must not answer.
    stoke.counter_target = 'self'
    stoke.range_tiles = 1
    expect(() => rebuild(marking)).toThrow(/must not author range_tiles/)
  })

  it('refuses a movement clause on a telegraphed Incoming Beat', () => {
    // The telegraph is painted a phase before the Beat resolves and the Hero
    // moves in between, so a moving Incoming Beat paints a cone the player
    // invalidates by playing correctly — the defect ADR 0031 removed the
    // Forecast Row over. The error names the honest alternative.
    const telegraphed = structuredClone(catalog)
    const cone = telegraphed.programs.embermaw_hunt.incoming_beats.find((entry) => entry.kind === 'forward_cone')!
    cone.move_tiles = 2
    expect(() => rebuild(telegraphed)).toThrow(/carries a movement clause on the Incoming Row/)

    // A teleport spends no allowance, so it has to be caught by the clause
    // rather than by the number.
    const blinking = structuredClone(catalog)
    const blink = blinking.programs.embermaw_hunt.incoming_beats.find((entry) => entry.kind === 'forward_cone')!
    blink.traversal = 'teleport'
    expect(() => rebuild(blinking)).toThrow(/carries a movement clause on the Incoming Row/)
  })

  it('refuses a movement clause that does not say how close to get, and a standoff on a Beat that stands still', () => {
    // Both halves of D-079's both-or-neither rule. The reach cannot answer this
    // question any more, so a Beat that moves has to answer it itself.
    const moving = structuredClone(catalog)
    const claw = moving.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'targeted_hit')!
    claw.move_tiles = 2
    expect(() => rebuild(moving)).toThrow(/authors no standoff_tiles to say how close to get/)

    const still = structuredClone(catalog)
    const rooted = still.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'targeted_hit')!
    rooted.standoff_tiles = 2
    expect(() => rebuild(still)).toThrow(/authors standoff_tiles 2 but carries no movement clause/)
  })

  it('refuses a reach on the Beat whose only effect is the move', () => {
    // The tell that Reach and Standoff were one field (D-079): before the split
    // this Beat had to author a `range_tiles` to say how close to get, and an
    // `advance_toward_player` reaches nothing whatsoever. Now the reach refusal
    // that already covered every other non-reaching kind covers this one too.
    const advancing = structuredClone(catalog)
    const advance = advancing.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'advance_toward_player')!
    advance.range_tiles = 1
    expect(() => rebuild(advancing)).toThrow(/is a advance_toward_player and must not author range_tiles/)
  })

  it('refuses a traversal nothing moves, an advance with no allowance, and a teleport that spends one', () => {
    const idle = structuredClone(catalog)
    const turn = idle.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'turn_toward_player')!
    turn.traversal = 'jump'
    expect(() => rebuild(idle)).toThrow(/authors traversal jump but carries no movement clause/)

    const still = structuredClone(catalog)
    const advance = still.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'advance_toward_player')!
    advance.move_tiles = 0
    expect(() => rebuild(still)).toThrow(/authors no move_tiles/)

    // A teleport has no route to spend an allowance on — an authored one is a
    // number it never consults, and the author meant a jump.
    const blink = structuredClone(catalog)
    const hop = blink.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'advance_toward_player')!
    hop.traversal = 'teleport'
    expect(() => rebuild(blink)).toThrow(/teleports but authors move_tiles/)
  })
})

// D-042. Recorded as a latent interaction during PR #77's review and ruled on
// after: an Enemy is immune to its own side's Hazards. The rule is stated per
// Hazard rather than as "Enemies ignore Hazards", because a Hero-placed damage
// zone is exactly the card the new effect families invite and it has to keep
// working against Enemies.
describe('Raking Claw reach (D-062)', () => {
  const claw = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'targeted_hit')!

  function clawAt(coords: { q: number; r: number }) {
    const state = start()
    state.board.entities[state.primaryHeroId].coords = { ...coords }
    return resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
  }

  it('lands on a Tank inside its authored reach and on nobody further out', () => {
    // Read against the authored number rather than a literal `1`, the same
    // contract D-043 wrote for the cone: shortening or lengthening the reach in
    // `data/` has to move the hit with it, or the rules text is a decoration.
    const state = start()
    const bossCoords = state.board.entities[state.bossId].coords
    for (const key of Object.keys(state.board.hexes)) {
      const [q, r] = key.split(',').map(Number)
      const distance = hexDistance({ q, r }, bossCoords)
      if (distance === 0) {
        continue
      }
      const damage = clawAt({ q, r }).facts.find((fact) => fact.kind === 'damage')
      const inReach = distance <= claw.range_tiles
      expect(damage !== undefined, `hex ${key} at distance ${distance}`).toBe(inReach)
      if (inReach) {
        // The authored damage flat, from every hex in reach. The Boss has not
        // turned here, so some of these are off the Guarded Front — and they
        // still take exactly `damage`, because nothing is authored to make an
        // unbraced hex cost more.
        expect(damage?.resolutionFact).toMatchObject({ requested: claw.damage })
      }
    }
  })

  it('authors no unguarded bonus, because at this reach there is no unbraced hex', () => {
    // The reason the `+3` went with the reach, stated as the geometry rather
    // than as a note in the log. `turn_toward_player` snaps the Boss onto the
    // Tank before the claw resolves, and a snapped facing puts every adjacent
    // hex *on* the Guarded Front — so a bonus for standing in reach unbraced
    // would price a position the board cannot produce. It is authored content
    // that could never fire, which is what D-058 went looking for an
    // instrument to catch.
    //
    // If a later Boss authors a claw reaching past the hex it faces, the engine
    // still applies the bonus; what this pins is that Embermaw's does not
    // pretend to.
    const turn = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'turn_toward_player')!
    const state = start()
    const bossCoords = state.board.entities[state.bossId].coords
    for (const key of Object.keys(state.board.hexes)) {
      const [q, r] = key.split(',').map(Number)
      if (hexDistance({ q, r }, bossCoords) !== claw.range_tiles) {
        continue
      }
      let turned = start()
      turned.board.entities[turned.primaryHeroId].coords = { q, r }
      turned = resolve(catalog, turned, { kind: 'resolve_boss', sourceId: turned.bossId, beat: turn, track: 'instant' }).state
      expect(isGuardedFront(turned.board, turned.bossId, turned.primaryHeroId), `hex ${key} after the turn`).toBe(true)
    }
    for (const program of Object.values(catalog.programs)) {
      for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
        if (beat.kind === 'targeted_hit') {
          expect(beat.unguarded_bonus, `${beat.id} authors an unguarded bonus it can never apply`).toBe(0)
        }
      }
    }
  })

  it('lays no Ash Trail on the hex a claw could not reach', () => {
    // A miss is not an impact of zero hexes; it is no impact at all, so the
    // memory `hazard_last_impact` burns has to stay where the Boss last
    // actually connected. Without this the claw would keep writing its target's
    // hex whether or not it got there, and a Tank standing well clear would
    // watch the ground burn under them.
    const trail = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'hazard_last_impact')!
    let state = start()
    const struck = { ...state.board.entities[state.primaryHeroId].coords }
    state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' }).state
    expect(state.previousImpactedHexes).toEqual([struck])

    const away = { q: -2, r: 2 }
    state.board.entities[state.primaryHeroId].coords = { ...away }
    const missed = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    state = missed.state
    expect(missed.facts.some((fact) => fact.kind === 'damage')).toBe(false)
    expect(state.previousImpactedHexes).toEqual([struck])

    const scorch = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: trail, track: 'instant' })
    expect(scorch.facts.filter((fact) => fact.kind === 'apply_hazard').map((fact) => fact.detail.coords)).toEqual([struck])
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
