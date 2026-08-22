import { traversalRoute } from './board'
import { hexDistance, hexesWithinRadius, type Axial } from './hex'
import { selectEntities } from './selectors'
import type { ContentCatalog } from './content/catalog'
import type { EncounterState } from './types'

export interface MinionIntent {
  minionId: string
  targetHeroId: string
  damage: number
  // The hexes the creep enters, in order — empty when it bites instead, or
  // when it has nowhere to go. A route rather than a destination since D-072,
  // because a Minion authoring more than one `move_tiles` crosses ground on the
  // way and has to pay for it.
  route: Axial[]
}

// A Minion's fuse, resolved (D-063): where the blast lands, how much every
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
// bites once it arrives. The creep IS the deadline: "Kill Adds" means killing
// a Whelp before it reaches you. Everything is deterministic and derived from
// the live board, so the same function serves the visible intent projection and
// the end-step resolution:
// - nearest Hero by hex distance, stable id tie-break;
// - in reach, it bites; out of reach, it travels its authored `move_tiles`
//   toward its authored `standoff_tiles`.
//
// Both halves are content since D-072, and neither used to be. The reach was a
// literal `1` here, and the creep was this module's own movement rule — the
// first neighbour in board order that shortened the distance, stopping dead
// against anything in the way — which is the rule D-074 had just replaced for
// the Boss. A Whelp now walks the same way Embermaw does, so ground that funnels
// one funnels the other, and the note that used to sit here ("Minions ignore
// Hazard movement blocking, Scorched is Embermaw's element") is now a field on
// Scorched saying so.
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
  // The selector vocabulary's first converged consumer (D-111): identical
  // semantics to the hand-rolled sort it replaces — same candidate set (the
  // seated Party's on-board bodies), same nearest-first order, and the same
  // tie-break for every shipped id, since lexicographic code-unit order and
  // localeCompare agree on ASCII.
  const heroIds = selectEntities(state, { subject: 'party', from: minion.coords, where: [{ is: 'on_board' }], order: 'nearest' })
  if (heroIds.length === 0) {
    return null
  }
  const targetHeroId = heroIds[0]
  const targetCoords = state.board.entities[targetHeroId].coords
  const reach = content?.range_tiles ?? 0
  if (hexDistance(minion.coords, targetCoords) <= reach) {
    return { minionId, targetHeroId, damage, route: [] }
  }
  // Out of reach, so it travels — and where it stops is the Standoff, not the
  // reach it just failed (D-079). The two agree for a Whelp and stop agreeing
  // the moment a Minion has allowance to spare: one that bites at 1 and stands
  // off at 1 spends every hex it has, where one standing off at its own reach
  // would halt the moment it could bite and hold that distance.
  const route = traversalRoute(
    state.board,
    minionId,
    targetCoords,
    content?.move_tiles ?? 0,
    content?.standoff_tiles ?? 0,
    content?.traversal ?? 'walk',
  )
  return { minionId, targetHeroId, damage: 0, route }
}

// Every living Minion's current intent, in spawn order — the projection a
// client renders so "Kill Adds" always has a visible deadline.
export function minionIntents(catalog: ContentCatalog, state: EncounterState): MinionIntent[] {
  return Object.values(state.board.entities)
    .filter((entity) => entity.kind === 'minion')
    .map((entity) => minionIntent(catalog, state, entity.id))
    .filter((intent): intent is MinionIntent => intent !== null)
}

// The Minion fuse (D-063): a Minion carrying an authored blast detonates on
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
