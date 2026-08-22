import { axialAdd, axialScale, containsHex, hexDistance, hexKey, hexesInRadius, type Axial, type HexKey } from './hex'
import { axialDeltaFor, VALID_FACINGS } from './facing'
import { clearCounters, combatantRef } from './counters'
import type { BoardState, EncounterState, EntityKind, HazardInstance, Team } from './types'

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

// Ground a piece could arrive on: on the board, nobody standing there, and
// nothing authored impassable (D-075).
//
// The last clause is what stops a Minion spawning onto ground the arena has
// burned away. It used to filter on occupancy alone, and Embermaw authored two
// of its five spawn candidates on hexes its own Escalation Thresholds scorch —
// so past Ashen Verge, Whelps arrived on ground the rules say nothing can
// stand on. Arriving is not moving, which is why the movement rules did not
// catch it; a piece still cannot be somewhere a piece cannot be.
export function emptyHexes(board: BoardState): Record<HexKey, true> {
  const result: Record<HexKey, true> = {}
  for (const key of Object.keys(board.hexes)) {
    if (isTraversable(board, '', parseKey(key))) {
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
// Null when there is no Boss to stand in front of.
//
// The facing is a parameter rather than read off the Boss because the board
// draws a Boss coming round over several frames, and a mark on the ground has
// to follow the facing on screen rather than the one the state has already
// moved to — otherwise the Guarded Front jumps to its new hex before the Boss
// has turned toward it. Callers with no such quarrel omit it and get the
// Boss's own facing, which is what every rules path asks for.
export function guardedFrontHex(board: BoardState, bossId: string, facing?: number): Axial | null {
  const boss = board.entities[bossId]
  if (!boss) {
    return null
  }
  return axialAdd(boss.coords, axialDeltaFor(facing ?? boss.facing))
}

export function isGuardedFront(board: BoardState, bossId: string, heroId: string): boolean {
  const hero = board.entities[heroId]
  const guardedHex = guardedFrontHex(board, bossId)
  if (!hero || guardedHex === null) {
    return false
  }
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
  // Physics first, and it does not care whose move this is (D-075). Ground
  // authored impassable stops a paid step exactly as it stops a traversal or a
  // Push; a wall the Whelps have to walk around is not one the Tank strolls
  // through.
  if (!isTraversable(board, entityId, destination)) {
    return false
  }
  // Then choice, which only a voluntary move has to answer: this is fire a
  // Hero would not elect to step into, not a wall.
  if (voluntary) {
    for (const hazard of getHazards(board, destination)) {
      if (hazard.blocksVoluntaryMovement) {
        return false
      }
    }
  }
  return true
}

// --- Traversal (D-074) ---

// Ground a piece moving under its own power can stand on: on the board, nobody
// already there, and no Hazard authoring `impassable`.
//
// Deliberately not `isLegalMove` with a flag. That predicate answers a Hero's
// question — may I choose to step here — and its Hazard rule is
// `blocksVoluntaryMovement`, which is about a player declining to walk into
// fire. A Boss crossing the arena is not choosing, and the ground that stops
// it is authored separately for exactly that reason.
export function isTraversable(board: BoardState, moverId: string, coords: Axial): boolean {
  if (!isOnBoard(board, coords) || isOccupied(board, coords, moverId)) {
    return false
  }
  return !getHazards(board, coords).some((hazard) => hazard.impassable === true)
}

export type Traversal = 'walk' | 'jump' | 'teleport'

// The facing a piece ends a traversal in: the direction of its last leg, the
// same rule a Hero's paid step follows. Stated once and read by both the
// timeline — which needs it to compute the Beat's own geometry from where the
// move ends — and the resolver, which applies it. Two copies would be two
// answers, and the Guarded Front would be drawn from whichever ran last.
export function facingAlong(route: Axial[], from: Axial, currentFacing: number): number {
  if (route.length === 0) {
    return currentFacing
  }
  const last = route[route.length - 1]
  return facingToward(route.length > 1 ? route[route.length - 2] : from, last, currentFacing)
}

// The route a Beat's movement clause actually takes, as the hexes entered in
// order. Empty means it does not move — already close enough, or with nowhere
// better to stand.
//
// One rule governs all three kinds: **go no further than you have to**. The
// mover stops the moment `target` is within its authored `standoff`. That is
// what makes an advance readable rather than arbitrary — it comes exactly close
// enough to do the thing it is about to do — and it is the rule that stops a
// Boss from walking past the Hero it is hunting.
//
// The standoff is not the mover's reach, though it was read off `range_tiles`
// until D-079. Keeping them apart is what lets a piece close inside its own
// reach or stop outside it, and it is why nothing here consults a reach at all:
// where a mover stops is decided entirely by where it wants to stand.
//
// Ties break on hex key rather than on iteration order, so a route is a
// function of the board and never of how the hex map happened to be built.
export function traversalRoute(
  board: BoardState,
  moverId: string,
  target: Axial,
  moveTiles: number,
  standoff: number,
  traversal: Traversal,
): Axial[] {
  const mover = board.entities[moverId]
  if (!mover) {
    return []
  }
  // Already in reach: the whole clause is skipped rather than spent. A Boss
  // standing next to its quarry has no reason to shuffle.
  if (hexDistance(mover.coords, target) <= standoff) {
    return []
  }
  if (traversal === 'teleport') {
    const landing = bestLanding(board, moverId, target, standoff, Object.keys(board.hexes).map(parseKey))
    return landing === null ? [] : [landing]
  }
  if (traversal === 'jump') {
    // Everything within the allowance as the crow flies; what is in between is
    // simply not consulted. The landing still has to be somewhere it could
    // stand, which is the only hold obstacles keep over a jumper.
    const candidates = Object.keys(board.hexes)
      .map(parseKey)
      .filter((coords) => hexDistance(mover.coords, coords) <= moveTiles)
    const landing = bestLanding(board, moverId, target, standoff, candidates)
    return landing === null ? [] : [landing]
  }
  return walkRoute(board, moverId, target, moveTiles, standoff)
}

function parseKey(key: string): Axial {
  const [q, r] = key.split(',').map(Number)
  return { q, r }
}

function sortKey(coords: Axial): string {
  return hexKey(coords)
}

// The hex a jump or a teleport picks: the one that best answers the Beat, with
// "best" read off the same `standoff` a walker stops at. Reaching the standoff
// is the whole point, so a landing that achieves it beats one that does not, and
// among those the nearest to where it started wins — a Boss that can appear
// anywhere still appears where it needs to be, not wherever is furthest.
function bestLanding(board: BoardState, moverId: string, target: Axial, standoff: number, candidates: Axial[]): Axial | null {
  const mover = board.entities[moverId]
  if (!mover) {
    return null
  }
  const startDistance = hexDistance(mover.coords, target)
  let best: Axial | null = null
  let bestScore: [number, number, string] | null = null
  for (const coords of candidates) {
    if (!isTraversable(board, moverId, coords)) {
      continue
    }
    const toTarget = hexDistance(coords, target)
    // Never land further from the quarry than it already was: a movement
    // clause is pressure, and one that could move away would be a Beat that
    // sometimes helps the party.
    if (toTarget >= startDistance) {
      continue
    }
    const score: [number, number, string] = [Math.max(toTarget - standoff, 0), hexDistance(mover.coords, coords), sortKey(coords)]
    if (bestScore === null || compareScore(score, bestScore) < 0) {
      best = coords
      bestScore = score
    }
  }
  return best
}

// How far short of the standoff it lands, then how far it had to go, then the
// hex key — the last only so two equally good landings resolve the same way
// every run.
function compareScore(left: [number, number, string], right: [number, number, string]): number {
  if (left[0] !== right[0]) {
    return left[0] - right[0]
  }
  if (left[1] !== right[1]) {
    return left[1] - right[1]
  }
  return left[2].localeCompare(right[2])
}

// A walker's route: breadth-first over traversable ground, so an obstacle
// lengthens the path rather than stopping the piece dead against it — the
// difference between a Boss that can be blocked and a Boss that can be
// funnelled. Stops at the first hex from which the target is within the
// standoff, and otherwise spends the whole allowance closing as far as it can.
function walkRoute(board: BoardState, moverId: string, target: Axial, moveTiles: number, standoff: number): Axial[] {
  const mover = board.entities[moverId]
  if (!mover || moveTiles < 1) {
    return []
  }
  const start = mover.coords
  const cameFrom = new Map<string, string>()
  const seen = new Set<string>([hexKey(start)])
  let frontier: Axial[] = [start]
  let best: Axial | null = null
  let bestDistance = hexDistance(start, target)
  for (let step = 1; step <= moveTiles; step += 1) {
    const next: Axial[] = []
    // Sorted so the route is decided by the board rather than by the order
    // neighbours happen to come back in.
    for (const coords of [...frontier].sort((left, right) => sortKey(left).localeCompare(sortKey(right)))) {
      for (const candidate of neighbors(board.hexes, coords)) {
        const key = hexKey(candidate)
        if (seen.has(key) || !isTraversable(board, moverId, candidate)) {
          continue
        }
        seen.add(key)
        cameFrom.set(key, hexKey(coords))
        next.push(candidate)
        const toTarget = hexDistance(candidate, target)
        if (toTarget < bestDistance) {
          bestDistance = toTarget
          best = candidate
        }
        if (toTarget <= standoff) {
          return routeTo(cameFrom, start, candidate)
        }
      }
    }
    if (next.length === 0) {
      break
    }
    frontier = next
  }
  return best === null ? [] : routeTo(cameFrom, start, best)
}

// Walk the breadth-first parents back to the start, then hand the route back
// in the order it is travelled — which is the order Hazard entry has to fire
// in, one hex at a time (ADR 0029).
function routeTo(cameFrom: Map<string, string>, start: Axial, destination: Axial): Axial[] {
  const route: Axial[] = []
  let key = hexKey(destination)
  const startKey = hexKey(start)
  while (key !== startKey) {
    route.push(parseKey(key))
    const parent = cameFrom.get(key)
    if (parent === undefined) {
      break
    }
    key = parent
  }
  return route.reverse()
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

// The one way a piece leaves the board mid-Encounter. Removal and the
// Counter drop are a single move — Counters fall when the body leaves
// (D-045) — stated here once. It used to be an entity-delete/counter-drop
// pair repeated at every site that consumed a piece (a detonation, a Minion
// Defeat, an incapacitation), which is how one invariant ends up implemented
// three times eagerly with the round-upkeep sweep as a fourth, lazy copy for
// the hosts no eager path sees. Takes the whole EncounterState, unlike the
// BoardState functions above, because the invariant spans both stores — that
// is the point of it.
export function removePiece(state: EncounterState, entityId: string): void {
  delete state.board.entities[entityId]
  clearCounters(state, combatantRef(entityId))
}
