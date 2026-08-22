#!/usr/bin/env node
// The mutation audit: reintroduce a defect the engine claims to guard, and see
// whether the suite notices.
//
// This exists because a passing suite says nothing about which rules it guards.
// The first run of this audit reintroduced fifteen documented rules one at a
// time and found four of them unasserted — including one whose test *looked*
// like the guard, walked a whole fight, and never once reached the branch it
// was written for. Nothing was failing. Nothing would have started failing.
//
// Every entry below is a rule someone wrote down, paired with the smallest edit
// that breaks it. A SURVIVED line means the suite is decorating that rule
// rather than guarding it, and the fix is a test, never a loosened entry here.
//
//   node scripts/mutate.mjs            # audit every rule
//   node scripts/mutate.mjs proximity  # only entries matching a substring
//
// Exit status is the gate: 0 when every mutation is caught, 1 otherwise.

import { execFileSync } from 'node:child_process'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Rooted at `src`, not `src/engine`: a rule can live in the UI too. The Beat
// card's printability gate is a content contract for the board-game port, and
// it is enforced by a function under `src/ui`.
const SRC = join(WEB, 'src')

// `from` must appear exactly once in its file. An anchor that matches zero or
// many times is reported as a broken entry rather than quietly skipped: an
// audit that silently stops auditing is the failure it exists to catch.
const MUTATIONS = [
  {
    name: 'no-repeat collision goes to a fixed slot',
    guards: 'ADR 0028 / D-038: the program order leaks no position information',
    file: 'engine/timeline.ts',
    from: 'const target = randiRange(rng, 1, bag.length - 1, `${label}_no_repeat`)',
    to: 'const target = 1',
  },
  {
    name: 'opening bag dealt in authored order, so Round 2 is a constant',
    guards: 'ADR 0031: the schedule is learnable only if it is not fixed',
    file: 'engine/timeline.ts',
    from: '  shuffle(rng, remainder, `${label}_opening`)\n',
    to: '',
  },
  {
    name: 'no-repeat rule disabled entirely',
    guards: 'ADR 0028: no program repeats back to back',
    file: 'engine/timeline.ts',
    from: 'if (pool.length > 2 && bag[0] === sequence[sequence.length - 1]) {',
    to: 'if (false && pool.length > 2 && bag[0] === sequence[sequence.length - 1]) {',
  },
  {
    name: 'Round 1 opener not pinned to the authored program',
    guards: 'D-037: Round 1 is authored, never rolled',
    file: 'engine/timeline.ts',
    from: '  const sequence = [pool[0]]\n  const remainder = pool.slice(1)',
    to: '  const sequence = [pool[pool.length - 1]]\n  const remainder = pool.slice(0, -1)',
  },
  {
    name: 'proximity demand priced from the pool, not the running program',
    guards: 'D-041: a demand is billed only on a Round the Timeline showed it',
    file: 'engine/escalation.ts',
    from: "    kind: 'demand_proximity',\n    reason: 'unanswered_proximity',\n    scope: 'program',",
    to: "    kind: 'demand_proximity',\n    reason: 'unanswered_proximity',\n    scope: 'pool',",
  },
  {
    name: 'Minion billed on the Round it arrived',
    guards: 'ADR 0027: acceleration only for a demand the party could answer',
    file: 'engine/escalation.ts',
    from: '(entity.spawnedRound ?? state.round) < state.round,',
    to: '(entity.spawnedRound ?? state.round) <= state.round,',
  },
  {
    name: 'Minion fuse burns a Round early, on the Round it arrived',
    guards: 'D-063: a Whelp detonates on the Incoming Row of the NEXT Round',
    file: 'engine/minions.ts',
    from: 'return state.round > (minion.spawnedRound ?? state.round)',
    to: 'return state.round >= (minion.spawnedRound ?? state.round)',
  },
  {
    name: 'a Minion blast catches Enemies too',
    guards: 'D-063: an Enemy blast burns Heroes only, as a Burst burns Enemies only',
    file: 'engine/minions.ts',
    from: '  const heroIds = Object.keys(state.heroes)\n    .filter((heroId) => {\n      const piece = state.board.entities[heroId]',
    to: '  const heroIds = Object.keys(state.board.entities)\n    .filter((heroId) => {\n      const piece = state.board.entities[heroId]',
  },
  {
    name: 'a Minion blast ignores its authored radius',
    guards: 'D-063: the blast reaches its authored radius, so a step answers it',
    file: 'engine/minions.ts',
    from: 'return piece !== undefined && hexDistance(piece.coords, minion.coords) <= radius',
    to: 'return piece !== undefined',
  },
  {
    name: 'a Whelp that reached its fuse costs no Escalation',
    guards: 'D-063: reaching the fuse is the Brood Call going unanswered',
    file: 'engine/advancePhase.ts',
    from: 'if (detonated && draft.active) {',
    to: 'if (false && detonated && draft.active) {',
  },
  {
    name: 'a detonating Minion stays on the board',
    guards: 'D-063: a Minion is consumed by its own blast',
    file: 'engine/resolve.ts',
    from: "      removePiece(draft, action.sourceId)\n      succeed(fact)",
    to: '      succeed(fact)',
  },
  {
    name: 'the blast outline goes around every tile instead of the footprint',
    guards: 'D-063: one line around the whole blast, which is what separates it from the cone',
    file: 'board/layout.ts',
    from: 'if (!footprint.has(`${across.q},${across.r}`)) {',
    to: 'if (true) {',
  },
  {
    name: 'the edge-to-neighbour table is rotated one step',
    guards: 'D-063: the blast outline is drawn on the edges the footprint actually ends at',
    file: 'board/layout.ts',
    from: 'export const EDGE_NEIGHBORS: readonly Axial[] = [\n  { q: 1, r: 0 },\n  { q: 0, r: 1 },',
    to: 'export const EDGE_NEIGHBORS: readonly Axial[] = [\n  { q: 0, r: 1 },\n  { q: 1, r: 0 },',
  },
  {
    name: 'Escalation clock starts a Round early',
    guards: 'ADR 0027: automatic ticks alone reach the top exactly at the Clock',
    file: 'engine/escalation.ts',
    from: 'return Math.max(1, roundLimit - (ESCALATION_MAX - 1))',
    to: 'return Math.max(1, roundLimit - ESCALATION_MAX)',
  },
  {
    name: 'Escalation thresholds stop being cumulative',
    guards: 'ADR 0027: every threshold at or below the value stays live',
    file: 'engine/escalation.ts',
    from: 'if (threshold.value > state.escalation) {',
    to: 'if (threshold.value !== state.escalation) {',
  },
  {
    name: 'demand price never found, so nothing is ever billed',
    guards: 'ADR 0027: an unanswered demand accelerates the clock',
    file: 'engine/escalation.ts',
    from: 'if (beat.kind === kind && beat.escalation_if_unanswered > terms.amount) {',
    to: 'if (false && beat.kind === kind && beat.escalation_if_unanswered > terms.amount) {',
  },
  {
    name: 'proximity distance hardcoded instead of read from the Beat',
    guards: 'ADR 0020: reach is content, not an engine constant',
    file: 'engine/escalation.ts',
    from: 'return piece !== undefined && hexDistance(piece.coords, boss.coords) <= rangeTiles',
    to: 'return piece !== undefined && hexDistance(piece.coords, boss.coords) <= 1',
  },
  {
    name: 'Counter demand billed on the first stack instead of the cap',
    guards: 'ADR 0027: a Counter the party must answer every Round is a tax, not a decision',
    file: 'engine/escalation.ts',
    from: 'return hosts.some((ref) => counterCount(state, ref, counterId) >= threshold)',
    to: 'return hosts.some((ref) => counterCount(state, ref, counterId) >= 1)',
  },
  {
    name: 'Counter demand always asks the Boss, whoever the Beat marks',
    guards: 'D-051: the Boss marks the Party too, and that half must be priced',
    file: 'engine/escalation.ts',
    from: "counterTarget === 'hero' ? Object.keys(state.heroes).map(combatantRef) : [combatantRef(state.bossId)]",
    to: '[combatantRef(state.bossId)]',
  },
  {
    name: 'cone resolution hardcodes its reach',
    guards: 'ADR 0020: the cone burns the ground its content says it does',
    file: 'engine/timeline.ts',
    from: 'patternHexes = forwardCone(draft.board.hexes, bossCoords, bossFacing, beat.range_tiles)',
    to: 'patternHexes = forwardCone(draft.board.hexes, bossCoords, bossFacing, 2)',
  },
  {
    name: 'cone telegraph hardcodes its reach',
    guards: 'ADR 0026: the telegraph must not lie about what is coming',
    file: 'engine/timeline.ts',
    from: 'for (const coords of forwardCone(draft.board.hexes, boss.coords, boss.facing, beat.range_tiles)) {',
    to: 'for (const coords of forwardCone(draft.board.hexes, boss.coords, boss.facing, 2)) {',
  },
  {
    name: 'content may ask a distance question without answering it',
    guards: 'ADR 0020: a ranged Beat authors its reach',
    file: 'engine/content/program.ts',
    from: 'if (reachReasons.length > 0 && beat.range_tiles < 1) {',
    to: 'if (false && reachReasons.length > 0 && beat.range_tiles < 1) {',
  },
  {
    name: 'priced Beats of one kind may ask different questions',
    guards: 'ADR 0027: the Round-end step prices one demand per kind, so a second question is a silent drop',
    file: 'engine/content/encounter.ts',
    from: '        if (asked.size > 1) {',
    to: '        if (false && asked.size > 1) {',
  },
  {
    name: 'the merge base is ignored, so every shared row looks like a collision',
    guards: 'D-074 authoring: a row that merged weeks ago must never be renumbered',
    file: 'content/decisionIds.ts',
    from: 'upstream.has(row.id) && !base.has(row.id)',
    to: 'upstream.has(row.id)',
  },
  {
    name: 'a merged-in upstream row is renumbered like one this branch invented',
    guards: 'D-105 authoring: upstream\'s landed row keeps its number; the branch that arrived second moves',
    file: 'content/decisionIds.ts',
    from: '    if (row.id !== DECISION_PLACEHOLDER && upstreamText.get(row.id) === row.text) {',
    to: '    if (false) {',
  },
  {
    name: 'a reassigned id lands on a number a later row already holds',
    guards: 'D-074 authoring: assigning an id must not create the duplicate it exists to prevent',
    file: 'content/decisionIds.ts',
    from: '  const used = new Set([...input.baseIds, ...input.upstreamIds, ...rows.map((row) => row.id)])',
    to: '  const used = new Set([...input.baseIds, ...input.upstreamIds])',
  },
  {
    name: 'the id rewrite is global, so citations inside a row body move too',
    guards: 'D-074 authoring: only the ID column is the row\'s own number',
    file: 'content/decisionIds.ts',
    from: 'lines[row.lineIndex] = lines[row.lineIndex].replace(ROW, (match) => match.replace(row.id, to))',
    to: 'lines[row.lineIndex] = lines[row.lineIndex].split(row.id).join(to)',
  },
  {
    name: 'a Beat kind that asks no distance question may quietly gain a reach',
    guards: 'ADR 0020: a reach nothing reads is a number an author can set and watch do nothing',
    file: 'engine/content/program.ts',
    from: 'if (reachReasons.length === 0 && beat.range_tiles > 0) {',
    to: 'if (false && reachReasons.length === 0 && beat.range_tiles > 0) {',
  },
  {
    name: 'Boss damage resolves from anywhere on the board',
    guards: 'D-073: reach is a property of every ability, the Boss included',
    file: 'engine/fireLegality.ts',
    from: "bossVerdict = rangeVerdict(state, action.sourceId, state.bossId, card.range_tiles, \"The Boss is outside the Top Card's range.\")",
    to: "bossVerdict = rangeVerdict(state, action.sourceId, state.bossId, 99, \"The Boss is outside the Top Card's range.\")",
  },
  {
    name: 'the Boss keeps its old exemption from a piece-targeting card\'s reach',
    guards: 'D-073: marking the Boss costs the same footwork as marking a Whelp',
    file: 'engine/fireLegality.ts',
    from: '    if (targetVerdict === undefined) {\n      targetVerdict = rangeVerdict(state, action.sourceId, targetId, card.range_tiles, "The chosen Enemy is outside the Top Card\'s range.")',
    to: '    if (targetVerdict === undefined && target.kind !== \'boss\') {\n      targetVerdict = rangeVerdict(state, action.sourceId, targetId, card.range_tiles, "The chosen Enemy is outside the Top Card\'s range.")',
  },
  {
    name: 'a card may reach past its Hero without authoring how far',
    guards: 'D-073: a card that touches anything past its own Hero authors a reach',
    file: 'engine/content/card.ts',
    from: 'if (reaching.length > 0 && card.range_tiles < 1) {',
    to: 'if (false && reaching.length > 0 && card.range_tiles < 1) {',
  },
  {
    name: 'a card that touches nobody may quietly carry a reach',
    guards: 'D-073: a reach nothing reads is a number an author can set and watch do nothing',
    file: 'engine/content/card.ts',
    from: 'if (reaching.length === 0 && card.range_tiles > 0) {',
    to: 'if (false && reaching.length === 0 && card.range_tiles > 0) {',
  },
  {
    name: 'the Action Bar lights a Slot the rules would refuse',
    guards: 'D-073: a plate that stays lit from out of reach asserts a shot the resolver refuses',
    file: 'ui/actionBar/slots.ts',
    from: "  return legality(catalog, state, { kind: 'fire_slot', sourceId: heroId, slotIndex }).legal",
    to: '  return true',
  },
  {
    name: 'the Boss marks a Hero from anywhere on the board',
    guards: 'D-074: marking the Party is a reach, the Boss side of D-073',
    file: 'engine/timeline.ts',
    from: 'if (!marksHero || hexDistance(bossCoords, playerCoords) <= beat.range_tiles) {',
    to: 'if (true) {',
  },
  {
    name: 'a movement clause resolves after the Beat it belongs to',
    guards: 'D-074: "Move 2, then Claw" swings from where the move ended, not from where it started',
    file: 'engine/timeline.ts',
    from: 'const bossCoords = route.at(-1) ?? boss?.coords ?? { q: 999, r: 999 }',
    to: 'const bossCoords = boss?.coords ?? { q: 999, r: 999 }',
  },
  {
    name: 'a walker never stops early and always spends its whole allowance',
    guards: 'D-074: a mover goes no further than it has to, so an advance is readable',
    file: 'engine/board.ts',
    from: '        if (toTarget <= standoff) {\n          return routeTo(cameFrom, start, candidate)\n        }',
    to: '',
  },
  {
    name: 'a mover already at its Standoff shuffles anyway',
    guards: 'D-074: a Boss standing next to its quarry has no reason to move',
    file: 'engine/board.ts',
    from: '  if (hexDistance(mover.coords, target) <= standoff) {\n    return []\n  }',
    to: '',
  },
  {
    name: 'ground authoring impassable is crossed anyway',
    guards: 'D-074: what stops a pathing Enemy is authored, not assumed',
    file: 'engine/board.ts',
    from: '  return !getHazards(board, coords).some((hazard) => hazard.impassable === true)',
    to: '  return true',
  },
  {
    name: 'own-side immunity goes back to being the engine\'s rule',
    guards: 'D-074: a Hazard decides whether it burns the side that laid it, so a Boss can be lured onto its own',
    file: 'engine/resolve.ts',
    from: '.filter((hazard) => hazard.damagesSourceTeam === true || hazard.sourceTeam === undefined || hazard.sourceTeam !== enteringTeam)',
    to: '.filter((hazard) => hazard.sourceTeam === undefined || hazard.sourceTeam !== enteringTeam)',
  },
  {
    name: 'a Beat may carry a movement clause without saying how close to get',
    guards: 'D-079: a Standoff is what tells a movement clause when to stop',
    file: 'engine/content/program.ts',
    from: 'if (beatMoves(beat) && beat.standoff_tiles < 1) {',
    to: 'if (false && beatMoves(beat) && beat.standoff_tiles < 1) {',
  },
  {
    name: 'a Beat that stands still may still author a Standoff',
    guards: 'D-079: a number nothing reads is a number an author can set and watch do nothing',
    file: 'engine/content/program.ts',
    from: 'if (!beatMoves(beat) && beat.standoff_tiles > 0) {',
    to: 'if (false && !beatMoves(beat) && beat.standoff_tiles > 0) {',
  },
  {
    name: 'a moving Beat closes to its reach again instead of its Standoff',
    guards: 'D-079: where a Boss stops is its own authored number, not the distance it strikes from',
    file: 'engine/timeline.ts',
    from: ': traversalRoute(draft.board, bossId, playerCoords, beat.move_tiles, beat.standoff_tiles, beat.traversal)',
    to: ': traversalRoute(draft.board, bossId, playerCoords, beat.move_tiles, beat.range_tiles, beat.traversal)',
  },
  {
    name: 'the Beat Card prints the reach where the Standoff belongs',
    guards: 'D-055/D-079: the card names which of a Beat\'s two distances is which',
    file: 'ui/overlays/beatCardModel.ts',
    from: 'const closing = beat.standoff_tiles > 0 ? `, closing to ${beat.standoff_tiles}` : \'\'',
    to: 'const closing = beat.range_tiles > 0 ? `, closing to ${beat.range_tiles}` : \'\'',
  },
  {
    name: 'a Minion may stand off further out than it can bite',
    guards: 'D-079: a Minion creeps until it can bite, so a Standoff outside the bite never attacks',
    file: 'engine/content/minionDef.ts',
    from: 'if (minionMoves(minion) && minion.standoff_tiles > minion.range_tiles) {',
    to: 'if (false && minionMoves(minion) && minion.standoff_tiles > minion.range_tiles) {',
  },
  {
    name: 'a Minion bites at a hardcoded 1 instead of its authored reach',
    guards: 'D-072: a Minion states its reach like a Card and a Beat do',
    file: 'engine/minions.ts',
    from: 'if (hexDistance(minion.coords, targetCoords) <= reach) {',
    to: 'if (hexDistance(minion.coords, targetCoords) <= 1) {',
  },
  {
    name: 'a Minion keeps its own movement rule instead of the shared one',
    guards: 'D-072: one traversal rule for every piece that moves under its own power',
    file: 'engine/minions.ts',
    from: '    content?.move_tiles ?? 0,\n    content?.standoff_tiles ?? 0,\n    content?.traversal ?? \'walk\',',
    to: '    content?.move_tiles ?? 0,\n    0,\n    content?.traversal ?? \'walk\',',
  },
  {
    name: 'a Minion closes to its bite reach again instead of its Standoff',
    guards: 'D-079: with allowance to spare, where a Minion stops is a separate authored decision',
    file: 'engine/minions.ts',
    from: '    content?.standoff_tiles ?? 0,',
    to: '    content?.range_tiles ?? 0,',
  },
  {
    name: 'a shove puts a piece on ground a walker routes around',
    guards: 'D-072: impassable must not mean impassable unless pushed',
    file: 'engine/resolve.ts',
    from: '    if (!isTraversable(draft.board, action.targetId, destination)) {\n      stopReason = \'blocked\'\n      break\n    }\n',
    to: '',
  },
  {
    name: 'a traversing piece keeps the facing it started with',
    guards: 'D-072: a Beat that moves and then hits draws its geometry from where it ended up',
    file: 'engine/resolve.ts',
    from: '  mover.facing = facingAlong(entered, from, mover.facing)',
    to: '',
  },
  {
    name: 'a moving Beat computes its geometry from the facing it had before moving',
    guards: 'D-072: the cone and the Guarded Front follow the move',
    file: 'engine/timeline.ts',
    from: 'const bossFacing = facingAlong(route, boss?.coords ?? bossCoords, boss?.facing ?? 0)',
    to: 'const bossFacing = boss?.facing ?? 0',
  },
  {
    name: 'a Minion may bite without saying how far',
    guards: 'D-072: a Minion that bites authors its reach',
    file: 'engine/content/minionDef.ts',
    from: 'if (minion.attack_damage > 0 && minion.range_tiles < 1) {',
    to: 'if (false && minion.attack_damage > 0 && minion.range_tiles < 1) {',
  },
  {
    name: 'impassable ground stops Enemies but not a Hero paid step',
    guards: 'D-075: impassable is physics, and physics does not care whose move it is',
    file: 'engine/board.ts',
    from: '  if (!isTraversable(board, entityId, destination)) {\n    return false\n  }\n',
    to: '',
  },
  {
    name: 'a Minion arrives on ground nothing can stand on',
    guards: 'D-075: arriving is not moving, and a piece still cannot be where a piece cannot be',
    file: 'engine/board.ts',
    from: "    if (isTraversable(board, '', parseKey(key))) {",
    to: '    if (!Object.values(board.entities).some((entity) => hexKey(entity.coords) === key)) {',
  },
  {
    name: 'a movement clause may be authored on a telegraphed Incoming Beat',
    guards: 'D-075: a telegraph the player invalidates by playing correctly is ADR 0031 all over again',
    file: 'engine/content/program.ts',
    from: '      if (beatMoves(beat)) {\n        throw new Error(',
    to: '      if (false && beatMoves(beat)) {\n        throw new Error(',
  },
  {
    name: 'the Beat Card stops printing the movement clause',
    guards: 'D-055 / D-075: a field that changes an outcome and never reaches the card is a port defect',
    file: 'ui/overlays/beatCardModel.ts',
    from: '  const clause = movementClauseLine(beat)',
    to: "  const clause = ''",
  },
  {
    name: 'the claw ignores its authored reach and lands from anywhere',
    guards: 'D-062: a claw reaches as far as its content says and no further',
    file: 'engine/timeline.ts',
    from: 'if (hexDistance(bossCoords, playerCoords) <= beat.range_tiles) {',
    to: 'if (hexDistance(bossCoords, playerCoords) <= 99) {',
  },
  {
    name: 'a claw that reached nothing still writes the impact memory',
    guards: 'D-039 / D-062: a miss is no impact, so the Trail keeps its target',
    file: 'engine/timeline.ts',
    from: '        impactedHexes.push(playerCoords)\n      }\n      break',
    to: '      }\n      impactedHexes.push(playerCoords)\n      break',
  },
  {
    name: 'the board lunges for a claw that reached nothing',
    guards: 'Board Feedback: the board never shows a blow the Encounter did not resolve',
    file: 'board/effects.ts',
    from: 'if (heroCoords && hexDistance(heroCoords, bossCoords) <= beat.range_tiles) {',
    to: 'if (heroCoords) {',
  },
  {
    name: 'Beat card stops printing its reach',
    guards: 'D-055: a Beat prints every parameter it resolves against',
    file: 'ui/overlays/beatCardModel.ts',
    from: "    stats.push({ label: 'Reach', value: `${beat.range_tiles} hex${beat.range_tiles === 1 ? '' : 'es'}` })\n",
    to: '',
  },
  {
    name: 'Beat card calls permanent ground temporary',
    guards: 'D-055 / D-039: a printed card may not lie about what it leaves',
    file: 'ui/overlays/beatCardModel.ts',
    from: '      value: beat.permanent\n        ? `${beat.hazard} · permanent`\n        : ',
    to: '      value: false\n        ? `${beat.hazard} · permanent`\n        : ',
  },
  {
    name: 'standing demand reads a literal distance, not the authored one',
    guards: 'D-055: the card and the Round-end check ask the same question',
    file: 'ui/overlays/beatCardModel.ts',
    from: 'return piece !== undefined && hexDistance(piece.coords, boss.coords) <= beat.range_tiles',
    to: 'return piece !== undefined && hexDistance(piece.coords, boss.coords) <= 1 + beat.range_tiles',
  },
  {
    name: 'standing demand docks before its row has resolved',
    guards: 'ADR 0024: a demand stands from the row that creates it',
    file: 'ui/overlays/beatCardModel.ts',
    from: "if (!state.active || (state.phase !== 'incoming' && state.phase !== 'slow')) {",
    to: 'if (!state.active) {',
  },
  {
    name: 'own-side Hazard immunity removed',
    guards: 'D-042: a combatant does not burn in its own side fire',
    file: 'engine/resolve.ts',
    from: '    .filter((hazard) => hazard.damagesSourceTeam === true || hazard.sourceTeam === undefined || hazard.sourceTeam !== enteringTeam)\n',
    to: '',
  },
  {
    name: 'Hazard source side defaults to party',
    guards: 'D-042: an unattributed Hazard belongs to the Enemy that laid it',
    file: 'engine/resolve.ts',
    from: "hazard.sourceTeam = draft.board.entities[action.sourceId]?.team ?? 'enemy'",
    to: "hazard.sourceTeam = draft.board.entities[action.sourceId]?.team ?? 'party'",
  },
  {
    name: 'absorbed impact no longer displaces the spill',
    guards: 'D-039: a fully absorbed Tank Hit moves the Trail off the Hero',
    file: 'engine/timeline.ts',
    from: '      scorchedHexes = draft.previousImpactAbsorbed\n        ? draft.previousImpactedHexes.map((coords) => spillAwayFrom(draft, coords, bossCoords))\n        : [...draft.previousImpactedHexes]',
    to: '      scorchedHexes = [...draft.previousImpactedHexes]',
  },
  {
    name: 'absorption ignores the Guarded Front',
    guards: 'D-039: absorption is zero Health loss ON the front, not any zero',
    file: 'engine/resolve.ts',
    from: 'draft.previousImpactAbsorbed = (resolutionFact.health_loss as number) === 0 && guardedFront',
    to: 'draft.previousImpactAbsorbed = (resolutionFact.health_loss as number) === 0',
  },
  {
    name: 'permanent Hazards expire at the Round boundary',
    guards: 'D-031: a structural threshold closes the arena for good',
    file: 'engine/board.ts',
    from: 'if (hazard.permanent === true) {',
    to: 'if (false) {',
  },
  {
    name: 'Escalation scale lengthened to 6',
    guards: 'ADR 0027: one fixed 0-5 scale on every Boss',
    file: 'engine/escalation.ts',
    from: 'export const ESCALATION_MAX = 5',
    to: 'export const ESCALATION_MAX = 6',
  },
  {
    name: 'a clockless Counter expires anyway',
    guards: 'D-048: `duration_rounds: 0` means no clock — the Counter sits until something spends it',
    file: 'engine/counters.ts',
    from: '  if (counter.remainingRounds <= 0) {\n    return false\n  }',
    to: '  if (counter.remainingRounds <= 0) {\n    return true\n  }',
  },
  {
    name: 'Round upkeep skips every host but the Party',
    guards: 'D-045: the duration tick is every combatant\'s, not the Heroes\' alone',
    file: 'engine/counters.ts',
    from: '      if (counterExpiresOnRoundAdvance(counter)) {',
    to: '      if (counterExpiresOnRoundAdvance(counter) && state.heroes[refEntityId(ref)] !== undefined) {',
  },
  {
    name: 'a Counter outlives the host that left',
    guards: 'D-045 / D-048: a Counter never outlives its host, whichever kind of host it is',
    file: 'engine/counters.ts',
    from: '    if (!hostIsLive(state, ref)) {\n      delete state.counters[ref]',
    to: '    if (false) {\n      delete state.counters[ref]',
  },
  {
    name: 'placement ignores the authored cap',
    guards: 'D-047: `max` is the stacking rule, and `max: 1` is what refuses a second copy',
    file: 'engine/counters.ts',
    from: '    const placed = Math.min(amount, existing.max - existing.count)',
    to: '    const placed = amount',
  },
  {
    name: 'a Reader answers blows it does not name',
    guards: 'D-049: a Reader naming an event_keyword answers only blows carrying it',
    file: 'engine/counters.ts',
    from: '      if (reader.event_keyword && !eventKeywords.includes(reader.event_keyword)) {',
    to: '      if (false) {',
  },
  {
    name: 'a gate stops gating',
    guards: 'D-047: every `gate` a Card declares has to pass before it may fire',
    file: 'engine/fireLegality.ts',
    from: '  if (!cardGatesPass(catalog, state, card, action)) {',
    to: '  if (false) {',
  },
  {
    name: 'ground that burns for good keeps its Counters',
    guards: 'D-050: a permanent Hazard takes the Counters on that hex with it',
    file: 'engine/resolve.ts',
    from: "if (hazard.permanent === true && clearCounters(draft, hexCounterRef(action.coords)))",
    to: "if (false && clearCounters(draft, hexCounterRef(action.coords)))",
  },
  {
    name: 'a Signature never earns from dealing damage',
    guards: 'ADR 0037: the dealing side of damage_resolved carries effect_landed, and the earn dies with it',
    file: 'engine/events.ts',
    from: "        : { ...resolutionFact, effect_landed: (resolutionFact.health_loss as number) > 0 }",
    to: '        : { ...resolutionFact, effect_landed: false }',
  },
  {
    name: 'a Signature never earns from a Counter it spent off',
    guards: 'D-102: counter_spent is an evaluated earn — striking a mark charges the Restorative',
    file: 'engine/firedCard.ts',
    from: '  if (spentAll.length > 0) {',
    to: '  if (false) {',
  },
  {
    name: 'a spend that took nothing is recorded anyway',
    guards: 'D-102: a spend Reader that removed no Counters raises nothing, which is what keeps the earn unfarmable',
    file: 'engine/firedCard.ts',
    from: '    if (removed > 0) {',
    to: '    if (true) {',
  },
  {
    name: 'a Card whose whole effect is a spend reads as having landed nothing',
    guards: 'D-102: a spend counts toward slot_fired effect_landed',
    file: 'engine/firedCard.ts',
    from: "      card.places_counter !== '' ||\n      spentAll.length > 0,",
    to: "      card.places_counter !== '',",
  },
  {
    name: 'a Signature never earns from firing a Slot',
    guards: 'ADR 0037: slot_fired is an evaluated earn',
    file: 'engine/events.ts',
    from: "  for (const outcome of evaluateGrantsFor(catalog, draft, heroId, 'slot_fired', { resolutionFact })) {",
    to: "  for (const outcome of (false ? evaluateGrantsFor(catalog, draft, heroId, 'slot_fired', { resolutionFact }) : [])) {",
  },
  {
    name: 'a Signature never earns on the Round start',
    guards: 'ADR 0037: round_start is an evaluated earn',
    file: 'engine/events.ts',
    from: "    for (const outcome of evaluateGrantsFor(catalog, draft, heroId, 'round_start')) {",
    to: "    for (const outcome of (false ? evaluateGrantsFor(catalog, draft, heroId, 'round_start') : [])) {",
  },
  {
    name: "ground's Counters never answer the footstep",
    guards: 'D-086: hex_entered is raised beside Hazard entry, and the ground marks pay out',
    file: 'engine/resolve.ts',
    from: '  return [...hazardEntryActions(draft, targetId, coords), ...raise.generated]',
    to: '  return hazardEntryActions(draft, targetId, coords)',
  },
  {
    name: 'the effect_landed gate always passes',
    guards: 'ADR 0037: an earn gated on effect_landed refuses a fire that did nothing',
    file: 'engine/signature.ts',
    from: "    if (gate === 'effect_landed' && (resolutionFact?.effect_landed as boolean | undefined) !== true) {",
    to: "    if (false) {",
  },
  {
    name: 'a Hero at zero ends the Encounter instead of going Downed',
    guards: 'ADR 0036: zero health is a state change, not the end of the fight',
    file: 'engine/resolve.ts',
    from: "      if (struck && struck.status === 'living' && struck.health <= 0 && canBeDowned(draft, action.targetId)) {",
    to: '      if (false) {',
  },
  {
    name: 'a solo Hero at zero goes Downed with nobody to rescue them',
    guards: 'ADR 0036: Downed requires a living ally, so solo stays an immediate defeat',
    file: 'engine/downed.ts',
    from: '  return livingHeroIds(state).some((id) => id !== heroId)',
    to: '  return true',
  },
  {
    name: 'a parked corpse answers the proximity demand',
    guards: 'ADR 0036 / D-041: only a living Hero answers a demand',
    file: 'engine/escalation.ts',
    from: '      return !livingHeroIds(state).some((heroId) => {',
    to: '      return !Object.keys(state.heroes).some((heroId) => {',
  },
  {
    name: 'the rescue window never expires',
    guards: 'ADR 0036: a Hero Downed in Round N is Incapacitated once N+2 opens',
    file: 'engine/downed.ts',
    from: "    return hero?.status === 'downed' && state.round > rescueDeadlineRound(hero)",
    to: '    return false',
  },
  {
    name: 'an Incapacitated Hero keeps drawing from the seeded deck',
    guards: 'ADR 0036: the deck stops, so the seeded order belongs to whoever is still playing',
    file: 'engine/downed.ts',
    from: '  hero.deck = []',
    to: '',
  },
  {
    name: 'the revive fraction is hardcoded instead of authored',
    guards: 'ADR 0036: how forgiving the fight is must be reachable by a designer',
    file: 'engine/resolve.ts',
    from: 'encounter?.revive_health_fraction ?? 0.25',
    to: '0.25',
  },
  {
    name: "incoming damage ignores the target's own Counters",
    guards: "D-047/D-085: the target's Counters answer host_damage_incoming, before mitigation",
    file: 'engine/events.ts',
    from: "    const when: AuthoredWhen = host === targetId ? 'host_damage_incoming' : 'host_deals_damage'",
    to: "    const when: AuthoredWhen = 'host_deals_damage'",
  },
  {
    name: 'overflow converts the whole heal instead of the surplus',
    guards: 'D-080: only healing beyond what the ally could hold converts',
    file: 'engine/firedCard.ts',
    from: '    overflowConverted = Math.min(effects.healing - absorbed, card.healing)',
    to: '    overflowConverted = Math.min(effects.healing, card.healing)',
  },
  {
    name: 'the overflow cap is the scaled heal, not the printed one',
    guards: 'D-080 / Q21: conversion caps at the printed healing, so a scaled heal cannot convert more than the card promises',
    file: 'engine/firedCard.ts',
    from: '    overflowConverted = Math.min(effects.healing - absorbed, card.healing)',
    to: '    overflowConverted = effects.healing - absorbed',
  },
  {
    name: 'every heal converts, Keyword or not',
    guards: 'D-080 / Q14: the conversion is a property of the Keyword, never of healing itself',
    file: 'engine/firedCard.ts',
    from: "  if (card.tags.includes(OVERFLOW) && effects.healing > 0 && recipient.id !== hero.id) {",
    to: '  if (effects.healing > 0 && recipient.id !== hero.id) {',
  },
  {
    name: 'a Healer converts surplus spent on herself',
    guards: 'D-103: overflow converts only on another Hero, so self-targeting is not a free damage button',
    file: 'engine/firedCard.ts',
    from: "  if (card.tags.includes(OVERFLOW) && effects.healing > 0 && recipient.id !== hero.id) {",
    to: '  if (card.tags.includes(OVERFLOW) && effects.healing > 0) {',
  },
  {
    name: 'the Underwritten cover never converts',
    guards: 'D-080 / Q20: a covered Hero takes their next blow as healing, not as damage',
    file: 'engine/resolve.ts',
    from: '    if (requested > 0 && spendCounter(draft, combatantRef(targetId), UNDERWRITTEN, 1) > 0) {',
    to: '    if (false) {',
  },
  {
    name: 'a healing Burst restores nobody but the recipient',
    guards: 'D-080: a healing Burst covers every party Hero inside it, the paper Radial pattern',
    file: 'engine/firedCard.ts',
    from: '  if (burstCenter !== null && effects.healing > 0) {',
    to: '  if (false) {',
  },
  {
    name: "a preservation Signature's rider still marks the Boss",
    guards: "D-080 / Q23: an ally-targeted Signature's full-bank rider covers the firing Hero, not the Boss",
    file: 'engine/firedCard.ts',
    from: "      hostRef: combatantRef(card.target_type === 'ally' ? action.sourceId : draft.bossId),",
    to: '      hostRef: combatantRef(draft.bossId),',
  },
  {
    name: 'a spend on the chosen ally reads the caster instead',
    guards: 'D-080 / Q11: a Reader on `target` reads whatever the Card chose, so a cleanse lands on the marked ally',
    file: 'engine/counters.ts',
    from: '  return action.targetId ? combatantRef(action.targetId) : null',
    to: '  return combatantRef(action.sourceId)',
  },
  {
    name: 'the picker offers an evaluation probe to players',
    guards: 'Encounter Picker: what ships is exactly the authored player_facing set — a probe is measured, never played (D-076)',
    file: 'ui/chrome/encounterChoice.ts',
    from: '    .filter((encounter) => encounter.player_facing)',
    to: '    .filter(() => true)',
  },
  {
    name: 'startEncounter launches a fight the picker never offered',
    guards: 'Encounter Picker: the session refuses a non-player-facing Encounter, so the offer cannot be bypassed',
    file: 'store/sessionSlice.ts',
    from: '      if (!encounter || !encounter.player_facing) {',
    to: '      if (!encounter) {',
  },
  {
    name: 'the teaching script overlays every Round-1 Encounter',
    guards: 'The first-turn script belongs to the teaching Encounter alone',
    file: 'ui/onboarding/firstTurnScript.ts',
    from: '  if (state.encounterId !== FIRST_TURN_ENCOUNTER_ID) {\n    return null\n  }',
    to: '  if (false) {\n    return null\n  }',
  },
  {
    name: 'the control cursor is decorative — gestures still act as seat 0',
    guards: 'Character switching: the consoles operate the pilot the cursor names',
    file: 'store/selectors.ts',
    from: "  return cursor !== null && state.heroes[cursor] !== undefined ? cursor : state.primaryHeroId",
    to: '  return state.primaryHeroId',
  },
  {
    name: 'a stranded cursor pilots a Hero the session does not field',
    guards: 'Character switching: a session transition falls back to seat 0 rather than stranding control',
    file: 'store/selectors.ts',
    from: "  return cursor !== null && state.heroes[cursor] !== undefined ? cursor : state.primaryHeroId",
    to: '  return cursor !== null ? cursor : state.primaryHeroId',
  },
  {
    name: 'an armed targeting survives a control switch',
    guards: 'Character switching: nothing dangles — switching drops every in-flight gesture',
    file: 'store/interactionSlice.ts',
    from: '      controlledHeroId: heroId,\n      targetingSlotIndex: null,',
    to: '      controlledHeroId: heroId,\n      targetingSlotIndex: get().targetingSlotIndex,',
  },
  {
    name: 'the unacted nudge ignores whether the Hero can still act',
    guards: 'The nudge never asserts a move the rules refuse: a Hero with nothing to spend is not nudged',
    file: 'ui/party/unacted.ts',
    from: '  return hero.hand.length > 0 || hero.actionBar.some((_slot, slotIndex) => slotCanFire(catalog, state, heroId, slotIndex))',
    to: '  return true',
  },
  {
    name: 'a window action counts for the whole Round',
    guards: 'The nudge is per window: acting in the Quick Window does not pay for the Slow one',
    file: 'ui/party/unacted.ts',
    from: '          fact.round === state.round &&\n          fact.phase === state.phase &&',
    to: '          fact.round === state.round &&',
  },
  {
    name: 'the rail nags forever — an offered seat is offered again',
    guards: 'The unacted cycle is finite: one offer per seat per window, so the window can always be closed',
    file: 'ui/party/unacted.ts',
    from: '.find((heroId) => !offered.includes(heroId) && unacted.includes(heroId)) ?? null',
    to: '.find((heroId) => unacted.includes(heroId)) ?? null',
  },
  {
    name: 'the rail nudges toward the pilot, whose console is already on screen',
    guards: 'The nudge points at the seats the player is not looking at; the pilot has the skip warning',
    file: 'ui/party/unacted.ts',
    from: '  const walk = pivot < 0 ? seats : [...seats.slice(pivot + 1), ...seats.slice(0, pivot)]',
    to: '  const walk = seats',
  },
  {
    name: 'every waiting seat claims to be the one the rail is pointing at',
    guards: 'The pip separates "owes this window an action" from "the next press comes here"; only one frame is next',
    file: 'ui/party/partyFrameModel.ts',
    from: '        nextUp: nudge.nextUp === heroId,',
    to: '        nextUp: nudge.unacted.includes(heroId),',
  },
  {
    name: 'the rail scans from seat 0 instead of walking on from the pilot',
    guards: 'The unacted walk goes forward through the roster: at three seats a scan bounces back to the seat just left',
    file: 'ui/party/unacted.ts',
    from: '  const walk = pivot < 0 ? seats : [...seats.slice(pivot + 1), ...seats.slice(0, pivot)]',
    to: '  const walk = seats.filter((heroId) => heroId !== pilotId)',
  },
  {
    name: 'the nudge offer is recorded without the switch landing',
    guards: 'The unacted press hands over the console and records the offer together',
    file: 'store/interactionSlice.ts',
    from: '    get().switchControl(heroId)\n    set((store) => ({\n      nudgedHeroIds:',
    to: '    set((store) => ({\n      nudgedHeroIds:',
  },
  {
    name: 'the swapped frame travels but never changes size',
    guards: 'The promoted frame grows from ally size into full size — the growth is the whole point of the motion',
    file: 'ui/party/controlSwap.ts',
    from: 'scale(${round(scale, 4)})',
    to: 'scale(1)',
  },
  {
    name: 'a measured box is handed out again after it is claimed',
    guards: 'A box belongs to one frame and one commit; a second claim would animate a later render from pixels that are gone',
    file: 'ui/party/controlSwap.ts',
    from: '  pending.delete(heroId)\n',
    to: '',
  },
  {
    name: 'a fresh measurement merges into the last one instead of replacing it',
    guards: 'Only the layout the current press measured may be animated from; a leftover box is a frame flying in from nowhere',
    file: 'ui/party/controlSwap.ts',
    from: '  pending = new Map(boxes)',
    to: '  for (const [heroId, box] of boxes) {\n    pending.set(heroId, box)\n  }',
  },
  {
    name: 'a frame that did not move is animated anyway',
    guards: 'Standing still is not a swap: an untouched ally in a party of three must not be handed a compositor layer per press',
    file: 'ui/party/controlSwap.ts',
    from: '    Math.abs(from.top - to.top) < NEGLIGIBLE_PX &&',
    to: '    Math.abs(from.top - to.top) < 0 &&',
  },
  {
    name: 'the console deals all at once instead of left to right',
    guards: 'The handover cascades down the console: the Action Bar leads, the Hand follows, each row read in order',
    file: 'ui/party/controlSwap.ts',
    from: '  return Math.min(lead + index * step, CONSOLE_DEAL_LAST_START_MS)',
    to: '  return Math.min(lead, CONSOLE_DEAL_LAST_START_MS)',
  },
  {
    name: 'the last plate in a row can start arbitrarily late',
    guards: 'A row that grows later must not turn a handover into a wait — every plate starts inside the cap',
    file: 'ui/party/controlSwap.ts',
    from: '  return Math.min(lead + index * step, CONSOLE_DEAL_LAST_START_MS)',
    to: '  return lead + index * step',
  },
  {
    name: 'a tucked frame spends the card on a rescue it is not showing',
    guards: 'The tuck swallows every press: a tucked frame has hidden REVIVE · 1 CARD, so a press may not act on it',
    file: 'ui/party/partyFrameModel.ts',
    from: "  if (tucked) {\n    return 'expand'\n  }\n",
    to: '',
  },
  {
    name: 'a resting ally frame offers the rescue and the switch in the wrong order',
    guards: 'Direction 1A: the one legal ally action keeps the frame, so revive outranks the control switch',
    file: 'ui/party/partyFrameModel.ts',
    from: "  return frame.revivable ? 'revive' : 'switch'",
    to: "  return 'switch'",
  },
  {
    name: 'a Boss Beat marks the wrong side',
    guards: 'D-051: `counter_target` decides whether the Boss marks itself or the Party',
    file: 'engine/timeline.ts',
    from: 'combatantRef(marksHero ? targetHeroId : bossId)',
    to: 'combatantRef(bossId)',
  },
  {
    name: 'a cost spend is never paid before the Card resolves',
    guards: 'D-047: a `cost` spend is paid before the Card\'s effects are computed',
    file: 'engine/firedCard.ts',
    from: "const spentEarly = spendCardReaders(draft, card, action, 'cost')",
    to: "const spentEarly = spendCardReaders(draft, card, action, 'resolution')",
  },
  {
    name: 'the Boss ignores the Role a Beat selects',
    guards: 'ADR 0035: target_selector picks the Hero a Beat lands on, not the primary seat',
    file: 'engine/timeline.ts',
    from: '  const matched = seats.find((heroId) => heroRole(catalog, draft.encounterId, heroId) === beat.target_selector)',
    to: '  const matched = undefined',
  },
  {
    name: 'ally preservation lands on the caster',
    guards: 'ADR 0035: an ally-targeted card heals and armors the chosen Hero, not the one who fired it',
    file: 'engine/firedCard.ts',
    from: "  const recipient = card.target_type === 'ally' ? (draft.heroes[action.targetId ?? ''] ?? hero) : hero",
    to: '  const recipient = hero',
  },
  {
    name: 'a ward lands on the caster instead of the ally',
    guards: 'ADR 0035: an ally-targeted card places its Counter on the chosen ally',
    file: 'engine/counters.ts',
    from: "  const chosen = targetType === 'piece' || targetType === 'ally'",
    to: "  const chosen = targetType === 'piece'",
  },
  {
    name: 'a Hero with no Signature gets one anyway',
    guards: 'ADR 0034: an empty signature_card is a supported authoring state — the handoff tells every non-Warden Hero to sit here until the earn vocabulary widens',
    file: 'engine/setup.ts',
    from: "  if (signatureCard !== '') {",
    to: '  if (true) {',
  },
  {
    name: 'the Signature takes hand charges',
    guards: 'D-064 / ADR 0032: earned, never bought — hand cards cannot reach the Signature',
    file: 'engine/legality.ts',
    from: "  if (slot.fixed) {\n    return illegal('The Signature Slot charges only through its standing clause.')\n  }",
    to: '',
  },
  {
    name: 'firing the Signature keeps its Charges',
    guards: 'ADR 0032: firing always spends the whole stack',
    file: 'engine/firedCard.ts',
    from: '  if (slot.fixed) {\n    slot.earnedCharges = 0\n    fact.detail.spentSignatureCharges = spentSignatureCharges\n  }',
    to: '  if (slot.fixed) {\n    fact.detail.spentSignatureCharges = spentSignatureCharges\n  }',
  },
  {
    name: 'the full-bank rider fires below the cap',
    guards: 'D-064 decision 13: Sundered rides only a fire at the whole Charge cap',
    file: 'engine/firedCard.ts',
    from: "if (slot.fixed && card.full_charge.places_counter !== '' && spentSignatureCharges >= cardChargeCap(card)) {",
    to: "if (slot.fixed && card.full_charge.places_counter !== '' && spentSignatureCharges >= 1) {",
  },
  {
    name: 'an earn at the cap banks anyway',
    guards: 'D-064 decision 8: overcap is waste — a block while full earns nothing',
    file: 'engine/signature.ts',
    from: '      if (slot.earnedCharges >= cap) {',
    to: '      if (false) {',
  },
  {
    // The cleanup exemption itself is structural (a fixed Slot's `charges`
    // array can never fill), so the door this attacks is the structure's
    // other half: let hand cards be PREPARED onto the Signature and the
    // "never discards, never replaced" claim falls with it.
    name: 'a hand card can be prepared onto the Signature',
    guards: 'D-064 / ADR 0032: the Signature Slot is never replaceable and never takes a prepared card',
    file: 'engine/legality.ts',
    from: "  if (hero.actionBar[action.slotIndex].fixed) {\n    return illegal('The Signature Slot never takes a prepared card.')\n  }",
    to: '',
  },
  {
    name: 'selector lexicographic tie-break reversed',
    guards: 'D-111: every selector ordering ends in the same lexicographic id tie-break',
    file: 'engine/selectors.ts',
    from: 'const idCompare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)',
    to: 'const idCompare = (left: string, right: string): number => (left < right ? 1 : left > right ? -1 : 0)',
  },
  {
    name: 'selector living filter inverted',
    guards: 'D-111: `is: living` keeps living Heroes, never their inverse',
    file: 'engine/selectors.ts',
    from: "        return hero !== undefined ? hero.status === 'living' : (state.board.entities[id]?.health ?? 0) > 0",
    to: "        return hero !== undefined ? hero.status !== 'living' : (state.board.entities[id]?.health ?? 0) > 0",
  },
  {
    name: 'selector range boundary made exclusive',
    guards: 'D-111: `within: N` is boundary-inclusive — distance N is in range',
    file: 'engine/selectors.ts',
    from: '    return at !== undefined && from !== undefined && hexDistance(at, from) <= filter.within',
    to: '    return at !== undefined && from !== undefined && hexDistance(at, from) < filter.within',
  },
]

