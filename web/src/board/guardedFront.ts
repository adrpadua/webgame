import { heroRole, TANK, type ContentCatalog, type EncounterState } from '@/engine'
import { hexCorners, HEX_SIZE, type Point } from './layout'

// The Guarded Front mark: the hex in front of the Boss, drawn as the stretch
// of that hex's own edge which faces the Boss.
//
// The Guarded Front is the only piece of ground in the Encounter whose value
// is positional and permanent — hold it and a Tank Hit is a Tank Hit, leave it
// and the same Beat carries its unguarded bonus (ADR 0021) and spills its ash
// underfoot (D-039). Every other thing the board paints is a moment: a
// telegraph landing next window, a destination while a card is in hand. This
// one is a standing post, and until now the player could only find it by
// reading the Boss's facing wedge and counting a hex.
//
// It is marked only for a Tank. The rule it feeds is a Tank Hit answered by
// the front line, so a Healer's board would carry a bright invitation to stand
// where the Boss is looking, in exchange for nothing.
//
// **Shape, not only colour.** Nothing else on the board draws part of a hex's
// outline — every other mark is a full ring or a full tint — so the arc is
// legible where a hue alone would not be (accessibility contract: state is
// carried by more than colour), and it says which side of the hex is the one
// being held rather than merely which hex it is.

// The mark hugs the tile's own edge. Inside the tile line rather than on it,
// so the arc reads as something laid on the ground rather than as the hex
// getting a thicker border.
export const GUARDED_FRONT_RADIUS = HEX_SIZE - 4

// A tint over the ground, at the bottom of the cool order: legal destinations
// while choosing, then the Hero, then the ground (board direction). The post
// is always there, and a persistent mark that competed with the destinations
// lit only while a card is in hand would be the loudest cool thing on the
// board for the whole Encounter. The fill sits well under the 0.35 a legal
// destination takes; the outline carries the read, over a fraction of the
// area.
export const GUARDED_FRONT_FILL_ALPHA = 0.14
export const GUARDED_FRONT_NEAR_ALPHA = 0.85
// The trailing half is read over whatever the tile has become — oathsteel at
// the start of the fight, and the coral of scorched ground by the time Ash
// Trail has taken the post, which is the case it has to survive. 0.3 held on
// the first and went to nothing on the second.
export const GUARDED_FRONT_FAR_ALPHA = 0.4
export const GUARDED_FRONT_ARC_WIDTH = 3

// Whether this board marks a Guarded Front at all: an Encounter still being
// played, by a Hero whose deck says Tank.
//
// Not narrowed to the Rounds a Tank Hit is actually scheduled in. The
// alternative — light the post when a Tank Hit is on the timeline — makes the
// mark a second telegraph, and the position it teaches is one the player has
// to be standing in *before* the Beat arrives. The Guarded Front does not come
// and go; only what it costs to be off it does.
export function marksGuardedFront(catalog: ContentCatalog, state: EncounterState): boolean {
  return state.active && heroRole(catalog, state.encounterId) === TANK
}

// The hex's outline, cut in half at the Boss: `near` is the edge the two
// pieces share plus one either side of it, `far` is the three behind. Each is
// an open polyline of four points and they share their endpoints, so drawn
// together they close the tile's outline.
//
// Both halves are drawn, at two strengths, and each half answers a different
// problem. The near half is the mark: the Guarded Front is a side as much as
// it is a hex, and a plain ring would say only *which* hex. But the near half
// is also, by construction, the ground the two largest sprites on the board
// stand over — Embermaw is drawn low and wide across the hexes in front of it,
// and a Hero on the post covers the middle of the tile — so on its own it is a
// mark hidden by exactly the pieces it is about. The far half is what stays in
// the open: it traces the rest of the hex quietly enough not to be read as a
// second claim, and it is what makes the post findable at a glance.
export interface GuardedFrontOutline {
  near: Point[]
  far: Point[]
}

export function guardedFrontOutline(center: Point, bossCenter: Point, radius = GUARDED_FRONT_RADIUS): GuardedFrontOutline {
  const corners = hexCorners(center.x, center.y, radius)
  let nearest = 0
  let nearestDistance = Infinity
  for (let edge = 0; edge < 6; edge += 1) {
    const from = corners[edge]
    const to = corners[(edge + 1) % 6]
    const distance = Math.hypot((from.x + to.x) / 2 - bossCenter.x, (from.y + to.y) / 2 - bossCenter.y)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = edge
    }
  }
  const at = (step: number) => corners[(nearest + step) % 6]
  return { near: [at(5), at(0), at(1), at(2)], far: [at(2), at(3), at(4), at(5)] }
}
