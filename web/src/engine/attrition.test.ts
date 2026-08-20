import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import {
  advancePhase,
  buildCatalog,
  runScenario,
  combatantRef,
  counterCount,
  createEncounterState,
  resolve,
  type EncounterState,
} from '@/engine'

// The residual-attrition gate. The Restorative Archetype is only a Role if
// there is a problem no other Role answers, so the problem is authored first
// and proved here — before the Hero exists, so nothing about her tuning can be
// what makes these pass.
//
// This runs against the real catalog rather than a fixture on purpose: the
// claim is about `data/`, not about the engine's capabilities. An engine that
// can express a mark nobody authored is not a gate.

const catalog = loadCatalog()
const ENCOUNTER = 'embermaw_attrition_trial'
const MARK = 'seared'

function start(seed?: number): EncounterState {
  return createEncounterState(catalog, ENCOUNTER, seed)
}

function markBeat() {
  const beat = catalog.programs.embermaw_branding.instant_beats.find((entry) => entry.kind === 'place_counter')
  expect(beat).toBeDefined()
  return beat!
}

function blowBeat() {
  const beat = catalog.programs.embermaw_branding.incoming_beats.find((entry) => entry.kind === 'targeted_hit')
  expect(beat).toBeDefined()
  return beat!
}

// The Boss standing on the Hero's own hex is not a thing the board allows, so
// the blow's range-1 requirement is met by walking the Hero to the Boss rather
// than by moving the Boss.
function standAdjacent(state: EncounterState): EncounterState {
  const boss = state.board.entities[state.bossId]
  state.board.entities[state.primaryHeroId].coords = { q: boss.coords.q - 1, r: boss.coords.r }
  return state
}

function markCount(state: EncounterState): number {
  return counterCount(state, combatantRef(state.primaryHeroId), MARK)
}

