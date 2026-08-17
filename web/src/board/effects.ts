import { parseHexKey, type Axial, type ContentCatalog, type EncounterState, type ResolvedActionFact } from '@/engine'

// Resolution Facts are the only thing the board animates from. Every beat of
// motion on the board — a lunge, a hit, a step, a spawn — is derived from a
// fact the rules already recorded, so the board can never show a blow the
// Encounter did not resolve (ADR 0019: Phaser owns no game state).

export type EffectTone = 'hero' | 'boss' | 'guard' | 'heal' | 'hazard'

export type BoardEffectKind = 'strike' | 'cast' | 'hit' | 'block' | 'move' | 'spawn' | 'defeat' | 'blast' | 'scorch' | 'turn'

// How far apart consecutive Boss Beats start. The rules resolve a whole
// track in one batch; the board replays that batch one beat at a time so
// the player can follow each step of the program in order.
export const BEAT_STAGGER_MS = 700

// How long after the last beat starts before staggered presentation (the
// HUD's gauge overrides) settles back onto the authoritative state: the
// longest single effect duration (BoardScene's EFFECT_DURATION.blast —
// change them together), so nothing is reclaimed mid-animation.
export const EFFECT_SETTLE_MS = 560

export interface BoardEffect {
  kind: BoardEffectKind
  // The piece the motion attaches to, when there is one on the board.
  entityId: string
  // Where the effect is drawn.
  at: Axial
  // The piece a lunge leans toward, or the hex a step came from.
  toward?: Axial
  from?: Axial
  hexes?: Axial[]
  // Short floating text: a damage number, an armor gain, "BLOCK".
  label?: string
  tone: EffectTone
  // The facing a 'turn' swings from; it lands on the snapshot's facing.
  fromFacing?: number
  // Milliseconds after the batch lands before this effect begins.
  delay?: number
}

function coordsOf(state: EncounterState, entityId: string): Axial | null {
  return state.board.entities[entityId]?.coords ?? null
}

function numberFrom(source: Record<string, unknown> | undefined, key: string): number {
  const value = source?.[key]
  return typeof value === 'number' ? value : 0
}

function detailString(fact: ResolvedActionFact, key: string): string {
  const value = fact.detail[key]
  return typeof value === 'string' ? value : ''
}

function detailAxial(fact: ResolvedActionFact, key: string): Axial | null {
  return axialFrom(fact.detail, key)
}

function detailAxials(fact: ResolvedActionFact, key: string): Axial[] {
  const value = fact.detail[key]
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((candidate) => {
    const axial = candidate as Partial<Axial>
    return typeof axial?.q === 'number' && typeof axial.r === 'number' ? [{ q: axial.q, r: axial.r }] : []
  })
}

function axialFrom(source: Record<string, unknown> | undefined, key: string): Axial | null {
  const value = source?.[key] as Axial | undefined
  return value && typeof value.q === 'number' && typeof value.r === 'number' ? { q: value.q, r: value.r } : null
}

// The hexes the Boss had already marked before this batch resolved: the cone
// the player was given a window to leave.
function telegraphedCone(state: EncounterState): Axial[] {
  return Object.entries(state.telegraphs)
    .filter(([, kind]) => kind === 'cone')
    .map(([key]) => parseHexKey(key))
}

