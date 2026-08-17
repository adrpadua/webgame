// Searches tank policy lines through the Embermaw encounter against the
// Encounter Engine and writes committed Scenarios to data/scenarios/.
// Under D-016 the solo encounter must NOT be winnable: a found victory line
// fails the run as a red flag, and the committed artifacts are the solo
// ceiling (deepest losing push) and the passive defeat line.
//
// Usage: npx vite-node scripts/generateScenarios.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { DEFAULT_ENCOUNTER_ID, loadCatalog } from '../src/content'
import {
  advancePhase,
  cardChargeCap,
  createEncounterState,
  hexDistance,
  hexKey,
  isLegalMove,
  neighbors,
  resolve,
  type Axial,
  type CardInstance,
  type EncounterActionInput,
  type ScenarioStep,
} from '../src/engine'

const catalog = loadCatalog()
const ENCOUNTER_ID = DEFAULT_ENCOUNTER_ID

interface PolicyKnobs {
  // Both Slots run Steady Strike, or Slot 1 runs Iron Guard for armor.
  slotPlan: 'dual_steady' | 'sword_shield'
  // Park out of Cinder Breath range (distance 3+), dodge telegraphed cones,
  // or hold the Guarded Front.
  position: 'far' | 'dodge' | 'stay'
  // Push a Slot to its full Charge Value (spike + Full-Charge Cleanup) when a
  // reload copy is in hand; otherwise hold at cap-1 to keep the engine free.
  spike: boolean
}

interface SimResult {
  outcome: string
  round: number
  steps: ScenarioStep[]
  bossHealth: number
  heroHealth: number
}

// Cards we prefer to burn as Stamina (movement fuel), least useful first.
const MOVE_FUEL_ORDER = ['grow_presence', 'anchor_presence', 'gather_strength', 'fortify', 'sweeping_blow', 'strike_hex', 'shield_slam', 'iron_guard']

function isGuardTagged(cardId: string): boolean {
  return catalog.cards[cardId].tags.includes('guard')
}

