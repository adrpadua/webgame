import { currentProgram, hexDistance, type BossBeat, type ContentCatalog, type EncounterState } from '@/engine'

// What a Boss Beat card prints, and when a standing demand is on the table.
// Split from the component for the same reason `handFace` and `slots` are: the
// interesting part is a pure read of authored content plus board state, and it
// is worth testing without a renderer.

export interface BeatCardStat {
  label: string
  value: string
}

// The Beat and the row it belongs to, found in whichever program is running.
// Phase II swaps the pool, so this searches the live program rather than the
// authored Phase I list.
export function findLiveBeat(
  catalog: ContentCatalog,
  state: EncounterState,
  beatId: string,
): { beat: BossBeat; track: 'instant' | 'incoming' } | null {
  const program = currentProgram(catalog, state)
  if (!program) {
    return null
  }
  const instant = program.instant_beats.find((entry) => entry.id === beatId)
  if (instant) {
    return { beat: instant, track: 'instant' }
  }
  const incoming = program.incoming_beats.find((entry) => entry.id === beatId)
  return incoming ? { beat: incoming, track: 'incoming' } : null
}

// Everything the Beat's resolution depends on, in the order a reader wants it:
// what it does to you, then where it reaches, then what it leaves behind, then
// what it costs to ignore.
//
// This list is the board-game port's authoring gate (D-052). A Beat whose
// resolution consults something not printed here cannot be put on a card, so a
// new field that changes an outcome and never appears in this function is a
// defect in the port even while the digital game plays correctly.
export function beatCardStats(beat: BossBeat): BeatCardStat[] {
  const stats: BeatCardStat[] = []
  if (beat.damage > 0) {
    stats.push({
      label: 'Damage',
      value: beat.unguarded_bonus > 0 ? `${beat.damage} (+${beat.unguarded_bonus} unguarded)` : String(beat.damage),
    })
  }
  if (beat.target_selector !== '') {
    stats.push({ label: 'Target', value: beat.target_selector })
  }
  if (beat.range_tiles > 0) {
    stats.push({ label: 'Reach', value: `${beat.range_tiles} hex${beat.range_tiles === 1 ? '' : 'es'}` })
  }
  if (beat.move_tiles > 0) {
    stats.push({ label: 'Advances', value: `${beat.move_tiles} hex${beat.move_tiles === 1 ? '' : 'es'}` })
  }
  if (beat.minion !== undefined) {
    stats.push({ label: 'Spawns', value: `${beat.count} ${beat.minion}` })
  }
  if (beat.hazard !== undefined) {
    stats.push({
      label: 'Leaves',
      value: beat.permanent
        ? `${beat.hazard} · permanent`
        : `${beat.hazard} · ${beat.duration_rounds} round${beat.duration_rounds === 1 ? '' : 's'}`,
    })
  }
  if (beat.escalation_if_unanswered > 0) {
    stats.push({ label: 'Unanswered', value: `Escalation +${beat.escalation_if_unanswered}` })
  }
  return stats
}

export interface StandingDemandView {
  beat: BossBeat
  // Whether the demand is satisfied right now. Live rather than final: the
  // whole point of docking the card is that the player can still change this.
  answered: boolean
}

// The demand on the table, or null. A demand is the one Beat kind that resolves
// to nothing when it plays — its price is charged at the Round end — so a card
// that popped and vanished would show it at the only moment nobody can act on
// it, and hide it through the entire window where they can.
//
// Rows resolve when their window opens (ADR 0024), so an Incoming demand stands
// from the Incoming Row through the Slow Window, which is exactly where a
// Stamina step can still answer it.
//
// It therefore docks as soon as the phase opens, which can be before the paced
// playout has got around to *showing* that Beat's card. That looks early and is
// not: the rules resolved the whole row when the window opened, and the playout
// only paces the telling. Gating this on the playout instead would make a rules
// question depend on presentation, which is the one thing the playout store is
// careful never to do.
export function standingDemand(catalog: ContentCatalog, state: EncounterState): StandingDemandView | null {
  if (!state.active || (state.phase !== 'incoming' && state.phase !== 'slow')) {
    return null
  }
  const program = currentProgram(catalog, state)
  const beat = program?.incoming_beats.find((entry) => entry.kind === 'demand_proximity')
  const boss = state.board.entities[state.bossId]
  if (!beat || !boss) {
    return null
  }
  // The authored reach, never a literal — D-043 made this content precisely so
  // the card and the Round-end check can never disagree about the distance.
  const answered = Object.keys(state.heroes).some((heroId) => {
    const piece = state.board.entities[heroId]
    return piece !== undefined && hexDistance(piece.coords, boss.coords) <= beat.range_tiles
  })
  return { beat, answered }
}
