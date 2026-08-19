import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { cardSchema } from './content/schemas'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import { escalationActionsForRoundEnd } from './escalation'
import {
  advancePhase,
  buildCatalog,
  combatantRef,
  programAnswerTags,
  hexCounterRef,
  slotRef,
  buildEncounterRecord,
  contentIdentity,
  createEncounterState,
  fireTargeting,
  hexDistance,
  hexKey,
  isGuardedFront,
  legality,
  minionIntents,
  replayRecord,
  ESCALATION_MAX,
  escalationModifiers,
  escalationStartRound,
  highestTier,
  programPredictability,
  resolve,
  runScenario,
  type EncounterState,
  type ResolvedActionFact,
  type Scenario,
} from '@/engine'

const catalog = loadCatalog()

function start(seed?: number): EncounterState {
  return createEncounterState(catalog, 'embermaw_prototype', seed)
}

function hero(state: EncounterState) {
  return state.heroes[state.primaryHeroId]
}

function boss(state: EncounterState) {
  return state.board.entities[state.bossId]
}

// Tests may fabricate hand and Slot contents: the engine reads card identity
// from the content catalog, and instances are plain data.
function card(instanceId: string, cardId: string) {
  return { instanceId, cardId }
}

// A Hero who cannot die of attrition, for tests about clocks and rotation
// rather than about survival.
function immortalHero(state: EncounterState): EncounterState {
  state.heroes[state.primaryHeroId].maxHealth = 5000
  state.heroes[state.primaryHeroId].health = 5000
  return state
}

// The Boss's program order is rolled from the seed (D-037), and the pinned
// opener never calls Whelps — so a test that needs Whelps has to ask for a seed
// that produces them early rather than assume Round 1 does. Seed 3 puts Brood
// Pattern second, the earliest a Brood Call can land.
const BROOD_SECOND_SEED = 3

function startBroodSecond(): EncounterState {
  const state = start(BROOD_SECOND_SEED)
  // Guard the fixture here so a bag-ordering change fails in one obvious place
  // rather than in whichever Whelp test happens to run first.
  expect(state.programSequence[1]).toBe('embermaw_brood')
  return state
}

function stepPhases(state: EncounterState, count: number): { state: EncounterState; facts: ResolvedActionFact[] } {
  let current = state
  const facts: ResolvedActionFact[] = []
  for (let index = 0; index < count; index += 1) {
    const result = advancePhase(catalog, current)
    current = result.state
    facts.push(...result.facts)
  }
  return { state: current, facts }
}

describe('content catalog', () => {
  // Presence, not census. A count or an exhaustive id list turns "a designer
  // authored a new card" into a failing suite, which teaches the design team
  // that adding content breaks the build. What the engine actually depends on
  // is that the content it names is *there* and still says what it said.
  it('loads and validates the full content port from data/', () => {
    expect(Object.keys(catalog.cards)).toEqual(
      expect.arrayContaining(['steady_strike', 'iron_guard', 'sweeping_blow', 'fortify', 'shield_slam']),
    )
    expect(Object.keys(catalog.keywords)).toEqual(expect.arrayContaining(['guard', 'attack', 'tank']))
    expect(Object.keys(catalog.programs)).toEqual(
      expect.arrayContaining([
        'embermaw_ashfall',
        'embermaw_brood',
        'embermaw_embers',
        'embermaw_hunt',
        'embermaw_molting',
      ]),
    )
    expect(catalog.programs.embermaw_hunt.instant_beats.map((beat) => beat.kind)).toEqual([
      'turn_toward_player',
      'advance_toward_player',
      'targeted_hit',
      'hazard_last_impact',
    ])
    expect(catalog.programs.embermaw_embers.instant_beats.map((beat) => beat.kind)).toEqual([
      'turn_toward_player',
      'place_counter',
      'hazard_last_impact',
    ])
    expect(catalog.encounters.embermaw_prototype.boss_programs).toEqual(['embermaw_hunt', 'embermaw_embers', 'embermaw_brood'])
    // The live Shield Wall list, named rather than counted (D-040). A total of
    // twenty says nothing about which twenty, and this deck has now been
    // restated twice — `10x/10x`, then proposal 04's `8/6/2/2/2`, now this —
    // with prose in three documents claiming to be current each time. Changing
    // it here is the reminder to change `elian-voss-design.md` and the decision
    // log with it.
    expect(
      Object.fromEntries(catalog.encounters.embermaw_prototype.player_deck.map((entry) => [entry.card, entry.copies])),
    ).toEqual({
      steady_strike: 6,
      iron_guard: 6,
      sweeping_blow: 2,
      fortify: 2,
      shield_slam: 2,
      drive_back: 2,
    })
    expect(catalog.encounters.embermaw_prototype.player_deck.reduce((total, entry) => total + entry.copies, 0)).toBe(20)
    expect(catalog.decks.aegis_controlled_test_deck.encounter).toBe('embermaw_prototype')
    expect(catalog.cards.steady_strike.draw_count).toBe(0)
  })

  // ADR 0022 removed Presence. The schema strips keys it does not declare
  // rather than rejecting them, so a card reintroducing the stat would load
  // silently and carry a field nothing reads — which is how a deleted
  // concept comes back. Pin both halves: no card declares it, and a card
  // that tries does not keep it.
  it('carries no trace of Presence (ADR 0022)', () => {
    for (const card of Object.values(catalog.cards)) {
      expect(Object.keys(card).filter((key) => key.includes('presence'))).toEqual([])
    }
    const parsed = cardSchema.parse({
      id: 'presence_probe',
      title: 'Presence Probe',
      speed: 'quick',
      presence_delta: 2,
    })
    expect(parsed).not.toHaveProperty('presence_delta')
  })

  // The audience for a content error is a designer who edited a JSON file and
  // has never opened the parser. It has to name the file and the field.
  describe('validation errors', () => {
    // The smallest catalog the rules will accept: no content, but the
    // Keywords engine code names by id, because a catalog without those is
    // one where Riposte Ready can never be granted.
    const empty = {
      cards: [],
      keywords: [
        { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
        { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
      ],
      chargeModifiers: [],
      hazards: [],
      minions: [],
      programs: [],
      encounters: [],
    }

    it('names the file and every bad field', () => {
      const bad = {
        source: 'data/cards/probe_bulwark.json',
        payload: { id: 'probe_bulwark', title: 'Probe Bulwark', speed: 'instant', max_charge: 'two' },
      }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(
        /Invalid card in data\/cards\/probe_bulwark\.json — .*speed:.*max_charge:/s,
      )
    })

    it('falls back to the authored id when there is no file', () => {
      const bad = { id: 'probe_bulwark', title: 'Probe Bulwark', speed: 'instant' }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(/Invalid card in id "probe_bulwark" — speed:/)
    })

    it('names both files behind a duplicate id', () => {
      const entry = (source: string) => ({ source, payload: { id: 'guard', title: 'Guard', kind: 'trait' } })
      expect(() => buildCatalog({ ...empty, keywords: [entry('data/keywords/guard.json'), entry('data/keywords/guard_copy.json')] })).toThrow(
        'Duplicate keyword id "guard": defined in data/keywords/guard.json and again in data/keywords/guard_copy.json',
      )
    })

    it('rejects forced movement without a ranged piece target and names its file', () => {
      const bad = {
        source: 'data/cards/bulwark_shove.json',
        payload: { id: 'bulwark_shove', title: 'Bulwark Shove', speed: 'quick', push_tiles: 2 },
      }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(
        'Card bulwark_shove (data/cards/bulwark_shove.json) declares push_tiles but does not target a piece',
      )
    })

    it('rejects a card that declares both push and pull', () => {
      const bad = {
        source: 'data/cards/indecisive_shove.json',
        payload: {
          id: 'indecisive_shove',
          title: 'Indecisive Shove',
          speed: 'quick',
          target_type: 'piece',
          range_tiles: 1,
          push_tiles: 1,
          pull_tiles: 1,
        },
      }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(
        'Card indecisive_shove (data/cards/indecisive_shove.json) declares both push_tiles and pull_tiles',
      )
    })

    it('rejects forced movement with no authored range', () => {
      const bad = {
        source: 'data/cards/short_shove.json',
        payload: { id: 'short_shove', title: 'Short Shove', speed: 'quick', target_type: 'piece', push_tiles: 1 },
      }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(
        'Card short_shove (data/cards/short_shove.json) declares push_tiles but has range_tiles below 1',
      )
    })

    it('loads a data-only shove Card with no engine registration step', () => {
      const authored = {
        source: 'data/cards/bulwark_shove.json',
        payload: {
          id: 'bulwark_shove',
          title: 'Bulwark Shove',
          speed: 'quick',
          target_type: 'piece',
          range_tiles: 2,
          push_tiles: 1,
        },
      }
      expect(buildCatalog({ ...empty, cards: [authored] }).cards.bulwark_shove).toMatchObject({
        target_type: 'piece',
        range_tiles: 2,
        push_tiles: 1,
        pull_tiles: 0,
      })
    })

    // The four Keyword joins. `damage_keywords` is why this section
    // exists: the rules compare it against `tank_hit` to grant Riposte Ready,
    // and until it was catalogued a typo here disabled that Status Effect at
    // load with no error and every test still green.
    const keyword = (id: string, kind: string) => ({ source: `data/keywords/${id}.json`, payload: { id, title: id, kind } })
    const beatProgram = (beat: Record<string, unknown>) => ({
      source: 'data/boss_programs/probe.json',
      payload: {
        id: 'probe_program',
        title: 'Probe Program',
        instant_beats: [{ id: 'probe_beat', title: 'Probe Beat', kind: 'turn_toward_player', ...beat }],
        incoming_beats: [],
      },
    })

    it('rejects a Beat whose damage_keywords are not authored Keywords', () => {
      expect(() => buildCatalog({ ...empty, programs: [beatProgram({ damage_keywords: ['tank-hit'] })] })).toThrow(
        'Boss Beat probe_beat references unknown keyword tank-hit in damage_keywords',
      )
    })

    it('rejects a Keyword reference that resolves to the wrong kind', () => {
      // Spelled correctly, resolves, and is still nonsense: `guard` is a trait
      // a card carries, not a kind of blow a Beat lands.
      expect(() =>
        buildCatalog({
          ...empty,
          keywords: [...empty.keywords, keyword('guard', 'trait')],
          programs: [beatProgram({ damage_keywords: ['guard'] })],
        }),
      ).toThrow('Boss Beat probe_beat names guard in damage_keywords, but that Keyword is trait and damage_keywords takes damage_type')
    })

    it('rejects an unauthored counter tag and an unauthored target selector', () => {
      expect(() => buildCatalog({ ...empty, programs: [beatProgram({ answer_tags: ['Kill Adds'] })] })).toThrow(
        'Boss Beat probe_beat references unknown keyword Kill Adds in answer_tags',
      )
      expect(() => buildCatalog({ ...empty, programs: [beatProgram({ target_selector: 'tank' })] })).toThrow(
        'Boss Beat probe_beat references unknown keyword tank in target_selector',
      )
    })

    it('rejects a catalog missing a Keyword the rules name by id', () => {
      // The other half of the contract. Content may retitle a Keyword freely;
      // it may not rename one out from under the rules comparing against it.
      const withoutTankHit = { ...empty, keywords: empty.keywords.filter((entry) => entry.id !== 'tank_hit') }
      expect(() => buildCatalog(withoutTankHit)).toThrow(
        'The rules name Keyword tank_hit, which is not authored in data/keywords/',
      )
      const miskinded = { ...empty, keywords: [keyword('tank_hit', 'answer').payload, ...withoutTankHit.keywords] }
      expect(() => buildCatalog(miskinded)).toThrow(
        'The rules name Keyword tank_hit as damage_type, but it is authored as answer',
      )
    })

    // The Counter and Reader vocabulary. Every one of these is a way to
    // author something that looks like a mechanic and silently is not — the
    // exact failure mode D-047 exists to make loud.
    const counterEntry = (patch: Record<string, unknown>) => ({
      source: 'data/counters/probe.json',
      payload: { id: 'probe_counter', title: 'Probe Counter', readers: [{ when: 'round_start', effect: 'armor_gain', per: 1 }], ...patch },
    })
    const readerCard = (reader: Record<string, unknown>, patch: Record<string, unknown> = {}) => ({
      source: 'data/cards/probe_read.json',
      payload: { id: 'probe_read', title: 'Probe Read', speed: 'quick', target_type: 'piece', range_tiles: 1, damage: 1, reads: [reader], ...patch },
    })

    it('rejects a reader that names both a counter and a counter_keyword, or neither', () => {
      const both = readerCard({ verb: 'gate', counter: 'probe_counter', counter_keyword: 'guard', at_least: 1 })
      expect(() => buildCatalog({ ...empty, counters: [counterEntry({})], cards: [both] })).toThrow(
        'naming 2 of counter/counter_keyword; it must name exactly one',
      )
      const neither = readerCard({ verb: 'gate', at_least: 1 })
      expect(() => buildCatalog({ ...empty, counters: [counterEntry({})], cards: [neither] })).toThrow(
        'naming 0 of counter/counter_keyword; it must name exactly one',
      )
    })

    it('rejects a verb with none of its own numbers set', () => {
      const cases: [Record<string, unknown>, string][] = [
        [{ verb: 'gate', counter: 'probe_counter' }, 'gate reader with no at_least'],
        [{ verb: 'scale', counter: 'probe_counter' }, 'scale reader with no per'],
        [{ verb: 'spend', counter: 'probe_counter' }, 'spend reader with no amount'],
      ]
      for (const [reader, message] of cases) {
        expect(() => buildCatalog({ ...empty, counters: [counterEntry({})], cards: [readerCard(reader)] })).toThrow(message)
      }
    })

    it('rejects a spend that names a Keyword instead of one Counter', () => {
      // "Remove 3 of any fire Counter" would make the rules choose which, and
      // a rule that chooses for the player cannot be planned against.
      const card = readerCard({ verb: 'spend', counter_keyword: 'guard', amount: 1 })
      const guard = { source: 'data/keywords/guard.json', payload: { id: 'guard', title: 'Guard', kind: 'trait' } }
      expect(() => buildCatalog({ ...empty, keywords: [...empty.keywords, guard], counters: [counterEntry({})], cards: [card] })).toThrow(
        'spends by keyword; a spend must name one counter',
      )
    })

    it('rejects a Counter nothing can ever read', () => {
      expect(() => buildCatalog({ ...empty, counters: [counterEntry({ readers: [] })] })).toThrow(
        'Counter probe_counter has no readers and no card reads it, so nothing can ever make it matter',
      )
    })

    it('rejects a Reader whose per is zero, and a Card that overfills a Counter', () => {
      expect(() => buildCatalog({ ...empty, counters: [counterEntry({ readers: [{ when: 'round_start', effect: 'armor_gain', per: 0 }] })] })).toThrow(
        'reader with per 0, which does nothing',
      )
      const greedy = {
        source: 'data/cards/probe_place.json',
        payload: { id: 'probe_place', title: 'Probe Place', speed: 'quick', target_type: 'piece', range_tiles: 1, places_counter: 'probe_counter', counter_amount: 4 },
      }
      expect(() => buildCatalog({ ...empty, counters: [counterEntry({ max: 2 })], cards: [greedy] })).toThrow(
        'places 4 probe_counter but that Counter caps at 2',
      )
    })

    it('rejects a Card whose target cannot supply the host its Counter needs', () => {
      const hexCounter = { source: 'data/counters/ground.json', payload: { id: 'ground_counter', title: 'Ground', host: 'hex' } }
      const reader = { source: 'data/cards/reads_ground.json', payload: { id: 'reads_ground', title: 'Reads Ground', speed: 'quick', target_type: 'hex', range_tiles: 1, reads: [{ verb: 'scale', counter: 'ground_counter', on: 'target', per: 1, effect: 'damage_to_boss' }] } }
      const wrongTarget = {
        source: 'data/cards/bad_ground.json',
        payload: { id: 'bad_ground', title: 'Bad Ground', speed: 'quick', target_type: 'piece', range_tiles: 1, places_counter: 'ground_counter' },
      }
      expect(() => buildCatalog({ ...empty, counters: [hexCounter], cards: [reader, wrongTarget] })).toThrow(
        'places ground_counter, a hex Counter, but targets piece; that host needs hex',
      )
    })

    it('rejects Readers on a Counter that is not hosted on a combatant', () => {
      // Every `when` names a combatant's event. Ground never takes damage and
      // never starts a Round holding Armor, so a Reader there could not fire.
      const bad = {
        source: 'data/counters/ground.json',
        payload: { id: 'ground_counter', title: 'Ground', host: 'hex', readers: [{ when: 'host_takes_damage', effect: 'damage_taken', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [bad] })).toThrow(
        'is hosted on a hex but declares readers, and every reader event is a combatant\'s',
      )
    })

    it('rejects a Reader whose when/effect pair nothing reads', () => {
      // The `on_enter_hex` trap one level up: the two enums multiply out to
      // sixteen pairs and the rules read four, so the other twelve would
      // validate cleanly and never fire.
      const bad = {
        source: 'data/counters/idle.json',
        payload: { id: 'idle', title: 'Idle', readers: [{ when: 'slot_fired', effect: 'armor_gain', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [bad] })).toThrow(
        'authors a slot_fired/armor_gain reader, which nothing reads',
      )
    })

    it('rejects an event_keyword on a Reader whose event carries no Keywords', () => {
      // A Round starting and a Slot firing are not made of anything, so
      // narrowing them by Keyword authors a Reader that can never fire.
      const bad = {
        source: 'data/counters/odd.json',
        payload: { id: 'odd', title: 'Odd', readers: [{ when: 'round_start', event_keyword: 'tank_hit', effect: 'armor_gain', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [bad] })).toThrow(
        'narrows a round_start reader by event_keyword, but only damage events carry Keywords',
      )
    })

    it('rejects an unauthored event_keyword, and a Card keywording damage it never deals', () => {
      const unknown = {
        source: 'data/counters/odd.json',
        payload: { id: 'odd', title: 'Odd', readers: [{ when: 'host_takes_damage', event_keyword: 'flame', effect: 'damage_taken', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [unknown] })).toThrow('references unknown keyword flame in event_keyword')

      const idle = {
        source: 'data/cards/idle_ember.json',
        payload: { id: 'idle_ember', title: 'Idle Ember', speed: 'quick', damage_keywords: ['tank_hit'] },
      }
      expect(() => buildCatalog({ ...empty, cards: [idle] })).toThrow('declares damage_keywords but deals no damage')
    })

    it('rejects a Beat that places nothing, or names a Counter it cannot host', () => {
      const heat = { source: 'data/counters/heat.json', payload: { id: 'heat', title: 'Heat', readers: [{ when: 'host_deals_damage', effect: 'damage_dealt', per: 1 }] } }
      const ground = { source: 'data/counters/ground.json', payload: { id: 'ground', title: 'Ground', host: 'hex' } }
      const reader = { source: 'data/cards/reads.json', payload: { id: 'reads', title: 'Reads', speed: 'quick', target_type: 'hex', range_tiles: 1, reads: [{ verb: 'scale', counter: 'ground', on: 'target', per: 1, effect: 'damage_to_boss' }] } }
      const program = (beat: Record<string, unknown>) => ({
        source: 'data/boss_programs/probe.json',
        payload: { id: 'probe', title: 'Probe', instant_beats: [{ id: 'probe_beat', title: 'Probe Beat', ...beat }], incoming_beats: [] },
      })
      expect(() => buildCatalog({ ...empty, counters: [heat], programs: [program({ kind: 'place_counter' })] })).toThrow(
        'is a place_counter but names no counter',
      )
      expect(() => buildCatalog({ ...empty, counters: [heat], programs: [program({ kind: 'turn_toward_player', counter: 'heat' })] })).toThrow(
        'names counter heat but is a turn_toward_player, which never places one',
      )
      expect(() =>
        buildCatalog({ ...empty, counters: [ground], cards: [reader], programs: [program({ kind: 'place_counter', counter: 'ground' })] }),
      ).toThrow('which is hosted on a hex; a Beat marks combatants')
    })

    it('rejects a burst Card that deals no damage and names its file', () => {
      const bad = {
        source: 'data/cards/ember_sweep.json',
        payload: {
          id: 'ember_sweep',
          title: 'Ember Sweep',
          speed: 'quick',
          target_type: 'hex',
          range_tiles: 2,
          burst_radius: 2,
        },
      }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(
        'Card ember_sweep (data/cards/ember_sweep.json) declares burst_radius 2 but deals no damage',
      )
    })

    it('rejects a burst Card that does not target a hex', () => {
      const bad = {
        source: 'data/cards/body_bound_burst.json',
        payload: {
          id: 'body_bound_burst',
          title: 'Body-Bound Burst',
          speed: 'quick',
          target_type: 'piece',
          range_tiles: 2,
          damage: 1,
          burst_radius: 1,
        },
      }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(
        'Card body_bound_burst (data/cards/body_bound_burst.json) declares burst_radius 1 but does not target a hex',
      )
    })

    it('loads and resolves a data-only burst Card with no engine registration step', () => {
      const authored = {
        source: 'data/cards/ember_sweep.json',
        payload: {
          id: 'ember_sweep',
          title: 'Ember Sweep',
          rules_text: 'Choose a hex within Range 1. Deal 2 damage to every Enemy within 1 hex of it.',
          speed: 'quick',
          target_type: 'hex',
          range_tiles: 1,
          damage: 2,
          burst_radius: 1,
        },
      }
      const variant = buildCatalog({
        cards: [...Object.values(catalog.cards), authored],
        keywords: Object.values(catalog.keywords),
        chargeModifiers: Object.values(catalog.chargeModifiers),
        hazards: Object.values(catalog.hazards),
        minions: Object.values(catalog.minions),
        counters: Object.values(catalog.counters),
        programs: Object.values(catalog.programs),
        encounters: Object.values(catalog.encounters).map((encounter) =>
          encounter.id === 'embermaw_prototype'
            ? { ...encounter, player_deck: [{ card: 'ember_sweep', copies: 4 }] }
            : encounter,
        ),
        decks: Object.values(catalog.decks),
        scenarios: Object.values(catalog.scenarios),
      })
      expect(variant.cards.ember_sweep).toMatchObject({ target_type: 'hex', damage: 2, burst_radius: 1 })

      let state = createEncounterState(variant, 'embermaw_prototype', 70)
      for (const [minionId, coords] of [
        ['data_whelp_a', { q: -2, r: 0 }],
        ['data_whelp_b', { q: -1, r: 1 }],
      ] as const) {
        state = resolve(variant, state, {
          kind: 'spawn_minion',
          sourceId: state.bossId,
          minionId,
          coords,
          minionContentId: 'ember_whelp',
        }).state
      }
      const [top, charge] = hero(state).hand
      state = resolve(variant, state, {
        kind: 'load_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        cardInstanceId: top.instanceId,
      }).state
      state = advancePhase(variant, state).state
      state = advancePhase(variant, state).state
      state = resolve(variant, state, {
        kind: 'charge_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        cardInstanceId: charge.instanceId,
      }).state
      const fired = resolve(variant, state, {
        kind: 'fire_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        targetHex: { q: -1, r: 0 },
      })
      expect(fired.state.board.entities.data_whelp_a).toBeUndefined()
      expect(fired.state.board.entities.data_whelp_b).toBeUndefined()
    })

    it('rejects a Card whose authored draw exceeds the hand-economy safety cap', () => {
      const bad = {
        source: 'data/cards/greedy_insight.json',
        payload: {
          id: 'greedy_insight',
          title: 'Greedy Insight',
          speed: 'quick',
          draw_count: 4,
        },
      }
      expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow(/Invalid card in data\/cards\/greedy_insight\.json — draw_count:/)
    })
  })
})

// D-037. A fixed `(index + 1) % length` rotation made the schedule deducible
// from the Round counter after one cycle. That was written up as a problem for
// the Forecast Row, which is gone; it is a bigger problem without it (ADR
// 0031), because a memorised rotation is the whole of what there is to learn.
// The order is drawn from the seed, at setup.
describe('Boss Program order (D-037)', () => {
  it('walks the resolved sequence, Round by Round', () => {
    let state = start()
    // Order is what is under test: give the idle hero enough Health to survive
    // the accumulating boss pressure and Whelp bites (D-006).
    hero(state).maxHealth = 500
    hero(state).health = 500
    expect(state.currentProgramId).toBe(state.programSequence[0])
    for (let round = 2; round <= 4; round += 1) {
      state = stepPhases(state, 5).state
      expect(state.round).toBe(round)
      expect(state.currentProgramId).toBe(state.programSequence[round - 1])
    }
  })

  it('pins Round 1 to the authored opener on every seed', () => {
    // Round 1 is the teaching Round: the one Round a first-time player cannot
    // have learned anything about, so the author keeps it rather than the seed.
    // This is why a phase's first program carries no `severe` Beat (D-036) —
    // together they make the opening Round teach instead of end the run.
    const opener = catalog.encounters.embermaw_prototype.boss_programs[0]
    for (const seed of [1, 2, 3, 7, 42, 1337, 20260817]) {
      const state = start(seed)
      expect(state.programSequence[0]).toBe(opener)
      expect(state.currentProgramId).toBe(opener)
    }
  })

  it('gives different seeds different orders', () => {
    // The point of the change. If this ever collapses to one order, the
    // schedule is deducible from the Round counter and there is nothing to
    // learn by playing.
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => start(seed).programSequence.join(',')))
    expect(orders.size).toBeGreaterThan(1)
  })

  it('keeps the Round after the opener unknowable from the Round number alone', () => {
    // Carried over from the deleted Forecast Row suite, which is where this
    // property was asserted. The row is gone (ADR 0031) but the property it
    // depended on is now the design's foundation rather than one row's excuse:
    // with no forecast, the only way to know what is coming is to have met this
    // Boss before, and that is worth nothing if Round 2 is a constant.
    //
    // Round 2 specifically, because Round 1 is pinned to the authored opener —
    // it is the one Round that is supposed to be the same every time.
    const secondRound = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => start(seed).programSequence[1]))
    expect(secondRound.size).toBeGreaterThan(1)
  })

  it('deals each program about as often as a fixed rotation would', () => {
    // Bags, not independent draws: changing *when* a demand lands must not
    // change how much of it the fight contains, or this would be a difficulty
    // change wearing a variety change's clothes.
    for (const seed of [1, 2, 3, 4, 5]) {
      const cycle = start(seed).programSequence.slice(0, 3)
      expect([...cycle].sort()).toEqual(['embermaw_brood', 'embermaw_embers', 'embermaw_hunt'])
    }
  })

  it('never repeats a program back to back while three are available', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const sequence = start(seed).programSequence
      for (let index = 1; index < sequence.length; index += 1) {
        expect(sequence[index], `seed ${seed} repeated ${sequence[index]} at ${index}`).not.toBe(sequence[index - 1])
      }
    }
  })

  it('resolves the order at setup, so nothing rolls at a Round boundary', () => {
    // ADR 0025, and it outlived the row that first motivated it: a committed
    // Scenario and a sealed Encounter Record both replay by re-running the
    // seed, so a roll at a Round boundary would make replay depend on when the
    // boundary was crossed. Advancing moves the cursor, never the sequence.
    let state = immortalHero(start(4))
    const resolved = [...state.programSequence]
    for (let round = 0; round < 3; round += 1) {
      state = stepPhases(state, 5).state
      expect(state.programSequence).toEqual(resolved)
    }
  })
})

