# Embermaw: Ashen Trial - Boss Design

Status: approved full encounter design. The runnable short deck is documented in [embermaw-prototype.md](embermaw-prototype.md); it implements the first spatial lessons but not this document's phase-two package.

## Encounter Promise

`Embermaw` is the first raid boss that teaches the game's central contract:

> Every boss action is a visible spatial problem with a timed, role-sensitive answer.

The party faces an eight-round clock. The first half teaches Embermaw's three core verbs one at a time. The second half combines them. There are no hidden targets or unannounced damage sources.

## Encounter Frame

| Property | Design |
| --- | --- |
| Boss | Embermaw, the Ashen Wyrm |
| Board | Radius-2 hex arena, with Embermaw initially at `1,-1`, facing `SW` |
| Health | 48 in the single-tank demo (raised from 36 by D-017 so the solo damage race fails); scale health by party size and difficulty, not by adding opaque defenses |
| Encounter Clock | 8 rounds, expressed as Escalation (D-023): automatic ticks from the end of round 4, `Worldfire` at Escalation `5` |
| Phase Break | At half health (24 in the single-tank demo), or at the start of round 5 if the party is ahead of the health threshold |
| Phase I | `Hunt`: teach frontal pressure, breath cones, and add control |
| Phase II | `Conflagration`: preserve Phase I problems while combining them with marks and arena hazards |

The forced round-5 fallback prevents a high-damage party from skipping the encounter's central lesson. A party that reaches the health threshold early sees the phase break as soon as the current resolving action is complete.

## Boss Language

Each timeline entry has five authored fields:

1. **Pattern**: the affected hexes, rendered directly on the board.
2. **Origin**: boss facing, a marked unit, an existing hazard, or a named minion.
3. **Timing**: `Instant`, `Incoming`, or a delayed marker timer.
4. **Counter tags**: the actions that can meaningfully answer it, such as `Move`, `Mitigate`, `Interrupt`, `Clear Mark`, or `Kill Adds`.
5. **Failure**: the exact damage, displacement, spawned entity, or persistent hazard if unanswered.

Damage is a consequence of a pattern. A timeline card must not be authored as a generic `Tank Hit` or `Raid Hit` with no board relationship.

### Telegraph Proportionality

Impact and counterplay scale together (see the [champion design research note](../research/2026-08-16-lol-champion-design-lessons.md)). Two authoring rules apply to every timeline entry, on this and future Bosses:

- **Every entry carries at least one counter tag.** A Beat with no meaningful answer is a design defect, not a difficulty setting. `Mitigate` on an unavoidable Tank Hit counts: the answer is preparation, not evasion.
- **Consequence is authored, and it gates where a Beat may open.** Each Beat carries one of three named Consequence Tiers (D-021, ADR 0031):

| Tier | What qualifies | What the tier costs the author |
| --- | --- | --- |
| `Chip` | Routine attrition the party absorbs and recovers from. | Nothing; it may appear anywhere. |
| `Structural` | Spawns entities, changes the board, or applies a lasting Status Effect. | Nothing today, now that both rows disclose completely. |
| `Severe` | Can down a Hero **from full health**, or crosses an Escalation Threshold. | It may never appear in the first program of a phase. |

The tier used to set a Beat's earliest legal *horizon*, with `Severe` required to reach a `Forecast` row first. That row is gone (ADR 0031), and what survives is the fairness half: **the first program of every phase may carry no `Severe` Beat**, because the opening Round is the one nobody can have learned anything about. Embermaw's `Hunt Pattern` satisfies this by construction — it is the one Phase I program that does not call Whelps — and Phase II's list is ordered `Ashfall, Molting` to satisfy it too.

