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

  it('names the beat the next Continue will play, not the one already on the board', () => {
    usePlayout.getState().begin(script(), false)
    // The first moment plays when the batch lands, so the prompt that arms
    // over it must offer the second beat.
    expect(usePlayout.getState().activeBeatId).toBe('turn_to_the_tank')
    vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    expect(usePlayout.getState().awaitingContinue).toBe(true)
    expect(usePlayout.getState().nextBeatTitle).toBe('Raking Claw')

    // Pressing Continue plays the beat the prompt named — the whole point:
    // the claw the player was promised is the claw that lands.
    usePlayout.getState().continuePlayout()
    expect(usePlayout.getState().activeBeatId).toBe('raking_claw')
    expect(usePlayout.getState().awaitingContinue).toBe(false)
    vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    expect(usePlayout.getState().nextBeatTitle).toBe('Ash Trail')

    // The last moment has nothing left to offer and prompts for nothing: it
    // settles the playout instead.
    usePlayout.getState().continuePlayout()
    expect(usePlayout.getState().activeBeatId).toBe('ash_trail')
    expect(usePlayout.getState().nextBeatTitle).toBeNull()
    vi.advanceTimersByTime(EFFECT_SETTLE_MS)
    expect(usePlayout.getState().awaitingContinue).toBe(false)
    expect(usePlayout.getState().activeBeatId).toBeNull()
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