// The substance of the differentiation pass: three programs that were the same
// six Beats under three names now ask for three different answers. With no
// Forecast Row (ADR 0031) this is what there is to learn — three programs a
// player can tell apart after meeting them, rather than one program wearing
// three titles.
// The instrument that turns "is this countable?" from an argument into a number
// (D-038). It assumes nothing about how the order is generated — it groups real
// sequences by observed prefix and asks what the modal continuation is worth —
// so it cannot be satisfied by a generator that only looks random.
describe('Boss Program predictability (D-038)', () => {
  const SEEDS = 800

  it('measures the order as neither fixed nor uniform', () => {
    const measured = programPredictability(catalog, 'embermaw_prototype', SEEDS)
    // Round 1 is pinned to the authored opener, so naming it is recall rather
    // than prediction and it is excluded from the estimate.
    expect(measured.perRound[0].round).toBe(2)
    expect(measured.meanAccuracy).toBeLessThan(1)
    expect(measured.meanAccuracy).toBeGreaterThan(measured.uniformBaseline)
    expect(measured.reliable).toBe(true)
  })

  it('keeps every Round that is not a cycle end near a coin flip', () => {
    // This bound is what caught a real defect in the bag. The no-repeat rule
    // used to swap a colliding program into slot 1, a fixed position, which
    // concentrated the distribution enough to measure: Round 5 read 68% where a
    // shuffle should give about 50%. Displacing to a uniformly chosen later slot
    // fixed it. A generator that leaks position information fails here.
    const measured = programPredictability(catalog, 'embermaw_prototype', SEEDS)
    const uncertain = measured.perRound.filter((entry) => entry.accuracy < 1)
    expect(uncertain.length).toBeGreaterThan(0)
    for (const entry of uncertain) {
      expect(entry.accuracy, `Round ${entry.round} is ${(100 * entry.accuracy).toFixed(0)}% predictable`).toBeLessThan(0.6)
    }
  })

  it('records the ceiling a full-bag deal imposes', () => {
    // Not a defect — a consequence, recorded so it is not rediscovered. Dealing
    // every program exactly once per cycle is what keeps total fight pressure
    // seed-invariant, and it necessarily makes the last slot in a cycle
    // deducible. This is the ceiling on how unpredictable program order alone
    // can be, and the standing argument for varying content *inside* a program
    // (the Module Slot, D-024).
    const measured = programPredictability(catalog, 'embermaw_prototype', SEEDS)
    expect(measured.certainRounds).toBeGreaterThan(0)
    expect(measured.certainRounds).toBeLessThan(measured.perRound.length)
  })
})

// D-039. Mitigation used to protect only Health, which the sweep showed was
// never the binding constraint — runs end at Escalation with Health to spare,
// so Armor bought nothing that reached the ending. It now protects standing
// room. The rule that keeps it honest is Tank Principle 1 generalised: perfect
// play may change the *shape* of the loss, never the total.
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
    const state = start()
    const heroId = state.primaryHeroId
    const rim = { q: -2, r: 2 }
    state.board.entities[heroId].coords = { ...rim }
    state.heroes[heroId].armor = 20
    const after = throughInstant(state)
    expect(hero(after).health).toBe(hero(after).maxHealth)
    // Either it spilled to a real hex further out, or it burnt the rim itself —
    // never nothing.
    expect(Object.keys(after.board.hazards).length).toBeGreaterThan(0)
  })

  it('does not count a hit absorbed away from the Guarded Front as absorbed', () => {
    // The displacement is what holding the front buys. Armor alone must not buy
    // it, or the Tank can stand anywhere, soak the unguarded bonus, and still
    // move the Trail — which is the reward without the position that earns it.
    // The predicate is zero Health loss *there*; both halves are load-bearing.
    //
    // The other three tests in this suite all keep the Hero on the front, so
    // dropping the `guardedFront` half of the predicate left every one of them
    // passing. This is the case that separates the halves.
    const state = start()
    state.board.entities[state.bossId].coords = { q: 2, r: -2 }
    state.board.entities[state.primaryHeroId].coords = { q: -1, r: 1 }
    // More than the claw plus its unguarded bonus, so Health never moves.
    state.heroes[state.primaryHeroId].armor = 20
    const after = throughInstant(state)
    const heroCoords = after.board.entities[after.primaryHeroId].coords
    expect(hero(after).health).toBe(hero(after).maxHealth)
    // Hunt closes the gap before it claws, so assert the position the Beat
    // actually resolved against rather than the one it was set up with.
    expect(isGuardedFront(after.board, after.bossId, after.primaryHeroId)).toBe(false)
    // Burnt under them, not spilled behind them — and there is somewhere to
    // spill to, so this discriminates rather than falling back to the rim case.
    // Asserted on the Hazard rather than on the key: a key with nothing under
    // it would satisfy `toContain` while the ground stayed clear.
    expect(after.board.hazards[hexKey(heroCoords)] ?? []).not.toHaveLength(0)
  })
})

