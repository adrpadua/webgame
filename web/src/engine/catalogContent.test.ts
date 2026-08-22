import { describe, expect, it } from 'vitest'
import { cardSchema } from './content/schemas'
// Not part of the engine's public surface: the Round-end step is called by
// `advancePhase`, and a guard on what it prices is sharper when it can ask
// directly instead of inferring the answer from a whole Round's facts.
import {
  advancePhase,
  buildCatalog,
  createEncounterState,
  heroRole,
  resolve,
        } from '@/engine'

import { catalog, hero } from './testkit'

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
    // restated three times — `10x/10x`, proposal 04's `8/6/2/2/2`, the
    // `46d2a61` list, now D-064's migration (`Shield Slam` out to the
    // Signature, `Iron Guard` to 8), now D-104's (`Iron Guard` back to 6 and
    // `Unyielding Step` in as a second Slow identity) — with prose in three
    // documents claiming to be current each time. Changing it here is the
    // reminder to change `elian-voss-design.md` and the decision log with it.
    expect(
      Object.fromEntries(catalog.encounters.embermaw_prototype.player_deck.map((entry) => [entry.card, entry.copies])),
    ).toEqual({
      steady_strike: 4,
      iron_guard: 6,
      quench: 2,
      sweeping_blow: 2,
      fortify: 2,
      unyielding_step: 2,
      drive_back: 2,
    })
    expect(catalog.encounters.embermaw_prototype.player_deck.reduce((total, entry) => total + entry.copies, 0)).toBe(20)
    // The Signature rides the Hero, not the deck (D-064) — and the Hero is
    // authored content of their own (ADR 0034), so the printed card lives on
    // the Hero definition and the teaching slice opts out of fielding it.
    expect(catalog.encounters.embermaw_prototype.party.map((seat) => seat.hero)).toEqual(['elian'])
    expect(catalog.heroes.elian.signature_card).toBe('elian_riposte')
    expect(catalog.heroes.elian.max_health).toBe(34)
    expect(catalog.encounters.embermaw_prototype.party[0].fields_signature).toBe(true)
    expect(catalog.encounters.embermaw_first_turn.party[0].fields_signature).toBe(false)
    expect(catalog.cards.elian_riposte.fixed).toBe(true)
    expect(catalog.decks.aegis_controlled_test_deck.encounter).toBe('embermaw_prototype')
    expect(catalog.cards.steady_strike.draw_count).toBe(0)
  })

  // A Hero's Role is a fact their deck already states — every card in it
  // carries the Role Keyword — so nothing else stores one, and the surfaces
  // that pivot on Role read it back out from there.
  it('names the Role an Encounter’s Hero plays from the deck they bring', () => {
    expect(heroRole(catalog, 'embermaw_prototype')).toBe('tank')
    expect(heroRole(catalog, 'embermaw_first_turn')).toBe('tank')
    expect(heroRole(catalog, 'no_such_encounter')).toBe('')
    // A deck that does not agree with itself names no Hero, and says so
    // rather than picking the Role most of it happens to carry.
    const mixed = {
      ...catalog,
      cards: { ...catalog.cards, steady_strike: { ...catalog.cards.steady_strike, tags: ['attack'] } },
    }
    expect(heroRole(mixed, 'embermaw_prototype')).toBe('')
  })

  // Every Hero is addressed by first name, and the readouts have no second
  // string to choose from: `title` is the only name a frame, an aria-label or
  // a Beat Card can print, so the rule is kept where it is authored. The full
  // name is checked against it rather than left free — `full_name` is the same
  // person's name with rank and house restored, and one that did not contain
  // the first name would be a different character on the same Hero.
  it('names every Hero by their first name, with the full name as flavour', () => {
    for (const hero of Object.values(catalog.heroes)) {
      expect(hero.title, `${hero.id} prints more than a first name`).not.toContain(' ')
      expect(hero.id).toBe(hero.title.toLowerCase())
      expect(hero.full_name, `${hero.id} has no full name authored`).not.toBe('')
      expect(hero.full_name.split(' '), `${hero.full_name} does not contain ${hero.title}`).toContain(hero.title)
    }
    expect(catalog.heroes.elian.full_name).toBe('Captain Elian Voss')
    expect(catalog.heroes.maren.full_name).toBe('Registrar Maren Tallis')
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
  { id: 'overflow', title: 'Overflow', kind: 'trait' },
        { id: 'tank', title: 'Tank', kind: 'role' },
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
        'Card short_shove (data/cards/short_shove.json) reaches past its Hero (push_tiles, target_type piece) but authors no range_tiles',
      )
    })

    // The other half of the same rule, and the one D-073 added: a card that
    // reaches the Boss has to say how far, and a card that reaches nobody must
    // not carry a number nothing reads.
    it('rejects Boss damage with no authored range, and a reach on a card that touches nobody', () => {
      const rangeless = {
        source: 'data/cards/long_swing.json',
        payload: { id: 'long_swing', title: 'Long Swing', speed: 'quick', boss_damage: 2 },
      }
      expect(() => buildCatalog({ ...empty, cards: [rangeless] })).toThrow(
        'Card long_swing (data/cards/long_swing.json) reaches past its Hero (boss_damage) but authors no range_tiles',
      )
      const idle = {
        source: 'data/cards/distant_calm.json',
        payload: { id: 'distant_calm', title: 'Distant Calm', speed: 'quick', armor_delta: 2, range_tiles: 3 },
      }
      expect(() => buildCatalog({ ...empty, cards: [idle] })).toThrow(
        'Card distant_calm (data/cards/distant_calm.json) authors range_tiles 3 but reaches nothing past its own Hero',
      )
    })

    // The Signature contract (D-064, ADR 0032). Each refusal is the load-time
    // half of a rule the engine depends on at runtime; every one names the
    // file a designer has open.
    describe('Signature validation (D-064)', () => {
      const grant = { when: 'host_takes_damage', gates: ['health_loss_zero'], grants_charge: 1 }
      const signature = (overrides: object = {}) => ({
        source: 'data/cards/probe_signature.json',
        payload: {
          id: 'probe_signature',
          title: 'Probe Signature',
          speed: 'quick',
          fixed: true,
          range_tiles: 1,
          boss_damage: 1,
          standing: [grant],
          ...overrides,
        },
      })
      // The smallest Hero-and-Encounter pair that can field a Signature, plus
      // the one program the Encounter needs to reference. The printed card
      // rides the Hero definition (ADR 0034).
      const arena = (signatureCard: string, deck: { card: string; copies: number }[]) => ({
        programs: [{ id: 'probe_program', title: 'Probe Program', instant_beats: [], incoming_beats: [] }],
        bosses: [{ id: 'probe_boss', title: 'Probe Boss', max_health: 10 }],
        cards: [
          signature(),
          { id: 'probe_strike', title: 'Probe Strike', speed: 'quick', range_tiles: 1, boss_damage: 1 },
        ],
        heroes: [
          { id: 'probe_hero', title: 'Probe Hero', max_health: 10, signature_card: signatureCard },
        ],
        encounters: [
          {
            id: 'probe_arena',
            title: 'Probe Arena',
            party: [{ hero: 'probe_hero', start: { q: 0, r: 0 } }],
            boss: 'probe_boss',
            round_limit: 4,
            board_radius: 2,
            boss_start: { q: 0, r: -2 },
            slot_count: 2,
            hand_refill_target: 2,
            player_deck: deck,
            boss_programs: ['probe_program'],
            random_seed: 1,
          },
        ],
      })

      it('rejects a fixed card with no standing clause', () => {
        expect(() => buildCatalog({ ...empty, cards: [signature({ standing: [] })] })).toThrow(
          'Card probe_signature (data/cards/probe_signature.json) is fixed but authors no standing clause',
        )
      })

      it('rejects a standing clause on a card that is not fixed', () => {
        expect(() => buildCatalog({ ...empty, cards: [signature({ fixed: false })] })).toThrow(
          'authors a standing clause but is not fixed',
        )
      })

      it('rejects a full_charge block on a card that is not fixed', () => {
        const bad = {
          source: 'data/cards/probe_strike.json',
          payload: { id: 'probe_strike', title: 'Probe Strike', speed: 'quick', range_tiles: 1, boss_damage: 1, full_charge: { places_counter: 'sundered' } },
        }
        expect(() => buildCatalog({ ...empty, cards: [bad] })).toThrow('authors a full_charge block but is not fixed')
      })

      // A gate is a question about a moment, and three of the four moments
      // are not blows (ADR 0037).
      it('rejects a gate the event cannot answer, and a keyword on an event with none', () => {
        expect(() =>
          buildCatalog({ ...empty, cards: [signature({ standing: [{ when: 'round_start', gates: ['health_loss_zero'], grants_charge: 1 }] })] }),
        ).toThrow('gates a round_start standing clause on health_loss_zero, which that event cannot answer; round_start takes no gates')
        expect(() =>
          buildCatalog({ ...empty, cards: [signature({ standing: [{ when: 'slot_fired', gates: ['guarded_front'], grants_charge: 1 }] })] }),
        ).toThrow('slot_fired takes effect_landed')
        expect(() =>
          buildCatalog({ ...empty, cards: [signature({ standing: [{ when: 'slot_fired', event_keyword: 'tank_hit', grants_charge: 1 }] })] }),
        ).toThrow('narrows a slot_fired standing clause by event_keyword, but that event carries no damage Keywords')
      })

      it('rejects a targeted fixed card, and a resource_title on a non-fixed one (D-065)', () => {
        // `ally` joined `none` as a legal Signature target with Maren's
        // Underwriting (D-080); hex and piece stay refused until a Hero
        // needs one.
        expect(() => buildCatalog({ ...empty, cards: [signature({ target_type: 'piece', range_tiles: 1 })] })).toThrow(
          'a Signature activates untargeted or at an ally',
        )
        const named = {
          source: 'data/cards/probe_strike.json',
          payload: { id: 'probe_strike', title: 'Probe Strike', speed: 'quick', range_tiles: 1, boss_damage: 1, resource_title: 'Fury' },
        }
        expect(() => buildCatalog({ ...empty, cards: [named] })).toThrow('authors a resource_title but is not fixed')
      })

      it('rejects a keyword-matching Charge Modifier on a fixed card', () => {
        const raw = {
          ...empty,
          keywords: [...empty.keywords, { id: 'guard', title: 'Guard', kind: 'trait' }],
          chargeModifiers: [{ id: 'probe_guard_bonus', title: 'Probe Guard Bonus', keyword_id: 'guard', effect: 'armor', amount_per_match: 1 }],
          cards: [signature({ charge_modifiers: ['probe_guard_bonus'] })],
        }
        expect(() => buildCatalog(raw)).toThrow('earned Charges are tokens and carry none')
      })

      it('rejects a fixed card no Hero names, and a Hero naming a non-fixed one', () => {
        expect(() => buildCatalog({ ...empty, cards: [signature()] })).toThrow(
          'is fixed but no Hero names it as their signature card',
        )
        const wrongCard = arena('probe_strike', [{ card: 'probe_strike', copies: 2 }])
        expect(() => buildCatalog({ ...empty, ...wrongCard })).toThrow(
          'names probe_strike as their signature card, but that card is not fixed',
        )
      })

      it('rejects an Encounter fielding an unknown Boss', () => {
        // The same reference rule the Hero seats answer (ADR 0040): the error
        // names the Encounter, because that is the file being edited when the
        // reference breaks.
        const ghostBoss = {
          ...arena('', [{ card: 'probe_strike', copies: 2 }]),
          cards: [{ id: 'probe_strike', title: 'Probe Strike', speed: 'quick', range_tiles: 1, boss_damage: 1 }],
          bosses: [],
        }
        expect(() => buildCatalog({ ...empty, ...ghostBoss })).toThrow('references unknown boss probe_boss')
      })

      it('rejects an Encounter fielding an unknown Hero, and a Hero naming an unknown signature card', () => {
        const missingHero = {
          ...arena('', [{ card: 'probe_strike', copies: 2 }]),
          cards: [{ id: 'probe_strike', title: 'Probe Strike', speed: 'quick', range_tiles: 1, boss_damage: 1 }],
          heroes: [],
        }
        expect(() => buildCatalog({ ...empty, ...missingHero })).toThrow(
          'references unknown hero probe_hero',
        )
        const ghost = {
          source: 'data/heroes/probe_hero.json',
          payload: { id: 'probe_hero', title: 'Probe Hero', max_health: 10, signature_card: 'no_such_card' },
        }
        expect(() => buildCatalog({ ...empty, heroes: [ghost] })).toThrow(
          'Hero probe_hero (data/heroes/probe_hero.json) references unknown signature card no_such_card',
        )
      })

      it('rejects a deck that lists a fixed card', () => {
        const smuggled = arena('probe_signature', [{ card: 'probe_signature', copies: 1 }])
        expect(() => buildCatalog({ ...empty, ...smuggled })).toThrow('a Signature is never in the deck')
      })

      it('accepts and installs a legal Signature end to end', () => {
        const good = buildCatalog({ ...empty, ...arena('probe_signature', [{ card: 'probe_strike', copies: 4 }]) })
        const state = createEncounterState(good, 'probe_arena')
        expect(state.heroes.probe_hero.actionBar).toHaveLength(3)
        expect(state.heroes.probe_hero.actionBar[2]).toMatchObject({ fixed: true, earnedCharges: 0 })
        expect(state.heroes.probe_hero.actionBar[2].topCard?.cardId).toBe('probe_signature')
      })

      // A Hero with no Signature at all is a supported authoring state, not a
      // half-built one. The handoff tells designers to author a Hero this way
      // whenever their earn condition is not "takes damage" — the only event a
      // standing clause can currently fire on — rather than borrowing a Warden
      // gate that misstates the Hero's job. That instruction is load-bearing
      // for every non-Warden Hero, so it is pinned here: an empty
      // `signature_card` loads, and the bar is exactly the Encounter's Slots
      // with no fixed Slot appended.
      it('fields a Hero who has no Signature authored yet', () => {
        const noSignature = {
          ...arena('', [{ card: 'probe_strike', copies: 4 }]),
          cards: [{ id: 'probe_strike', title: 'Probe Strike', speed: 'quick', range_tiles: 1, boss_damage: 1 }],
        }
        const catalogWithout = buildCatalog({ ...empty, ...noSignature })
        expect(catalogWithout.heroes.probe_hero.signature_card).toBe('')
        const state = createEncounterState(catalogWithout, 'probe_arena')
        expect(state.heroes.probe_hero.actionBar).toHaveLength(2)
        expect(state.heroes.probe_hero.actionBar.some((slot) => slot.fixed)).toBe(false)
      })
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
      expect(() => buildCatalog({ ...empty, programs: [beatProgram({ target_selector: 'healer' })] })).toThrow(
        'Boss Beat probe_beat references unknown keyword healer in target_selector',
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
      payload: { id: 'probe_counter', title: 'Probe Counter', readers: [{ when: 'round_start', effect: 'armor', per: 1 }], ...patch },
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
      expect(() => buildCatalog({ ...empty, counters: [counterEntry({ readers: [{ when: 'round_start', effect: 'armor', per: 0 }] })] })).toThrow(
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
      const reader = { source: 'data/cards/reads_ground.json', payload: { id: 'reads_ground', title: 'Reads Ground', speed: 'quick', target_type: 'hex', range_tiles: 1, reads: [{ verb: 'scale', counter: 'ground_counter', on: 'target', per: 1, effect: 'boss_damage' }] } }
      const wrongTarget = {
        source: 'data/cards/bad_ground.json',
        payload: { id: 'bad_ground', title: 'Bad Ground', speed: 'quick', target_type: 'piece', range_tiles: 1, places_counter: 'ground_counter' },
      }
      expect(() => buildCatalog({ ...empty, counters: [hexCounter], cards: [reader, wrongTarget] })).toThrow(
        'places ground_counter, a hex Counter, but targets piece; that host needs hex',
      )
    })

    it('pairs Reader whens to hosts: ground hears only host_entered, a combatant never does (D-086)', () => {
      // A Reader's `when` names something that happens to its host. Ground
      // never takes damage; a combatant is never entered; a prepared Slot has
      // no events at all.
      const groundBlow = {
        source: 'data/counters/ground.json',
        payload: { id: 'ground_counter', title: 'Ground', host: 'hex', readers: [{ when: 'host_damage_incoming', effect: 'target_damage', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [groundBlow] })).toThrow(
        'is hosted on a hex but authors a host_damage_incoming reader; ground hears only host_entered',
      )
      const walkingCombatant = {
        source: 'data/counters/odd.json',
        payload: { id: 'odd', title: 'Odd', readers: [{ when: 'host_entered', effect: 'target_damage', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [walkingCombatant] })).toThrow(
        'is hosted on a combatant but authors a host_entered reader; a combatant is never entered',
      )
      const slotted = {
        source: 'data/counters/slotted.json',
        payload: { id: 'slotted', title: 'Slotted', host: 'slot', readers: [{ when: 'host_entered', effect: 'target_damage', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [slotted] })).toThrow(
        'is hosted on a slot but declares readers, and a prepared Slot has no events',
      )
    })

    it('rejects a Reader whose when/effect pair nothing reads', () => {
      // The `on_enter_hex` trap one level up: the two enums multiply out to
      // sixteen pairs and the rules read four, so the other twelve would
      // validate cleanly and never fire.
      const bad = {
        source: 'data/counters/idle.json',
        payload: { id: 'idle', title: 'Idle', readers: [{ when: 'slot_fired', effect: 'armor', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [bad] })).toThrow(
        'authors a slot_fired/armor reader, which nothing reads',
      )
    })

    it('rejects an event_keyword on a Reader whose event carries no Keywords', () => {
      // A Round starting and a Slot firing are not made of anything, so
      // narrowing them by Keyword authors a Reader that can never fire.
      const bad = {
        source: 'data/counters/odd.json',
        payload: { id: 'odd', title: 'Odd', readers: [{ when: 'round_start', event_keyword: 'tank_hit', effect: 'armor', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [bad] })).toThrow(
        'narrows a round_start reader by event_keyword, but only damage events carry Keywords',
      )
    })

    it('rejects an unauthored event_keyword, and a Card keywording damage it never deals', () => {
      const unknown = {
        source: 'data/counters/odd.json',
        payload: { id: 'odd', title: 'Odd', readers: [{ when: 'host_damage_incoming', event_keyword: 'flame', effect: 'target_damage', per: 1 }] },
      }
      expect(() => buildCatalog({ ...empty, counters: [unknown] })).toThrow('references unknown keyword flame in event_keyword')

      const idle = {
        source: 'data/cards/idle_ember.json',
        payload: { id: 'idle_ember', title: 'Idle Ember', speed: 'quick', damage_keywords: ['tank_hit'] },
      }
      expect(() => buildCatalog({ ...empty, cards: [idle] })).toThrow('declares damage_keywords but deals no damage')
    })

    it('rejects a Beat that places nothing, or names a Counter it cannot host', () => {
      const heat = { source: 'data/counters/heat.json', payload: { id: 'heat', title: 'Heat', readers: [{ when: 'host_deals_damage', effect: 'target_damage', per: 1 }] } }
      const ground = { source: 'data/counters/ground.json', payload: { id: 'ground', title: 'Ground', host: 'hex' } }
      const reader = { source: 'data/cards/reads.json', payload: { id: 'reads', title: 'Reads', speed: 'quick', target_type: 'hex', range_tiles: 1, reads: [{ verb: 'scale', counter: 'ground', on: 'target', per: 1, effect: 'boss_damage' }] } }
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
        heroes: Object.values(catalog.heroes),
        bosses: Object.values(catalog.bosses),
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