describe('the residual-attrition problem (Restorative gate)', () => {
  it('marks a Hero rather than the Boss', () => {
    const state = start()
    const marked = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: markBeat(), track: 'instant' })
    expect(markCount(marked.state)).toBe(1)
    // The direction that matters: Heat is the Boss marking itself, and a Boss
    // that only ever marks itself cannot build a debt the Party carries.
    expect(counterCount(marked.state, combatantRef(marked.state.bossId), MARK)).toBe(0)
  })

  it('aims the mark by Role rather than by seat', () => {
    const beat = markBeat()
    expect(beat.target_selector).toBe('tank')
  })

  it('does not fade on its own', () => {
    // `duration_rounds: 0` is the whole mechanic (Q22). A mark that expires is
    // pressure with a built-in out, and a Party can answer it by waiting —
    // which teaches the Party to ignore the Hero who removes it.
    let state = start()
    // Survival is not what this test is about, and a Hero who dies mid-Round
    // takes the mark off the board with them (D-045).
    state.heroes[state.primaryHeroId].maxHealth = 5000
    state.heroes[state.primaryHeroId].health = 5000
    state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: markBeat(), track: 'instant' }).state
    expect(markCount(state)).toBe(1)
    const openingRound = state.round
    // Round upkeep is what expires a Counter, so the mark has to be carried
    // across a Round boundary rather than across a window.
    for (let step = 0; step < 20 && state.round === openingRound; step += 1) {
      state = advancePhase(catalog, state).state
    }
    expect(state.round).toBeGreaterThan(openingRound)
    expect(markCount(state)).toBeGreaterThanOrEqual(1)
  })

  it('makes the next blow land harder, and stacks to two', () => {
    const beat = markBeat()
    const blow = blowBeat()

    function healthLoss(marks: number): number {
      let state = standAdjacent(start())
      // Armor would answer the blow; the point of the gate is that it never
      // answers the mark, so it is cleared to read the raw number.
      state.heroes[state.primaryHeroId].armor = 0
      for (let placed = 0; placed < marks; placed += 1) {
        state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat, track: 'instant' }).state
      }
      expect(markCount(state)).toBe(Math.min(marks, 2))
      const hit = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: blow, track: 'incoming' })
      const damage = hit.facts.find((fact) => fact.kind === 'damage')
      return Number(damage?.resolutionFact?.health_loss ?? 0)
    }

    expect(healthLoss(0)).toBe(blow.damage)
    expect(healthLoss(1)).toBe(blow.damage + 1)
    expect(healthLoss(2)).toBe(blow.damage + 2)
    // Capped, so the debt is survivable long enough to be a decision rather
    // than a countdown (Q22, mirroring Heat's `max: 2`).
    expect(healthLoss(3)).toBe(blow.damage + 2)
  })

  it('is not answered by Armor', () => {
    const beat = markBeat()
    const blow = blowBeat()
    let state = standAdjacent(start())
    state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat, track: 'instant' }).state
    state.heroes[state.primaryHeroId].armor = 100
    const hit = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: blow, track: 'incoming' })
    // Armor eats the blow. The mark is still there, and it will price the next
    // one, and the one after that.
    expect(Number(hit.facts.find((fact) => fact.kind === 'damage')?.resolutionFact?.health_loss ?? -1)).toBe(0)
    expect(markCount(hit.state)).toBe(1)
  })

  // The gate, flipped (D-080). These two tests spent their first life
  // proving no card could answer the mark — that failure was the reason to
  // author a Healer. Maren's cleansing card exists now, so they prove the
  // other half: the answer exists, it is hers, and it is the only one.
  it("has its answer in Maren's seat, and nowhere else", () => {
    const encounter = catalog.encounters[ENCOUNTER]
    const removers = encounter.party.flatMap((seat) =>
      (seat.deck.length > 0 ? seat.deck : encounter.player_deck)
        .map((entry) => catalog.cards[entry.card])
        .filter((card) => card.reads.some((reader) => reader.verb === 'spend' && reader.counter === MARK))
        .map((card) => ({ seat: seat.hero, card: card.id })),
    )
    expect(removers.length).toBeGreaterThan(0)
    expect(removers.every((remover) => remover.seat === 'maren')).toBe(true)
  })

  it('is answered by the Role the Beat names', () => {
    // The Beat's `cleanse` answer tag now has carriers, and every carrier is
    // a Healer card — the Role owns the answer (D-025's superiority), which
    // is what the no-healer-clear principle asks the content to state.
    expect(markBeat().answer_tags).toContain('cleanse')
    const carriers = Object.values(catalog.cards).filter((card) =>
      card.reads.some((reader) => reader.verb === 'spend' && reader.counter === MARK),
    )
    expect(carriers.length).toBeGreaterThan(0)
    expect(carriers.every((card) => card.tags.includes('healer'))).toBe(true)
  })
})