// D-041. Escalation acceleration is only legitimate if the Timeline showed the
// demand: ADR 0027 requires a Beat that can add Escalation to disclose it. A
// demand priced from the whole pool violates that on any Round whose program
// does not carry the Beat.
describe('Demand disclosure (D-041)', () => {
  function chargedReasons(result: { facts: ResolvedActionFact[] }): string[] {
    return result.facts
      .filter((fact) => fact.kind === 'gain_escalation' && fact.succeeded)
      .map((fact) => (fact.resolutionFact as Record<string, unknown>)?.escalation_reason as string)
  }

  it('never charges proximity on a Round whose program does not demand it', () => {
    // Camp out of reach for the whole fight and check every charge against the
    // program that actually ran. Round 1 is Hunt Pattern, which carries no
    // proximity demand, and used to be billed anyway.
    let state = immortalHero(start(1))
    state.board.entities[state.primaryHeroId].coords = { q: -2, r: 2 }
    let guard = 0
    while (state.active && guard < 40) {
      guard += 1
      const program = catalog.programs[state.currentProgramId ?? '']
      const result = advancePhase(catalog, state)
      if (chargedReasons(result).includes('unanswered_proximity')) {
        const demands = [...program.instant_beats, ...program.incoming_beats].some((beat) => beat.kind === 'demand_proximity')
        expect(demands, `Round ${state.round} charged proximity but ${state.currentProgramId} never showed the Beat`).toBe(true)
      }
      state = result.state
    }
  })

  it('still charges a standing Minion whichever program is up', () => {
    // The other scope, and the reason it is not one rule: a Minion is on the
    // board regardless of which program runs, so its demand outlives the Beat
    // that spawned it and any priced Beat in the pool sets its cost.
    let state = immortalHero(startBroodSecond())
    let charged = false
    let guard = 0
    while (state.active && guard < 40) {
      guard += 1
      const program = catalog.programs[state.currentProgramId ?? '']
      const result = advancePhase(catalog, state)
      if (chargedReasons(result).includes('unanswered_minions')) {
        charged = true
        if (![...program.instant_beats, ...program.incoming_beats].some((beat) => beat.kind === 'spawn_minions')) {
          // Exactly the case pool scope exists for.
          expect(Object.values(result.state.board.entities).some((entity) => entity.kind === 'minion')).toBe(true)
        }
      }
      state = result.state
    }
    expect(charged).toBe(true)
  })

  it('reads the proximity demand as adjacency, and nothing looser', () => {
    // The distance the demand asks for is a bare `1` in the engine, and every
    // other test here camps at the rim — far enough that loosening it to 2, or
    // to 3, would have changed no result. That makes the boundary the thing
    // worth asserting: one hex out is answered, two hexes out is not.
    const state = start()
    state.currentProgramId = 'embermaw_brood'
    expect(
      [...catalog.programs.embermaw_brood.instant_beats, ...catalog.programs.embermaw_brood.incoming_beats].some(
        (beat) => beat.kind === 'demand_proximity',
      ),
    ).toBe(true)

    const bossCoords = boss(state).coords
    function reasonsStandingAt(coords: { q: number; r: number }): string[] {
      state.board.entities[state.primaryHeroId].coords = { ...coords }
      return escalationActionsForRoundEnd(catalog, state)
        .filter((action) => action.kind === 'gain_escalation')
        .map((action) => action.reason)
    }

    const adjacent = { q: 0, r: 0 }
    const twoOut = { q: -1, r: 1 }
    expect(hexDistance(adjacent, bossCoords)).toBe(1)
    expect(hexDistance(twoOut, bossCoords)).toBe(2)
    expect(reasonsStandingAt(adjacent)).not.toContain('unanswered_proximity')
    expect(reasonsStandingAt(twoOut)).toContain('unanswered_proximity')
  })
})

// Reach is content (ADR 0020). It used to be three engine constants for two
// Beats: `forwardCone`'s default parameter, a second literal at the telegraph
// call site, and a bare `1` in the Escalation step. The only place a reader
// could find the number was inside a `rules_text` string, which nothing checks.
describe('Authored Beat reach', () => {
  // Round 1 is Hunt Pattern on every seed, and Hunt's Incoming Row is a cone.
  const TO_QUICK = 2

  // Round-trip a built catalog back through the loader, so a content rule can
  // be tested by editing content rather than by hand-assembling payloads.
  function rebuild(source: typeof catalog) {
    return buildCatalog({
      cards: Object.values(source.cards),
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

  it('refuses a reach on the hit that footwork cannot answer', () => {
    // The other half of the rule, and the one worth stating as content rather
    // than trusting to nobody trying it. Raking Claw is deliberately rangeless
    // (D-017); giving it a reach would hand a camping Hero a hex to stand
    // outside of and undo what the proximity demand exists to close.
    const ranged = structuredClone(catalog)
    const claw = ranged.programs.embermaw_hunt.instant_beats.find((entry) => entry.kind === 'targeted_hit')!
    claw.range_tiles = 2
    expect(() => rebuild(ranged)).toThrow(/must not author range_tiles/)
  })
})

// D-042. Recorded as a latent interaction during PR #77's review and ruled on
// after: an Enemy is immune to its own side's Hazards. The rule is stated per
// Hazard rather than as "Enemies ignore Hazards", because a Hero-placed damage
// zone is exactly the card the new effect families invite and it has to keep
// working against Enemies.
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

describe('Program identity (D-036)', () => {
  it('gives each Phase I program a distinct set of demands', () => {
    const tags = (id: string) => programAnswerTags(catalog.programs[id]).sort().join(',')
    const hunt = tags('embermaw_hunt')
    const embers = tags('embermaw_embers')
    const brood = tags('embermaw_brood')
    expect(new Set([hunt, embers, brood]).size).toBe(3)
    // Named explicitly, because "they differ" is weaker than "they differ in
    // the way the design intends": Armor answers Hunt, footwork answers Ember,
    // and only Brood asks anyone to kill something.
    expect(programAnswerTags(catalog.programs.embermaw_brood)).toContain('kill_adds')
    expect(programAnswerTags(catalog.programs.embermaw_embers)).not.toContain('mitigate')
    expect(programAnswerTags(catalog.programs.embermaw_embers)).not.toContain('kill_adds')
    expect(programAnswerTags(catalog.programs.embermaw_hunt)).not.toContain('kill_adds')
  })

  it('keeps the first program of every phase free of severe Beats', () => {
    // Round 1 and the Phase Break are both unforecast: no earlier Round could
    // have shown them, so neither may open on a severe Beat. Phase II's list is
    // ordered for exactly this reason.
    const encounter = catalog.encounters.embermaw_prototype
    expect(highestTier(catalog.programs[encounter.boss_programs[0]])).not.toBe('severe')
    expect(highestTier(catalog.programs[encounter.phase_two_programs[0]])).not.toBe('severe')
  })
})

// ADR 0023. Three Programs looping unchanged meant Round 7 played like Round
// 2 and the fight never escalated. Phase II is built from the Beat kinds that
// already exist, at harder values, and the dual trigger is kept as authored:
// a Health-only trigger never fires against a slow deck, and a Round-only one
// never rewards a fast one.
describe('Phase Trigger (ADR 0023)', () => {
  // Rotation and the break are what is under test throughout, so the idle
  // hero is given enough Health to outlast the pressure it never answers.
  function durableStart(): EncounterState {
    const state = start()
    hero(state).maxHealth = 500
    hero(state).health = 500
    return state
  }

  it('opens in Phase I on the Phase I Programs', () => {
    const state = durableStart()
    expect(state.bossPhase).toBe(1)
    expect(state.currentProgramId).toBe('embermaw_hunt')
    expect(state.phaseTrigger).toEqual({ bossHealthAtOrBelow: 18, roundAtOrAfter: 5 })
  })

  it('breaks on the Round half of the trigger, before Phase II’s first Instant Row', () => {
    let state = durableStart()
    // Rounds 2, 3 and 4 open on the Phase I loop.
    state = stepPhases(state, 5).state
    expect(state.round).toBe(2)
    expect(state.bossPhase).toBe(1)
    state = stepPhases(state, 10).state
    expect(state.round).toBe(4)
    expect(state.bossPhase).toBe(1)
    // Round 5 opens Phase II, and it opens on Phase II's own first Program
    // rather than wherever the Phase I loop had reached.
    const opened = stepPhases(state, 5)
    expect(opened.state.round).toBe(5)
    expect(opened.state.bossPhase).toBe(2)
    expect(opened.state.currentProgramId).toBe('embermaw_ashfall')
    // The reveal has something authoritative to read, and it is recorded on
    // the Round's own fact — before any Instant Beat resolves.
    const breakFact = opened.facts.find((fact) => fact.kind === 'round_start' && fact.detail.phaseBreak !== undefined)
    expect(breakFact?.detail).toMatchObject({ phaseBreak: 2, phaseProgram: 'embermaw_ashfall' })
    const firstBeat = opened.facts.findIndex((fact) => fact.kind === 'boss_beat')
    const breakIndex = opened.facts.indexOf(breakFact as ResolvedActionFact)
    expect(breakIndex).toBeGreaterThanOrEqual(0)
    if (firstBeat >= 0) {
      expect(breakIndex).toBeLessThan(firstBeat)
    }
  })

  it('breaks on the Health half before the Round half is reached', () => {
    let state = durableStart()
    boss(state).health = 18
    state = stepPhases(state, 5).state
    expect(state.round).toBe(2)
    expect(state.bossPhase).toBe(2)
    expect(state.currentProgramId).toBe('embermaw_ashfall')
  })

  it('waits for the Round boundary when the Health half is met mid-Round', () => {
    let state = durableStart()
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    // A trigger reached inside a player window takes effect after the Round
    // finishes, never mid-window (CONTEXT.md, Phase Trigger).
    boss(state).health = 10
    expect(state.bossPhase).toBe(1)
    state = stepPhases(state, 2).state
    expect(state.bossPhase).toBe(1)
    state = stepPhases(state, 1).state
    expect(state.round).toBe(2)
    expect(state.bossPhase).toBe(2)
  })

  it('sheds the scales: turns one edge clockwise and changes nothing else', () => {
    // Measured against a control that crosses the same Round boundary without
    // breaking. Hazards expire on their own duration at every boundary, so
    // only a side-by-side comparison separates what the break did from what
    // the boundary was going to do anyway.
    const pre = stepPhases(durableStart(), 4).state
    const control = structuredClone(pre)
    const breaking = structuredClone(pre)
    breaking.board.entities[breaking.bossId].health = 18
    const after = stepPhases(breaking, 1).state
    const afterControl = stepPhases(control, 1).state
    expect(after.bossPhase).toBe(2)
    expect(afterControl.bossPhase).toBe(1)
    // Facings run counter-clockwise from E, so one edge clockwise is one step
    // back around the ring. The turn is the Boss's own, not a re-facing at
    // the hero — no Instant Beat has resolved yet.
    expect(after.board.entities[after.bossId].facing).toBe((afterControl.board.entities[afterControl.bossId].facing + 5) % 6)
    // Whelps and Scorched ground are exactly what the boundary left, and the
    // break deals no damage of its own: it is a readability beat.
    const minions = (state: EncounterState) => Object.values(state.board.entities).filter((entity) => entity.kind === 'minion').length
    expect(Object.keys(after.board.hazards).sort()).toEqual(Object.keys(afterControl.board.hazards).sort())
    expect(minions(after)).toBe(minions(afterControl))
    expect(hero(after).health).toBe(hero(afterControl).health)
  })

  it('loops Phase II and never returns to Phase I', () => {
    let state = durableStart()
    boss(state).health = 18
    state = stepPhases(state, 5).state
    // Phase II opens on its authored first program for the same reason Round 1
    // does: a Phase Break is reached mid-fight and was never forecast.
    expect(state.currentProgramId).toBe('embermaw_ashfall')
    const phaseTwo = [...state.phaseTwoSequence]
    for (let step = 1; step <= 2; step += 1) {
      state = stepPhases(state, 5).state
      expect(state.currentProgramId).toBe(phaseTwo[step])
      expect(catalog.encounters.embermaw_prototype.phase_two_programs).toContain(state.currentProgramId)
    }
    expect(state.bossPhase).toBe(2)
  })

  it('leaves an Encounter with no authored Phase II in one phase', () => {
    let state = createEncounterState(catalog, 'embermaw_first_turn')
    expect(state.phaseTrigger).toBeNull()
    hero(state).maxHealth = 500
    hero(state).health = 500
    boss(state).health = 1
    state = stepPhases(state, 25).state
    expect(state.round).toBeGreaterThanOrEqual(5)
    expect(state.bossPhase).toBe(1)
  })
})

describe('encounter setup', () => {
  it('creates the seeded initial state', () => {
    const state = start()
    expect(state.phase).toBe('loadout')
    expect(state.round).toBe(1)
    expect(state.active).toBe(true)
    expect(hero(state).hand).toHaveLength(4)
    expect(hero(state).deck).toHaveLength(16)
    expect(hero(state).actionBar).toHaveLength(2)
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

describe('Minion end-step intent (D-006)', () => {
  it('a distant Whelp advances toward its Hero; an arrived Whelp bites', () => {
    // Brood Pattern's Incoming Row spawns two Whelps at distance 2. It runs on
    // Round 2 for this seed, so reach that Round's Slow Window (D-036: the
    // pinned opener calls no Whelps).
    let state = stepPhases(immortalHero(startBroodSecond()), 9).state
    expect(state.round).toBe(2)
    expect(state.phase).toBe('slow')
    const heroCoords = state.board.entities[state.primaryHeroId].coords
    const spawned = Object.values(state.board.entities)
      .filter((entity) => entity.kind === 'minion')
      .map((entity) => ({ id: entity.id, distance: hexDistance(entity.coords, heroCoords) }))
    expect(spawned).toHaveLength(2)
    expect(spawned.every(({ distance }) => distance === 2)).toBe(true)

    // The projection derives from the live state: both intend to advance.
    const advanceIntents = minionIntents(catalog, state)
    expect(advanceIntents).toHaveLength(2)
    expect(advanceIntents.every((intent) => intent.damage === 0 && intent.destination !== null)).toBe(true)

    // The spawn Round's wrap: no bites yet — the creep is the deadline.
    const healthBefore = hero(state).health
    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.round).toBe(3)
    expect(wrap.facts.filter((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)).toHaveLength(0)
    expect(hero(state).health).toBe(healthBefore)
    for (const { id } of spawned) {
      expect(hexDistance(state.board.entities[id].coords, heroCoords)).toBe(1)
    }

    // The following Round: the arrived Whelps bite.
    state = stepPhases(state, 4).state
    expect(state.phase).toBe('slow')
    const round2Health = hero(state).health
    const wrap2 = advancePhase(catalog, state)
    const bites = wrap2.facts.filter((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)
    expect(bites).toHaveLength(2)
    expect(bites.every((fact) => ((fact.resolutionFact?.damage_keywords as string[]) ?? []).includes('raid_hit'))).toBe(true)
    expect(hero(wrap2.state).health).toBe(round2Health - 2)
    // A Raid Hit from a Minion never grants Riposte Ready.
    expect((wrap2.state.counters[combatantRef(state.primaryHeroId)] ?? []).some((effect) => effect.id === 'riposte_ready')).toBe(false)
  })

  it('a cleared Whelp takes no end-step action', () => {
    let state = stepPhases(immortalHero(startBroodSecond()), 9).state
    const whelps = Object.values(state.board.entities).filter((entity) => entity.kind === 'minion')
    state = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: whelps[0].id,
      amount: 2,
      reasonText: 'test clear',
    }).state
    const wrap = advancePhase(catalog, state)
    const moves = wrap.facts.filter((fact) => fact.kind === 'move_minion')
    expect(moves).toHaveLength(1)
    expect(moves[0].sourceId).toBe(whelps[1].id)
  })
})

describe('Fortify Slow commitment (D-019)', () => {
  it('lands its Armor at the next Round start, after the wipe, in time for the Instant Row', () => {
    // Reach Round 1's Slow Window and fire a charged Fortify. The seed is fixed
    // so the next Round is Brood Pattern, whose Instant Row carries the Raking
    // Claw — the banked Armor has to answer a hit that lands before any Round-2
    // window opens, and only a claw-carrying program provides one.
    let state = stepPhases(startBroodSecond(), 4).state
    expect(state.phase).toBe('slow')
    hero(state).hand = [card('f1', 'fortify'), card('f2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f2' }).state
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = fired.state
    expect(fired.facts[0].succeeded).toBe(true)
    // No Armor yet: the commitment is banked as the Fortified status.
    expect(hero(state).armor).toBe(0)
    expect(fired.facts[0].resolutionFact).toMatchObject({ counter_event: { counter_id: 'fortified', event: 'placed', reason: 'slow_commitment' } })

    // Round start wipes Armor first, then the commitment lands.
    const wrap = advancePhase(catalog, state)
    state = wrap.state
    expect(state.round).toBe(2)
    expect(hero(state).armor).toBe(6)
    expect(state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)

    // The banked Armor answers Round 2's INSTANT row (Brood Pattern's Raking
    // Claw): 4 requested, fully blocked, zero Health loss — pressure nothing
    // fired inside Round 2 could have pre-blocked.
    const healthBefore = hero(state).health
    const instant = advancePhase(catalog, state)
    state = instant.state
    expect(state.phase).toBe('instant')
    expect(hero(state).health).toBe(healthBefore)
    expect(hero(state).armor).toBe(2)

    // The leftover Armor is ordinary Armor: the next Round start wipes it.
    state = stepPhases(state, 4).state
    expect(state.round).toBe(3)
    expect(hero(state).armor).toBe(0)
  })
})

describe('Authored Counters (D-032 to D-034, D-047)', () => {
  // No live card places a Counter yet — the first one changes the damage
  // economy and owes the deck-evaluation gate — so the vocabulary is proven
  // against a catalog variant, the pattern the acceleration test established.
  function withStatusCard(cardId: string, patch: Record<string, unknown>) {
    const variant = structuredClone(catalog)
    variant.cards[cardId] = { ...variant.cards.steady_strike, id: cardId, title: 'Test Card', boss_damage: 0, damage: 0, ...patch }
    return variant
  }

  function firedAt(variant: ReturnType<typeof withStatusCard>, cardId: string, targetId?: string) {
    let state = start()
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', cardId), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
    return resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId })
  }

  it('authors every Counter as a marker plus Readers, with no payload of its own', () => {
    expect(Object.keys(catalog.counters)).toEqual(expect.arrayContaining(['fortified', 'sundered', 'weakened']))
    // D-034's two named payload fields are gone. What a Counter does is a
    // Reader, and which side it is "for" is just which event its Reader
    // fires on — Sundered raises what its host takes, Weakened lowers what
    // its host deals, and neither declares a side.
    expect(catalog.counters.sundered).toMatchObject({
      max: 1,
      duration_rounds: 1,
      readers: [{ when: 'host_takes_damage', effect: 'damage_taken', per: 1 }],
    })
    expect(catalog.counters.weakened).toMatchObject({
      readers: [{ when: 'host_deals_damage', effect: 'damage_dealt', per: -1 }],
    })
    // Fortified's banked Armor is its count, so additive stacking (D-019)
    // needs no flag: `max` above 1 is the whole rule.
    expect(catalog.counters.fortified).toMatchObject({
      duration_rounds: 1,
      readers: [{ when: 'round_start', effect: 'armor_gain', per: 1 }],
    })
    expect(catalog.counters.fortified.max).toBeGreaterThan(1)
  })

  it('lands a Counter on the Boss with no range requirement', () => {
    // The Boss is selectable for a Counter but never range-gated, which keeps
    // the positionless `boss_damage` ruling intact.
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 0 })
    const state = start()
    const fired = firedAt(variant, 'sunder_test', state.bossId)
    expect(fired.facts[0].succeeded).toBe(true)
    expect(fired.state.counters[combatantRef(state.bossId)]?.[0]).toMatchObject({
      id: 'sundered',
      count: 1,
      readers: [{ when: 'host_takes_damage', effect: 'damage_taken', per: 1 }],
    })
  })

  it('raises damage the Sundered Boss takes', () => {
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 0 })
    const state = start()
    const sundered = firedAt(variant, 'sunder_test', state.bossId).state
    const before = sundered.board.entities[sundered.bossId].health
    const hit = resolve(catalog, sundered, {
      kind: 'damage',
      sourceId: sundered.primaryHeroId,
      targetId: sundered.bossId,
      amount: 3,
      reasonText: 'test',
    })
    expect(hit.facts[0].resolutionFact).toMatchObject({ requested: 4 })
    expect(hit.state.board.entities[hit.state.bossId].health).toBe(before - 4)
  })

  it('lowers damage a Weakened Enemy deals', () => {
    const variant = withStatusCard('weaken_test', { places_counter: 'weakened', target_type: 'piece', range_tiles: 0 })
    const state = start()
    const weakened = firedAt(variant, 'weaken_test', state.bossId).state
    const healthBefore = hero(weakened).health
    const armorBefore = hero(weakened).armor
    const hit = resolve(catalog, weakened, {
      kind: 'damage',
      sourceId: weakened.bossId,
      targetId: weakened.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
    })
    expect(hit.facts[0].resolutionFact).toMatchObject({ requested: 3 })
    expect(healthBefore - hit.state.heroes[weakened.primaryHeroId].health + armorBefore).toBeGreaterThan(0)
  })

  it('refuses a second copy of a max-1 Counter', () => {
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 0 })
    let state = stepPhases(start(), 2).state
    expect(state.phase).toBe('quick')
    // Two Slots, same quick-speed card, one window: the Slot activation limit
    // is per Slot, so the second fire is legal and the status is what refuses.
    hero(state).hand = [card('a1', 'sunder_test'), card('a2', 'steady_strike'), card('b1', 'sunder_test'), card('b2', 'steady_strike')]
    for (const [slotIndex, top, charge] of [
      [0, 'a1', 'a2'],
      [1, 'b1', 'b2'],
    ] as const) {
      state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId: top }).state
      state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId: charge }).state
    }
    const first = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(first.facts[0].succeeded).toBe(true)
    expect(first.facts[0].detail.placedCounterAmount).toBe(1)
    const second = resolve(variant, first.state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 1, targetId: state.bossId })
    expect(second.facts[0].succeeded).toBe(true)
    // A max-1 Counter refuses the second placement by landing zero of it,
    // which is the old non-stacking flag expressed as arithmetic.
    expect(second.facts[0].detail.placedCounterAmount).toBe(0)
    expect(second.state.counters[combatantRef(state.bossId)] ?? []).toHaveLength(1)
  })

  it('refuses a piece-targeting Counter with no Enemy target', () => {
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 0 })
    const fired = firedAt(variant, 'sunder_test', undefined)
    expect(fired.facts[0].succeeded).toBe(false)
    expect(fired.facts[0].reason).toContain('Enemy target')
  })

  it('ticks a Counter down at the Round boundary and takes it off', () => {
    // The mechanism was two-sided from D-032, but the Round's tick ran over
    // the Heroes alone: an authored `duration_rounds` meant nothing on an
    // Enemy, so a single Sunder marked the Boss for the rest of the fight.
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 0 })
    const opening = start()
    let state = immortalHero(firedAt(variant, 'sunder_test', opening.bossId).state)
    expect(state.counters[combatantRef(state.bossId)]).toHaveLength(1)
    expect(state.counters[combatantRef(state.bossId)][0].remainingRounds).toBe(1)

    const round = state.round
    const facts: ResolvedActionFact[] = []
    for (let index = 0; index < 3; index += 1) {
      const step = advancePhase(variant, state)
      state = step.state
      facts.push(...step.facts)
    }
    expect(state.round).toBe(round + 1)
    expect(state.counters[combatantRef(state.bossId)] ?? []).toHaveLength(0)

    // The Round's own fact says what left, so a client never has to diff two
    // states to narrate an expiry.
    const roundStart = facts.find((fact) => fact.kind === 'round_start')!
    expect(roundStart.detail.expiredCounters).toEqual([
      expect.objectContaining({ host: combatantRef(state.bossId), counter_id: 'sundered', event: 'expired', reason: 'duration_elapsed' }),
    ])

    // And the Boss takes plain damage again.
    const hit = resolve(catalog, state, { kind: 'damage', sourceId: state.primaryHeroId, targetId: state.bossId, amount: 3, reasonText: 'test' })
    expect(hit.facts[0].resolutionFact).toMatchObject({ requested: 3 })
  })

  it('gives a Minion the same Counter clock, and lets neither outlive it', () => {
    // Range is the only thing that differs from the Boss (D-034), so the
    // card reaches across the board and the subject stays the clock.
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 8 })
    let state = immortalHero(start())
    const taken = new Set(Object.values(state.board.entities).map((entity) => hexKey(entity.coords)))
    const [q, r] = Object.keys(state.board.hexes)
      .find((key) => !taken.has(key))!
      .split(',')
      .map(Number)
    state = resolve(variant, state, {
      kind: 'spawn_minion',
      sourceId: state.bossId,
      minionId: 'status_whelp',
      coords: { q, r },
      minionContentId: 'ember_whelp',
    }).state
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', 'sunder_test'), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
    state = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: 'status_whelp' }).state
    expect(state.counters[combatantRef('status_whelp')]).toHaveLength(1)

    // Sundered raises what the Whelp takes: 1 requested becomes 2, which is
    // the Whelp's whole Health, so the same hit also proves the cleanup.
    const killed = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: 'status_whelp',
      amount: 1,
      reasonText: 'test',
    })
    expect(killed.facts[0].resolutionFact).toMatchObject({ requested: 2, target_removed: true })
    expect(killed.state.counters[combatantRef('status_whelp')]).toBeUndefined()
  })

  it('drops a Counter held by a piece that has left the board', () => {
    // Belt and braces on the Round's upkeep: whatever removed the piece, the
    // Round start must not carry its afflictions forward.
    const variant = withStatusCard('sunder_test', { places_counter: 'sundered', target_type: 'piece', range_tiles: 0 })
    const opening = start()
    let state = immortalHero(firedAt(variant, 'sunder_test', opening.bossId).state)
    state.counters[combatantRef('ghost_whelp')] = [...state.counters[combatantRef(state.bossId)]]
    for (let index = 0; index < 3; index += 1) {
      state = advancePhase(variant, state).state
    }
    expect(state.counters[combatantRef('ghost_whelp')]).toBeUndefined()
  })

  it('still lands Fortified from its authored definition (D-019 unchanged)', () => {
    let state = stepPhases(start(), 4).state
    expect(state.phase).toBe('slow')
    hero(state).hand = [card('f1', 'fortify'), card('f2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'f2' }).state
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    const fortified = fired.state.counters[combatantRef(state.primaryHeroId)]?.find((counter) => counter.id === 'fortified')
    // The banked Armor is the count now: six Counters, one Reader paying one
    // Armor each. Same six Armor, arrived at by counting rather than by a
    // dedicated field on the marker.
    expect(fortified).toMatchObject({
      title: catalog.counters.fortified.title,
      count: 6,
      readers: [{ when: 'round_start', effect: 'armor_gain', per: 1 }],
    })
  })
})

