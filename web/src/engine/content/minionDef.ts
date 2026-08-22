import { z } from 'zod'
import type { ContentCatalog } from './schemas'

export const minionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  max_health: z.number().int().min(1),
  attack_damage: z.number().int().min(0).default(0),
  // How far a Minion bites, and how it gets there (D-072) — the same three
  // fields a Beat's movement clause carries, for the same reason.
  //
  // A Minion's reach was a literal `1` in the creep, and its route was its own
  // rule: the first neighbour in board order that shortened the distance,
  // stopping dead against anything in the way. That made it the last piece on
  // the board whose reach and movement were engine constants rather than
  // content, after cards answered the question in D-073 and Boss Beats in
  // D-074. Whether a Whelp bites at 1 or at 2 is exactly the kind of decision
  // ADR 0020 puts in `data/`.
  //
  // `range_tiles` is the bite reach and nothing else since D-079. It used to be
  // the creep's stopping distance too, on the reasoning that for a Minion they
  // are the same question — it walks until it can bite, and then it bites. They
  // are not: with spare allowance, where it *stops* decides how deep into the
  // party's threat range it puts itself, and a Whelp that bites at 1 from two
  // hexes out is a different piece from one that closes the last hex anyway.
  range_tiles: z.number().int().min(0).default(0),
  // How close this Minion's creep is trying to stand (D-079) — the Standoff
  // half of what `range_tiles` used to answer alone. Authored whenever there is
  // an allowance to spend and refused when there is not, and it may not exceed
  // the bite reach: a Minion that stops further out than it can bite is one the
  // creep proves will never bite, which is an authoring error rather than a
  // design.
  standoff_tiles: z.number().int().min(0).default(0),
  move_tiles: z.number().int().min(0).default(0),
  traversal: z.enum(['walk', 'jump', 'teleport']).default('walk'),
  // A Minion's fuse (D-063). A Minion authoring a blast detonates on the
  // Incoming Row of the Round after it arrived, and the pair is authored here
  // rather than defaulted for the reason a Beat's reach is (D-043): how far a
  // blast reaches is the whole difference between one a step answers and one
  // it does not, and ADR 0020 puts that decision in `data/`.
  //
  // Both or neither, enforced in the catalog: damage with no radius is a blast
  // that hits nothing, and a radius with no damage is a fuse that does nothing.
  explode_damage: z.number().int().min(0).default(0),
  explode_radius: z.number().int().min(0).max(3).default(0),
})

export type Minion = z.infer<typeof minionSchema>

// The same question for a Minion, which has no kind to fall back on: its creep
// runs on the allowance alone, or on a teleport that spends none.
function minionMoves(minion: Minion): boolean {
  return minion.move_tiles > 0 || minion.traversal === 'teleport'
}

export function validateMinions(catalog: ContentCatalog): void {
  for (const minion of Object.values(catalog.minions)) {
    // A fuse is two authored halves and neither is usable alone (D-063):
    // damage with no radius is a blast that reaches nothing, and a radius with
    // no damage is a Minion that removes itself for free. Stated both ways so
    // a half-authored fuse fails at load rather than resolving to nothing.
    if (minion.explode_damage > 0 && minion.explode_radius < 1) {
      throw new Error(`Minion ${minion.id} declares explode_damage ${minion.explode_damage} but no explode_radius`)
    }
    if (minion.explode_radius > 0 && minion.explode_damage < 1) {
      throw new Error(`Minion ${minion.id} declares explode_radius ${minion.explode_radius} but no explode_damage`)
    }
    // A Minion states its reach for the same reason a Card and a Beat do
    // (D-073, D-074, extended here by D-072): a bite whose distance lives in
    // engine code is a bite an author cannot tune. Both halves again — a
    // Minion that bites says how far, and one that never bites must not carry
    // a number nothing reads.
    if (minion.attack_damage > 0 && minion.range_tiles < 1) {
      throw new Error(`Minion ${minion.id} bites for ${minion.attack_damage} but authors no range_tiles`)
    }
    if (minion.attack_damage === 0 && minion.range_tiles > 0) {
      throw new Error(`Minion ${minion.id} authors range_tiles ${minion.range_tiles} but has no attack to reach with`)
    }
    // The creep only runs for a Minion that has something to close for, so an
    // allowance on one that never bites is movement nothing asks for.
    if (minion.attack_damage === 0 && minion.move_tiles > 0) {
      throw new Error(`Minion ${minion.id} authors move_tiles ${minion.move_tiles} but has no attack to close for`)
    }
    // The same two traversal rules Beats answer: a teleport spends no
    // allowance, and a jump is an allowance spent differently.
    if (minion.traversal === 'teleport' && minion.move_tiles > 0) {
      throw new Error(`Minion ${minion.id} teleports but authors move_tiles ${minion.move_tiles}; a teleport spends no allowance — author a jump instead`)
    }
    if (minion.traversal === 'jump' && minion.move_tiles < 1) {
      throw new Error(`Minion ${minion.id} authors traversal jump but no move_tiles to spend on it`)
    }
    // The Standoff, both-or-neither against the allowance rather than against
    // the bite (D-079): a Minion that never travels has nowhere it is trying to
    // stand.
    if (minionMoves(minion) && minion.standoff_tiles < 1) {
      throw new Error(`Minion ${minion.id} travels but authors no standoff_tiles to say how close to get`)
    }
    if (!minionMoves(minion) && minion.standoff_tiles > 0) {
      throw new Error(`Minion ${minion.id} authors standoff_tiles ${minion.standoff_tiles} but never travels`)
    }
    // The one ordering a Minion may not author, and the one place the two
    // numbers are constrained against each other anywhere in the rules. A Beat's
    // clause and its effect are separate things and every ordering between them
    // is a Boss somebody might build; a Minion has exactly one behaviour — creep
    // until you can bite, then bite — so a Standoff outside the bite reach is a
    // Minion the creep can be shown will never bite.
    if (minionMoves(minion) && minion.standoff_tiles > minion.range_tiles) {
      throw new Error(
        `Minion ${minion.id} stops at ${minion.standoff_tiles} but bites at ${minion.range_tiles}, so it would creep into position and never attack`,
      )
    }
  }}