// The Restorative's machine (D-080), proved against the real catalog on the
// same Encounter the gate lives in: Maren's cards are the content under test,
// not stand-ins, so a retuned number here fails here.
describe("Maren's loop (D-080)", () => {
  // A ready Slot holding one of Maren's cards, fired through the ordinary
  // resolution path so legality and the fire resolve together.
  function marenFires(state: EncounterState, cardId: string, targetId?: string, targetHex?: { q: number; r: number }) {
    state.phase = 'quick'
    const card = catalog.cards[cardId]
    if (card.speed === 'slow') {
      state.phase = 'slow'
    }
    state.heroes.maren.actionBar[0].topCard = { instanceId: `${cardId}_probe`, cardId }
    state.heroes.maren.actionBar[0].charges = [{ instanceId: 'fuel_probe', cardId: 'field_dressing' }]
    state.heroes.maren.actionBar[0].activatedWindow = null
    return resolve(catalog, state, {
      kind: 'fire_slot',
      sourceId: 'maren',
      slotIndex: 0,
      ...(targetId === undefined ? {} : { targetId }),
      ...(targetHex === undefined ? {} : { targetHex }),
    })
  }

  it('converts overflow into Boss damage, capped at the printed healing', () => {
    const state = start()
    const bossBefore = state.board.entities[state.bossId].health
    // The guardian is 1 short of full: Surplus of Care heals 3, so 1 lands
    // and 2 convert.
    state.heroes.guardian.health = state.heroes.guardian.maxHealth - 1
    const after = marenFires(state, 'surplus_of_care', 'guardian')
    expect(after.state.heroes.guardian.health).toBe(after.state.heroes.guardian.maxHealth)
    expect(after.facts[0].detail.overflowConverted).toBe(2)
    expect(after.state.board.entities[state.bossId].health).toBe(bossBefore - 2)
  })

  it('does not convert on a card without the Keyword', () => {
    const state = start()
    const bossBefore = state.board.entities[state.bossId].health
    // Braced Recovery heals 3 into a full Hero: everything is lost, nothing
    // converts — the conversion is the Keyword's, not healing's.
    const after = marenFires(state, 'braced_recovery', 'guardian')
    expect(after.facts[0].detail.overflowConverted).toBeUndefined()
    expect(after.state.board.entities[state.bossId].health).toBe(bossBefore)
  })

  it('charges the Signature from converted overflow, and only from a blow that landed', () => {
    const state = start()
    state.heroes.guardian.health = state.heroes.guardian.maxHealth
    const after = marenFires(state, 'surplus_of_care', 'guardian')
    // The whole heal converted (capped at 3), the Boss lost health, and the
    // host_deals_damage Grant read it: her Signature banks its first Charge.
    const signature = after.state.heroes.maren.actionBar.find((slot) => slot.fixed)
    expect(after.facts[0].detail.overflowConverted).toBe(3)
    expect(signature?.earnedCharges).toBe(1)
  })

  it('spreads a healing Burst over every party Hero inside it', () => {
    const state = start()
    state.heroes.guardian.health = 10
    state.heroes.maren.health = 10
    // Guardian at (0,0), Maren at (-1,1): the hex between them at (0, 0)...
    // Triage Line reaches 1 and covers radius 1, so aim it at Maren's own hex
    // — the guardian sits adjacent at distance 1 and is covered too.
    const after = marenFires(state, 'triage_line', undefined, { q: -1, r: 1 })
    expect(after.facts[0].succeeded).toBe(true)
    expect(after.state.heroes.maren.health).toBe(12)
    expect(after.state.heroes.guardian.health).toBe(12)
  })

  it('spends the mark off the chosen ally, never off the caster (Q11)', () => {
    let state = start()
    // Both Heroes marked, so a spend that reads the wrong subject has a
    // Counter to remove either way — the assertion can tell them apart.
    state = resolve(catalog, state, { kind: 'resolve_boss', sourceId: state.bossId, beat: markBeat(), track: 'instant' }).state
    const placing = { kind: 'place_counter', sourceId: state.bossId, hostRef: combatantRef('maren'), counterId: MARK, amount: 1, reasonText: 'probe' }
    state = resolve(catalog, state, placing as never).state
    expect(counterCount(state, combatantRef('guardian'), MARK)).toBe(1)
    expect(counterCount(state, combatantRef('maren'), MARK)).toBe(1)
    const after = marenFires(state, 'strike_the_entry', 'guardian')
    expect(counterCount(after.state, combatantRef('guardian'), MARK)).toBe(0)
    expect(counterCount(after.state, combatantRef('maren'), MARK)).toBe(1)
  })

  it('converts the covered ally\'s next blow into healing, spending the cover', () => {
    let state = start()
    state.heroes.guardian.health = 10
    state.heroes.guardian.armor = 3
    const covering = { kind: 'place_counter', sourceId: 'maren', hostRef: combatantRef('guardian'), counterId: 'underwritten', amount: 1, reasonText: 'probe' }
    state = resolve(catalog, state, covering as never).state
    const hit = resolve(catalog, state, { kind: 'damage', sourceId: state.bossId, targetId: 'guardian', amount: 4, reasonText: 'probe' })
    const fact = hit.facts.find((entry) => entry.kind === 'damage')
    // The blow heals instead of landing, the Armor is untouched — a converted
    // blow was never mitigated — and the cover is spent by the one blow.
    expect(fact?.resolutionFact).toMatchObject({ health_loss: 0, converted_to_healing: 4 })
    expect(hit.state.heroes.guardian.health).toBe(14)
    expect(hit.state.heroes.guardian.armor).toBe(3)
    expect(counterCount(hit.state, combatantRef('guardian'), 'underwritten')).toBe(0)
    const second = resolve(catalog, hit.state, { kind: 'damage', sourceId: state.bossId, targetId: 'guardian', amount: 4, reasonText: 'probe' })
    expect(second.state.heroes.guardian.health).toBe(13)
  })

  it('fires the Signature at an ally, covering them — and Maren too at full bank', () => {
    const state = start()
    const signatureIndex = state.heroes.maren.actionBar.findIndex((slot) => slot.fixed)
    expect(signatureIndex).toBeGreaterThanOrEqual(0)
    state.phase = 'quick'
    state.heroes.maren.actionBar[signatureIndex].earnedCharges = 2
    const after = resolve(catalog, state, { kind: 'fire_slot', sourceId: 'maren', slotIndex: signatureIndex, targetId: 'guardian' })
    expect(after.facts[0].succeeded).toBe(true)
    expect(counterCount(after.state, combatantRef('guardian'), 'underwritten')).toBe(1)
    // The full-bank rider extends the cover to the one ally the gesture could
    // not choose: the firing Hero.
    expect(counterCount(after.state, combatantRef('maren'), 'underwritten')).toBe(1)
  })

  it('covers only the chosen ally below the full bank', () => {
    const state = start()
    const signatureIndex = state.heroes.maren.actionBar.findIndex((slot) => slot.fixed)
    state.phase = 'quick'
    state.heroes.maren.actionBar[signatureIndex].earnedCharges = 1
    const after = resolve(catalog, state, { kind: 'fire_slot', sourceId: 'maren', slotIndex: signatureIndex, targetId: 'guardian' })
    expect(counterCount(after.state, combatantRef('guardian'), 'underwritten')).toBe(1)
    expect(counterCount(after.state, combatantRef('maren'), 'underwritten')).toBe(0)
  })
})