describe('Counter Readers — gate, scale, spend (D-047)', () => {
  // A Counter that is nothing but a marker, so every number in these tests
  // comes from a Reader rather than from the Counter itself. This is the
  // point of the vocabulary: Ash means whatever the cards that read Ash say
  // it means, and Ash itself says nothing.
  const ASH = {
    id: 'ash',
    title: 'Ash',
    rules_text: 'Cinders cling to what they touch.',
    keywords: ['guard'],
    host: 'combatant' as const,
    max: 5,
    duration_rounds: 0,
    readers: [],
  }

  function withAsh(cards: Record<string, Record<string, unknown>>) {
    const variant = structuredClone(catalog)
    variant.counters.ash = { ...ASH }
    for (const [cardId, patch] of Object.entries(cards)) {
      // Charge Modifiers off: these tests are about what a Reader adds, and a
      // charged Steady Strike would fold its own bonus into every number.
      variant.cards[cardId] = { ...variant.cards.steady_strike, id: cardId, title: cardId, boss_damage: 0, damage: 0, charge_modifiers: [], ...patch }
    }
    return variant
  }

  // Puts `count` Ash on a piece directly. Placement has its own tests; these
  // are about what reading them does.
  function withAshOn(variant: ReturnType<typeof withAsh>, state: EncounterState, entityId: string, count: number) {
    state.counters[combatantRef(entityId)] = [
      {
        id: 'ash',
        title: 'Ash',
        count,
        max: variant.counters.ash.max,
        remainingRounds: 0,
        readers: [],
        bonusBossDamageOnSlotFired: 0,
        bonusBossDamageOffPayoff: 0,
        consumeOnCardId: '',
        expiresAtWindowEnd: '',
        triggerReason: 'test',
        sourceId: 'test',
        sourceBeatId: '',
        triggerRound: state.round,
        triggerPhase: state.phase,
      },
    ]
    return state
  }

  function armed(variant: ReturnType<typeof withAsh>, cardId: string) {
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', cardId), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    return resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
  }

  it('scales a Card effect by the Counters its target is holding', () => {
    const variant = withAsh({
      cinder_reap: {
        target_type: 'piece',
        range_tiles: 8,
        damage: 0,
        boss_damage: 1,
        reads: [{ verb: 'scale', counter: 'ash', on: 'target', effect: 'damage_to_boss', per: 2, at_least: 0, amount: 0, timing: 'cost', counter_keyword: '' }],
      },
    })
    let state = armed(variant, 'cinder_reap')
    state = withAshOn(variant, state, state.bossId, 3)
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    // 1 printed + 2 per Ash × 3 held.
    expect(before - fired.state.board.entities[state.bossId].health).toBe(7)
  })

  it('gates a Card on a count, and the gate is an ordinary legality verdict', () => {
    const variant = withAsh({
      ash_pact: {
        target_type: 'piece',
        range_tiles: 8,
        boss_damage: 4,
        reads: [{ verb: 'gate', counter: 'ash', on: 'target', at_least: 3, per: 0, amount: 0, effect: 'damage_to_target', timing: 'cost', counter_keyword: '' }],
      },
    })
    let state = armed(variant, 'ash_pact')
    const fire = { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId } as const

    state = withAshOn(variant, state, state.bossId, 2)
    const short = legality(variant, state, fire)
    expect(short.legal).toBe(false)
    expect(short.reason).toContain('Counters')
    // Illegal at the predicate means illegal at resolution: the two are the
    // same question asked once.
    expect(resolve(variant, state, fire).facts[0].succeeded).toBe(false)

    state = withAshOn(variant, state, state.bossId, 3)
    expect(legality(variant, state, fire).legal).toBe(true)
    expect(resolve(variant, state, fire).facts[0].succeeded).toBe(true)
  })

  it('pays a cost before the same Card scales off what is left', () => {
    // The ordinary reading of paying for something, and the reason `timing`
    // exists: spend 2 of 3 Ash, then scale off the 1 remaining.
    const variant = withAsh({
      ash_burn: {
        target_type: 'piece',
        range_tiles: 8,
        boss_damage: 0,
        reads: [
          { verb: 'spend', counter: 'ash', on: 'target', amount: 2, timing: 'cost', at_least: 0, per: 0, effect: 'damage_to_target', counter_keyword: '' },
          { verb: 'scale', counter: 'ash', on: 'target', per: 3, effect: 'damage_to_boss', timing: 'cost', at_least: 0, amount: 0, counter_keyword: '' },
        ],
      },
    })
    let state = armed(variant, 'ash_burn')
    state = withAshOn(variant, state, state.bossId, 3)
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(before - fired.state.board.entities[state.bossId].health).toBe(3)
    expect(fired.state.counters[combatantRef(state.bossId)][0].count).toBe(1)
    expect(fired.facts[0].detail.spentCounters).toEqual([{ counter_id: 'ash', host: combatantRef(state.bossId), amount: 2, timing: 'cost' }])
  })

  it('spends at resolution after scaling, when the Card says so', () => {
    const variant = withAsh({
      ash_late: {
        target_type: 'piece',
        range_tiles: 8,
        boss_damage: 0,
        reads: [
          { verb: 'spend', counter: 'ash', on: 'target', amount: 2, timing: 'resolution', at_least: 0, per: 0, effect: 'damage_to_target', counter_keyword: '' },
          { verb: 'scale', counter: 'ash', on: 'target', per: 3, effect: 'damage_to_boss', timing: 'cost', at_least: 0, amount: 0, counter_keyword: '' },
        ],
      },
    })
    let state = armed(variant, 'ash_late')
    state = withAshOn(variant, state, state.bossId, 3)
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    // Same card, same board, one field different: 3 Ash scale before the
    // spend rather than after.
    expect(before - fired.state.board.entities[state.bossId].health).toBe(9)
    expect(fired.state.counters[combatantRef(state.bossId)][0].count).toBe(1)
  })

  it('reads every Counter carrying a Keyword, not just one named Counter', () => {
    // The Charge Modifier's match-by-keyword lifted off the Charge Stack: a
    // card can be written before the Counter it will one day read exists.
    const variant = withAsh({
      keyword_reap: {
        target_type: 'piece',
        range_tiles: 8,
        boss_damage: 0,
        reads: [{ verb: 'scale', counter_keyword: 'guard', on: 'target', per: 2, effect: 'damage_to_boss', timing: 'cost', at_least: 0, amount: 0, counter: '' }],
      },
    })
    let state = armed(variant, 'keyword_reap')
    state = withAshOn(variant, state, state.bossId, 2)
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(before - fired.state.board.entities[state.bossId].health).toBe(4)
  })

  it('places several Counters at once and stops at the authored max', () => {
    const variant = withAsh({
      ash_spread: { target_type: 'piece', range_tiles: 8, places_counter: 'ash', counter_amount: 4 },
    })
    let state = armed(variant, 'ash_spread')
    const first = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(first.facts[0].detail.placedCounterAmount).toBe(4)

    // A second cast onto a max-5 stack lands the 1 that fits and says so,
    // rather than refusing outright or overfilling.
    state = armed(variant, 'ash_spread')
    state.counters = structuredClone(first.state.counters)
    const second = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(second.facts[0].detail.placedCounterAmount).toBe(1)
    expect(second.state.counters[combatantRef(state.bossId)][0].count).toBe(5)
  })
})

describe('The Boss marks too (D-051)', () => {
  it('banks Heat on itself, and every Heat makes its blows land harder', () => {
    // The half Counters were missing: the party could mark the Boss and the
    // Boss could not mark back. Heat is the Boss marking itself, which the
    // party watches accrue and may spend a card cooling.
    let state = immortalHero(start())
    const heatBeat = catalog.programs.embermaw_embers.instant_beats.find((beat) => beat.kind === 'place_counter')!
    expect(heatBeat).toMatchObject({ counter: 'heat', counter_target: 'self', counter_amount: 1 })

    const placed = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: heatBeat, track: 'instant' })
    state = placed.state
    expect(state.counters[combatantRef(state.bossId)][0]).toMatchObject({ id: 'heat', count: 1 })

    // One Heat, one more damage on everything it throws.
    const hit = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'test',
    })
    expect(hit.facts[0].resolutionFact).toMatchObject({ requested: 5 })
  })

  it('marks the Party when the Beat says hero, not itself', () => {
    // `counter_target` is the whole direction of the mark, and getting it
    // backwards would put the Boss's own debuff on the Boss.
    const state = immortalHero(start())
    const beat = { ...catalog.programs.embermaw_embers.instant_beats.find((b) => b.kind === 'place_counter')!, counter_target: 'hero' as const }
    const marked = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat, track: 'instant' })
    expect(marked.state.counters[combatantRef(state.primaryHeroId)]?.[0]).toMatchObject({ id: 'heat', count: 1 })
    expect(marked.state.counters[combatantRef(state.bossId)] ?? []).toHaveLength(0)
  })

  it('stops banking at the authored cap, and says so', () => {
    let state = immortalHero(start())
    const heatBeat = catalog.programs.embermaw_embers.instant_beats.find((beat) => beat.kind === 'place_counter')!
    const cap = catalog.counters.heat.max
    let last
    for (let index = 0; index < cap + 2; index += 1) {
      last = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: heatBeat, track: 'instant' })
      state = last.state
    }
    expect(state.counters[combatantRef(state.bossId)][0].count).toBe(cap)
    // The Beat past the cap records that nothing landed rather than pretending.
    const placement = last!.facts.find((fact) => fact.kind === 'place_counter')!
    expect(placement.detail.placedCounterAmount).toBe(0)
  })
})

