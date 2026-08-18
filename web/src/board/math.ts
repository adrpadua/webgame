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

// Holds a value inside [0, 1]. Every curve here and in the effect modules is
// stated as a fraction of its own length, and this is what keeps one that is
// handed a `t` past its end from running off the end of its shape.
export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

// Fast out of the gate, settling at the end. Every piece of Board Feedback
// that eases, eases on this: a step's glide, a spawn's swell, a turn's swing,
// a burn's rise.
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

// How far apart two namespaces sit in the salt space. Larger than any one
// effect's draw count, so a namespace's own indices can never reach into its
// neighbour's.
const NAMESPACE_STRIDE = 101

// A stable pseudo-random value in [0, 1) for one hex and one purpose, where
// the purpose is named rather than numbered.
//
// The numbered form below wants every consumer to know where the last one
// stopped, which made each new effect edit the module before it just to be
// born, and left the whole scheme one forgotten export from two effects
// reading a hex the same way. A name needs no such agreement: the floor asks
// for 'floor', a burn's flames ask for 'burn:flame', and nothing has to be
// told what anyone else took.
export function hexNoiseFor(coords: Axial, namespace: string, index = 0): number {
  let hash = 0
  for (let at = 0; at < namespace.length; at += 1) {
    hash = (hash * 31 + namespace.charCodeAt(at)) % 9973
  }
  return hexNoise(coords, hash * NAMESPACE_STRIDE + index)
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
