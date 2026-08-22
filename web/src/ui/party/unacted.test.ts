import { beforeEach, describe, expect, it } from 'vitest'
import { advancePhase, buildCatalog, createEncounterState, type ContentCatalog, type EncounterState } from '@/engine'
import { catalog, selectPilotId, selectState, useWorkbench } from '@/store/workbench'
import { partyFrames } from './partyFrameModel'
import { heroActed, heroCanAct, nextNudge, unactedHeroIds } from './unacted'

// The unacted nudge (Total War's "a unit has not moved", on a Party rather
// than an army): who still owes the open window an action, which seat the rail
// hands the console to, and the rule that stops it nagging forever.
//
// Driven through the real store on the two-seat Brand trial, the way a player
// reaches it, because the answer is a reading of the session timeline — a
// hand-built state has no facts to read and would prove nothing about whether
// acting actually clears a nudge.

function store() {
  return useWorkbench.getState()
}

function state() {
  return selectState(store())
}

function unacted(): string[] {
  return unactedHeroIds(catalog, store())
}

function railTarget(): string | null {
  return nextNudge(catalog, store(), selectPilotId(store()), store().nudgedHeroIds)
}

function openTrialQuickWindow(): void {
  store().loadScenario('brand_trial_opening')
  while (state().phase !== 'quick') {
    store().advance()
  }
}

// Any committed action by the pilot: a hand card into an empty Slot, which is
// a `load_slot` — one of the five kinds that count as using a window.
function actAsPilot(): void {
  const pilotId = selectPilotId(store())
  const card = state().heroes[pilotId].hand[0]
  const slotIndex = state().heroes[pilotId].actionBar.findIndex((slot) => !slot.fixed && slot.topCard === null)
  store().cardDroppedOnSlot(card.instanceId, slotIndex)
}

describe('who still owes this window an action', () => {
  beforeEach(() => {
    openTrialQuickWindow()
    useWorkbench.setState({ controlledHeroId: null, nudgedHeroIds: [] })
  })

  it('names every seat that has not acted, and drops one the moment it does', () => {
    expect(unacted()).toEqual(['elian', 'maren'])
    actAsPilot()
    expect(unacted()).toEqual(['maren'])
  })

  it('points the rail at the ally, never at the pilot', () => {
    // The pilot's own unused window is the skip warning's job — their console
    // is the bottom half of the screen — so the rail offers the seat the
    // player is not looking at.
    expect(railTarget()).toBe('maren')
    store().switchControl('maren')
    expect(railTarget()).toBe('elian')
  })

  it('hands the console over on the press, and remembers the offer', () => {
    store().nudgeToUnacted('maren')
    expect(selectPilotId(store())).toBe('maren')
    expect(store().nudgedHeroIds).toEqual(['maren'])
  })

  it('offers each seat once, then becomes Next — the window can always be closed', () => {
    // Maren is offered and takes control without acting; Elian is
    // offered and takes control back. Both are still unacted — their frames
    // keep breathing — but the rail has let go, so the next press advances.
    store().nudgeToUnacted('maren')
    store().nudgeToUnacted('elian')
    expect(unacted()).toEqual(['elian', 'maren'])
    expect(railTarget()).toBeNull()
  })

  it('forgets the offers when the window closes', () => {
    store().nudgeToUnacted('maren')
    expect(store().nudgedHeroIds).toEqual(['maren'])
    store().advance()
    expect(store().nudgedHeroIds).toEqual([])
  })

  it('counts an action in the window it was taken in, not the Round', () => {
    actAsPilot()
    const pilotId = selectPilotId(store())
    expect(heroActed(store(), pilotId)).toBe(true)
    // The Quick Window closes into the Boss's Incoming Row, then the Slow
    // Window opens: the same Round, a new window, and the Hero owes it an
    // action again.
    while (state().phase !== 'slow') {
      store().advance()
    }
    expect(heroActed(store(), pilotId)).toBe(false)
  })

  it("nudges nobody in the Boss's own rows", () => {
    while (state().phase !== 'incoming') {
      store().advance()
    }
    expect(unacted()).toEqual([])
    expect(railTarget()).toBeNull()
  })

  it('nudges nobody who could not act anyway', () => {
    const live = state()
    const stranded = structuredClone(live)
    // No cards to spend and no Slot that could fire: the window holds nothing
    // for this Hero, and a frame that nudged would be asserting a move the
    // rules would refuse.
    stranded.heroes.maren.hand = []
    stranded.heroes.maren.actionBar = stranded.heroes.maren.actionBar.map((slot) => ({ ...slot, topCard: null, charges: [] }))
    expect(heroCanAct(catalog, stranded, 'maren')).toBe(false)
    expect(heroCanAct(catalog, live, 'maren')).toBe(true)
  })

  it('nudges nobody on the floor — a Downed ally is rescued, not switched to', () => {
    const downed = structuredClone(state())
    downed.heroes.maren.status = 'downed'
    expect(heroCanAct(catalog, downed, 'maren')).toBe(false)
  })
})

// The walk order, at the seat count that can tell two rules apart.
//
// Every authored Encounter seats at most two, and at two seats a scan from
// seat 0 and a walk forward from the pilot produce the same sequence — which
// is how the scan shipped. A three-seat playtest separated them: from seat 0,
// a scan offered seat 1, then seat 0 back (the pilot had moved, and seat 0 was
// still first in authored order), and only then seat 2. The player was handed
// a character they had just left before one they had never seen.
//
// Hand-built because no authored Encounter seats three, the same reason
// `partyFrames.test.ts` builds its own two-seat fixture rather than leaning on
// content that is tuned for other reasons.

