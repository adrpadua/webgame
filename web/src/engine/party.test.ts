import { describe, expect, it } from 'vitest'
import {
  buildCatalog,
  advancePhase,
  createEncounterState,
  escalationActionsForRoundEnd,
  getEntityIdAt,
  neighbors,
  DIMINISHED_ACTIONS,
  ENCOUNTER_SOURCE,
  isLivingHero,
  livingHeroIds,
  rescueDeadlineRound,
  resolve,
  selectBeatTarget,
  type ContentCatalog,
  type EncounterState,
} from '@/engine'

// The Party seams (ADR 0035). Every test here fields two Heroes, because the
// existing suite only ever proves the solo path still works — which it would
// even if none of this were wired up.
//
// The fixture is deliberately hand-built rather than taken from `data/`: the
// authored Encounters are solo, and a party test that depended on them would
// start failing for content reasons the moment the Ashen Trial is retuned.

const KEYWORDS = [
  { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
  { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
  { id: 'tank', title: 'Tank', kind: 'role' },
  { id: 'healer', title: 'Healer', kind: 'role' },
]

// One card per Role, so each seat's deck states a different Role — which is
// the whole mechanism `heroRole` reads and the Boss's selector pivots on.
const CARDS = [
  { id: 'tank_strike', title: 'Tank Strike', speed: 'quick', range_tiles: 1, boss_damage: 1, tags: ['tank'] },
  { id: 'healer_strike', title: 'Healer Strike', speed: 'quick', range_tiles: 1, boss_damage: 1, tags: ['healer'] },
  // The seam the Healer role exists for: preservation aimed at someone else.
  {
    id: 'mend',
    title: 'Mend',
    speed: 'quick',
    target_type: 'ally',
    range_tiles: 2,
    healing: 3,
    armor_delta: 1,
    tags: ['healer'],
  },
  // Every effect field zero: the empty fire `effect_landed` exists to refuse.
  { id: 'posture', title: 'Posture', speed: 'quick', tags: ['healer'] },
  {
    id: 'ward',
    title: 'Ward',
    speed: 'quick',
    target_type: 'ally',
    range_tiles: 2,
    places_counter: 'warded',
    tags: ['healer'],
  },
]

const COUNTERS = [
  {
    id: 'warded',
    title: 'Warded',
    host: 'combatant',
    max: 3,
    readers: [{ when: 'round_start', effect: 'armor', per: 1 }],
  },
]

function party(overrides: Record<string, unknown> = {}): ContentCatalog {
  return buildCatalog({
    cards: CARDS,
    heroes: [
      { id: 'warden', title: 'Warden', max_health: 20 },
      { id: 'mender', title: 'Mender', max_health: 12 },
    ],
    keywords: KEYWORDS,
    counters: COUNTERS,
    chargeModifiers: [],
    hazards: [],
    minions: [],
    programs: [
      {
        id: 'probe_program',
        title: 'Probe Program',
        instant_beats: [],
        incoming_beats: [],
      },
    ],
    encounters: [
      {
        id: 'probe_party',
        title: 'Probe Party',
        party: [
          { hero: 'warden', start: { q: 0, r: 0 }, deck: [{ card: 'tank_strike', copies: 6 }] },
          { hero: 'mender', start: { q: 1, r: 0 }, deck: [{ card: 'healer_strike', copies: 4 }, { card: 'mend', copies: 2 }, { card: 'ward', copies: 2 }] },
        ],
        boss_id: 'probe_boss',
        boss_title: 'Probe Boss',
        round_limit: 6,
        board_radius: 3,
        boss_start: { q: 0, r: -3 },
        boss_health: 40,
        slot_count: 2,
        hand_refill_target: 4,
        player_deck: [{ card: 'tank_strike', copies: 4 }],
        boss_programs: ['probe_program'],
        random_seed: 7,
        ...overrides,
      },
    ],
  })
}

const beat = (patch: Record<string, unknown> = {}) => ({
  id: 'probe_beat',
  title: 'Probe Beat',
  kind: 'targeted_hit' as const,
  range_tiles: 9,
  damage: 3,
  consequence_tier: 'chip' as const,
  answer_tags: [],
  damage_keywords: [],
  counter: '',
  counter_amount: 1,
  counter_target: 'self' as const,
  target_selector: '',
  unguarded_bonus: 0,
  escalation_if_unanswered: 0,
  move_tiles: 0,
  traversal: 'walk' as const,
  duration_rounds: 1,
  permanent: false,
  count: 2,
  rules_text: '',
  ...patch,
})

describe('the Party seams (ADR 0035)', () => {
  describe('an Encounter fields a Party', () => {
    it('seats every authored Hero with their own health, deck, and board entity', () => {
      const state = createEncounterState(party(), 'probe_party')
      expect(state.partyHeroIds).toEqual(['warden', 'mender'])
      // The first seat is the primary Hero: the Hero Frame's subject.
      expect(state.primaryHeroId).toBe('warden')
      expect(state.heroes.warden.maxHealth).toBe(20)
      expect(state.heroes.mender.maxHealth).toBe(12)
      expect(state.board.entities.warden.coords).toEqual({ q: 0, r: 0 })
      expect(state.board.entities.mender.coords).toEqual({ q: 1, r: 0 })
      // Each seat draws its own deck. A shared pile would make one Hero's
      // draw the other's loss, which no rule asks for.
      const drawn = (heroId: string) =>
        new Set([...state.heroes[heroId].hand, ...state.heroes[heroId].deck].map((card) => card.cardId))
      expect(drawn('warden')).toEqual(new Set(['tank_strike']))
      expect([...drawn('mender')].sort()).toEqual(['healer_strike', 'mend', 'ward'])
    })

    it('refuses two seats for one Hero, and two Heroes on one hex', () => {
      expect(() =>
        party({ party: [{ hero: 'warden', start: { q: 0, r: 0 } }, { hero: 'warden', start: { q: 1, r: 0 } }] }),
      ).toThrow('seats warden twice; one Hero holds one seat')
      expect(() =>
        party({ party: [{ hero: 'warden', start: { q: 0, r: 0 } }, { hero: 'mender', start: { q: 0, r: 0 } }] }),
      ).toThrow('starts mender on (0, 0), where warden already stands')
    })
  })

  describe('the Boss selects a Hero by Role', () => {
    it('aims a Beat at the Role it names, not at the primary Hero', () => {
      const catalog = party()
      const state = createEncounterState(catalog, 'probe_party')
      expect(selectBeatTarget(catalog, state, beat({ target_selector: 'healer' })).heroId).toBe('mender')
      expect(selectBeatTarget(catalog, state, beat({ target_selector: 'tank' })).heroId).toBe('warden')
    })

    it('falls back to the first seat when no living Hero plays the Role, and says so', () => {
      const catalog = party()
      const state = createEncounterState(catalog, 'probe_party')
      // No seat plays this Role, so the blow still lands — on the first seat —
      // rather than the Boss quietly skipping its turn.
      const missing = selectBeatTarget(catalog, state, beat({ target_selector: 'tank_hit' }))
      expect(missing.heroId).toBe('warden')
      expect(missing.fellBack).toBe(true)
      // An unselective Beat is not a fallback; it never asked for a Role.
      expect(selectBeatTarget(catalog, state, beat()).fellBack).toBe(false)
    })

    it('skips a Hero who is down to zero', () => {
      const catalog = party()
      const state = createEncounterState(catalog, 'probe_party')
      state.heroes.mender.health = 0
      expect(selectBeatTarget(catalog, state, beat({ target_selector: 'healer' })).heroId).toBe('warden')
    })

    it('lands the damage on the selected Hero', () => {
      const catalog = party()
      const state = createEncounterState(catalog, 'probe_party')
      const after = resolve(catalog, state, {
        kind: 'resolve_boss',
        sourceId: 'probe_boss',
        beat: beat({ target_selector: 'healer' }),
        track: 'incoming',
      })
      expect(after.state.heroes.mender.health).toBe(9)
      expect(after.state.heroes.warden.health).toBe(20)
    })
  })

  describe('ally targeting routes preservation to the chosen Hero', () => {
    // Fire Mend from the Mender at the wounded Warden, through the ordinary
    // load-and-fire path, so this exercises legality and resolution together.
    function mendTheWarden(targetId: string) {
      const catalog = party()
      const state = createEncounterState(catalog, 'probe_party')
      state.heroes.warden.health = 10
      state.phase = 'quick'
      const mend = state.heroes.mender.hand.find((card) => card.cardId === 'mend')
        ?? { instanceId: 'mend_probe', cardId: 'mend' }
      state.heroes.mender.actionBar[0].topCard = mend
      state.heroes.mender.actionBar[0].charges = [{ instanceId: 'fuel_probe', cardId: 'healer_strike' }]
      return resolve(catalog, state, { kind: 'fire_slot', sourceId: 'mender', slotIndex: 0, targetId })
    }

    it('heals and armors the ally, not the caster', () => {
      const after = mendTheWarden('warden')
      expect(after.facts[0].succeeded).toBe(true)
      expect(after.state.heroes.warden.health).toBe(13)
      expect(after.state.heroes.warden.armor).toBe(1)
      // The Mender spent the card and gained nothing from it.
      expect(after.state.heroes.mender.health).toBe(12)
      expect(after.state.heroes.mender.armor).toBe(0)
      expect(after.facts[0].detail.preservedAlly).toBe('warden')
      // The board entity is resynced, or the ally's frame would show stale health.
      expect(after.state.board.entities.warden.health).toBe(13)
    })

    it('lets a Hero cover themselves', () => {
      const after = mendTheWarden('mender')
      expect(after.facts[0].succeeded).toBe(true)
      expect(after.state.heroes.mender.armor).toBe(1)
      expect(after.facts[0].detail.preservedAlly).toBeUndefined()
    })

    // The Bond shape from the healer research note: the ward has to land on
    // the Hero being protected, or a healer's whole machine marks the wrong
    // person. The mutation audit caught this rule untested.
    it('places a ward on the chosen ally, not on the caster', () => {
      const catalog = party()
      const state = createEncounterState(catalog, 'probe_party')
      state.phase = 'quick'
      state.heroes.mender.actionBar[0].topCard = { instanceId: 'ward_probe', cardId: 'ward' }
      state.heroes.mender.actionBar[0].charges = [{ instanceId: 'fuel_probe', cardId: 'healer_strike' }]
      const after = resolve(catalog, state, { kind: 'fire_slot', sourceId: 'mender', slotIndex: 0, targetId: 'warden' })
      expect(after.facts[0].succeeded).toBe(true)
      expect(after.state.counters['combatant:warden']?.map((counter) => counter.id)).toEqual(['warded'])
      expect(after.state.counters['combatant:mender'] ?? []).toEqual([])
    })

    it('refuses an Enemy, and an ally out of range', () => {
      expect(mendTheWarden('probe_boss').facts[0].reason).toBe('The Top Card needs an ally target.')
      const catalog = party()
      const state = createEncounterState(catalog, 'probe_party')
      state.phase = 'quick'
      state.board.entities.warden.coords = { q: -3, r: 3 }
      state.heroes.mender.actionBar[0].topCard = { instanceId: 'mend_probe', cardId: 'mend' }
      state.heroes.mender.actionBar[0].charges = [{ instanceId: 'fuel_probe', cardId: 'healer_strike' }]
      const far = resolve(catalog, state, { kind: 'fire_slot', sourceId: 'mender', slotIndex: 0, targetId: 'warden' })
      expect(far.facts[0].reason).toBe("The chosen ally is outside the Top Card's range.")
    })
  })
})

// The Signature earn vocabulary (ADR 0037). Before this, a standing clause
// could only fire on the Hero taking damage, so every Signature the game
// could print was a Warden's. These tests are the other three earns actually
// firing — the catalog change alone would pass without them.
describe('the Signature earn vocabulary (ADR 0037)', () => {
  const SIG = (standing: unknown[], overrides: Record<string, unknown> = {}) => ({
    id: 'probe_sig',
    title: 'Probe Sig',
    speed: 'quick',
    fixed: true,
    range_tiles: 1,
    boss_damage: 1,
    max_charge: 2,
    standing,
    ...overrides,
  })

  function arena(standing: unknown[]) {
    return buildCatalog({
      cards: [...CARDS, SIG(standing)],
      heroes: [
        { id: 'warden', title: 'Warden', max_health: 20 },
        { id: 'mender', title: 'Mender', max_health: 12, signature_card: 'probe_sig' },
      ],
      keywords: KEYWORDS,
      counters: COUNTERS,
      chargeModifiers: [],
      hazards: [],
      minions: [],
      programs: [{ id: 'probe_program', title: 'Probe Program', instant_beats: [], incoming_beats: [] }],
      encounters: [
        {
          id: 'probe_party',
          title: 'Probe Party',
          party: [
            { hero: 'warden', start: { q: 0, r: 0 }, deck: [{ card: 'tank_strike', copies: 6 }] },
            { hero: 'mender', start: { q: 1, r: 0 }, deck: [{ card: 'healer_strike', copies: 6 }] },
          ],
          boss_id: 'probe_boss',
          boss_title: 'Probe Boss',
          round_limit: 6,
          board_radius: 3,
          boss_start: { q: 0, r: -3 },
          boss_health: 40,
          slot_count: 2,
          hand_refill_target: 4,
          player_deck: [{ card: 'tank_strike', copies: 4 }],
          boss_programs: ['probe_program'],
          random_seed: 7,
        },
      ],
    })
  }

  // The Mender's Signature Slot is the one appended after the two dealt Slots.
  const signatureSlot = (state: EncounterState) => state.heroes.mender.actionBar[2]

  it('earns on dealing damage — the offensive machine the Bond needs', () => {
    const catalog = arena([{ when: 'host_deals_damage', gates: ['effect_landed'], grants_charge: 1 }])
    const state = createEncounterState(catalog, 'probe_party')
    expect(signatureSlot(state).earnedCharges).toBe(0)
    const after = resolve(catalog, state, {
      kind: 'damage', sourceId: 'mender', targetId: 'probe_boss', amount: 3, reasonText: 'probe',
    })
    expect(signatureSlot(after.state).earnedCharges).toBe(1)
  })

  it('refuses that earn when the blow landed nothing', () => {
    const catalog = arena([{ when: 'host_deals_damage', gates: ['effect_landed'], grants_charge: 1 }])
    const state = createEncounterState(catalog, 'probe_party')
    const after = resolve(catalog, state, {
      kind: 'damage', sourceId: 'mender', targetId: 'probe_boss', amount: 0, reasonText: 'probe',
    })
    expect(signatureSlot(after.state).earnedCharges).toBe(0)
  })

  it('earns on firing a Slot, and refuses a fire that did nothing', () => {
    const catalog = arena([{ when: 'slot_fired', gates: ['effect_landed'], grants_charge: 1 }])
    const state = createEncounterState(catalog, 'probe_party')
    state.phase = 'quick'
    // Within reach of the Boss, because `healer_strike` deals Boss damage and
    // every ability carries a reach (D-073). This test is about the earn, not
    // about the distance — fired from the mender's seat it would be refused
    // before the standing clause ever ran.
    const bossCoords = state.board.entities[state.bossId].coords
    state.board.entities.mender.coords = neighbors(state.board.hexes, bossCoords).find(
      (coords) => getEntityIdAt(state.board, coords) === '',
    )!
    state.heroes.mender.actionBar[0].topCard = { instanceId: 'strike_probe', cardId: 'healer_strike' }
    state.heroes.mender.actionBar[0].charges = [{ instanceId: 'fuel_probe', cardId: 'healer_strike' }]
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: 'mender', slotIndex: 0 })
    expect(signatureSlot(fired.state).earnedCharges).toBe(1)

    // A card whose every effect field is zero earns nothing: the gate is what
    // stops a tempo earn being farmed by firing into empty air.
    const idle = createEncounterState(catalog, 'probe_party')
    idle.phase = 'quick'
    idle.heroes.mender.actionBar[0].topCard = { instanceId: 'posture_probe', cardId: 'posture' }
    idle.heroes.mender.actionBar[0].charges = [{ instanceId: 'fuel_probe', cardId: 'healer_strike' }]
    const empty = resolve(catalog, idle, { kind: 'fire_slot', sourceId: 'mender', slotIndex: 0 })
    expect(empty.facts[0].succeeded).toBe(true)
    expect(signatureSlot(empty.state).earnedCharges).toBe(0)
  })

  it('earns on the Round start — the clock-shaped accrual', () => {
    const catalog = arena([{ when: 'round_start', grants_charge: 1 }])
    const state = createEncounterState(catalog, 'probe_party')
    const after = resolve(catalog, state, { kind: 'round_start', sourceId: ENCOUNTER_SOURCE, round: 2 })
    expect(signatureSlot(after.state).earnedCharges).toBe(1)
    // And it still respects the cap: a third Round start over a cap of 2
    // banks nothing more.
    let running = after.state
    for (const round of [3, 4]) {
      running = resolve(catalog, running, { kind: 'round_start', sourceId: ENCOUNTER_SOURCE, round }).state
    }
    expect(signatureSlot(running).earnedCharges).toBe(2)
  })
})

