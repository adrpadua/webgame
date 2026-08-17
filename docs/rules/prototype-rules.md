# Prototype Rules

This document describes the current playable rules of the prototype as they exist in the repo today.

Use [CONTEXT.md](../../CONTEXT.md) for canonical terms and the ADRs for why the model exists.

**Adopted but not yet in the engine.** Two rules decisions are canon and are not described below, because nothing implements them yet: the three-horizon Timeline with staged Beat disclosure (D-021, [ADR 0026](../adr/0026-disclose-boss-beats-in-stages-across-three-timeline-horizons.md)) and randomize-before-commitment (D-022, [ADR 0025](../adr/0025-randomize-before-the-window-that-answers-it.md)). Until they ship, the two-row Timeline described here is the live rule.

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
- **Acceleration.** An authored Boss Beat may add Escalation when its demand is still standing at a round's end step. A Minion that arrived during the current round does not count — it spawns in the `Incoming Row`, so no player window could reach it. Embermaw currently authors this at `0`, because the live deck has no Whelp answer (D-003).
- **Thresholds.** Reaching a value applies its authored effect for the rest of the fight, and effects at different values stack. Embermaw: `1` Smouldering (Boss attacks `+1`), `2` Wider Brood (Brood Call summons one more Whelp, and the telegraph shows it), `3` Fed on Ash (Whelp bites `+1`), `4` Furnace Heart (Boss attacks `+1` again).
- **The top threshold ends the fight.** At `5`, the encounter ends in enrage defeat unless Embermaw has already been defeated. There is no separate round-limit check; with no acceleration this lands at the end of round `8`, exactly where the old clock expired.

`Embermaw: Ashen Trial` therefore has an `Encounter Clock` of `8` rounds, and a party that leaves demands standing reaches the end sooner.

## Boss Timeline

The boss has a visible two-row timeline:

- `Instant Row`: the action already resolving this round
- `Incoming Row`: the action telegraphed for later this round and then promoted into the next round's instant

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
- A full, unactivated Slot is `Primed` and persists for a later activation or an explicit special interaction
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

## Resources

The prototype currently uses this practical player resource:

- `Armor`: damage mitigation that is cleared at the start of each new round. A `Fortified` commitment (Fortify, D-019) grants its Armor at the next Round start, immediately after that wipe.

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

Movement is performed by dragging a hand card onto a valid adjacent empty hex. Dragging the Hero previews routes but does not pay for or commit movement.

Moving also sets the player's facing to the traversed hex edge. Facing is always one of `E`, `NE`, `NW`, `W`, `SW`, or `SE`; no in-between directions are legal.

## Minions

Minions act at the end of each Round, after the Slow Window and before the Round wraps, in spawn order (D-006):

- A Minion adjacent to its nearest Hero bites for its authored attack (`1` for a Whelp). Minion damage is a Raid Hit: Armor blocks it, and it never grants Riposte Ready.
- A Minion not yet adjacent advances one hex toward its nearest Hero: the first neighbor in stable board order that shortens the distance and is unoccupied. A fully blocked Minion holds.
- The creep is the deadline: `Kill Adds` means clearing a Minion before it arrives, and every step it takes also removes a route the party could have used.
- Minion movement ignores Hazard blocking — Scorched is Embermaw's own element.
- Each Minion's next action is a visible, deterministic Minion Intent derived from the live board; the engine exposes it as a projection (`minionIntents`).

## Targeting

`Enemy` is the broad hostile-combatant term. The Boss and Minions are both Enemies, and are mutually exclusive: the Boss is never a Minion.

Cards currently resolve against one of these target styles:

- no target
- direct damage to the Boss through a card's `boss_damage` effect
- selected Minion piece on a hex through the current `PIECE` target type

A card's `boss_damage` effect resolves without a range check in the prototype: the Hero's position never blocks it. Counter-pressure against playing at a distance is authored encounter content, not a card range rule. That counter-pressure now exists (D-017): a Boss Beat may carry an `unguarded_bonus` that adds damage to its targeted hit when no Hero holds the Guarded Front at resolution — Embermaw's Raking Claw rakes an unheld line for `4 + 3`.

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
- Reducing Elian Voss to `0` health or reaching the enrage timer is defeat

## Encounter Resolution

The encounter is active until one terminal outcome occurs:

- `Victory`: Embermaw reaches `0` health
- `Defeat`: Elian Voss reaches `0` health
- `Enrage Defeat`: the round counter advances past the encounter clock

The result is shown in the top bar and board feedback. Encounter history remains available to debug tooling, while gameplay controls lock after resolution and `Restart Encounter` creates a fresh shuffled deck, board, boss timeline, and encounter clock.

## Current Tank Starter Deck

The live/default tank deck is the approved five-identity Shield Wall list, carried by `data/encounters/embermaw_prototype.json` (ADR 0020):

- `Steady Strike` (8 copies): deal `2` boss damage, plus `1` per charged card.
- `Iron Guard` (6 copies): gain `3` Armor, plus `1` per charged `Guard` card.
- `Sweeping Blow` (2 copies): deal `2` damage to a selected adjacent Minion.
- `Fortify` (2 copies): Slow; gain `6` Armor at the start of the next Round, landing after the Round-start wipe (D-019).
- `Shield Slam` (2 copies): deal `3` boss damage; a legal activation consumes Riposte Ready for `+2`. Any other Boss-damage card consumes an active Riposte Ready for `+1`; cards without Boss damage never consume it.

The full specification and card roles live in [elian-voss-starter.md](../content/decks/elian-voss-starter.md). The prior `10x Steady Strike` / `10x Iron Guard` list is historical baseline evidence only.

## Known Prototype Limits

These are intentional gaps rather than hidden rules:

- No full class-resource economy beyond the current `Armor` model
- No complete facing-based attack, backstab, or flanking rules yet
- No multi-player simultaneous UI yet beyond the structure implied by the rules
- No boss phase break or transformation yet
