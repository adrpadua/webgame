import type { Axial } from '@/engine'
import { HEX_SIZE } from './layout'

// What a hex looks like while it catches fire.
//
// A Hazard landing on a hex is a beat resolving now, which the board direction
// ranks at the top of the warm order — above the telegraph that announced it
// and above the Boss that laid it. It used to be drawn as a single flat coral
// wash fading out over a third of a second, and the tile snapped to ash under
// it: the most imminent thing on the board was also the quietest, and the
// ground changed material between two frames with nothing in between.
//
// So the hex burns. Three stages, and the shape of each is stated here rather
// than in the scene, because a curve nobody can hold a test against is a curve
// that drifts:
//
//   ignition — a hex-shaped flare runs out from the tile's centre to its edge
//   burn     — flame tongues rise off the face, flicker, and collapse
//   ash      — the tile mixes from oathsteel to scorched coral as it chars
//
// Everything is flat-filled with hard edges: the interface direction bans
// blur and gradient ramps, and a flame drawn as a soft glow would be the one
// thing on the board rendered in a different model. A tongue is a solid
// silhouette with a second solid silhouette inside it, which is the same
// two-values-one-light rule every piece already obeys — except that a flame
// *is* the light, so its inner value is the brighter one.
//
// The flicker is faster than Board Ambience is allowed to be, and that is the
// point: ambience is bounded to one Hz because it must never read as a state
// signal, while a burn is Board Feedback derived from a Resolution Fact and
// says exactly one thing — this hex is on fire, right now.

export const BURN_MS = 900

// Stage boundaries as fractions of the burn: ignition through ~150ms, flames
// at full height from ~200ms to ~520ms, collapsed by ~810ms, and the last
// stretch is ground with nothing left to burn.
const FLARE_END = 0.17
const RISE_END = 0.22
const HOLD_END = 0.58
const COLLAPSE_END = 0.9
// Charring starts a moment after ignition and finishes before the flames do,
// so the fire is still standing on ground that has already gone black.
const CHAR_START = 0.06
const CHAR_END = 0.8

// How many tongues one hex carries. Enough to read as a fire rather than a
// candle, few enough that five burning hexes are five fires and not a wall.
const TONGUE_COUNT = 5

// All in multiples of HEX_SIZE, so the fire scales with the board.
const ROOT_SPREAD = 0.62
const ROOT_ARC = 0.36
const TONGUE_HEIGHT = 0.95
const TONGUE_WIDTH = 0.3
// The inner silhouette, scaled about the tongue's root. Narrower than it is
// short: scaled evenly it is the same flame again at half size, which reads as
// a cone inside a cone rather than as the hot middle of a fire.
const CORE_SCALE_X = 0.42
const CORE_SCALE_Y = 0.62

// A tongue's own beat. Fire is the one thing on the board with no cadence to
// keep, so each tongue takes its own period and phase and they never land in
// step — a rank of flames pulsing together reads as a warning light.
const FLICKER_MS = 170
const SWAY_MS = 290
const FLICKER_DEPTH = 0.18
const SWAY_REACH = 0.12

export interface Point {
  x: number
  y: number
}

