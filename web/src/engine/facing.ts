import type { Axial } from './hex'

// Facing is always one of the six hex edges: E, NE, NW, W, SW, SE.
// Numeric values match the reference enum order.
export const FACING_E = 0
export const FACING_NE = 1
export const FACING_NW = 2
export const FACING_W = 3
export const FACING_SW = 4
export const FACING_SE = 5

export const VALID_FACINGS = [FACING_E, FACING_NE, FACING_NW, FACING_W, FACING_SW, FACING_SE] as const

export type FacingName = 'E' | 'NE' | 'NW' | 'W' | 'SW' | 'SE'

const FACING_NAMES: FacingName[] = ['E', 'NE', 'NW', 'W', 'SW', 'SE']

const AXIAL_DELTAS: Axial[] = [
  { q: 1, r: 0 }, // E
  { q: 1, r: -1 }, // NE
  { q: 0, r: -1 }, // NW
  { q: -1, r: 0 }, // W
  { q: -1, r: 1 }, // SW
  { q: 0, r: 1 }, // SE
]

export function normalizeFacing(direction: number): number {
  return ((direction % 6) + 6) % 6
}

export function facingName(direction: number): FacingName {
  return FACING_NAMES[normalizeFacing(direction)]
}

export function axialDeltaFor(direction: number): Axial {
  return AXIAL_DELTAS[normalizeFacing(direction)]
}

export function directionForAxialDelta(delta: Axial): number {
  const index = AXIAL_DELTAS.findIndex((entry) => entry.q === delta.q && entry.r === delta.r)
  if (index < 0) {
    throw new Error('Facing delta must be one legal adjacent hex edge.')
  }
  return index
}
