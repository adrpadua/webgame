import { z } from 'zod'
import { beatMoves, beatReachReasons } from '../beats'
import { requireKeyword, KEYWORD_REFERENCES } from '../keywords'
import type { ContentCatalog } from './schemas'

// The Boss Program concept: the Beat's shape, the Program that orders Beats
// into rows, and every authoring rule about them. The Beat *kind* facts —
// which kinds reach, which move — live in the one registry (`engine/beats.ts`)
// and are read here, never re-declared.

export const bossBeatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  // Beat kinds name the mechanic, never one Boss's flavour for it. `title` and
  // `rules_text` carry the flavour, and the parameters a Boss varies —
  // `hazard`, `minion`, `damage` — are authored fields, so a kind that named
  // Embermaw's version of the mechanic was duplicating a field it could not
  // keep in sync: nothing stopped a frost Boss authoring `hazard: "frozen"` on
  // a Beat kind called `cinder_breath`.
  kind: z.enum([
    'turn_toward_player',
    'advance_toward_player',
    'demand_proximity',
    'targeted_hit',
    'hazard_last_impact',
    'forward_cone',
    'spawn_minions',
    'place_counter',
  ]),
  answer_tags: z.array(z.string()).default([]),
  // What a `place_counter` Beat places, and where (D-051). `self` is the Boss
  // marking itself — pressure the party can see accruing and choose to spend
  // cards suppressing — and `hero` is the Boss marking the Party, which is the
  // half Counters were missing: they could mark the Boss and it could not mark
  // back.
  counter: z.string().default(''),
  counter_amount: z.number().int().min(1).default(1),
  counter_target: z.enum(['self', 'hero']).default('self'),
  // Consequence Tier (ADR 0031). It once set the earliest horizon a Beat could
  // appear in, which the Forecast Row's removal retired. What it sets now is
  // where a Beat may *open*: `severe` marks a Beat that can end a run, and no
  // phase's first program may carry one, because the opening Round is the one
  // nobody can have learned yet (D-036). Authored rather than derived, and
  // validated — see the ladder tests.
  consequence_tier: z.enum(['chip', 'structural', 'severe']).default('chip'),
  target_selector: z.string().default(''),
  // The Keywords this Beat's damage carries (D-049). Plural because "who it
  // is aimed at" and "what it is made of" are two axes: a blow can be a Tank
  // Hit *and* fire, and one string holding both would be the category error
  // the `kind` discriminator exists to prevent.
  damage_keywords: z.array(z.string()).default([]),
  damage: z.number().int().default(0),
  unguarded_bonus: z.number().int().min(0).default(0),
  // Escalation acceleration (ADR 0027): what it costs to leave this Beat's
  // demand standing at a Round end. Carried by any Beat kind the Escalation
  // step knows how to price — `spawn_minions`, `demand_proximity` and
  // `place_counter` today.
  escalation_if_unanswered: z.number().int().min(0).default(0),
  // How far this Beat reaches, in hexes. Authored rather than defaulted,
  // because reach is the whole difference between a Beat that footwork answers
  // and one it does not, and ADR 0020 puts that kind of decision in `data/`.
  //
  // It arrived late: `forward_cone` carried its reach as a default parameter on
  // `forwardCone` *and* as a second literal at the telegraph call site, and
  // `demand_proximity` carried its own as a bare `1` in the Escalation step.
  // Three constants for two Beats, none of them content, and the only place the
  // number appeared to a reader was inside a `rules_text` string.
  //
  // `targeted_hit` reads it too since D-062. It was deliberately rangeless
  // under D-017, which wanted a hit footwork could not answer; D-041 gave that
  // job to `demand_proximity`, which prices standing out of reach in Escalation
  // instead — so the claw was left as the one Beat whose reach was infinite for
  // a reason that had moved somewhere better.
  //
  // A `place_counter` Beat aimed at a Hero reads it since D-074, which is the
  // Boss side of the same rule cards answered in D-073: marking the Party from
  // the far corner was the one reach nothing measured. Aimed at itself it
  // measures nothing, and must not author one.
  //
  // This is Reach and only Reach since D-079. A movement clause used to read it
  // as its stopping distance as well, which made `advance_toward_player` — the
  // Beat whose only effect *is* the move — author a reach it never reached with,
  // and left the far more interesting Beats unauthorable in both directions: one
  // that closes to 1 and claws at 2, and one that stops at 3 and breathes at 2.
  range_tiles: z.number().int().min(0).default(0),
  // How close the movement clause is trying to stand: the Standoff (D-079). The
  // mover goes no further than it has to, so it stops the moment its target is
  // this close and does not move at all when the target already is.
  //
  // Authored whenever the Beat carries a movement clause and refused when it
  // does not, and never below `1`, because a mover cannot stand on top of what
  // it is closing on — "spend the whole allowance" is a standoff of `1` the
  // route cannot reach, not a standoff of `0`.
  //
  // It is deliberately unconstrained against `range_tiles`. The two numbers
  // answer different questions and every ordering between them is a Boss
  // somebody might build: closing inside your own reach is a brawler, stopping
  // outside it is a Boss that keeps its distance, and a Beat that reaches
  // nothing at all still has somewhere it wants to stand.
  standoff_tiles: z.number().int().min(0).default(0),
  // The movement clause: how far this Beat travels before its own effect
  // resolves (D-074). Any Beat kind may carry it, so "Move 2, then Claw" is one
  // Beat with one telegraph rather than two Beats a Program has to keep in
  // order — the shape a Gloomhaven monster card has, and the reason the field
  // moved off `advance_toward_player`, which is now simply the Beat kind whose
  // *only* effect is the move.
  //
  // Distance is authored because it is the Boss's counter-pressure against
  // standing out of reach, and how hard that pressure bites is a per-Boss
  // identity question (D-041). This is the *allowance* — how far it may go —
  // where `standoff_tiles` is the destination it is going for.
  move_tiles: z.number().int().min(0).default(0),
  // How the movement clause crosses the board (D-074). Three kinds, and the
  // difference between them is entirely what the ground can do about it:
  //
  // `walk`     — steps hex to hex through ground it can stand on. Pieces and
  //              Hazards authoring `impassable` lengthen the route or
  //              close it off, so a walker can be blocked, funnelled, or
  //              stranded.
  // `jump`     — crosses whatever is in between, but has to land somewhere it
  //              could stand. Obstacles stop shaping the route and only shape
  //              where it ends.
  // `teleport` — no route at all: it appears on the hex that best answers its
  //              `standoff_tiles`, anywhere on the board. `move_tiles` is not a
  //              budget it spends, so a teleporting Beat must not author one.
  //
  // A Boss that walks can be kited into a corner and a Boss that teleports
  // never can, which is the identity difference this field exists to author.
  traversal: z.enum(['walk', 'jump', 'teleport']).default('walk'),
  duration_rounds: z.number().int().min(1).default(1),
  // A permanent Hazard survives the Round boundary (D-039). This is how a Beat
  // writes to the arena for good, which is what makes mitigation protect
  // standing room instead of only Health — the currency that was never the
  // binding one. `duration_rounds` is ignored when this is set.
  permanent: z.boolean().default(false),
  hazard: z.string().optional(),
  minion: z.string().optional(),
  count: z.number().int().min(1).max(12).default(2),
})

