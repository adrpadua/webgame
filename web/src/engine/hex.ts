// Axial hex coordinates, encoded as { q, r } (Encounter Record schema_version 2).

export interface Axial {
  q: number
  r: number
}

export type HexKey = string

export function hexKey(coords: Axial): HexKey {
  return `${coords.q},${coords.r}`
}

export function parseHexKey(key: HexKey): Axial {
  const [q, r] = key.split(',').map(Number)
  return { q, r }
}

export function axialEquals(a: Axial, b: Axial): boolean {
  return a.q === b.q && a.r === b.r
}

export function axialAdd(a: Axial, b: Axial): Axial {
  return { q: a.q + b.q, r: a.r + b.r }
}

export function axialScale(a: Axial, factor: number): Axial {
  return { q: a.q * factor, r: a.r * factor }
}

export function axialSubtract(a: Axial, b: Axial): Axial {
  return { q: a.q - b.q, r: a.r - b.r }
}

export function hexDistance(from: Axial, to: Axial): number {
  const dq = from.q - to.q
  const dr = from.r - to.r
  const ds = -from.q - from.r - (-to.q - to.r)
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2
}

// Insertion order matches the reference hexes_in_radius loop so that
// order-dependent iteration (spawn search, telegraph scans) stays stable.
export function hexesInRadius(radius: number): Record<HexKey, true> {
  const hexes: Record<HexKey, true> = {}
  for (let q = -radius; q <= radius; q += 1) {
    const lower = Math.max(-radius, -q - radius)
    const upper = Math.min(radius, -q + radius)
    for (let r = lower; r <= upper; r += 1) {
      hexes[hexKey({ q, r })] = true
    }
  }
  return hexes
}

export function containsHex(coordsList: Axial[], coords: Axial): boolean {
  return coordsList.some((entry) => axialEquals(entry, coords))
}
