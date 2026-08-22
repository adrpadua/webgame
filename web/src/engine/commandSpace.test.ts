import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import {
  ENCOUNTER_SOURCE,
  ENUMERATED_COMMAND_KINDS,
  PLAYER_COMMAND_KINDS,
  combatantRef,
  createEncounterState,
  isPlayerCommand,
  legalActions,
  legality,
  resolve,
  resolvePlayerCommand,
  scenarioStepSchema,
  type EncounterState,
  type PlayerCommandKind,
  type SystemActionInput,
} from '@/engine'

// The player command space (engine-hardening handoff, Priorities 1 and 2).
// One declared vocabulary — PLAYER_COMMAND_KINDS — and three surfaces that
// must track it: the Scenario schema (the external command seam), the
// legalActions enumeration (the complete action space the UI, AI, hints, and
// simulation all read), and the resolver's own union. These tests are the
// guards that keep a new command from being added to one surface and
// forgotten on another, the same discipline the event registry applies to
// authored `when`s.

const catalog = loadCatalog()
const DUO = 'embermaw_attrition_trial'

function duo(): EncounterState {
  return createEncounterState(catalog, DUO)
}

function kindsFor(state: EncounterState, heroId: string): Set<string> {
  return new Set(legalActions(catalog, state, heroId).map((action) => action.kind))
}

describe('the declared command vocabulary', () => {
  it('legalActions considers exactly the player command kinds', () => {
    expect([...ENUMERATED_COMMAND_KINDS].sort()).toEqual([...PLAYER_COMMAND_KINDS].sort())
  })

  it('the Scenario schema carries every player command and refuses every system action', () => {
    // The carry half is a module-load guard in schemas.ts; the refusal half
    // is what "a client cannot author consequences" means at the seam.
    for (const kind of PLAYER_COMMAND_KINDS) {
      expect(() => scenarioStepSchema.parse({ action: { kind, sourceId: 'elian' } })).not.toThrow(/Invalid discriminator/)
    }
    const forged = { action: { kind: 'damage', sourceId: 'elian', targetId: 'embermaw', amount: 99, reasonText: 'forged' } }
    expect(() => scenarioStepSchema.parse(forged)).toThrow()
    expect(isPlayerCommand(forged.action as never)).toBe(false)
  })
})

