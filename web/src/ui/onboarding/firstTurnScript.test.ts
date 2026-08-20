import { describe, expect, it } from 'vitest'
import { FIRST_TURN_ENCOUNTER_ID, loadCatalog } from '@/content'
import { advancePhase, createEncounterState, parseHexKey, resolve, type EncounterActionInput, type EncounterState } from '@/engine'
import { blocksTarget, firstTurnStep, type FirstTurnStep } from './firstTurnScript'

// The scripted first turn is a promise about a specific authored Encounter:
// its opening Hand and its opening Boss Program must let a new player load,
// charge, fire Quick, dodge the telegraph, and fire Slow inside Round 1. If
// the content drifts, this fails before a player meets it.
//
// Known fragility: the promise currently rests on the Encounter's `random_seed`
// dealing a suitable opening Hand, so *any* change to the rng stream can break
// it from a distance — D-038's no-repeat fix did, and the repair was to pick a
// new seed rather than to change the tutorial. The robust fix is an authored
// opening Hand for the scripted Encounter, which nothing needs yet.

const catalog = loadCatalog()

// The gesture each step asks for, as the play surface would submit it.
function actionForStep(state: EncounterState, step: FirstTurnStep): EncounterActionInput | 'advance' {
  const sourceId = state.primaryHeroId
  switch (step.id) {
    case 'prepare-quick':
      return { kind: 'load_slot', sourceId, slotIndex: 0, cardInstanceId: step.cardInstanceId as string }
    case 'prepare-slow':
      return { kind: 'load_slot', sourceId, slotIndex: 1, cardInstanceId: step.cardInstanceId as string }
    case 'charge-quick':
      return { kind: 'charge_slot', sourceId, slotIndex: 0, cardInstanceId: step.cardInstanceId as string }
    case 'fire-quick':
      return { kind: 'fire_slot', sourceId, slotIndex: 0 }
    case 'move-away':
      return { kind: 'move_hero', sourceId, destination: parseHexKey(step.safeHexKeys[0]), cardInstanceId: step.cardInstanceId as string }
    case 'charge-slow':
      return { kind: 'charge_slot', sourceId, slotIndex: 1, cardInstanceId: step.cardInstanceId as string }
    case 'fire-slow':
      return { kind: 'fire_slot', sourceId, slotIndex: 1 }
    default:
      return 'advance'
  }
}

function playScriptedTurn() {
  let state = createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID)
  const visited: string[] = []
  const rejected: string[] = []
  for (let guard = 0; guard < 40; guard += 1) {
    const step = firstTurnStep(catalog, state)
    if (step === null) {
      break
    }
    visited.push(step.id)
    const action = actionForStep(state, step)
    const result = action === 'advance' ? advancePhase(catalog, state) : resolve(catalog, state, action)
    for (const fact of result.facts) {
      if (!fact.succeeded) {
        rejected.push(`${fact.title}: ${fact.reason}`)
      }
    }
    state = result.state
  }
  return { state, visited, rejected }
}

describe('scripted first turn', () => {
  it('walks load, charge, fire Quick, dodge, and fire Slow in one Round', () => {
    const { visited, rejected } = playScriptedTurn()
    expect(rejected).toEqual([])
    expect(visited).toEqual([
      'prepare-quick',
      'prepare-slow',
      'start-round',
      'boss-instant',
      'charge-quick',
      'fire-quick',
      'move-away',
      'quick-done',
      'boss-incoming',
      'charge-slow',
      'fire-slow',
      'end-round',
    ])
  })

  it('leaves Round 1 with the Boss damaged in both windows and the breath dodged', () => {
    const { state } = playScriptedTurn()
    const boss = state.board.entities[state.bossId]
    const hero = state.heroes[state.primaryHeroId]
    expect(state.round).toBe(2)
    // Both fired Slots have to land something the player can see on the
    // Boss bar: a charged Steady Strike plus a slow Unyielding Step.
    expect(boss.maxHealth - boss.health).toBeGreaterThanOrEqual(5)
    // Raking Claw lands (it cannot be dodged); Cinder Breath must not, or
    // the step that teaches movement taught nothing.
    expect(hero.maxHealth - hero.health).toBe(4)
  })

  it('retires itself once the scripted Round is over', () => {
    const { state } = playScriptedTurn()
    expect(firstTurnStep(catalog, state)).toBeNull()
  })

  it('points the player at one control at a time', () => {
    const state = createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID)
    const step = firstTurnStep(catalog, state)
    expect(step?.id).toBe('prepare-quick')
    expect(blocksTarget(step, 'hand')).toBe(false)
    expect(blocksTarget(step, 'slot-0')).toBe(false)
    expect(blocksTarget(step, 'slot-1')).toBe(true)
    expect(blocksTarget(step, 'next')).toBe(true)
    // With no script running, nothing is gated.
    expect(blocksTarget(null, 'next')).toBe(false)
  })

  it('names a quick card that needs no Minion target', () => {
    const state = createEncounterState(catalog, FIRST_TURN_ENCOUNTER_ID)
    const step = firstTurnStep(catalog, state)
    const hero = state.heroes[state.primaryHeroId]
    const instance = hero.hand.find((card) => card.instanceId === step?.cardInstanceId)
    expect(instance).toBeDefined()
    expect(catalog.cards[instance!.cardId].damage).toBe(0)
    expect(catalog.cards[instance!.cardId].boss_damage).toBeGreaterThan(0)
  })
})
