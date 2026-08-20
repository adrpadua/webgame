// Headless evaluation sweep: plays fixed tank policies across seeded runs of
// the real Encounter Engine and aggregates rubric-facing metrics — the
// browser-engine successor to the Godot deck-eval generators.
//
// Per D-016 this is a team game: any solo victory is reported as a RED FLAG
// (over-rich economy, under-tuned attrition, or an unintended dominant line),
// never as a success.
//
// Usage (from web/):
//   npm run evaluate                        # all 48 policy variants, 30 seeds
//   npm run evaluate -- --seeds 100
//   npm run evaluate -- --encounter embermaw_traversal_probe
//   npm run evaluate -- --policy turtle,stay,false --seeds 200
//   npm run evaluate -- --json out.json
import { writeFileSync } from 'node:fs'
import { loadCatalog, DEFAULT_ENCOUNTER_ID } from '../src/content'
import {
  advancePhase,
  programPredictability,
  cardChargeCap,
  combatantRef,
  heroRoundsLost,
  counterCount,
  createEncounterState,
  fireTargeting,
  hexDistance,
  readCounterEvent,
  readSignatureEvent,
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

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const flagValue = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
// `--encounter <id>` runs the sweep against a different fight, the same way
// `--deck` runs it against a different list (D-076).
//
// It exists for the same reason, one level up. A candidate *card* could only be
// measured by promoting it to the default deck first, which is the promotion
// the rubric says the measurement is supposed to gate — so `--deck` broke the
// circle. A candidate *Boss mechanic* had the same circle and no way out: the
// only fight the sweep could measure was the shipped one, so authoring a
// traversing Boss meant re-baselining Embermaw's walls against content nothing
// had measured yet. An evaluation Encounter is measured first and promoted
// after, and until it is promoted it changes no shipped number.
const ENCOUNTER_ID = flagValue('--encounter') ?? DEFAULT_ENCOUNTER_ID
if (!catalog.encounters[ENCOUNTER_ID]) {
  throw new Error(`Unknown encounter ${ENCOUNTER_ID}; authored encounters are ${Object.keys(catalog.encounters).join(', ')}`)
}
const SEEDS = Number(flagValue('--seeds') ?? 30)
const JSON_OUT = flagValue('--json')
const POLICY = flagValue('--policy')
// `--deck <id>` runs the sweep against an evaluation deck from `data/decks/`
// instead of the Encounter's own list. Without it a candidate card could only
// be measured by promoting it to the default deck first, which is the promotion
// the rubric says the measurement is supposed to gate. The Encounter is cloned
// rather than mutated, so one process could measure several decks.
const DECK = flagValue('--deck')
const evaluationCatalog = (() => {
  if (DECK === undefined) {
    return catalog
  }
  const deck = catalog.decks[DECK]
  if (!deck) {
    throw new Error(`Unknown evaluation deck ${DECK}; authored decks are ${Object.keys(catalog.decks).join(', ')}`)
  }
  if (deck.encounter !== ENCOUNTER_ID) {
    throw new Error(`Evaluation deck ${DECK} is written for ${deck.encounter}, not ${ENCOUNTER_ID}`)
  }
  const variant = structuredClone(catalog)
  variant.encounters[ENCOUNTER_ID].player_deck = deck.player_deck.map((entry) => ({ ...entry }))
  return variant
})()

interface PolicyKnobs {
  // `turtle` is the survival-biased plan (ADR 0027): Iron Guard in the Quick
  // Window, Fortify in the Slow Window, no offense at all. Its job is to reach
  // the Encounter Clock so Escalation — not attrition — is what ends the run,
  // which is the only way the solo slice can measure the enrage wall.
  // `culler` is the Whelp-answering plan (D-036): Sweeping Blow in the Quick
  // Window, Iron Guard in the Slow. It exists because Brood Call's Escalation
  // penalty is only measurable against a policy that can actually pay it —
  // without one, pricing the demand just measures an unavoidable tick.
  // `shover` is Drive Back plus Fortify: the plan that answers the cone by
  // moving the Boss instead of the Hero. It was once a matched pair,
  // `forecast_reader` and `forecast_blind`, differing only in whether the
  // policy consulted the Forecast Row — the instrument that made ADR 0026's
  // third horizon falsifiable. It returned a verdict (identical outcomes to two
  // decimal places), the row was removed on that evidence (ADR 0031), and the
  // pair collapsed into the one plan that remains worth sweeping.
  // `banker` is the turtle's engine with one difference: it rides the
  // Signature to its full Charge cap before firing (D-064 decision 13). It is
  // built on turtle because the cohort's first run showed only Fortify's
  // banked Armor can produce the zero-loss Instant-row block the standing
  // clause reads — Iron Guard's Armor lands in the Quick Window, after the
  // Tank Hit — so an offense plan never earns and would measure nothing.
  // Without this plan, Sundered uptime — the number the ruling told the
  // cohort to watch — would be structurally zero in every row.
  //
  // `reactive_quench` is `dual_steady`'s slot plan until the Counter it answers
  // is standing at its cap, and `quencher`'s for exactly as long as it is. The
  // pair exists because the fixed plans bracket a decision rather than making
  // one: `dual_steady` never plays the answer now sitting in its deck, and
  // `quencher` gives up a Steady Strike slot every Round whether or not there
  // is anything to cool. Neither is how the card would be played, and the gap
  // between them is the whole value of the card.
  slotPlan: 'dual_steady' | 'sword_shield' | 'turtle' | 'culler' | 'shover' | 'quencher' | 'banker' | 'reactive_quench'
  // Where the Tank stands. `far` parks at distance 3+, out of the Cinder
  // Breath cone; `dodge` steps off telegraphed hexes; `stay` holds the Guarded
  // Front.
  //
  // `far` changed meaning under D-073 and its rows should be read with that in
  // mind: every card now carries a reach, so a policy parked at distance 3
  // cannot land a single point of Boss damage — its `bossDmg` column is `0.00`
  // by construction and its `rejected` column counts the shots it keeps trying
  // to take. That is the measurement, not a broken policy: `far` is kept
  // precisely so the sweep keeps showing what camping now costs. Before D-073
  // the same rows read 16.6 (`dual_steady/far`), 14.1 (`reactive_quench/far`)
  // and 11.0 (`sword_shield/far`).
  position: 'far' | 'dodge' | 'stay'
  spike: boolean
}

// The Counter Quench answers and the stack that makes it worth answering, read
// off the content rather than named here. A harness that hardcodes `heat` and
// `2` stops measuring the card the moment either is retuned, and would go on
// reporting numbers as though it still were.
const QUENCH_COUNTER = catalog.cards.quench.reads.find((reader) => reader.verb === 'spend')?.counter ?? ''
const QUENCH_THRESHOLD = catalog.counters[QUENCH_COUNTER]?.max ?? 0

// Every Counter a priced `place_counter` Beat places, which is exactly the set
// `peakCtr` is a diagnostic about. Naming the set matters: an earlier version
// measured the peak of every Counter but Riposte, which meant a `turtle` run
// reported `5.20` off its own Fortified stack while the Counter the demand
// actually prices sat at 2 — a column that answered a different question than
// its own comment claimed, which is the failure it exists to catch.
const PRICED_COUNTERS = new Set(
  Object.values(catalog.programs)
    .flatMap((program) => [...program.instant_beats, ...program.incoming_beats])
    .filter((beat) => beat.kind === 'place_counter' && beat.escalation_if_unanswered > 0)
    .map((beat) => beat.counter),
)

const MOVE_FUEL_ORDER = ['grow_presence', 'anchor_presence', 'gather_strength', 'fortify', 'sweeping_blow', 'strike_hex', 'iron_guard']
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
  signatureGranted: number
  signatureWasted: number
  signatureFiredFull: number
  signatureFiredEarly: number
  sunderedPlaced: number
  rejected: number
  minionsKilled: number
  burntHexes: number
  peakPricedCounter: number
  countersSpent: number
  // D-079's replacement for the binary reduced-Party red flag ADR 0036 wrote.
  // A Party that lost somebody in the final Round and won anyway is a good
  // fight; what D-016 actually asks is whether the absent Hero mattered, which
  // is a dose rather than an end-state.
  heroRoundsLost: number
  // The fallback ADR 0039 left unpriced on purpose. `selectBeatTarget` aims a
  // Role-selected Beat at seat 0 when no living Hero plays that Role — a rule
  // written for a party that is off-composition before Round 1, which now
  // fires every time somebody falls. Counted so the tuning decision has
  // numbers under it rather than an argument.
  selectorFellBack: number
}