const filter = process.argv[2] ?? ''
const selected = MUTATIONS.filter(
  (mutation) => filter === '' || `${mutation.name} ${mutation.guards} ${mutation.file}`.toLowerCase().includes(filter.toLowerCase()),
)
if (selected.length === 0) {
  console.error(`No mutation matches "${filter}".`)
  process.exit(1)
}

// Built from a char code rather than written literally: an escape byte in
// source is invisible to a reader and lint rejects it outright.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

// Two audits at once corrupt each other: the second reads a file the first has
// already mutated, takes that defect for the original, and restores *it* when
// it finishes. The lock makes the second run refuse instead. It holds the pid
// so a lock left by a machine that lost power names something checkable rather
// than blocking the repo forever.
const LOCK = join(WEB, '.mutate.lock')
let lockHeld = false

function releaseLock() {
  if (lockHeld) {
    lockHeld = false
    try {
      unlinkSync(LOCK)
    } catch {
      // Already gone: another handler won the race to clean up, which is the
      // outcome this wanted anyway.
    }
  }
}

function takeLock() {
  try {
    // `wx` is the atomic half: create-or-fail, so two runs starting together
    // cannot both believe they made it.
    writeFileSync(LOCK, `${process.pid}\n`, { flag: 'wx' })
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error
    }
    const owner = readFileSync(LOCK, 'utf8').trim()
    const alive = Number.isInteger(Number(owner)) && processAlive(Number(owner))
    if (alive) {
      console.error(`\nmutate: another audit is running (pid ${owner}). It rewrites source files, so two at once corrupt each other.`)
      console.error('mutate: wait for it to finish, or stop it and re-run.')
      process.exit(1)
    }
    // A stale lock is the fingerprint of the failure this whole guard is for:
    // the previous audit died without unwinding, so the tree may still be
    // carrying one of its mutations. Say so, then let the anchor check below
    // be the thing that finds it.
    console.error(`\nmutate: found a stale lock from pid ${owner}, which did not exit cleanly.`)
    console.error('mutate: that run may have left a mutation in the tree. Checking every anchor before starting.')
    unlinkSync(LOCK)
    writeFileSync(LOCK, `${process.pid}\n`, { flag: 'wx' })
  }
  lockHeld = true
}

