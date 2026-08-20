// The no-healer-clear line (D-082/D-083), played rather than argued.
//
// Two arms over the same seeds. `solo` plays the Brand trial with Maren's
// seat removed (`embermaw_attrition_solo_probe`): Elian's sword-and-shield
// plan against a Boss that brands him, with nobody able to strike the entry.
// `duo` plays the shipped two-seat trial with the same guardian plan plus
// Maren's authored loop — clear the Sears, overheal the front line into Boss
// damage, bank Certifications, cover at full bank.
//
// The claim under measurement is the Healer Design Bible's first principle:
// a Party without the Healer must not clear this Encounter comfortably, and
// the delta between the arms must be attributable to her kit. This script is
// the measurement, not a proof: it reports what these fixed policies achieve,
// which is the floor of play, never its ceiling — the same caveat evaluate.ts
// records for every solo policy.
//
// Self-contained by the same reasoning generateScenarios.ts is: the sweep's
// policy loop is solo-shaped, and teaching it a second pilot would touch
// every existing row to serve a probe only this question needs.
//
// Usage (from web/):
//   npx vite-node scripts/attritionLine.ts               # 30 seeds, both arms
//   npx vite-node scripts/attritionLine.ts -- --seeds 100
//   npx vite-node scripts/attritionLine.ts -- --pin 2141 # also write the duo line as a Scenario
import { writeFileSync } from 'node:fs'
import { loadCatalog } from '../src/content'
import {
  advancePhase,
  cardChargeCap,
  combatantRef,
  counterCount,
  createEncounterState,
  hexDistance,
  legality,
  resolve,
  type EncounterActionInput,
  type EncounterState,
} from '../src/engine'

const argv = process.argv.slice(2)
function flagValue(flag: string): string | undefined {
  const index = argv.indexOf(flag)
  return index >= 0 ? argv[index + 1] : undefined
}

const catalog = loadCatalog()
const SEEDS = Number(flagValue('--seeds') ?? 30)
const PIN_SEED = flagValue('--pin')

const SOLO_ENCOUNTER = 'embermaw_attrition_solo_probe'
const DUO_ENCOUNTER = 'embermaw_attrition_trial'
const MARK = 'seared'
const COVER = 'underwritten'

type Step = { action: EncounterActionInput } | { advance: true }

interface RunResult {
  seed: number
  outcome: string
  rounds: number
  bossHealthLeft: number
  guardianHealthLeft: number
  marenHealthLeft: number | null
  searRoundsStanding: number
  searsPlaced: number
  cleansesFired: number
  overflowDamage: number
  coversPlaced: number
  downs: number
  revives: number
  steps: Step[]
}