// Same policy shape as generateScenarios.ts, instrumented for metrics instead
// of step capture. Kept self-contained so the committed-scenario generator
// stays untouched.
function simulate(seed: number, knobs: PolicyKnobs): RunMetrics {
  let state: EncounterState = createEncounterState(evaluationCatalog, ENCOUNTER_ID, seed)
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
    shover: { 0: 'drive_back', 1: 'fortify' },
    // A plan per card the sweep needs to exercise. Without one, a new card is
    // never loaded and the sweep measures deck dilution rather than the card:
    // Quench's first run cost 22% of Boss damage purely because two Steady
    // Strike left the deck and nothing played what replaced them.
    quencher: { 0: 'quench', 1: 'iron_guard' },
    banker: { 0: 'iron_guard', 1: 'fortify' },
    // Placeholder: `reactive_quench` picks between this and `quencher` per
    // call, and never reads this entry.
    reactive_quench: { 0: 'steady_strike', 1: 'iron_guard' },
  }

  // Asked fresh every time rather than fixed for the run, because a reactive
  // plan is a different plan on different Rounds. Every other plan returns the
  // same record it always did.
  //
  // The swap lands a Round late by construction, and that is the decision being
  // measured, not a flaw in the script. Stoke the Forge banks the cap in the
  // Instant Row, after the Loadout Window has closed, and a Slot already
  // holding a card cannot be swapped outside Loadout — so a party that did not
  // pre-load Quench on a hunch pays one Round-end bill and answers on the next
  // Loadout. Pay once, then clear it.
  const wanted = (): Record<number, string> => {
    if (knobs.slotPlan !== 'reactive_quench') {
      return WANTED_BY_PLAN[knobs.slotPlan]
    }
    const standing = QUENCH_COUNTER !== '' && counterCount(state, combatantRef(state.bossId), QUENCH_COUNTER) >= QUENCH_THRESHOLD
    return standing ? WANTED_BY_PLAN.quencher : WANTED_BY_PLAN.dual_steady
  }
  const hand = () => state.heroes[heroId].hand
  const slot = (index: number) => state.heroes[heroId].actionBar[index]

  const moveFuel = (): CardInstance | undefined => {
    const plan = wanted()
    const wantedIds = new Set(Object.values(plan))
    const spare = hand().filter((card) => {
      if (!wantedIds.has(card.cardId)) {
        return true
      }
      const copiesWanted = [0, 1].filter((index) => slot(index).topCard === null && plan[index] === card.cardId).length
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
    const plan = wanted()
    for (const slotIndex of [0, 1]) {
      if (slot(slotIndex).topCard?.cardId === plan[slotIndex]) {
        continue
      }
      if (slot(slotIndex).topCard !== null && state.phase !== 'loadout') {
        continue
      }
      const inHand = hand().find((card) => card.cardId === plan[slotIndex])
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
    const wantedIds = new Set(Object.values(wanted()))
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
      // A Card that reads Counters needs the piece it reads them on, and the
      // engine already knows which pieces are legal — so ask it rather than
      // re-deriving the rule here, which is how a harness drifts from the
      // rules it is measuring. The Boss is preferred because it is the piece
      // a Counter-reading Card is written against; a Minion is the fallback.
      // Gated on `reads` so every existing Card keeps its existing path and
      // the baseline is untouched.
      if (card.reads.length > 0) {
        const legal = fireTargeting(catalog, state, heroId, slotIndex).legalTargetIds
        const pick = legal.includes(state.bossId) ? state.bossId : legal[0]
        if (pick !== undefined) {
          submit({ kind: 'fire_slot', sourceId: heroId, slotIndex, targetId: pick })
        }
        continue
      }
      submit({ kind: 'fire_slot', sourceId: heroId, slotIndex })
    }
  }

  // The Signature Slot (D-064): fire it in the Quick Window whenever it holds
  // an earned Charge. Cash-at-one is the measured floor of the banking
  // decision — the ceiling is a hand-reading line no fixed script can walk,
  // the same limit the Slow-window comment below records for Fortify.
  const fireSignature = () => {
    state.heroes[heroId].actionBar.forEach((slotState, slotIndex) => {
      if (!slotState.fixed || slotState.earnedCharges === 0) {
        return
      }
      // The banker holds for the full-bank rider; everyone else cashes at one.
      if (knobs.slotPlan === 'banker' && slotState.topCard !== null && slotState.earnedCharges < cardChargeCap(catalog.cards[slotState.topCard.cardId])) {
        return
      }
      submit({ kind: 'fire_slot', sourceId: heroId, slotIndex })
    })
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
        fireSignature()
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
        // Whether that spend is worth it depends on what next Round opens
        // with, and with the Forecast Row gone (ADR 0031) no policy here can
        // know: a program wanting `Mitigate` opens with a Raking Claw that
        // banked Armor answers, while Ember and Ashfall deal their damage
        // through a dodgeable cone where the same cards were worth more in hand
        // as move fuel. A human learns which is which by meeting them. A fixed
        // script cannot, so these policies simply always spend — the sweep
        // measures the floor of that decision, never its ceiling.
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

  // Metric extraction from the recorded facts. The Signature replaces the
  // Riposte Ready Counter (D-064): grants and overcap waste ride the
  // signature_event on damage facts, fires are the fire_slot facts that
  // spent Charges, and the full-bank rider is the Sundered placement.
  let signatureGranted = 0
  let signatureWasted = 0
  let signatureFiredFull = 0
  let signatureFiredEarly = 0
  let sunderedPlaced = 0
  let rejected = 0
  const signatureCap = 2
  for (const fact of facts) {
    if (!fact.succeeded) {
      rejected += 1
      continue
    }
    const rf = fact.resolutionFact as Record<string, unknown> | undefined
    const signatureEvent = readSignatureEvent(rf)
    if (signatureEvent?.event === 'charge_granted') {
      signatureGranted += 1
    }
    if (signatureEvent?.event === 'wasted') {
      signatureWasted += 1
    }
    if (fact.kind === 'fire_slot' && typeof fact.detail.spentSignatureCharges === 'number') {
      if (fact.detail.spentSignatureCharges >= signatureCap) {
        signatureFiredFull += 1
      } else if (fact.detail.spentSignatureCharges > 0) {
        signatureFiredEarly += 1
      }
    }
    const counterEvent = readCounterEvent(rf)
    if (counterEvent?.counterId === 'sundered' && counterEvent.event === 'placed') {
      sunderedPlaced += 1
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

  // The highest a priced Counter ever got, across the whole run. A Counter
  // demand is priced at the cap (ADR 0027), so this is the reading that says
  // whether that price is reachable at all: if a run this long can never stack
  // past 2 on a Counter capped at 4, the demand is authored but dead, and every
  // aggregate downstream of it would show "no change" for a reason that has
  // nothing to do with whether the mechanic works.
  let peakPricedCounter = 0
  for (const fact of facts) {
    if (!fact.succeeded) {
      continue
    }
    const event = readCounterEvent(fact.resolutionFact as Record<string, unknown> | undefined)
    if (event !== null && PRICED_COUNTERS.has(event.counterId) && event.count > peakPricedCounter) {
      peakPricedCounter = event.count
    }
  }

  // Counters the party actually drew off through a Card's `spend` reader,
  // summed — Riposte's consumption runs a different path and is reported by its
  // own columns. `reactive_quench` is a policy
  // that can silently decline to react — a swap that never fires reads exactly
  // like `dual_steady` in every other column, which is how a dead instrument
  // gets mistaken for a null result. This is the column that tells them apart.
  let countersSpent = 0
  for (const fact of facts) {
    if (!fact.succeeded) {
      continue
    }
    for (const spend of (fact.detail.spentCounters as { amount?: number }[] | undefined) ?? []) {
      countersSpent += spend.amount ?? 0
    }
  }

  let selectorFellBack = 0
  for (const fact of facts) {
    if ((fact.resolutionFact as Record<string, unknown> | undefined)?.target_selector_fell_back === true) {
      selectorFellBack += 1
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
    signatureGranted,
    signatureWasted,
    signatureFiredFull,
    signatureFiredEarly,
    sunderedPlaced,
    rejected,
    minionsKilled,
    burntHexes,
    peakPricedCounter,
    countersSpent,
    heroRoundsLost: heroRoundsLost(state),
    selectorFellBack,
  }
}

// ——— Sweep ———
const variants: PolicyKnobs[] = []
if (POLICY) {
  const [slotPlan, position, spike] = POLICY.split(',')
  variants.push({ slotPlan: slotPlan as PolicyKnobs['slotPlan'], position: position as PolicyKnobs['position'], spike: spike === 'true' })
} else {
  for (const slotPlan of ['dual_steady', 'sword_shield', 'turtle', 'culler', 'shover', 'quencher', 'banker', 'reactive_quench'] as const) {
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
  // D-016's other half, as D-074 restates it. ADR 0036 extended the solo red
  // flag to any reduced-Party victory, which fires on a Party that lost
  // somebody in the last Round and won anyway — a good fight, flagged as a
  // decorative Hero. The dose is the question: a win carrying several
  // Hero-Rounds on the floor says the absent Hero was not load-bearing.
  const shortHandedWins = runs.filter((run) => run.outcome === 'victory' && run.heroRoundsLost >= 2)
  if (shortHandedWins.length > 0) {
    redFlags.push(
      `${label}: ${shortHandedWins.length} victories with 2+ Hero-Rounds lost — the absent Hero may be decorative (D-016, D-079)`,
    )
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
    peakCtr: avg((run) => run.peakPricedCounter),
    heroRdsLost: avg((run) => run.heroRoundsLost),
    fellBack: avg((run) => run.selectorFellBack),
    ctrSpent: avg((run) => run.countersSpent),
    burnt: avg((run) => run.burntHexes),
    bossDmg: avg((run) => run.bossDamage),
    dmgSpread: spread((run) => run.bossDamage),
    sigGrant: avg((run) => run.signatureGranted),
    sigWaste: avg((run) => run.signatureWasted),
    sigFull: avg((run) => run.signatureFiredFull),
    sigEarly: avg((run) => run.signatureFiredEarly),
    sundered: avg((run) => run.sunderedPlaced),
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
    redFlags.push('Boss Program order is fully predictable: there is nothing left to learn by playing it twice (ADR 0028, ADR 0031).')
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
