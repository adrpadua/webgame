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
  forecast,
  programPredictability,
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
  // `culler` is the Whelp-answering plan (D-036): Sweeping Blow in the Quick
  // Window, Iron Guard in the Slow. It exists because Brood Call's Escalation
  // penalty is only measurable against a policy that can actually pay it —
  // without one, pricing the demand just measures an unavoidable tick.
  // `forecast_reader` and `forecast_blind` are a matched pair, and the only
  // difference between them is whether the policy looks at the Forecast Row.
  // They exist because nothing else in this sweep reads that row, so ADR 0026's
  // whole third horizon was unfalsifiable: a fixed script cannot benefit from
  // information it never consults. Fortify is the one card whose payoff lands
  // next Round (D-019 banks its Armor for the next Round *start*), so the
  // Forecast Row is the only surface that can price it — which makes this pair
  // a direct test of whether the row is actionable or decorative.
  slotPlan: 'dual_steady' | 'sword_shield' | 'turtle' | 'culler' | 'forecast_reader' | 'forecast_blind'
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
  minionsKilled: number
  shovesHeld: number
  burntHexes: number
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
    culler: { 0: 'sweeping_blow', 1: 'iron_guard' },
    forecast_reader: { 0: 'drive_back', 1: 'fortify' },
    forecast_blind: { 0: 'drive_back', 1: 'fortify' },
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

  // The entire difference between `forecast_reader` and `forecast_blind`.
  // Drive Back shoves the Boss out of cone range, and the price is the Guarded
  // Front: standing two hexes back means next Round's Raking Claw lands with
  // its unguarded bonus. Only the Forecast Row can say whether next Round
  // carries one, so this is the read, and holding the shove is what reading it
  // buys.
  const shouldFireSlot = (slotIndex: number, cardId: string): boolean => {
    if (knobs.slotPlan !== 'forecast_reader' || catalog.cards[cardId].push_tiles === 0) {
      return true
    }
    const ahead = forecast(catalog, state)
    if (ahead !== null && ahead.counterTags.includes('Mitigate')) {
      shovesHeld += 1
      return false
    }
    return true
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

  // Living Minions, nearest first. Ordering by distance is what lets the
  // culler pick a reachable target instead of the first one the board happens
  // to enumerate.
  const minionsByRange = () => {
    const here = state.board.entities[heroId].coords
    return Object.values(state.board.entities)
      .filter((entity) => entity.kind === 'minion')
      .sort((a, b) => hexDistance(a.coords, here) - hexDistance(b.coords, here))
  }

  // Walk toward the nearest Whelp until it is in the Top Card's range. Each
  // step spends a card as move fuel, which is the real price of answering the
  // demand: the Sweeping Blow slot and the hand both pay for it.
  const closeOnMinion = (range: number) => {
    for (let step = 0; step < 2; step += 1) {
      const target = minionsByRange()[0]
      if (!target) {
        return
      }
      const here = state.board.entities[heroId].coords
      if (hexDistance(here, target.coords) <= range) {
        return
      }
      const destination = neighbors(state.board.hexes, here)
        .filter((coords: Axial) => isLegalMove(state.board, heroId, coords))
        .sort((a: Axial, b: Axial) => hexDistance(a, target.coords) - hexDistance(b, target.coords))[0]
      const fuel = moveFuel()
      if (!destination || !fuel || hexDistance(destination, target.coords) >= hexDistance(here, target.coords)) {
        return
      }
      if (!submit({ kind: 'move_hero', sourceId: heroId, destination, cardInstanceId: fuel.instanceId })) {
        return
      }
    }
  }

  const fireReadySlots = () => {
    for (const slotIndex of [0, 1]) {
      const top = slot(slotIndex).topCard
      if (!top || slot(slotIndex).charges.length === 0) {
        continue
      }
      if (!shouldFireSlot(slotIndex, top.cardId)) {
        continue
      }
      // Forced Movement needs another piece in range. The Boss is the target
      // that matters: shoving it moves the cone's origin and the Guarded Front
      // together, which is repositioning the fight without walking.
      const card0 = catalog.cards[top.cardId]
      if (card0.push_tiles > 0 || card0.pull_tiles > 0) {
        const here0 = state.board.entities[heroId].coords
        const boss = state.board.entities[state.bossId]
        const reach = boss && hexDistance(boss.coords, here0) <= card0.range_tiles ? boss : minionsByRange().find((e) => hexDistance(e.coords, here0) <= card0.range_tiles)
        if (reach) {
          submit({ kind: 'fire_slot', sourceId: heroId, slotIndex, targetId: reach.id })
        }
        continue
      }
      // A piece-targeting Top Card is illegal without a Minion in range, so
      // supply one rather than firing into a rejection.
      const card = catalog.cards[top.cardId]
      if (card.damage > 0) {
        const here = state.board.entities[heroId].coords
        const target = minionsByRange().find((entity) => hexDistance(entity.coords, here) <= card.range_tiles)
        if (target) {
          submit({ kind: 'fire_slot', sourceId: heroId, slotIndex, targetId: target.id })
        }
        continue
      }
      submit({ kind: 'fire_slot', sourceId: heroId, slotIndex })
    }
  }

  let checkpoint = false
  let shovesHeld = 0
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
          if (state.telegraphs[heroKey] === 'cone') {
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
        // Closing happens after positioning and charging: the culler only
        // spends fuel walking once it has a charged Sweeping Blow to fire.
        if (knobs.slotPlan === 'culler') {
          const top = slot(0).topCard
          if (top && slot(0).charges.length > 0) {
            closeOnMinion(catalog.cards[top.cardId].range_tiles)
          }
        }
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
        //
        // The reader prices that spend against the Forecast Row. A program that
        // wants `Mitigate` opens with a Raking Claw in its Instant Row — a hit
        // no Round-2 action could answer, which is exactly what banked Armor is
        // for. A program that does not (Ember, Ashfall) deals its damage through
        // a dodgeable cone instead, so the cards are worth more in hand as move
        // fuel than spent on Armor that will be wiped unused.
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
    const counterEvent = rf?.counter_event as Record<string, unknown> | undefined
    if (counterEvent?.counter_id === 'riposte_ready' && counterEvent.event === 'placed') {
      riposteGranted += 1
    }
    if (counterEvent?.counter_id === 'riposte_ready' && counterEvent.event === 'consumed') {
      if (counterEvent.reason === 'matching_card_fired') {
        riposteFull += 1
      } else {
        riposteEarly += 1
      }
    }
  }

  // Whelps defeated, read from the damage fact that removes them. This is the
  // evidence that a priced Brood Call is answerable rather than a tax.
  let minionsKilled = 0
  for (const fact of facts) {
    if (fact.succeeded && (fact.resolutionFact as Record<string, unknown> | undefined)?.target_removed === true) {
      minionsKilled += 1
    }
  }

  let escalationFromDemands = 0
  for (const fact of facts) {
    if (fact.kind === 'gain_escalation' && fact.succeeded) {
      const rf = fact.resolutionFact as Record<string, unknown> | undefined
      // Any reason but the automatic tick. Naming one demand kind here quietly
      // under-reported the moment a second one existed (D-041).
      if (rf?.escalation_reason !== undefined && rf.escalation_reason !== 'automatic_tick') {
        escalationFromDemands += 1
      }
    }
  }

  // Arena permanently lost by the end (D-039). The Ash Trail writes to it where
  // the Tank stood, so this is the ground a run's positioning actually cost.
  const burntHexes = Object.values(state.board.hazards).filter((list) => list.some((hazard) => hazard.permanent === true)).length

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
    minionsKilled,
    shovesHeld,
    burntHexes,
  }
}