// The zero-health lifecycle (ADR 0036). Downed while a rescue is possible,
// Incapacitated when it is not, and never removed from play.
describe('the zero-health lifecycle (ADR 0036)', () => {
  function wounded() {
    const catalog = party()
    const state = createEncounterState(catalog, 'probe_party')
    return { catalog, state }
  }

  // Put the Mender on the floor without ending the fight.
  function downTheMender(catalog: ContentCatalog, state: EncounterState) {
    state.heroes.mender.health = 2
    return resolve(catalog, state, {
      kind: 'damage', sourceId: 'probe_boss', targetId: 'mender', amount: 5, reasonText: 'probe',
    }).state
  }

  it('sends a Hero at zero Downed instead of ending the Encounter', () => {
    const { catalog, state } = wounded()
    const after = downTheMender(catalog, state)
    expect(after.heroes.mender.status).toBe('downed')
    expect(after.heroes.mender.downedRound).toBe(after.round)
    expect(after.active).toBe(true)
    expect(after.outcome).toBe('ongoing')
    // The body stays on the board, keeping its hex and its Counters.
    expect(after.board.entities.mender).toBeDefined()
  })

  it('still ends the Encounter when the whole Party is out', () => {
    const { catalog, state } = wounded()
    const downed = downTheMender(catalog, state)
    downed.heroes.warden.health = 1
    const wiped = resolve(catalog, downed, {
      kind: 'damage', sourceId: 'probe_boss', targetId: 'warden', amount: 5, reasonText: 'probe',
    }).state
    expect(wiped.active).toBe(false)
    expect(wiped.outcome).toBe('defeat')
    expect(wiped.outcomeReason).toBe('The Party has fallen.')
  })

  it('answers no demand while Downed', () => {
    const { catalog, state } = wounded()
    const after = downTheMender(catalog, state)
    expect(livingHeroIds(after)).toEqual(['warden'])
    expect(isLivingHero(after.heroes.mender)).toBe(false)
    // The Boss cannot aim at a body even when it asks for that Role.
    expect(selectBeatTarget(catalog, after, beat({ target_selector: 'healer' })).heroId).toBe('warden')
  })

  it('revives on an adjacent ally spending a card, at the authored fraction', () => {
    const { catalog, state } = wounded()
    const after = downTheMender(catalog, state)
    // The Warden starts adjacent to the Mender.
    const card = after.heroes.warden.hand[0]
    const revived = resolve(catalog, after, {
      kind: 'revive_ally', sourceId: 'warden', targetId: 'mender', cardInstanceId: card.instanceId,
    })
    expect(revived.facts[0].succeeded).toBe(true)
    expect(revived.state.heroes.mender.status).toBe('living')
    // 25% of 12, rounded up.
    expect(revived.state.heroes.mender.health).toBe(3)
    expect(revived.state.heroes.warden.hand.some((c) => c.instanceId === card.instanceId)).toBe(false)
  })

  it('refuses a rescue from out of reach, and of a Hero who is not Downed', () => {
    const { catalog, state } = wounded()
    const after = downTheMender(catalog, state)
    after.board.entities.warden.coords = { q: -3, r: 3 }
    const card = after.heroes.warden.hand[0]
    const far = resolve(catalog, after, {
      kind: 'revive_ally', sourceId: 'warden', targetId: 'mender', cardInstanceId: card.instanceId,
    })
    expect(far.facts[0].reason).toBe('You must be adjacent to the Downed ally.')

    const healthy = resolve(catalog, state, {
      kind: 'revive_ally', sourceId: 'warden', targetId: 'mender', cardInstanceId: state.heroes.warden.hand[0].instanceId,
    })
    expect(healthy.facts[0].reason).toBe('That ally is not Downed.')
  })

  it('incapacitates when the window actually expires, charging Escalation', () => {
    const { catalog, state } = wounded()
    let running = downTheMender(catalog, state)
    const deadline = rescueDeadlineRound(running.heroes.mender)
    const escalationBefore = running.escalation
    let charged = false

    // Walk real Round boundaries rather than submitting the transition by
    // hand: the rule under test is *when* the window closes.
    let guard = 0
    while (running.active && running.heroes.mender.status === 'downed' && guard < 40) {
      const stepped = advancePhase(catalog, running)
      running = stepped.state
      if (stepped.facts.some((f) => f.kind === 'gain_escalation' && (f.detail as { reason?: string }).reason === 'unanswered_rescue')) {
        charged = true
      }
      guard += 1
    }

    expect(running.heroes.mender.status).toBe('incapacitated')
    // Rescuable through the deadline Round; gone once the next one opens.
    expect(running.round).toBeGreaterThan(deadline)
    expect(charged).toBe(true)
    expect(running.escalation).toBeGreaterThan(escalationBefore)
    // Off the board, cards gone, deck silent, Counters dropped with the body.
    expect(running.board.entities.mender).toBeUndefined()
    expect(running.heroes.mender.hand).toEqual([])
    expect(running.heroes.mender.deck).toEqual([])
    expect(running.counters['combatant:mender']).toBeUndefined()
  })

  it('lets an Incapacitated Hero act, and never on the Boss', () => {
    const { catalog, state } = wounded()
    const downed = downTheMender(catalog, state)
    const out = resolve(catalog, downed, { kind: 'incapacitate_hero', sourceId: 'mender' }).state
    out.heroes.warden.armor = 0

    const armored = resolve(catalog, out, {
      kind: 'diminished_action', sourceId: 'mender', action: 'grant_ally_armor', targetId: 'warden',
    })
    expect(armored.facts[0].succeeded).toBe(true)
    expect(armored.state.heroes.warden.armor).toBe(1)
    // The Boss's health is untouched by every diminished action.
    expect(armored.state.board.entities.probe_boss.health).toBe(out.board.entities.probe_boss.health)

    const withEscalation = { ...out, escalation: 2 }
    const reduced = resolve(catalog, withEscalation, {
      kind: 'diminished_action', sourceId: 'mender', action: 'reduce_escalation',
    })
    expect(reduced.state.escalation).toBe(1)
    expect(DIMINISHED_ACTIONS).toHaveLength(3)
  })

  it('refuses a diminished action from a Hero who is still standing', () => {
    const { catalog, state } = wounded()
    const refused = resolve(catalog, state, {
      kind: 'diminished_action', sourceId: 'warden', action: 'reduce_escalation',
    })
    expect(refused.facts[0].reason).toBe('Only an Incapacitated Hero takes a diminished action.')
  })

  // The exploit ADR 0036 names by hand: a Downed body still occupies its hex,
  // so without the living-only filter a Party could park a corpse beside the
  // Boss and dodge the D-041 charge for the rest of the fight.
  it('does not let a parked corpse answer the proximity demand', () => {
    const catalog = buildCatalog({
      cards: CARDS,
      heroes: [
        { id: 'warden', title: 'Warden', max_health: 20 },
        { id: 'mender', title: 'Mender', max_health: 12 },
      ],
      keywords: KEYWORDS,
      counters: COUNTERS,
      chargeModifiers: [],
      hazards: [],
      minions: [],
      programs: [
        {
          id: 'probe_program',
          title: 'Probe Program',
          instant_beats: [],
          incoming_beats: [
            {
              id: 'within_reach',
              title: 'Within Reach',
              kind: 'demand_proximity',
              range_tiles: 1,
              escalation_if_unanswered: 1,
              consequence_tier: 'severe',
              rules_text: 'Stand close, or the clock moves.',
            },
          ],
        },
      ],
      encounters: [
        {
          id: 'probe_party',
          title: 'Probe Party',
          party: [
            { hero: 'warden', start: { q: 0, r: 0 }, deck: [{ card: 'tank_strike', copies: 6 }] },
            { hero: 'mender', start: { q: 1, r: 0 }, deck: [{ card: 'healer_strike', copies: 6 }] },
          ],
          boss_id: 'probe_boss',
          boss_title: 'Probe Boss',
          round_limit: 6,
          board_radius: 3,
          boss_start: { q: 0, r: -3 },
          boss_health: 40,
          slot_count: 2,
          hand_refill_target: 4,
          player_deck: [{ card: 'tank_strike', copies: 4 }],
          boss_programs: ['probe_program'],
          random_seed: 7,
        },
      ],
    })
    const state = createEncounterState(catalog, 'probe_party')
    // The Mender goes down standing right beside the Boss; the Warden stays
    // well out of reach.
    state.heroes.mender.health = 2
    const downed = resolve(catalog, state, {
      kind: 'damage', sourceId: 'probe_boss', targetId: 'mender', amount: 5, reasonText: 'probe',
    }).state
    expect(downed.heroes.mender.status).toBe('downed')
    downed.board.entities.mender.coords = { q: 0, r: -2 }
    downed.board.entities.warden.coords = { q: 0, r: 3 }

    const charges = escalationActionsForRoundEnd(catalog, downed)
    expect(charges.some((a) => a.kind === 'gain_escalation' && a.reason === 'unanswered_proximity')).toBe(true)

    // And a living Hero standing there does answer it.
    downed.board.entities.warden.coords = { q: 0, r: -2 }
    downed.board.entities.mender.coords = { q: 0, r: 3 }
    const answered = escalationActionsForRoundEnd(catalog, downed)
    expect(answered.some((a) => a.kind === 'gain_escalation' && a.reason === 'unanswered_proximity')).toBe(false)
  })

  it('revives at the fraction the Encounter authors, not a compiled-in one', () => {
    const catalog = party({ revive_health_fraction: 0.5 })
    const state = createEncounterState(catalog, 'probe_party')
    const downed = downTheMender(catalog, state)
    const card = downed.heroes.warden.hand[0]
    const revived = resolve(catalog, downed, {
      kind: 'revive_ally', sourceId: 'warden', targetId: 'mender', cardInstanceId: card.instanceId,
    })
    // Half of 12, not the 0.25 default.
    expect(revived.state.heroes.mender.health).toBe(6)
  })

  it('keeps a solo Hero at zero an immediate defeat', () => {
    const catalog = party({ party: [{ hero: 'warden', start: { q: 0, r: 0 }, deck: [{ card: 'tank_strike', copies: 6 }] }] })
    const state = createEncounterState(catalog, 'probe_party')
    state.heroes.warden.health = 1
    const after = resolve(catalog, state, {
      kind: 'damage', sourceId: 'probe_boss', targetId: 'warden', amount: 5, reasonText: 'probe',
    }).state
    // Nobody could ever perform the rescue, so the window would be a loss the
    // screen had not admitted yet.
    expect(after.heroes.warden.status).toBe('living')
    expect(after.active).toBe(false)
    expect(after.outcomeReason).toBe('A Hero has fallen.')
  })
})
