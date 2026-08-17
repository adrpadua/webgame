import phaseOneUrl from '@/assets/arena-backdrop.webp'
import phaseTwoUrl from '@/assets/arena-backdrop-phase-two.webp'

// The arena the board stands in, and which of its two states is showing.
//
// The pair is one illustration with one channel changed — same camera, same
// composition, only the crack glow differs — because a Boss phase changes what
// Embermaw does, not where the fight happens. What carries the phase is the
// difference between them rather than the brightness of either: both are
// graded under the warm ceiling in docs/content/art-prompts/board-and-tiles.md,
// so neither can outshout a telegraph, and a player who has watched the first
// for five Rounds reads the second immediately.

// Under the tile layer, which draws at the default depth of 0.
export const BACKDROP_DEPTH = -1

export interface BackdropSpec {
  key: string
  url: string
}

// Indexed by phase, so phase N is BACKDROPS[N - 1] and adding a third phase is
// one entry rather than another branch.
export const BACKDROPS: BackdropSpec[] = [
  { key: 'arena-phase-1', url: phaseOneUrl },
  { key: 'arena-phase-2', url: phaseTwoUrl },
]

// The last entry holds for any phase beyond the art: a boss that reaches a
// phase nobody drew keeps the most escalated arena there is, which is wrong by
// one step rather than blank.
export function backdropFor(bossPhase: number): BackdropSpec {
  const index = Number.isFinite(bossPhase) ? Math.floor(bossPhase) - 1 : 0
  return BACKDROPS[Math.min(Math.max(index, 0), BACKDROPS.length - 1)]
}
