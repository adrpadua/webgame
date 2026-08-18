import { describe, expect, it } from 'vitest'
import { SPAWN_MS, arrivalScale, breakRing, groundHeat, spawnShards } from './spawn'
import { HEX_SIZE } from './layout'

const HEX = { q: 0, r: 0 }

// The spawn sampled across its whole length: a curve is only as good as its
// worst frame.
function frames(count = 60): number[] {
  return Array.from({ length: count + 1 }, (_, step) => step / count)
}

describe('minion spawn', () => {
  it('swells past the piece and settles back onto it', () => {
    // A piece that stops dead on its own size has no weight in it. The
    // overshoot is the arrival.
    expect(arrivalScale(0, false)).toBeLessThan(1)
    expect(arrivalScale(0, false)).toBeGreaterThan(0)
    const peak = Math.max(...frames().map((t) => arrivalScale(t, false)))
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThan(1.25)
    // It comes to rest at exactly its own size and stays there — no bounce,
    // and nothing left standing at the wrong scale when the effect is reaped.
    expect(arrivalScale(1, false)).toBe(1)
    for (const t of frames()) {
      expect(arrivalScale(t, false)).toBeGreaterThanOrEqual(arrivalScale(0, false))
    }
    // Past the settle it never dips under its size on the way back down.
    for (const t of frames().filter((sample) => sample > 0.55)) {
      expect(arrivalScale(t, false)).toBeGreaterThanOrEqual(1)
    }
  })

  it('puts the piece at its own size from the first frame under reduced motion', () => {
    for (const t of frames()) {
      expect(arrivalScale(t, true)).toBe(1)
      expect(spawnShards(HEX, t, true)).toEqual([])
    }
    // The event still reads there: the hex breaks and the ground stays hot.
    expect(breakRing(0.1).alpha).toBeGreaterThan(0)
    expect(groundHeat(0.3)).toBeGreaterThan(0)
  })

  it('closes the break inward, onto the point the piece comes through', () => {
    // The burn's flare runs out to the tile's edge to take the hex; this runs
    // the other way, spending the mark the telegraph held on one point. A
    // spawn and a burn must never be mistaken for one another at a glance.
    const early = breakRing(0.02)
    const late = breakRing(0.2)
    expect(early.radius).toBeGreaterThan(late.radius)
    expect(early.radius).toBeLessThanOrEqual(HEX_SIZE)
    expect(late.radius).toBeGreaterThan(0)
    expect(early.alpha).toBeGreaterThan(late.alpha)
    // Spent on the way in: the mark is gone well before the piece has settled,
    // so nothing rings a Minion that has finished arriving.
    expect(breakRing(0.35).alpha).toBe(0)
    expect(breakRing(1).alpha).toBe(0)
  })

  it('leaves the ground hot after the break, and cool by the end', () => {
    expect(groundHeat(0)).toBe(0)
    expect(groundHeat(0.1)).toBeGreaterThan(0)
    expect(groundHeat(0.1)).toBeGreaterThan(groundHeat(0.6))
    expect(groundHeat(1)).toBe(0)
    // It outlasts the break: the tile is the last thing to stop showing what
    // happened on it.
    expect(groundHeat(0.5)).toBeGreaterThan(0)
    for (const t of frames()) {
      expect(groundHeat(t)).toBeLessThanOrEqual(0.45)
    }
  })

  it('throws the shards around the hex and lands them inside it', () => {
    const halfWidth = (HEX_SIZE * Math.sqrt(3)) / 2
    expect(spawnShards(HEX, 0.05, false)).toHaveLength(6)
    let sawLeft = false
    let sawRight = false
    let sawAbove = false
    let sawBelow = false
    for (const coords of [HEX, { q: 2, r: -1 }, { q: -3, r: 4 }]) {
      for (const t of frames(30)) {
        for (const shard of spawnShards(coords, t, false)) {
          for (const point of shard.points) {
            // Debris that crossed the border would say the neighbouring hex
            // was part of what happened.
            expect(Math.abs(point.x)).toBeLessThan(halfWidth)
            expect(Math.abs(point.y)).toBeLessThan(HEX_SIZE)
            sawLeft ||= point.x < -2
            sawRight ||= point.x > 2
            sawAbove ||= point.y < -2
            sawBelow ||= point.y > 2
          }
        }
      }
    }
    // Thrown around the hex rather than off one side: six shards clustered
    // together read as a piece sliding out, not as a tile breaking open.
    expect([sawLeft, sawRight, sawAbove, sawBelow]).toEqual([true, true, true, true])
  })

  it('cools every shard as it lands, and clears them before the piece settles', () => {
    // Heat is what the scene spends between the material of the beat and the
    // material of the piece that arrived, so a shard that never cooled would
    // land as bright as it left.
    for (const shard of spawnShards(HEX, 0.02, false)) {
      expect(shard.heat).toBeGreaterThan(0.9)
    }
    for (const shard of spawnShards(HEX, 0.25, false)) {
      expect(shard.heat).toBeLessThan(0.25)
    }
    expect(spawnShards(HEX, 0.4, false)).toEqual([])
    expect(spawnShards(HEX, 1, false)).toEqual([])
  })

  it('breaks one hex the same way every time, and no two hexes alike', () => {
    // A Scenario replayed twice breaks the same hex the same way, and two
    // Whelps arriving together must not throw the same pattern.
    expect(spawnShards(HEX, 0.1, false)).toEqual(spawnShards(HEX, 0.1, false))
    expect(spawnShards(HEX, 0.1, false)).not.toEqual(spawnShards({ q: 1, r: 0 }, 0.1, false))
  })

  it('finishes inside the settle every other effect is timed against', () => {
    // A spawn claims no gauge, but it does add a piece, and the piece has to
    // be standing at its own size by the time the playout hands the board
    // back. 560ms is the blast's length, which is what EFFECT_SETTLE_MS
    // mirrors.
    expect(SPAWN_MS).toBeLessThanOrEqual(560)
    expect(arrivalScale(1, false)).toBe(1)
  })
})
