import type { Axial } from './hex'
import type { BossBeat } from './content/schemas'
import type { Phase } from './types'

export const ENCOUNTER_SOURCE = 'encounter'

// Every mutation rides one of these action kinds. The first seventeen mirror
// the frozen reference EncounterAction catalog one-for-one; generated
// Escalation and Forced Movement actions extend it (ADRs 0027 and 0029).
export type EncounterActionInput =
  | { kind: 'load_slot'; sourceId: string; slotIndex: number; cardInstanceId: string }
  | { kind: 'charge_slot'; sourceId: string; slotIndex: number; cardInstanceId: string }
  // `targetSlotIndex` is the Slot a `board_slot` card chose — D-035's ally
  // attachment, reachable since D-048. Solo, that is one of the firing Hero's
  // own Slots; the field is the Slot rather than the card instance because a
  // re-loaded Slot is a different prepared card and drops what rode the old one.
  | { kind: 'fire_slot'; sourceId: string; slotIndex: number; targetId?: string; targetHex?: Axial; targetSlotIndex?: number }
  | { kind: 'move_hero'; sourceId: string; destination: Axial; cardInstanceId: string }
  | { kind: 'displace_piece'; sourceId: string; targetId: string; distance: number; movement: 'push' | 'pull'; reasonText: string }
  // A piece crossing the board under its own power (D-071): a Beat's movement
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
  | { kind: 'discard_for_stamina'; sourceId: string; cardInstanceId: string }
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

export type ActionKind = EncounterActionInput['kind']
