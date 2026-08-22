import type { Axial } from './hex'
import type { BossBeat } from './content/schemas'
import type { Phase } from './types'
import type { DiminishedAction } from './downed'

export const ENCOUNTER_SOURCE = 'encounter'

// Every mutation rides one of these action kinds, and the union is split by
// provenance: a Player Command is something a person may submit from outside
// the engine, a System Action is a trusted consequence the engine generated
// on the funnel. The resolver processes both through one vocabulary — the
// split is the type system's, so the external seams (the Scenario schema,
// the store's submit) can accept the first half and structurally refuse the
// second: a client must never be able to hand the engine a bare `damage`
// simply because `damage` shares a union with `fire_slot`.

// What a player may submit. `PLAYER_COMMAND_KINDS` is the declared vocabulary
// the way the event registry declares events: `legalActions` must enumerate
// every kind on it and the Scenario schema must carry every kind on it, and
// both agreements are guarded rather than remembered.
export const PLAYER_COMMAND_KINDS = [
  'load_slot',
  'charge_slot',
  'fire_slot',
  'move_hero',
  'discard_for_stamina',
  'revive_ally',
  'diminished_action',
] as const

export type PlayerCommandKind = (typeof PLAYER_COMMAND_KINDS)[number]

// A Slot named by its owner and index — how a `board_slot` card says which
// prepared Top Card it attaches to (D-109). One structural value rather than
// two optional fields, so half an identity cannot be authored; the counters
// module's `slotRef` is the same pair collapsed into a host key.
export interface SlotTarget {
  heroId: string
  slotIndex: number
}

export type PlayerCommandInput =
  | { kind: 'load_slot'; sourceId: string; slotIndex: number; cardInstanceId: string }
  | { kind: 'charge_slot'; sourceId: string; slotIndex: number; cardInstanceId: string }
  // `targetSlot` is the Slot a `board_slot` card chose, named by owner and
  // index — D-035's ally attachment, reachable across the Party since D-109.
  // The field is the Slot rather than the card instance because a re-loaded
  // Slot is a different prepared card and drops what rode the old one.
  | { kind: 'fire_slot'; sourceId: string; slotIndex: number; targetId?: string; targetHex?: Axial; targetSlot?: SlotTarget }
  | { kind: 'move_hero'; sourceId: string; destination: Axial; cardInstanceId: string }
  | { kind: 'discard_for_stamina'; sourceId: string; cardInstanceId: string }
  // The rescue (ADR 0036): a living Hero adjacent to a Downed ally discards
  // one hand card to bring them back at the Encounter's authored fraction.
  | { kind: 'revive_ally'; sourceId: string; targetId: string; cardInstanceId: string }
  // What an Incapacitated Hero does instead of a turn. Three ally-facing
  // choices, none of them touching the Boss's health.
  | { kind: 'diminished_action'; sourceId: string; action: DiminishedAction; targetId?: string }

// What only the engine emits: Boss resolution, generated consequences, and
// phase bookkeeping. None of these belongs to the Scenario schema — a replay
// re-derives every one of them from the seed and the submitted commands.
export type SystemActionInput =
  | { kind: 'displace_piece'; sourceId: string; targetId: string; distance: number; movement: 'push' | 'pull'; reasonText: string }
  // A piece crossing the board under its own power (D-074): a Beat's movement
  // clause, carried as the hexes entered in order rather than as a distance and
  // a direction.
  //
  // It is not a `displace_piece` with a smarter path, and the split is the
  // point. A displacement is a force applied to something — re-aimed every hex,
  // stopping dead against whatever it runs into, which is exactly right for a
  // shove. A traversal is a route decided in advance by the thing doing the
  // moving, so it can go around what a shove would stop at. Carrying the route
  // rather than recomputing it also keeps the Hazard entry honest: a walker
  // pays for every hex it crosses, a jumper only for the one it lands on, and
  // that difference is in the path itself.
  //
  // `displace_piece`'s `advance` verb retired with it — it was `pull`'s
  // geometry wearing a Boss's name, which is what made a Boss stop against its
  // own Whelp instead of stepping round it.
  | { kind: 'traverse_piece'; sourceId: string; path: Axial[]; traversal: 'walk' | 'jump' | 'teleport'; reasonText: string }
  | { kind: 'resolve_boss'; sourceId: string; beat: BossBeat; track: 'instant' | 'incoming' }
  | { kind: 'apply_hazard'; sourceId: string; coords: Axial; hazardId: string | null; fallbackDurationRounds: number; permanent?: boolean }
  | { kind: 'spawn_minion'; sourceId: string; minionId: string; coords: Axial; minionContentId?: string }
  // A Minion's fuse running out (D-063). It carries only the Minion, because
  // where the blast lands and how far it reaches are read from the live board
  // and the authored Minion at resolution — a footprint carried on the action
  // could disagree with the hex the Minion is actually standing on.
  | { kind: 'detonate_minion'; sourceId: string }
  | { kind: 'damage'; sourceId: string; targetId: string; amount: number; reasonText: string; factContext?: Record<string, unknown> }
  // The rescue window closed. Emitted by the Round boundary, never by a
  // player: the body leaves the board and the Hero's cards leave with it.
  | { kind: 'incapacitate_hero'; sourceId: string }
  // A Boss Beat placing a Counter (D-051). It rides an action like every other
  // mutation a Beat causes, so the fact log records who marked what.
  | { kind: 'place_counter'; sourceId: string; hostRef: string; counterId: string; amount: number; reasonText: string }
  | { kind: 'advance_phase'; sourceId: typeof ENCOUNTER_SOURCE; fromPhase: Phase; toPhase: Phase; round: number }
  | { kind: 'round_start'; sourceId: typeof ENCOUNTER_SOURCE; round: number }
  | { kind: 'full_charge_cleanup'; sourceId: string; slotIndex: number; window: Phase }
  | { kind: 'draw_card'; sourceId: string }
  | { kind: 'shuffle_deck'; sourceId: string; label: string }
  | { kind: 'gain_escalation'; sourceId: typeof ENCOUNTER_SOURCE; amount: number; reason: string; beatId: string }
  | { kind: 'end_of_clock'; sourceId: typeof ENCOUNTER_SOURCE; round: number; reason: string }

// The resolver's one vocabulary, unchanged in shape: the first seven kinds
// mirror the frozen reference catalog's player half, the rest its generated
// half plus the Escalation and Forced Movement extensions (ADRs 0027, 0029).
export type EncounterActionInput = PlayerCommandInput | SystemActionInput

export type ActionKind = EncounterActionInput['kind']

export function isPlayerCommand(action: EncounterActionInput): action is PlayerCommandInput {
  return (PLAYER_COMMAND_KINDS as readonly string[]).includes(action.kind)
}