function processAlive(pid) {
  try {
    // Signal 0 checks for the process without touching it.
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

// Every anchor, before any mutation. The per-entry STALE check already reports
// an anchor that has stopped matching, but only for the entries a run reaches:
// a filtered run touches a handful, so a mutation left behind in some other
// file stays invisible and stays committable. This asks the whole table every
// time, which is what turns "a defect is loose in the tree" into a message
// that names the file.
function refuseLooseMutations() {
  const loose = []
  for (const mutation of MUTATIONS) {
    const path = join(SRC, mutation.file)
    let source
    try {
      source = readFileSync(path, 'utf8')
    } catch {
      loose.push({ mutation, why: 'its file is missing' })
      continue
    }
    if (source.split(mutation.from).length - 1 === 1) {
      continue
    }
    // The telling case: the anchor is gone and the replacement is present.
    // That is this entry's own mutation, still on disk.
    const applied = mutation.to !== '' && source.includes(mutation.to)
    loose.push({ mutation, why: applied ? 'its mutation is still applied' : 'its anchor no longer matches' })
  }
  const applied = loose.filter((entry) => entry.why === 'its mutation is still applied')
  if (applied.length === 0) {
    return
  }
  console.error('\nmutate: a previous audit left its mutation in the tree. Refusing to start.\n')
  for (const entry of applied) {
    console.error(`  ${entry.mutation.file}: ${entry.mutation.name}`)
    console.error(`    restore with: git checkout -- src/${entry.mutation.file}`)
  }
  console.error('\nmutate: these are defects, not authored code. Restore them, then re-run.')
  process.exit(1)
}

function runSuite() {
  try {
    execFileSync('npx', ['vitest', 'run', '--reporter=dot'], { cwd: WEB, stdio: 'pipe', encoding: 'utf8' })
    return { caught: false, detail: '' }
  } catch (error) {
    // Strip ANSI first. Vitest colours its output when it detects a terminal
    // and CI is one, so the summary regex below matched locally and silently
    // missed on the runner — the count vanished and every line fell back to
    // "suite failed". Reading the actual CI log is what caught it; the local
    // run looked perfect.
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.replace(ANSI, '')
    // Vitest prints a "Tests  N failed" summary line; fall back to the raw
    // failure markers if the format ever moves, so a caught mutation is never
    // reported as a survivor because a regex missed.
    const summary = output.match(/Tests\s+(\d+) failed/)
    const names = [...output.matchAll(/(?:×|✕|FAIL)\s+(.+)/g)].map((match) => match[1].trim())
    const unique = [...new Set(names)].slice(0, 3)
    return {
      caught: true,
      detail: `${summary ? `${summary[1]} failing` : 'suite failed'}${unique.length > 0 ? `: ${unique.join(' | ')}` : ''}`,
    }
  }
}

const results = []
const touched = new Map()

// Whatever happens — a thrown error, a Ctrl-C, a `kill` — the tree goes back
// the way it was found. A mutation left on disk is far worse than a missing
// report: it is a defect that reads as authored code, and the next `git add`
// commits it.
function restoreAll() {
  for (const [path, original] of touched) {
    writeFileSync(path, original)
  }
  touched.clear()
}

// SIGINT alone was not enough, and the gap was not theoretical. A supervisor
// that stops a background job sends SIGTERM, not SIGINT, so the handler below
// never ran: the audit died mid-mutation and left two defects in the tree, one
// of which reached a commit. SIGHUP is the same story for a closed terminal.
// Node's default action for all three is to exit without unwinding, so each
// one needs saying.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    restoreAll()
    releaseLock()
    // 128 + the signal number, the shell's own convention for "killed by".
    process.exit(signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 129)
  })
}
// The ordinary exits, including a throw that reaches the top. `exit` runs for
// every one of them and may only do synchronous work, which unlinking is.
process.on('exit', () => {
  restoreAll()
  releaseLock()
})

