import type { Axial } from './hex'
import type { BossBeat } from './content/schemas'
import type { Phase } from './types'

export const ENCOUNTER_SOURCE = 'encounter'

// Every mutation rides one of these sixteen action kinds, mirroring the
// frozen reference EncounterAction catalog one-for-one.
export type EncounterActionInput =
  | { kind: 'load_slot'; sourceId: string; slotIndex: number; cardInstanceId: string }
  | { kind: 'charge_slot'; sourceId: string; slotIndex: number; cardInstanceId: string }
  | { kind: 'fire_slot'; sourceId: string; slotIndex: number; targetId?: string }
  | { kind: 'move_hero'; sourceId: string; destination: Axial; cardInstanceId: string }
  | { kind: 'resolve_boss'; sourceId: string; beat: BossBeat; track: 'instant' | 'incoming' }
  | { kind: 'apply_hazard'; sourceId: string; coords: Axial; hazardId: string | null; fallbackDurationRounds: number }
  | { kind: 'spawn_minion'; sourceId: string; minionId: string; coords: Axial; minionContentId?: string }
  | { kind: 'damage'; sourceId: string; targetId: string; amount: number; reasonText: string; factContext?: Record<string, unknown> }
  | { kind: 'discard_for_stamina'; sourceId: string; cardInstanceId: string }
  | { kind: 'expire_status'; sourceId: string; targetId: string; statusId: string; window: Phase; statusEvent: Record<string, unknown> }
  | { kind: 'advance_phase'; sourceId: typeof ENCOUNTER_SOURCE; fromPhase: Phase; toPhase: Phase; round: number }
  | { kind: 'round_start'; sourceId: typeof ENCOUNTER_SOURCE; round: number }
  | { kind: 'full_charge_cleanup'; sourceId: string; slotIndex: number; window: Phase }
  | { kind: 'draw_card'; sourceId: string }
  | { kind: 'shuffle_deck'; sourceId: string; label: string }
  | { kind: 'end_of_clock'; sourceId: typeof ENCOUNTER_SOURCE; round: number; reason: string }

export type ActionKind = EncounterActionInput['kind']