describe('Ground that burns for good (D-050)', () => {
  // The open question D-048 logged, answered: a structural Threshold closes
  // the arena, and a hex nobody can stand on should not keep paying out what
  // was banked there. Temporary weather is different — the ground outlives it.
  function withGroundCounter() {
    const variant = structuredClone(catalog)
    variant.counters.embers = {
      id: 'embers', title: 'Embers', rules_text: '', keywords: [],
      host: 'hex', max: 3, duration_rounds: 0, readers: [],
    }
    variant.cards.scatter = {
      ...variant.cards.steady_strike, id: 'scatter', title: 'Scatter', boss_damage: 0, damage: 0,
      charge_modifiers: [], target_type: 'hex', range_tiles: 2, burst_radius: 0,
      places_counter: 'embers', counter_amount: 2,
    }
    return variant
  }

  function marked(variant: ReturnType<typeof withGroundCounter>) {
    let state = immortalHero(start())
    state = advancePhase(variant, advancePhase(variant, state).state).state
    hero(state).hand = [card('s1', 'scatter'), card('s2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 's1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 's2' }).state
    const ground = state.board.entities[state.primaryHeroId].coords
    state = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: ground }).state
    expect(state.counters[hexCounterRef(ground)]).toHaveLength(1)
    return { state, ground }
  }

  it('takes the Counters on a hex with it when the burn is permanent', () => {
    const variant = withGroundCounter()
    const { state, ground } = marked(variant)
    const burnt = resolve(variant, state, {
      kind: 'apply_hazard',
      sourceId: state.bossId,
      coords: ground,
      hazardId: 'scorched',
      fallbackDurationRounds: 1,
      permanent: true,
    })
    expect(burnt.facts[0].detail.clearedHexCounters).toBe(true)
    expect(burnt.state.counters[hexCounterRef(ground)]).toBeUndefined()
  })

  it('leaves them alone when the Hazard is weather the ground outlives', () => {
    const variant = withGroundCounter()
    const { state, ground } = marked(variant)
    const burnt = resolve(variant, state, {
      kind: 'apply_hazard',
      sourceId: state.bossId,
      coords: ground,
      hazardId: 'scorched',
      fallbackDurationRounds: 1,
    })
    expect(burnt.facts[0].detail.clearedHexCounters).toBeUndefined()
    expect(burnt.state.counters[hexCounterRef(ground)]).toHaveLength(1)
  })
})

describe('Quench, the first Card that reads a Counter (D-052)', () => {
  it('scales off the Heat it is about to remove, then removes it', () => {
    // `resolution` timing is the whole card: it scales off the full Heat and
    // cools afterwards, so a hotter Boss is a bigger hit *and* a bigger cool.
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    const heatBeat = catalog.programs.embermaw_embers.instant_beats.find((beat) => beat.kind === 'place_counter')!
    for (let index = 0; index < 3; index += 1) {
      state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: heatBeat, track: 'instant' }).state
    }
    expect(state.counters[combatantRef(state.bossId)][0].count).toBe(3)

    hero(state).hand = [card('q1', 'quench'), card('q2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'q1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'q2' }).state
    const before = state.board.entities[state.bossId].health
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })

    // 2 printed + 1 per Heat × 3 held.
    expect(before - fired.state.board.entities[state.bossId].health).toBe(5)
    expect(fired.state.counters[combatantRef(state.bossId)][0].count).toBe(1)
  })

  it('is a plain 2 with the Boss cold, so it is never a dead card', () => {
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    hero(state).hand = [card('q1', 'quench'), card('q2', 'steady_strike')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'q1' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'q2' }).state
    const before = state.board.entities[state.bossId].health
    const fired = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetId: state.bossId })
    expect(before - fired.state.board.entities[state.bossId].health).toBe(2)
  })

  it('stays out of the default deck, and rides the candidate deck instead', () => {
    // The automatic half of the rubric does not support promotion (D-052), so
    // the card is authored and measurable without changing the live economy.
    const live = catalog.encounters.embermaw_prototype.player_deck.map((entry) => entry.card)
    expect(live).not.toContain('quench')
    expect(catalog.decks.aegis_heat_answer.player_deck.map((entry) => entry.card)).toContain('quench')
    expect(catalog.decks.aegis_heat_answer.encounter).toBe('embermaw_prototype')
  })
})

describe('Counter hosts — ground and prepared cards (D-048)', () => {
  function withHosts(counters: Record<string, Record<string, unknown>>, cards: Record<string, Record<string, unknown>>) {
    const variant = structuredClone(catalog)
    for (const [id, patch] of Object.entries(counters)) {
      variant.counters[id] = { id, title: id, rules_text: '', keywords: [], host: 'combatant', max: 5, duration_rounds: 0, readers: [], ...patch }
    }
    for (const [cardId, patch] of Object.entries(cards)) {
      variant.cards[cardId] = { ...variant.cards.steady_strike, id: cardId, title: cardId, boss_damage: 0, damage: 0, charge_modifiers: [], ...patch }
    }
    return variant
  }

  function armed(variant: ReturnType<typeof withHosts>, cardId: string, slotIndex = 0) {
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    hero(state).hand = [card('t1', cardId), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId: 't1' }).state
    return resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex, cardInstanceId: 't2' }).state
  }

  const heroHex = (state: EncounterState) => state.board.entities[state.primaryHeroId].coords

  // stepPhases reads the module catalog; these tests hold variant cards in
  // Slots, so they need the variant's own advance.
  function steps(variant: ReturnType<typeof withHosts>, state: EncounterState, count: number): EncounterState {
    let current = state
    for (let index = 0; index < count; index += 1) {
      current = advancePhase(variant, current).state
    }
    return current
  }

  it('puts a Counter on ground, where it outlives whoever was standing there', () => {
    const variant = withHosts(
      { embers: { host: 'hex', max: 3 } },
      {
        scatter: { target_type: 'hex', range_tiles: 2, burst_radius: 0, places_counter: 'embers', counter_amount: 2 },
        reap: {
          target_type: 'hex',
          range_tiles: 2,
          burst_radius: 0,
          boss_damage: 0,
          reads: [{ verb: 'scale', counter: 'embers', on: 'target', per: 3, effect: 'damage_to_boss', timing: 'cost', at_least: 0, amount: 0, counter_keyword: '' }],
        },
      },
    )
    let state = armed(variant, 'scatter')
    const ground = heroHex(state)
    const scattered = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: ground })
    expect(scattered.facts[0].detail.placedCounterAmount).toBe(2)
    expect(scattered.state.counters[hexCounterRef(ground)][0]).toMatchObject({ id: 'embers', count: 2 })
    // Ground is not a piece: nothing about the Hero standing on it is
    // recorded, and moving off changes nothing.
    expect(scattered.state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)

    state = armed(variant, 'reap')
    state.counters = structuredClone(scattered.state.counters)
    const before = state.board.entities[state.bossId].health
    const reaped = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: ground })
    expect(before - reaped.state.board.entities[state.bossId].health).toBe(6)
  })

  it('refuses a hex Counter aimed off the board or out of range', () => {
    const variant = withHosts(
      { embers: { host: 'hex', max: 3 } },
      { scatter: { target_type: 'hex', range_tiles: 1, burst_radius: 0, places_counter: 'embers' } },
    )
    const state = armed(variant, 'scatter')
    const fire = (targetHex: { q: number; r: number }) =>
      legality(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex })
    expect(fire({ q: 99, r: 99 }).legal).toBe(false)
    const far = { q: heroHex(state).q + 3, r: heroHex(state).r }
    expect(fire(far).legal).toBe(false)
    expect(fire(heroHex(state)).legal).toBe(true)
  })

  it('puts a Counter on a prepared Slot, and drops it when that Slot is re-loaded', () => {
    // D-035's attachment, reachable at last. The Counter rides the prepared
    // card rather than the Slot's position, so swapping the card drops it.
    const variant = withHosts(
      { oath: { host: 'slot', max: 1 } },
      { bind: { target_type: 'board_slot', places_counter: 'oath' } },
    )
    let state = armed(variant, 'bind', 0)
    // Slot 1 holds a prepared card for the Counter to ride.
    hero(state).hand = [card('s1', 'iron_guard')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 1, cardInstanceId: 's1' }).state

    const bound = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetSlotIndex: 1 })
    expect(bound.facts[0].succeeded).toBe(true)
    expect(bound.state.counters[slotRef(state.primaryHeroId, 1)][0]).toMatchObject({ id: 'oath', count: 1 })

    // Replacing a Slot is a Loadout action, so the swap happens next Round.
    const after = steps(variant, bound.state, 3)
    expect(after.phase).toBe('loadout')
    expect(after.counters[slotRef(after.primaryHeroId, 1)]).toHaveLength(1)
    hero(after).hand = [card('s2', 'iron_guard')]
    const reloaded = resolve(variant, after, { kind: 'load_slot', sourceId: after.primaryHeroId, slotIndex: 1, cardInstanceId: 's2' })
    expect(reloaded.facts[0].succeeded).toBe(true)
    expect(reloaded.facts[0].detail.clearedSlotCounters).toBe(true)
    expect(reloaded.state.counters[slotRef(after.primaryHeroId, 1)]).toBeUndefined()
  })

  it('refuses a Slot Counter aimed at an empty Slot', () => {
    const variant = withHosts(
      { oath: { host: 'slot', max: 1 } },
      { bind: { target_type: 'board_slot', places_counter: 'oath' } },
    )
    const state = armed(variant, 'bind', 0)
    const verdict = legality(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetSlotIndex: 2 })
    expect(verdict.legal).toBe(false)
    expect(verdict.reason).toContain('prepared Slot')
  })

  it('drops ground Counters when the hex leaves the board', () => {
    // The upkeep asks whether the host is still there, not what kind of host
    // it was. Note what this does *not* prove: no live mechanic removes a hex.
    // A structural Escalation Threshold lays a permanent Hazard on ground
    // (D-031) rather than taking it off the board, so a Counter on Scorched
    // ground survives today. This deletes the hex directly to reach the
    // liveness rule; whether Scorch should also drop Counters is a design
    // question nobody has answered.
    const variant = withHosts(
      { embers: { host: 'hex', max: 3 } },
      { scatter: { target_type: 'hex', range_tiles: 2, burst_radius: 0, places_counter: 'embers' } },
    )
    let state = armed(variant, 'scatter')
    const ground = heroHex(state)
    state = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0, targetHex: ground }).state
    expect(state.counters[hexCounterRef(ground)]).toHaveLength(1)

    delete state.board.hexes[hexKey(ground)]
    state = steps(variant, state, 3)
    expect(state.counters[hexCounterRef(ground)]).toBeUndefined()
  })
})

describe('Event Keywords — Readers that answer one kind of blow (D-049)', () => {
  // The fact stream already carried what a blow was made of; D-049 is what
  // lets content read it. A Reader with no `event_keyword` answers every blow
  // of its kind, and one that names a Keyword answers only blows carrying it —
  // the same Reader with one field different.
  function withWard(eventKeyword: string) {
    const variant = structuredClone(catalog)
    variant.counters.warded = {
      id: 'warded',
      title: 'Warded',
      rules_text: 'Answers one kind of blow.',
      keywords: [],
      host: 'combatant',
      max: 1,
      duration_rounds: 0,
      readers: [{ when: 'host_takes_damage', event_keyword: eventKeyword, effect: 'damage_taken', per: -2 }],
    }
    return variant
  }

  function warded(variant: ReturnType<typeof withWard>) {
    const state = immortalHero(start())
    state.counters[combatantRef(state.primaryHeroId)] = [
      {
        id: 'warded',
        title: 'Warded',
        count: 1,
        max: 1,
        remainingRounds: 0,
        readers: variant.counters.warded.readers.map((reader) => ({ ...reader })),
        bonusBossDamageOnSlotFired: 0,
        bonusBossDamageOffPayoff: 0,
        consumeOnCardId: '',
        expiresAtWindowEnd: '',
        triggerReason: 'test',
        sourceId: 'test',
        sourceBeatId: '',
        triggerRound: state.round,
        triggerPhase: state.phase,
      },
    ]
    return state
  }

  const blow = (state: EncounterState, keywords: string[]) => ({
    kind: 'damage' as const,
    sourceId: state.bossId,
    targetId: state.primaryHeroId,
    amount: 5,
    reasonText: 'test',
    factContext: { damage_keywords: keywords },
  })

  it('answers only the blows carrying its Keyword', () => {
    const variant = withWard('raid_hit')
    const state = warded(variant)
    expect(resolve(variant, state, blow(state, ['raid_hit'])).facts[0].resolutionFact).toMatchObject({ requested: 3 })
    // A Tank Hit is a different kind of blow, so the ward is silent.
    expect(resolve(variant, state, blow(state, ['tank_hit'])).facts[0].resolutionFact).toMatchObject({ requested: 5 })
    // And a blow made of nothing named goes through untouched.
    expect(resolve(variant, state, blow(state, [])).facts[0].resolutionFact).toMatchObject({ requested: 5 })
  })

  it('answers every blow when it names no Keyword', () => {
    const variant = withWard('')
    const state = warded(variant)
    for (const keywords of [['raid_hit'], ['tank_hit'], []]) {
      expect(resolve(variant, state, blow(state, keywords)).facts[0].resolutionFact).toMatchObject({ requested: 3 })
    }
  })

  it('matches one Keyword out of several a blow carries', () => {
    // Plural is the point: a blow can be aimed at the Tank *and* made of
    // fire, and a ward against one still answers it.
    const variant = withWard('raid_hit')
    const state = warded(variant)
    expect(resolve(variant, state, blow(state, ['tank_hit', 'raid_hit'])).facts[0].resolutionFact).toMatchObject({ requested: 3 })
  })

  it("keywords the party's own damage, so a Reader can answer what a Hero throws", () => {
    // The gap this closes: only Boss Beats classified their damage, so an
    // event-Keyword Reader worked in one direction only.
    const variant = structuredClone(catalog)
    variant.cards.ember_jab = {
      ...variant.cards.steady_strike,
      id: 'ember_jab',
      title: 'Ember Jab',
      charge_modifiers: [],
      boss_damage: 4,
      damage: 0,
      damage_keywords: ['raid_hit'],
    }
    variant.counters.warded = {
      id: 'warded',
      title: 'Warded',
      rules_text: '',
      keywords: [],
      host: 'combatant',
      max: 1,
      duration_rounds: 0,
      readers: [{ when: 'host_takes_damage', event_keyword: 'raid_hit', effect: 'damage_taken', per: -3 }],
    }
    let state = immortalHero(start())
    state = stepPhases(state, 2).state
    hero(state).hand = [card('t1', 'ember_jab'), card('t2', 'steady_strike')]
    state = resolve(variant, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't1' }).state
    state = resolve(variant, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 't2' }).state
    state.counters[combatantRef(state.bossId)] = [
      {
        id: 'warded',
        title: 'Warded',
        count: 1,
        max: 1,
        remainingRounds: 0,
        readers: variant.counters.warded.readers.map((reader) => ({ ...reader })),
        bonusBossDamageOnSlotFired: 0,
        bonusBossDamageOffPayoff: 0,
        consumeOnCardId: '',
        expiresAtWindowEnd: '',
        triggerReason: 'test',
        sourceId: 'test',
        sourceBeatId: '',
        triggerRound: state.round,
        triggerPhase: state.phase,
      },
    ]
    const before = state.board.entities[state.bossId].health
    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    expect(before - fired.state.board.entities[state.bossId].health).toBe(1)
  })
})