The `Severe` tier has **no justification clause**. The old rule allowed a top-tier hit to ship from the `Instant` row with an explicit design justification; with the opener rule doing the work instead, there is nothing left for an excuse to buy. **The floor in `Severe` is load-bearing, and it was added after measurement.** "Can down a Hero" with no floor is not a per-Beat property at all: it depends on accumulated attrition, so the same Beat qualifies or not depending on when it lands. A 30-seed survival-policy run through Phase II makes that concrete — Heroes enter Phase II at `9.7` health on average (min `2`, max `17`) against a `34` maximum, where Phase II's Raking Claw (`6`) and Cinder Breath (`7`) are each routinely lethal, and where Phase I's Cinder Breath (`5`) is equally lethal to a Hero at `4`. Reading the test that way makes nearly every Beat `Severe` by the late Rounds and the tier stops discriminating. Anchoring it to full health keeps it stable per Beat, which is what an authored tier needs.

Consequence for Embermaw: **`Brood Call` is `Severe`, on the Escalation clause rather than the damage one.** No Embermaw Beat downs a Hero from full health — the largest single hit is Phase II's Raking Claw at `11` against an unheld Guarded Front (`6` plus a `+5` unguarded bonus, up from Phase I's `4` plus `+3`), nearly a third of a Hero's health, real pressure but not a spike that needs a Round of banked preparation. Phase II is more dangerous than Phase I because attrition has already run, not because its Beats changed kind, and that is a balance observation rather than a tier one. What earned the tier is that Brood Call can now cross an Escalation Threshold (D-036): a living Whelp at a Round end raises Escalation by `1`, which is one of the three run-ending outcomes, so the Beat is `Severe` by definition and can never open a phase.

The tier is authored on each Beat rather than computed — "can down a Hero" depends on Hero health and would be fragile to derive — but its implications are enforced by tests over live content: a Beat that can add Escalation must be `Severe`, and a Beat that spawns a Minion or leaves a Hazard must be at least `Structural`.

### Role-Load-Bearing Beats (Party-scale rule)

When Party-scale encounters are authored, each encounter must name which Beats are load-bearing for which role: pressure that role is the structural answer to. Prefer problems another role is **structurally suited** to solve over counter tags that arbitrarily role-lock — "no stat total occupies two hexes" beats "requires Healer" (see the [Encounter Design Bible](../../rules/encounter-design-bible.md)). In particular, apply the healer's no-healer-clear test from the [Healer Design Principles](../../rules/character-design-bible.md): some authored pressure (raid-wide damage, sustained attrition, hits sized beyond tank mitigation) must genuinely demand a healer because it is shaped for a healer's economy — not because others are forbidden to answer it — and off-role sustain is budgeted so a no-healer Party feels the absence. This is a forward rule; the current solo Tank slice has exactly one role and already satisfies it trivially.

## Core Mechanics

### Raking Claw

- **Pattern:** the three hexes in Embermaw's forward arc, range 1.
- **Origin:** Embermaw's current facing.
- **Answer:** tank occupies the center-front hex (the Guarded Front) and mitigates; other party members leave the arc.
- **Failure:** the frontmost target takes a Tank Hit; every additional target in the arc takes a Raid Hit. If no Hero holds the Guarded Front, the targeted Tank Hit rakes deeper for `+3` (D-017) — the claw cannot be outrun, only braced.
- **Teaching value:** facing defines a front, position changes who is responsible for the hit, and abandoning the front has a price.

This is the baseline tank check. It is deliberately survivable in the one-player demo, where Elian Voss is always the frontmost target.

### Cinder Breath

- **Pattern:** a three-hex cone extending from Embermaw's forward edge, ranges 1-3.
- **Origin:** Embermaw's current facing.
- **Answer:** leave the cone, rotate Embermaw, interrupt the cast, or use a major mitigation tool if movement is impossible.
- **Failure:** every target in the cone takes a Raid Hit and its hex becomes `Scorched` until the next round.
- **Teaching value:** an obvious board overlay turns the boss's facing into a party-wide movement problem.

`Scorched` hexes deal a small hit when entered and prevent a player from ending a voluntary move there. They are a constraint, not a source of surprise damage.

