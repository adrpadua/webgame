import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { advancePhase, createEncounterState, resolve, type EncounterActionInput, type EncounterState } from '@/engine'
import { BEAT_STAGGER_MS, deriveBoardEffects, deriveHealthPlayout, derivePlayoutScript, type BoardEffect } from './effects'

// Board feedback is derived from Resolution Facts, never from intent: if the
// Encounter did not resolve it, the board must not animate it.

const catalog = loadCatalog()

function apply(state: EncounterState, action: EncounterActionInput): { state: EncounterState; effects: BoardEffect[] } {
  const result = resolve(catalog, state, action)
  return { state: result.state, effects: deriveBoardEffects(catalog, state, result.state, result.facts) }
}

function advance(state: EncounterState): { state: EncounterState; effects: BoardEffect[] } {
  const result = advancePhase(catalog, state)
  return { state: result.state, effects: deriveBoardEffects(catalog, state, result.state, result.facts) }
}

function openedRound(): EncounterState {
  let state = createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID)
  const hero = state.heroes[state.primaryHeroId]
  const quick = hero.hand.find((card) => catalog.cards[card.cardId].boss_damage > 0 && catalog.cards[card.cardId].speed === 'quick')
  state = apply(state, { kind: 'load_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: quick!.instanceId }).state
  return state
}

describe('board effects', () => {
  it('says nothing about actions that only move cards around', () => {
    const state = createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID)
    const hero = state.heroes[state.primaryHeroId]
    const { effects } = apply(state, { kind: 'load_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: hero.hand[0].instanceId })
    expect(effects).toEqual([])
  })

  it('turns the Boss Instant into a lunge, a hit on the Hero, and scorched ground', () => {
    let state = openedRound()
    state = advance(state).state
    const { effects } = advance(state)
    const strike = effects.find((effect) => effect.kind === 'strike')
    expect(strike?.entityId).toBe(state.bossId)
    expect(strike?.toward).toEqual(state.board.entities[state.primaryHeroId].coords)
    const hit = effects.find((effect) => effect.kind === 'hit')
    expect(hit?.entityId).toBe(state.primaryHeroId)
    expect(hit?.label).toBe('-4')
    expect(hit?.tone).toBe('boss')
    expect(effects.some((effect) => effect.kind === 'scorch')).toBe(true)
  })

  it('plays a boss track out one beat at a time: announced, staggered, and in program order', () => {
    let state = openedRound()
    state = advance(state).state
    const { effects } = advance(state)
    // Every beat announces itself over the Boss with its authored title, in
    // the order the program lists them, each one stagger slot later.
    const announces = effects.filter((effect) => effect.kind === 'cast' && effect.entityId === state.bossId)
    expect(announces.length).toBeGreaterThanOrEqual(2)
    expect(announces.map((effect) => effect.delay ?? 0)).toEqual(announces.map((_, index) => index * BEAT_STAGGER_MS))
    expect(announces.every((effect) => typeof effect.label === 'string' && effect.label.length > 0)).toBe(true)
    // A beat's consequences ride its own slot: the claw's hit lands with the
    // claw, not with the batch.
    const strike = effects.find((effect) => effect.kind === 'strike')
    const hit = effects.find((effect) => effect.kind === 'hit')
    expect(hit?.delay).toBe(strike?.delay)
    expect(strike?.delay).toBeGreaterThan(0)
  })

  it('swings the Boss facing when a turn beat actually turned it', () => {
    let state = openedRound()
    state = advance(state).state
    const bossFacingBefore = state.board.entities[state.bossId].facing
    const { state: after, effects } = advance(state)
    const turn = effects.find((effect) => effect.kind === 'turn')
    if (after.board.entities[after.bossId].facing === bossFacingBefore) {
      // The Boss already faced the Hero: nothing turned, nothing swings.
      expect(turn).toBeUndefined()
      return
    }
    expect(turn?.entityId).toBe(state.bossId)
    expect(turn?.fromFacing).toBe(bossFacingBefore)
  })

  it('sequences the gauges with the beat playout and lands them on the true end state', () => {
    let state = openedRound()
    state = advancePhase(catalog, state).state
    const heroId = state.primaryHeroId
    const heroBefore = state.heroes[heroId]
    const result = advancePhase(catalog, state)
    const playout = deriveHealthPlayout(state, result.state, result.facts)
    expect(playout).not.toBeNull()
    // The gauge holds its pre-batch value the moment the batch lands...
    expect(playout!.initial[heroId]).toEqual({ health: heroBefore.health, armor: heroBefore.armor })
    // ...then steps down when the damaging beat's moment arrives, matching
    // the hit effect's stagger slot.
    const steps = playout!.steps.filter((step) => step.entityId === heroId)
    expect(steps.length).toBeGreaterThan(0)
    const effects = deriveBoardEffects(catalog, state, result.state, result.facts)
    const hit = effects.find((effect) => effect.kind === 'hit')
    expect(steps[0].delay).toBe(hit?.delay)
    // The final step is the authoritative end state, approximation or not.
    const last = steps[steps.length - 1]
    expect(last.value).toEqual({ health: result.state.heroes[heroId].health, armor: result.state.heroes[heroId].armor })
  })

  it('scripts a boss track into one moment per beat, in program order', () => {
    let state = openedRound()
    state = advancePhase(catalog, state).state
    const result = advancePhase(catalog, state)
    const effects = deriveBoardEffects(catalog, state, result.state, result.facts)
    const script = derivePlayoutScript(state, result.state, result.facts, effects)
    expect(script).not.toBeNull()
    // The script names the window its beats belong to — the phase the batch
    // resolved from, not the player window the rules already advanced into —
    // so the HUD can keep showing the Boss's turn while it replays.
    expect(state.phase).toBe('instant')
    expect(result.state.phase).toBe('quick')
    expect(script!.phase).toBe('instant')
    // One moment per resolved beat, titled from the program, delays gone.
    const announces = effects.filter((effect) => effect.kind === 'cast' && effect.entityId === state.bossId)
    expect(script!.moments.map((moment) => moment.beatTitle)).toEqual(announces.map((announce) => announce.label))
    expect(script!.moments.every((moment) => moment.effects.every((effect) => effect.delay === undefined))).toBe(true)
    // A beat's consequences ride its own moment: the claw's hit and its
    // gauge value land in the same moment as its strike.
    const clawIndex = script!.moments.findIndex((moment) => moment.effects.some((effect) => effect.kind === 'strike'))
    expect(clawIndex).toBeGreaterThan(0)
    expect(script!.moments[clawIndex].effects.some((effect) => effect.kind === 'hit')).toBe(true)
    expect(script!.moments[clawIndex].gauges[state.primaryHeroId]).toBeDefined()
    expect(script!.endsEncounter).toBe(false)
  })

  it('returns no script for immediate player actions', () => {
    let state = openedRound()
    state = advance(state).state
    state = advance(state).state
    const hero = state.heroes[state.primaryHeroId]
    state = apply(state, { kind: 'charge_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: hero.hand[0].instanceId }).state
    const result = resolve(catalog, state, { kind: 'fire_slot', sourceId: hero.id, slotIndex: 0 })
    const effects = deriveBoardEffects(catalog, state, result.state, result.facts)
    expect(derivePlayoutScript(state, result.state, result.facts, effects)).toBeNull()
  })

  it('flags a fatal batch so the outcome reveal can wait out its moments', () => {
    let state = openedRound()
    state = advancePhase(catalog, state).state
    // Wound the tank so the claw's beat is the killing blow.
    state = structuredClone(state)
    state.heroes[state.primaryHeroId].health = 1
    state.board.entities[state.primaryHeroId].health = 1
    const result = advancePhase(catalog, state)
    expect(result.state.active).toBe(false)
    expect(result.state.outcome).toBe('defeat')
    const effects = deriveBoardEffects(catalog, state, result.state, result.facts)
    const script = derivePlayoutScript(state, result.state, result.facts, effects)
    expect(script!.endsEncounter).toBe(true)
    // The claw sits past the first slot: its moment carries the zero.
    const playout = deriveHealthPlayout(state, result.state, result.facts)
    const heroSteps = playout!.steps.filter((step) => step.entityId === state.primaryHeroId)
    expect(heroSteps[heroSteps.length - 1].value.health).toBe(0)
  })

  it('scripts a killing blow in the first beat slot so the reveal still waits', () => {
    let state = openedRound()
    for (let advances = 0; advances < 3; advances += 1) {
      state = advancePhase(catalog, state).state
    }
    // Standing in the cone with 1 health: Cinder Breath — the incoming
    // track's first beat, stagger slot zero — is the killing blow.
    state = structuredClone(state)
    state.heroes[state.primaryHeroId].health = 1
    state.board.entities[state.primaryHeroId].health = 1
    const result = advancePhase(catalog, state)
    expect(result.state.active).toBe(false)
    // No gauge step staggers (the fatal damage is immediate), but the batch
    // still scripts moments the reveal must outwait.
    const effects = deriveBoardEffects(catalog, state, result.state, result.facts)
    const script = derivePlayoutScript(state, result.state, result.facts, effects)
    expect(script).not.toBeNull()
    expect(script!.endsEncounter).toBe(true)
    expect(script!.moments.length).toBeGreaterThan(0)
  })

  it('skips the gauge playout entirely for immediate player actions', () => {
    let state = openedRound()
    state = advance(state).state
    state = advance(state).state
    const hero = state.heroes[state.primaryHeroId]
    state = apply(state, { kind: 'charge_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: hero.hand[0].instanceId }).state
    const result = resolve(catalog, state, { kind: 'fire_slot', sourceId: hero.id, slotIndex: 0 })
    expect(deriveHealthPlayout(state, result.state, result.facts)).toBeNull()
  })

  it('holds player-action feedback at zero delay: only boss tracks stagger', () => {
    let state = openedRound()
    state = advance(state).state
    state = advance(state).state
    const hero = state.heroes[state.primaryHeroId]
    state = apply(state, { kind: 'charge_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: hero.hand[0].instanceId }).state
    const { effects } = apply(state, { kind: 'fire_slot', sourceId: hero.id, slotIndex: 0 })
    expect(effects.every((effect) => (effect.delay ?? 0) === 0)).toBe(true)
  })

  it('turns a fired attack into a Hero lunge at the Boss and a hit carrying the damage', () => {
    let state = openedRound()
    state = advance(state).state
    state = advance(state).state
    const hero = state.heroes[state.primaryHeroId]
    state = apply(state, { kind: 'charge_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: hero.hand[0].instanceId }).state
    const { effects } = apply(state, { kind: 'fire_slot', sourceId: hero.id, slotIndex: 0 })
    expect(effects.map((effect) => effect.kind)).toEqual(['strike', 'hit'])
    expect(effects[0].entityId).toBe(state.primaryHeroId)
    expect(effects[0].toward).toEqual(state.board.entities[state.bossId].coords)
    expect(effects[1].entityId).toBe(state.bossId)
    expect(effects[1].tone).toBe('hero')
    expect(effects[1].label).toBe('-3')
  })

  it('reads a Hero step as a glide from the hex it left', () => {
    let state = openedRound()
    state = advance(state).state
    state = advance(state).state
    const hero = state.heroes[state.primaryHeroId]
    const from = state.board.entities[hero.id].coords
    const destination = { q: from.q - 1, r: from.r }
    const { effects } = apply(state, { kind: 'move_hero', sourceId: hero.id, destination, cardInstanceId: hero.hand[0].instanceId })
    const move = effects.find((effect) => effect.kind === 'move')
    expect(move?.from).toEqual(from)
    expect(move?.at).toEqual(destination)
  })

  it('flares the telegraphed cone and pops the Whelps the Incoming beats produced', () => {
    let state = openedRound()
    state = advance(state).state
    state = advance(state).state
    state = advance(state).state
    const { effects } = advance(state)
    const blast = effects.find((effect) => effect.kind === 'blast')
    expect(blast?.hexes?.length).toBeGreaterThan(0)
    expect(effects.filter((effect) => effect.kind === 'spawn')).toHaveLength(2)
  })

  it('shows Armor a guard actually granted rather than the number printed on the card', () => {
    let state = createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID)
    const hero = state.heroes[state.primaryHeroId]
    const guard = hero.hand.find((card) => catalog.cards[card.cardId].armor_delta > 0 && catalog.cards[card.cardId].speed === 'quick')
    if (!guard) {
      // The authored opening Hand is allowed to hold no quick guard; the
      // other cases already cover the attack path.
      return
    }
    state = apply(state, { kind: 'load_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: guard.instanceId }).state
    state = advance(state).state
    state = advance(state).state
    const charge = state.heroes[hero.id].hand[0]
    state = apply(state, { kind: 'charge_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: charge.instanceId }).state
    const before = state.heroes[hero.id].armor
    const { state: after, effects } = apply(state, { kind: 'fire_slot', sourceId: hero.id, slotIndex: 0 })
    const cast = effects.find((effect) => effect.kind === 'cast')
    expect(cast?.tone).toBe('guard')
    expect(cast?.label).toBe(`+${after.heroes[hero.id].armor - before}`)
  })
})
