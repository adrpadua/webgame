// Headless evaluation sweep: plays fixed tank policies across seeded runs of
// the real Encounter Engine and aggregates rubric-facing metrics — the
// browser-engine successor to the Godot deck-eval generators.
//
// Per D-016 this is a team game: any solo victory is reported as a RED FLAG
// (over-rich economy, under-tuned attrition, or an unintended dominant line),
// never as a success.
//
// Usage (from web/):
//   npm run evaluate                        # all 18 policy variants, 30 seeds
//   npm run evaluate -- --seeds 100
//   npm run evaluate -- --policy turtle,stay,false --seeds 200
//   npm run evaluate -- --json out.json
import { writeFileSync } from 'node:fs'
import { loadCatalog, DEFAULT_ENCOUNTER_ID } from '../src/content'
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
  type EncounterState,
  type ResolutionFactEntry,
} from '../src/engine'

const catalog = loadCatalog()
const ENCOUNTER_ID = DEFAULT_ENCOUNTER_ID

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const flagValue = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const SEEDS = Number(flagValue('--seeds') ?? 30)
const JSON_OUT = flagValue('--json')
const POLICY = flagValue('--policy')

interface PolicyKnobs {
  // `turtle` is the survival-biased plan (ADR 0027): Iron Guard in the Quick
  // Window, Fortify in the Slow Window, no offense at all. Its job is to reach
  // the Encounter Clock so Escalation — not attrition — is what ends the run,
  // which is the only way the solo slice can measure the enrage wall.
  slotPlan: 'dual_steady' | 'sword_shield' | 'turtle'
  position: 'far' | 'dodge' | 'stay'
  spike: boolean
}

const MOVE_FUEL_ORDER = ['grow_presence', 'anchor_presence', 'gather_strength', 'fortify', 'sweeping_blow', 'strike_hex', 'shield_slam', 'iron_guard']
const isGuardTagged = (cardId: string): boolean => catalog.cards[cardId].tags.includes('guard')

interface RunMetrics {
  outcome: string
  escalation: number
  escalationFromDemands: number
  outcomeReason: string
  finalRound: number
  bossDamage: number
  heroHealth: number
  checkpoint: boolean
  riposteGranted: number
  riposteFull: number
  riposteEarly: number
  rejected: number
}

// Same policy shape as generateScenarios.ts, instrumented for metrics instead
// of step capture. Kept self-contained so the committed-scenario generator
// stays untouched.
function simulate(seed: number, knobs: PolicyKnobs): RunMetrics {
  let state: EncounterState = createEncounterState(catalog, ENCOUNTER_ID, seed)
  const bossStartHealth = state.board.entities[state.bossId].health
  const facts: ResolutionFactEntry[] = []

  const submit = (action: EncounterActionInput): boolean => {
    const result = resolve(catalog, state, action)
    facts.push(...result.facts)
    const ok = result.facts[0]?.succeeded === true
    if (ok) {
      state = result.state
    }
    return ok
  }
  const advance = (): void => {
    if (!state.active) {
      return
    }
    const result = advancePhase(catalog, state)
    facts.push(...result.facts)
    state = result.state
  }

  const heroId = state.primaryHeroId
  const WANTED_BY_PLAN: Record<PolicyKnobs['slotPlan'], Record<number, string>> = {
    dual_steady: { 0: 'steady_strike', 1: 'steady_strike' },
    sword_shield: { 0: 'steady_strike', 1: 'iron_guard' },
    turtle: { 0: 'iron_guard', 1: 'fortify' },
  }
  const wanted: Record<number, string> = WANTED_BY_PLAN[knobs.slotPlan]
  const hand = () => state.heroes[heroId].hand
  const slot = (index: number) => state.heroes[heroId].actionBar[index]

  const moveFuel = (): CardInstance | undefined => {
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
      return [...pool.filter((card) => isGuardTagged(card.cardId)), ...pool.filter((card) => !isGuardTagged(card.cardId))]
    }
    return pool
  }

  const chargeSlots = () => {
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
  }

  const fireReadySlots = () => {
    for (const slotIndex of [0, 1]) {
      if (slot(slotIndex).topCard && slot(slotIndex).charges.length > 0) {
        submit({ kind: 'fire_slot', sourceId: heroId, slotIndex })
      }
    }
  }

  let checkpoint = false
  let guard = 0
  while (state.active && guard < 400) {
    guard += 1
    if (state.round >= 5 && !checkpoint) {
      checkpoint = true // the Guardian survived the end of Round 4
    }
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
        loadWantedSlots()
        chargeSlots()
        fireReadySlots()
        advance()
        break
      }
      case 'incoming':
        advance()
        break
      case 'slow': {
        // Charge and fire the Slow Top Card. Fortify's delayed Armor (D-019) is
        // the only card that can pre-block the next Round's Instant Row, so a
        // survival policy has to use the Slow Window.
        chargeSlots()
        fireReadySlots()
        advance()
        break
      }
    }
  }
  if (state.round >= 5 || state.outcome === 'victory') {
    checkpoint = true
  }

  // Metric extraction from the recorded facts.
  let riposteGranted = 0
  let riposteFull = 0
  let riposteEarly = 0
  let rejected = 0
  for (const fact of facts) {
    if (!fact.succeeded) {
      rejected += 1
      continue
    }
    const rf = fact.resolutionFact as Record<string, unknown> | undefined
    const statusEvent = rf?.status_event as Record<string, unknown> | undefined
    if (statusEvent?.status_id === 'riposte_ready' && statusEvent.event === 'granted') {
      riposteGranted += 1
    }
    if (statusEvent?.status_id === 'riposte_ready' && statusEvent.event === 'consumed') {
      if (statusEvent.reason === 'matching_card_fired') {
        riposteFull += 1
      } else {
        riposteEarly += 1
      }
    }
  }

  let escalationFromDemands = 0
  for (const fact of facts) {
    if (fact.kind === 'gain_escalation' && fact.succeeded) {
      const rf = fact.resolutionFact as Record<string, unknown> | undefined
      if (rf?.escalation_reason === 'unanswered_minions') {
        escalationFromDemands += 1
      }
    }
  }

  return {
    outcome: state.outcome,
    escalation: state.escalation,
    escalationFromDemands,
    outcomeReason: state.outcomeReason,
    finalRound: state.round,
    bossDamage: bossStartHealth - (state.board.entities[state.bossId]?.health ?? 0),
    heroHealth: state.heroes[heroId].health,
    checkpoint,
    riposteGranted,
    riposteFull,
    riposteEarly,
    rejected,
  }
}

