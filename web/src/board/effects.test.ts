import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { advancePhase, createEncounterState, resolve, type EncounterActionInput, type EncounterState } from '@/engine'
import { BEAT_STAGGER_MS, deriveBoardEffects, deriveHealthPlayout, derivePlayoutScript, freeFloaterLane, type BoardEffect } from './effects'

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
    // Entering Boss Instant resolves the Instant Row in the same batch
    // (ADR 0024), so the first advance out of Loadout carries the show.
    const state = openedRound()
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
    const state = openedRound()
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
    const state = openedRound()
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
    const state = openedRound()
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
    const state = openedRound()
    const result = advancePhase(catalog, state)
    const effects = deriveBoardEffects(catalog, state, result.state, result.facts)
    const script = derivePlayoutScript(state, result.state, result.facts, effects)
    expect(script).not.toBeNull()
    // The batch that opens the Boss window carries its beats (ADR 0024), so
    // the authoritative phase a client shows while the script replays is the
    // Boss's own window.
    expect(result.state.phase).toBe('instant')
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
    // Wound the tank so the claw's beat — inside the batch that opens Boss
    // Instant — is the killing blow.
    let state = openedRound()
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
    for (let advances = 0; advances < 2; advances += 1) {
      state = advancePhase(catalog, state).state
    }
    // Standing in the cone with 1 health: Cinder Breath — the incoming
    // track's first beat, stagger slot zero, resolving in the batch that
    // opens Boss Incoming — is the killing blow.
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
    // The Incoming Row rides the batch that opens Boss Incoming: two
    // advances reach the Quick Window, the third carries the beats.
    let state = openedRound()
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

describe('floater lanes', () => {
  const at = { q: 0, r: -1 }
  const elsewhere = { q: 2, r: 0 }

  it('gives the first label at a hex the lowest lane', () => {
    expect(freeFloaterLane([], at)).toBe(0)
  })

  it('stacks a second and third label at the same hex above the first', () => {
    // Turn to the Tank, Raking Claw, Ash Trail all resolve at the Boss. Left
    // to one lane they overprint into one unreadable word.
    const live = [{ label: 'Turn to the Tank', at, lane: 0 }]
    expect(freeFloaterLane(live, at)).toBe(1)
    live.push({ label: 'Raking Claw', at, lane: 1 })
    expect(freeFloaterLane(live, at)).toBe(2)
  })

  it('does not count labels at other hexes, or unlabelled effects', () => {
    const live = [
      { label: 'Cinder Breath', at: elsewhere, lane: 0 },
      { at, lane: 0 }, // a strike or a hit flash: motion, no text
    ]
    expect(freeFloaterLane(live, at)).toBe(0)
  })

  it('reuses a lane once the label in it has aged out', () => {
    // The scene filters expired effects out of the live list; a new label
    // then takes the freed lane rather than climbing forever.
    const live = [{ label: 'Ash Trail', at, lane: 1 }]
    expect(freeFloaterLane(live, at)).toBe(0)
  })
})