// The tier ladder, in the reduced form that outlived the Forecast Row.
// ADR 0026 claimed the ladder and the row "stand or fall together"; that was
// half right. The disclosure half fell with the row — `severe` no longer means
// "must be forecast first", because nothing is forecast. What these tests keep
// is the authoring discipline underneath it, which the opener rule (D-036)
// depends on: a Beat that can end the run has to be labelled as one, or the
// rule that keeps such Beats out of a phase's first program has nothing to
// check against.
describe('Consequence Tier ladder (D-021, ADR 0031)', () => {
  const everyBeat = Object.values(catalog.programs).flatMap((program) => [
    ...program.instant_beats.map((beat) => ({ beat, program })),
    ...program.incoming_beats.map((beat) => ({ beat, program })),
  ])

  it('rates a Beat that can cross an Escalation Threshold as severe', () => {
    // An Escalation Threshold crossing is one of D-025's run-ending outcomes,
    // so such a Beat is severe by definition — which is what keeps it out of
    // the first program of a phase, the one Round nobody can have learned.
    for (const { beat } of everyBeat) {
      if (beat.escalation_if_unanswered > 0) {
        expect(beat.consequence_tier).toBe('severe')
      }
    }
  })

  it('rates a Beat that spawns or changes the board at least structural', () => {
    for (const { beat } of everyBeat) {
      if (beat.minion !== undefined || beat.hazard !== undefined) {
        expect(highestTier({ ...catalog.programs.embermaw_hunt, instant_beats: [beat], incoming_beats: [] })).not.toBe('chip')
      }
    }
  })

  it('holds severe to its measured floor: lethal from full health, or Escalation-adding', () => {
    // The floor is what makes the tier a per-Beat property. Without it, "can
    // down a Hero" depends on accumulated attrition — measured at 9.7 average
    // health entering Phase II against a 34 maximum, which would make nearly
    // every Beat severe by the late Rounds and the tier meaningless.
    const encounter = catalog.encounters.embermaw_prototype
    for (const { beat } of everyBeat) {
      if (beat.consequence_tier !== 'severe') {
        continue
      }
      const lethalFromFull = beat.damage + beat.unguarded_bonus >= encounter.player_health
      expect(
        lethalFromFull || beat.escalation_if_unanswered > 0,
        `${beat.id} is authored severe but neither downs a Hero from full health (${beat.damage}+${beat.unguarded_bonus} vs ${encounter.player_health}) nor adds Escalation`,
      ).toBe(true)
    }
  })

  it('rates every Escalation-adding Beat severe, and nothing else', () => {
    // Content earned the tier, which the previous version of this test invited:
    // Brood Call is now priced (D-036), and a Beat that can add Escalation is
    // severe by definition because a Threshold crossing is one of D-025's
    // run-ending outcomes. Every severe Beat here is severe for that reason —
    // Embermaw still has no single hit that downs a Hero from full health.
    const severe = everyBeat.filter(({ beat }) => beat.consequence_tier === 'severe')
    expect(severe.map(({ beat }) => beat.id).sort()).toEqual(['brood_call', 'brood_call', 'within_reach', 'within_reach', 'within_reach'])
    expect(severe.every(({ beat }) => beat.escalation_if_unanswered > 0)).toBe(true)
    const worst = Math.max(...everyBeat.map(({ beat }) => beat.damage + beat.unguarded_bonus))
    expect(worst).toBeLessThan(catalog.encounters.embermaw_prototype.player_health)
  })

})

describe('Escalation as the single clock (D-023, ADR 0027)', () => {
  // A passive Hero who never clears an add: give them enough Health that
  // Escalation, not attrition, is what ends the fight.
  function immortal(seed?: number): EncounterState {
    return immortalHero(start(seed))
  }

  // Whelps only arrive on a Brood Round, and the pinned opener is not one
  // (D-036), so tests about the Whelp demand step to Round 2 on a seed that
  // schedules Brood Pattern there. Slow of Round 2 is nine phase steps in.
  const PHASES_TO_BROOD_SLOW = 9
  const PHASES_TO_BROOD_QUICK = 7

  function clearMinions(state: EncounterState): void {
    for (const entity of Object.values(state.board.entities)) {
      if (entity.kind === 'minion') {
        delete state.board.entities[entity.id]
      }
    }
  }

  it('derives the start Round so automatic ticks alone reach the top at the Encounter Clock', () => {
    expect(escalationStartRound(8)).toBe(4)
    expect(start().escalationStartRound).toBe(4)
    // Five ticks from the start Round through the clock: 4, 5, 6, 7, 8.
    expect(8 - escalationStartRound(8) + 1).toBe(ESCALATION_MAX)
  })

  it('does not tick before the start Round, then ticks once per Round end', () => {
    let state = immortal()
    for (let round = 1; round < 4; round += 1) {
      const wrap = stepPhases(state, 5)
      // Clear each Round's Whelps so only the automatic tick can move the value.
      state = wrap.state
      clearMinions(state)
      expect(state.escalation).toBe(0)
    }
    expect(state.round).toBe(4)
    state = stepPhases(state, 5).state
    clearMinions(state)
    expect(state.escalation).toBe(1)
    state = stepPhases(state, 5).state
    clearMinions(state)
    expect(state.escalation).toBe(2)
  })

  it('ends the fight at the end of Round 8 on automatic ticks alone', () => {
    // Boundary identity with the retired round-limit check: a party that
    // answers every demand reaches the wipe exactly where the old clock ended.
    let state = immortal()
    let guard = 0
    while (state.active && guard < 60) {
      guard += 1
      const wrap = advancePhase(catalog, state)
      state = wrap.state
      if (state.phase === 'slow') {
        clearMinions(state)
      }
    }
    expect(state.active).toBe(false)
    expect(state.outcome).toBe('defeat')
    expect(state.outcomeReason).toBe('Enrage: Embermaw overwhelms the party.')
    expect(state.round).toBe(9)
    expect(state.escalation).toBe(ESCALATION_MAX)
  })

  it('accelerates from an unanswered Whelp, so the collapse arrives early', () => {
    // Embermaw authors the penalty at 0 while the live deck has no Whelp
    // answer (D-003), so the trigger is proven against a catalog variant that
    // does price it. Nothing else changes: same passive Hero, adds never
    // cleared, and the fight now ends before the Encounter Clock.
    const priced = structuredClone(catalog)
    for (const program of Object.values(priced.programs)) {
      for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
        if (beat.kind === 'spawn_minions') {
          beat.escalation_if_unanswered = 1
        }
      }
    }
    let state = immortal()
    let guard = 0
    while (state.active && guard < 60) {
      guard += 1
      state = advancePhase(priced, state).state
    }
    expect(state.active).toBe(false)
    expect(state.outcomeReason).toBe('Enrage: Embermaw overwhelms the party.')
    expect(state.round).toBeLessThan(9)
    expect(state.escalation).toBe(ESCALATION_MAX)
  })

  it('prices Brood Call only because the deck can answer it (D-003)', () => {
    // D-003 forbids pricing a demand the deck cannot answer. The old form of
    // this test asserted a blanket `0`, which read as the rule but was really a
    // snapshot of one encounter's tuning — and it hid the fact that the premise
    // had gone stale: the starter deck carries Sweeping Blow, which one-shots a
    // Whelp. State the rule instead, so pricing and answerability can never
    // drift apart.
    const encounter = catalog.encounters.embermaw_prototype
    const priced = Object.values(catalog.programs)
      .flatMap((program) => [...program.instant_beats, ...program.incoming_beats])
      .filter((beat) => beat.kind === 'spawn_minions' && beat.escalation_if_unanswered > 0)
    expect(priced.length).toBeGreaterThan(0)
    const whelpHealth = catalog.minions.whelp.max_health
    const answers = encounter.player_deck.filter((entry) => {
      const card = catalog.cards[entry.card]
      return card.target_type === 'piece' && card.damage >= whelpHealth
    })
    expect(
      answers.length,
      `Brood Call is priced but no card in the deck deals ${whelpHealth}+ to a piece`,
    ).toBeGreaterThan(0)
  })

  it('does not count a Whelp that arrived this Round as unanswered', () => {
    // Whelps spawn in the Incoming Row, so no player window can reach them
    // before the Round-end step: counting them would be a second automatic
    // tick rather than earned acceleration.
    let state = immortalHero(startBroodSecond())
    state = stepPhases(state, PHASES_TO_BROOD_SLOW).state
    expect(state.phase).toBe('slow')
    expect(state.round).toBe(2)
    expect(Object.values(state.board.entities).some((entity) => entity.kind === 'minion')).toBe(true)
    state = stepPhases(state, 1).state
    expect(state.round).toBe(3)
    // Automatic ticks have not begun either, so a nonzero value here could only
    // have come from the Whelps that just landed.
    expect(state.escalation).toBe(0)
  })

  it('permanently Scorches the arena at a structural threshold (D-031)', () => {
    const threshold = catalog.encounters.embermaw_prototype.escalation_thresholds.find((entry) => entry.value === 1)!
    expect(threshold.scorch_hexes.length).toBeGreaterThan(0)
    expect(threshold.boss_damage_bonus).toBe(0)

    const state = immortal()
    state.escalation = 0
    const crossed = resolve(catalog, state, { kind: 'gain_escalation', sourceId: 'encounter', amount: 1, reason: 'automatic_tick', beatId: '' })
    for (const coords of threshold.scorch_hexes) {
      const hazards = crossed.state.board.hazards[hexKey(coords)] ?? []
      expect(hazards.some((hazard) => hazard.id === 'scorched' && hazard.permanent === true)).toBe(true)
    }
    // Permanent means permanent: the Round boundary does not clear it, unlike
    // the Scorch a Cinder Breath leaves behind.
    const later = stepPhases(crossed.state, 5).state
    const first = threshold.scorch_hexes[0]
    expect((later.board.hazards[hexKey(first)] ?? []).some((hazard) => hazard.permanent === true)).toBe(true)
  })

  // The acceleration lesson in another form: an effect that removes the Tank's
  // own answer is a problem the party cannot answer. The rule is enforced at
  // load for every Encounter, so a new arena inherits it instead of having to
  // remember it.
  describe('the Guarded Front cannot burn (D-031)', () => {
    it('holds for every authored Encounter', () => {
      for (const encounter of Object.values(catalog.encounters)) {
        for (const threshold of encounter.escalation_thresholds) {
          for (const coords of threshold.scorch_hexes) {
            expect(hexDistance(coords, encounter.boss_start)).toBeGreaterThan(1)
          }
        }
      }
    })

    it('is rejected at load, naming the Encounter and the hex', () => {
      const encounter = structuredClone(catalog.encounters.embermaw_prototype)
      // One hex north-east of the Boss: adjacent, and therefore part of the
      // Guarded Front the Tank is written to hold.
      encounter.escalation_thresholds[0].scorch_hexes = [
        { q: encounter.boss_start.q, r: encounter.boss_start.r + 1 },
      ]
      const raw = {
        cards: Object.values(catalog.cards),
        keywords: Object.values(catalog.keywords),
        chargeModifiers: Object.values(catalog.chargeModifiers),
        hazards: Object.values(catalog.hazards),
        minions: Object.values(catalog.minions),
        counters: Object.values(catalog.counters),
        programs: Object.values(catalog.programs),
        encounters: [{ source: 'data/encounters/ashen_trial_variant.json', payload: encounter }],
      }
      expect(() => buildCatalog(raw)).toThrow(
        /Encounter embermaw_prototype \(data\/encounters\/ashen_trial_variant\.json\) threshold 1 \("Ashen Verge"\) Scorches \(1, 0\), which is adjacent to the Boss at \(1, -1\)/,
      )
    })

    it('accepts the same threshold one hex further out', () => {
      const encounter = structuredClone(catalog.encounters.embermaw_prototype)
      encounter.escalation_thresholds[0].scorch_hexes = [
        { q: encounter.boss_start.q, r: encounter.boss_start.r + 2 },
      ]
      const raw = {
        cards: Object.values(catalog.cards),
        keywords: Object.values(catalog.keywords),
        chargeModifiers: Object.values(catalog.chargeModifiers),
        hazards: Object.values(catalog.hazards),
        minions: Object.values(catalog.minions),
        counters: Object.values(catalog.counters),
        programs: Object.values(catalog.programs),
        encounters: [encounter],
      }
      expect(() => buildCatalog(raw)).not.toThrow()
    })
  })

  it('still applies a numeric threshold when one is authored', () => {
    // The read-time modifiers stay supported for Bosses that want them; what
    // D-031 changed is Embermaw's authored content, not the mechanism.
    const claw = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'targeted_hit')!
    const state = start()
    state.escalation = 1
    state.escalationThresholds = [{ value: 1, title: 'Test Band', rules_text: '', boss_damage_bonus: 2, extra_spawn_count: 0, minion_damage_bonus: 0, scorch_hexes: [] }]
    const hit = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    expect(hit.facts.find((fact) => fact.kind === 'damage')?.resolutionFact).toMatchObject({ requested: 6, escalation_bonus: 2 })
  })

  it('keeps every threshold at or below the value live, not only the current band', () => {
    // Cumulative is what lets a Boss raise the same axis twice at different
    // bands, and it is the reason a threshold can be authored as a step up
    // rather than as a replacement. Reading only the exact band is the quiet
    // failure: nothing errors, the widened Brood Call simply stops happening
    // from Escalation 3 upward, and every other Escalation test still passes
    // because each one pins a single band.
    const state = start()
    for (let value = 0; value <= ESCALATION_MAX; value += 1) {
      state.escalation = value
      const live = state.escalationThresholds.filter((threshold) => threshold.value <= value)
      expect(escalationModifiers(state), `Escalation ${value}`).toEqual({
        bossDamageBonus: live.reduce((sum, threshold) => sum + threshold.boss_damage_bonus, 0),
        extraSpawnCount: live.reduce((sum, threshold) => sum + threshold.extra_spawn_count, 0),
        minionDamageBonus: live.reduce((sum, threshold) => sum + threshold.minion_damage_bonus, 0),
      })
    }

    // The loop above mirrors the implementation's own arithmetic, so it cannot
    // be the whole guard. This is the authored consequence stated on its own
    // terms: Embermaw widens the Brood Call at 2 and sharpens Whelp bites at 3,
    // on different axes, so at 3 both have to be live at once.
    state.escalation = 3
    const atThree = escalationModifiers(state)
    expect(atThree.extraSpawnCount).toBeGreaterThan(0)
    expect(atThree.minionDamageBonus).toBeGreaterThan(0)
  })

  it('raises Whelp bite damage at threshold 3', () => {
    const biting = stepPhases(immortalHero(startBroodSecond()), PHASES_TO_BROOD_SLOW).state
    biting.escalation = 3
    const heroCoords = biting.board.entities[biting.primaryHeroId].coords
    const whelp = Object.values(biting.board.entities).find((entity) => entity.kind === 'minion')!
    biting.board.entities[whelp.id].coords = { ...heroCoords, q: heroCoords.q + 1 }
    const bite = advancePhase(catalog, biting)
    const biteFact = bite.facts.find((fact) => fact.kind === 'damage' && fact.resolutionFact?.minion_intent === true)
    expect(biteFact?.resolutionFact).toMatchObject({ requested: 2, escalation_bonus: 1 })
  })

  it('widens the Brood Call at threshold 2, and the telegraph does not lie', () => {
    const state = immortalHero(startBroodSecond())
    state.escalation = 2
    // refreshTelegraphs runs on the way into a player window; step to the Brood
    // Round's Quick Window.
    const quick = stepPhases(state, PHASES_TO_BROOD_QUICK).state
    expect(quick.currentProgramId).toBe('embermaw_brood')
    expect(quick.telegraphedSpawnHexes).toHaveLength(3)
    const incoming = advancePhase(catalog, quick)
    expect(incoming.facts.filter((fact) => fact.kind === 'spawn_minion')).toHaveLength(3)
  })

  it('records every Escalation gain with its reason and crossed thresholds', () => {
    const state = immortal()
    state.round = state.roundLimit
    state.phase = 'slow'
    const wrap = advancePhase(catalog, state)
    const gain = wrap.facts.find((fact) => fact.kind === 'gain_escalation')
    expect(gain?.resolutionFact).toMatchObject({
      escalation_before: 0,
      escalation_after: 1,
      escalation_reason: 'automatic_tick',
      thresholds_crossed: ['Ashen Verge'],
    })
  })
})