// Translates one resolved batch into the effects the board should play.
// `before` is the state the batch started from, `after` the state it
// produced; pieces that died mid-batch are still locatable in `before`.
export function deriveBoardEffects(
  catalog: ContentCatalog,
  before: EncounterState,
  after: EncounterState,
  facts: ResolvedActionFact[],
): BoardEffect[] {
  const effects: BoardEffect[] = []
  const bossCoords = coordsOf(before, before.bossId)
  const heroCoords = coordsOf(before, before.primaryHeroId)

  let delay = 0
  const add = (effect: BoardEffect) => effects.push(delay > 0 ? { ...effect, delay } : effect)

  for (const [fact, factDelay] of factsWithBeatDelays(facts)) {
    delay = factDelay
    if (!fact.succeeded) {
      continue
    }
    switch (fact.kind) {
      case 'fire_slot': {
        const slotIndex = typeof fact.detail.slotIndex === 'number' ? fact.detail.slotIndex : -1
        const topCard = before.heroes[fact.sourceId]?.actionBar[slotIndex]?.topCard
        const card = topCard ? catalog.cards[topCard.cardId] : undefined
        const from = coordsOf(before, fact.sourceId)
        if (!card || !from) {
          break
        }
        if (card.boss_damage > 0 || card.damage > 0 || card.push_tiles > 0 || card.pull_tiles > 0) {
          const targetId = detailString(fact, 'targetId')
          const burstCenter = detailAxial(fact, 'burstCenter')
          const toward = burstCenter ?? (targetId !== '' ? coordsOf(before, targetId) : bossCoords) ?? bossCoords ?? undefined
          add({ kind: 'strike', entityId: fact.sourceId, at: from, toward: toward ?? undefined, tone: 'hero' })
          const burstHexes = detailAxials(fact, 'burstHexes')
          if (burstCenter && burstHexes.length > 0) {
            add({ kind: 'blast', entityId: fact.sourceId, at: burstCenter, hexes: burstHexes, tone: 'hero' })
          }
          break
        }
        // A guard or a heal has no target to lunge at: it reads as a pulse
        // on the Hero, labelled with what the Encounter actually granted.
        const armorGained = (after.heroes[fact.sourceId]?.armor ?? 0) - (before.heroes[fact.sourceId]?.armor ?? 0)
        const healed = (after.heroes[fact.sourceId]?.health ?? 0) - (before.heroes[fact.sourceId]?.health ?? 0)
        const tone: EffectTone = healed > 0 && armorGained <= 0 ? 'heal' : 'guard'
        const label = healed > 0 && armorGained <= 0 ? `+${healed}` : armorGained > 0 ? `+${armorGained}` : undefined
        add({ kind: 'cast', entityId: fact.sourceId, at: from, label, tone })
        break
      }

      case 'damage': {
        const targetId = detailString(fact, 'targetId')
        const at = coordsOf(after, targetId) ?? coordsOf(before, targetId)
        if (!at) {
          break
        }
        const fromBoss = fact.sourceId === before.bossId || fact.sourceId === 'hazard'
        const healthLoss = numberFrom(fact.resolutionFact, 'health_loss')
        const prevented = numberFrom(fact.resolutionFact, 'prevented')
        if (healthLoss === 0 && prevented > 0) {
          add({ kind: 'block', entityId: targetId, at, label: `${prevented} blocked`, tone: 'guard' })
        } else {
          add({
            kind: 'hit',
            entityId: targetId,
            at,
            label: `-${healthLoss}`,
            tone: fromBoss ? 'boss' : 'hero',
          })
        }
        if (fact.resolutionFact?.target_removed === true) {
          add({ kind: 'defeat', entityId: targetId, at, tone: 'hero' })
        }
        break
      }

      case 'resolve_boss': {
        const beatId = detailString(fact, 'beatId')
        const beat = beatId === '' ? undefined : findBeat(catalog, before, beatId)
        if (!bossCoords) {
          break
        }
        // The beat announces itself: the Boss pulses and the beat's name
        // floats up, tying each moment of feedback to a chip on the strip.
        const title = detailString(fact, 'beatTitle') !== '' ? detailString(fact, 'beatTitle') : (beat?.title ?? '')
        add({ kind: 'cast', entityId: before.bossId, at: bossCoords, label: title === '' ? undefined : title, tone: 'boss' })
        if (beat?.kind === 'turn_toward_player') {
          const fromFacing = before.board.entities[before.bossId]?.facing
          const toFacing = after.board.entities[before.bossId]?.facing
          if (fromFacing !== undefined && toFacing !== undefined && fromFacing !== toFacing) {
            add({ kind: 'turn', entityId: before.bossId, at: bossCoords, fromFacing, tone: 'boss' })
          }
        } else if (beat?.kind === 'targeted_hit') {
          add({ kind: 'strike', entityId: before.bossId, at: bossCoords, toward: heroCoords ?? undefined, tone: 'boss' })
        } else if (beat?.kind === 'forward_cone') {
          const hexes = telegraphedCone(before)
          if (hexes.length > 0) {
            add({ kind: 'blast', entityId: before.bossId, at: bossCoords, hexes, tone: 'hazard' })
          }
        }
        break
      }

      case 'move_hero': {
        const destination = detailAxial(fact, 'destination')
        const origin = coordsOf(before, fact.sourceId)
        if (destination && origin) {
          add({ kind: 'move', entityId: fact.sourceId, at: destination, from: origin, tone: 'hero' })
        }
        break
      }

      case 'displace_piece': {
        const from = axialFrom(fact.resolutionFact, 'from')
        const to = axialFrom(fact.resolutionFact, 'to')
        const targetId = detailString(fact, 'targetId')
        if (from && to && targetId !== '' && numberFrom(fact.resolutionFact, 'actual_distance') > 0) {
          add({ kind: 'move', entityId: targetId, at: to, from, tone: 'hero' })
        }
        break
      }

      case 'spawn_minion': {
        const coords = detailAxial(fact, 'coords')
        if (coords) {
          add({ kind: 'spawn', entityId: detailString(fact, 'minionId'), at: coords, tone: 'boss' })
        }
        break
      }

      case 'apply_hazard': {
        const coords = detailAxial(fact, 'coords')
        if (coords) {
          add({ kind: 'scorch', entityId: '', at: coords, tone: 'hazard' })
        }
        break
      }

      default:
        break
    }
  }
  return effects
}

