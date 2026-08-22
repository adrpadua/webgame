import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import {
  buildCatalog,
  createEncounterState,
  fireTargeting,
  legalActions,
  legality,
  parseHexKey,
  type Card,
  type EncounterState,
  type FireTargeting,
  type PlayerCommandInput,
} from '@/engine'

// The target-family contract matrix (engine-hardening follow-up, P0). The
// schema declares five target families; for each one, every fire the rules
// would accept must be enumerated, because `legalActions` is the complete
// legal player action space the UI, AI, hints, and simulation all read. The
// defect this guards against was a family (`ally`) that legality accepted and
// enumeration silently dropped: Maren's whole kit answered "legal" to
// `legality()` and "nothing to play" to `legalActions()`.
//
// `MODE_FOR_FAMILY` is the compile-time half of the guard: it is a Record
// over `Card['target_type']`, so adding a family to the schema refuses to
// compile until this matrix decides its enumeration. The runtime half is the
// set-equality test below — enumerated fires must equal legality-legal fires,
// family by family, with no family passing vacuously.

const shipped = loadCatalog()

const MODE_FOR_FAMILY: Record<Card['target_type'], FireTargeting['mode']> = {
  none: 'none',
  piece: 'piece',
  hex: 'hex',
  ally: 'ally',
  board_slot: 'board_slot',
}

// One fixture card per family, each of which the rules can actually accept
// somewhere on the probe board — a family whose legal set came back empty
// would prove nothing about enumeration.
const FAMILY_CARD: Record<Card['target_type'], string> = {
  none: 'plain',
  piece: 'shover',
  hex: 'grounder',
  ally: 'cover',
  board_slot: 'rider',
}