// Order matters: take the lock first so the check below cannot be racing a
// live audit's mutations and report them as leftovers.
takeLock()
refuseLooseMutations()

try {
  for (const mutation of selected) {
    const path = join(SRC, mutation.file)
    const original = readFileSync(path, 'utf8')
    const occurrences = original.split(mutation.from).length - 1
    if (occurrences !== 1) {
      results.push({ ...mutation, status: 'STALE', detail: `anchor matched ${occurrences} times` })
      console.log(`STALE     ${mutation.name}`)
      continue
    }
    touched.set(path, original)
    let outcome
    try {
      writeFileSync(path, original.replace(mutation.from, mutation.to))
      outcome = runSuite()
    } finally {
      writeFileSync(path, original)
      touched.delete(path)
    }
    results.push({ ...mutation, status: outcome.caught ? 'CAUGHT' : 'SURVIVED', detail: outcome.detail })
    // Name the test that caught it, not just the fact that something did. When
    // this list is maintained a year from now, "which test is load-bearing for
    // this rule" is the question being asked, and a bare CAUGHT does not answer
    // it — nor would it reveal a mutation being caught by an unrelated test.
    console.log(`${outcome.caught ? 'CAUGHT  ' : 'SURVIVED'}  ${mutation.name}${outcome.detail ? `\n            ${outcome.detail}` : ''}`)
  }
} finally {
  restoreAll()
}

const survivors = results.filter((result) => result.status === 'SURVIVED')
const stale = results.filter((result) => result.status === 'STALE')
const caught = results.filter((result) => result.status === 'CAUGHT')

if (survivors.length > 0 || stale.length > 0) {
  console.log('\n=== NEEDS ATTENTION ===')
  for (const result of [...survivors, ...stale]) {
    console.log(`${result.status.padEnd(9)} ${result.name}`)
    console.log(`          guards: ${result.guards}`)
    console.log(
      result.status === 'SURVIVED'
        ? '          The suite did not notice. Write the test; do not weaken this entry.'
        : `          ${result.detail} — the code moved under this entry. Re-anchor it.`,
    )
  }
}

console.log(`\n${caught.length}/${results.length} caught, ${survivors.length} survived, ${stale.length} stale`)
process.exit(survivors.length + stale.length > 0 ? 1 : 0)
