// Searches for a winning line and a losing line through the Embermaw
// encounter by simulating simple tank policies against the Encounter Engine,
// then writes them to data/scenarios/ as committed Scenarios (M2 exit
// criterion: the encounter is winnable and losable per the rules docs).
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

let victory: { seed: number; knobs: PolicyKnobs; result: SimResult } | null = null
let best: { seed: number; knobs: PolicyKnobs; result: SimResult } | null = null
outer: for (let seed = 1; seed <= 300; seed += 1) {
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

if (!victory) {
  console.log('No winning line found. Closest attempt:')
  console.log(JSON.stringify(best, (key, value) => (key === 'steps' ? `[${(value as unknown[]).length} steps]` : value), 2))
  process.exit(1)
}

console.log(
  `VICTORY: seed ${victory.seed}, knobs ${JSON.stringify(victory.knobs)}, round ${victory.result.round}, ` +
    `hero HP ${victory.result.heroHealth}, ${victory.result.steps.length} steps`,
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

writeScenario('embermaw_victory_line.json', {
  id: 'embermaw_victory_line',
  title: 'Embermaw: victory line',
  version: 1,
  description:
    'A complete winning play of the Ashen Trial, generated by policy search over the Encounter Engine. Proves the encounter is winnable per the rules docs.',
  encounter: ENCOUNTER_ID,
  seed: victory.seed,
  steps: victory.result.steps,
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

// A mid-Encounter jump point for design iteration: the victory line paused
// at the top of Round 3 (Brood Pattern), whelps on the board.
const round3Cut = (() => {
  let state = createEncounterState(catalog, ENCOUNTER_ID, victory.seed)
  let count = 0
  for (const step of victory.result.steps) {
    const before = state.round
    state =
      'advance' in step ? advancePhase(catalog, state).state : resolve(catalog, state, (step as { action: EncounterActionInput }).action).state
    count += 1
    if (state.round === 3 && before === 2) {
      return count
    }
  }
  return victory.result.steps.length
})()

writeScenario('embermaw_round3_brood.json', {
  id: 'embermaw_round3_brood',
  title: 'Round 3: Brood Pattern opens',
  version: 1,
  description: 'The victory line paused entering Round 3: Whelps on the board, Brood Pattern up, slot engines running.',
  encounter: ENCOUNTER_ID,
  seed: victory.seed,
  steps: victory.result.steps.slice(0, round3Cut),
})
