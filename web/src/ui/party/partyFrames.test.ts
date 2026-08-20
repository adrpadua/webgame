import { describe, expect, it } from 'vitest'
import { buildCatalog, createEncounterState, resolve, type ContentCatalog, type EncounterState } from '@/engine'
import { partyFrames, primaryHasThreat } from './partyFrames'

// The ally frame's state, proved against the same hand-built two-seat fixture
// the engine's party tests use — the authored Encounters are solo, and a
// frame test that depended on them would fail for content reasons the moment
// the Ashen Trial is retuned.

const KEYWORDS = [
  { id: 'tank', title: 'Tank', kind: 'role' },
  { id: 'healer', title: 'Healer', kind: 'role' },
  { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
  { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
  { id: 'overflow', title: 'Overflow', kind: 'trait' },
]

const CARDS = [
  { id: 'tank_strike', title: 'Tank Strike', speed: 'quick', range_tiles: 1, boss_damage: 1, tags: ['tank'] },
  { id: 'healer_strike', title: 'Healer Strike', speed: 'quick', range_tiles: 1, boss_damage: 1, tags: ['healer'] },
  {
    id: 'mender_bond',
    title: 'Bond',
    speed: 'quick',
    fixed: true,
    max_charge: 2,
    range_tiles: 1,
    boss_damage: 2,
    tags: ['healer'],
    standing: [{ when: 'round_start', gates: [], grants_charge: 1 }],
  },
]

function fixture(overrides: Record<string, unknown> = {}): ContentCatalog {
  return buildCatalog({
    cards: CARDS,
    heroes: [
      { id: 'warden', title: 'Warden', max_health: 20 },
      { id: 'mender', title: 'Mender', max_health: 12, signature_card: 'mender_bond' },
    ],
    keywords: KEYWORDS,
    counters: [],
    bosses: [{ id: 'probe_boss', title: 'Probe Boss', max_health: 40 }],
    chargeModifiers: [],
    hazards: [],
    minions: [],
    programs: [
      {
        id: 'probe_program',
        title: 'Probe Program',
        instant_beats: [
          {
            id: 'probe_hit',
            title: 'Probe Hit',
            kind: 'targeted_hit',
            range_tiles: 9,
            damage: 3,
            consequence_tier: 'chip',
            target_selector: 'healer',
          },
        ],
        incoming_beats: [],
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
        boss: 'probe_boss',
        round_limit: 6,
        board_radius: 3,
        boss_start: { q: 0, r: -3 },
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

function downTheMender(catalog: ContentCatalog, state: EncounterState): EncounterState {
  state.heroes.mender.health = 2
  return resolve(catalog, state, {
    kind: 'damage', sourceId: 'probe_boss', targetId: 'mender', amount: 5, reasonText: 'probe',
  }).state
}

describe('the ally frames (party-frame direction 1A)', () => {
  it('lists every seat but the primary, in authored order, with Role and health', () => {
    const catalog = fixture()
    const state = createEncounterState(catalog, 'probe_party')
    const frames = partyFrames(catalog, state)
    expect(frames.map((frame) => frame.heroId)).toEqual(['mender'])
    expect(frames[0]).toMatchObject({
      name: 'Mender',
      role: 'healer',
      status: 'living',
      health: 12,
      maxHealth: 12,
      revivable: false,
    })
  })

  it('marks the Boss attention on the Hero the current program selects', () => {
    const catalog = fixture()
    const state = createEncounterState(catalog, 'probe_party')
    // The program's one Beat aims at the Healer, by the same selection the
    // Beat itself will run — so the mark and the blow can never disagree.
    expect(partyFrames(catalog, state)[0].threat).toBe(true)
    expect(primaryHasThreat(catalog, state)).toBe(false)
  })

  it('reads the ally Signature bank off the fixed Slot', () => {
    const catalog = fixture()
    const state = createEncounterState(catalog, 'probe_party')
    const frame = partyFrames(catalog, state)[0]
    expect(frame.signatureCap).toBe(2)
    expect(frame.signatureCharges).toBe(0)
  })

  it('offers the rescue only from adjacency, through the engine legality predicate', () => {
    const catalog = fixture()
    const state = createEncounterState(catalog, 'probe_party')
    const downed = downTheMender(catalog, state)
    // Seats start adjacent, so the fall itself makes the frame the button.
    const frame = partyFrames(catalog, downed)[0]
    expect(frame.status).toBe('downed')
    expect(frame.revivable).toBe(true)
    expect(frame.rescueRoundsLeft).toBe(1)
    // Step the Warden out of reach and the same frame goes back to a readout:
    // the answer comes from `legality`, never a parallel adjacency rule.
    downed.board.entities.warden.coords = { q: -2, r: 0 }
    expect(partyFrames(catalog, downed)[0].revivable).toBe(false)
  })

  it('refuses the rescue with an empty hand — the cost is a card', () => {
    const catalog = fixture()
    const state = createEncounterState(catalog, 'probe_party')
    const downed = downTheMender(catalog, state)
    downed.heroes.warden.hand = []
    expect(partyFrames(catalog, downed)[0].revivable).toBe(false)
  })
})
