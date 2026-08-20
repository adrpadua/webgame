# Prototype Rules

This document describes the current playable rules of the prototype as they exist in the repo today.

Use [CONTEXT.md](../../CONTEXT.md) for canonical terms and the ADRs for why the model exists.

**Adopted but not yet in the engine.** One rules decision is canon and is not described below, because nothing implements it yet: randomize-before-commitment (D-022, [ADR 0025](../adr/0025-randomize-before-the-window-that-answers-it.md)). It currently forbids nothing, because the authored encounter resolves with no rules randomness at all.

Use [player-card-authoring.md](player-card-authoring.md) when creating or editing player cards.

## Encounter Structure

Each round follows this order:

1. `Loadout Step`
2. `Boss Instant`
3. `Quick Window`
4. `Boss Incoming`
5. `Slow Window`

When the `Slow Window` ends, the next round begins and the boss timeline rolls forward.

## Escalation

Escalation is the encounter's only clock (D-023, [ADR 0027](../adr/0027-make-escalation-the-encounters-single-clock.md)). Embermaw carries a value from `0` to `5`:

- **Automatic tick.** At each round's end step, from round `escalation start` onward, Escalation gains `1`. The start round is derived as `Encounter Clock - 4`, so on Embermaw's `8`-round clock the ticks land at the ends of rounds `4` through `8`.
- **Acceleration.** An authored Boss Beat may add Escalation when its demand is still standing at a round's end step. A Minion that arrived during the current round does not count — it spawns in the `Incoming Row`, so no player window could reach it. A Minion with a fuse never reaches a round end at all, so its demand is charged where the fuse runs out instead: a Round in which a Whelp detonated bills Brood Call's authored `1`, once, whatever the brood's size (D-063). The deck's answer is Sweeping Blow, which one-shots a Whelp (D-003).
- **Thresholds.** Reaching a value applies its authored effect for the rest of the fight, and effects at different values stack. Embermaw: `1` Ashen Verge (the western edge — `(-2,0)`, `(-2,1)`, `(-2,2)` — becomes permanently Scorched), `2` Wider Brood (Brood Call summons one more Whelp, and the telegraph shows it), `3` Fed on Ash (Whelp bites and detonations `+1`), `4` Closing Jaws (the burn spreads to `(-1,-1)` and `(-1,2)`). Structural thresholds place permanent Scorched hazards that no Round boundary clears, and never a hex adjacent to Embermaw, so the Guarded Front cannot burn (D-031).
- **The top threshold ends the fight.** At `5`, the encounter ends in enrage defeat unless Embermaw has already been defeated. There is no separate round-limit check; with no acceleration this lands at the end of round `8`, exactly where the old clock expired.

`Embermaw: Ashen Trial` therefore has an `Encounter Clock` of `8` rounds, and a party that leaves demands standing reaches the end sooner.

## Boss Timeline

The boss has a two-horizon timeline, and every beat in either row states every parameter ([ADR 0031](../adr/0031-remove-the-forecast-row-and-let-the-schedule-be-learned.md)). Row names state *when*, never how much is known. A third row, `Forecast`, previewed next round's program at family level until measurement showed reading it changed no outcome; the schedule is learned by playing now.

- `Instant Row`: the action already resolving this round, with every parameter
- `Incoming Row`: the action telegraphed for later this round, with every parameter, then promoted into the next round's instant

The rows are a rules structure, not a HUD band. The persistent strip that listed both rows by name is gone (D-060): a beat is read as a `Beat Card` when it resolves, carrying its damage, target, reach, rules text and answers, and the `Incoming Row`'s threat is on the board ahead of the `Quick Window` as the telegraph it always was — the breath cone and the marked spawn hexes, painted before the row resolves.

### The Movement Clause

Any Beat may carry a movement clause, and it resolves before the Beat's own effect (D-074). `move_tiles` is how far the Beat may travel, `traversal` is how it crosses the ground, and `range_tiles` is how close it is trying to get — one Beat can therefore be "Move 2, then Claw", the shape a Gloomhaven monster card has, rather than two Beats a Program has to keep in order. `advance_toward_player` is now simply the Beat kind whose *only* effect is the move.

