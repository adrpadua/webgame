import { describe, expect, it } from 'vitest'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import {
  advancePhase,
  combatantRef,
  legality,
  resolve,
    type EncounterState,
    } from '@/engine'

import { catalog, start, hero, boss, immortalHero, startBroodSecond, stepPhases } from './testkit'

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
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_keywords: ['tank_hit'] },
    })
    expect(result.facts[0].resolutionFact).toMatchObject({
      requested: 4,
      prevented: 3,
      health_loss: 1,
      target_available: true,
    })
    // The refusal and its reason ride the raise record (D-087), one grant
    // entry per Grant that heard the blow — never a singular field.
    expect(result.facts[0].detail.subscriber_matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'grant', id: 'elian_riposte', outcome: 'not_granted', reason: 'health_lost', charges: 0 }),
      ]),
    )
    expect(result.state.heroes[state.primaryHeroId].health).toBe(33)
    expect(result.state.heroes[state.primaryHeroId].armor).toBe(0)
  })

  // The zero-loss guarded-front Tank Hit. Every Signature test earns its
  // Charges this way — through the standing clause, never by writing to the
  // Slot — because earned-only is the rule under test (D-064).
  function absorbTankHit(state: EncounterState): EncounterState {
    hero(state).armor = Math.max(hero(state).armor, 5)
    return resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_keywords: ['tank_hit'] },
    }).state
  }

  it('grants a Signature Charge on a fully blocked Tank Hit at the Guarded Front (D-064)', () => {
    let state = start()
    hero(state).armor = 5
    const hit = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_keywords: ['tank_hit'] },
    })
    state = hit.state
    expect(hit.facts[0].resolutionFact).toMatchObject({
      health_loss: 0,
      guarded_front: true,
    })
    expect(hit.facts[0].detail.subscriber_matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'grant', id: 'elian_riposte', outcome: 'charge_granted', reason: 'standing_clause', charges: 1 }),
      ]),
    )
    expect(hero(state).actionBar[2].earnedCharges).toBe(1)
    // No Counter is involved any more: the Charge Stack IS the riposte count.
    expect(state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)

    // Firing at one Charge: 3 base + 2 payback, stack spent, Top Card stays.
    state.phase = 'quick'
    const bossHealthBefore = boss(state).health
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 2 })
    state = fired.state
    expect(boss(state).health).toBe(bossHealthBefore - 5)
    expect(hero(state).actionBar[2].earnedCharges).toBe(0)
    expect(hero(state).actionBar[2].topCard?.cardId).toBe('elian_riposte')
    expect(hero(state).actionBar[2].activatedWindow).toBe('quick')
    // One Charge is short of the cap, so no Sundered rider.
    expect(state.counters[combatantRef(state.bossId)] ?? []).toHaveLength(0)
  })

  it('banks to the cap and the full-bank fire Sunders the Boss after its own damage (D-064 decision 13)', () => {
    let state = start()
    state = absorbTankHit(state)
    state = absorbTankHit(state)
    expect(hero(state).actionBar[2].earnedCharges).toBe(2)

    state.phase = 'quick'
    const bossHealthBefore = boss(state).health
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 2 })
    state = fired.state
    // 2 base + 3 per Charge = 8 — and exactly 8: the rider lands after the
    // Riposte's own damage, so its own hit never benefits from Sundered.
    // D-101 moved the value off the base and onto the Charge for this reason:
    // at the old `3 + 2` a full bank paid 7 where two single-Charge fires paid
    // 10, so the bank the card is built around was the worse line.
    expect(boss(state).health).toBe(bossHealthBefore - 8)
    expect(state.counters[combatantRef(state.bossId)]?.[0]).toMatchObject({ id: 'sundered', count: 1 })
    expect(hero(state).actionBar[2].earnedCharges).toBe(0)
    // A follow-up hit lands through the wound: +1 from Sundered's Reader.
    const followUp = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: state.bossId,
      amount: 2,
      reasonText: 'Steady Strike',
    })
    expect(followUp.facts[0].resolutionFact).toMatchObject({ health_loss: 3 })
  })

  it('wastes the earn when the standing clause triggers at the cap (D-064)', () => {
    let state = start()
    state = absorbTankHit(state)
    state = absorbTankHit(state)
    expect(hero(state).actionBar[2].earnedCharges).toBe(2)
    hero(state).armor = 5
    const third = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { damage_keywords: ['tank_hit'] },
    })
    expect(third.facts[0].detail.subscriber_matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'grant', id: 'elian_riposte', outcome: 'wasted', reason: 'at_max', charges: 2 }),
      ]),
    )
    expect(hero(third.state).actionBar[2].earnedCharges).toBe(2)
  })

  it('banks earned Charges across Rounds with no expiry (D-064)', () => {
    let state = start()
    state = absorbTankHit(state)
    expect(hero(state).actionBar[2].earnedCharges).toBe(1)
    // A full Round passes: Quick and Slow close, the Round wraps, the next
    // Loadout opens. Under D-015 the unconsumed riposte evaporated at the
    // Quick Window's end; the banked Charge is the cure for exactly that.
    state = immortalHero(state)
    state = stepPhases(state, 5).state
    expect(state.round).toBe(2)
    expect(hero(state).actionBar[2].earnedCharges).toBe(1)
  })

  it('refuses hand cards aimed at the Signature Slot, and an uncharged fire (D-064, ADR 0032)', () => {
    const state = start()
    const inHand = hero(state).hand[0]
    const load = legality(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 2, cardInstanceId: inHand.instanceId })
    expect(load).toMatchObject({ legal: false, reason: 'The Signature Slot never takes a prepared card.' })
    state.phase = 'quick'
    const charge = legality(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 2, cardInstanceId: inHand.instanceId })
    expect(charge).toMatchObject({ legal: false, reason: 'The Signature Slot charges only through its standing clause.' })
    const fire = legality(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 2 })
    expect(fire).toMatchObject({ legal: false, reason: 'The Signature needs at least one earned Charge.' })
  })

  it('never Full-Charge-Cleans the Signature Slot (ADR 0032)', () => {
    let state = start()
    state = absorbTankHit(state)
    state = absorbTankHit(state)
    state = immortalHero(state)
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    state = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 2 }).state
    // The Slot fired at its full cap in this window; ADR 0008's cleanup would
    // discard a deck Slot here. The Signature survives the window's end.
    const endQuick = advancePhase(catalog, state)
    expect(endQuick.facts.some((fact) => fact.kind === 'full_charge_cleanup' && fact.detail.slotIndex === 2)).toBe(false)
    expect(endQuick.state.heroes[state.primaryHeroId].actionBar[2].topCard?.cardId).toBe('elian_riposte')
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