// Facts arrive depth-first: each top-level `resolve_boss` fact is followed
// by everything that beat generated. Every beat claims the next stagger
// slot before anything it shows — even a beat with no motion of its own (a
// warning) takes its moment — and its children ride that slot, so a boss
// track plays out sequentially instead of as one simultaneous burst. Facts
// outside any beat carry no delay.
function* factsWithBeatDelays(facts: ResolvedActionFact[]): Generator<[ResolvedActionFact, number]> {
  let delay = 0
  let beatsSeen = 0
  for (const fact of facts) {
    if (fact.kind === 'resolve_boss' && fact.depth === 0 && fact.succeeded) {
      delay = beatsSeen * BEAT_STAGGER_MS
      beatsSeen += 1
    }
    yield [fact, delay]
  }
}

// A gauge's staggered value: the health (and, for heroes, armor) a bar
// should show once a beat's damage lands.
export interface HealthPlayoutValue {
  health: number
  armor: number | null
}

export interface HealthPlayoutStep {
  delay: number
  entityId: string
  value: HealthPlayoutValue
}

export interface HealthPlayout {
  // What every affected gauge shows the moment the batch lands: its value
  // before any staggered damage (delay-zero damage is already folded in).
  initial: Record<string, HealthPlayoutValue>
  steps: HealthPlayoutStep[]
}

// One moment of a batch's playout: a Boss Beat (or the single moment of a
// beatless batch) with everything it shows and the gauge values its damage
// leaves behind. Moments play one at a time — the player steps between them.
export interface PlayoutMoment {
  beatId: string | null
  beatTitle: string | null
  effects: BoardEffect[]
  gauges: Record<string, HealthPlayoutValue>
}

export interface PlayoutScript {
  // What every affected gauge shows the moment the batch lands.
  initial: Record<string, HealthPlayoutValue>
  moments: PlayoutMoment[]
  // True when the batch ended the Encounter: the outcome reveal (banner,
  // Restart control) waits for the last moment to finish playing.
  endsEncounter: boolean
}

// Regroups a batch's derived feedback into one moment per Boss Beat, in
// program order, using the same stagger slots the delays encode. Returns
// null for a batch with no beats that didn't end the Encounter — immediate
// player feedback needs no script. `effects` must be this batch's
// deriveBoardEffects output.
export function derivePlayoutScript(
  before: EncounterState,
  after: EncounterState,
  facts: ResolvedActionFact[],
  effects: BoardEffect[],
): PlayoutScript | null {
  const beats = facts
    .filter((fact) => fact.kind === 'resolve_boss' && fact.depth === 0 && fact.succeeded)
    .map((fact) => ({ id: detailString(fact, 'beatId'), title: detailString(fact, 'beatTitle') }))
  const endsEncounter = before.active && !after.active
  if (beats.length === 0 && !endsEncounter) {
    return null
  }
  const moments: PlayoutMoment[] =
    beats.length > 0
      ? beats.map((beat) => ({
          beatId: beat.id === '' ? null : beat.id,
          beatTitle: beat.title === '' ? null : beat.title,
          effects: [],
          gauges: {},
        }))
      : [{ beatId: null, beatTitle: null, effects: [], gauges: {} }]
  const slotFor = (delay: number | undefined) => Math.min(Math.round((delay ?? 0) / BEAT_STAGGER_MS), moments.length - 1)
  for (const effect of effects) {
    const clone = { ...effect }
    delete clone.delay
    moments[slotFor(effect.delay)].effects.push(clone)
  }
  const playout = deriveHealthPlayout(before, after, facts)
  for (const step of playout?.steps ?? []) {
    // Later steps for the same entity overwrite earlier ones within a
    // moment; across moments each keeps its own landing value.
    moments[slotFor(step.delay)].gauges[step.entityId] = step.value
  }
  return { initial: playout?.initial ?? {}, moments, endsEncounter }
}