// The one overflow rule the authored deck cannot yet reach: the cap binds
// only when something scales the heal past its printed number, and no
// authored Healer card carries a charge modifier today. A hand-built catalog
// supplies the scaled heal, so the cap is guarded before the content that
// needs it exists.
describe('the overflow cap under scaling', () => {
  it('caps converted overflow at the printed healing, not the scaled total', () => {
    const fixture = buildCatalog({
      cards: [
        { id: 'probe_fuel', title: 'Fuel', speed: 'quick', range_tiles: 1, boss_damage: 1, tags: ['healer'] },
        {
          id: 'scaled_mercy',
          title: 'Scaled Mercy',
          speed: 'quick',
          target_type: 'ally',
          range_tiles: 3,
          healing: 2,
          tags: ['healer', 'support', 'overflow'],
          charge_modifiers: ['probe_boost'],
        },
      ],
      heroes: [
        { id: 'warden', title: 'Warden', max_health: 20 },
        { id: 'mender', title: 'Mender', max_health: 12 },
      ],
      keywords: [
        { id: 'tank', title: 'Tank', kind: 'role' },
        { id: 'healer', title: 'Healer', kind: 'role' },
        { id: 'support', title: 'Support', kind: 'trait' },
        { id: 'overflow', title: 'Overflow', kind: 'trait' },
        { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
        { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
      ],
      counters: [],
      bosses: [{ id: 'probe_boss', title: 'Probe Boss', max_health: 40 }],
      chargeModifiers: [{ id: 'probe_boost', title: 'Boost', effect: 'healing', amount_per_match: 2 }],
      hazards: [],
      minions: [],
      programs: [{ id: 'probe_program', title: 'Probe Program', instant_beats: [], incoming_beats: [] }],
      encounters: [
        {
          id: 'probe_party',
          title: 'Probe Party',
          party: [
            { hero: 'mender', start: { q: 0, r: 0 }, deck: [{ card: 'scaled_mercy', copies: 4 }] },
            { hero: 'warden', start: { q: 1, r: 0 }, deck: [{ card: 'probe_fuel', copies: 4 }] },
          ],
          boss: 'probe_boss',
          round_limit: 6,
          board_radius: 3,
          boss_start: { q: 0, r: -3 },
          slot_count: 2,
          hand_refill_target: 4,
          player_deck: [{ card: 'probe_fuel', copies: 4 }],
          boss_programs: ['probe_program'],
          random_seed: 7,
        },
      ],
    })
    const state = createEncounterState(fixture, 'probe_party')
    state.phase = 'quick'
    // A full-health target and one charged card: the heal scales 2 -> 4, and
    // everything overflows — but the conversion answers for the printed 2.
    state.heroes.mender.actionBar[0].topCard = { instanceId: 'mercy_probe', cardId: 'scaled_mercy' }
    state.heroes.mender.actionBar[0].charges = [{ instanceId: 'fuel_probe', cardId: 'probe_fuel' }]
    const bossBefore = state.board.entities.probe_boss.health
    const after = resolve(fixture, state, { kind: 'fire_slot', sourceId: 'mender', slotIndex: 0, targetId: 'warden' })
    expect(after.facts[0].succeeded).toBe(true)
    expect(after.facts[0].detail.overflowConverted).toBe(2)
    expect(after.state.board.entities.probe_boss.health).toBe(bossBefore - 2)
  })
})

// The composition lines, played and pinned. The measurement lives in
// scripts/attritionLine.ts — 30 seeds, both arms — and its numbers are in the
// Brand gate doc. Two claims survived the retune that made the Damage seats
// load-bearing: without Maren the front line dies to attrition; with her the
// Party survives to the Clock and still cannot end the fight, because ending
// it is the Damage Role's job and nobody fields one. What this test pins is
// the replayable half of the second claim.
describe('the played composition line', () => {
  it('replays the duo line to a survived loss: alive at the Clock, Boss standing', () => {
    const scenario = catalog.scenarios.brand_trial_duo_line
    expect(scenario).toBeDefined()
    const replay = runScenario(catalog, scenario)
    const finalState = replay.entries[replay.entries.length - 1].state
    // The we-need-damage shape: the run ends by the Encounter Clock with both
    // Heroes living and the Boss holding most of its pool — not a wipe, and
    // not a win. A duo that clears here means the Damage seats stopped being
    // load-bearing, which is the retune's whole claim.
    expect(finalState.outcome).toBe('defeat')
    expect(finalState.heroes.guardian.status).toBe('living')
    expect(finalState.heroes.maren.status).toBe('living')
    expect(finalState.board.entities[finalState.bossId]?.health ?? 0).toBeGreaterThan(0)
    // Attribution: the survival is hers — the line cleansed Sears and landed
    // her heals. The control arm proves the guardian alone does not live to
    // see this loss.
    const facts = replay.entries.flatMap((entry) => entry.facts)
    const cleansed = facts.some(
      (fact) => fact.succeeded && fact.kind === 'fire_slot' && (fact.detail.spentCounters as { counter_id?: string }[] | undefined)?.some((spent) => spent.counter_id === 'seared'),
    )
    expect(cleansed).toBe(true)
    const preserved = facts.some((fact) => fact.succeeded && fact.detail.preservedAlly === 'guardian')
    expect(preserved).toBe(true)
  })
})
