import { describe, expect, it } from 'vitest'
import { easeOutCubic, hexNoise } from './math'

describe('board shaping math', () => {
  it('eases out of the gate and settles on its end', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    // Most of the distance is covered in the first half, which is what makes
    // it a settle rather than a slide.
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.8)
    let previous = -1
    for (let step = 0; step <= 40; step += 1) {
      const value = easeOutCubic(step / 40)
      expect(value).toBeGreaterThan(previous)
      previous = value
    }
  })

  it('draws one hex the same way every time, and its neighbour differently', () => {
    expect(hexNoise({ q: 2, r: -1 }, 3)).toBe(hexNoise({ q: 2, r: -1 }, 3))
    expect(hexNoise({ q: 2, r: -1 }, 3)).not.toBe(hexNoise({ q: 3, r: -1 }, 3))
    // Salts separate the consumers: the floor's shade and the fire standing on
    // it read the same hex and must not read the same number.
    expect(hexNoise({ q: 0, r: 0 }, 0)).not.toBe(hexNoise({ q: 0, r: 0 }, 1))
  })

  it('stays inside [0, 1) wherever it is read', () => {
    for (let q = -4; q <= 4; q += 1) {
      for (let r = -4; r <= 4; r += 1) {
        for (const salt of [0, 1, 7, 23]) {
          const value = hexNoise({ q, r }, salt)
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThan(1)
        }
      }
    }
  })
})