function simulate(seed: number, knobs: PolicyKnobs): SimResult {
  let state = createEncounterState(catalog, ENCOUNTER_ID, seed)
  const steps: ScenarioStep[] = []

  const submit = (action: EncounterActionInput): boolean => {
    const result = resolve(catalog, state, action)
    const ok = result.facts[0]?.succeeded === true
    if (ok) {
      state = result.state
      steps.push({ action } as ScenarioStep)
    }
    return ok
  }
  const advance = (): void => {
    // Once the Encounter resolves, stop recording: a Scenario ends on the
    // action that ended the fight, not on trailing no-op advances.
    if (!state.active) {
      return
    }
    state = advancePhase(catalog, state).state
    steps.push({ advance: true })
  }

  const heroId = state.primaryHeroId
  const wanted: Record<number, string> = knobs.slotPlan === 'dual_steady' ? { 0: 'steady_strike', 1: 'steady_strike' } : { 0: 'steady_strike', 1: 'iron_guard' }

  const hand = () => state.heroes[heroId].hand
  const slot = (index: number) => state.heroes[heroId].actionBar[index]

  const moveFuel = (): CardInstance | undefined => {
    // Never burn a card the slot plan still needs as a Top Card.
    const wantedIds = new Set(Object.values(wanted))
    const spare = hand().filter((card) => {
      if (!wantedIds.has(card.cardId)) {
        return true
      }
      const copiesWanted = [0, 1].filter((index) => slot(index).topCard === null && wanted[index] === card.cardId).length
      const copiesInHand = hand().filter((other) => other.cardId === card.cardId).length
      return copiesInHand > copiesWanted
    })
    for (const cardId of MOVE_FUEL_ORDER) {
      const found = spare.find((card) => card.cardId === cardId)
      if (found) {
        return found
      }
    }
    return spare[0]
  }

  const loadWantedSlots = () => {
    for (const slotIndex of [0, 1]) {
      if (slot(slotIndex).topCard?.cardId === wanted[slotIndex]) {
        continue
      }
      if (slot(slotIndex).topCard !== null && state.phase !== 'loadout') {
        continue
      }
      const inHand = hand().find((card) => card.cardId === wanted[slotIndex])
      if (inHand) {
        submit({ kind: 'load_slot', sourceId: heroId, slotIndex, cardInstanceId: inHand.instanceId })
      }
    }
  }

  const chargeTarget = (slotIndex: number): number => {
    const top = slot(slotIndex).topCard
    if (!top) {
      return 0
    }
    const cap = cardChargeCap(catalog.cards[top.cardId])
    if (!knobs.spike) {
      return cap - 1
    }
    // Spiking discards the bundle at window end; only go full when a reload
    // copy is waiting in hand.
    const reloadAvailable = hand().some((card) => card.cardId === top.cardId)
    return reloadAvailable ? cap : cap - 1
  }

  const chargeableCards = (slotIndex: number): CardInstance[] => {
    const top = slot(slotIndex).topCard
    if (!top) {
      return []
    }
    const wantedIds = new Set(Object.values(wanted))
    const pool = hand().filter((card) => {
      if (!wantedIds.has(card.cardId)) {
        return true
      }
      const copiesInHand = hand().filter((other) => other.cardId === card.cardId).length
      return copiesInHand > 1
    })
    if (top.cardId === 'iron_guard') {
      // Iron Guard's Charge Modifier only counts Guard charges.
      return [...pool.filter((card) => isGuardTagged(card.cardId)), ...pool.filter((card) => !isGuardTagged(card.cardId))]
    }
    return pool
  }

  let guard = 0
  while (state.active && guard < 400) {
    guard += 1
    switch (state.phase) {
      case 'loadout': {
        loadWantedSlots()
        advance()
        break
      }
      case 'instant':
        advance()
        break
      case 'quick': {
        // Positioning first, while the hand is full.
        const entity = state.board.entities[heroId]
        if (knobs.position === 'far') {
          const bossCoords = state.board.entities[state.bossId].coords
          let moves = 0
          while (hexDistance(state.board.entities[heroId].coords, bossCoords) < 3 && moves < 2) {
            const here = state.board.entities[heroId].coords
            const destination = neighbors(state.board.hexes, here)
              .filter((coords: Axial) => isLegalMove(state.board, heroId, coords))
              .sort((a: Axial, b: Axial) => hexDistance(b, bossCoords) - hexDistance(a, bossCoords))[0]
            const fuel = moveFuel()
            if (!destination || !fuel || hexDistance(destination, bossCoords) <= hexDistance(here, bossCoords)) {
              break
            }
            if (!submit({ kind: 'move_hero', sourceId: heroId, destination, cardInstanceId: fuel.instanceId })) {
              break
            }
            moves += 1
          }
        } else if (knobs.position === 'dodge') {
          const heroKey = hexKey(entity.coords)
          if (state.telegraphs[heroKey] === 'breath') {
            const destination = neighbors(state.board.hexes, entity.coords).find(
              (coords: Axial) => state.telegraphs[hexKey(coords)] === undefined && isLegalMove(state.board, heroId, coords),
            )
            const fuel = moveFuel()
            if (destination && fuel) {
              submit({ kind: 'move_hero', sourceId: heroId, destination, cardInstanceId: fuel.instanceId })
            }
          }
        }
        // An empty Slot accepts its wanted Top Card for free in a window.
        loadWantedSlots()
        // Charge each Slot toward its target, then fire everything charged.
        for (const slotIndex of [0, 1]) {
          let safety = 0
          while (slot(slotIndex).topCard !== null && slot(slotIndex).charges.length < chargeTarget(slotIndex) && safety < 6) {
            safety += 1
            const candidates = chargeableCards(slotIndex)
            if (candidates.length === 0) {
              break
            }
            if (!submit({ kind: 'charge_slot', sourceId: heroId, slotIndex, cardInstanceId: candidates[0].instanceId })) {
              break
            }
          }
        }
        for (const slotIndex of [0, 1]) {
          if (slot(slotIndex).topCard && slot(slotIndex).charges.length > 0) {
            submit({ kind: 'fire_slot', sourceId: heroId, slotIndex })
          }
        }
        advance()
        break
      }
      case 'incoming':
        advance()
        break
      case 'slow':
        advance()
        break
    }
  }
  return {
    outcome: state.outcome,
    round: state.round,
    steps,
    bossHealth: state.board.entities[state.bossId]?.health ?? 0,
    heroHealth: state.heroes[heroId].health,
  }
}

function simulateDefeat(seed: number): SimResult {
  let state = createEncounterState(catalog, ENCOUNTER_ID, seed)
  const steps: ScenarioStep[] = []
  let guard = 0
  while (state.active && guard < 100) {
    guard += 1
    state = advancePhase(catalog, state).state
    steps.push({ advance: true })
  }
  return {
    outcome: state.outcome,
    round: state.round,
    steps,
    bossHealth: state.board.entities[state.bossId]?.health ?? 0,
    heroHealth: state.heroes[state.primaryHeroId].health,
  }
}

const knobVariants: PolicyKnobs[] = []
for (const slotPlan of ['dual_steady', 'sword_shield'] as const) {
  for (const position of ['far', 'dodge', 'stay'] as const) {
    for (const spike of [true, false]) {
      knobVariants.push({ slotPlan, position, spike })
    }
  }
}

