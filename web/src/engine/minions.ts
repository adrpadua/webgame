import { isOccupied, neighbors } from './board'
import { hexDistance, hexesWithinRadius, type Axial } from './hex'
import type { ContentCatalog } from './content/catalog'
import type { EncounterState } from './types'

export interface MinionIntent {
  minionId: string
  targetHeroId: string
  damage: number
  destination: Axial | null
}

// A Minion's fuse, resolved (D-061): where the blast lands, how much every
// Hero inside it takes, and which Heroes are inside it right now.
export interface MinionDetonation {
  minionId: string
  center: Axial
  damage: number
  hexes: Axial[]
  heroIds: string[]
}

// The Minion end-step intent (D-006, embermaw-ashen-trial-design.md): each
// living Minion with an authored attack creeps toward its nearest Hero and
// bites once it arrives — adjacent Minions bite, distant ones advance one
// hex. The creep IS the deadline: "Kill Adds" means killing a Whelp before
// it reaches you. Everything is deterministic and derived from the live
// board, so the same function serves the visible intent projection and the
// end-step resolution:
// - nearest Hero by hex distance, stable id tie-break;
// - the advance is the first neighbor in stable board order that strictly
//   shortens the distance and is unoccupied, or nothing when blocked;
// - Minions ignore Hazard movement blocking (Scorched is Embermaw's element).
export function minionIntent(catalog: ContentCatalog, state: EncounterState, minionId: string): MinionIntent | null {
  const minion = state.board.entities[minionId]
  if (!minion || minion.kind !== 'minion') {
    return null
  }
  const content = minion.contentId ? catalog.minions[minion.contentId] : undefined
  const damage = content?.attack_damage ?? 0
  if (damage <= 0) {
    return null
  }
  const heroIds = Object.keys(state.heroes)
    .filter((id) => state.board.entities[id])
    .sort(
      (a, b) =>
        hexDistance(minion.coords, state.board.entities[a].coords) - hexDistance(minion.coords, state.board.entities[b].coords) ||
        a.localeCompare(b),
    )
  if (heroIds.length === 0) {
    return null
  }
  const targetHeroId = heroIds[0]
  const targetCoords = state.board.entities[targetHeroId].coords
  const currentDistance = hexDistance(minion.coords, targetCoords)
  if (currentDistance <= 1) {
    return { minionId, targetHeroId, damage, destination: null }
  }
  const destination =
    neighbors(state.board.hexes, minion.coords).find(
      (coords) => hexDistance(coords, targetCoords) < currentDistance && !isOccupied(state.board, coords),
    ) ?? null
  return { minionId, targetHeroId, damage: 0, destination }
}

// Every living Minion's current intent, in spawn order — the projection a
// client renders so "Kill Adds" always has a visible deadline.
export function minionIntents(catalog: ContentCatalog, state: EncounterState): MinionIntent[] {
  return Object.values(state.board.entities)
    .filter((entity) => entity.kind === 'minion')
    .map((entity) => minionIntent(catalog, state, entity.id))
    .filter((intent): intent is MinionIntent => intent !== null)
}

// The Minion fuse (D-061): a Minion carrying an authored blast detonates on
// the Incoming Row of the Round AFTER the one it arrived in. One Round of
// life, so the party gets the Slow Window of its arrival and the Quick Window
// after it — two windows to kill it or to stand somewhere else.
//
// Read from `spawnedRound` rather than from a per-Minion countdown for the
// same reason the Escalation demand is (ADR 0027): the arrival Round is
// already recorded, and a second clock could disagree with it. A Minion with
// no recorded arrival is treated as having arrived this Round, which is the
// safe direction — a hand-placed Minion never detonates unexpectedly.
export function detonationDue(state: EncounterState, minionId: string): boolean {
  const minion = state.board.entities[minionId]
  if (!minion || minion.kind !== 'minion') {
    return false
  }
  return state.round > (minion.spawnedRound ?? state.round)
}

// One Minion's pending detonation, or null when it has no fuse or its fuse is
// not up yet. The projection and the resolution both call this, so what a
// client paints and what the Incoming Row resolves can never disagree.
export function minionDetonation(catalog: ContentCatalog, state: EncounterState, minionId: string): MinionDetonation | null {
  const minion = state.board.entities[minionId]
  if (!minion || minion.kind !== 'minion' || !detonationDue(state, minionId)) {
    return null
  }
  const content = minion.contentId ? catalog.minions[minion.contentId] : undefined
  const damage = content?.explode_damage ?? 0
  const radius = content?.explode_radius ?? 0
  if (damage <= 0 || radius <= 0) {
    return null
  }
  // Heroes only, which is the Burst rule pointed the other way (CONTEXT.md):
  // a player Burst never touches a Hero, and an Enemy blast never touches the
  // Boss or another Minion. Without that, a party could bait a Whelp next to
  // Embermaw and be credited Boss damage it never dealt — the same hole D-042
  // closed for Hazards, through a different door.
  const heroIds = Object.keys(state.heroes)
    .filter((heroId) => {
      const piece = state.board.entities[heroId]
      return piece !== undefined && hexDistance(piece.coords, minion.coords) <= radius
    })
    .sort()
  return { minionId, center: { ...minion.coords }, damage, hexes: hexesWithinRadius(state.board.hexes, minion.coords, radius), heroIds }
}

// Every pending detonation, in spawn order — the projection a client paints so
// the fuse is visible for the whole Round it burns through.
export function minionDetonations(catalog: ContentCatalog, state: EncounterState): MinionDetonation[] {
  return Object.values(state.board.entities)
    .filter((entity) => entity.kind === 'minion')
    .map((entity) => minionDetonation(catalog, state, entity.id))
    .filter((detonation): detonation is MinionDetonation => detonation !== null)
}