The rule that governs all movement is **go no further than you have to**: a mover stops the moment its target is within the Beat's `range_tiles`, and does not move at all when it already is. That is what makes an advance readable — it comes exactly close enough to do the thing it is about to do — and it is what stops a Boss walking past the Hero it is hunting.

Three traversals, and the difference between them is entirely what the ground can do about it:

| `traversal` | How it crosses | What stops it |
| --- | --- | --- |
| `walk` | Hex to hex, through ground it can stand on. Pays Hazard entry for every hex crossed. | Pieces and Hazards authoring `impassable` lengthen the route or close it off, so a walker can be blocked, funnelled, or stranded. |
| `jump` | Straight over whatever is in between. Pays Hazard entry only where it lands. | Nothing en route; the landing still has to be ground it could stand on. |
| `teleport` | No route at all — it appears on the hex that best answers its `range_tiles`, anywhere on the board. | Only the landing. It spends no allowance, so a teleporting Beat authors no `move_tiles`. |

A Boss that walks can be kited into a corner and a Boss that teleports never can, which is the identity difference the field exists to author. Embermaw walks: `Close the Gap` is `move_tiles: 1`, `range_tiles: 1`, `walk`.

A Movement Clause is **Boss identity, never counter-pressure against distance** — measured, not assumed. Against a Boss that leaps the whole camping distance, 12 of 16 `far` policies gained Boss damage they otherwise never dealt (`dual_steady/far`, `0.00` → `8.80`) and survived no longer, because since D-073 a camper's melee reach lands only when the Boss arrives: any movement toward the party is a gift of range. So **a Boss's closing distance per Round must stay under the distance a camper can open**. Embermaw closes one against a camper who opens three, never reaches them, and its `far` policies still deal nothing. `embermaw_traversal_probe` is the evaluation Encounter that checks the bound; re-run `npm run evaluate -- --encounter embermaw_traversal_probe` when a Boss wants to move further. Counter-pressure against camping stays the `demand_proximity` Beat. A second probe, `embermaw_terrain_probe`, isolates the ground: shipped movement, and the Brood program collapsing the floor the claw struck. Measured at Embermaw's scale, impassable ground registers as standing room alone — the `burnt` column rises about one hex on the lines the claw reaches and **nothing downstream moves** — which also bounds what the sweep can see: a fixed script does not path, so funnelling pressure on a live player is below its resolution and owes playtesting rather than another sweep.

Two limits are deliberate rather than pending. A **teleport lands on the nearest legal hex that is closer to its target than where it started** — it cannot flank, cut off a retreat, or reposition off the `Guarded Front`. Making the landing authorable is a vocabulary with no content behind it, and it should arrive with the Boss that needs it. And a **Movement Clause is legal on the `Instant Row` only** ([ADR 0039](../adr/0039-traverse-as-a-clause-on-any-boss-beat-instant-row-only.md)): the `Incoming Row` is telegraphed a phase before it resolves, so a moving Beat paints a cone the Hero invalidates by stepping — the defect ADR 0031 removed the `Forecast Row` over. The honest form, for whoever needs it, is to move the piece at telegraph time so the cone is drawn from where the Boss will actually stand.

The current prototype boss is `Embermaw`, using a short scripted loop of authored boss actions.

## Player Role

The playable role is a tank hero named `Elian Voss`.

Starting player values in the prototype:

- `Health`: 34
- `Stamina`: created only by discarding a card to move; no meter or default grant
- `Hand refresh`: at the end of each Round, draw until the hand contains 4 cards
- `Action Bar Slots`: 2
- `Opening hand`: 4 cards

## Action Bar Rules

The action bar is the main player action model.

Each slot can hold:

- one `Top Card`
- a `Charge Stack` of tucked cards

Current slot rules:

