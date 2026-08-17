import type { EscalationThreshold } from './content/schemas'
import type { Axial, HexKey } from './hex'
import type { RngState } from './rng'

export type Phase = 'loadout' | 'instant' | 'quick' | 'incoming' | 'slow'
export type Outcome = 'ongoing' | 'victory' | 'defeat'
export type EntityKind = 'boss' | 'hero' | 'minion'
export type Team = 'party' | 'enemy'

// One physical card copy. Duplicate Top Cards are distinct instances that
// never share Slot state solely because they share a card id.
export interface CardInstance {
  instanceId: string
  cardId: string
}

export interface SlotState {
  topCard: CardInstance | null
  charges: CardInstance[]
  // The window this Slot activated in, cleared when that window ends.
  activatedWindow: Phase | null
  // True while the Slot's content was placed during the current Loadout
  // into a Slot that began that Loadout empty. Such a card is tentative:
  // re-loading the Slot swaps it back to hand instead of discarding it the
  // way replacing a kept bundle does. Cleared when the Loadout ends.
  placedThisLoadout: boolean
}

export interface HeroState {
  id: string
  health: number
  maxHealth: number
  armor: number
  deck: CardInstance[]
  hand: CardInstance[]
  discard: CardInstance[]
  refillTarget: number
  actionBar: SlotState[]
}

export interface BoardEntity {
  id: string
  kind: EntityKind
  coords: Axial
  health: number
  maxHealth: number
  facing: number
  team: Team
  title: string
  contentId?: string
  // The Round a Minion arrived in. Escalation acceleration only counts a
  // demand the party has actually had a Round to answer (ADR 0027).
  spawnedRound?: number
}

export interface HazardInstance {
  id: string
  title: string
  remainingRounds: number
  enterDamage: number
  blocksVoluntaryMovement: boolean
  // A permanent Hazard never expires at a Round boundary. Structural
  // Escalation Thresholds use this to close the arena for good (D-031).
  permanent?: boolean
}

export interface BoardState {
  radius: number
  hexes: Record<HexKey, true>
  entities: Record<string, BoardEntity>
  hazards: Record<HexKey, HazardInstance[]>
}

// The authored condition for entering Phase II. Either half fires it, and an
// absent half is simply not one of the ways in.
export interface PhaseTrigger {
  bossHealthAtOrBelow: number | null
  roundAtOrAfter: number | null
}

export type StatusTrigger = 'on_round_start' | 'on_enter_hex' | 'on_damage_taken' | 'on_slot_fired'

export interface StatusInstance {
  id: string
  title: string
  remainingRounds: number
  triggers: StatusTrigger[]
  armorOnRoundStart: number
  damageReduction: number
  bonusBossDamageOnSlotFired: number
  bonusBossDamageOffPayoff: number
  // Enemy-facing payload (D-034). The mechanism is shared with Hero statuses;
  // only which fields matter differs.
  damageTakenBonus: number
  damageDealtPenalty: number
  // Non-stacking by default: a second copy is refused rather than refreshed.
  stacking: boolean
  triggerReason: string
  expiresAtWindowEnd: Phase | ''
  consumeOnCardId: string
  sourceId: string
  sourceBeatId: string
  triggerRound: number
  triggerPhase: Phase | ''
}

export type TelegraphKind = 'breath' | 'brood'

export interface EncounterState {
  encounterId: string
  phase: Phase
  round: number
  roundLimit: number
  // Escalation is the only clock (ADR 0027). `roundLimit` survives as the
  // authored budget the start Round derives from and the round track shows.
  escalation: number
  escalationStartRound: number
  escalationThresholds: EscalationThreshold[]
  active: boolean
  outcome: Outcome
  outcomeReason: string
  enrageText: string
  board: BoardState
  heroes: Record<string, HeroState>
  statusEffects: Record<string, StatusInstance[]>
  bossId: string
  primaryHeroId: string
  // `programIds` stays the authored pool — what this Boss can do. The order it
  // does them in is `programSequence`, resolved once at setup from the seed
  // (D-037): a fixed `(index + 1) % length` rotation made the Forecast Row
  // decorative, because after one cycle the next program was deducible from the
  // Round number alone.
  programIds: string[]
  loopPrograms: boolean
  programSequence: string[]
  programIndex: number
  currentProgramId: string | null
  // Phase II (ADR 0023). bossPhase is 1 until the Phase Trigger's condition
  // is met, and the break itself lands at the following Round boundary — a
  // trigger reached inside a player window takes effect after that Round
  // finishes, never mid-window. An Encounter with no authored Phase II keeps
  // bossPhase at 1 for its whole clock.
  bossPhase: number
  phaseTrigger: PhaseTrigger | null
  phaseTwoProgramIds: string[]
  // Phase II's order is rolled at setup too, not at the break. The break is
  // reached mid-fight, so rolling it there would resolve randomness after the
  // Forecast Row had already had to show it (ADR 0025).
  phaseTwoSequence: string[]
  phaseBreakText: string
  broodSpawnCandidates: Axial[]
  telegraphedSpawnHexes: Axial[]
  telegraphs: Record<HexKey, TelegraphKind>
  previousImpactedHexes: Axial[]
  lastPattern: Axial[]
  minionSequence: number
  cardInstanceSequence: number
  rng: RngState
}

// One Resolution Fact stream entry: a resolved action record with its
// pre-order position in the resolution tree.
export interface ResolvedActionFact {
  sequence: number
  depth: number
  round: number
  phase: Phase
  kind: string
  sourceId: string
  succeeded: boolean
  reason: string
  title: string
  detail: Record<string, unknown>
  resolutionFact?: Record<string, unknown>
}

export interface ResolveResult {
  state: EncounterState
  facts: ResolvedActionFact[]
}

export interface LegalityVerdict {
  legal: boolean
  reason: string
  targetRange?: number
}
