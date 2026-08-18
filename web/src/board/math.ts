import type { Axial } from '@/engine'

// The two pieces of shaping math the board draws everything with: one easing
// curve, and one per-hex hash.
//
// They live together in one module for the reason palette.ts states at length
// about colour — a second private copy is how the board came to draw the Boss
// in one ember here and another ember there, and only one of them got
// corrected. A curve is no different: two copies of the same easing drift the
// same way, and the drift is invisible until two effects that were meant to
// land together stop landing together.

// Fast out of the gate, settling at the end. Every piece of Board Feedback
// that eases, eases on this: a step's glide, a spawn's swell, a turn's swing,
// a burn's rise.
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

// A stable pseudo-random value in [0, 1) for one hex and one purpose. The same
// hex always draws the same value, so anything derived from it — the floor's
// shade, the shape of the fire on it — holds still between frames and comes
// back identical when a Scenario replays that moment.
//
// `salt` separates the draws. Two consumers reading the same hex must not read
// the same number: a tile's shade and the height of the first flame standing
// on it are unrelated facts, and derived from one hash they would be locked
// together for the life of the board.
export function hexNoise(coords: Axial, salt: number): number {
  const h = Math.sin(coords.q * 127.1 + coords.r * 311.7 + salt * 74.7) * 43758.5453
  return h - Math.floor(h)
}