- A Top Card enters a Slot at `0 Charge`; its `Charge Value` is the maximum number of tucked cards it can hold
- A Slot needs at least one charged hand card before it can activate
- Any hand card can charge a Slot during either player window; the Top Card alone determines activation timing
- A charged Slot activates once in its matching player window, then cannot receive more charges for the rest of that window
- Activation does not consume the Charge Stack. The Top Card's printed rules determine how charge count and Keywords modify its effect
- A full, unactivated Slot is `Full` and persists for a later activation or an explicit special interaction
- If a full Slot activates, discard its Top Card and Charge Stack at the end of that matching player window
- During the beginning-of-Round Loadout Step, freely replace any Slot: discard its old Top Card and Charge Stack, then load a hand card at `0 Charge`
- Re-loading a Slot that began this Loadout empty is a Swap: the tentative Top Card and its charges return to hand instead of discarding, so a decision made this Loadout can be reconsidered freely
- An empty Slot may receive a Top Card for free during either player window
- Preparing, charging, and activating cost no resource. Each one-hex move discards one hand card for `1 Stamina`; repeat that gesture to sprint

## Interaction Model

The playable surface is the web Encounter Workbench (ADR 0019): the portrait play surface in a desktop frame, with the hex board as the central canvas and the Action Bar above the Hand in the Bottom Interaction Zone. The canonical interaction vocabulary lives in [CONTEXT.md](../../CONTEXT.md) — `Compact Card`, `Detail Popup`, `Stat Panel`, `Board Feedback`, `Scripted First Turn` — and the evolving presentation direction in [oathcraft-interface-direction.md](../content/oathcraft-interface-direction.md).