const fixture = buildCatalog({
  cards: [
    { id: 'plain', title: 'Plain', speed: 'quick', target_type: 'none', draw_count: 1, tags: ['tank'] },
    { id: 'shover', title: 'Shover', speed: 'quick', target_type: 'piece', push_tiles: 1, range_tiles: 2, tags: ['tank'] },
    { id: 'grounder', title: 'Grounder', speed: 'quick', target_type: 'hex', range_tiles: 2, tags: ['tank'] },
    { id: 'cover', title: 'Cover', speed: 'quick', target_type: 'ally', armor_delta: 1, range_tiles: 2, tags: ['tank'] },
    { id: 'rider', title: 'Rider', speed: 'quick', target_type: 'board_slot', tags: ['tank'] },
    { id: 'fuel', title: 'Fuel', speed: 'quick', boss_damage: 1, range_tiles: 3, tags: ['tank'] },
  ],
  heroes: [
    { id: 'warden', title: 'Warden', max_health: 20 },
    { id: 'aria', title: 'Aria', max_health: 20 },
    { id: 'zeke', title: 'Zeke', max_health: 20 },
  ],
  keywords: [
    { id: 'tank', title: 'Tank', kind: 'role' },
    { id: 'overflow', title: 'Overflow', kind: 'trait' },
    { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
    { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
  ],
  counters: [],
  bosses: [{ id: 'probe_boss', title: 'Probe Boss', max_health: 40 }],
  chargeModifiers: [],
  hazards: [],
  minions: [],
  programs: [{ id: 'probe_program', title: 'Probe Program', instant_beats: [], incoming_beats: [] }],
  encounters: [
    {
      id: 'probe_matrix',
      title: 'Probe Matrix',
      party: [{ hero: 'warden', start: { q: 0, r: 0 } }],
      boss: 'probe_boss',
      round_limit: 6,
      board_radius: 2,
      boss_start: { q: 1, r: 0 },
      slot_count: 2,
      hand_refill_target: 4,
      player_deck: [
        { card: 'plain', copies: 1 },
        { card: 'shover', copies: 1 },
        { card: 'grounder', copies: 1 },
        { card: 'cover', copies: 1 },
        { card: 'rider', copies: 1 },
        { card: 'fuel', copies: 4 },
      ],
      boss_programs: ['probe_program'],
      random_seed: 7,
    },
    {
      id: 'probe_pair',
      title: 'Probe Pair',
      party: [
        { hero: 'aria', start: { q: 0, r: 0 } },
        { hero: 'zeke', start: { q: 0, r: -2 } },
      ],
      boss: 'probe_boss',
      round_limit: 6,
      board_radius: 2,
      boss_start: { q: 1, r: 0 },
      slot_count: 2,
      hand_refill_target: 4,
      player_deck: [
        { card: 'rider', copies: 2 },
        { card: 'fuel', copies: 6 },
      ],
      boss_programs: ['probe_program'],
      random_seed: 7,
    },
  ],
})

// Stage the family's card charged in Slot 0 during the Quick Window. The
// board_slot family also needs somewhere to attach, so Slot 1 gets a prepared
// card of its own.
function staged(cardId: string): { state: EncounterState; heroId: string } {
  const state = createEncounterState(fixture, 'probe_matrix')
  const heroId = state.primaryHeroId
  const hero = state.heroes[heroId]
  const pool = hero.deck.concat(hero.hand)
  const top = pool.find((card) => card.cardId === cardId)!
  const charge = hero.hand.find((card) => card.instanceId !== top.instanceId)!
  hero.actionBar[0] = { topCard: top, charges: [charge], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
  if (cardId === FAMILY_CARD.board_slot) {
    const second = pool.find((card) => card.cardId === 'fuel' && card.instanceId !== charge.instanceId)!
    hero.actionBar[1] = { topCard: second, charges: [], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
  }
  state.phase = 'quick'
  return { state, heroId }
}

// Every payload shape a family could name, legal or not: the matrix filters
// these through `legality()` and demands the enumeration match exactly. The
// candidate order mirrors the enumeration's own (hex-key order for ground,
// sorted entity ids for pieces and allies, bar order for Slots) so the
// comparison is `toEqual`, not set arithmetic.
function candidates(family: Card['target_type'], state: EncounterState, heroId: string): PlayerCommandInput[] {
  const base = { kind: 'fire_slot' as const, sourceId: heroId, slotIndex: 0 }
  switch (family) {
    case 'none':
      return [base]
    case 'piece':
    case 'ally':
      return Object.keys(state.board.entities)
        .sort()
        .map((targetId) => ({ ...base, targetId }))
    case 'hex':
      return Object.keys(state.board.hexes)
        .map(parseHexKey)
        .map((targetHex) => ({ ...base, targetHex }))
    case 'board_slot':
      return [
        { ...base, targetSlot: { heroId, slotIndex: 0 } },
        { ...base, targetSlot: { heroId, slotIndex: 1 } },
        { ...base, targetSlot: { heroId, slotIndex: 2 } },
        { ...base, targetSlot: { heroId: 'nobody', slotIndex: 0 } },
      ]
  }
}

describe('the target-family contract matrix', () => {
  for (const family of Object.keys(MODE_FOR_FAMILY) as Array<Card['target_type']>) {
    it(`${family}: every legality-legal fire is enumerated, and nothing else`, () => {
      const { state, heroId } = staged(FAMILY_CARD[family])
      const targeting = fireTargeting(fixture, state, heroId, 0)
      expect(targeting.mode).toBe(MODE_FOR_FAMILY[family])
      const legalSet = candidates(family, state, heroId).filter((action) => legality(fixture, state, action).legal)
      expect(legalSet.length, `${family}: the fixture must admit at least one legal fire, or this row proves nothing`).toBeGreaterThan(0)
      const enumerated = legalActions(fixture, state, heroId).filter(
        (action) => action.kind === 'fire_slot' && action.slotIndex === 0,
      )
      expect(enumerated).toEqual(legalSet)
    })
  }

  it('board_slot: only prepared Slots are offered', () => {
    const { state, heroId } = staged(FAMILY_CARD.board_slot)
    state.heroes[heroId].actionBar[1].topCard = null
    const targeting = fireTargeting(fixture, state, heroId, 0)
    // Slot 0 still holds the rider itself; the emptied Slot 1 is gone.
    expect(targeting.legalSlots).toEqual([{ heroId, slotIndex: 0 }])
    const enumerated = legalActions(fixture, state, heroId).filter(
      (action) => action.kind === 'fire_slot' && action.slotIndex === 0,
    )
    expect(enumerated).toEqual([{ kind: 'fire_slot', sourceId: heroId, slotIndex: 0, targetSlot: { heroId, slotIndex: 0 } }])
  })

  it("board_slot: an ally's prepared Slot is addressable from anywhere — support is adjacency-free (D-009)", () => {
    // Aria and Zeke start two hexes apart, and the rider authors no range:
    // the Slot identity carries the owner (the shape decision), while the
    // ruling that support needs no footwork stands untouched.
    const state = createEncounterState(fixture, 'probe_pair')
    const aria = state.heroes.aria
    const pool = aria.deck.concat(aria.hand)
    const top = pool.find((card) => card.cardId === 'rider')!
    const charge = aria.hand.find((card) => card.instanceId !== top.instanceId)!
    aria.actionBar[0] = { topCard: top, charges: [charge], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
    const zekeCard = state.heroes.zeke.hand[0]
    state.heroes.zeke.actionBar[1] = { topCard: zekeCard, charges: [], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
    state.phase = 'quick'

    const targeting = fireTargeting(fixture, state, 'aria', 0)
    // Aria's own rider Slot and Zeke's prepared Slot 1, in party-then-bar order.
    expect(targeting.legalSlots).toEqual([
      { heroId: 'aria', slotIndex: 0 },
      { heroId: 'zeke', slotIndex: 1 },
    ])
    expect(legality(fixture, state, { kind: 'fire_slot', sourceId: 'aria', slotIndex: 0, targetSlot: { heroId: 'zeke', slotIndex: 1 } }).legal).toBe(true)
    expect(legality(fixture, state, { kind: 'fire_slot', sourceId: 'aria', slotIndex: 0, targetSlot: { heroId: 'zeke', slotIndex: 0 } }).legal).toBe(false)
  })
})

describe('the shipped Maren path', () => {
  // The defect's reproduction from the follow-up handoff: a prepared Braced
  // Escort answered "legal" to `legality()` aimed at Elian and "nothing to
  // play" to `legalActions()`. The contract protects the real kit, not only
  // the synthetic catalog.
  function marenWithEscort(): EncounterState {
    const state = createEncounterState(shipped, 'embermaw_attrition_trial')
    const maren = state.heroes.maren
    const pool = maren.deck.concat(maren.hand)
    const escort = pool.find((card) => card.cardId === 'braced_escort')!
    const charge = maren.hand.find((card) => card.instanceId !== escort.instanceId)!
    maren.actionBar[0] = { topCard: escort, charges: [charge], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 }
    state.phase = 'quick'
    return state
  }

  function escortFires(state: EncounterState): PlayerCommandInput[] {
    return legalActions(shipped, state, 'maren').filter((action) => action.kind === 'fire_slot' && action.slotIndex === 0)
  }

  it('a prepared Braced Escort enumerates a fire for each legal ally, self-cover included', () => {
    const state = marenWithEscort()
    expect(legality(shipped, state, { kind: 'fire_slot', sourceId: 'maren', slotIndex: 0, targetId: 'elian' }).legal).toBe(true)
    expect(escortFires(state)).toEqual([
      { kind: 'fire_slot', sourceId: 'maren', slotIndex: 0, targetId: 'elian' },
      { kind: 'fire_slot', sourceId: 'maren', slotIndex: 0, targetId: 'maren' },
    ])
  })

  it('a Downed ally drops out of the enumeration', () => {
    const state = marenWithEscort()
    state.heroes.elian.status = 'downed'
    state.heroes.elian.health = 0
    state.board.entities.elian.health = 0
    expect(escortFires(state)).toEqual([{ kind: 'fire_slot', sourceId: 'maren', slotIndex: 0, targetId: 'maren' }])
  })
})
