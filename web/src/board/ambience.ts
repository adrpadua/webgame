// Board Ambience: the continuous, uniform motion of a board with nothing
// happening on it. It carries no rules information and is never derived from
// Resolution Facts, which is what keeps it from being read as a state signal.

// Which kinds of piece hold themselves off the ground at rest. The bob raises
// a body while its cast shadow stays on the tile, and that growing gap between
// the two is the whole picture of flight — right for a piece that hovers, and
// for a piece that stands it is the piece coming unstuck from the floor.
//
// Nothing in the Embermaw encounter flies: Elian stands, Embermaw is drawn low
// and planted on several hexes, and a Whelp is a burning shard that scuttles.
// Their authored idle sheets say so too — every sheet is drawn with its feet,
// base and centre of mass in exactly the same place across all four frames,
// and the ambience the sheets do carry is heat swelling and plates settling
// inside a silhouette that never leaves the ground. A kind belongs in this set
// when its art shows it airborne, and not before.
export const HOVERING_KINDS: ReadonlySet<string> = new Set<string>()

// Board Ambience is bounded by the board direction: value only, two pixels of
// travel at most, one Hz at most, and deterministic per piece.
export const IDLE_BOB_PIXELS = 2
export const IDLE_BOB_PERIOD_MS = 2600

// Where in its bob cycle a piece starts, in [0, 1). Derived from the id so a
// piece keeps the same phase for as long as it is on the board, and so no two
// pieces share a beat. The golden ratio is what separates them: ids as alike
// as `whelp_1` and `whelp_2` hash one apart, and dividing that straight into
// the cycle would start them a thousandth of a beat apart — in unison, to the
// eye. Stepping by an irrational fraction throws consecutive hashes to
// opposite sides of the cycle instead.
const PHASE_STEP = 0.618033988749895

export function idlePhase(entityId: string): number {
  let hash = 0
  for (let index = 0; index < entityId.length; index += 1) {
    hash = (hash * 31 + entityId.charCodeAt(index)) % 997
  }
  return (hash * PHASE_STEP) % 1
}

// The rise and fall of a piece holding itself in the air.
export function hoverOffset(entityId: string, nowMs: number): number {
  return Math.sin((nowMs / IDLE_BOB_PERIOD_MS + idlePhase(entityId)) * Math.PI * 2) * IDLE_BOB_PIXELS
}

// A piece's vertical offset in its idle cycle. Zero for anything that stands:
// a grounded piece's ambience is the idle cycle its sheet already draws, which
// animates inside the silhouette instead of moving it.
export function idleBobOffset(kind: string, entityId: string, nowMs: number): number {
  return HOVERING_KINDS.has(kind) ? hoverOffset(entityId, nowMs) : 0
}
