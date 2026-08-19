import { emptyHexes, facingToward, firstEmptyHexes, forwardCone, frontArc, isGuardedFront, neighbors } from './board'
import { escalationModifiers } from './escalation'
import { combatantRef } from './counters'
import { normalizeFacing } from './facing'
import { containsHex, hexDistance, hexKey, type Axial } from './hex'
import { randiRange, shuffle, type RngState } from './rng'
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

// Entity ids are derived from the authored Minion rather than hardcoded, so a
// second Minion type does not spawn as `whelp_3`. Embermaw's Whelp is content
// id `whelp`, so today this produces exactly the ids it always did.
function nextMinionId(draft: EncounterState, minionContentId: string | undefined): string {
  draft.minionSequence += 1
  return `${minionContentId ?? 'minion'}_${draft.minionSequence}`
}

// Where a fully absorbed hit's ash falls: a neighbouring hex strictly further
// from the Boss, preferring ground that is not already burnt so the spill costs
// a real hex rather than being wasted on one already gone.
//
// At the board edge there is no such hex, and the ash lands under the Tank
// after all. That is deliberate: backed against the rim, absorbing cleanly no
// longer buys anything, which is the bleed refusing to stop.
function spillAwayFrom(draft: EncounterState, from: Axial, bossCoords: Axial): Axial {
  const away = neighbors(draft.board.hexes, from).filter(
    (coords) => hexDistance(coords, bossCoords) > hexDistance(from, bossCoords),
  )
  if (away.length === 0) {
    return from
  }
  const clean = away.filter((coords) => (draft.board.hazards[hexKey(coords)] ?? []).length === 0)
  return (clean.length > 0 ? clean : away)[0]
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
  let advanceTiles = 0
  // Escalation Thresholds apply at read time (ADR 0027), so they need no
  // separate mutation and take effect from the Round after the value rose.
  const escalated = escalationModifiers(draft)
  switch (beat.kind) {
    case 'turn_toward_player':
      if (boss) {
        boss.facing = facingToward(bossCoords, playerCoords, bossFacing)
      }
      break
    // The answer to standing out of reach: distance stops being a decision the
    // Hero makes once and becomes one they have to keep re-making. Emitted as a
    // displacement so ADR 0029's geometry, occupancy, edge handling and Hazard
    // entry all apply unchanged — occupancy is also what stops the Boss cleanly
    // when it reaches the Hero, with no special melee case.
    case 'advance_toward_player':
      advanceTiles = beat.move_tiles
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
    // Named for the field it actually reads. `scorch_last_pattern` claimed
    // `lastPattern` — the telegraphed shape — when it has always used
    // `previousImpactedHexes`, where a Beat connected. The two differ exactly
    // when a pattern misses, which is the case the guard below exists for.
    case 'hazard_last_impact':
      // Displace, never prevent (D-039). A hit the Tank absorbed cleanly still
      // spills — the arena loses the same number of hexes however well the
      // Tank plays — but it spills behind them instead of under them, so the
      // ground they have to stand on to keep absorbing survives longer. That
      // is Tank Principle 1 applied to standing room rather than Health:
      // perfect play changes the shape of the loss, never the total.
      scorchedHexes = draft.previousImpactAbsorbed
        ? draft.previousImpactedHexes.map((coords) => spillAwayFrom(draft, coords, bossCoords))
        : [...draft.previousImpactedHexes]
      scorchedDurationRounds = beat.duration_rounds
      break
    case 'forward_cone':
      patternHexes = forwardCone(draft.board.hexes, bossCoords, bossFacing, beat.range_tiles)
      if (containsHex(patternHexes, playerCoords)) {
        playerDamage = beat.damage
        impactedHexes.push(playerCoords)
      }
      scorchedHexes = [...patternHexes]
      scorchedDurationRounds = beat.duration_rounds
      break
    case 'spawn_minions':
      spawnHexes = [...draft.telegraphedSpawnHexes]
      if (spawnHexes.length === 0) {
        spawnHexes = firstEmptyHexes(draft.spawnCandidates, emptyHexes(draft.board), beat.count + escalated.extraSpawnCount)
      }
      break
    // Resolves to nothing at Beat time: its whole effect is the demand it
    // leaves standing at the Round end, which `escalationActionsForRoundEnd`
    // prices. It is the only Beat kind that does nothing when it plays, and it
    // earns that by doing something later — which is why the `warning` kind,
    // whose effect was nothing at any point, is gone (D-054).
    case 'demand_proximity':
      break
    // Placement rides an action below, so this arm only has to not fall
    // through to a pattern it does not have.
    case 'place_counter':
      break
  }
  draft.lastPattern = [...patternHexes]
  // Only a Beat that actually connected rewrites the remembered impact, so a
  // Cinder Breath the Hero stepped clear of leaves the previous hit's hex
  // standing for `hazard_last_impact` to burn. A miss is not an impact of
  // zero hexes; it is no impact at all, and Ash Trail still has its target.
  if (impactedHexes.length > 0) {
    draft.previousImpactedHexes = [...impactedHexes]
    // Assume it hurt. The damage this Beat generates has not resolved yet, so
    // Armor cannot have spoken; the flag flips only if the hit is later fully
    // absorbed, which happens before the next Beat reads it.
    draft.previousImpactAbsorbed = false
  }
  const actions: EncounterActionInput[] = []
  // The Boss marking something (D-051). `self` is pressure the party watches
  // accrue and may choose to spend cards suppressing; `hero` is the Boss
  // marking the Party, which is the direction Counters could not previously
  // run.
  if (beat.kind === 'place_counter' && beat.counter !== '') {
    actions.push({
      kind: 'place_counter',
      sourceId: bossId,
      hostRef: combatantRef(beat.counter_target === 'hero' ? draft.primaryHeroId : bossId),
      counterId: beat.counter,
      amount: beat.counter_amount,
      reasonText: beat.title,
    })
  }
  if (advanceTiles > 0) {
    actions.push({
      kind: 'displace_piece',
      sourceId: draft.primaryHeroId,
      targetId: bossId,
      distance: advanceTiles,
      movement: 'advance',
      reasonText: beat.title,
    })
  }
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
    if (beat.damage_keywords.length > 0) {
      factContext.damage_keywords = [...beat.damage_keywords]
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
      permanent: beat.permanent,
    })
  }
  for (const coords of spawnHexes) {
    actions.push({
      kind: 'spawn_minion',
      sourceId: bossId,
      minionId: nextMinionId(draft, beat.minion),
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
      case 'forward_cone':
        // The same authored reach the Beat will resolve with, not a matching
        // literal: the telegraph must not lie, and two constants agreeing is
        // not the same as one constant being read twice.
        for (const coords of forwardCone(draft.board.hexes, boss.coords, boss.facing, beat.range_tiles)) {
          draft.telegraphs[hexKey(coords)] = 'cone'
        }
        break
      case 'spawn_minions': {
        // The telegraph must not lie: it previews the escalated count.
        const count = beat.count + escalationModifiers(draft).extraSpawnCount
        for (const coords of draft.spawnCandidates) {
          if (draft.telegraphedSpawnHexes.length >= count) {
            break
          }
          const key = hexKey(coords)
          if (draft.board.hexes[key] && !Object.values(draft.board.entities).some((entity) => hexKey(entity.coords) === key)) {
            draft.telegraphedSpawnHexes.push(coords)
            draft.telegraphs[key] = 'spawn'
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
// Index 0 is the authored opener, pinned. Round 1 is the teaching Round — the
// one Round a first-time player cannot have learned anything about (ADR 0031) —
// so it stays the Round the author chose, and it is why the first program of
// every phase has to be free of `severe` Beats.
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
      // Send the collision to a uniformly chosen later slot rather than always
      // to slot 1. Swapping with a fixed position leaks information: it puts the
      // displaced program somewhere a counter can name, which concentrated the
      // distribution enough to measure — `programPredictability` read 68% on
      // Round 5 where the shuffle should have given 50%.
      const target = randiRange(rng, 1, bag.length - 1, `${label}_no_repeat`)
      const displaced = bag[target]
      bag[target] = bag[0]
      bag[0] = displaced
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
