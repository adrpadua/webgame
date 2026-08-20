import type { Axial } from './hex'
import type { BossBeat } from './content/schemas'
import type { Phase } from './types'
import type { DiminishedAction } from './downed'

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
  // `advance` shares `pull`'s geometry — move the target toward the source — but
  // names a Boss closing distance under its own power rather than a Hero card
  // hauling it (ADR 0029 owns the geometry; this only owns who is acting).
  | { kind: 'displace_piece'; sourceId: string; targetId: string; distance: number; movement: 'push' | 'pull' | 'advance'; reasonText: string }
  | { kind: 'resolve_boss'; sourceId: string; beat: BossBeat; track: 'instant' | 'incoming' }
  | { kind: 'apply_hazard'; sourceId: string; coords: Axial; hazardId: string | null; fallbackDurationRounds: number; permanent?: boolean }
  | { kind: 'spawn_minion'; sourceId: string; minionId: string; coords: Axial; minionContentId?: string }
  | { kind: 'move_minion'; sourceId: string; destination: Axial }
  // A Minion's fuse running out (D-063). It carries only the Minion, because
  // where the blast lands and how far it reaches are read from the live board
  // and the authored Minion at resolution — a footprint carried on the action
  // could disagree with the hex the Minion is actually standing on.
  | { kind: 'detonate_minion'; sourceId: string }
  | { kind: 'damage'; sourceId: string; targetId: string; amount: number; reasonText: string; factContext?: Record<string, unknown> }
  | { kind: 'discard_for_stamina'; sourceId: string; cardInstanceId: string }
  // The rescue (ADR 0036): a living Hero adjacent to a Downed ally discards
  // one hand card to bring them back at the Encounter's authored fraction.
  | { kind: 'revive_ally'; sourceId: string; targetId: string; cardInstanceId: string }
  // What an Incapacitated Hero does instead of a turn. Three ally-facing
  // choices, none of them touching the Boss's health.
  | { kind: 'diminished_action'; sourceId: string; action: DiminishedAction; targetId?: string }
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

export type ActionKind = EncounterActionInput['kind']