describe('Raking Claw counter-pressure (D-017)', () => {
  it('adds the unguarded bonus only when the Guarded Front is unheld', () => {
    const claw = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'targeted_hit')!
    // Holding the front: the authored 4 lands with no bonus recorded.
    let state = start()
    const held = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    const heldFact = held.facts.find((fact) => fact.kind === 'damage')
    expect(heldFact?.resolutionFact).toMatchObject({ requested: 4, guarded_front: true })
    expect(heldFact?.resolutionFact?.unguarded_bonus).toBeUndefined()
    // Abandoning the front: the same claw still lands (movement does not
    // evade it) and rakes for the authored 4 + 3.
    state = start()
    state.board.entities[state.primaryHeroId].coords = { q: -2, r: 0 }
    const unheld = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: claw, track: 'instant' })
    const unheldFact = unheld.facts.find((fact) => fact.kind === 'damage')
    expect(unheldFact?.resolutionFact).toMatchObject({ requested: 7, unguarded_bonus: 3, guarded_front: false })
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

describe('Slot rules', () => {
  it('loads, charges, and fires a Slot with Charge Modifiers', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike'), card('h2', 'iron_guard'), card('h3', 'iron_guard'), card('h4', 'fortify')]

    const load = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h1' })
    state = load.state
    expect(load.facts[0].succeeded).toBe(true)
    expect(hero(state).actionBar[0].topCard?.cardId).toBe('steady_strike')

    const chargeTooEarly = legality(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h2',
    })
    expect(chargeTooEarly).toMatchObject({ legal: false, reason: 'Charging requires a legal Slot during Quick or Slow.' })

    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')

    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h2' }).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h3' }).state
    expect(hero(state).actionBar[0].charges).toHaveLength(2)

    const bossHealthBefore = boss(state).health
    const fire = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = fire.state
    // Steady Strike: 2 boss damage plus 1 per charged card.
    expect(boss(state).health).toBe(bossHealthBefore - 4)
    expect(hero(state).actionBar[0].activatedWindow).toBe('quick')
    expect(hero(state).actionBar[0].charges).toHaveLength(2)

    const fireAgain = legality(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    expect(fireAgain).toMatchObject({ legal: false, reason: 'A Slot may fire only once in its matching window.' })
    const chargeAfterFire = legality(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h4',
    })
    expect(chargeAfterFire).toMatchObject({ legal: false, reason: 'That Slot cannot accept another charge.' })
  })

  // Ruled (working note §6): the Slot Activation Limit blocks further
  // charges only within the activation window, per CONTEXT.md — and
  // prototype-rules.md now says the same. This test pins the ruled behavior.
  it('allows charging a fired Quick Slot again once that window has ended', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike'), card('h2', 'iron_guard'), card('h3', 'iron_guard')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h1' }).state
    state = stepPhases(state, 2).state
    state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h2' }).state
    state = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 }).state
    const sameWindow = legality(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h3',
    })
    expect(sameWindow.legal).toBe(false)
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('slow')
    const nextWindow = legality(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h3',
    })
    expect(nextWindow.legal).toBe(true)
  })

  it('only allows Slot Replacement during Loadout', () => {
    let state = start()
    hero(state).hand = [card('h1', 'steady_strike'), card('h2', 'iron_guard')]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h1' }).state
    state = stepPhases(state, 2).state
    const replaceInQuick = legality(catalog, state, {
      kind: 'load_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: 'h2',
    })
    expect(replaceInQuick).toMatchObject({ legal: false, reason: 'Replacing a Slot is only allowed during Loadout.' })
    // An empty Slot still accepts a Top Card for free during a player window.
    const loadEmpty = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 1, cardInstanceId: 'h2' })
    expect(loadEmpty.facts[0].succeeded).toBe(true)
  })

  it('applies Full-Charge Cleanup only to a full Slot that activated', () => {
    let state = start()
    hero(state).hand = [
      card('h1', 'steady_strike'),
      card('h2', 'iron_guard'),
      card('h3', 'iron_guard'),
      card('h4', 'iron_guard'),
      card('h5', 'steady_strike'),
    ]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: 'h1' }).state
    state = stepPhases(state, 2).state
    for (const instanceId of ['h2', 'h3', 'h4']) {
      state = resolve(catalog, state, { kind: 'charge_slot', sourceId: state.primaryHeroId, slotIndex: 0, cardInstanceId: instanceId }).state
    }
    // Primed: full stack, not yet activated. Ending the window keeps it.
    const primedEnd = advancePhase(catalog, state)
    expect(primedEnd.facts.some((fact) => fact.kind === 'full_charge_cleanup')).toBe(false)
    expect(primedEnd.state.heroes[state.primaryHeroId].actionBar[0].topCard?.cardId).toBe('steady_strike')

    // Firing the full Slot, then ending the window, discards the bundle.
    state = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 }).state
    const discardBefore = hero(state).discard.length
    const cleanupEnd = advancePhase(catalog, state)
    const cleanupFact = cleanupEnd.facts.find((fact) => fact.kind === 'full_charge_cleanup')
    expect(cleanupFact?.succeeded).toBe(true)
    state = cleanupEnd.state
    expect(hero(state).actionBar[0].topCard).toBeNull()
    expect(hero(state).discard.length).toBe(discardBefore + 4)
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

describe('area damage cards', () => {
  function withBurstCard(patch: Record<string, unknown> = {}) {
    const variant = structuredClone(catalog)
    variant.cards.burst_test = {
      ...variant.cards.sweeping_blow,
      id: 'burst_test',
      title: 'Burst Test',
      target_type: 'hex',
      range_tiles: 1,
      damage: 1,
      burst_radius: 1,
      ...patch,
    }
    return variant
  }

  function readyBurst(variant: ReturnType<typeof withBurstCard>): EncounterState {
    let state = start()
    for (const [minionId, coords] of [
      ['whelp_a', { q: -2, r: 0 }],
      ['whelp_b', { q: -1, r: 1 }],
      ['whelp_far', { q: 0, r: 2 }],
    ] as const) {
      state = resolve(variant, state, {
        kind: 'spawn_minion',
        sourceId: state.bossId,
        minionId,
        coords,
        minionContentId: 'ember_whelp',
      }).state
    }
    state.phase = 'quick'
    hero(state).actionBar[0] = {
      topCard: card('burst', 'burst_test'),
      charges: [card('charge', 'iron_guard')],
      activatedWindow: null,
      placedThisLoadout: false,
    }
    return state
  }

  it('centres on empty ground and damages every nearby Enemy but no ally', () => {
    const variant = withBurstCard()
    const state = readyBurst(variant)
    const heroHealthBefore = hero(state).health
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.facts[0].succeeded).toBe(true)
    expect(fired.state.board.entities.whelp_a.health).toBe(1)
    expect(fired.state.board.entities.whelp_b.health).toBe(1)
    expect(fired.state.board.entities.whelp_far.health).toBe(2)
    expect(hero(fired.state).health).toBe(heroHealthBefore)
  })

  it('emits one damage fact per Enemy in stable id order and records its footprint', () => {
    const variant = withBurstCard()
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.targetId)).toEqual(['whelp_a', 'whelp_b'])
    expect(fired.facts[0].detail).toMatchObject({
      burstCenter: { q: -1, r: 0 },
      burstHexes: [
        { q: -1, r: 0 },
        { q: -2, r: 0 },
        { q: -2, r: 1 },
        { q: -1, r: -1 },
        { q: -1, r: 1 },
        { q: 0, r: -1 },
        { q: 0, r: 0 },
      ],
    })
  })

  it('includes the Boss as an Enemy and deals ordinary target damage', () => {
    const variant = withBurstCard({ burst_radius: 2 })
    const state = readyBurst(variant)
    const healthBefore = boss(state).health
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(boss(fired.state).health).toBe(healthBefore - 1)
    expect(fired.facts.find((fact) => fact.kind === 'damage' && fact.detail.targetId === state.bossId)?.detail.amount).toBe(1)
  })

  it('applies target-damage Charge Modifiers to every affected Enemy', () => {
    const variant = withBurstCard({ charge_modifiers: ['burst_damage'] })
    variant.chargeModifiers.burst_damage = {
      ...variant.chargeModifiers.each_charge_boss_damage,
      id: 'burst_damage',
      title: 'Burst Damage',
      effect: 'damage_to_target',
    }
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.state.board.entities.whelp_a).toBeUndefined()
    expect(fired.state.board.entities.whelp_b).toBeUndefined()
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.amount)).toEqual([2, 2])
  })

  it('damages every captured Minion before a lethal hit ends the Encounter', () => {
    const variant = withBurstCard({ burst_radius: 2, damage: 99 })
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.state.outcome).toBe('victory')
    expect(fired.state.board.entities.whelp_a).toBeUndefined()
    expect(fired.state.board.entities.whelp_b).toBeUndefined()
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.targetId)).toEqual([
      'whelp_a',
      'whelp_b',
      state.bossId,
    ])
  })

  it('finishes every Burst hit before a mixed Card applies lethal direct Boss damage', () => {
    const variant = withBurstCard({ burst_radius: 2, damage: 1, boss_damage: 99 })
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(fired.state.outcome).toBe('victory')
    expect(fired.state.board.entities.whelp_a.health).toBe(1)
    expect(fired.state.board.entities.whelp_b.health).toBe(1)
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.targetId)).toEqual([
      'whelp_a',
      'whelp_b',
      state.bossId,
    ])
  })

  it('consumes Riposte Ready when the Burst includes the Boss and bonuses only that hit', () => {
    const variant = withBurstCard({ burst_radius: 2, damage: 1 })
    let state = readyBurst(variant)
    hero(state).armor = 5
    state = resolve(variant, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { damage_keywords: ['tank_hit'] },
    }).state
    expect(state.counters[combatantRef(state.primaryHeroId)]?.[0]?.id).toBe('riposte_ready')
    const bossHealthBefore = boss(state).health
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetHex: { q: -1, r: 0 },
    })
    expect(state.board.entities.whelp_a.health).toBe(2)
    expect(fired.state.board.entities.whelp_a.health).toBe(1)
    expect(boss(fired.state).health).toBe(bossHealthBefore - 2)
    expect(fired.state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)
    expect(fired.facts.find((fact) => fact.kind === 'damage' && fact.detail.targetId === state.bossId)?.resolutionFact).toMatchObject({
      base_amount: 1,
      counter_bonus: 1,
      payoff_card_id: 'burst_test',
    })
  })

  it('keeps radius zero on the existing single-Minion path', () => {
    const variant = withBurstCard({ target_type: 'piece', burst_radius: 0 })
    const state = readyBurst(variant)
    const fired = resolve(variant, state, {
      kind: 'fire_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      targetId: 'whelp_b',
    })
    expect(fired.state.board.entities.whelp_a.health).toBe(2)
    expect(fired.state.board.entities.whelp_b.health).toBe(1)
    expect(fired.facts.filter((fact) => fact.kind === 'damage').map((fact) => fact.detail.targetId)).toEqual(['whelp_b'])
  })

  it('requires an on-board centre within the Card range', () => {
    const variant = withBurstCard()
    const state = readyBurst(variant)
    expect(legality(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })).toMatchObject({
      legal: false,
      reason: 'The Top Card needs an on-board hex target.',
    })
    expect(
      legality(variant, state, {
        kind: 'fire_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        targetHex: { q: -2, r: 0 },
      }),
    ).toMatchObject({ legal: false, reason: "The chosen hex is outside the Top Card's range.", targetRange: 2 })
    expect(
      legality(variant, state, {
        kind: 'fire_slot',
        sourceId: state.primaryHeroId,
        slotIndex: 0,
        targetHex: { q: -1, r: 0 },
      }),
    ).toMatchObject({ legal: true, targetRange: 1 })
  })

  it('offers legal hex centres and previews the hovered burst footprint', () => {
    const variant = withBurstCard()
    const state = readyBurst(variant)
    const targeting = fireTargeting(variant, state, state.primaryHeroId, 0, { q: -1, r: 0 })
    expect(targeting.mode).toBe('hex')
    expect(targeting.legalHexes.map(hexKey)).toContain('-1,0')
    expect(targeting.previewHexes.map(hexKey)).toEqual(['-1,0', '-2,0', '-2,1', '-1,-1', '-1,1', '0,-1', '0,0'])
  })

  it('replays the same burst centre to the same ordered facts and state', () => {
    const variant = withBurstCard({ burst_radius: 1 })
    variant.encounters.embermaw_prototype.player_deck = [{ card: 'burst_test', copies: 4 }]
    const seeded = createEncounterState(variant, 'embermaw_prototype', 70)
    const [top, charge] = hero(seeded).hand
    const scenario: Scenario = {
      id: 'burst-replay',
      title: 'Burst replay',
      version: 1,
      description: '',
      encounter: 'embermaw_prototype',
      seed: 70,
      steps: [
        { action: { kind: 'load_slot', sourceId: seeded.primaryHeroId, slotIndex: 0, cardInstanceId: top.instanceId } },
        { advance: true },
        { advance: true },
        { action: { kind: 'charge_slot', sourceId: seeded.primaryHeroId, slotIndex: 0, cardInstanceId: charge.instanceId } },
        { action: { kind: 'fire_slot', sourceId: seeded.primaryHeroId, slotIndex: 0, targetHex: { q: 0, r: -1 } } },
      ],
    }
    const first = runScenario(variant, scenario)
    const second = runScenario(variant, scenario)
    expect(second.facts).toEqual(first.facts)
    expect(second.state).toEqual(first.state)
    expect(first.facts.filter((fact) => fact.kind === 'damage' && fact.sourceId === seeded.primaryHeroId).map((fact) => fact.detail.targetId)).toEqual([
      seeded.bossId,
    ])
  })
})

describe('card draw effects', () => {
  function withDrawCard(patch: Record<string, unknown> = {}) {
    const variant = structuredClone(catalog)
    variant.cards.draw_test = {
      ...variant.cards.iron_guard,
      id: 'draw_test',
      title: 'Draw Test',
      rules_text: 'Draw 2 cards.',
      speed: 'quick',
      target_type: 'none',
      armor_delta: 0,
      armor_next_round: 0,
      healing: 0,
      boss_damage: 0,
      damage: 0,
      draw_count: 2,
      burst_radius: 0,
      push_tiles: 0,
      pull_tiles: 0,
      charge_modifiers: [],
      places_counter: '',
      ...patch,
    }
    return variant
  }

  function readyDraw(variant: ReturnType<typeof withDrawCard>): EncounterState {
    const state = createEncounterState(variant, 'embermaw_prototype', 71)
    state.phase = 'quick'
    hero(state).actionBar[0] = {
      topCard: card('draw-top', 'draw_test'),
      charges: [card('draw-charge', 'iron_guard')],
      activatedWindow: null,
      placedThisLoadout: false,
    }
    return state
  }

  it('draws the authored count even when that exceeds the Round refill target', () => {
    const variant = withDrawCard()
    const state = readyDraw(variant)
    const handBefore = hero(state).hand.length
    const deckBefore = hero(state).deck.length
    expect(handBefore).toBe(hero(state).refillTarget)

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(hero(fired.state).hand).toHaveLength(handBefore + 2)
    expect(hero(fired.state).deck).toHaveLength(deckBefore - 2)
    expect(hero(fired.state).hand.length).toBeGreaterThan(hero(fired.state).refillTarget)
    expect(fired.facts.filter((fact) => fact.kind === 'draw_card')).toHaveLength(2)
  })

  it('reshuffles the discard when an explicit draw exhausts the deck midway through', () => {
    const variant = withDrawCard()
    const state = readyDraw(variant)
    const [lastInDeck, ...recyclable] = hero(state).deck.slice(0, 3)
    hero(state).deck = [lastInDeck]
    hero(state).discard = recyclable
    const handBefore = hero(state).hand.length

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(hero(fired.state).hand).toHaveLength(handBefore + 2)
    expect(fired.facts.map((fact) => fact.kind)).toEqual(['fire_slot', 'draw_card', 'shuffle_deck', 'draw_card'])
    expect(fired.state.rng.choices.at(-1)?.label).toBe('discard_shuffle')
  })

  it('records successful no-op draws when both piles are exhausted', () => {
    const variant = withDrawCard()
    const state = readyDraw(variant)
    hero(state).deck = []
    hero(state).discard = []
    const handBefore = [...hero(state).hand]

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    const draws = fired.facts.filter((fact) => fact.kind === 'draw_card')

    expect(fired.facts[0].succeeded).toBe(true)
    expect(hero(fired.state).hand).toEqual(handBefore)
    expect(draws).toHaveLength(2)
    expect(draws.every((fact) => fact.succeeded && fact.detail.drawn === false)).toBe(true)
  })

  it('emits draws after the Card damage and on-fire Counter consequences', () => {
    const variant = withDrawCard({ boss_damage: 1, draw_count: 1 })
    const state = readyDraw(variant)
    state.counters[combatantRef(state.primaryHeroId)] = [
      {
        id: 'draw_order_counter',
        title: 'Draw Order Counter',
        count: 1,
        max: 1,
        remainingRounds: 1,
        readers: [{ when: 'slot_fired', event_keyword: '', effect: 'damage_to_boss', per: 1 }],
        bonusBossDamageOnSlotFired: 0,
        bonusBossDamageOffPayoff: 0,
        consumeOnCardId: '',
        expiresAtWindowEnd: '',
        triggerReason: 'draw_order_test',
        sourceId: 'test',
        sourceBeatId: '',
        triggerRound: state.round,
        triggerPhase: state.phase,
      },
    ]

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(fired.facts.slice(1).map((fact) => [fact.kind, fact.detail.reasonText ?? ''])).toEqual([
      ['damage', 'Draw Test'],
      ['damage', 'counter_reader'],
      ['draw_card', ''],
    ])
  })

  it('finishes the authored draws after lethal Boss damage resolves first', () => {
    const variant = withDrawCard({ boss_damage: 1, draw_count: 1 })
    const state = readyDraw(variant)
    state.board.entities[state.bossId].health = 1
    const handBefore = hero(state).hand.length

    const fired = resolve(variant, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })

    expect(fired.facts.map((fact) => fact.kind)).toEqual(['fire_slot', 'damage', 'draw_card'])
    expect(fired.facts.every((fact) => fact.succeeded)).toBe(true)
    expect(fired.facts.at(-1)?.detail.drawn).toBe(true)
    expect(hero(fired.state).hand).toHaveLength(handBefore + 1)
    expect(fired.state).toMatchObject({ active: false, outcome: 'victory' })
  })
})

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
      counter_evaluation: { counter_id: 'riposte_ready', result: 'not_granted', reason: 'health_lost' },
    })
    expect(result.state.heroes[state.primaryHeroId].health).toBe(33)
    expect(result.state.heroes[state.primaryHeroId].armor).toBe(0)
  })

  it('grants Riposte Ready on a fully blocked Tank Hit at the Guarded Front', () => {
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
      counter_evaluation: { result: 'granted', reason: 'qualifying_tank_hit' },
    })
    expect(state.counters[combatantRef(state.primaryHeroId)]?.[0]?.id).toBe('riposte_ready')

    // A legal Shield Slam consumes Riposte Ready for 2 bonus Boss damage.
    state.phase = 'quick'
    hero(state).actionBar[0] = { topCard: card('s1', 'shield_slam'), charges: [card('s2', 'iron_guard')], activatedWindow: null, placedThisLoadout: false }
    const bossHealthBefore = boss(state).health
    const slam = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = slam.state
    expect(boss(state).health).toBe(bossHealthBefore - 5)
    expect(state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)
    const damageFact = slam.facts.find((fact) => fact.kind === 'damage')
    expect(damageFact?.resolutionFact).toMatchObject({ base_amount: 3, counter_bonus: 2, payoff_card_id: 'shield_slam' })
  })

  it('consumes Riposte Ready for +1 when a non-Shield-Slam Boss-damage card fires', () => {
    let state = start()
    hero(state).armor = 5
    state = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_keywords: ['tank_hit'] },
    }).state
    expect(state.counters[combatantRef(state.primaryHeroId)]?.[0]?.id).toBe('riposte_ready')

    state.phase = 'quick'
    hero(state).actionBar[0] = { topCard: card('s1', 'steady_strike'), charges: [card('s2', 'iron_guard')], activatedWindow: null, placedThisLoadout: false }
    const bossHealthBefore = boss(state).health
    const strike = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = strike.state
    // Steady Strike: 2 base + 1 per charged card + 1 off-payoff Riposte bonus.
    expect(boss(state).health).toBe(bossHealthBefore - 4)
    expect(state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)
    const damageFact = strike.facts.find((fact) => fact.kind === 'damage')
    expect(damageFact?.resolutionFact).toMatchObject({ base_amount: 3, counter_bonus: 1, payoff_card_id: 'steady_strike' })
  })

  it('does not consume Riposte Ready when a card with no Boss damage fires', () => {
    let state = start()
    hero(state).armor = 5
    state = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { boss_beat_id: 'raking_claw', boss_track: 'instant', damage_keywords: ['tank_hit'] },
    }).state
    expect(state.counters[combatantRef(state.primaryHeroId)]?.[0]?.id).toBe('riposte_ready')

    state.phase = 'quick'
    hero(state).actionBar[0] = { topCard: card('g1', 'iron_guard'), charges: [card('g2', 'steady_strike')], activatedWindow: null, placedThisLoadout: false }
    const guard = resolve(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    state = guard.state
    expect(state.counters[combatantRef(state.primaryHeroId)]?.[0]?.id).toBe('riposte_ready')
  })

  it('expires an unconsumed Riposte Ready at the end of the Quick Window', () => {
    let state = start()
    hero(state).armor = 5
    state = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 4,
      reasonText: 'Raking Claw',
      factContext: { damage_keywords: ['tank_hit'] },
    }).state
    state = stepPhases(state, 2).state
    expect(state.phase).toBe('quick')
    const endQuick = advancePhase(catalog, state)
    const expiry = endQuick.facts.find((fact) => fact.kind === 'expire_counter')
    expect(expiry?.succeeded).toBe(true)
    expect(endQuick.state.counters[combatantRef(state.primaryHeroId)] ?? []).toHaveLength(0)
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