### Future Party Pattern Example: Furnace Cleave

This is a future human-readable example only, not current Embermaw resource content.

- **Selector:** Tank.
- **Pattern:** `FrontCone`, range 2, source Embermaw, Facing derived from Embermaw's hex to the selected Tank's hex.
- **Inclusion:** the selected Tank's hex is included. The cone continues beyond the Tank, so any non-Tank Hero standing behind the Tank in that projected cone is also affected.
- **Answer:** the Tank holds or moves to aim the cleave away from the raid; non-Tanks avoid the projected cone behind the Tank.
- **Failure:** the selected Tank takes the authored Tank damage; every other Hero in the resolved cone takes the authored Raid damage.
- **Teaching value:** tanks face the boss away from the raid by controlling position, while the rest of the party reads the projection and avoids standing behind the Tank.

### Brood Call

- **Pattern:** one spawn hex adjacent to each party member, selected from legal empty neighboring hexes; in solo, two edge spawns.
- **Origin:** each party member or the arena edge.
- **Answer:** clear Whelps before they occupy safe movement routes; use cleaves and targeted attacks efficiently.
- **Failure:** each living Whelp acts at the next `End` step: it advances one hex toward its nearest player, and bites for one Raid Hit once adjacent. The D-006 implementation gates the bite on adjacency — evaluation showed an unconditional same-round bite made the solo Round-4 checkpoint unreachable in principle, while the creep-then-bite form makes the advance itself the deadline.
- **Teaching value:** adds are board pressure and route blockers, not merely extra health bars.

Whelps must visibly show their next movement/attack intent. Their number scales with party size; their behavior does not change with difficulty.

### Ashen Brand

- **Pattern:** marks the furthest party member; in a three- or four-player party, marks the two furthest members.
- **Origin:** the marked character.
- **Answer:** the marked player moves to an edge hex, receives a cleanse, or uses an immunity effect. The party should not stack on the marked player.
- **Failure:** at the next `Instant`, the branded hex and all adjacent hexes erupt, dealing a Raid Hit and creating `Scorched` terrain.
- **Teaching value:** creates a delayed positioning assignment and a reason to preserve mobility or cleanse tools.

The mark is placed during `Incoming`, remains visible through the `Slow Window`, and resolves during the following `Instant`. It is therefore always answerable before it fires.

### Molten Tail

- **Pattern:** the three hexes in Embermaw's rear arc, range 1; the center rear hex is the strongest zone.
- **Origin:** Embermaw's facing.
- **Answer:** do not greed for rear damage without an escape route; use a displacement cancel or absorb tool if caught.
- **Failure:** targets are pushed one hex away from Embermaw. A target that cannot be pushed takes an additional Raid Hit.
- **Teaching value:** turns the boss's rear from a permanent safe damage zone into a timed risk and introduces displacement.

## Scripted Timeline

The timeline uses the existing `Instant -> Quick -> Incoming -> Slow` structure. Entries below are the intended visible packages, not yet the current `.tres` implementation.

| Round | Instant | Incoming | Lesson |
| --- | --- | --- | --- |
| 1 | Raking Claw | Cinder Breath | Hold the front, then read and leave a cone. |
| 2 | Cinder Breath | Brood Call | Recover from terrain, then prepare for route-blocking adds. |
| 3 | Brood Call | Molten Tail | Clear adds while respecting the boss's rear arc. |
| 4 | Molten Tail | Ashen Brand | Escape displacement, then solve a delayed assignment. |
| 5 | **Molting Roar**: phase break; clear current cone overlay, retain existing Whelps and Scorched hexes | Cinder Breath + Brood Call | The first combination: safe movement space is now contested. |
| 6 | Cinder Breath + Brood Call | Ashen Brand + Molten Tail | A marked player must choose a safe landing while the rear is dangerous. |
| 7 | Ashen Brand + Molten Tail | Raking Claw + Cinder Breath | Tank placement and party spread have to coexist. |
| 8 | Raking Claw + Cinder Breath | **Cinderstorm**: all existing Scorched hexes flare, then Embermaw turns one edge clockwise | Finish before the board becomes unmanageable. |

