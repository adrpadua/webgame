import { addEntity, createBoard } from './board'
import { FACING_NE, FACING_SW } from './facing'
import { escalationStartRound } from './escalation'
import { createRng, shuffle } from './rng'
import { checkResolution } from './resolve'
import { buildProgramSequence, refreshTelegraphs } from './timeline'
import type { ContentCatalog } from './content/catalog'
import type { CardInstance, EncounterState, HeroState, SlotState } from './types'

// Builds the seeded initial Encounter state from an authored encounter
// definition, mirroring the reference start().
export function createEncounterState(catalog: ContentCatalog, encounterId: string, seedOverride?: number): EncounterState {
  const encounter = catalog.encounters[encounterId]
  if (!encounter) {
    throw new Error(`Unknown encounter: ${encounterId}`)
  }
  // The Party's first seat is the primary Hero: the one the Hero Frame reads
  // (ADR 0033) and the one a solo Scenario replays. The catalog has already
  // validated every seat's reference.
  const primarySeat = encounter.party[0]
  const state: EncounterState = {
    encounterId,
    phase: 'loadout',
    round: 1,
    roundLimit: Math.max(encounter.round_limit, 1),
    escalation: 0,
    escalationStartRound: escalationStartRound(Math.max(encounter.round_limit, 1)),
    escalationThresholds: encounter.escalation_thresholds.map((threshold) => ({ ...threshold })),
    active: true,
    outcome: 'ongoing',
    outcomeReason: '',
    enrageText: encounter.enrage_text,
    board: createBoard(encounter.board_radius),
    heroes: {},
    counters: {},
    bossId: encounter.boss_id,
    primaryHeroId: primarySeat.hero,
    partyHeroIds: encounter.party.map((seat) => seat.hero),
    programIds: [...encounter.boss_programs],
    loopPrograms: encounter.loop_boss_programs,
    // Filled in below: the sequences need the rng, which this literal is still
    // building.
    programSequence: [],
    programIndex: 0,
    currentProgramId: encounter.boss_programs[0] ?? null,
    bossPhase: 1,
    phaseTrigger:
      encounter.phase_trigger && encounter.phase_two_programs.length > 0
        ? {
            bossHealthAtOrBelow: encounter.phase_trigger.boss_health_at_or_below ?? null,
            roundAtOrAfter: encounter.phase_trigger.round_at_or_after ?? null,
          }
        : null,
    phaseTwoProgramIds: [...encounter.phase_two_programs],
    phaseTwoSequence: [],
    phaseBreakText: encounter.phase_break_text,
    spawnCandidates: encounter.minion_spawn_candidates.map((coords) => ({ ...coords })),
    telegraphedSpawnHexes: [],
    telegraphs: {},
    previousImpactedHexes: [],
    previousImpactAbsorbed: false,
    lastPattern: [],
    minionSequence: 0,
    cardInstanceSequence: 0,
    rng: createRng(seedOverride ?? encounter.random_seed),
  }
  // The Boss's script is set before the party's deck is: both phases' program
  // orders are rolled here, at setup, so nothing about the Boss's plan is
  // undecided once a window is open (ADR 0025). A non-looping encounter runs
  // its pool once, so its sequence is exactly the pool length.
  const sequenceLength = encounter.loop_boss_programs ? state.roundLimit + 1 : encounter.boss_programs.length
  state.programSequence = buildProgramSequence(state.rng, state.programIds, sequenceLength, 'boss_program_order')
  state.phaseTwoSequence = buildProgramSequence(
    state.rng,
    state.phaseTwoProgramIds,
    encounter.loop_boss_programs ? state.roundLimit + 1 : state.phaseTwoProgramIds.length,
    'phase_two_program_order',
  )
  state.currentProgramId = state.programSequence[0] ?? null
  addEntity(state.board, encounter.boss_id, 'boss', encounter.boss_start, encounter.boss_health, FACING_SW, 'enemy', encounter.boss_title)
  // Each seat becomes a board entity and a HeroState, in authored order. The
  // deck is dealt per Hero from the Encounter's one authored list: with a
  // single authored deck, every seat draws its own shuffled copy rather than
  // sharing one pile, because a shared deck would make one Hero's draw the
  // other's loss — a coupling no rule asks for. A per-seat authored deck is
  // the increment that arrives with the second authored Hero.
  for (const seat of encounter.party) {
    const heroDefinition = catalog.heroes[seat.hero]
    if (!heroDefinition) {
      throw new Error(`Encounter ${encounterId} fields unknown hero ${seat.hero}`)
    }
    addEntity(state.board, seat.hero, 'hero', seat.start, heroDefinition.max_health, FACING_NE, 'party', heroDefinition.title)
    const deck: CardInstance[] = []
    for (const entry of seat.deck.length > 0 ? seat.deck : encounter.player_deck) {
      for (let copy = 0; copy < entry.copies; copy += 1) {
        state.cardInstanceSequence += 1
        deck.push({ instanceId: `${entry.card}_${state.cardInstanceSequence}`, cardId: entry.card })
      }
    }
    const actionBar: SlotState[] = []
    for (let index = 0; index < encounter.slot_count; index += 1) {
      actionBar.push({ topCard: null, charges: [], activatedWindow: null, placedThisLoadout: false, fixed: false, earnedCharges: 0 })
    }
    // The Signature Slot (D-064, ADR 0032): installed at setup, after the
    // replaceable Slots, with the Hero's fixed card as a Top Card that was
    // never in the deck and never leaves. It starts uncharged — every Charge
    // it will ever hold is earned through its standing clause in play.
    const signatureCard = seat.fields_signature ? heroDefinition.signature_card : ''
    if (signatureCard !== '') {
      state.cardInstanceSequence += 1
      actionBar.push({
        topCard: { instanceId: `${signatureCard}_${state.cardInstanceSequence}`, cardId: signatureCard },
        charges: [],
        activatedWindow: null,
        placedThisLoadout: false,
        fixed: true,
        earnedCharges: 0,
      })
    }
    const hero: HeroState = {
      id: seat.hero,
      health: heroDefinition.max_health,
      maxHealth: heroDefinition.max_health,
      armor: 0,
      deck,
      hand: [],
      discard: [],
      refillTarget: Math.max(encounter.hand_refill_target, 1),
      actionBar,
    }
    state.heroes[hero.id] = hero
    shuffle(state.rng, hero.deck, 'initial_deck_shuffle')
    drawUntilRefill(state, hero.id)
  }
  refreshTelegraphs(catalog, state)
  checkResolution(state)
  return state
}

function drawUntilRefill(state: EncounterState, heroId: string): void {
  const hero = state.heroes[heroId]
  while (hero.hand.length < hero.refillTarget) {
    if (hero.deck.length === 0) {
      if (hero.discard.length === 0) {
        break
      }
      hero.deck = hero.discard
      hero.discard = []
      shuffle(state.rng, hero.deck, 'discard_shuffle')
    }
    hero.hand.push(hero.deck.pop() as CardInstance)
  }
}