- A Compact Card in the Hand shows name, timing, and Charge Value; complete numbers and authored text live one gesture away in its Detail Popup (touch presses and holds, a mouse hovers, the keyboard holds `Enter` or `Space`).
- A Slot offers its legal action in place: Prepare when empty, Charge during a player window, and during Loadout either Swap (a Slot placed this Loadout — cards return to hand) or Replace (a carried Slot — its bundle discards).
- Tapping a piece's tile opens its persistent Stat Panel over the board's lower edge; a tap on an empty hex closes it.
- Movement spends a hand card for `1 Stamina` toward an adjacent legal hex during the Quick Window.
- `Next` drives phase progression. Board Feedback derives every motion from Resolution Facts, so the board never shows a blow the Encounter did not resolve.
- A first-time player's Round 1 runs the Scripted First Turn, gating input to one control at a time; it carries a `Skip` and retires once finished or skipped.
- The Escalation gauge sits in the phase band, on its own line under the Round track and the full width of it (D-060; it rode the Boss Program strip's header until that strip was removed): five bands, filled for each one crossed, with the top band washed in because it ends the fight. Its Detail Popup names every band, quotes the Encounter's enrage line for the last, and says when automatic ticks begin.

## Resources

The prototype currently uses this practical player resource:

- `Armor`: damage mitigation that is cleared at the start of each new round. A `Fortified` status (Fortify, D-019) grants its Armor at the next Round start, immediately after that wipe.

Keywords are authored content in `data/keywords/` and are the one tag namespace: Card tags, a Beat's Role selector, a Beat's damage classification, and the answers a Boss Program demands are all Keyword references, checked at load against both the id and the `kind` that reference accepts (D-046). A Keyword carries no behaviour — what reads it decides what it means. Keyword ids the rules themselves name, such as the `tank_hit` classification that decides whether a Tank Hit can grant Riposte Ready, must be authored with the matching kind or the content fails to load.

Counters are authored content in `data/counters/` and attach to a **host**: a combatant (a Hero **or** an Enemy), a hex, or a prepared Slot (D-032, D-033, D-047, D-048). Ground outlives whoever stands on it; a Slot's Counters ride its prepared Top Card and go when that card is replaced. A card may only place a Counter whose host its own `target_type` can supply, and only a combatant host may carry Readers. A Boss Beat may place one too, on the Party or on the Boss itself (`place_counter`, D-051) — Embermaw banks `Heat` on itself, and every Heat adds 1 to every blow it deals. Ground that a structural Escalation Threshold burns away for good loses the Counters on it; a temporary Hazard does not (D-050). A damage Reader may narrow itself to one `event_keyword`, answering only blows carrying that Damage Keyword; naming none answers every blow of its kind (D-049). Damage Keywords are authored plural on Boss Beats and Cards alike, because who a blow is aimed at and what it is made of are two axes. Escalation is not a Counter: it counts the same way, but its thresholds are one-shot band effects on the whole board rather than per-count modifiers on a host (D-048). A Counter is a named marker with a count, a cap (`max`), and optionally a clock; it does nothing by itself. Everything a Counter does is a **Reader** — an authored entry naming the event it answers and what it adds per Counter held — so a Counter never declares which side it is for: Sundered raises what its host takes, Weakened lowers what its host deals, and either would work on either side. A card names one through `places_counter` and `counter_amount`, and `target_type` decides where it lands: `none` on the firing Hero, `piece` on a selected piece. `max: 1` refuses a second placement; anything higher accumulates, which is how Fortify banks its Armor as a count. A card may also `read` Counters when it fires, through three verbs: `gate` refuses the fire unless the count qualifies, `scale` adds per Counter held, and `spend` removes them — as a cost paid before the card's effects are computed, or at resolution after. Readers never combine with boolean logic; every gate must pass and that is the whole grammar. Every combatant's Counters run the same clock: one with an authored `duration_rounds` ticks down at each Round start and comes off when it runs out, on the Boss and its Minions exactly as on a Hero, and one whose host leaves the board leaves with it (D-045). The Stat Panel shows a piece's live Counters whoever holds them, with the count when more than one is held. No card in the live deck places a Counter yet — the mechanism is proven by tests, and the first such card owes the deck-evaluation gate. Attaching to a prepared Top Card (`board_slot`) is built as of D-048; binding a Counter to a named Boss Beat is canon but unbuilt (D-035).

Stamina is a direct card-discard movement payment, not a stored resource. The opening hand is `4` cards. At the end of each Round, draw until the hand contains `4` cards; this is a refill target rather than a hard hand limit. Cards remaining in hand stay there; discarded cards shuffle back into the deck when the deck runs out.

The player panel always shows current hand, deck, discard, and Armor values. It does not show Energy or a Stamina meter. (`Presence` was removed by ADR 0022.)

## Movement

Movement is a basic action, not a free board interaction.

Current movement rules:

- Movement is only available during the `Quick Window`
- A basic move discards one hand card for `1 Stamina`
- The player may move exactly one hex
- The destination must be adjacent
- The destination must be empty
- The player may not move onto the boss or an occupied enemy hex

Movement can be asked for three ways, and all three resolve as the same paid move:

- drag a hand card onto a valid adjacent empty hex — the dragged card pays;
- tap a hand card, then tap a legal hex — the selected card pays;
- drag the Hero itself onto a valid adjacent empty hex — the gesture names only the destination, so the Hand answers: its cards rise and wait, the board holds the chosen hex lit, and the card tapped is the card spent. Calling the step off — `Stay put`, `Escape`, or touching the board again — spends nothing.

Pressing and holding the Hero still previews legal routes; a press that releases on the Hero's own hex is the ordinary tap that opens its Stat Panel.

Moving also sets the player's facing to the traversed hex edge. Facing is always one of `E`, `NE`, `NW`, `W`, `SW`, or `SE`; no in-between directions are legal.

Three different things move a piece, and they are not the same rule. A **paid step** is the Hero's own move above. A **displacement** is a force applied to a piece — Push and Pull ([ADR 0029](../adr/0029-resolve-forced-movement-one-hex-at-a-time.md)) — re-aimed every hex and stopping dead against whatever it runs into. A **traversal** is a piece crossing the board under its own power along a route it decided in advance, which is why it can go around what a displacement would stop at.

Every Enemy that moves under its own power traverses: a Boss Beat's movement clause and a Minion's creep are the same event and emit the same action (D-072). A displacement stays the dumber rule on purpose, but it respects the same impassable ground — "impassable" must not mean "impassable unless pushed", or a Push would be the one way onto ground the arena has taken away. A traversing piece ends facing the way it went, exactly as a paid step does.

What ground does to a traverser is authored per Hazard, not decided by the engine (D-074):

- `impassable` — ground nothing enters, by any means: a paid step, a Traversal, or a Push. Held apart from `blocks_voluntary_movement` on a **physics versus choice** axis: `blocks_voluntary_movement` is fire a Hero would not *elect* to step into, which a shove can still put them on; `impassable` is a wall. Ground can be both, either, or neither. The axis started out as Hero-versus-Enemy, which let the Tank stroll through walls the Whelps had to walk around (D-075).
- Nothing **arrives** on impassable ground either. Arriving is not moving, so the movement rules never saw it, and Embermaw authored two of its five spawn candidates on hexes its own Escalation Thresholds burn — so past `Ashen Verge` the brood landed on ground the rules say nothing can stand on. Spawn selection now skips impassable ground, and Embermaw's candidates moved off the hexes it burns. A Burst is damage rather than occupancy and consults no terrain; hex Counters are unaffected, and D-050 already clears them when ground burns for good.
- `damages_source_team` — whether this ground burns the side that laid it. D-042's immunity is still the default and still the right one, but it is now the Hazard's decision rather than the engine's: Embermaw's Scorched declines to burn it, and a later Boss's ground can be authored to accept, which makes "lure it onto the hex it just burned" a fight somebody can build.

## Minions

Minions act at the end of each Round, after the Slow Window and before the Round wraps, in spawn order (D-006):

- A Minion within its authored `range_tiles` of its nearest Hero bites for its authored attack (a Whelp reaches `1` and bites for `1`). Minion damage is a Raid Hit: Armor blocks it, and it never grants Riposte Ready.
- A Minion out of reach traverses toward its nearest Hero, spending its authored `move_tiles` by its authored `traversal`, and stops the moment the Hero is within its reach. A Minion with nowhere to go holds. This is the same movement every Enemy uses (D-072): a Whelp walks the way Embermaw walks, so ground that funnels one funnels the other.
- The creep is the deadline: `Kill Adds` means clearing a Minion before it arrives, and every step it takes also removes a route the party could have used.
- What Hazards do to a creeping Minion is authored on the Hazard, not assumed of Minions. Scorched declines to block or burn the side that laid it, which is why a Whelp crosses Embermaw's fire freely — a fact now visible in `data/hazards/scorched.json` rather than stated in engine code.
- Each Minion's next action is a visible, deterministic Minion Intent derived from the live board; the engine exposes it as a projection (`minionIntents`).

A Minion may also carry a fuse (D-063), authored on the Minion as `explode_damage` and `explode_radius` — both or neither:

- It detonates on the `Incoming Row` of the Round after the one it arrived in, before that Row's Boss Beats resolve, and is consumed. A Whelp deals `3` at radius `1`.
- The blast is a Raid Hit against every Hero inside the radius and against nothing else: an Enemy blast never touches the Boss or another Minion, the same way a player `Burst` never touches a Hero.
- A detonation is not a Minion Defeat. No damage action removes the piece, so nothing records `target_removed` and no Hero is credited a kill.
- It gets exactly one end step, on the Round it arrived in, so its creep is what carries the blast into range rather than a deadline of its own.
- Two answers, and they are not equivalent: killing it inside its single Round answers the demand, while stepping out of the blast only avoids the damage — the Escalation is charged either way (see Acceleration).
- The pending blast is a projection (`minionDetonations`), live for the whole Round the fuse burns through, and the board paints its footprint: a quiet wash over the ground with one warm outline around the outside of it. It is read from the live board rather than stored, so clearing the Minion takes the mark with it the same frame.

## Targeting

`Enemy` is the broad hostile-combatant term. The Boss and Minions are both Enemies, and are mutually exclusive: the Boss is never a Minion.

Cards currently resolve against one of these target styles:

- no target
- direct damage to the Boss through a card's `boss_damage` effect
- selected Minion piece on a hex through the current `PIECE` target type

### Reach

Every card that touches anything past the Hero firing it authors a reach: `range_tiles`, in hexes, measured from the Hero's hex to whatever the card lands on. It is one number for the whole card, and it answers every reaching effect the card has — a selected piece, a selected hex, forced movement, and the Boss a `boss_damage` card never has to name. A card that reaches nothing but its own Hero authors no reach at all, and the content validator refuses both halves of the mismatch (D-073).

Two exemptions were withdrawn to get there. `boss_damage` used to resolve without a range check, so a Hero's position never blocked it; and the Boss was the one Enemy a piece-targeting card could mark from any distance, exempted expressly to stay consistent with the first rule (D-034, kept by D-047). Both are gone: the Boss answers the same reach every other Enemy does. `board_slot` stays reach-free, because an ally's prepared Top Card is not a place on the board and support was chosen adjacency-free (D-009).

The melee vocabulary is authored as `range_tiles: 1` — Steady Strike, Shield Slam, Unyielding Step, Taunting Challenge, Quench, and Elian's Riposte all swing at arm's length, which is what their rules text already said.

A Boss Beat answers the same rule, and needs a reach for any of three reasons (D-074): it is a kind that always reaches (`forward_cone`, `demand_proximity`, `targeted_hit`), it is a `place_counter` aimed at a Hero, or it carries a movement clause — which needs `range_tiles` to know how close is close enough. Marking the Party was the last thing the Boss could do to a Hero from anywhere on the board; it stayed that way only because no authored Beat used it. Marking *itself* measures nothing and must not author a reach. The other half of the rule stands: a Beat with no distance question to ask must not answer one.

Counter-pressure against playing at a distance is now priced twice, in the card and in the encounter, and the encounter half is unchanged. A `demand_proximity` Beat (D-041) raises Escalation if no Hero stands within its authored reach at the Round end — Embermaw's `Within Reach` charges `1`. It is priced in Escalation rather than in Health on purpose, because a Health price is one a camper can simply out-heal or out-armor, while the clock is the thing that ends the fight. A Beat may still carry an `unguarded_bonus` for a hit that reaches past the hex the Boss faces; Raking Claw carried one until it gained a reach of `1`, at which point there was no unbraced hex left for it to price (D-062).

The prototype does not yet provide a selectable generic Enemy target. A future `Enemy` selector must allow both the Boss and Minions, then validate their shared range and targeting rules consistently.

Attempting an action with an invalid target or in the wrong window is rejected with visible feedback.

### Reusable Target-Pattern Catalog

This catalog defines geometry for future Boss and player effects. It does not add a targeting interface, alter a current card or encounter, or make a visual reference file into gameplay authority. `EncounterEngine` remains authoritative: it resolves geometry before it filters Pieces or applies effects.

All coordinates are axial. The canonical base orientation is `E`, whose forward delta is `(1, 0)`. Directional entries rotate that base geometry through the six legal Facings: `E`, `NE`, `NW`, `W`, `SW`, and `SE`. The result retains only on-board hexes in a stable engine-defined order. Off-board cells are omitted; they never wrap or become placeholder targets.

| Pattern ID | Selection binding | Axial parameters and canonical `E` semantics | Facing |
| --- | --- | --- | --- |
| `Target` | `piece` | No shape parameter. The result is the selected Piece's current hex. Piece legality is checked after this geometry result. | None |
| `Radius` | `hex` | `radius >= 0`. Include every hex whose axial distance from the selected hex is at most `radius`, including the origin. | None |
| `Ring` | `hex` | `distances` is a non-empty set of positive integers. Include every hex whose axial distance from the selected hex is in `distances`; do not include the origin. | None |
| `FrontCone` | `direction` | `range >= 1`. From the source origin, include the forward wedge expanding from the `E` ray through range. | Required |
| `BackCone` | `direction` | `range >= 1`. Resolve `FrontCone` with the supplied Facing reversed by three hex edges. | Required |
| `FrontLine` | `direction` | `range >= 1`. Include `(1, 0)` through `(range, 0)` from the source origin. | Required |
| `BackLine` | `direction` | `range >= 1`. Resolve `FrontLine` with the supplied Facing reversed by three hex edges. | Required |
| `Sides` | `direction` | `range >= 1`. For each distance from `1` through `range`, include the two rays one hex edge clockwise and counter-clockwise from Facing; do not include the forward or rear ray. | Required |
| `Cross` | `direction` | `range >= 1`. For each distance from `1` through `range`, include the four rays one and two hex edges clockwise and counter-clockwise from Facing; do not include the forward or rear ray. | Required |

`none` is a valid `Pattern Selection Binding` for a future authored use that centers geometry on a supplied source origin without a selection. None of these nine initial catalog entries uses it. This catalog also does not turn `piece` into a generic Enemy selector; current runtime targeting restrictions remain unchanged.

#### Target-Bound Directional Boss Patterns

A Target-Bound Pattern composes existing Boss targeting and Target Pattern vocabulary:

1. Resolve the Boss Beat's `Target Selector` to one selected Piece.
2. Use the Boss's current hex as the pattern source origin.
3. Derive a Facing from the source origin toward the selected Piece's current hex, snapped to one of the six legal Facings: `E`, `NE`, `NW`, `W`, `SW`, or `SE`.
4. Resolve the authored directional Target Pattern, such as `FrontCone` or `FrontLine`, from the source origin with that derived Facing.
5. Apply the Beat's authored filters and effects to Pieces in the Pattern Result.

The selected Piece and the affected Pieces are tracked separately. An authored Tank cleave may select the Tank, include the Tank's hex in the Pattern Result, and continue through or beyond that Tank to affect non-Tank Heroes behind them. Off-board cells are clipped exactly like other Target Patterns. If the selected Piece is on the Boss's hex or cannot produce a legal source-to-target direction, the Beat is invalid for this composition unless it defines an explicit fallback.

This is a future-party Boss pattern capability. It does not change current Embermaw resources, redefine `Raking Claw` or `Cinder Breath`, add player-card targeting UI, allow arbitrary-angle aiming, or require persistent player-facing mechanics.

#### Reference-Only Asset Map

The files under `C:\Users\adrpa\OneDrive\Boss Battle\Code Scripts\outputs\TargetPatterns\` are human reference only. The matching `PNG` and `SVG` filename pairs carry the same mapping below. Their black arrows are drawn between hexes, so their displayed downward orientation is **not** a legal Facing and has no axial or runtime authority. Every directional catalog entry instead uses the canonical `E` base geometry above and rotates through the six legal Facings.

| Catalog ID | Reference filenames | Mapped parameters | Reference orientation |
| --- | --- | --- | --- |
| `Target` | `3_Target` | no parameters | non-directional |
| `Radius` | `18_Radial1`, `19_Radial2` | `radius: 1`, `radius: 2` | non-directional |
| `Ring` | `13_Ring1`, `14_Ring2`, `15_Ring3`, `16_Ring13`, `17_Ring23` | `distances: [1]`, `[2]`, `[3]`, `[1, 3]`, `[2, 3]` | non-directional |
| `FrontCone` | `4_FrontCone1`, `5_FrontCone2`, `6_FrontCone3` | `range: 1`, `2`, `3` | legacy down-arrow only; canonical runtime base is `E` |
| `BackCone` | `7_BackCone1`, `8_BackCone2`, `9_BackCone3` | `range: 1`, `2`, `3` | legacy down-arrow only; canonical runtime base is `E` |
| `FrontLine` | `51_FrontLine1`, `52_FrontLine2`, `53_FrontLine3` | `range: 1`, `2`, `3` | legacy down-arrow only; canonical runtime base is `E` |
| `BackLine` | `54_BackLine1`, `55_BackLine2`, `56_BackLine3` | `range: 1`, `2`, `3` | legacy down-arrow only; canonical runtime base is `E` |
| `Sides` | `20_Sides1`, `21_Sides2`, `22_Sides3` | `range: 1`, `2`, `3` | legacy down-arrow only; canonical runtime base is `E` |
| `Cross` | `33_Cross1`, `34_Cross2`, `35_Cross3` | `range: 1`, `2`, `3` | legacy down-arrow only; canonical runtime base is `E` |

All other supplied files, including `VerticalCones`, `Left`, `Right`, `CrossCone`, `CrossV`, `Vertical`, `Stripes`, `Pinwheel`, `ThickStripe`, `RaidWide`, `Slant`, and `SafeButt`, are outside this reusable catalog. They remain reference-only candidates for a future boss-specific or composed pattern proposal.

## Damage and Survival

Current prototype damage rules:

- `Armor` blocks incoming damage before health is lost
- Remaining damage reduces health
- `Tank Hits` and `Raid Hits` are separate authored values on boss actions
- In the one-player vertical slice, both hit types resolve against Elian Voss; their labels remain visible so the model can later target a 2-4 player party
- Reducing Embermaw to `0` health is victory
- Reducing Elian Voss to `0` health or reaching the enrage timer is defeat. Solo this is immediate, and stays so under D-070: `Downed` requires a living ally, and Elian has none.

## Encounter Resolution

The encounter is active until one terminal outcome occurs:

- `Victory`: Embermaw reaches `0` health
- `Defeat`: Elian Voss reaches `0` health
- `Enrage Defeat`: the round counter advances past the encounter clock

With a Party, defeat is the whole Party being out at once rather than any one Hero falling (D-070, ADR 0036): a Hero at `0` becomes `Downed` — a blocking, non-targetable body who answers no demand and satisfies no Role selector — and is `Revived` by an adjacent ally discarding a card, or becomes `Incapacitated` at the end of the following Round. An Incapacitated Hero leaves the board, loses their Counters, hand, and deck, costs the Party one Escalation (`unanswered_rescue`), and thereafter chooses one of three ally-facing actions each Round. They are never removed from play. The solo slice above is unaffected, because `Downed` needs a living ally: with nobody who could perform the rescue, a Hero at `0` is still an immediate defeat.

The result is shown in the top bar and board feedback. Encounter history remains available to debug tooling, while gameplay controls lock after resolution and `Restart Encounter` creates a fresh shuffled deck, board, boss timeline, and encounter clock.

## Current Tank Starter Deck

The live/default tank deck is the five-identity Shield Wall list carried by `data/encounters/embermaw_prototype.json` (ADR 0020), fighting beside Elian's Signature:

- `Steady Strike` (6 copies): deal `2` boss damage, plus `1` per charged card.
- `Iron Guard` (8 copies): gain `3` Armor, plus `1` per charged `Guard` card.
- `Sweeping Blow` (2 copies): deal `2` damage to a selected adjacent Minion.
- `Fortify` (2 copies): Slow; gain `6` Armor at the start of the next Round, landing after the Round-start wipe (D-019).
- `Drive Back` (2 copies): push a selected piece 2 hexes directly away from you.

**The Signature Slot (D-064, ADR 0032).** Elian's fixed power, *Riposte*, is a third always-present Slot whose Top Card is printed on the Hero — never in the deck, never drawn, never replaced, never discarded. Its **standing clause** grants the Slot one Charge when Elian absorbs a Tank Hit on the Guarded Front for zero Health loss; hand cards can never charge it, and earned Charges bank across Rounds up to `2` (a block while full earns nothing). Its **activation** (Quick) spends all Charges for `3` Boss damage `+2` per Charge; fired at the full cap of `2`, it also places `Sundered` on the Boss after its own damage resolves. `Shield Slam` and the Riposte Ready Counter retired into it, together with D-015's graded cash-out.

The full specification and card roles live in [elian-voss-starter.md](../content/decks/elian-voss-starter.md). The prior `10x Steady Strike` / `10x Iron Guard` list is historical baseline evidence only.

## Known Prototype Limits

These are intentional gaps rather than hidden rules:

- No full class-resource economy beyond the current `Armor` model
- No complete facing-based attack, backstab, or flanking rules yet
- No multi-player simultaneous UI yet beyond the structure implied by the rules
- No boss phase break or transformation yet