function play(encounterId: string, seed: number, withMaren: boolean): RunResult {
  let state: EncounterState = createEncounterState(catalog, encounterId, seed)
  const steps: Step[] = []
  const metrics = {
    searRoundsStanding: 0,
    searsPlaced: 0,
    cleansesFired: 0,
    overflowDamage: 0,
    coversPlaced: 0,
    downs: 0,
    revives: 0,
  }
  const submit = (action: EncounterActionInput): boolean => {
    const result = resolve(catalog, state, action)
    const ok = result.facts[0]?.succeeded === true
    if (ok) {
      state = result.state
      steps.push({ action })
      for (const fact of result.facts) {
        const converted = fact.detail?.overflowConverted
        if (typeof converted === 'number') {
          metrics.overflowDamage += converted
        }
        if (fact.kind === 'place_counter' && fact.detail?.placedCounter === COVER && Number(fact.detail?.placedCounterAmount) > 0) {
          metrics.coversPlaced += 1
        }
        if (fact.detail?.downed !== undefined) {
          metrics.downs += 1
        }
      }
    }
    return ok
  }
  const advance = (): void => {
    if (!state.active) {
      return
    }
    const result = advancePhase(catalog, state)
    for (const fact of result.facts) {
      if (fact.kind === 'place_counter' && fact.detail?.placedCounter === MARK && Number(fact.detail?.placedCounterAmount) > 0) {
        metrics.searsPlaced += 1
      }
      if (fact.detail?.downed !== undefined) {
        metrics.downs += 1
      }
    }
    state = result.state
    steps.push({ advance: true })
  }

  const hero = (id: string) => state.heroes[id]
  const living = (id: string) => hero(id) !== undefined && hero(id).status === 'living'

  // --- Elian's plan: sword_shield from the sweep, condensed. Steady Strike
  // needs the Boss adjacent; the hunt program closes the gap itself.
  const GUARDIAN = 'guardian'
  const GUARDIAN_PLAN: Record<number, string> = { 0: 'steady_strike', 1: 'iron_guard' }

  const loadPlan = (heroId: string, plan: Record<number, string>) => {
    for (const slotIndex of Object.keys(plan).map(Number)) {
      const slot = hero(heroId).actionBar[slotIndex]
      if (slot.topCard?.cardId === plan[slotIndex]) {
        continue
      }
      if (slot.topCard !== null && state.phase !== 'loadout') {
        continue
      }
      const inHand = hero(heroId).hand.find((card) => card.cardId === plan[slotIndex])
      if (inHand) {
        submit({ kind: 'load_slot', sourceId: heroId, slotIndex, cardInstanceId: inHand.instanceId })
      }
    }
  }

  const chargeSlots = (heroId: string, plan: Record<number, string>) => {
    for (const slotIndex of Object.keys(plan).map(Number)) {
      let safety = 0
      const slot = () => hero(heroId).actionBar[slotIndex]
      while (slot().topCard !== null && slot().charges.length < cardChargeCap(catalog.cards[slot().topCard!.cardId]) - 1 && safety < 6) {
        safety += 1
        // Spare fuel: any hand card that is not the last copy of a planned one.
        const planned = new Set(Object.values(plan))
        const pool = hero(heroId).hand.filter((card) => {
          if (!planned.has(card.cardId)) {
            return true
          }
          return hero(heroId).hand.filter((other) => other.cardId === card.cardId).length > 1
        })
        if (pool.length === 0 || !submit({ kind: 'charge_slot', sourceId: heroId, slotIndex, cardInstanceId: pool[0].instanceId })) {
          break
        }
      }
    }
  }

  const fireGuardian = () => {
    if (!living(GUARDIAN)) {
      return
    }
    for (const slotIndex of [0, 1]) {
      const slot = hero(GUARDIAN).actionBar[slotIndex]
      if (!slot.topCard || slot.charges.length === 0) {
        continue
      }
      const card = catalog.cards[slot.topCard.cardId]
      if (card.boss_damage > 0) {
        const here = state.board.entities[GUARDIAN]?.coords
        const boss = state.board.entities[state.bossId]
        if (!here || !boss || hexDistance(here, boss.coords) > card.range_tiles) {
          continue
        }
      }
      submit({ kind: 'fire_slot', sourceId: GUARDIAN, slotIndex })
    }
    // The Riposte, cashed at one — the sweep's measured floor.
    hero(GUARDIAN).actionBar.forEach((slot, slotIndex) => {
      if (slot.fixed && slot.earnedCharges > 0 && slot.topCard !== null) {
        submit({ kind: 'fire_slot', sourceId: GUARDIAN, slotIndex })
      }
    })
  }

  // --- Maren's loop (D-080): read, clear, cover, bank.
  const MAREN = 'maren'
  const MAREN_PLAN: Record<number, string> = { 0: 'strike_the_entry', 1: 'surplus_of_care' }

  const mostMarkedAlly = (): string | undefined => {
    return state.partyHeroIds
      .filter((id) => living(id))
      .map((id) => ({ id, marks: counterCount(state, combatantRef(id), MARK) }))
      .filter((entry) => entry.marks > 0)
      .sort((a, b) => b.marks - a.marks)[0]?.id
  }

  const reviveIfNeeded = (rescuerId: string, fallenId: string) => {
    if (!living(rescuerId) || hero(fallenId)?.status !== 'downed') {
      return
    }
    const payment = hero(rescuerId).hand[0]
    if (!payment) {
      return
    }
    const action: EncounterActionInput = { kind: 'revive_ally', sourceId: rescuerId, targetId: fallenId, cardInstanceId: payment.instanceId }
    if (legality(catalog, state, action).legal && submit(action)) {
      metrics.revives += 1
    }
  }

  const marenQuick = () => {
    if (!living(MAREN)) {
      return
    }
    reviveIfNeeded(MAREN, GUARDIAN)
    loadPlan(MAREN, MAREN_PLAN)
    chargeSlots(MAREN, MAREN_PLAN)
    // Clear: the most-marked ally loses their Sears first — the mark prices
    // every later blow, so it outranks the heal.
    const marked = mostMarkedAlly()
    const cleanse = hero(MAREN).actionBar[0]
    if (marked && cleanse.topCard?.cardId === 'strike_the_entry' && cleanse.charges.length > 0) {
      if (submit({ kind: 'fire_slot', sourceId: MAREN, slotIndex: 0, targetId: marked })) {
        metrics.cleansesFired += 1
      }
    }
    // Cover: the overflow heal goes to the front line — a heal when Elian is
    // hurt, converted Boss damage when he is not. Both charge the Signature.
    const mercy = hero(MAREN).actionBar[1]
    if (mercy.topCard?.cardId === 'surplus_of_care' && mercy.charges.length > 0 && living(GUARDIAN)) {
      submit({ kind: 'fire_slot', sourceId: MAREN, slotIndex: 1, targetId: GUARDIAN })
    }
    // Bank: the Signature holds to its full cap for the rider, then covers
    // the guardian — Q23's rhythm.
    hero(MAREN).actionBar.forEach((slot, slotIndex) => {
      if (!slot.fixed || slot.topCard === null) {
        return
      }
      if (slot.earnedCharges >= cardChargeCap(catalog.cards[slot.topCard.cardId]) && living(GUARDIAN)) {
        submit({ kind: 'fire_slot', sourceId: MAREN, slotIndex, targetId: GUARDIAN })
      }
    })
  }

  let guard = 0
  while (state.active && guard < 400) {
    guard += 1
    switch (state.phase) {
      case 'loadout': {
        if (living(GUARDIAN)) {
          loadPlan(GUARDIAN, GUARDIAN_PLAN)
        }
        if (withMaren && living(MAREN)) {
          loadPlan(MAREN, MAREN_PLAN)
        }
        advance()
        break
      }
      case 'instant': {
        // Sear uptime is sampled here, once per Round, after the Instant Row
        // that lays it: the Rounds the front line spends marked.
        if (state.partyHeroIds.some((id) => counterCount(state, combatantRef(id), MARK) > 0)) {
          metrics.searRoundsStanding += 1
        }
        advance()
        break
      }
      case 'quick': {
        if (living(GUARDIAN)) {
          reviveIfNeeded(GUARDIAN, MAREN)
          loadPlan(GUARDIAN, GUARDIAN_PLAN)
          chargeSlots(GUARDIAN, GUARDIAN_PLAN)
        }
        if (withMaren) {
          marenQuick()
        }
        fireGuardian()
        advance()
        break
      }
      case 'incoming':
        advance()
        break
      case 'slow': {
        if (living(GUARDIAN)) {
          chargeSlots(GUARDIAN, GUARDIAN_PLAN)
        }
        advance()
        break
      }
    }
  }

  return {
    seed,
    outcome: state.outcome,
    rounds: state.round,
    bossHealthLeft: state.board.entities[state.bossId]?.health ?? 0,
    guardianHealthLeft: hero(GUARDIAN)?.health ?? 0,
    marenHealthLeft: withMaren ? (hero('maren')?.health ?? 0) : null,
    ...metrics,
    steps,
  }
}