// One flame, in pixels relative to its hex's centre. `body` is the outer
// silhouette and `core` the brighter one drawn inside it.
export interface FlameTongue {
  body: Point[]
  core: Point[]
  alpha: number
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

// A stable pseudo-random value in [0, 1) for one hex and one purpose. The same
// hex always draws the same fire, so a burn replayed by time travel is the
// burn the player saw the first time. `salt` separates the draws — a tongue's
// height and its phase must not be the same number.
function hexNoise(coords: Axial, salt: number): number {
  const h = Math.sin(coords.q * 127.1 + coords.r * 311.7 + salt * 74.7) * 43758.5453
  return h - Math.floor(h)
}

// How tall the fire stands at `t`: up fast, held, then collapsing back into
// the ground it has finished eating. Zero once there is nothing left.
export function flameEnvelope(t: number): number {
  if (t <= 0) {
    return 0
  }
  if (t < RISE_END) {
    // It arrives already burning rather than growing from a point: a fire
    // that fades up looks like a fire being turned on.
    return 0.35 + 0.65 * easeOutCubic(t / RISE_END)
  }
  if (t < HOLD_END) {
    return 1
  }
  return clamp01(1 - (t - HOLD_END) / (COLLAPSE_END - HOLD_END)) ** 1.4
}

// The ignition flare: a hex-shaped ring running out to the tile's edge. It
// returns the radius to stroke and the alpha to stroke it at, and it is the
// only part of the burn that reaches the tile's border — the flames stay
// inside so a burning hex never bleeds into its neighbours.
export function flareRing(t: number): { radius: number; alpha: number } {
  if (t < 0 || t >= FLARE_END) {
    return { radius: HEX_SIZE, alpha: 0 }
  }
  const progress = easeOutCubic(t / FLARE_END)
  return { radius: HEX_SIZE * (0.3 + 0.7 * progress), alpha: 0.95 * (1 - progress) }
}

// The heat sitting on the tile's face under the flames, as an alpha for the
// hazard tone. It is what a burn shows under reduced motion, where no tongue
// rises at all, so it carries the whole event on its own there and is shaped
// to be legible without any motion to help it.
export function emberAlpha(t: number): number {
  if (t < 0 || t >= COLLAPSE_END) {
    return 0
  }
  const ramp = Math.min(t / 0.05, 1)
  return 0.5 * ramp * (1 - t / COLLAPSE_END)
}

// How far the ground has charred, 0 clean and 1 fully scorched. Monotonic on
// purpose: the tile darkens and stays dark, because ash is the state the hex
// is left in and a floor that brightens again mid-burn reads as a flicker in
// the terrain rather than in the fire.
export function charProgress(t: number): number {
  const span = clamp01((t - CHAR_START) / (CHAR_END - CHAR_START))
  return easeOutCubic(span)
}

// The flames on one hex at this instant, in pixels relative to its centre.
//
// Returns nothing under reduced motion: rising, flickering, swaying fire is
// exactly what that setting turns off. The burn still reads there — the flare,
// the ember fill on the face, and the tile charring to ash all remain.
export function flameTongues(coords: Axial, t: number, nowMs: number, reducedMotion: boolean): FlameTongue[] {
  const envelope = flameEnvelope(t)
  if (reducedMotion || envelope <= 0) {
    return []
  }
  const tongues: FlameTongue[] = []
  for (let index = 0; index < TONGUE_COUNT; index += 1) {
    // Roots spread across the face and sit on a shallow arc: the middle of a
    // pointy-top hex is its deepest point, so a flame rooted there starts
    // lower than one at the tile's shoulder, and the fire sits *in* the hex
    // instead of on a straight line drawn across it.
    const spread = (index + 0.5) / TONGUE_COUNT - 0.5
    const jitter = (hexNoise(coords, index) - 0.5) * 0.12
    const offset = spread + jitter
    const rootX = offset * 2 * ROOT_SPREAD * HEX_SIZE
    const rootY = ROOT_ARC * HEX_SIZE * (1 - Math.abs(offset) * 1.6)
    const phase = hexNoise(coords, index + TONGUE_COUNT)
    // Tallest in the middle, so five tongues read as one fire rather than as
    // a picket fence, and never the same height twice on any two hexes.
    const reach = (0.72 + 0.5 * hexNoise(coords, index + TONGUE_COUNT * 2)) * (1 - Math.abs(offset) * 0.7)
    const flicker = 1 + FLICKER_DEPTH * Math.sin((nowMs / FLICKER_MS + phase) * Math.PI * 2)
    const sway = Math.sin((nowMs / SWAY_MS + phase) * Math.PI * 2) * SWAY_REACH * HEX_SIZE
    const height = TONGUE_HEIGHT * HEX_SIZE * reach * envelope * flicker
    const width = TONGUE_WIDTH * HEX_SIZE * (0.8 + 0.4 * hexNoise(coords, index + TONGUE_COUNT * 3)) * Math.min(1, envelope * 1.4)
    const body = tonguePath(rootX, rootY, width, height, sway * envelope)
    tongues.push({
      body,
      core: body.map((point) => ({ x: rootX + (point.x - rootX) * CORE_SCALE_X, y: rootY + (point.y - rootY) * CORE_SCALE_Y })),
      alpha: Math.min(1, 0.4 + envelope * 0.8),
    })
  }
  return tongues
}

// One flame's silhouette: it leaves the ground at its full width, keeps that
// width through the body, pinches into a neck, and leans off to one side at
// the tip. Seven points, straight edges, no curve fitting — the shape has to
// survive being drawn flat, and a smooth taper from base to point is a cone,
// which is what fire drawn without the neck always looks like.
function tonguePath(rootX: number, rootY: number, width: number, height: number, sway: number): Point[] {
  return [
    { x: rootX - width / 2, y: rootY },
    { x: rootX - width * 0.46, y: rootY - height * 0.28 },
    { x: rootX - width * 0.18, y: rootY - height * 0.66 },
    { x: rootX + sway, y: rootY - height },
    { x: rootX + width * 0.3 + sway * 0.4, y: rootY - height * 0.5 },
    { x: rootX + width * 0.48, y: rootY - height * 0.16 },
    { x: rootX + width / 2, y: rootY },
  ]
}

// Mixes two 0xRRGGBB colours channel-wise. The tile crossfades from oathsteel
// to scorched coral through this rather than swapping between them, so ground
// takes the fire's whole length to become ash.
export function mixColor(from: number, to: number, amount: number): number {
  const ratio = clamp01(amount)
  const channel = (shift: number): number => {
    const start = (from >> shift) & 0xff
    const end = (to >> shift) & 0xff
    return Math.round(start + (end - start) * ratio)
  }
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}
