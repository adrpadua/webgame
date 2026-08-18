import { describe, expect, it } from 'vitest'
import { BURN_MS, charProgress, emberAlpha, flameEnvelope, flameTongues, flareRing, mixColor, type FlameTongue, type Point } from './burn'
import { HEX_SIZE } from './layout'

const HEX = { q: 0, r: 0 }

// The burn sampled across its whole length, which is how every claim below is
// checked: a curve is only as good as its worst frame.
function frames(count = 60): number[] {
  return Array.from({ length: count + 1 }, (_, step) => step / count)
}

function spanY(points: Point[]): number {
  const ys = points.map((point) => point.y)
  return Math.max(...ys) - Math.min(...ys)
}

function tongueHeight(tongue: FlameTongue): number {
  return spanY(tongue.body)
}

function tallest(tongues: FlameTongue[]): number {
  return tongues.length === 0 ? 0 : Math.max(...tongues.map(tongueHeight))
}

describe('hex burn', () => {
  it('rises, holds, and collapses back into the ground', () => {
    expect(flameEnvelope(0)).toBe(0)
    // Already burning on the frame it appears rather than growing from a
    // point: a fire that fades up looks like a fire being switched on.
    expect(flameEnvelope(0.01)).toBeGreaterThan(0.3)
    expect(flameEnvelope(0.4)).toBe(1)
    expect(flameEnvelope(1)).toBe(0)
    // Nothing is left standing when the effect is reaped, so no flame ever
    // vanishes mid-height.
    expect(tallest(flameTongues(HEX, 1, 0, false))).toBe(0)
  })

  it('leaves the hex charred and never brightens it again', () => {
    expect(charProgress(0)).toBe(0)
    expect(charProgress(1)).toBe(1)
    // The ground finishes charring before the flames go out: fire stands on
    // ground it has already blackened.
    expect(charProgress(0.8)).toBe(1)
    let previous = -1
    for (const t of frames()) {
      const char = charProgress(t)
      expect(char).toBeGreaterThanOrEqual(previous)
      previous = char
    }
  })

  it('runs the ignition flare out to the tile edge and then stops', () => {
    const early = flareRing(0.02)
    const late = flareRing(0.15)
    expect(early.radius).toBeLessThan(late.radius)
    expect(early.alpha).toBeGreaterThan(late.alpha)
    expect(late.radius).toBeLessThanOrEqual(HEX_SIZE)
    // The flare is ignition, not the fire: it is gone long before the flames.
    expect(flareRing(0.3).alpha).toBe(0)
    expect(flareRing(1).alpha).toBe(0)
  })

  it('keeps the ember fill on the face for the length of the fire', () => {
    expect(emberAlpha(0)).toBe(0)
    expect(emberAlpha(0.1)).toBeGreaterThan(0)
    expect(emberAlpha(0.1)).toBeGreaterThan(emberAlpha(0.5))
    expect(emberAlpha(1)).toBe(0)
    for (const t of frames()) {
      expect(emberAlpha(t)).toBeLessThanOrEqual(0.5)
    }
  })

  it('holds the flames inside their own hex', () => {
    // A burn that spilled sideways would say its neighbour was on fire too.
    // Upward is the one direction it may leave the tile: that is what rising
    // looks like, and there is nothing above a tile to be confused with.
    for (const coords of [HEX, { q: 2, r: -1 }, { q: -3, r: 4 }]) {
      for (const t of frames(30)) {
        for (const tongue of flameTongues(coords, t, t * BURN_MS, false)) {
          for (const point of [...tongue.body, ...tongue.core]) {
            expect(Math.abs(point.x)).toBeLessThan(HEX_SIZE)
            expect(point.y).toBeLessThan(HEX_SIZE)
            expect(point.y).toBeGreaterThan(-HEX_SIZE * 1.5)
          }
        }
      }
    }
  })

  it('draws the same fire on the same hex and a different one on the next', () => {
    // Time travel replays a batch: the burn the player sees the second time
    // has to be the burn they saw the first.
    expect(flameTongues(HEX, 0.4, 500, false)).toEqual(flameTongues(HEX, 0.4, 500, false))
    // Two hexes burning together must not flicker in step, or a row of them
    // reads as one pulsing warning light rather than as several fires.
    const here = flameTongues(HEX, 0.4, 500, false)
    const there = flameTongues({ q: 1, r: 0 }, 0.4, 500, false)
    expect(here).not.toEqual(there)
    expect(here.map(tongueHeight)).not.toEqual(there.map(tongueHeight))
  })

  it('flickers rather than standing still', () => {
    const shapes = [0, 60, 120, 180, 240].map((now) => JSON.stringify(flameTongues(HEX, 0.4, now, false)))
    expect(new Set(shapes).size).toBe(shapes.length)
  })

  it('puts the brighter core inside the body it belongs to', () => {
    for (const tongue of flameTongues(HEX, 0.4, 500, false)) {
      expect(tongue.core).toHaveLength(tongue.body.length)
      expect(spanY(tongue.core)).toBeLessThan(spanY(tongue.body))
      expect(tongue.alpha).toBeGreaterThan(0)
      expect(tongue.alpha).toBeLessThanOrEqual(1)
    }
  })

  it('raises no flame under reduced motion, and still burns the hex', () => {
    for (const t of frames()) {
      expect(flameTongues(HEX, t, t * BURN_MS, true)).toEqual([])
    }
    // What is left is the whole event there: the tile lights, then chars.
    expect(emberAlpha(0.1)).toBeGreaterThan(0)
    expect(charProgress(0.9)).toBe(1)
  })

  it('mixes the floor from oathsteel to ash without inventing a colour', () => {
    expect(mixColor(0x1b2434, 0x45200f, 0)).toBe(0x1b2434)
    expect(mixColor(0x1b2434, 0x45200f, 1)).toBe(0x45200f)
    expect(mixColor(0x1b2434, 0x45200f, 2)).toBe(0x45200f)
    expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080)
    // Every channel stays between its ends, so no midpoint is a hue the
    // palette never authored.
    for (const t of frames(20)) {
      const mixed = mixColor(0x1b2434, 0x45200f, t)
      expect((mixed >> 16) & 0xff).toBeGreaterThanOrEqual(0x1b)
      expect((mixed >> 16) & 0xff).toBeLessThanOrEqual(0x45)
      expect(mixed & 0xff).toBeLessThanOrEqual(0x34)
      expect(mixed & 0xff).toBeGreaterThanOrEqual(0x0f)
    }
  })
})
