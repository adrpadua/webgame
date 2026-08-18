import { describe, expect, it } from 'vitest'
import { FALL_MS, buckleOffset, fallScale, groundFlare, heatLoss, ventsOpening } from './defeat'
import { EFFECT_SETTLE_MS, OUTCOME_REVEAL_MS } from './effects'
import { HEX_SIZE } from './layout'

const HEX = { q: 1, r: -1 }

function frames(count = 60): number[] {
  return Array.from({ length: count + 1 }, (_, step) => step / count)
}

describe('boss defeat', () => {
  it('knocks the body once and lets it ring down to still', () => {
    // A body that jolts once and stops reads as a piece being nudged; one that
    // never stops reads as a piece that is still fighting.
    expect(buckleOffset(0, false)).toBeCloseTo(0, 6)
    const early = Math.max(...frames(40).slice(0, 8).map((t) => Math.abs(buckleOffset(t, false))))
    const late = Math.max(...frames(40).slice(8).map((t) => Math.abs(buckleOffset(t, false))))
    expect(early).toBeGreaterThan(late)
    expect(early).toBeLessThanOrEqual(7)
    // The death ends still: nothing is shaking while the body cools.
    expect(buckleOffset(0.3, false)).toBe(0)
    expect(buckleOffset(1, false)).toBe(0)
    // It crosses zero rather than pushing one way — a knock, not a shove.
    const swings = frames(40).map((t) => buckleOffset(t, false))
    expect(Math.min(...swings)).toBeLessThan(0)
    expect(Math.max(...swings)).toBeGreaterThan(0)
  })

  it('takes the heat out of the body and never puts it back', () => {
    expect(heatLoss(0)).toBe(0)
    expect(heatLoss(1)).toBe(1)
    // Fully out before the effect ends, so the body is not still cooling on
    // the frame the board stops drawing the fall.
    expect(heatLoss(0.8)).toBe(1)
    let previous = -1
    for (const t of frames()) {
      const gone = heatLoss(t)
      expect(gone).toBeGreaterThanOrEqual(previous)
      previous = gone
    }
  })

  it('slumps the body a little and leaves it there', () => {
    expect(fallScale(0)).toBe(1)
    // It settles under its own size — a furnace going cold does not shrink,
    // and a Boss that died and stood back up to full height would undo it.
    expect(fallScale(1)).toBeLessThan(1)
    expect(fallScale(1)).toBeGreaterThan(0.9)
    let previous = 2
    for (const t of frames()) {
      expect(fallScale(t)).toBeLessThanOrEqual(previous)
      previous = fallScale(t)
    }
  })

  it('opens the vents in their own time and closes every one', () => {
    // Not all at once: a single ring of light leaving together reads as an
    // explosion, and nothing explodes in this fiction.
    const counts = frames(40).map((t) => ventsOpening(HEX, t, false).length)
    expect(Math.max(...counts)).toBe(5)
    expect(new Set(counts).size).toBeGreaterThan(2)
    // Nothing is left hanging off a body that has finished going out.
    expect(ventsOpening(HEX, 0.6, false)).toEqual([])
    expect(ventsOpening(HEX, 1, false)).toEqual([])
  })

  it('points every vent out of the body and never through the floor', () => {
    for (const coords of [HEX, { q: 0, r: 0 }, { q: -2, r: 3 }]) {
      for (const t of frames(30)) {
        for (const vent of ventsOpening(coords, t, false)) {
          const tip = vent.points[1]
          // Light escaping a thing standing on the floor has nowhere to go
          // through the floor, so no wedge reaches below the body's feet.
          expect(tip.y).toBeLessThan(HEX_SIZE * 0.5)
          expect(Math.hypot(tip.x, tip.y)).toBeLessThan(HEX_SIZE * 1.2)
          expect(vent.heat).toBeGreaterThanOrEqual(0)
          expect(vent.heat).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('goes out the same way every time it is replayed', () => {
    expect(ventsOpening(HEX, 0.3, false)).toEqual(ventsOpening(HEX, 0.3, false))
    expect(ventsOpening(HEX, 0.3, false)).not.toEqual(ventsOpening({ q: 0, r: 0 }, 0.3, false))
  })

  it('leaves the ground glowing under a body that has already gone dark', () => {
    expect(groundFlare(0)).toBe(0)
    expect(groundFlare(0.2)).toBeGreaterThan(0)
    expect(groundFlare(1)).toBe(0)
    // The body is out at 0.8 and the hex it stood on is still showing it.
    expect(heatLoss(0.85)).toBe(1)
    expect(groundFlare(0.85)).toBeGreaterThan(0)
  })

  it('opens nothing under reduced motion, and still puts the Boss out', () => {
    for (const t of frames()) {
      expect(ventsOpening(HEX, t, true)).toEqual([])
      expect(buckleOffset(t, true)).toBe(0)
    }
    // What that setting keeps is the whole event: the body cools and the
    // ground it stood on holds the heat.
    expect(heatLoss(0.5)).toBeGreaterThan(0)
    expect(groundFlare(0.5)).toBeGreaterThan(0)
  })

  it('makes the outcome wait for the death rather than the gauges', () => {
    // The banner is about this one event, so it cannot land while the body is
    // still venting. Gauges settle on their own, earlier, as they always did.
    expect(OUTCOME_REVEAL_MS).toBe(FALL_MS)
    expect(OUTCOME_REVEAL_MS).toBeGreaterThan(EFFECT_SETTLE_MS)
  })
})
