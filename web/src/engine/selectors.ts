import { hexDistance, parseHexKey, hexKey, type Axial } from './hex'
import { combatantRef, counterCount, hexCounterRef } from './counters'
import type { EncounterState } from './types'

// The one query vocabulary (mechanics-extension P0, D-111). Everything that
// derives entities or hexes from authoritative state asks these two
// functions, so legality, targeting previews, Boss and Minion intent, card
// effects, and simulation converge on one set of semantics instead of each
// carrying its own — the parallel projections this module exists to retire,
// one consumer per change and never in a sweep.
//
// The vocabulary is CLOSED, in the registry tradition (ADR 0041): subjects,
// filters, and orders are exhaustive unions with `never`-guarded switches, so
// a selector the engine does not understand is a compile error and adding one
// is an explicit engine change — never a predicate parameter, never a
// property path, never a boolean tree. Filters AND together; that is the
// entire combination grammar, exactly as Reader gates combine (D-047).
//
// DETERMINISM RULE — the part every consumer may rely on and every future
// edit must keep: results are produced by a stable two-key sort whose final
// key is always lexicographic (code-unit) order — entity id for entities, the
// "q,r" hex key for hexes. Equal-priority candidates therefore tie-break
// identically on every machine and every replay. `seat` order follows
// `partyHeroIds`; every other base enumeration is sorted before filtering, so
// insertion order never leaks into a result.

export type EntitySubject = 'all' | 'heroes' | 'party' | 'enemies' | 'minions' | 'boss'

export type EntityFilter =
  | { is: 'living' }
  | { is: 'downed' }
  | { is: 'on_board' }
  | { within: number }
  | { adjacent: true }
  | { has_counter: string }
  | { not: string }

export type EntityOrder = 'id' | 'seat' | 'nearest' | 'furthest' | 'lowest_health' | 'highest_health'

export interface EntityQuery {
  subject: EntitySubject
  // The reference point distance filters and orders measure from. Required
  // by `within`, `adjacent`, `nearest`, and `furthest`; a query naming one of
  // those without `from` is a programming error and throws loudly.
  from?: Axial
  // AND-combined, applied in the order written.
  where?: EntityFilter[]
  order?: EntityOrder
  // Cardinality: keep the first N after ordering ("up to N"). Omit for all;
  // 1 is "the one" — `nearest living Hero` is order: 'nearest', limit: 1.
  limit?: number
}

// Entity ids matching the query, in the query's order. `heroes` is the
// party members whose bodies are on the board; `party` is the roster in seat
// order whether or not a body stands (an Incapacitated Hero has left the
// board but not the Party, ADR 0036).
export function selectEntities(state: EncounterState, query: EntityQuery): string[] {
  let ids = subjectIds(state, query.subject)
  for (const filter of query.where ?? []) {
    ids = ids.filter((id) => entityMatches(state, id, filter, requireFrom(query, filter)))
  }
  ids = orderEntities(state, ids, query.order ?? defaultOrder(query.subject), query)
  return query.limit === undefined ? ids : ids.slice(0, query.limit)
}

export type HexFilter =
  | { is: 'empty' }
  | { is: 'occupied' }
  | { within: number }
  | { adjacent: true }
  | { has_counter: string }

export interface HexQuery {
  from?: Axial
  where?: HexFilter[]
  limit?: number
}

// On-board hexes matching the query, in lexicographic hex-key order — the
// module's canonical ground order, chosen over insertion order so a board
// authored in a different file order selects identically.
export function selectHexes(state: EncounterState, query: HexQuery): Axial[] {
  const occupied = new Set(Object.values(state.board.entities).map((entity) => hexKey(entity.coords)))
  let keys = Object.keys(state.board.hexes).sort()
  for (const filter of query.where ?? []) {
    keys = keys.filter((key) => hexMatches(state, key, occupied, filter, requireFrom(query, filter)))
  }
  const coords = keys.map(parseHexKey)
  return query.limit === undefined ? coords : coords.slice(0, query.limit)
}

function subjectIds(state: EncounterState, subject: EntitySubject): string[] {
  switch (subject) {
    case 'all':
      return Object.keys(state.board.entities).sort()
    case 'heroes':
      return Object.keys(state.board.entities)
        .filter((id) => state.heroes[id] !== undefined)
        .sort()
    case 'party':
      return [...state.partyHeroIds]
    case 'enemies':
      return Object.keys(state.board.entities)
        .filter((id) => state.board.entities[id].team === 'enemy')
        .sort()
    case 'minions':
      return Object.keys(state.board.entities)
        .filter((id) => state.board.entities[id].kind === 'minion')
        .sort()
    case 'boss':
      return state.bossId !== '' && state.board.entities[state.bossId] ? [state.bossId] : []
    default: {
      const undecided: never = subject
      throw new Error(`selector subject ${String(undecided)} has no enumeration`)
    }
  }
}