describe('the complete player action space', () => {
  // One state per command kind in which it must appear, plus the state in
  // which it must be gone. `fire_slot` and the Slot verbs are exercised by
  // staging rather than play — the enumeration is what is under test.
  function statesWhereLegal(): Array<{ label: string; state: EncounterState; heroId: string; expects: PlayerCommandKind[] }> {
    const loadout = duo()

    const quick = duo()
    quick.phase = 'quick'

    const firing = duo()
    firing.phase = 'quick'
    const firingHero = firing.heroes[firing.primaryHeroId]
    const quickCard = firingHero.deck.concat(firingHero.hand).find((card) => catalog.cards[card.cardId].speed === 'quick')!
    firingHero.actionBar[0] = {
      topCard: quickCard,
      charges: [firingHero.hand[0]],
      activatedWindow: null,
      placedThisLoadout: false,
      fixed: false,
      earnedCharges: 0,
    }

    const rescue = duo()
    const [rescuerId, fallenId] = rescue.partyHeroIds
    rescue.heroes[fallenId].status = 'downed'
    rescue.heroes[fallenId].downedRound = rescue.round
    rescue.board.entities[fallenId].coords = { ...rescue.board.entities[rescuerId].coords, r: rescue.board.entities[rescuerId].coords.r + 1 }

    const diminished = duo()
    const incapacitatedId = diminished.partyHeroIds[0]
    diminished.heroes[incapacitatedId].status = 'incapacitated'
    diminished.heroes[incapacitatedId].hand = []
    diminished.heroes[incapacitatedId].deck = []
    delete diminished.board.entities[incapacitatedId]

    return [
      { label: 'loadout', state: loadout, heroId: loadout.primaryHeroId, expects: ['load_slot'] },
      // Stamina is the Quick Window's currency, so the bare discard is
      // Quick-gated too — it belongs to this row, not to Loadout.
      { label: 'quick', state: quick, heroId: quick.primaryHeroId, expects: ['move_hero', 'discard_for_stamina'] },
      // Charging needs an occupied Slot, so it shares the staged row with fire.
      { label: 'charged quick slot', state: firing, heroId: firing.primaryHeroId, expects: ['fire_slot', 'charge_slot'] },
      { label: 'adjacent downed ally', state: rescue, heroId: rescuerId, expects: ['revive_ally'] },
      { label: 'incapacitated hero', state: diminished, heroId: incapacitatedId, expects: ['diminished_action'] },
    ]
  }

  it('every player command kind appears in some representative state, and every enumerated action passes legality', () => {
    const seen = new Set<string>()
    for (const { label, state, heroId, expects } of statesWhereLegal()) {
      const actions = legalActions(catalog, state, heroId)
      for (const expected of expects) {
        expect(actions.map((action) => action.kind), label).toContain(expected)
        seen.add(expected)
      }
      for (const action of actions) {
        const verdict = legality(catalog, state, action)
        expect(verdict.legal, `${label}: ${action.kind} enumerated but illegal — ${verdict.reason}`).toBe(true)
        expect(isPlayerCommand(action), `${label}: ${action.kind} enumerated but not a player command`).toBe(true)
      }
    }
    expect([...seen].sort()).toEqual([...PLAYER_COMMAND_KINDS].sort())
  })

  it('card-consuming commands enumerate every payment alternative, never a representative', () => {
    // The payment dimension of completeness (engine-hardening follow-up P1):
    // discarding card A and discarding card B leave different hands, so both
    // are moves. Every payment-taking command must offer the whole hand, and
    // movement must offer it per destination.
    const state = duo()
    state.phase = 'quick'
    const heroId = state.primaryHeroId
    const handIds = state.heroes[heroId].hand.map((card) => card.instanceId).sort()
    expect(handIds.length).toBeGreaterThan(1)
    const actions = legalActions(catalog, state, heroId)

    const discards = actions.filter((action) => action.kind === 'discard_for_stamina').map((action) => action.cardInstanceId)
    expect(discards.sort()).toEqual(handIds)

    const paymentsByDestination = new Map<string, string[]>()
    for (const action of actions) {
      if (action.kind !== 'move_hero') {
        continue
      }
      const key = `${action.destination.q},${action.destination.r}`
      paymentsByDestination.set(key, [...(paymentsByDestination.get(key) ?? []), action.cardInstanceId])
    }
    expect(paymentsByDestination.size).toBeGreaterThan(0)
    for (const [destination, payments] of paymentsByDestination) {
      expect(payments.sort(), `destination ${destination}`).toEqual(handIds)
    }
  })

  it('the rescue offers every card in hand as its payment', () => {
    const rescue = duo()
    const [rescuerId, fallenId] = rescue.partyHeroIds
    rescue.heroes[fallenId].status = 'downed'
    rescue.heroes[fallenId].downedRound = rescue.round
    rescue.board.entities[fallenId].coords = { ...rescue.board.entities[rescuerId].coords, r: rescue.board.entities[rescuerId].coords.r + 1 }
    const handIds = rescue.heroes[rescuerId].hand.map((card) => card.instanceId).sort()
    expect(handIds.length).toBeGreaterThan(1)
    const revives = legalActions(catalog, rescue, rescuerId).filter((action) => action.kind === 'revive_ally')
    expect(revives.map((action) => action.cardInstanceId).sort()).toEqual(handIds)
    expect(new Set(revives.map((action) => action.targetId))).toEqual(new Set([fallenId]))
  })

  it('commands disappear when their conditions do', () => {
    // No Downed ally: no rescue. Living hero: no diminished vocabulary.
    // Loadout: no movement. An ended Encounter: nothing at all.
    const start = duo()
    const kinds = kindsFor(start, start.primaryHeroId)
    expect(kinds.has('revive_ally')).toBe(false)
    expect(kinds.has('diminished_action')).toBe(false)
    expect(kinds.has('move_hero')).toBe(false)

    const ended = duo()
    ended.active = false
    expect(legalActions(catalog, ended, ended.primaryHeroId)).toEqual([])
  })

  it('the diminished vocabulary aims its ally-facing choices and needs no target for the Escalation one', () => {
    const state = duo()
    const [incapacitatedId, allyId] = state.partyHeroIds
    state.heroes[incapacitatedId].status = 'incapacitated'
    state.heroes[incapacitatedId].hand = []
    state.heroes[incapacitatedId].deck = []
    delete state.board.entities[incapacitatedId]
    const diminished = legalActions(catalog, state, incapacitatedId).filter((action) => action.kind === 'diminished_action')
    expect(diminished).toEqual([
      { kind: 'diminished_action', sourceId: incapacitatedId, action: 'grant_ally_armor', targetId: allyId },
      { kind: 'diminished_action', sourceId: incapacitatedId, action: 'ally_draws_card', targetId: allyId },
      { kind: 'diminished_action', sourceId: incapacitatedId, action: 'reduce_escalation', targetId: undefined },
    ])
  })
})