export const bossProgramSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  instant_beats: z.array(bossBeatSchema),
  incoming_beats: z.array(bossBeatSchema),
})

export type BossBeat = z.infer<typeof bossBeatSchema>
export type BossProgram = z.infer<typeof bossProgramSchema>

export function validatePrograms(catalog: ContentCatalog): void {
  for (const program of Object.values(catalog.programs)) {
    // A Movement Clause belongs to the Instant Row alone (D-075). The Incoming
    // Row is telegraphed a phase before it resolves, and where a moving Beat
    // ends up is not knowable then — the Hero moves in between — so the painted
    // cone becomes a promise the player breaks by playing correctly. ADR 0031
    // removed the Forecast Row over exactly that: disclosure nobody can rely on
    // teaches nothing. The Instant Row resolves immediately and promises
    // nothing, which is why movement lives there.
    //
    // The honest form of a moving telegraphed Beat is to move the piece at
    // *telegraph* time, so the cone is drawn from where the Boss will actually
    // stand. That is a real design and it should arrive with the Boss that
    // needs it, rather than being left available and quietly wrong.
    for (const beat of program.incoming_beats) {
      if (beatMoves(beat)) {
        throw new Error(
          `Boss Beat ${beat.id} carries a movement clause on the Incoming Row of ${program.id}; the telegraph is painted before it resolves, so where it ends up cannot be shown — author it on the Instant Row, or move the piece at telegraph time`,
        )
      }
    }
    for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
      if (beat.hazard && !catalog.hazards[beat.hazard]) {
        throw new Error(`Boss Beat ${beat.id} references unknown hazard ${beat.hazard}`)
      }
      if (beat.minion && !catalog.minions[beat.minion]) {
        throw new Error(`Boss Beat ${beat.id} references unknown minion ${beat.minion}`)
      }
      // The three Beat fields that were free text until now. All three are
      // joins into the Keyword namespace, and `damage_keywords` is the
      // one that mattered: the Signature's standing clause narrows on
      // `tank_hit` (D-064), so an unchecked typo here disabled the Grant
      // silently, at load, with every test still green.
      for (const keywordId of beat.damage_keywords) {
        requireKeyword(catalog, keywordId, KEYWORD_REFERENCES.damageKeywords, `Boss Beat ${beat.id}`, 'damage_keywords')
      }
      if (beat.target_selector !== '') {
        requireKeyword(catalog, beat.target_selector, KEYWORD_REFERENCES.targetSelector, `Boss Beat ${beat.id}`, 'target_selector')
      }
      for (const tag of beat.answer_tags) {
        requireKeyword(catalog, tag, KEYWORD_REFERENCES.answerTag, `Boss Beat ${beat.id}`, 'answer_tags')
      }
      // Reach is authored, and a Beat kind that asks a distance question has to
      // answer it. Left to the schema default a cone would collapse to nothing
      // and a proximity demand would be unanswerable from any hex — both silent
      // failures, both content-shaped, and neither one a type error.
      // A Beat kind that exists to place a Counter has to name one, and a
      // Beat that names one without being that kind is authoring an effect
      // nothing will run (D-051).
      if (beat.kind === 'place_counter' && beat.counter === '') {
        throw new Error(`Boss Beat ${beat.id} is a place_counter but names no counter`)
      }
      if (beat.kind !== 'place_counter' && beat.counter !== '') {
        throw new Error(`Boss Beat ${beat.id} names counter ${beat.counter} but is a ${beat.kind}, which never places one`)
      }
      if (beat.counter !== '' && !catalog.counters[beat.counter]) {
        throw new Error(`Boss Beat ${beat.id} references unknown counter ${beat.counter}`)
      }
      if (beat.counter !== '' && catalog.counters[beat.counter]?.host !== 'combatant') {
        throw new Error(`Boss Beat ${beat.id} places ${beat.counter}, which is hosted on a ${catalog.counters[beat.counter]?.host}; a Beat marks combatants`)
      }
      const reachReasons = beatReachReasons(beat)
      if (reachReasons.length > 0 && beat.range_tiles < 1) {
        throw new Error(`Boss Beat ${beat.id} is ${reachReasons.join(' and ')} but authors no range_tiles`)
      }
      // The other half of the same rule: a Beat with no distance question to
      // ask must not answer one, because a reach nothing reads is a number an
      // author can set and watch do nothing.
      if (reachReasons.length === 0 && beat.range_tiles > 0) {
        throw new Error(`Boss Beat ${beat.id} is a ${beat.kind} and must not author range_tiles`)
      }
      // A movement kind with nothing to spend goes nowhere, and an allowance on
      // a teleport is a number it never consults — a teleport has no route to
      // spend it on, which is the whole difference between it and a jump
      // (D-074).
      if (beat.kind === 'advance_toward_player' && beat.traversal !== 'teleport' && beat.move_tiles < 1) {
        throw new Error(`Boss Beat ${beat.id} is an advance_toward_player but authors no move_tiles`)
      }
      if (beat.traversal === 'teleport' && beat.move_tiles > 0) {
        throw new Error(`Boss Beat ${beat.id} teleports but authors move_tiles ${beat.move_tiles}; a teleport spends no allowance — author a jump instead`)
      }
      // A Beat that does not move must not say how. `walk` is the schema
      // default, so only an authored `jump` or `teleport` can trip this.
      if (!beatMoves(beat) && beat.traversal !== 'walk') {
        throw new Error(`Boss Beat ${beat.id} authors traversal ${beat.traversal} but carries no movement clause`)
      }
      // The Standoff, under the same both-or-neither rule the reach follows and
      // for the same reason (D-079). Before the split this question was answered
      // by `range_tiles`, so a Beat that only moved had to author a reach it
      // never reached with, and the two refusals below could not exist: a Beat
      // that moved always looked like a Beat that reached.
      if (beatMoves(beat) && beat.standoff_tiles < 1) {
        throw new Error(`Boss Beat ${beat.id} carries a ${beat.traversal} clause but authors no standoff_tiles to say how close to get`)
      }
      if (!beatMoves(beat) && beat.standoff_tiles > 0) {
        throw new Error(`Boss Beat ${beat.id} authors standoff_tiles ${beat.standoff_tiles} but carries no movement clause`)
      }
    }
  }}