function entityMatches(state: EncounterState, id: string, filter: EntityFilter, from: Axial | undefined): boolean {
  if ('is' in filter) {
    const hero = state.heroes[id]
    const status = filter.is
    switch (status) {
      case 'living':
        return hero !== undefined ? hero.status === 'living' : (state.board.entities[id]?.health ?? 0) > 0
      case 'downed':
        return hero !== undefined && hero.status === 'downed'
      case 'on_board':
        return state.board.entities[id] !== undefined
      default: {
        const undecided: never = status
        throw new Error(`selector filter ${String(undecided)} has no rule`)
      }
    }
  }
  if ('within' in filter) {
    const at = state.board.entities[id]?.coords
    return at !== undefined && from !== undefined && hexDistance(at, from) <= filter.within
  }
  if ('adjacent' in filter) {
    const at = state.board.entities[id]?.coords
    return at !== undefined && from !== undefined && hexDistance(at, from) === 1
  }
  if ('has_counter' in filter) {
    return counterCount(state, combatantRef(id), filter.has_counter) > 0
  }
  if ('not' in filter) {
    return id !== filter.not
  }
  const undecided: never = filter
  throw new Error(`selector filter ${JSON.stringify(undecided)} has no rule`)
}

function hexMatches(state: EncounterState, key: string, occupied: Set<string>, filter: HexFilter, from: Axial | undefined): boolean {
  if ('is' in filter) {
    const status = filter.is
    switch (status) {
      case 'empty':
        return !occupied.has(key)
      case 'occupied':
        return occupied.has(key)
      default: {
        const undecided: never = status
        throw new Error(`selector filter ${String(undecided)} has no rule`)
      }
    }
  }
  if ('within' in filter) {
    return from !== undefined && hexDistance(parseHexKey(key), from) <= filter.within
  }
  if ('adjacent' in filter) {
    return from !== undefined && hexDistance(parseHexKey(key), from) === 1
  }
  if ('has_counter' in filter) {
    return counterCount(state, hexCounterRef(parseHexKey(key)), filter.has_counter) > 0
  }
  const undecided: never = filter
  throw new Error(`selector filter ${JSON.stringify(undecided)} has no rule`)
}

function requireFrom(query: { from?: Axial }, filter: EntityFilter | HexFilter): Axial | undefined {
  if (('within' in filter || 'adjacent' in filter) && query.from === undefined) {
    throw new Error('a distance selector needs a `from` reference point')
  }
  return query.from
}

function defaultOrder(subject: EntitySubject): EntityOrder {
  return subject === 'party' ? 'seat' : 'id'
}

function orderEntities(state: EncounterState, ids: string[], order: EntityOrder, query: EntityQuery): string[] {
  const idCompare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)
  switch (order) {
    case 'id':
      return [...ids].sort(idCompare)
    case 'seat': {
      const seat = new Map(state.partyHeroIds.map((id, index) => [id, index]))
      return [...ids].sort((left, right) => (seat.get(left) ?? Number.MAX_SAFE_INTEGER) - (seat.get(right) ?? Number.MAX_SAFE_INTEGER) || idCompare(left, right))
    }
    case 'nearest':
    case 'furthest': {
      if (query.from === undefined) {
        throw new Error(`the ${order} order needs a \`from\` reference point`)
      }
      const from = query.from
      const sign = order === 'nearest' ? 1 : -1
      const distance = (id: string): number => {
        const at = state.board.entities[id]?.coords
        // An off-board entity has no distance; it sorts after everything that
        // stands somewhere, whichever direction the order runs.
        return at === undefined ? Number.MAX_SAFE_INTEGER * sign : hexDistance(at, from)
      }
      return [...ids].sort((left, right) => sign * (distance(left) - distance(right)) || idCompare(left, right))
    }
    case 'lowest_health':
    case 'highest_health': {
      const sign = order === 'lowest_health' ? 1 : -1
      const health = (id: string): number => state.heroes[id]?.health ?? state.board.entities[id]?.health ?? 0
      return [...ids].sort((left, right) => sign * (health(left) - health(right)) || idCompare(left, right))
    }
    default: {
      const undecided: never = order
      throw new Error(`selector order ${String(undecided)} has no rule`)
    }
  }
}
