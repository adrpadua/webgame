import { isOccupied, neighbors } from './board'
import { hexDistance, type Axial } from './hex'
import type { ContentCatalog } from './content/catalog'
import type { EncounterState } from './types'

export interface MinionIntent {
  minionId: string
  targetHeroId: string
  damage: number
  destination: Axial | null
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