// ——— Sweep ———
const variants: PolicyKnobs[] = []
if (POLICY) {
  const [slotPlan, position, spike] = POLICY.split(',')
  variants.push({ slotPlan: slotPlan as PolicyKnobs['slotPlan'], position: position as PolicyKnobs['position'], spike: spike === 'true' })
} else {
  for (const slotPlan of ['dual_steady', 'sword_shield', 'turtle', 'culler', 'forecast_reader', 'forecast_blind'] as const) {
    for (const position of ['far', 'dodge', 'stay'] as const) {
      for (const spike of [true, false]) {
        variants.push({ slotPlan, position, spike })
      }
    }
  }
}

const rows: Record<string, string | number>[] = []
const redFlags: string[] = []
// ADR 0027's third standing criterion. It is counted rather than described
// because the percentages this ADR once recorded went stale the moment someone
// tuned Phase II damage: a gate that decays when unrelated work lands is not a
// gate. The count is what must stay above zero; which policies produce it, and
// how often, is a dated observation.
let wallRuns = 0
// The checkpoint gate, restated structurally. ADR 0027 used to state it as a
// literal percentage string, which is the same defect its own correction section
// warns about: the moment Boss content changed, the string went stale and the
// gate protected nothing. What actually has to hold is that the Round-4
// checkpoint *discriminates* — some policies clear it, some do not. All-pass
// means the teaching Rounds ask nothing; all-fail means they are lethal.
const checkpointPercentages: number[] = []
for (const knobs of variants) {
  const runs: RunMetrics[] = []
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    runs.push(simulate(seed, knobs))
  }
  const pct = (predicate: (run: RunMetrics) => boolean) => Math.round((100 * runs.filter(predicate).length) / runs.length)
  const avg = (value: (run: RunMetrics) => number) => (runs.reduce((sum, run) => sum + value(run), 0) / runs.length).toFixed(2)
  // Spread, not just the mean. An average hides the failure this sweep is worst
  // at spotting: 30 different seeds producing one identical fight. `5-5` in the
  // round column means the draw order changed nothing about when the run ended.
  const spread = (value: (run: RunMetrics) => number) => {
    const values = runs.map(value)
    return `${Math.min(...values)}-${Math.max(...values)}`
  }
  const label = `${knobs.slotPlan}/${knobs.position}${knobs.spike ? '/spike' : ''}`
  const checkpointPct = pct((run) => run.checkpoint)
  checkpointPercentages.push(checkpointPct)
  const victoryPct = pct((run) => run.outcome === 'victory')
  if (victoryPct > 0) {
    redFlags.push(`${label}: ${victoryPct}% solo victories`)
  }
  // The enrage wall, as ADR 0027 states it: a line that survives everything
  // the Boss does still cannot kill it, and something ends the fight anyway.
  wallRuns += runs.filter(
    (run) => run.outcome === 'defeat' && run.outcomeReason !== 'A Hero has fallen.' && run.bossDamage === 0,
  ).length
  rows.push({
    policy: label,
    'checkpoint%': checkpointPct,
    'victory%⚠': victoryPct,
    'hpDeath%': pct((run) => run.outcome === 'defeat' && run.outcomeReason === 'A Hero has fallen.'),
    'enrage%': pct((run) => run.outcome === 'defeat' && run.outcomeReason !== 'A Hero has fallen.'),
    avgRound: avg((run) => run.finalRound),
    roundSpread: spread((run) => run.finalRound),
    'reachedR8%': pct((run) => run.finalRound >= 8),
    escalation: avg((run) => run.escalation),
    escFromAdds: avg((run) => run.escalationFromDemands),
    whelpKills: avg((run) => run.minionsKilled),
    burnt: avg((run) => run.burntHexes),
    held: avg((run) => run.shovesHeld),
    bossDmg: avg((run) => run.bossDamage),
    dmgSpread: spread((run) => run.bossDamage),
    ripGrant: avg((run) => run.riposteGranted),
    ripFull: avg((run) => run.riposteFull),
    ripEarly: avg((run) => run.riposteEarly),
    rejected: avg((run) => run.rejected),
  })
}