// D-016/D-017: this is a team game — the solo policy search must NOT find a
// winning line. A found victory is a red-flag regression (an over-rich line
// or under-tuned counter-pressure) and fails this run. The committed proof
// artifact is instead the SOLO CEILING: the deepest push the search can
// manage, which must end short of Boss defeat.
let victory: { seed: number; knobs: PolicyKnobs; result: SimResult } | null = null
let best: { seed: number; knobs: PolicyKnobs; result: SimResult } | null = null
outer: for (let seed = 1; seed <= 100; seed += 1) {
  for (const knobs of knobVariants) {
    const result = simulate(seed, knobs)
    if (!best || result.bossHealth < best.result.bossHealth) {
      best = { seed, knobs, result }
    }
    if (result.outcome === 'victory') {
      victory = { seed, knobs, result }
      break outer
    }
  }
}

if (victory) {
  console.log(
    `RED FLAG (D-016): the solo policy search found a winning line — seed ${victory.seed}, knobs ${JSON.stringify(victory.knobs)}, ` +
      `round ${victory.result.round}, hero HP ${victory.result.heroHealth}. Solo Boss defeat is a tuning defect; fix the encounter before committing Scenarios.`,
  )
  process.exit(1)
}

if (!best) {
  console.log('No lines simulated; aborting.')
  process.exit(1)
}

console.log(
  `SOLO CEILING: seed ${best.seed}, knobs ${JSON.stringify(best.knobs)}, reached round ${best.result.round}, ` +
    `boss HP left ${best.result.bossHealth}, hero HP ${best.result.heroHealth}, ${best.result.steps.length} steps`,
)

const defeat = simulateDefeat(catalog.encounters[ENCOUNTER_ID].random_seed)
console.log(`DEFEAT: passive line ends round ${defeat.round} outcome ${defeat.outcome}, boss HP ${defeat.bossHealth}`)
if (defeat.outcome !== 'defeat') {
  console.log('Passive line did not lose; aborting.')
  process.exit(1)
}

const scenariosDir = resolvePath(import.meta.dirname ?? '.', '../../data/scenarios')
mkdirSync(scenariosDir, { recursive: true })

function writeScenario(fileName: string, scenario: object): void {
  writeFileSync(resolvePath(scenariosDir, fileName), `${JSON.stringify(scenario, null, 2)}\n`)
  console.log(`wrote data/scenarios/${fileName}`)
}

writeScenario('embermaw_solo_ceiling.json', {
  id: 'embermaw_solo_ceiling',
  title: 'Embermaw: solo ceiling',
  version: 1,
  description:
    'The deepest solo push the policy search can manage, ending short of Boss defeat. Proves the solo ceiling holds (D-016): a lone Guardian cannot win the Ashen Trial.',
  encounter: ENCOUNTER_ID,
  seed: best.seed,
  steps: best.result.steps,
})

writeScenario('embermaw_enrage_defeat.json', {
  id: 'embermaw_enrage_defeat',
  title: 'Embermaw: passive defeat',
  version: 1,
  description: 'Advancing every window without playing: the Boss Timeline alone defeats Elian Voss. Proves the encounter is losable.',
  encounter: ENCOUNTER_ID,
  seed: catalog.encounters[ENCOUNTER_ID].random_seed,
  steps: defeat.steps,
})

// A mid-Encounter jump point for design iteration: the solo-ceiling line paused
// at the first Round boundary that has Whelps standing on the board.
//
// This used to cut at a hardcoded Round 3, on the assumption that Brood Pattern
// always ran there. Program order is drawn from the seed now (D-037), so the
// Round a Brood Call lands on varies — the cut has to be found by the property
// the fixture exists for rather than by a Round number that happened to carry it.
const broodCut = (() => {
  let state = createEncounterState(catalog, ENCOUNTER_ID, best.seed)
  let count = 0
  let fallback = best.result.steps.length
  for (const step of best.result.steps) {
    const before = state.round
    state =
      'advance' in step ? advancePhase(catalog, state).state : resolve(catalog, state, (step as { action: EncounterActionInput }).action).state
    count += 1
    const crossedBoundary = state.round > before
    if (crossedBoundary && Object.values(state.board.entities).some((entity) => entity.kind === 'minion')) {
      return { count, round: state.round }
    }
    if (crossedBoundary) {
      fallback = count
    }
  }
  return { count: fallback, round: state.round }
})()

writeScenario('embermaw_brood_pressure.json', {
  id: 'embermaw_brood_pressure',
  title: `Round ${broodCut.round}: Whelps on the board`,
  version: 1,
  description: `The solo-ceiling line paused entering Round ${broodCut.round}: Whelps standing, slot engines running.`,
  encounter: ENCOUNTER_ID,
  seed: best.seed,
  steps: best.result.steps.slice(0, broodCut.count),
})