// ——— Sweep ———
const variants: PolicyKnobs[] = []
if (POLICY) {
  const [slotPlan, position, spike] = POLICY.split(',')
  variants.push({ slotPlan: slotPlan as PolicyKnobs['slotPlan'], position: position as PolicyKnobs['position'], spike: spike === 'true' })
} else {
  for (const slotPlan of ['dual_steady', 'sword_shield', 'turtle'] as const) {
    for (const position of ['far', 'dodge', 'stay'] as const) {
      for (const spike of [true, false]) {
        variants.push({ slotPlan, position, spike })
      }
    }
  }
}

const rows: Record<string, string | number>[] = []
const redFlags: string[] = []
for (const knobs of variants) {
  const runs: RunMetrics[] = []
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    runs.push(simulate(seed, knobs))
  }
  const pct = (predicate: (run: RunMetrics) => boolean) => Math.round((100 * runs.filter(predicate).length) / runs.length)
  const avg = (value: (run: RunMetrics) => number) => (runs.reduce((sum, run) => sum + value(run), 0) / runs.length).toFixed(2)
  const label = `${knobs.slotPlan}/${knobs.position}${knobs.spike ? '/spike' : ''}`
  const victoryPct = pct((run) => run.outcome === 'victory')
  if (victoryPct > 0) {
    redFlags.push(`${label}: ${victoryPct}% solo victories`)
  }
  rows.push({
    policy: label,
    'checkpoint%': pct((run) => run.checkpoint),
    'victory%⚠': victoryPct,
    'hpDeath%': pct((run) => run.outcome === 'defeat' && run.outcomeReason === 'A Hero has fallen.'),
    'enrage%': pct((run) => run.outcome === 'defeat' && run.outcomeReason !== 'A Hero has fallen.'),
    avgRound: avg((run) => run.finalRound),
    'reachedR8%': pct((run) => run.finalRound >= 8),
    escalation: avg((run) => run.escalation),
    escFromAdds: avg((run) => run.escalationFromDemands),
    bossDmg: avg((run) => run.bossDamage),
    ripGrant: avg((run) => run.riposteGranted),
    ripFull: avg((run) => run.riposteFull),
    ripEarly: avg((run) => run.riposteEarly),
    rejected: avg((run) => run.rejected),
  })
}

console.table(rows)
console.log(`${SEEDS} seeds per policy against '${ENCOUNTER_ID}' via the browser Encounter Engine.`)
if (redFlags.length > 0) {
  console.log(`\nD-016 RED FLAGS — solo victories are tuning defects, not successes:`)
  for (const flag of redFlags) {
    console.log(`  ⚠ ${flag}`)
  }
}
if (JSON_OUT) {
  writeFileSync(JSON_OUT, `${JSON.stringify({ encounterId: ENCOUNTER_ID, seeds: SEEDS, rows, redFlags }, null, 2)}\n`)
  console.log(`Aggregates written to ${JSON_OUT}`)
}
