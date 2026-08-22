import { describe, expect, it } from 'vitest'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import {
  advancePhase,
  hexKey,
        } from '@/engine'

import { catalog, start, hero, boss, immortalHero, startBroodSecond, stepPhases } from './testkit'

describe('encounter setup', () => {
  it('creates the seeded initial state', () => {
    const state = start()
    expect(state.phase).toBe('loadout')
    expect(state.round).toBe(1)
    expect(state.active).toBe(true)
    expect(hero(state).hand).toHaveLength(4)
    expect(hero(state).deck).toHaveLength(16)
    // Two replaceable Slots plus the Signature Slot (D-064): installed at
    // setup with the Hero's fixed card, uncharged, never in the deck.
    expect(hero(state).actionBar).toHaveLength(3)
    const signature = hero(state).actionBar[2]
    expect(signature.fixed).toBe(true)
    expect(signature.topCard?.cardId).toBe('elian_riposte')
    expect(signature.earnedCharges).toBe(0)
    expect(hero(state).deck.concat(hero(state).hand).every((card) => card.cardId !== 'elian_riposte')).toBe(true)
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
    expect(beatFacts.map((fact) => fact.detail.beatId)).toEqual(['turn_to_tank', 'close_the_gap', 'raking_claw', 'claw_scorch'])
    expect(beatFacts.every((fact) => fact.phase === 'instant')).toBe(true)
    expect(hero(state).health).toBe(30)
    const clawFact = instant.facts.find((fact) => fact.kind === 'damage')
    expect(clawFact?.resolutionFact).toMatchObject({
      requested: 4,
      prevented: 0,
      health_loss: 4,
      damage_keywords: ['tank_hit'],
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
    // The cone's Scorch expires with the Round; the Ash Trail does not. The
    // Hero took the claw on the chin here, so the ash burnt the hex they were
    // standing on, permanently (D-039).
    expect(Object.keys(state.board.hazards)).toEqual([hexKey({ q: 0, r: 0 })])
    expect(state.board.hazards[hexKey({ q: 0, r: 0 })][0].permanent).toBe(true)
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