function valueBefore(state: EncounterState, entityId: string): HealthPlayoutValue {
  const hero = state.heroes[entityId]
  if (hero) {
    return { health: hero.health, armor: hero.armor }
  }
  return { health: state.board.entities[entityId]?.health ?? 0, armor: null }
}

// Derives the gauges' staggered timeline from the same beat slots the board
// plays: bars hold their pre-batch values and step down as each beat's
// damage lands. Health steps are exact (each damage fact records its health
// loss); armor drain is approximated from the fact's prevented total, so
// the final step per entity lands on the batch's true end state. Returns
// null when nothing is staggered — player-action feedback stays immediate.
export function deriveHealthPlayout(before: EncounterState, after: EncounterState, facts: ResolvedActionFact[]): HealthPlayout | null {
  const initial: Record<string, HealthPlayoutValue> = {}
  const current: Record<string, HealthPlayoutValue> = {}
  const steps: HealthPlayoutStep[] = []
  for (const [fact, delay] of factsWithBeatDelays(facts)) {
    if (fact.kind !== 'damage' || !fact.succeeded) {
      continue
    }
    const targetId = detailString(fact, 'targetId')
    if (targetId === '') {
      continue
    }
    const prior = current[targetId] ?? valueBefore(before, targetId)
    const healthLoss = numberFrom(fact.resolutionFact, 'health_loss')
    const prevented = numberFrom(fact.resolutionFact, 'prevented')
    const next: HealthPlayoutValue = {
      health: Math.max(prior.health - healthLoss, 0),
      armor: prior.armor === null ? null : Math.max(prior.armor - prevented, 0),
    }
    current[targetId] = next
    if (delay > 0) {
      initial[targetId] ??= prior
      steps.push({ delay, entityId: targetId, value: next })
    }
  }
  if (steps.length === 0) {
    return null
  }
  // Land each entity's last step on the state's true values.
  const lastStep = new Map<string, HealthPlayoutStep>()
  for (const step of steps) {
    lastStep.set(step.entityId, step)
  }
  for (const [entityId, step] of lastStep) {
    const hero = after.heroes[entityId]
    step.value = hero
      ? { health: hero.health, armor: hero.armor }
      : { health: after.board.entities[entityId]?.health ?? step.value.health, armor: null }
  }
  return { initial, steps }
}

function findBeat(catalog: ContentCatalog, state: EncounterState, beatId: string) {
  for (const programId of state.programIds) {
    const program = catalog.programs[programId]
    const beat = program?.instant_beats.find((entry) => entry.id === beatId) ?? program?.incoming_beats.find((entry) => entry.id === beatId)
    if (beat) {
      return beat
    }
  }
  return undefined
}

// The lowest vertical lane not held by another live label at the same hex,
// so two floaters spawning at one point never overprint. Beats that resolve
// at the Boss in quick succession — Turn to the Tank, Raking Claw, Ash Trail
// — each spawn a title there; stacked, each stays readable and the order is
// legible, older below and newer above. Pure so the scene need not exist to
// prove it.
export function freeFloaterLane(live: { label?: string; at: Axial; lane: number }[], at: Axial): number {
  const taken = new Set<number>()
  for (const other of live) {
    if (other.label !== undefined && other.at.q === at.q && other.at.r === at.r) {
      taken.add(other.lane)
    }
  }
  let lane = 0
  while (taken.has(lane)) {
    lane += 1
  }
  return lane
}