**This table is a lesson plan, not a schedule.** Since D-037 the program order is drawn from the Raid Seed at setup, so only Round 1 is fixed. Read the rows as the order the *lessons* are meant to arrive in — hold the front, then read a cone, then clear adds — and expect a given run to teach them in a different order. What the seed cannot change is the pool: every three-Round window contains each Phase I program exactly once, so no run skips a lesson or drills one three times.

The three implemented Phase I programs each lead a different demand, which is what there is to learn about this Boss (D-036). With no Forecast Row, telling them apart is a skill built by meeting them rather than a row read off the HUD:

| Program | Beats | Asks for | Deliberately does not ask for |
| --- | --- | --- | --- |
| `Hunt Pattern` | Raking Claw `4`/`+3`, Ash Trail (permanent), Cinder Breath `5` | `Position`, `Mitigate`, `Move`, `Interrupt` | `Kill Adds` — the pinned opener never spawns |
| `Ember Pattern` | Ember Scar, Cinder Breath `10` | `Position`, `Move`, `Interrupt` | `Mitigate` — Armor is wasted on a Round answered by footwork |
| `Brood Pattern` | Raking Claw `4`/`+3`, Brood Call (2 Whelps, `Severe`) | `Position`, `Mitigate`, `Kill Adds` | `Move` — nothing here is dodged |

Phase II mirrors the split at harder values and in the order `Ashfall, Molting`, because `Molting` carries the `Severe` Brood Call and no phase may open on one: `Ashfall` is Cinder Breath `13` plus the scar, `Molting` is Raking Claw `6`/`+5` plus the Brood Call.

`Worldfire` ends the encounter as an explicit end-of-clock failure, not a damage check to out-heal. Since D-023 it is the top Escalation Threshold rather than a round-limit check, and Escalation is what the party actually watches:

| Escalation | Threshold | Effect | Lands |
| --- | --- | --- | --- |
| `1` | Ashen Verge | The western edge burns away permanently: `(-2,0)`, `(-2,1)`, `(-2,2)`. | End of Round 4 |
| `2` | Wider Brood | Brood Call summons one additional Whelp, and the telegraph shows it. | End of Round 5 |
| `3` | Fed on Ash | Whelp bites deal `+1`. | End of Round 6 |
| `4` | Closing Jaws | The burn spreads around both western corners: `(-1,-1)`, `(-1,2)`. | End of Round 7 |
| `5` | `Worldfire` | The party is defeated. | End of Round 8 |

The `Lands` column is the **automatic-tick** schedule: where each threshold falls for a party that answers every demand. Acceleration only shortens it. Since D-036 priced Brood Call at `1`, a party that leaves Whelps standing crosses each threshold about a Round early and meets `Worldfire` around Round `6` — and in the solo sweep the only policy that still sees Round `8` is the one that spends its Quick Slot clearing Whelps. The Encounter Clock is the length a party earns, not the length it is given.

**Ash Trail is the Tank's own contribution to that closing (D-039).** The claw cannot be evaded, so the only question is what it costs the floor: a hit that draws blood burns the hex the Tank was standing on, permanently, while a hit absorbed on the Guarded Front for zero Health loss spills its ash one hex further from Embermaw instead. It never spills less — the arena loses the same ground either way, and the Tank only chooses whether that ground is the front they have to keep holding. Backed against the rim there is nowhere to spill and the ash lands underfoot regardless, which is the rule refusing to reward perfect play with immunity.

This is Tank Principle 1 applied to standing room rather than Health: *perfect play slows the bleed and never stops it*. Preventing the burn outright would have been the FFXIV Warrior failure in a new denomination — mitigation that stops needing a party.

