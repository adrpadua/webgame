import type { Axial } from '@/engine'

// Shared pointy-top hex layout math. The Phaser scene draws with it and the
// React drop handlers invert it, so a drop lands on exactly the hex the
// player sees. Facing E points toward +x.
export const HEX_SIZE = 36
export const BOARD_WIDTH = 380
export const BOARD_HEIGHT = 400
export const BOARD_CENTER_X = BOARD_WIDTH / 2
export const BOARD_CENTER_Y = BOARD_HEIGHT / 2

const SQRT3 = Math.sqrt(3)

export function axialToPixel(coords: Axial): { x: number; y: number } {
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

export function hexCorners(centerX: number, centerY: number, size = HEX_SIZE): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index - 30)
    corners.push({ x: centerX + size * Math.cos(angle), y: centerY + size * Math.sin(angle) })
  }
  return corners
}
