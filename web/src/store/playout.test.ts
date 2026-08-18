import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BEAT_STAGGER_MS, EFFECT_SETTLE_MS, OUTCOME_REVEAL_MS, type PlayoutScript } from '@/board/effects'
import { usePlayout } from './playout'

// A three-beat Boss Row, stripped to what the director reads: the titles and
// the beat ids the HUD names moments by.
function script(): PlayoutScript {
  return {
    initial: {},
    endsEncounter: false,
    moments: [
      { beatId: 'turn_to_the_tank', beatTitle: 'Turn to the Tank', effects: [], gauges: {} },
      { beatId: 'raking_claw', beatTitle: 'Raking Claw', effects: [], gauges: {} },
      { beatId: 'ash_trail', beatTitle: 'Ash Trail', effects: [], gauges: {} },
    ],
  }
}

describe('playout director', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    usePlayout.getState().clear()
    vi.useRealTimers()
  })

  it('holds every unplayed spawn back from the state it opens with', () => {
    // Not "by the time it settles" — from the first state it publishes. Each
    // set here notifies the board, and a single frame in which nothing was
    // pending is a frame with the Whelps of an unplayed Brood Call standing
    // on their hexes. That frame is also where their sprites get made, so the
    // board then carries them through the whole Row that was still working up
    // to calling them.
    const spawning: PlayoutScript = {
      initial: {},
      endsEncounter: false,
      moments: [
        { beatId: 'within_reach', beatTitle: 'Within Reach', effects: [], gauges: {} },
        {
          beatId: 'brood_call',
          beatTitle: 'Brood Call',
          effects: [
            { kind: 'spawn', entityId: 'whelp_1', at: { q: -2, r: 1 }, tone: 'boss' },
            { kind: 'spawn', entityId: 'whelp_2', at: { q: 2, r: -1 }, tone: 'boss' },
          ],
          gauges: {},
        },
      ],
    }
    const seen: string[][] = []
    const unsubscribe = usePlayout.subscribe((store) => seen.push([...store.pendingSpawnIds]))
    usePlayout.getState().begin(spawning, false)
    unsubscribe()
    expect(seen.length).toBeGreaterThan(0)
    for (const published of seen) {
      expect([...published].sort()).toEqual(['whelp_1', 'whelp_2'])
    }
    // The beat before theirs plays and they are still held: it is their own
    // beat that puts them on the board, not the Row starting.
    usePlayout.getState().continuePlayout()
    expect(usePlayout.getState().pendingSpawnIds).toEqual(['whelp_1', 'whelp_2'])
    vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    usePlayout.getState().continuePlayout()
    expect(usePlayout.getState().pendingSpawnIds).toEqual([])
  })

  it('gives every beat its own press, the opening one included', () => {
    // momentSeq is the board's channel and counts across the session, so
    // what a batch fires is read as a delta, never an absolute.
    const before = usePlayout.getState().momentSeq
    usePlayout.getState().begin(script(), false)
    // The Row lands announced, not already swinging: nothing has played,
    // and the prompt offers the first beat.
    expect(usePlayout.getState().activeBeatId).toBeNull()
    expect(usePlayout.getState().awaitingContinue).toBe(true)
    expect(usePlayout.getState().nextBeatTitle).toBe('Turn to the Tank')
    // No moment fired, so the board is holding all three back.
    expect(usePlayout.getState().momentSeq).toBe(before)

    // Each press plays the beat the prompt named — the whole point: the
    // claw the player was promised is the claw that lands.
    for (const [played, promised] of [
      ['turn_to_the_tank', 'Raking Claw'],
      ['raking_claw', 'Ash Trail'],
    ]) {
      usePlayout.getState().continuePlayout()
      expect(usePlayout.getState().activeBeatId).toBe(played)
      expect(usePlayout.getState().awaitingContinue).toBe(false)
      vi.advanceTimersByTime(EFFECT_SETTLE_MS)
      expect(usePlayout.getState().awaitingContinue).toBe(true)
      expect(usePlayout.getState().nextBeatTitle).toBe(promised)
    }

    // The last moment has nothing left to offer and prompts for nothing: it
    // settles the playout instead.
    usePlayout.getState().continuePlayout()
    expect(usePlayout.getState().activeBeatId).toBe('ash_trail')
    expect(usePlayout.getState().nextBeatTitle).toBeNull()
    expect(usePlayout.getState().momentSeq).toBe(before + 3)
    vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    expect(usePlayout.getState().awaitingContinue).toBe(false)
    expect(usePlayout.getState().activeBeatId).toBeNull()
  })

  it('plays a beatless batch on landing rather than asking for a press', () => {
    // The player's own killing blow scripts one beatless moment: it is
    // immediate feedback for something they just did, not a Boss Beat to be
    // announced, so no prompt stands between them and it.
    const blow: PlayoutScript = {
      initial: {},
      endsEncounter: true,
      moments: [{ beatId: null, beatTitle: null, effects: [], gauges: {} }],
    }
    const before = usePlayout.getState().momentSeq
    usePlayout.getState().begin(blow, false)
    expect(usePlayout.getState().awaitingContinue).toBe(false)
    expect(usePlayout.getState().momentSeq).toBe(before + 1)
    expect(usePlayout.getState().outcomeHeld).toBe(true)
    // ...and the outcome reveal waits for that moment to finish. This batch
    // shows no Boss going out — it is any other ending, a Hero falling or the
    // clock running out — so it waits the ordinary settle and no longer.
    vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    expect(usePlayout.getState().outcomeHeld).toBe(false)
  })

  it("holds a fatal Row's outcome behind the presses that tell it", () => {
    // A Boss Row that ends the Encounter is gated like any other, so the
    // reveal now waits on a player, not just a timer: the banner must not
    // give the ending away over beats nobody has asked to see yet.
    usePlayout.getState().begin({ ...script(), endsEncounter: true }, false)
    expect(usePlayout.getState().outcomeHeld).toBe(true)
    expect(usePlayout.getState().awaitingContinue).toBe(true)
    // Waiting alone never reveals it — the Row does not play itself.
    vi.advanceTimersByTime(EFFECT_SETTLE_MS * 10)
    expect(usePlayout.getState().outcomeHeld).toBe(true)
    expect(usePlayout.getState().activeBeatId).toBeNull()
    for (let press = 0; press < 3; press += 1) {
      usePlayout.getState().continuePlayout()
      vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    }
    expect(usePlayout.getState().outcomeHeld).toBe(false)
  })

  it('holds the reveal for a Boss going out, and only for that', () => {
    // The banner is about one event, and only one batch in the game draws it
    // at length: the Boss going out. A party that loses has no body to watch
    // cool, and holding the Defeat plate back for it would be sitting on a
    // finished screen — so the wait is keyed to the effect, not to the fact
    // that something ended.
    const kill: PlayoutScript = {
      initial: {},
      endsEncounter: true,
      moments: [
        {
          beatId: null,
          beatTitle: null,
          effects: [{ kind: 'boss_defeat', entityId: 'embermaw', at: { q: 1, r: -1 }, tone: 'boss' }],
          gauges: {},
        },
      ],
    }
    usePlayout.getState().begin(kill, false)
    expect(usePlayout.getState().outcomeHeld).toBe(true)
    vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    expect(usePlayout.getState().outcomeHeld).toBe(true)
    vi.advanceTimersByTime(OUTCOME_REVEAL_MS - EFFECT_SETTLE_MS)
    expect(usePlayout.getState().outcomeHeld).toBe(false)
  })

  it('settles rather than throwing on a script with no moments', () => {
    // derivePlayoutScript never emits one, but firing moment 0 of an empty
    // batch would throw and a held outcome would wait on a moment that can
    // never come.
    usePlayout.getState().begin({ initial: {}, endsEncounter: true, moments: [] }, false)
    expect(usePlayout.getState().outcomeHeld).toBe(false)
    expect(usePlayout.getState().awaitingContinue).toBe(false)
  })

  it('runs every moment without a prompt in auto mode', () => {
    usePlayout.getState().begin(script(), true)
    expect(usePlayout.getState().activeBeatId).toBe('turn_to_the_tank')
    vi.advanceTimersByTime(BEAT_STAGGER_MS)
    expect(usePlayout.getState().activeBeatId).toBe('raking_claw')
    expect(usePlayout.getState().awaitingContinue).toBe(false)
    vi.advanceTimersByTime(BEAT_STAGGER_MS + EFFECT_SETTLE_MS)
    expect(usePlayout.getState().activeBeatId).toBeNull()
  })
})