console.table(rows)
console.log(`${SEEDS} seeds per policy against '${ENCOUNTER_ID}' via the browser Encounter Engine.`)
// The wall is a property of the whole sweep, so a `--policy` subset cannot be
// held to it: most single policies legitimately never reach the clock.
if (POLICY) {
  console.log(`\nADR 0027 enrage wall: not asserted for a single-policy run (${wallRuns} qualifying run(s) here).`)
} else if (wallRuns === 0) {
  redFlags.push(
    'ADR 0027 enrage wall unmet: no run reached the Encounter Clock and died to Escalation at 0 Boss damage. ' +
      'Either no survival-biased policy can still reach the clock, or one that reaches it is now dealing damage.',
  )
} else {
  console.log(`\nADR 0027 enrage wall: ${wallRuns} run(s) reached the Clock and died to Escalation at 0 Boss damage.`)
}
if (!POLICY) {
  const clears = checkpointPercentages.filter((value) => value === 100).length
  const fails = checkpointPercentages.filter((value) => value < 100).length
  if (clears === 0) {
    redFlags.push('Round-4 checkpoint is lethal to every policy: the teaching Rounds no longer teach.')
  } else if (fails === 0) {
    redFlags.push(
      'Round-4 checkpoint is free for every policy: no live demand outruns the solo Hero economy by the halfway ' +
        'mark, which is Tank Principle 4 losing its evidence.',
    )
  } else {
    console.log(`Round-4 checkpoint discriminates: ${clears} policy/policies clear it, ${fails} do not.`)
  }
}
// ADR 0028's standing gate, counted rather than argued. A fully predictable
// order is the regression the seeded draw exists to prevent; the distance from
// the uniform floor is how countable the pool still is.
if (!POLICY) {
  const predictability = programPredictability(catalog, ENCOUNTER_ID, 800)
  const certain = predictability.perRound.filter((entry) => entry.accuracy === 1).map((entry) => `R${entry.round}`)
  console.log(
    `Program order predictability: a perfect counter is right ${(100 * predictability.meanAccuracy).toFixed(0)}% of the time ` +
      `(uniform floor ${(100 * predictability.uniformBaseline).toFixed(0)}%), certain on ${certain.length === 0 ? 'no Round' : certain.join(', ')}.`,
  )
  if (!predictability.reliable) {
    console.log('  (estimate under-sampled — raise the seed count before trusting it)')
  }
  if (predictability.meanAccuracy === 1) {
    redFlags.push('Boss Program order is fully predictable: the Forecast Row discloses nothing a player cannot count (ADR 0028).')
  }
}
if (redFlags.length > 0) {
  console.log(`\nRED FLAGS — a solo victory is a tuning defect (D-016), and the enrage wall must hold (ADR 0027):`)
  for (const flag of redFlags) {
    console.log(`  ⚠ ${flag}`)
  }
}
if (JSON_OUT) {
  writeFileSync(JSON_OUT, `${JSON.stringify({ encounterId: ENCOUNTER_ID, seeds: SEEDS, rows, redFlags, wallRuns }, null, 2)}\n`)
  console.log(`Aggregates written to ${JSON_OUT}`)
}
