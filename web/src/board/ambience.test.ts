import { describe, expect, it } from 'vitest'
import { HOVERING_KINDS, IDLE_BOB_PERIOD_MS, IDLE_BOB_PIXELS, hoverOffset, idleBobOffset, idlePhase } from './ambience'

// One full cycle, sampled fine enough that any lift shows up.
function cycle(sample: (nowMs: number) => number): number[] {
  const samples: number[] = []
  for (let step = 0; step < 64; step += 1) {
    samples.push(sample((step * IDLE_BOB_PERIOD_MS) / 64))
  }
  return samples
}

describe('board ambience', () => {
  it('leaves the cast of the Embermaw encounter standing on the tile', () => {
    for (const kind of ['hero', 'boss', 'minion']) {
      expect(HOVERING_KINDS.has(kind)).toBe(false)
      expect(cycle((now) => idleBobOffset(kind, 'elian', now))).toEqual(new Array(64).fill(0))
    }
  })

  it('hands a hovering piece the bob', () => {
    const grounded = cycle((now) => idleBobOffset('hero', 'wyrm_1', now))
    const flying = cycle((now) => hoverOffset('wyrm_1', now))
    expect(grounded).not.toEqual(flying)
    expect(Math.max(...flying)).toBeGreaterThan(0)
  })

  it('keeps a hover inside the two pixels and one Hz the board direction allows', () => {
    const samples = cycle((now) => hoverOffset('wyrm_1', now))
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(IDLE_BOB_PIXELS)
    expect(IDLE_BOB_PERIOD_MS).toBeGreaterThanOrEqual(1000)
    // A cycle is a cycle: the offset comes back to where it started.
    expect(hoverOffset('wyrm_1', IDLE_BOB_PERIOD_MS)).toBeCloseTo(hoverOffset('wyrm_1', 0), 10)
  })

  it('phases a piece from its id, so two pieces never share a beat', () => {
    // Ids this alike are exactly the case the board has: whelp_1 through
    // whelp_4 spawn together and must not pulse together.
    const phases = ['whelp_1', 'whelp_2', 'whelp_3', 'whelp_4'].map(idlePhase)
    for (const [index, phase] of phases.entries()) {
      expect(phase).toBeGreaterThanOrEqual(0)
      expect(phase).toBeLessThan(1)
      for (const other of phases.slice(index + 1)) {
        expect(Math.abs(phase - other)).toBeGreaterThan(0.05)
      }
    }
    expect(idlePhase('whelp_1')).toBe(idlePhase('whelp_1'))
  })
})
