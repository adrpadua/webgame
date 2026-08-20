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
import { readFileSync, writeFileSync } from 'node:fs'
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
    from: "      delete draft.board.entities[action.sourceId]\n      delete draft.counters[combatantRef(action.sourceId)]\n      succeed(fact)",
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
    file: 'engine/content/catalog.ts',
    from: 'if (RANGED_BEAT_KINDS.has(beat.kind) && beat.range_tiles < 1) {',
    to: 'if (false && RANGED_BEAT_KINDS.has(beat.kind) && beat.range_tiles < 1) {',
  },
  {
    name: 'priced Beats of one kind may ask different questions',
    guards: 'ADR 0027: the Round-end step prices one demand per kind, so a second question is a silent drop',
    file: 'engine/content/catalog.ts',
    from: '        if (asked.size > 1) {',
    to: '        if (false && asked.size > 1) {',
  },
  {
    name: 'the merge base is ignored, so every shared row looks like a collision',
    guards: 'D-NEW authoring: a row that merged weeks ago must never be renumbered',
    file: 'content/decisionIds.ts',
    from: 'upstream.has(row.id) && !base.has(row.id)',
    to: 'upstream.has(row.id)',
  },
  {
    name: 'a reassigned id lands on a number a later row already holds',
    guards: 'D-NEW authoring: assigning an id must not create the duplicate it exists to prevent',
    file: 'content/decisionIds.ts',
    from: '  const used = new Set([...input.baseIds, ...input.upstreamIds, ...rows.map((row) => row.id)])',
    to: '  const used = new Set([...input.baseIds, ...input.upstreamIds])',
  },
  {
    name: 'the id rewrite is global, so citations inside a row body move too',
    guards: 'D-NEW authoring: only the ID column is the row\'s own number',
    file: 'content/decisionIds.ts',
    from: 'lines[row.lineIndex] = lines[row.lineIndex].replace(ROW, (match) => match.replace(row.id, to))',
    to: 'lines[row.lineIndex] = lines[row.lineIndex].split(row.id).join(to)',
  },
  {
    name: 'a Beat kind that asks no distance question may quietly gain a reach',
    guards: 'ADR 0020: a reach nothing reads is a number an author can set and watch do nothing',
    file: 'engine/content/catalog.ts',
    from: 'if (!RANGED_BEAT_KINDS.has(beat.kind) && beat.range_tiles > 0) {',
    to: 'if (false && !RANGED_BEAT_KINDS.has(beat.kind) && beat.range_tiles > 0) {',
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
    file: 'ui/overlays/beatCard.ts',
    from: "    stats.push({ label: 'Reach', value: `${beat.range_tiles} hex${beat.range_tiles === 1 ? '' : 'es'}` })\n",
    to: '',
  },
  {
    name: 'Beat card calls permanent ground temporary',
    guards: 'D-055 / D-039: a printed card may not lie about what it leaves',
    file: 'ui/overlays/beatCard.ts',
    from: '      value: beat.permanent\n        ? `${beat.hazard} · permanent`\n        : ',
    to: '      value: false\n        ? `${beat.hazard} · permanent`\n        : ',
  },
  {
    name: 'standing demand reads a literal distance, not the authored one',
    guards: 'D-055: the card and the Round-end check ask the same question',
    file: 'ui/overlays/beatCard.ts',
    from: 'return piece !== undefined && hexDistance(piece.coords, boss.coords) <= beat.range_tiles',
    to: 'return piece !== undefined && hexDistance(piece.coords, boss.coords) <= 1 + beat.range_tiles',
  },
  {
    name: 'standing demand docks before its row has resolved',
    guards: 'ADR 0024: a demand stands from the row that creates it',
    file: 'ui/overlays/beatCard.ts',
    from: "if (!state.active || (state.phase !== 'incoming' && state.phase !== 'slow')) {",
    to: 'if (!state.active) {',
  },
  {
    name: 'own-side Hazard immunity removed',
    guards: 'D-042: a combatant does not burn in its own side fire',
    file: 'engine/resolve.ts',
    from: '    .filter((hazard) => hazard.sourceTeam === undefined || hazard.sourceTeam !== enteringTeam)\n',
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
    file: 'engine/legality.ts',
    from: '      if (!cardGatesPass(catalog, state, card, action)) {',
    to: '      if (false) {',
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
    guards: 'ADR 0037: the Hero who lands a blow reads host_deals_damage',
    file: 'engine/signature.ts',
    from: "  evaluateGrantsFor(catalog, draft, action.sourceId, 'host_deals_damage', {",
    to: "  if (false) evaluateGrantsFor(catalog, draft, action.sourceId, 'host_deals_damage', {",
  },
  {
    name: 'a Signature never earns from firing a Slot',
    guards: 'ADR 0037: slot_fired is an evaluated earn',
    file: 'engine/resolve.ts',
    from: "      evaluateGrantsFor(catalog, draft, action.sourceId, 'slot_fired', {",
    to: "      if (false) evaluateGrantsFor(catalog, draft, action.sourceId, 'slot_fired', {",
  },
  {
    name: 'a Signature never earns on the Round start',
    guards: 'ADR 0037: round_start is an evaluated earn',
    file: 'engine/resolve.ts',
    from: "        evaluateGrantsFor(catalog, draft, heroId, 'round_start')",
    to: '',
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
    guards: 'D-047: the target\'s Counters raise what it takes, before mitigation',
    file: 'engine/resolve.ts',
    from: "  const takenDelta = readerSum(draft, combatantRef(targetId), 'host_takes_damage', 'target_damage', damageKeywords)",
    to: '  const takenDelta = 0',
  },
  {
    name: 'a Boss Beat marks the wrong side',
    guards: 'D-051: `counter_target` decides whether the Boss marks itself or the Party',
    file: 'engine/timeline.ts',
    from: "combatantRef(beat.counter_target === 'hero' ? targetHeroId : bossId)",
    to: 'combatantRef(bossId)',
  },
  {
    name: 'a cost spend is never paid before the Card resolves',
    guards: 'D-047: a `cost` spend is paid before the Card\'s effects are computed',
    file: 'engine/resolve.ts',
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
    file: 'engine/resolve.ts',
    from: "      const recipient = card.target_type === 'ally' ? (draft.heroes[action.targetId ?? ''] ?? hero) : hero",
    to: '      const recipient = hero',
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
    from: "      if (slot.fixed) {\n        return illegal('The Signature Slot charges only through its standing clause.')\n      }",
    to: '',
  },
  {
    name: 'firing the Signature keeps its Charges',
    guards: 'ADR 0032: firing always spends the whole stack',
    file: 'engine/resolve.ts',
    from: '      if (slot.fixed) {\n        slot.earnedCharges = 0\n        fact.detail.spentSignatureCharges = spentSignatureCharges\n      }',
    to: '      if (slot.fixed) {\n        fact.detail.spentSignatureCharges = spentSignatureCharges\n      }',
  },
  {
    name: 'the full-bank rider fires below the cap',
    guards: 'D-064 decision 13: Sundered rides only a fire at the whole Charge cap',
    file: 'engine/resolve.ts',
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
    from: "      if (hero.actionBar[action.slotIndex].fixed) {\n        return illegal('The Signature Slot never takes a prepared card.')\n      }",
    to: '',
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

// Whatever happens — a thrown error, a Ctrl-C — the tree goes back the way it
// was found. A mutation left on disk is far worse than a missing report.
function restoreAll() {
  for (const [path, original] of touched) {
    writeFileSync(path, original)
  }
  touched.clear()
}
process.on('SIGINT', () => {
  restoreAll()
  process.exit(130)
})

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