function summarize(label: string, runs: RunResult[]): void {
  const clears = runs.filter((run) => run.outcome === 'victory').length
  const defeats = runs.filter((run) => run.outcome === 'defeat').length
  const average = (pick: (run: RunResult) => number) => (runs.reduce((sum, run) => sum + pick(run), 0) / runs.length).toFixed(1)
  console.log(`\n=== ${label} — ${runs.length} seeds ===`)
  console.log(`clears ${clears}/${runs.length}, defeats ${defeats}, other ${runs.length - clears - defeats}`)
  console.log(
    `avg rounds ${average((run) => run.rounds)}, boss health left ${average((run) => run.bossHealthLeft)}, ` +
      `guardian health left ${average((run) => run.guardianHealthLeft)}`,
  )
  console.log(
    `Sear rounds standing ${average((run) => run.searRoundsStanding)}, Sears placed ${average((run) => run.searsPlaced)}, ` +
      `cleanses ${average((run) => run.cleansesFired)}, overflow damage ${average((run) => run.overflowDamage)}, covers ${average((run) => run.coversPlaced)}, revives ${average((run) => run.revives)}`,
  )
}

const soloRuns: RunResult[] = []
const duoRuns: RunResult[] = []
for (let index = 0; index < SEEDS; index += 1) {
  const seed = 1000 + index
  soloRuns.push(play(SOLO_ENCOUNTER, seed, false))
  duoRuns.push(play(DUO_ENCOUNTER, seed, true))
}
summarize('solo — no Healer (control)', soloRuns)
summarize('duo — Maren playing her loop', duoRuns)

console.log(`duo clearing seeds: ${duoRuns.filter((run) => run.outcome === 'victory').map((run) => run.seed).join(', ') || 'none'}`)
const soloClears = soloRuns.filter((run) => run.outcome === 'victory').length
const duoClears = duoRuns.filter((run) => run.outcome === 'victory').length
console.log(`\nno-healer-clear verdict: solo clears ${soloClears}/${SEEDS}, duo clears ${duoClears}/${SEEDS}`)

if (PIN_SEED !== undefined) {
  const pinned = play(DUO_ENCOUNTER, Number(PIN_SEED), true)
  const scenario = {
    id: 'brand_trial_duo_line',
    title: `The Brand: Maren's line (seed ${PIN_SEED})`,
    version: 1,
    description:
      `The played no-healer-clear line, duo arm: outcome ${pinned.outcome} at Round ${pinned.rounds}, ` +
      `${pinned.cleansesFired} cleanses, ${pinned.overflowDamage} overflow damage, ${pinned.coversPlaced} covers. ` +
      'Generated by scripts/attritionLine.ts; the solo control on the same seeds is reported in the Brand gate doc.',
    encounter: DUO_ENCOUNTER,
    seed: Number(PIN_SEED),
    steps: pinned.steps,
  }
  writeFileSync('../data/scenarios/brand_trial_duo_line.json', `${JSON.stringify(scenario, null, 2)}\n`)
  console.log(`pinned: data/scenarios/brand_trial_duo_line.json (${pinned.steps.length} steps, outcome ${pinned.outcome})`)
}
