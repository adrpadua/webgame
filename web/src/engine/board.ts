import { axialAdd, axialScale, containsHex, hexDistance, hexKey, hexesInRadius, type Axial, type HexKey } from './hex'
import { axialDeltaFor, VALID_FACINGS } from './facing'
import type { BoardState, EntityKind, HazardInstance, Team } from './types'

export function createBoard(radius: number): BoardState {
  return {
    radius: Math.max(radius, 0),
    hexes: hexesInRadius(Math.max(radius, 0)),
    entities: {},
    hazards: {},
  }
}

export function isOnBoard(board: BoardState, coords: Axial): boolean {
  return board.hexes[hexKey(coords)] === true
}

export function getEntityIdAt(board: BoardState, coords: Axial): string {
  for (const entityId of Object.keys(board.entities)) {
    const entity = board.entities[entityId]
    if (entity.coords.q === coords.q && entity.coords.r === coords.r) {
      return entityId
    }
  }
  return ''
}

export function isOccupied(board: BoardState, coords: Axial, ignoredEntityId = ''): boolean {
  const entityId = getEntityIdAt(board, coords)
  return entityId !== '' && entityId !== ignoredEntityId
}

export function addEntity(
  board: BoardState,
  entityId: string,
  kind: EntityKind,
  coords: Axial,
  health: number,
  facing: number,
  team: Team,
  title: string,
): boolean {
  if (entityId === '' || !isOnBoard(board, coords) || isOccupied(board, coords)) {
    return false
  }
  board.entities[entityId] = {
    id: entityId,
    kind,
    coords,
    health: Math.max(health, 0),
    maxHealth: Math.max(health, 0),
    facing,
    team,
    title,
  }
  return true
}

export function moveEntity(board: BoardState, entityId: string, destination: Axial): boolean {
  const entity = board.entities[entityId]
  if (!entity || !isOnBoard(board, destination) || isOccupied(board, destination, entityId)) {
    return false
  }
  entity.coords = destination
  return true
}

export function damageEntity(board: BoardState, entityId: string, amount: number): number {
  const entity = board.entities[entityId]
  if (!entity) {
    return 0
  }
  const dealt = Math.min(Math.max(amount, 0), entity.health)
  entity.health -= dealt
  return dealt
}

export function emptyHexes(board: BoardState): Record<HexKey, true> {
  const result: Record<HexKey, true> = {}
  const occupied = new Set(Object.values(board.entities).map((entity) => hexKey(entity.coords)))
  for (const key of Object.keys(board.hexes)) {
    if (!occupied.has(key)) {
      result[key] = true
    }
  }
  return result
}

export function getHazards(board: BoardState, coords: Axial): HazardInstance[] {
  return board.hazards[hexKey(coords)] ?? []
}

export function addHazard(board: BoardState, coords: Axial, hazard: HazardInstance | null): boolean {
  if (!isOnBoard(board, coords) || hazard === null) {
    return false
  }
  const key = hexKey(coords)
  if (!board.hazards[key]) {
    board.hazards[key] = []
  }
  board.hazards[key].push(hazard)
  return true
}

// Round boundary upkeep: every hazard loses one round of duration and
// expired hazards leave the board. A permanent Hazard is exempt — the arena
// does not recover from a structural Escalation Threshold (D-031).
export function advanceBoardRound(board: BoardState): void {
  for (const key of Object.keys(board.hazards)) {
    const remaining = board.hazards[key].filter((hazard) => {
      if (hazard.permanent === true) {
        return true
      }
      hazard.remainingRounds -= 1
      return hazard.remainingRounds > 0
    })
    if (remaining.length === 0) {
      delete board.hazards[key]
    } else {
      board.hazards[key] = remaining
    }
  }
}

// --- Queries ---

export function neighbors(hexes: Record<HexKey, true>, origin: Axial): Axial[] {
  const result: Axial[] = []
  for (const direction of VALID_FACINGS) {
    const coords = axialAdd(origin, axialDeltaFor(direction))
    if (hexes[hexKey(coords)]) {
      result.push(coords)
    }
  }
  return result
}

export function frontArc(hexes: Record<HexKey, true>, origin: Axial, facing: number): Axial[] {
  const result: Axial[] = []
  for (const direction of [facing - 1, facing, facing + 1]) {
    const coords = axialAdd(origin, axialDeltaFor(direction))
    if (hexes[hexKey(coords)]) {
      result.push(coords)
    }
  }
  return result
}

// The live forward-cone geometry (ADR 0017): a symmetric wedge expanding
// from the facing ray, clipped to on-board hexes.
//
// `maximumRange` is required rather than defaulted. It used to default to 2,
// and the telegraph passed its own literal 2 alongside — so the preview and the
// resolution agreed only by coincidence, and either could be edited without the
// other. Every caller now has to say what it means, which is the authored
// `range_tiles` of the Beat being drawn or resolved.
export function forwardCone(hexes: Record<HexKey, true>, origin: Axial, facing: number, maximumRange: number): Axial[] {
  const result: Axial[] = []
  const forward = axialDeltaFor(facing)
  const left = axialDeltaFor(facing + 2)
  const right = axialDeltaFor(facing - 1)
  for (let distance = 1; distance <= maximumRange; distance += 1) {
    const center = axialAdd(origin, axialScale(forward, distance))
    for (let spread = -(distance - 1); spread <= distance - 1; spread += 1) {
      let coords = center
      if (spread < 0) {
        coords = axialAdd(coords, axialScale(left, Math.abs(spread)))
      } else if (spread > 0) {
        coords = axialAdd(coords, axialScale(right, spread))
      }
      if (hexes[hexKey(coords)] && !containsHex(result, coords)) {
        result.push(coords)
      }
    }
  }
  return result
}

// Snap toward the target: the facing whose adjacent hex lands closest wins,
// with earlier enum order breaking ties.
export function facingToward(origin: Axial, target: Axial, currentFacing: number): number {
  let bestDirection = currentFacing
  let bestDistance = 999
  for (const direction of VALID_FACINGS) {
    const distance = hexDistance(axialAdd(origin, axialDeltaFor(direction)), target)
    if (distance < bestDistance) {
      bestDistance = distance
      bestDirection = direction
    }
  }
  return bestDirection
}

// Guarded Front: the Boss-facing adjacent hex directly in front of the Boss.
export function isGuardedFront(board: BoardState, bossId: string, heroId: string): boolean {
  const boss = board.entities[bossId]
  const hero = board.entities[heroId]
  if (!boss || !hero) {
    return false
  }
  const guardedHex = axialAdd(boss.coords, axialDeltaFor(boss.facing))
  return hero.coords.q === guardedHex.q && hero.coords.r === guardedHex.r
}

export function isLegalMove(board: BoardState, entityId: string, destination: Axial, maximumDistance = 1, voluntary = true): boolean {
  const entity = board.entities[entityId]
  if (!entity || !isOnBoard(board, destination) || isOccupied(board, destination, entityId)) {
    return false
  }
  if (hexDistance(entity.coords, destination) > maximumDistance) {
    return false
  }
  if (voluntary) {
    for (const hazard of getHazards(board, destination)) {
      if (hazard.blocksVoluntaryMovement) {
        return false
      }
    }
  }
  return true
}

export function firstEmptyHexes(candidates: Axial[], empty: Record<HexKey, true>, count: number): Axial[] {
  const result: Axial[] = []
  for (const coords of candidates) {
    if (empty[hexKey(coords)]) {
      result.push(coords)
      if (result.length >= count) {
        break
      }
    }
  }
  return result
}
