import type { Axial } from '@/engine'
import { HEX_SIZE, type Point } from './layout'
import { clamp01, easeOutCubic, hexNoise } from './math'
import { SPAWN_SALTS_END } from './spawn'

// What the Boss looks like when it goes out.
//
// A Minion's defeat removes it: the piece is gone, and the ring the board
// draws over the hex it left is the whole story. The Boss is not removed —
// `checkResolution` ends the Encounter and leaves the body standing — so the
// only feedback its death had was the flash and the damage number of whatever
// hit landed last, which is the same thing the board shows for four points of
// chip damage in Round 2. The encounter's whole point resolved, and the board
// said nothing about it that it had not said forty times already.
//
// So the fire goes out of it. Embermaw is a furnace, and everything the board
// already knows about heat applies in reverse:
//
//   buckle — the body takes the blow and shudders, hard and short
//   vent   — the light inside breaks out of it in wedges and is gone
//   out    — the piece cools to the material scorched ground is made of, and
//            the heat it dumped fades off the hex it stood on
//
// The cooled body is a state, not a beat: the Encounter is over and the Boss
// is still standing there, so the scene reads the piece's health rather than
// this module's clock to keep it dark. What is here is only the going-out.

export const FALL_MS = 880

// Stage boundaries as fractions of the fall: the shudder through ~180ms, the
// vents open and close between ~90 and ~500ms, and the body is fully out by
// ~700ms with the ground it stood on still cooling after.
const BUCKLE_END = 0.2
const VENT_START = 0.1
const VENT_END = 0.57
const OUT_END = 0.8

// How hard the body is knocked, in pixels, and how fast it rings down. Slower
// than the shudder of an ordinary hit — this is a body that has stopped, not
// one that has been stung.
const BUCKLE_PIXELS = 7
const BUCKLE_HZ = 11

// How far the piece settles as it goes out. Small: a furnace going cold does
// not shrink, it slumps.
const SETTLE = 0.06

// The light coming out. Five, and they open at staggered moments so the body
// vents rather than bursts — a single ring of light leaving all at once reads
// as an explosion, and nothing explodes in this fiction.
const VENT_COUNT = 5
const VENT_LENGTH = 0.85
const VENT_WIDTH = 0.16

// Salts for this module's draws, starting where the spawn's stop, so the
// vents of a Boss going out on a hex are never the numbers that hex has
// already spent on fire or on a Minion coming up through it.
const VENT_ANGLE_SALT = SPAWN_SALTS_END
const VENT_LENGTH_SALT = VENT_ANGLE_SALT + VENT_COUNT
const VENT_OPEN_SALT = VENT_LENGTH_SALT + VENT_COUNT

// One wedge of light leaving the body, in pixels relative to the piece's
// centre. `heat` is 1 as it opens and 0 as it closes, and the scene spends it
// between the hottest value the board draws and the material the body is
// cooling into.
export interface Vent {
  points: Point[]
  heat: number
}

// The sideways knock on the body, in pixels. It rings down rather than
// stopping, because a body that jolts once and holds still reads as a piece
// being nudged; and it is gone well before the piece has finished cooling, so
// the death ends still rather than shaking.
//
// Reduced motion takes it entirely: this is the one part of the fall that is
// pure movement, and the going-out reads without it.
export function buckleOffset(t: number, reducedMotion: boolean): number {
  if (reducedMotion || t < 0 || t >= BUCKLE_END) {
    return 0
  }
  const span = t / BUCKLE_END
  return Math.sin(span * Math.PI * BUCKLE_HZ) * BUCKLE_PIXELS * (1 - span)
}

// How far the body has slumped, as a multiple of its own size. It comes to
// rest a little under it and stays there — the piece is still on the board
// after the Encounter ends, and a Boss that died and then stood back up to
// full height would undo the whole thing.
export function fallScale(t: number): number {
  return 1 - SETTLE * easeOutCubic(clamp01(t / OUT_END))
}

// How far the heat has left the body, 0 still burning and 1 fully out. The
// scene spends this between the piece's own material and the material of
// scorched ground; past the fall it is the piece's health that holds it there,
// not this curve.
export function heatLoss(t: number): number {
  return easeOutCubic(clamp01(t / OUT_END))
}

// The heat the body dumps into the hex it stood on, as an alpha for the tone
// of the blow that landed. It peaks while the vents are open and outlasts
// them, so the last thing on screen is ground still glowing under a piece that
// has already gone dark.
export function groundFlare(t: number): number {
  if (t < 0 || t >= 1) {
    return 0
  }
  const ramp = Math.min(t / 0.08, 1)
  return 0.5 * ramp * (1 - t) ** 1.5
}

// The wedges of light breaking out of the body, in pixels relative to its
// centre. Each is rooted at the centre and points outward: this is light
// escaping something, not debris being thrown off it, which is what keeps a
// Boss going out from reading like the hex breaking open for a spawn.
//
// Nothing opens under reduced motion. What that setting keeps is the body
// cooling and the heat in the ground, which say the same thing without moving.
export function ventsOpening(coords: Axial, t: number, reducedMotion: boolean): Vent[] {
  if (reducedMotion || t < VENT_START || t >= VENT_END) {
    return []
  }
  const vents: Vent[] = []
  for (let index = 0; index < VENT_COUNT; index += 1) {
    // Each opens at its own moment inside the window and lives the rest of it,
    // so the body lets go in pieces rather than all at once.
    const opensAt = VENT_START + (VENT_END - VENT_START) * 0.45 * hexNoise(coords, VENT_OPEN_SALT + index)
    if (t < opensAt) {
      continue
    }
    const life = clamp01((t - opensAt) / (VENT_END - opensAt))
    // Out fast, then closing: the wedge reaches its length early and is drawn
    // back into the body as the body stops feeding it.
    const reach = easeOutCubic(Math.min(life * 2.2, 1)) * (1 - life ** 2)
    const spin = hexNoise(coords, VENT_ANGLE_SALT + index) - 0.5
    // Spread around the body, and never straight down: light escaping a thing
    // standing on the floor has nowhere to go through the floor.
    const angle = -Math.PI / 2 + ((index + 0.5) / VENT_COUNT - 0.5) * Math.PI * 1.5 + spin * 0.3
    const length = VENT_LENGTH * HEX_SIZE * (0.6 + 0.7 * hexNoise(coords, VENT_LENGTH_SALT + index)) * reach
    const width = VENT_WIDTH * HEX_SIZE * reach
    vents.push({
      points: [
        { x: Math.cos(angle + Math.PI / 2) * width * 0.5, y: Math.sin(angle + Math.PI / 2) * width * 0.5 },
        { x: Math.cos(angle) * length, y: Math.sin(angle) * length * 0.72 },
        { x: Math.cos(angle - Math.PI / 2) * width * 0.5, y: Math.sin(angle - Math.PI / 2) * width * 0.5 },
      ],
      heat: 1 - life,
    })
  }
  return vents
}