const WALK_KEYWORDS = [
  { id: 'tank', title: 'Tank', kind: 'role' },
  { id: 'tank_hit', title: 'Tank Hit', kind: 'damage_type' },
  { id: 'raid_hit', title: 'Raid Hit', kind: 'damage_type' },
  { id: 'overflow', title: 'Overflow', kind: 'trait' },
]

function seatedCatalog(seats: string[]): ContentCatalog {
  return buildCatalog({
    cards: [{ id: 'strike', title: 'Strike', speed: 'quick', range_tiles: 9, boss_damage: 1, max_charge: 2, tags: ['tank'] }],
    heroes: seats.map((id) => ({ id, title: id.toUpperCase(), max_health: 20 })),
    keywords: WALK_KEYWORDS,
    counters: [],
    bosses: [{ id: 'walk_boss', title: 'Walk Boss', max_health: 200 }],
    chargeModifiers: [],
    hazards: [],
    minions: [],
    programs: [{ id: 'walk_program', title: 'Walk Program', instant_beats: [], incoming_beats: [] }],
    encounters: [
      {
        id: 'walk_party',
        title: 'Walk Party',
        party: seats.map((id, index) => ({ hero: id, start: { q: index - 1, r: 1 }, deck: [{ card: 'strike', copies: 8 }] })),
        boss: 'walk_boss',
        round_limit: 8,
        board_radius: 3,
        boss_start: { q: 0, r: -3 },
        slot_count: 2,
        hand_refill_target: 4,
        player_deck: [{ card: 'strike', copies: 8 }],
        boss_programs: ['walk_program'],
        random_seed: 3,
      },
    ],
  })
}

function quickWindow(catalogUnderTest: ContentCatalog): EncounterState {
  let state = createEncounterState(catalogUnderTest, 'walk_party', 3)
  while (state.phase !== 'quick') {
    state = advancePhase(catalogUnderTest, state).state
  }
  return state
}

// Press the rail until it becomes Next, recording who it handed over to. No
// seat acts, so the only thing that ends the cycle is the per-window offer cap.
function pressUntilNext(catalogUnderTest: ContentCatalog, state: EncounterState): string[] {
  const position = { entries: [{ label: '', step: null, state, facts: [] }], index: 0 }
  const offered: string[] = []
  let pilot = state.primaryHeroId
  for (let press = 0; press < 10; press += 1) {
    const target = nextNudge(catalogUnderTest, position, pilot, offered)
    if (target === null) {
      break
    }
    offered.push(target)
    pilot = target
  }
  return offered
}

describe('the walk order at three seats', () => {
  it('goes forward through the roster from the pilot, and returns to the starting seat last', () => {
    const seated = seatedCatalog(['alpha', 'bravo', 'charlie'])
    // Not ['bravo', 'alpha', 'charlie'] — that is the bounce, and it is what a
    // scan from seat 0 produces once the pilot has moved to seat 1.
    expect(pressUntilNext(seated, quickWindow(seated))).toEqual(['bravo', 'charlie', 'alpha'])
  })

  it('costs one press per seat, and the window can always be closed', () => {
    const seated = seatedCatalog(['alpha', 'bravo', 'charlie', 'delta'])
    // Four seats, nobody acting: four handovers and then Next. The cap is what
    // makes that a number rather than a loop.
    expect(pressUntilNext(seated, quickWindow(seated))).toEqual(['bravo', 'charlie', 'delta', 'alpha'])
  })

  it('is the same sequence at two seats, which is why the bounce shipped', () => {
    const seated = seatedCatalog(['alpha', 'bravo'])
    expect(pressUntilNext(seated, quickWindow(seated))).toEqual(['bravo', 'alpha'])
  })
})

// The pip and the rail name the same seat.
//
// Two seats could not tell these apart either: the only waiting ally was
// always the one the rail was pointing at, so "unacted" and "next" were one
// mark. At three they separate, and the frame model has to carry both — a pip
// that lit the first unacted seat would light the wrong frame from the second
// press onward, because the walk starts after the pilot and skips whoever has
// already been offered.
describe('which frame is next', () => {
  beforeEach(() => {
    openTrialQuickWindow()
    useWorkbench.setState({ controlledHeroId: null, nudgedHeroIds: [] })
  })

  function frameMarks(): [string, boolean, boolean][] {
    return partyFrames(catalog, state(), selectPilotId(store()), { unacted: unacted(), nextUp: railTarget() }).map((frame) => [
      frame.heroId,
      frame.unacted,
      frame.nextUp,
    ])
  }

  it('marks the seat the rail would hand over to, and only that one', () => {
    expect(frameMarks()).toEqual([['maren', true, true]])
  })

  it('drops the mark once the rail has let go, leaving the seat still waiting', () => {
    // Maren is offered and takes control without acting, then Elian takes it
    // back the same way. Both still owe the window an action — both pips stay —
    // but the rail has run out of offers, so no frame is next.
    store().nudgeToUnacted('maren')
    store().nudgeToUnacted('elian')
    expect(railTarget()).toBeNull()
    expect(frameMarks()).toEqual([['maren', true, false]])
  })

  it('never marks a seat that has already acted', () => {
    store().nudgeToUnacted('maren')
    actAsPilot()
    expect(frameMarks()).toEqual([['elian', true, true]])
  })
})
