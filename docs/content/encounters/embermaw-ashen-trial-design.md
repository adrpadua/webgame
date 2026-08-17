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
| Health | 36 in the single-tank demo; scale health by party size and difficulty, not by adding opaque defenses |
| Encounter Clock | 8 rounds; enrage begins at round 9 |
| Phase Break | At 18 health, or at the start of round 5 if the party is ahead of the health threshold |
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
- **Telegraph lead scales with consequence.** Routine chip pressure may resolve from the `Instant` row. A hit that can down a Hero, spawn entities, or permanently change the board belongs in the `Incoming` row or on a longer delayed marker, so the party always has at least one full player window to answer the largest threats. Authoring a top-tier hit as an `Instant` requires an explicit design justification.

### Role-Load-Bearing Beats (Party-scale rule)

When Party-scale encounters are authored, each encounter must name which Beats are load-bearing for which role: pressure whose intended counter tags only that role's kit executes well. In particular, apply the healer's no-healer-clear test from the [Healer Design Principles](../../rules/character-design-bible.md): some authored pressure (raid-wide damage, sustained attrition, hits sized beyond tank mitigation) must genuinely demand a healer, and off-role sustain is budgeted so a no-healer Party feels the absence. This is a forward rule; the current solo Tank slice has exactly one role and already satisfies it trivially.

## Core Mechanics

### Raking Claw

- **Pattern:** the three hexes in Embermaw's forward arc, range 1.
- **Origin:** Embermaw's current facing.
- **Answer:** tank occupies the center-front hex and mitigates; other party members leave the arc.
- **Failure:** the frontmost target takes a Tank Hit; every additional target in the arc takes a Raid Hit.
- **Teaching value:** facing defines a front and position changes who is responsible for the hit.

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
- **Failure:** each living Whelp contributes one Raid Hit at the next `End` step, then advances one hex toward its nearest player.
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

At round 9, `Worldfire` ends the encounter. It is an explicit end-of-clock failure, not a damage check to out-heal.

## Phase Break: Molting Roar

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
