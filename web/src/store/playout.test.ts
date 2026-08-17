import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BEAT_STAGGER_MS, EFFECT_SETTLE_MS, type PlayoutScript } from '@/board/effects'
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
    // ...and the outcome reveal still waits for that moment to finish.
    vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    expect(usePlayout.getState().outcomeHeld).toBe(false)
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
