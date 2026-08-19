import type { Axial } from '@/engine'

// Shared pointy-top hex layout math. The Phaser scene draws with it and the
// React drop handlers invert it, so a drop lands on exactly the hex the
// player sees. Facing E points toward +x.

// A point in board space. Anything that hands the scene a shape to fill — the
// flames of a burn, the splinters of a spawn — speaks in these.
export interface Point {
  x: number
  y: number
}

export const HEX_SIZE = 36
// How far inside the tile a telegraph's mark is drawn. Shared because an
// effect that spends a telegraph has to start where that telegraph is.
export const TELEGRAPH_RADIUS = HEX_SIZE - 6
export const BOARD_WIDTH = 380
export const BOARD_HEIGHT = 400
export const BOARD_CENTER_X = BOARD_WIDTH / 2
export const BOARD_CENTER_Y = BOARD_HEIGHT / 2

const SQRT3 = Math.sqrt(3)

export function axialToPixel(coords: Axial): Point {
  return {
    x: BOARD_CENTER_X + HEX_SIZE * (SQRT3 * coords.q + (SQRT3 / 2) * coords.r),
    y: BOARD_CENTER_Y + HEX_SIZE * 1.5 * coords.r,
  }
}

export function pixelToAxial(x: number, y: number): Axial {
  const px = x - BOARD_CENTER_X
  const py = y - BOARD_CENTER_Y
  const qf = ((SQRT3 / 3) * px - (1 / 3) * py) / HEX_SIZE
  const rf = ((2 / 3) * py) / HEX_SIZE
  return cubeRound(qf, rf)
}

function cubeRound(qf: number, rf: number): Axial {
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const dq = Math.abs(q - qf)
  const dr = Math.abs(r - rf)
  const ds = Math.abs(s - sf)
  if (dq > dr && dq > ds) {
    q = -r - s
  } else if (dr > ds) {
    r = -q - s
  }
  return { q, r }
}

export function hexCorners(centerX: number, centerY: number, size = HEX_SIZE): Point[] {
  const corners: Point[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index - 30)
    corners.push({ x: centerX + size * Math.cos(angle), y: centerY + size * Math.sin(angle) })
  }
  return corners
}

// The neighbour on the far side of each hex edge, indexed the way `hexCorners`
// indexes corners: edge `i` runs from corner `i` to corner `i + 1`.
//
// Corner `i` sits at `60i - 30` degrees, so edge `i` spans `[60i - 30, 60i +
// 30]` and points out at `60i` — 0, 60, 120, 180, 240, 300. Those are exactly
// the six directions `axialToPixel` sends these deltas, which is why this list
// is derived from the layout rather than copied from the facing table: a
// facing is which way a piece looks, and this is which tile is across a line.
export const EDGE_NEIGHBORS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
]

// Which of one hex's six edges lie on the outer boundary of a set of hexes:
// the edges whose far side is outside the set. Run over every hex in the set,
// the result is one closed outline around the whole shape rather than an
// outline around each tile in it.
//
// That difference is the whole point of the function. Two marks on this board
// are made of the same warm material and mean different things, and what
// separates them is shape: a Cinder Breath cone outlines each of its tiles, so
// it reads as a fan of hexes, while a Minion's blast is outlined once, so it
// reads as one area around the piece at its centre.
// `footprint` holds the engine's `hexKey` form, `${q},${r}`.
export function boundaryEdges(footprint: ReadonlySet<string>, coords: Axial): number[] {
  const edges: number[] = []
  for (let index = 0; index < EDGE_NEIGHBORS.length; index += 1) {
    const across = { q: coords.q + EDGE_NEIGHBORS[index].q, r: coords.r + EDGE_NEIGHBORS[index].r }
    if (!footprint.has(`${across.q},${across.r}`)) {
      edges.push(index)
    }
  }
  return edges
}
