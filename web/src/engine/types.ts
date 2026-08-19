import type { CounterReader, EscalationThreshold } from './content/schemas'
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
  // The Signature Slot (D-064, ADR 0032): its Top Card is printed on the
  // Hero, never drawn, never replaceable, never discarded, and it inverts
  // both halves of ADR 0008 — firing spends the whole stack and the Top Card
  // stays. `charges` stays empty here: a fixed Slot's Charge is the earned
  // token count below, because hand cards physically cannot reach it.
  fixed: boolean
  earnedCharges: number
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
  // Which side laid this Hazard. An Enemy is immune to its own side's Hazards
  // (D-042), so a Boss can advance across its own Ash Trail and a Whelp does
  // not burn in its master's fire. Recorded per Hazard rather than assumed of
  // Enemies in general, because a Hero-placed damage zone has to keep working.
  sourceTeam?: Team
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

// One Counter held by one combatant (D-047). A Counter is a named, counted
// marker; `readers` is the only thing that makes it do anything, and it is
// copied from the authored definition so a live instance never has to look
// its own meaning back up.
export interface CounterInstance {
  id: string
  title: string
  // The count is the Counter. Fortified's count *is* its banked Armor, which
  // is why additive stacking (D-019) needs no flag any more.
  count: number
  max: number
  remainingRounds: number
  readers: CounterReader[]
  triggerReason: string
  sourceId: string
  sourceBeatId: string
  triggerRound: number
  triggerPhase: Phase | ''
}

// Telegraph tokens name the shape being previewed, not the Beat that casts it,
// for the same reason Beat kinds do: this type crosses into the renderer, so a
// flavoured token would put one Boss's vocabulary in a shared contract.
export type TelegraphKind = 'cone' | 'spawn'

export interface EncounterState {
  encounterId: string
  phase: Phase
  round: number
  roundLimit: number
  // Escalation is the only clock (ADR 0027). `roundLimit` survives as the
  // authored budget the tick start derives from. Nothing ends an Encounter
  // at it, so the HUD no longer prints it beside the Round: the Round mark
  // is a coordinate and the budget is a hold away, qualified as the length
  // automatic ticks alone would reach.
  escalation: number
  escalationStartRound: number
  escalationThresholds: EscalationThreshold[]
  active: boolean
  outcome: Outcome
  outcomeReason: string
  enrageText: string
  board: BoardState
  heroes: Record<string, HeroState>
  // Keyed by Counter host ref (`combatant:<id>`, `hex:<q,r>`, `slot:<hero>:<n>`),
  // never by bare entity id — see `counters.ts` (D-048).
  counters: Record<string, CounterInstance[]>
  bossId: string
  primaryHeroId: string
  // `programIds` stays the authored pool — what this Boss can do. The order it
  // does them in is `programSequence`, resolved once at setup from the seed
  // (D-037): under a fixed `(index + 1) % length` rotation the next program was
  // deducible from the Round number after one cycle, so there was nothing to
  // learn by fighting the Boss twice (ADR 0031).
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
  // reached mid-fight, and a roll there would make replay depend on when the
  // boundary was crossed — a committed Scenario and a sealed Encounter Record
  // both replay by re-running the seed (ADR 0025).
  phaseTwoSequence: string[]
  phaseBreakText: string
  spawnCandidates: Axial[]
  telegraphedSpawnHexes: Axial[]
  telegraphs: Record<HexKey, TelegraphKind>
  previousImpactedHexes: Axial[]
  // Whether the Beat that produced `previousImpactedHexes` was fully absorbed —
  // the same predicate that grants Riposte Ready: a Tank Hit taken on the
  // Guarded Front for zero Health loss. `hazard_last_impact` reads it to decide
  // *where* the spill lands, never whether it lands (D-039).
  previousImpactAbsorbed: boolean
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
