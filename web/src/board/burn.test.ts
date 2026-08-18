import { describe, expect, it } from 'vitest'
import { BURN_MS, charProgress, coolProgress, dyingEmbers, emberAlpha, flameEnvelope, flameTongues, flareRing, type FlameTongue, type Point } from './burn'
import { composite } from './palette'
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
    //
    // Sideways the bound is the hex's own half-width, not HEX_SIZE — a
    // pointy-top hex is HEX_SIZE tall to its points and only √3/2 of that
    // wide, and a flame rooted between those two numbers is standing on the
    // neighbouring tile.
    const halfWidth = (HEX_SIZE * Math.sqrt(3)) / 2
    for (const coords of [HEX, { q: 2, r: -1 }, { q: -3, r: 4 }]) {
      for (const t of frames(30)) {
        for (const tongue of flameTongues(coords, t, t * BURN_MS, false)) {
          for (const point of [...tongue.body, ...tongue.core]) {
            expect(Math.abs(point.x)).toBeLessThan(halfWidth)
            expect(point.y).toBeLessThan(HEX_SIZE)
            expect(point.y).toBeGreaterThan(-HEX_SIZE * 1.5)
          }
        }
      }
    }
  })

  it('draws the same fire on the same hex and a different one on the next', () => {
    // The fire's shape belongs to the hex, not to the moment: a Scenario
    // replayed twice burns the same hex the same way. (Its flicker runs on
    // the scene clock, which is why the clock is held still here.)
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

  it('gives the ground back without ever darkening it on the way', () => {
    expect(coolProgress(0)).toBe(1)
    expect(coolProgress(1)).toBe(0)
    // Most of the ash is gone early: heat leaves a surface fastest when it is
    // hottest, and an even fade reads as a dissolve instead.
    expect(coolProgress(0.5)).toBeLessThan(0.2)
    let previous = 2
    for (const t of frames()) {
      const remaining = coolProgress(t)
      expect(remaining).toBeLessThanOrEqual(previous)
      previous = remaining
    }
  })

  it('puts out the embers one at a time, and all of them', () => {
    const alight = (t: number) => dyingEmbers(HEX, t, false).length
    expect(alight(0)).toBe(4)
    expect(alight(1)).toBe(0)
    // They go out separately rather than together — the hex loses its last
    // points of heat one by one instead of dimming as a whole.
    const counts = frames(24).map(alight)
    expect(new Set(counts).size).toBeGreaterThan(2)
    let previous = Infinity
    for (const count of counts) {
      expect(count).toBeLessThanOrEqual(previous)
      previous = count
    }
  })

  it('scatters the embers inside the hex, and the same way every time', () => {
    const halfWidth = (HEX_SIZE * Math.sqrt(3)) / 2
    expect(dyingEmbers(HEX, 0.2, false)).toEqual(dyingEmbers(HEX, 0.2, false))
    expect(dyingEmbers(HEX, 0.2, false)).not.toEqual(dyingEmbers({ q: 1, r: 0 }, 0.2, false))
    for (const coords of [HEX, { q: 2, r: -1 }, { q: -3, r: 4 }]) {
      for (const t of frames(20)) {
        for (const ember of dyingEmbers(coords, t, false)) {
          for (const point of ember.points) {
            expect(Math.abs(point.x)).toBeLessThan(halfWidth)
            expect(Math.abs(point.y)).toBeLessThan(HEX_SIZE)
          }
        }
      }
    }
  })

  it('cools every ember toward the ash it lies on', () => {
    // Heat is what the scene spends between the two authored materials, so an
    // ember that never cooled would go out at full value — a dot winking off
    // rather than a point of heat sinking into the ground.
    for (const ember of dyingEmbers(HEX, 0.05, false)) {
      expect(ember.heat).toBeGreaterThan(0.8)
    }
    for (const ember of dyingEmbers(HEX, 0.55, false)) {
      expect(ember.heat).toBeLessThan(0.6)
    }
    for (const t of frames()) {
      for (const ember of dyingEmbers(HEX, t, false)) {
        expect(ember.heat).toBeGreaterThan(0)
        expect(ember.heat).toBeLessThanOrEqual(1)
      }
    }
  })

  it('holds the embers at one size under reduced motion, and still puts them out', () => {
    // Where each ember lies never changes; its size does, and that is the one
    // thing in the expiry that setting has to take. What it must not take is
    // the event — the hex still cools, and the embers still go out.
    const sizes = frames(12).map((t) => dyingEmbers(HEX, t, true).map((ember) => spanY(ember.points)))
    const steady = sizes.flat()
    expect(steady.length).toBeGreaterThan(0)
    expect(new Set(steady.map((size) => size.toFixed(6))).size).toBe(1)
    expect(dyingEmbers(HEX, 0, true).length).toBe(4)
    expect(dyingEmbers(HEX, 1, true)).toEqual([])
    // Live, the same embers close down as they die.
    const shrinking = frames(12).flatMap((t) => dyingEmbers(HEX, t, false).map((ember) => spanY(ember.points)))
    expect(new Set(shrinking.map((size) => size.toFixed(6))).size).toBeGreaterThan(1)
  })

  it('lands the charring on the two materials it runs between', () => {
    // What the scene composites is scorched coral over the tile at the
    // coverage below, so the two ends are the authored materials themselves
    // and everything between is one being laid over the other — the same
    // source-over a telegraph is painted with, not a third invented colour.
    expect(composite(0x45200f, charProgress(0), 0x1b2434)).toBe(0x1b2434)
    expect(composite(0x45200f, charProgress(1), 0x1b2434)).toBe(0x45200f)
    // And it arrives there before the fire goes out, so nothing is still
    // darkening on a hex with no flame left on it.
    expect(composite(0x45200f, charProgress(0.85), 0x1b2434)).toBe(0x45200f)
  })
})
