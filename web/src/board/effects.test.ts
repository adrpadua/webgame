import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { advancePhase, createEncounterState, hexKey, resolve, type EncounterActionInput, type EncounterState } from '@/engine'
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

  it('floats the Signature earn where the block happened, and the waste at the cap (D-065)', () => {
    let state = createEncounterState(catalog, 'embermaw_prototype')
    const heroId = state.primaryHeroId
    const tankHit = (): { state: EncounterState; effects: BoardEffect[] } => {
      state.heroes[heroId].armor = 5
      return apply(state, {
        kind: 'damage',
        sourceId: state.bossId,
        targetId: heroId,
        amount: 4,
        reasonText: 'Raking Claw',
        factContext: { damage_keywords: ['tank_hit'] },
      })
    }
    const first = tankHit()
    state = first.state
    // The earn: a block floater and the Signature's own, both at the Hero.
    expect(first.effects.some((effect) => effect.kind === 'block')).toBe(true)
    const earn = first.effects.find((effect) => effect.label === '+1 Riposte')
    expect(earn).toMatchObject({ kind: 'cast', entityId: heroId, tone: 'guard' })
    state = tankHit().state
    const third = tankHit()
    // A qualifying block at the full bank is a wasted earn, and it says so.
    const waste = third.effects.find((effect) => effect.label === 'Riposte wasted')
    expect(waste).toMatchObject({ kind: 'cast', entityId: heroId, tone: 'hazard' })
  })
  it('floats a dealing-side earn at the Hero who landed the blow, not the target (D-087)', () => {
    // Maren's Underwriting earns on host_deals_damage: she strikes the Boss,
    // and the earn belongs on her hex. Under the old singular signature_event
    // this earn never reached the record at all, so the board was silent.
    const state = createEncounterState(catalog, 'embermaw_attrition_trial')
    const maren = state.partyHeroIds.find((id) => id !== state.primaryHeroId)!
    const { effects } = apply(state, {
      kind: 'damage',
      sourceId: maren,
      targetId: state.bossId,
      amount: 2,
      reasonText: 'Strike the Entry',
    })
    const earn = effects.find((effect) => effect.label?.startsWith('+1 '))
    expect(earn).toMatchObject({ kind: 'cast', entityId: maren, tone: 'guard' })
    expect(earn?.at).toEqual(state.board.entities[maren].coords)
  })


  it('plays no lunge for a claw that reached nothing', () => {
    // Board Feedback is derived from Resolution Facts so the board can never
    // show a blow the Encounter did not resolve. Since D-062 a claw can come up
    // short, and a lunge is what a landed hit looks like — playing one anyway
    // would tell the player they were struck on a Round they stepped clear.
    const state = openedRound()
    const away = { q: -2, r: 2 }
    state.board.entities[state.primaryHeroId].coords = { ...away }
    const { effects } = advance(state)
    expect(effects.some((effect) => effect.kind === 'strike')).toBe(false)
    expect(effects.some((effect) => effect.kind === 'hit' && effect.entityId === state.primaryHeroId)).toBe(false)
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

  it('puts the Boss out when the blow that ends the Encounter lands', () => {
    // The Boss is the one piece a killing blow leaves standing — the rules end
    // the Encounter and the body stays on its hex — so without this the board
    // would say nothing about the fight ending that it had not already said
    // for four points of chip damage.
    let state = openedRound()
    const boss = state.board.entities[state.bossId]
    state = {
      ...state,
      board: { ...state.board, entities: { ...state.board.entities, [state.bossId]: { ...boss, health: 1 } } },
    }
    state = advance(state).state
    state = advance(state).state
    const hero = state.heroes[state.primaryHeroId]
    state = apply(state, { kind: 'charge_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: hero.hand[0].instanceId }).state
    const { state: after, effects } = apply(state, { kind: 'fire_slot', sourceId: hero.id, slotIndex: 0 })
    expect(after.outcome).toBe('victory')
    const goingOut = effects.find((effect) => effect.kind === 'boss_defeat')
    expect(goingOut?.entityId).toBe(state.bossId)
    expect(goingOut?.tone).toBe('boss')
    // It rides the blow that caused it: the body goes out as the hit lands,
    // not as a separate beat afterwards.
    const hit = effects.find((effect) => effect.kind === 'hit' && effect.entityId === state.bossId)
    expect(goingOut?.delay ?? 0).toBe(hit?.delay ?? 0)
  })

  it('says nothing about a Boss that survived the blow', () => {
    // Every hit that does not end it is an ordinary hit, or the board would
    // put the fire out once a Round.
    const state = openedRound()
    const { effects } = advance(state)
    expect(effects.some((effect) => effect.kind === 'boss_defeat')).toBe(false)
  })

  it('gives back the ground a temporary Hazard held, and only that ground', () => {
    // Walk Round 1 to its boundary. Cinder Breath's ash lasts one Round and
    // Ash Trail's is permanent, so the Round that rolls has to hand back the
    // cone's hexes and keep the claw's.
    let state = openedRound()
    let burnt: string[] = []
    for (let step = 0; step < 4; step += 1) {
      state = advance(state).state
      burnt = Object.keys(state.board.hazards)
    }
    expect(burnt.length).toBeGreaterThan(0)
    const permanent = burnt.filter((key) => state.board.hazards[key].some((hazard) => hazard.permanent === true))
    const temporary = burnt.filter((key) => !state.board.hazards[key].some((hazard) => hazard.permanent === true))
    expect(temporary.length).toBeGreaterThan(0)

    const { state: rolled, effects } = advance(state)
    const cooled = effects.filter((effect) => effect.kind === 'cool').map((effect) => hexKey(effect.at))
    expect([...cooled].sort()).toEqual([...temporary].sort())
    // What the board is told and what the rules did are the same list: every
    // hex handed back is a hex the state no longer holds a Hazard for, and
    // ground the Boss burnt for good is never handed back at all.
    for (const key of cooled) {
      expect(rolled.board.hazards[key] ?? []).toEqual([])
    }
    for (const key of permanent) {
      expect(cooled).not.toContain(key)
      expect((rolled.board.hazards[key] ?? []).length).toBeGreaterThan(0)
    }
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
    const fired = catalog.cards[state.heroes[hero.id].actionBar[0].topCard!.cardId]
    state = apply(state, { kind: 'charge_slot', sourceId: hero.id, slotIndex: 0, cardInstanceId: hero.hand[0].instanceId }).state
    const { effects } = apply(state, { kind: 'fire_slot', sourceId: hero.id, slotIndex: 0 })
    expect(effects.map((effect) => effect.kind)).toEqual(['cast', 'strike', 'hit'])
    // The card names itself over the Hero who fired it, the way a Beat names
    // itself over the Boss.
    expect(effects[0]).toMatchObject({
      entityId: state.primaryHeroId,
      at: state.board.entities[state.primaryHeroId].coords,
      label: fired.title,
      tone: 'hero',
    })
    expect(effects[1].entityId).toBe(state.primaryHeroId)
    expect(effects[1].toward).toEqual(state.board.entities[state.bossId].coords)
    expect(effects[2].entityId).toBe(state.bossId)
    expect(effects[2].tone).toBe('hero')
    expect(effects[2].label).toBe('-3')
  })

  it('names every fired card over its Hero, whatever the card does', () => {
    // The Boss names each Beat unconditionally; a Hero naming only the cards
    // that happen to deal damage would leave the guards and the steps-and-draws
    // silent, which is the gap this closes.
    const variant = structuredClone(catalog)
    variant.cards.quiet_test = {
      ...variant.cards.iron_guard,
      id: 'quiet_test',
      title: 'Quiet Test',
      armor_delta: 0,
      draw_count: 0,
      charge_modifiers: [],
    }
    const state = createEncounterState(variant, FIRST_TURN_ENCOUNTER_ID)
    state.phase = 'quick'
    state.heroes[state.primaryHeroId].actionBar[0] = {
      topCard: { instanceId: 'quiet', cardId: 'quiet_test' },
      charges: [{ instanceId: 'charge', cardId: 'iron_guard' }],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
    const result = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    const effects = deriveBoardEffects(variant, state, result.state, result.facts)
    // Exactly one pulse: a card that granted nothing has nothing to float
    // above its name, and a second unlabelled cast would only redraw the ring.
    expect(effects).toEqual([
      { kind: 'cast', entityId: state.primaryHeroId, at: state.board.entities[state.primaryHeroId].coords, label: 'Quiet Test', tone: 'hero' },
    ])
  })

  it('turns a fired burst into a Hero blast plus the existing per-Enemy hits', () => {
    const variant = structuredClone(catalog)
    variant.cards.burst_test = {
      ...variant.cards.sweeping_blow,
      id: 'burst_test',
      title: 'Burst Test',
      target_type: 'hex',
      range_tiles: 1,
      damage: 1,
      burst_radius: 1,
    }
    let state = createEncounterState(variant, FIRST_TURN_ENCOUNTER_ID)
    state = resolve(variant, state, {
      kind: 'spawn_minion',
      sourceId: state.bossId,
      minionId: 'burst_whelp',
      coords: { q: -1, r: 0 },
      minionContentId: 'ember_whelp',
    }).state
    state.phase = 'quick'
    state.heroes[state.primaryHeroId].actionBar[0] = {
      topCard: { instanceId: 'burst', cardId: 'burst_test' },
      charges: [{ instanceId: 'charge', cardId: 'iron_guard' }],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
    const center = { q: 0, r: -1 }
    const result = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: center,
    })
    const effects = deriveBoardEffects(variant, state, result.state, result.facts)

    expect(effects[0]).toMatchObject({ kind: 'cast', entityId: state.primaryHeroId, label: 'Burst Test', tone: 'hero' })
    expect(effects[1]).toMatchObject({ kind: 'strike', entityId: state.primaryHeroId, toward: center, tone: 'hero' })
    expect(effects[2]).toMatchObject({ kind: 'blast', entityId: state.primaryHeroId, at: center, tone: 'hero' })
    const factHexes = result.facts[0].detail.burstHexes
    expect(Array.isArray(factHexes)).toBe(true)
    expect(effects[2].hexes?.map((hex) => `${hex.q},${hex.r}`)).toEqual(
      (factHexes as { q: number; r: number }[]).map((hex) => `${hex.q},${hex.r}`),
    )
    expect(effects.slice(3).some((effect) => effect.kind === 'hit' && effect.entityId === 'burst_whelp')).toBe(true)
  })

  it('labels a pure-draw cast with the number of cards actually drawn', () => {
    const variant = structuredClone(catalog)
    variant.cards.draw_test = {
      ...variant.cards.iron_guard,
      id: 'draw_test',
      title: 'Draw Test',
      armor_delta: 0,
      draw_count: 2,
      charge_modifiers: [],
    }
    const state = createEncounterState(variant, FIRST_TURN_ENCOUNTER_ID)
    state.phase = 'quick'
    state.heroes[state.primaryHeroId].actionBar[0] = {
      topCard: { instanceId: 'draw', cardId: 'draw_test' },
      charges: [{ instanceId: 'charge', cardId: 'iron_guard' }],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
    const result = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    const effects = deriveBoardEffects(variant, state, result.state, result.facts)

    expect(effects).toEqual([
      { kind: 'cast', entityId: state.primaryHeroId, at: state.board.entities[state.primaryHeroId].coords, label: 'Draw Test', tone: 'hero' },
      { kind: 'cast', entityId: state.primaryHeroId, at: state.board.entities[state.primaryHeroId].coords, label: '+2 cards', tone: 'guard' },
    ])
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

  it('flares the telegraphed cone the Incoming beats produced', () => {
    // The Incoming Row rides the batch that opens Boss Incoming: two
    // advances reach the Quick Window, the third carries the beats.
    let state = openedRound()
    state = advance(state).state
    state = advance(state).state
    const { effects } = advance(state)
    const blast = effects.find((effect) => effect.kind === 'blast')
    expect(blast?.hexes?.length).toBeGreaterThan(0)
  })

  it('pops the Whelps a Brood Call produced', () => {
    // Split from the cone case: program order is seeded (D-037) and the pinned
    // opener calls no Whelps (D-036), so this walks forward to the first
    // Incoming Row that actually spawns rather than assuming Round 1 does.
    let state = openedRound()
    state.heroes[state.primaryHeroId].maxHealth = 500
    state.heroes[state.primaryHeroId].health = 500
    for (let step = 0; step < 25; step += 1) {
      const advanced = advance(state)
      state = advanced.state
      const spawns = advanced.effects.filter((effect) => effect.kind === 'spawn')
      if (spawns.length > 0) {
        expect(spawns).toHaveLength(2)
        return
      }
    }
    throw new Error('no Brood Call spawned within 25 phase steps')
  })

  it('blows the ground up around a Whelp whose fuse ran out, and takes the piece with it', () => {
    // D-063. The detonation resolves in the Incoming Row alongside the Boss
    // Beats, so it has to claim its own moment: sharing one with the Beat that
    // follows would show a blast that Beat did not cause.
    let state = openedRound()
    state.heroes[state.primaryHeroId].maxHealth = 500
    state.heroes[state.primaryHeroId].health = 500
    for (let step = 0; step < 30; step += 1) {
      const before = state
      const result = advancePhase(catalog, state)
      const effects = deriveBoardEffects(catalog, before, result.state, result.facts)
      state = result.state
      // The Boss's own cone is a blast too, so the Whelp's is found through the
      // fact that produced it rather than by taking the first one on the board.
      const detonated = result.facts.find((fact) => fact.kind === 'detonate_minion' && fact.succeeded)
      if (!detonated) {
        continue
      }
      const blast = effects.find((effect) => effect.kind === 'blast' && effect.entityId === detonated.sourceId)
      expect(blast?.tone).toBe('hazard')
      expect((blast?.hexes ?? []).length).toBeGreaterThan(1)
      // The piece leaves with its own blast, from the hex the blast centred on.
      const leaving = effects.find((effect) => effect.kind === 'defeat' && effect.entityId === detonated.sourceId)
      expect(leaving?.at).toEqual(blast?.at)
      expect(state.board.entities[detonated.sourceId]).toBeUndefined()
      // Its own moment, ahead of every Boss Beat in the same batch.
      const script = derivePlayoutScript(before, state, result.facts, effects)
      expect(script?.moments[0].beatId).toBeNull()
      expect(script?.moments[0].beatTitle).toBe('Whelp detonates')
      expect(script?.moments[0].effects.some((effect) => effect.kind === 'blast')).toBe(true)
      expect((script?.moments.length ?? 0)).toBeGreaterThan(1)
      return
    }
    throw new Error('no Whelp detonated within 30 phase steps')
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
    // The card's own name goes out first; the grant floats above it.
    expect(effects[0]).toMatchObject({ kind: 'cast', entityId: hero.id, label: catalog.cards[guard.cardId].title, tone: 'hero' })
    const cast = effects.find((effect) => effect.kind === 'cast' && effect.tone === 'guard')
    expect(cast?.label).toBe(`+${after.heroes[hero.id].armor - before}`)
  })

  it('shows a pure shove as a Hero lunge followed by the target move', () => {
    const variant = structuredClone(catalog)
    variant.cards.shove_test = {
      ...variant.cards.sweeping_blow,
      id: 'shove_test',
      title: 'Shove Test',
      damage: 0,
      range_tiles: 2,
      push_tiles: 1,
      pull_tiles: 0,
    }
    let state = createEncounterState(variant, FIRST_TURN_ENCOUNTER_ID)
    state = resolve(variant, state, {
      kind: 'spawn_minion',
      sourceId: state.bossId,
      minionId: 'shove_target',
      coords: { q: -1, r: 0 },
      minionContentId: 'ember_whelp',
    }).state
    state.phase = 'quick'
    state.heroes[state.primaryHeroId].actionBar[0] = {
      topCard: { instanceId: 'shove', cardId: 'shove_test' },
      charges: [{ instanceId: 'charge', cardId: 'iron_guard' }],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }
    const result = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'shove_target',
    })
    const effects = deriveBoardEffects(variant, state, result.state, result.facts)
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'strike', entityId: state.primaryHeroId, toward: { q: -1, r: 0 }, tone: 'hero' }),
        expect.objectContaining({ kind: 'move', entityId: 'shove_target', from: { q: -1, r: 0 }, at: { q: -2, r: 0 }, tone: 'hero' }),
      ]),
    )
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
