import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import {
  advancePhase,
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

  // The gate itself. Everything above proves the problem is real; this proves
  // the authored Party cannot answer it — which is the reason to author a
  // Healer rather than to tune the Tank.
  it('has no answer in the Encounter as authored', () => {
    const encounter = catalog.encounters[ENCOUNTER]
    const authored = encounter.party.flatMap((seat) => (seat.deck.length > 0 ? seat.deck : encounter.player_deck))
    expect(authored.length).toBeGreaterThan(0)
    const removers = authored
      .map((entry) => catalog.cards[entry.card])
      .filter((card) => card.reads.some((reader) => reader.verb === 'spend' && reader.counter === MARK))
    expect(removers).toEqual([])
    // And no Hero's Signature removes it either: a fixed card is not in the
    // deck, so the check above cannot see it.
    for (const seat of encounter.party) {
      const signature = catalog.cards[catalog.heroes[seat.hero].signature_card]
      expect(signature?.reads.some((reader) => reader.verb === 'spend' && reader.counter === MARK) ?? false).toBe(false)
    }
  })

  it('declares the answer it does not have', () => {
    // The Beat says how it is meant to be answered, and the answer Keyword it
    // names is one no authored card carries yet. That mismatch is the backlog
    // item, stated in content rather than in a comment.
    expect(markBeat().answer_tags).toContain('cleanse')
    const carriers = Object.values(catalog.cards).filter((card) =>
      card.reads.some((reader) => reader.verb === 'spend' && reader.counter === MARK),
    )
    expect(carriers).toEqual([])
  })
})