Honest dose, recorded rather than implied: **Ash Trail currently accounts for about `1` burnt hex of `19` per fight (`1.6` for a dodging line), against the `5` the Thresholds already take.** Hunt is one of three programs and fights end around Round 6, so only about two Ash Trails resolve. The mechanism is right and its weight is not yet real; raising it is a dosage decision, not a design one.

Two of the Thresholds were `+1` damage each until D-031 replaced them: escalation is felt as the arena closing toward Embermaw, not as a larger number. The ground that burns is always the ground furthest from the Boss, and never a hex adjacent to it — burning the Guarded Front would leave the Tank unable to move into the place their kit exists to hold.

The "Lands" column is the automatic schedule — ticks begin at `Encounter Clock - 4` and run one per Round end. Acceleration can pull every row earlier; Embermaw's Brood Call prices its unanswered demand at `0` until the deck holds a Whelp answer (D-003), so today the schedule is the whole story.

## Phase Break: Molting Roar

> **What ships today (ADR 0023).** The Phase Trigger below is implemented — 18 Health or the start of Round 5, whichever comes first — but Phase II is built from the six Beat kinds the engine already has, at harder values plus the unguarded-Guarded-Front bonus: `embermaw_molting` and `embermaw_ashfall`. The Conflagration package in the round table above (Ashen Brand, Cinderstorm, Molten Tail) is deferred with its delayed markers, board-origin patterns, and rear arcs, and stays authored here for when those land.

At the phase break, Embermaw loses its brittle outer scales:

- turn Embermaw one legal hex edge clockwise;
- retain existing Whelps and Scorched terrain;
- show the entire Phase II timeline package before the party enters the next Quick Window;
- do not deal unavoidable damage during the transition.

The break is a readability beat. It refreshes the board's meaning instead of introducing a hidden second rule set.

## Role Responsibilities

| Role | Primary answer | Secondary contribution |
| --- | --- | --- |
| Tank | controls front arc, absorbs Raking Claw, manipulates or survives boss-facing pressure | clears nearby Whelps and protects branded allies |
| Healer | stabilizes failed patterns, clears Ashen Brand, preserves party freedom to move | invests in mitigation for unavoidable overlap |
| Damage | clears Whelps, interrupts Cinder Breath, exploits openings after Tail | supplies mobility or displacement to resolve shared patterns |

In the current solo tank demo, Elian Voss receives all three responsibilities in simplified form: armor answers Claw, paid movement answers Breath/Brand, and attacks clear Whelps. The multiplayer rules must preserve specialization instead of letting the tank trivialize every Raid Hit.

## Mobile Presentation

- The board is the primary pattern display: danger hexes, target icons, arrows, marks, and Scorched terrain render in place.
- The compact boss strip always shows current `Instant` and `Incoming` names, an icon for each counter tag, and a tap target for full detail.
- A detail sheet contains the short rule text and a legend, never the only depiction of the pattern.
- The UI must distinguish telegraph, resolved damage, persistent terrain, and selected movement destination without relying on color alone.

## Raid-Run Hooks

Embermaw can be visible at raid start with this short mechanic preview:

- frontal arcs and breath cones;
- fire marks and Scorched terrain;
- Whelp route pressure;
- a phase-two combination test.

This gives route rewards an honest job: improve a known answer, add a temporary answer, or create a stronger charge pattern. It does not require the encounter to disclose every exact draw order.

## Implementation Delta

The current `BossActionData` supports direct tank/raid damage, summoning, and boss healing only. To implement this design, add authored support for:

- pattern templates anchored to a facing, hex, unit, or marker;
- a board overlay model with telegraphed and persistent states;
- range checks and front/rear arc queries;
- delayed markers and end-step minion intents;
- displacement with collision handling;
- phase script swaps or timeline packages;
- player-count targeting rules and solo fallbacks;
- mobile boss-intent display, because the current portrait HUD hides the desktop intent panel.

The existing `Embermaw` resources remain the runnable smoke-test encounter until this delta is implemented.
