import type { Axial } from '@/engine'
import { HEX_SIZE, type Point } from './layout'
import { easeOutCubic, hexNoise } from './math'

// What a hex looks like while a Minion comes out of it.
//
// A spawn had one beat of feedback: the piece scaled up from nothing while the
// same expanding circle every other effect draws ran under it. Two things were
// wrong with that. The circle says only "something happened here" — it is what
// a cast, a hit, a block and a defeat all draw, so the one event on the board
// that adds a piece was announced in the board's most generic mark. And a
// piece that grows from zero and stops at exactly its own size has no arrival
// in it; it is a token being faded in.
//
// Brood Call says Whelps *emerge*, and the bible calls a Whelp "splintered
// furnace sparks" — a piece of the furnace, not a creature that walked on. So
// the hex breaks and gives one up. Three stages:
//
//   break  — the mark on the hex closes to a point and shards are thrown off it
//   emerge — the piece swells past its own size and settles back onto it
//   settle — the heat left in the ground goes out
//
// The spawn telegraph has been sitting on this hex for a Round announcing
// exactly this, and the break is that mark being spent: the ring runs inward,
// from the tile's edge to the point the Whelp comes through, where the burn's
// ignition flare runs outward to take the whole tile. One is a hex being
// claimed and the other is a hex delivering, and they should never be mistaken
// for one another at a glance.

export const SPAWN_MS = 560

// Stage boundaries as fractions of the spawn: the break through ~170ms, the
// piece up and overshooting by ~310ms, settled by ~390ms, and the rest is
// ground cooling.
const BREAK_END = 0.3
const RISE_END = 0.55
const SETTLE_END = 0.7

// How far past its own size the piece swells before it settles. Small: this is
// a body arriving under its own weight, not a bounce.
const OVERSHOOT = 0.14
// Where it starts. Not zero — a piece that grows from a point reads as being
// drawn rather than as being pushed out of the ground.
const ARRIVAL_FLOOR = 0.35

// Shards of the tile the Whelp came through. Six is enough to read as a break
// and few enough that two spawns in one moment do not fill the board with
// debris.
const SHARD_COUNT = 6
const SHARD_REACH = 0.46
const SHARD_SIZE = 0.1

// Salts for this module's own draws. The floor takes 0 and the burn's flames
// and embers sit below 40, so a hex's fire and the spawn that lands on it are
// never the same set of numbers.
const SHARD_ANGLE_SALT = 40
const SHARD_REACH_SALT = SHARD_ANGLE_SALT + SHARD_COUNT
const SHARD_SIZE_SALT = SHARD_REACH_SALT + SHARD_COUNT

// One piece of the broken tile, in pixels relative to the hex's centre. `heat`
// is 1 as it leaves the ground and 0 as it lands, and the scene spends it
// between the material of the beat and the material of the piece that arrived.
export interface Shard {
  points: Point[]
  heat: number
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

// The size the arriving piece draws at, as a multiple of its own. It comes up
// fast, passes its size, and settles back onto it — the overshoot is the whole
// arrival, because a curve that stops dead on its target has no weight in it.
//
// Reduced motion holds the piece at its size from the first frame: a spawn
// still shows, in the break and the heat, and the piece is simply there.
export function arrivalScale(t: number, reducedMotion: boolean): number {
  if (reducedMotion || t >= SETTLE_END) {
    return 1
  }
  if (t <= 0) {
    return ARRIVAL_FLOOR
  }
  if (t < RISE_END) {
    return ARRIVAL_FLOOR + (1 + OVERSHOOT - ARRIVAL_FLOOR) * easeOutCubic(t / RISE_END)
  }
  // Back down onto its own size, and no further: a piece that undershoots on
  // the way back reads as bouncing, which is a different kind of thing than a
  // body coming to rest.
  return 1 + OVERSHOOT * (1 - easeOutCubic((t - RISE_END) / (SETTLE_END - RISE_END)))
}

// The break: a hex-shaped ring closing from the tile's edge onto the point the
// piece comes through. Returns the radius to stroke and the alpha to stroke it
// at; alpha is gone before the piece has finished arriving, so the mark is
// spent on the way in rather than hanging around the finished Minion.
export function breakRing(t: number): { radius: number; alpha: number } {
  if (t < 0 || t >= BREAK_END) {
    return { radius: 0, alpha: 0 }
  }
  const progress = easeOutCubic(t / BREAK_END)
  return { radius: HEX_SIZE * (1 - 0.78 * progress), alpha: 0.9 * (1 - progress) }
}

// The heat left in the ground the piece came out of, as an alpha for the
// effect's tone. It outlasts the break and the arrival both — the tile is the
// last thing to stop showing what happened on it — and it is what carries the
// spawn under reduced motion, where nothing is thrown and nothing overshoots.
export function groundHeat(t: number): number {
  if (t < 0 || t >= 1) {
    return 0
  }
  const ramp = Math.min(t / 0.06, 1)
  return 0.45 * ramp * (1 - t)
}

// The shards thrown off the break, in pixels relative to the hex's centre.
//
// They leave the centre fast and stop early, because they are tile rather than
// spark: something heavy enough to be thrown a short way and land. Their
// spread is the hex's own, so one hex always breaks the same way and two hexes
// breaking together never throw the same pattern.
//
// Nothing is thrown under reduced motion. What that setting keeps is the break
// ring and the heat in the ground, which say the same thing without moving.
export function spawnShards(coords: Axial, t: number, reducedMotion: boolean): Shard[] {
  if (reducedMotion || t < 0 || t >= BREAK_END) {
    return []
  }
  const flight = easeOutCubic(t / BREAK_END)
  const heat = 1 - clamp01(t / BREAK_END)
  const shards: Shard[] = []
  for (let index = 0; index < SHARD_COUNT; index += 1) {
    // Around the hex rather than at random: six shards clustered on one side
    // read as a piece sliding out sideways, not as a tile breaking open.
    const spin = hexNoise(coords, SHARD_ANGLE_SALT + index) - 0.5
    const angle = ((index + 0.5) / SHARD_COUNT + spin * 0.12) * Math.PI * 2
    const reach = SHARD_REACH * HEX_SIZE * (0.6 + 0.7 * hexNoise(coords, SHARD_REACH_SALT + index)) * flight
    const x = Math.cos(angle) * reach
    // Flattened, because the board is drawn from above and a little in front:
    // debris thrown level with the floor covers less ground vertically than
    // horizontally, the same way the hex itself does.
    const y = Math.sin(angle) * reach * 0.62
    // They close down as they land rather than fading: hard edges all the way
    // out, like everything else the board draws.
    const size = SHARD_SIZE * HEX_SIZE * (0.7 + 0.6 * hexNoise(coords, SHARD_SIZE_SALT + index)) * (1 - 0.55 * flight)
    shards.push({
      points: [
        { x: x + Math.cos(angle) * size, y: y + Math.sin(angle) * size * 0.62 },
        { x: x + Math.cos(angle + 2.4) * size, y: y + Math.sin(angle + 2.4) * size * 0.62 },
        { x: x + Math.cos(angle - 2.4) * size, y: y + Math.sin(angle - 2.4) * size * 0.62 },
      ],
      heat,
    })
  }
  return shards
}