describe('the runtime trust boundary (engine-hardening issue 04)', () => {
  // The type split erases at runtime; `resolvePlayerCommand` is the one
  // entry point that validates a payload's whole shape and structurally
  // cannot admit a System Action. Malformed input is refused with no fact —
  // the action never existed. A well-formed but illegal command is admitted
  // and refused by legality WITH a fact, exactly as from a trusted caller.

  it('refuses every system-action kind at the boundary, kind by kind', () => {
    const beat = catalog.programs.embermaw_hunt.instant_beats[0]
    // A mapped type over the system-action union: a new system kind cannot
    // ship without an explicit row here, mirroring the enumeration guards.
    const SYSTEM_PAYLOADS: { [K in SystemActionInput['kind']]: Extract<SystemActionInput, { kind: K }> } = {
      displace_piece: { kind: 'displace_piece', sourceId: 'elian', targetId: 'embermaw', distance: 1, movement: 'push', reasonText: 'forged' },
      traverse_piece: { kind: 'traverse_piece', sourceId: 'embermaw', path: [], traversal: 'walk', reasonText: 'forged' },
      resolve_boss: { kind: 'resolve_boss', sourceId: 'embermaw', beat, track: 'instant' },
      apply_hazard: { kind: 'apply_hazard', sourceId: 'embermaw', coords: { q: 0, r: 0 }, hazardId: null, fallbackDurationRounds: 1 },
      spawn_minion: { kind: 'spawn_minion', sourceId: 'embermaw', minionId: 'forged_whelp', coords: { q: 1, r: 1 } },
      detonate_minion: { kind: 'detonate_minion', sourceId: 'forged_whelp' },
      damage: { kind: 'damage', sourceId: 'elian', targetId: 'embermaw', amount: 99, reasonText: 'forged' },
      incapacitate_hero: { kind: 'incapacitate_hero', sourceId: 'elian' },
      place_counter: { kind: 'place_counter', sourceId: 'embermaw', hostRef: combatantRef('elian'), counterId: 'seared', amount: 1, reasonText: 'forged' },
      advance_phase: { kind: 'advance_phase', sourceId: ENCOUNTER_SOURCE, fromPhase: 'loadout', toPhase: 'instant', round: 1 },
      round_start: { kind: 'round_start', sourceId: ENCOUNTER_SOURCE, round: 2 },
      full_charge_cleanup: { kind: 'full_charge_cleanup', sourceId: 'elian', slotIndex: 0, window: 'quick' },
      draw_card: { kind: 'draw_card', sourceId: 'elian' },
      shuffle_deck: { kind: 'shuffle_deck', sourceId: 'elian', label: 'discard_shuffle' },
      gain_escalation: { kind: 'gain_escalation', sourceId: ENCOUNTER_SOURCE, amount: 5, reason: 'forged', beatId: '' },
      end_of_clock: { kind: 'end_of_clock', sourceId: ENCOUNTER_SOURCE, round: 9, reason: 'forged' },
    }
    const state = duo()
    for (const [kind, payload] of Object.entries(SYSTEM_PAYLOADS)) {
      const submission = resolvePlayerCommand(catalog, state, payload)
      expect(submission.accepted, `${kind} must be refused at the external boundary`).toBe(false)
    }
  })

  it('refuses malformed player payloads before legality is ever asked', () => {
    const state = duo()
    for (const payload of [
      null,
      42,
      'fire_slot',
      { kind: 'fire_slot' },
      { kind: 'load_slot', sourceId: 'elian', slotIndex: 'zero', cardInstanceId: 'x' },
      { kind: 'move_hero', sourceId: 'elian', cardInstanceId: 'x' },
      { kind: 'teleport_hero', sourceId: 'elian' },
    ]) {
      const submission = resolvePlayerCommand(catalog, state, payload)
      expect(submission.accepted, JSON.stringify(payload)).toBe(false)
    }
  })

  it('admits a well-formed but illegal command, and legality refuses it on the record', () => {
    // Movement in Loadout: the shape is a player command, so the boundary is
    // not the one to say no — the refusal is legality's, recorded as a fact.
    const submission = resolvePlayerCommand(catalog, duo(), {
      kind: 'move_hero',
      sourceId: 'elian',
      destination: { q: 0, r: 1 },
      cardInstanceId: 'nope',
    })
    expect(submission.accepted).toBe(true)
    if (submission.accepted) {
      expect(submission.result.facts[0].succeeded).toBe(false)
      expect(submission.result.facts[0].reason).not.toBe('')
    }
  })

  it('resolves an accepted command identically to the trusted seam, with forged keys stripped', () => {
    const start = duo()
    const hero = start.heroes[start.primaryHeroId]
    const submission = resolvePlayerCommand(catalog, start, {
      kind: 'load_slot',
      sourceId: hero.id,
      slotIndex: 1,
      cardInstanceId: hero.hand[0].instanceId,
      forged_field: 'ignored',
    })
    expect(submission.accepted).toBe(true)
    if (submission.accepted) {
      expect('forged_field' in submission.action).toBe(false)
      const trusted = resolve(catalog, start, submission.action)
      expect(submission.result.facts).toEqual(trusted.facts)
      expect(submission.result.state).toEqual(trusted.state)
    }
  })
})
