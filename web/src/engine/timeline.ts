import { emptyHexes, facingToward, firstEmptyHexes, forwardCone, frontArc } from './board'
import { containsHex, hexKey, type Axial } from './hex'
import type { BossBeat, BossProgram } from './content/schemas'
import type { ContentCatalog } from './content/catalog'
import type { EncounterActionInput } from './actions'
import type { EncounterState } from './types'

export function currentProgram(catalog: ContentCatalog, state: EncounterState): BossProgram | null {
  if (state.currentProgramId === null) {
    return null
  }
  return catalog.programs[state.currentProgramId] ?? null
}

export function actionsForTrack(catalog: ContentCatalog, state: EncounterState, track: 'instant' | 'incoming'): EncounterActionInput[] {
  const program = currentProgram(catalog, state)
  if (!program) {
    return []
  }
  const beats = track === 'instant' ? program.instant_beats : program.incoming_beats
  return beats.map((beat) => ({ kind: 'resolve_boss', sourceId: state.bossId, beat, track }))
}

function nextMinionId(draft: EncounterState): string {
  draft.minionSequence += 1
  return `whelp_${draft.minionSequence}`
}

// Authored Boss Beat resolution (ADR 0016 carried over): the spatial rule for
// each Beat kind and its conversion into generated actions live together here.
export function resolveBossBeat(
  draft: EncounterState,
  bossId: string,
  beat: BossBeat,
  track: 'instant' | 'incoming' | '',
): EncounterActionInput[] {
  const boss = draft.board.entities[bossId]
  const bossCoords = boss?.coords ?? { q: 999, r: 999 }
  const bossFacing = boss?.facing ?? 0
  const playerCoords = draft.board.entities[draft.primaryHeroId]?.coords ?? { q: 999, r: 999 }
  let patternHexes: Axial[] = []
  const impactedHexes: Axial[] = []
  let playerDamage = 0
  let scorchedHexes: Axial[] = []
  let scorchedDurationRounds = 0
  let spawnHexes: Axial[] = []
  switch (beat.kind) {
    case 'turn_toward_player':
      if (boss) {
        boss.facing = facingToward(bossCoords, playerCoords, bossFacing)
      }
      break
    case 'raking_claw':
      patternHexes = frontArc(draft.board.hexes, bossCoords, bossFacing)
      playerDamage = beat.damage
      impactedHexes.push(playerCoords)
      break
    case 'scorch_last_pattern':
      scorchedHexes = [...draft.previousImpactedHexes]
      scorchedDurationRounds = beat.duration_rounds
      break
    case 'cinder_breath':
      patternHexes = forwardCone(draft.board.hexes, bossCoords, bossFacing)
      if (containsHex(patternHexes, playerCoords)) {
        playerDamage = beat.damage
        impactedHexes.push(playerCoords)
      }
      scorchedHexes = [...patternHexes]
      scorchedDurationRounds = beat.duration_rounds
      break
    case 'brood_call':
      spawnHexes = [...draft.telegraphedSpawnHexes]
      if (spawnHexes.length === 0) {
        spawnHexes = firstEmptyHexes(draft.broodSpawnCandidates, emptyHexes(draft.board), beat.count)
      }
      break
    case 'warning':
      break
  }
  draft.lastPattern = [...patternHexes]
  if (impactedHexes.length > 0 || beat.kind === 'raking_claw') {
    draft.previousImpactedHexes = [...impactedHexes]
  }
  const actions: EncounterActionInput[] = []
  if (playerDamage > 0) {
    const factContext: Record<string, unknown> = {
      boss_beat_id: beat.id,
      boss_track: track,
    }
    if (beat.target_selector !== '') {
      factContext.target_selector = beat.target_selector
    }
    if (beat.damage_classification !== '') {
      factContext.damage_classification = beat.damage_classification
    }
    actions.push({
      kind: 'damage',
      sourceId: bossId,
      targetId: draft.primaryHeroId,
      amount: playerDamage,
      reasonText: beat.title,
      factContext,
    })
  }
  for (const coords of scorchedHexes) {
    actions.push({
      kind: 'apply_hazard',
      sourceId: bossId,
      coords,
      hazardId: beat.hazard ?? null,
      fallbackDurationRounds: scorchedDurationRounds,
    })
  }
  for (const coords of spawnHexes) {
    actions.push({
      kind: 'spawn_minion',
      sourceId: bossId,
      minionId: nextMinionId(draft),
      coords,
      minionContentId: beat.minion,
    })
  }
  return actions
}

// Telegraphs preview the current program's Incoming Row: the breath cone from
// the Boss's present facing, and the spawn hexes a Brood Call will use.
export function refreshTelegraphs(catalog: ContentCatalog, draft: EncounterState): void {
  draft.telegraphs = {}
  draft.telegraphedSpawnHexes = []
  const program = currentProgram(catalog, draft)
  const boss = draft.board.entities[draft.bossId]
  if (!program || draft.bossId === '' || !boss) {
    return
  }
  for (const beat of program.incoming_beats) {
    switch (beat.kind) {
      case 'cinder_breath':
        for (const coords of forwardCone(draft.board.hexes, boss.coords, boss.facing, 2)) {
          draft.telegraphs[hexKey(coords)] = 'breath'
        }
        break
      case 'brood_call':
        for (const coords of draft.broodSpawnCandidates) {
          if (draft.telegraphedSpawnHexes.length >= beat.count) {
            break
          }
          const key = hexKey(coords)
          if (draft.board.hexes[key] && !Object.values(draft.board.entities).some((entity) => hexKey(entity.coords) === key)) {
            draft.telegraphedSpawnHexes.push(coords)
            draft.telegraphs[key] = 'brood'
          }
        }
        break
      default:
        break
    }
  }
}

export function advanceProgram(draft: EncounterState): void {
  if (draft.programIds.length === 0) {
    draft.programIndex = 0
    draft.currentProgramId = null
  } else if (draft.loopPrograms) {
    draft.programIndex = (draft.programIndex + 1) % draft.programIds.length
    draft.currentProgramId = draft.programIds[draft.programIndex]
  } else {
    draft.programIndex += 1
    draft.currentProgramId = draft.programIndex < draft.programIds.length ? draft.programIds[draft.programIndex] : null
  }
}
