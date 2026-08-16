import type { Axial, ContentCatalog, EncounterState, ResolvedActionFact } from '@/engine'

// Resolution Facts are the only thing the board animates from. Every beat of
// motion on the board — a lunge, a hit, a step, a spawn — is derived from a
// fact the rules already recorded, so the board can never show a blow the
// Encounter did not resolve (ADR 0019: Phaser owns no game state).

export type EffectTone = 'hero' | 'boss' | 'guard' | 'heal' | 'hazard'

export type BoardEffectKind = 'strike' | 'cast' | 'hit' | 'block' | 'move' | 'spawn' | 'defeat' | 'blast' | 'scorch'

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
  const value = fact.detail[key] as Axial | undefined
  return value && typeof value.q === 'number' && typeof value.r === 'number' ? { q: value.q, r: value.r } : null
}

// The hexes the Boss had already marked before this batch resolved: the
// breath cone the player was given a window to leave.
function telegraphedBreath(state: EncounterState): Axial[] {
  return Object.entries(state.telegraphs)
    .filter(([, kind]) => kind === 'breath')
    .map(([key]) => {
      const [q, r] = key.split(',').map(Number)
      return { q, r }
    })
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

  for (const fact of facts) {
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
        if (card.boss_damage > 0 || card.damage > 0) {
          const targetId = detailString(fact, 'targetId')
          const toward = (targetId !== '' ? coordsOf(before, targetId) : bossCoords) ?? bossCoords ?? undefined
          effects.push({ kind: 'strike', entityId: fact.sourceId, at: from, toward: toward ?? undefined, tone: 'hero' })
          break
        }
        // A guard or a heal has no target to lunge at: it reads as a pulse
        // on the Hero, labelled with what the Encounter actually granted.
        const armorGained = (after.heroes[fact.sourceId]?.armor ?? 0) - (before.heroes[fact.sourceId]?.armor ?? 0)
        const healed = (after.heroes[fact.sourceId]?.health ?? 0) - (before.heroes[fact.sourceId]?.health ?? 0)
        const tone: EffectTone = healed > 0 && armorGained <= 0 ? 'heal' : 'guard'
        const label = healed > 0 && armorGained <= 0 ? `+${healed}` : armorGained > 0 ? `+${armorGained}` : undefined
        effects.push({ kind: 'cast', entityId: fact.sourceId, at: from, label, tone })
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
          effects.push({ kind: 'block', entityId: targetId, at, label: `${prevented} blocked`, tone: 'guard' })
        } else {
          effects.push({
            kind: 'hit',
            entityId: targetId,
            at,
            label: `-${healthLoss}`,
            tone: fromBoss ? 'boss' : 'hero',
          })
        }
        if (fact.resolutionFact?.target_removed === true) {
          effects.push({ kind: 'defeat', entityId: targetId, at, tone: 'hero' })
        }
        break
      }

      case 'resolve_boss': {
        const beatId = detailString(fact, 'beatId')
        const beat = beatId === '' ? undefined : findBeat(catalog, before, beatId)
        if (!beat || !bossCoords) {
          break
        }
        if (beat.kind === 'raking_claw') {
          effects.push({ kind: 'strike', entityId: before.bossId, at: bossCoords, toward: heroCoords ?? undefined, tone: 'boss' })
        } else if (beat.kind === 'cinder_breath') {
          const hexes = telegraphedBreath(before)
          if (hexes.length > 0) {
            effects.push({ kind: 'blast', entityId: before.bossId, at: bossCoords, hexes, tone: 'hazard' })
          }
        }
        break
      }

      case 'move_hero': {
        const destination = detailAxial(fact, 'destination')
        const origin = coordsOf(before, fact.sourceId)
        if (destination && origin) {
          effects.push({ kind: 'move', entityId: fact.sourceId, at: destination, from: origin, tone: 'hero' })
        }
        break
      }

      case 'spawn_minion': {
        const coords = detailAxial(fact, 'coords')
        if (coords) {
          effects.push({ kind: 'spawn', entityId: detailString(fact, 'minionId'), at: coords, tone: 'boss' })
        }
        break
      }

      case 'apply_hazard': {
        const coords = detailAxial(fact, 'coords')
        if (coords) {
          effects.push({ kind: 'scorch', entityId: '', at: coords, tone: 'hazard' })
        }
        break
      }

      default:
        break
    }
  }
  return effects
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