describe('loadout swaps', () => {
  it('swaps a card placed this Loadout back to hand instead of discarding it', () => {
    let state = start()
    const [first, second] = hero(state).hand
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: hero(state).id, slotIndex: 0, cardInstanceId: first.instanceId }).state
    const swap = resolve(catalog, state, { kind: 'load_slot', sourceId: hero(state).id, slotIndex: 0, cardInstanceId: second.instanceId })
    state = swap.state
    expect(hero(state).actionBar[0].topCard?.instanceId).toBe(second.instanceId)
    // The first card came straight back to hand — nothing hit the discard.
    expect(hero(state).discard).toHaveLength(0)
    expect(hero(state).hand.some((held) => held.instanceId === first.instanceId)).toBe(true)
    expect(swap.facts[0].detail.returnedToHand).toBe(first.cardId)
  })

  it('keeps Replace destructive for a Slot that entered the Loadout occupied', () => {
    let state = start()
    const first = hero(state).hand[0]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: hero(state).id, slotIndex: 0, cardInstanceId: first.instanceId }).state
    // A full Round later, the same Slot content is a kept bundle.
    state = stepPhases(state, 5).state
    expect(state.phase).toBe('loadout')
    expect(hero(state).actionBar[0].placedThisLoadout).toBe(false)
    const replacement = hero(state).hand[0]
    state = resolve(catalog, state, { kind: 'load_slot', sourceId: hero(state).id, slotIndex: 0, cardInstanceId: replacement.instanceId }).state
    expect(hero(state).discard.some((card) => card.instanceId === first.instanceId)).toBe(true)
    expect(hero(state).hand.some((card) => card.instanceId === first.instanceId)).toBe(false)
  })
})

describe('legality edges', () => {
  it('requires a Minion target in range for a piece-targeting Top Card', () => {
    const state = start()
    hero(state).actionBar[0] = { topCard: card('s1', 'sweeping_blow'), charges: [card('s2', 'iron_guard')], activatedWindow: null, placedThisLoadout: false }
    state.phase = 'quick'
    const noTarget = legality(catalog, state, { kind: 'fire_slot', sourceId: state.primaryHeroId, slotIndex: 0 })
    expect(noTarget).toMatchObject({ legal: false, reason: 'The Top Card needs a Minion target.' })

    // Spawn the whelps (they arrive at range > 1 from the hero start), which
    // now means reaching the Brood Round rather than Round 1.
    let played = immortalHero(startBroodSecond())
    played.heroes[played.primaryHeroId].actionBar[0] = {
      topCard: card('s1', 'sweeping_blow'),
      charges: [card('s2', 'iron_guard')],
      activatedWindow: null,
      placedThisLoadout: false,
    }
    played = stepPhases(played, 9).state
    played.phase = 'quick'
    const outOfRange = legality(catalog, played, {
      kind: 'fire_slot',
      sourceId: played.primaryHeroId,
      slotIndex: 0,
      targetId: 'whelp_2',
    })
    expect(outOfRange).toMatchObject({ legal: false, reason: "The chosen Minion is outside the Top Card's range." })
    expect(outOfRange.targetRange).toBeGreaterThan(1)
  })

  it('rejects every action after the Encounter ends', () => {
    let state = start()
    boss(state).health = 1
    const win = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.primaryHeroId,
      targetId: state.bossId,
      amount: 1,
      reasonText: 'Steady Strike',
    })
    state = win.state
    expect(state).toMatchObject({ active: false, outcome: 'victory', outcomeReason: 'The Boss is defeated.' })
    const afterEnd = legality(catalog, state, { kind: 'draw_card', sourceId: state.primaryHeroId })
    expect(afterEnd).toMatchObject({ legal: false, reason: 'The Encounter has already ended.' })
    expect(advancePhase(catalog, state).facts).toHaveLength(0)
  })

  it('ends in Enrage Defeat when Escalation reaches its top threshold', () => {
    const state = start()
    // The state the fight is in at the end of Round 8 under automatic ticks
    // alone: four ticks banked (ends of Rounds 4-7), the fifth lands here.
    state.round = state.roundLimit
    state.escalation = ESCALATION_MAX - 1
    state.phase = 'slow'
    const wrap = advancePhase(catalog, state)
    expect(wrap.facts.at(-1)?.kind).toBe('end_of_clock')
    expect(wrap.state).toMatchObject({
      active: false,
      outcome: 'defeat',
      outcomeReason: 'Enrage: Embermaw overwhelms the party.',
    })
  })

  it('ends in defeat when the Hero falls', () => {
    const state = start()
    hero(state).health = 3
    const hit = resolve(catalog, state, {
      kind: 'damage',
      sourceId: state.bossId,
      targetId: state.primaryHeroId,
      amount: 5,
      reasonText: 'Raking Claw',
    })
    expect(hit.state).toMatchObject({ active: false, outcome: 'defeat', outcomeReason: 'A Hero has fallen.' })
  })
})

describe('Scenarios', () => {
  it('replays the committed solo-ceiling line: deep, legal, and short of Boss defeat (D-016)', () => {
    const scenario = catalog.scenarios.embermaw_solo_ceiling
    expect(scenario).toBeDefined()
    const replay = runScenario(catalog, scenario)
    // The solo ceiling holds: the strongest searched line loses without killing the Boss.
    expect(replay.state.outcome).toBe('defeat')
    expect(replay.state.active).toBe(false)
    expect(replay.state.board.entities[replay.state.bossId].health).toBeGreaterThan(0)
    // Every player-submitted step must have resolved legally. Boss-row beats
    // may be legitimately refused after the killing hit resolves the fight.
    const playerKinds = new Set(['load_slot', 'charge_slot', 'fire_slot', 'move_hero'])
    const submitted = replay.facts.filter((fact) => fact.depth === 0 && playerKinds.has(fact.kind))
    expect(submitted.length).toBeGreaterThan(0)
    expect(submitted.every((fact) => fact.succeeded)).toBe(true)
  })

  it('replays the committed passive line to Defeat', () => {
    const scenario = catalog.scenarios.embermaw_enrage_defeat
    expect(scenario).toBeDefined()
    const replay = runScenario(catalog, scenario)
    expect(replay.state.outcome).toBe('defeat')
    expect(replay.state.active).toBe(false)
  })

  it('lands the jump point mid-Encounter with Whelps on the board', () => {
    // Asserted by the property the fixture exists for, not by a Round number:
    // program order is seeded (D-037), so which Round carries a Brood Call is
    // not a fact this fixture can pin.
    const scenario = catalog.scenarios.embermaw_brood_pressure
    expect(scenario).toBeDefined()
    const replay = runScenario(catalog, scenario)
    expect(replay.state.active).toBe(true)
    expect(replay.state.round).toBeGreaterThan(1)
    expect(replay.state.phase).toBe('loadout')
    expect(Object.values(replay.state.board.entities).filter((entity) => entity.kind === 'minion').length).toBeGreaterThan(0)
  })

  it('replays deterministically', () => {
    const scenario = catalog.scenarios.embermaw_solo_ceiling
    const first = runScenario(catalog, scenario)
    const second = runScenario(catalog, scenario)
    expect(second.state).toEqual(first.state)
    expect(second.facts).toEqual(first.facts)
    expect(first.entries).toHaveLength(scenario.steps.length + 1)
  })
})

describe('Encounter Records (schema_version 2)', () => {
  const meta = { recordId: 'rec_test', startedAt: '2026-08-15T00:00:00Z', endedAt: '2026-08-15T00:10:00Z' }

  it('seals a completed Scenario run and replays it to an identical final state', async () => {
    const scenario = catalog.scenarios.embermaw_solo_ceiling
    const replay = runScenario(catalog, scenario)
    const record = await buildEncounterRecord(catalog, {
      encounterId: scenario.encounter,
      steps: scenario.steps,
      facts: replay.facts,
      initialState: replay.entries[0].state,
      finalState: replay.state,
      meta,
    })
    expect(record.schema_version).toBe(2)
    expect(record.seed).toBe(scenario.seed)
    expect(record.outcome).toBe('defeat')
    // The solo ceiling now ends at the clock rather than at zero Health: with
    // Brood Call priced (D-036), the deepest surviving push runs out of Rounds
    // before it runs out of Hero. `outcome` stays `defeat`; `end_kind` is what
    // distinguishes the two ways to lose.
    expect(record.end_kind).toBe('end_of_clock')
    expect(record.abandon_reason).toBe('')
    expect(record.content_identity.fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(record.content_identity.ids).toContain('encounter:embermaw_prototype')
    expect(record.content_identity.ids).toContain('boss_program:embermaw_brood')
    expect(record.rng_audit.length).toBeGreaterThan(0)

    const verification = await replayRecord(catalog, record)
    expect(verification.finalStateMatches).toBe(true)
    expect(verification.fingerprintMatches).toBe(true)
  })

  it('classifies submitted, generated, and rejected actions', async () => {
    let state = start()
    const facts: ResolvedActionFact[] = []
    const initialState = state
    // A rejected submission: charging during Loadout is illegal.
    const heroCard = hero(state).hand[0]
    const rejected = resolve(catalog, state, {
      kind: 'charge_slot',
      sourceId: state.primaryHeroId,
      slotIndex: 0,
      cardInstanceId: heroCard.instanceId,
    })
    state = rejected.state
    facts.push(...rejected.facts)
    // Two advances cross Boss Instant; the first carries its generated actions.
    for (let step = 0; step < 2; step += 1) {
      const result = advancePhase(catalog, state)
      state = result.state
      facts.push(...result.facts)
    }
    const record = await buildEncounterRecord(catalog, {
      encounterId: 'embermaw_prototype',
      steps: [{ advance: true }, { advance: true }],
      facts,
      initialState,
      finalState: state,
      meta: { ...meta, abandonReason: 'exported_mid_encounter' },
    })
    expect(record.outcome).toBe('abandoned')
    expect(record.end_kind).toBe('abandoned')
    expect(record.abandon_reason).toBe('exported_mid_encounter')
    expect(record.actions.some((action) => !action.succeeded && action.reason !== '')).toBe(true)
    expect(record.actions.some((action) => action.depth > 0 && action.kind === 'damage')).toBe(true)
    expect(record.actions.some((action) => ((action.resolution_fact?.damage_keywords as string[]) ?? []).includes('tank_hit'))).toBe(true)
  })

  it('marks Encounter Clock expiry as end_kind end_of_clock', async () => {
    const state = start()
    state.round = state.roundLimit
    state.escalation = ESCALATION_MAX - 1
    state.phase = 'slow'
    const wrap = advancePhase(catalog, state)
    const record = await buildEncounterRecord(catalog, {
      encounterId: 'embermaw_prototype',
      steps: [{ advance: true }],
      facts: wrap.facts,
      initialState: state,
      finalState: wrap.state,
      meta,
    })
    expect(record.outcome).toBe('defeat')
    expect(record.end_kind).toBe('end_of_clock')
  })

  it('detects a tampered record on replay', async () => {
    const scenario = catalog.scenarios.embermaw_enrage_defeat
    const replay = runScenario(catalog, scenario)
    const record = await buildEncounterRecord(catalog, {
      encounterId: scenario.encounter,
      steps: scenario.steps,
      facts: replay.facts,
      initialState: replay.entries[0].state,
      finalState: replay.state,
      meta,
    })
    const tampered = structuredClone(record)
    tampered.final_state.heroes[tampered.final_state.primaryHeroId].health = 99
    const verification = await replayRecord(catalog, tampered)
    expect(verification.finalStateMatches).toBe(false)
    expect(verification.fingerprintMatches).toBe(true)
  })

  it('computes a stable content identity fingerprint', async () => {
    const first = await contentIdentity(catalog, 'embermaw_prototype')
    const second = await contentIdentity(catalog, 'embermaw_prototype')
    expect(second.fingerprint).toBe(first.fingerprint)
    expect(first.ids.length).toBeGreaterThanOrEqual(10)
    expect(first.ids.some((id) => id.startsWith('deck:') || id.startsWith('scenario:'))).toBe(false)
  })

  it('changes content identity when a reachable Phase II Boss Program changes', async () => {
    const encounterId = 'embermaw_prototype'
    const phaseTwoProgramId = catalog.encounters[encounterId].phase_two_programs[0]
    const before = await contentIdentity(catalog, encounterId)
    const changed = structuredClone(catalog)
    changed.programs[phaseTwoProgramId].rules_text += ' Identity mutation.'
    const after = await contentIdentity(changed, encounterId)

    expect(before.ids).toContain(`boss_program:${phaseTwoProgramId}`)
    expect(after.fingerprint).not.toBe(before.fingerprint)
  })

  it('changes content identity when a Counter reachable through a deck Card changes', async () => {
    const encounterId = 'embermaw_prototype'
    const counterId = 'fortified'
    const cardId = catalog.encounters[encounterId].player_deck[0].card
    const withCounterCard = structuredClone(catalog)
    withCounterCard.cards[cardId].places_counter = counterId
    withCounterCard.cards[cardId].target_type = 'none'
    const before = await contentIdentity(withCounterCard, encounterId)
    const changed = structuredClone(withCounterCard)
    changed.counters[counterId].rules_text += ' Identity mutation.'
    const after = await contentIdentity(changed, encounterId)

    expect(before.ids).toContain(`counter:${counterId}`)
    expect(after.fingerprint).not.toBe(before.fingerprint)
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
