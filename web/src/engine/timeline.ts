import { emptyHexes, facingToward, firstEmptyHexes, forwardCone, frontArc, isGuardedFront } from './board'
import { escalationModifiers } from './escalation'
import { normalizeFacing } from './facing'
import { containsHex, hexKey, type Axial } from './hex'
import { shuffle, type RngState } from './rng'
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
  let unguardedBonusApplied = 0
  // Escalation Thresholds apply at read time (ADR 0027), so they need no
  // separate mutation and take effect from the Round after the value rose.
  const escalated = escalationModifiers(draft)
  switch (beat.kind) {
    case 'turn_toward_player':
      if (boss) {
        boss.facing = facingToward(bossCoords, playerCoords, bossFacing)
      }
      break
    case 'targeted_hit':
      patternHexes = frontArc(draft.board.hexes, bossCoords, bossFacing)
      playerDamage = beat.damage
      // Authored counter-pressure (D-017): the targeted hit cannot be evaded,
      // and an unheld Guarded Front suffers the beat's unguarded bonus.
      if (beat.unguarded_bonus > 0 && !isGuardedFront(draft.board, bossId, draft.primaryHeroId)) {
        unguardedBonusApplied = beat.unguarded_bonus
        playerDamage += unguardedBonusApplied
      }
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
        spawnHexes = firstEmptyHexes(draft.broodSpawnCandidates, emptyHexes(draft.board), beat.count + escalated.extraSpawnCount)
      }
      break
    case 'warning':
      break
  }
  draft.lastPattern = [...patternHexes]
  // Only a Beat that actually connected rewrites the remembered impact, so a
  // Cinder Breath the Hero stepped clear of leaves the previous hit's hex
  // standing for `scorch_last_pattern` to burn. A miss is not an impact of
  // zero hexes; it is no impact at all, and Ash Trail still has its target.
  if (impactedHexes.length > 0) {
    draft.previousImpactedHexes = [...impactedHexes]
  }
  const actions: EncounterActionInput[] = []
  let escalationBonusApplied = 0
  if (playerDamage > 0 && escalated.bossDamageBonus > 0) {
    escalationBonusApplied = escalated.bossDamageBonus
    playerDamage += escalationBonusApplied
  }
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
    if (unguardedBonusApplied > 0) {
      factContext.unguarded_bonus = unguardedBonusApplied
    }
    if (escalationBonusApplied > 0) {
      factContext.escalation_bonus = escalationBonusApplied
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
      case 'brood_call': {
        // The telegraph must not lie: it previews the escalated count.
        const count = beat.count + escalationModifiers(draft).extraSpawnCount
        for (const coords of draft.broodSpawnCandidates) {
          if (draft.telegraphedSpawnHexes.length >= count) {
            break
          }
          const key = hexKey(coords)
          if (draft.board.hexes[key] && !Object.values(draft.board.entities).some((entity) => hexKey(entity.coords) === key)) {
            draft.telegraphedSpawnHexes.push(coords)
            draft.telegraphs[key] = 'brood'
          }
        }
        break
      }
      default:
        break
    }
  }
}

// Is the authored Phase Trigger satisfied as this Round opens? Either half
// fires it, and the two are not interchangeable: a health-only trigger never
// fires against a slow deck, and a round-only trigger never rewards a fast
// one (ADR 0023). Read at the Round boundary rather than watched during play,
// which is what makes "a trigger reached during a player window takes effect
// after the current Round finishes" true by construction rather than by a
// flag someone has to remember to clear.
export function phaseBreakDue(state: EncounterState, round: number): boolean {
  if (state.phaseTrigger === null || state.bossPhase !== 1 || state.phaseTwoProgramIds.length === 0) {
    return false
  }
  const boss = state.board.entities[state.bossId]
  const byHealth =
    state.phaseTrigger.bossHealthAtOrBelow !== null && boss !== undefined && boss.health <= state.phaseTrigger.bossHealthAtOrBelow
  const byRound = state.phaseTrigger.roundAtOrAfter !== null && round >= state.phaseTrigger.roundAtOrAfter
  return byHealth || byRound
}

// Molting Roar, as authored in embermaw-ashen-trial-design.md: Embermaw sheds
// its brittle scales, turns one hex edge clockwise, and keeps every Whelp and
// every Scorched hex already on the board. The break deals no damage of its
// own — it is a readability beat that changes what the board means, not a hit
// the party has to survive.
// The order the Boss runs its programs in, resolved once from the encounter
// seed (D-037). Two properties matter and they pull against each other.
//
// Index 0 is the authored opener, pinned. Round 1 is the teaching Round and the
// one Round the Forecast Row can never have disclosed (ADR 0026), so it must
// stay the Round the author chose — and it is why the first program of every
// phase has to be free of `severe` Beats.
//
// Everything after it is drawn in bags: shuffle the whole pool, deal it out,
// shuffle again. A bag keeps each program appearing about as often as an
// authored rotation would, so this changes *when* a demand lands without
// changing how much of it the fight contains.
export function buildProgramSequence(rng: RngState, pool: string[], length: number, label: string): string[] {
  if (pool.length === 0) {
    return []
  }
  const sequence = [pool[0]]
  const remainder = pool.slice(1)
  shuffle(rng, remainder, `${label}_opening`)
  sequence.push(...remainder)
  while (sequence.length < length) {
    const bag = [...pool]
    shuffle(rng, bag, label)
    // No back-to-back repeat across a bag boundary: the same program twice in a
    // row reads as the rotation having stalled rather than varied. Applied only
    // to pools of three or more — with two programs the rule is not a
    // safeguard, it forces strict alternation and removes the variance this
    // function exists to add.
    if (pool.length > 2 && bag[0] === sequence[sequence.length - 1]) {
      const swapped = bag[1]
      bag[1] = bag[0]
      bag[0] = swapped
    }
    for (const programId of bag) {
      if (sequence.length >= length) {
        break
      }
      sequence.push(programId)
    }
  }
  return sequence
}

export function applyPhaseBreak(draft: EncounterState): void {
  draft.bossPhase += 1
  draft.programIds = [...draft.phaseTwoProgramIds]
  draft.programSequence = [...draft.phaseTwoSequence]
  draft.programIndex = 0
  draft.currentProgramId = draft.programSequence[0] ?? null
  const boss = draft.board.entities[draft.bossId]
  if (boss) {
    // Facings run counter-clockwise from E, so one edge clockwise is one step
    // back around the ring.
    boss.facing = normalizeFacing(boss.facing - 1)
  }
}

// Walking a sequence that was already resolved, so there is no randomness and
// no modulo here: the Round boundary only steps a cursor. Running off the end
// leaves no program, which is the same thing a non-looping encounter did before.
export function advanceProgram(draft: EncounterState): void {
  if (draft.programSequence.length === 0) {
    draft.programIndex = 0
    draft.currentProgramId = null
    return
  }
  draft.programIndex += 1
  draft.currentProgramId = draft.programSequence[draft.programIndex] ?? null
}
