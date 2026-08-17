# Prototype Rules

This document describes the current playable rules of the prototype as they exist in the repo today.

Use [CONTEXT.md](../../CONTEXT.md) for canonical terms and the ADRs for why the model exists.

Use [player-card-authoring.md](player-card-authoring.md) when creating or editing player cards.

## Encounter Structure

Each round follows this order:

1. `Loadout Step`
2. `Boss Instant`
3. `Quick Window`
4. `Boss Incoming`
5. `Slow Window`

When the `Slow Window` ends, the next round begins and the boss timeline rolls forward.

`Embermaw: Ashen Trial` has an `Encounter Clock` of `8` rounds. At the start of round `9`, the encounter ends in enrage defeat unless Embermaw has already been defeated.

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
- An empty Slot may receive a Top Card for free during either player window
- Preparing, charging, and activating cost no resource. Each one-hex move discards one hand card for `1 Stamina`; repeat that gesture to sprint

## Touch Controls

The portrait HUD is driven primarily by direct manipulation rather than a command row:

- Drag a hand card onto an empty action-bar slot to prepare it.
- During Loadout, drag a hand card onto an occupied Slot to replace its whole bundle. During either player window, the same gesture charges it.
- Hold a card in hand to inspect its full-art, full-text card view; release to dismiss it. The current low-fidelity art is the supplied Paladin placeholder, shared by the prototype cards until per-card art is authored.
- Tap a prepared action-bar slot during its matching window to activate its top card.
- Drag a hand card to an adjacent legal hex during the Quick Window to discard it for `1 Stamina` and move the Hero; drag the Hero itself to preview legal routes.
- Tap the compact boss-program strip to expand or collapse its three-beat `Instant` and `Incoming` tracks.

The only persistent mobile buttons are `Next` for phase progression, `Restart` after an encounter ends, and the coordinate debug toggle. The desktop inspector retains selected-card feedback, but the same direct actions work there too.

The hand is anchored to the bottom of the portrait HUD as four equal Compact Cards. The board remains the central play surface, the action bar sits directly above the hand, and phase controls remain above the board rather than displacing cards from the thumb-reachable zone. A Compact Card shows its name, timing, and Charge Value; Card Inspection owns full art and rules text.

## Resources

The prototype currently uses these practical player resources:

- `Armor`: damage mitigation that is cleared at the start of each new round
- `Presence`: a small progression-style tracker used by some cards

Stamina is a direct card-discard movement payment, not a stored resource. The opening hand is `4` cards. At the end of each Round, draw until the hand contains `4` cards; this is a refill target rather than a hard hand limit. Cards remaining in hand stay there; discarded cards shuffle back into the deck when the deck runs out.

The player panel always shows current hand, deck, discard, Armor, and Presence values. It does not show Energy or a Stamina meter.

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

## Targeting

`Enemy` is the broad hostile-combatant term. The Boss and Minions are both Enemies, and are mutually exclusive: the Boss is never a Minion.

Cards currently resolve against one of these target styles:

- no target
- direct damage to the Boss through a card's `boss_damage` effect
- selected Minion piece on a hex through the current `PIECE` target type

A card's `boss_damage` effect resolves without a range check in the prototype: the Hero's position never blocks it. Counter-pressure against playing at a distance is authored encounter content, not a card range rule.

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

The live/default tank deck is the approved five-identity Shield Wall list, carried by `resources/encounters/embermaw_prototype.tres`:

- `Steady Strike` (8 copies): deal `2` boss damage, plus `1` per charged card.
- `Iron Guard` (6 copies): gain `3` Armor, plus `1` per charged `Guard` card.
- `Sweeping Blow` (2 copies): deal `2` damage to a selected adjacent Minion.
- `Fortify` (2 copies): Slow; gain `6` Armor.
- `Shield Slam` (2 copies): deal `3` boss damage; a legal activation consumes Riposte Ready for `+2`. Any other Boss-damage card consumes an active Riposte Ready for `+1`; cards without Boss damage never consume it.

The full specification and card roles live in [elian-voss-starter.md](../content/decks/elian-voss-starter.md). The prior `10x Steady Strike` / `10x Iron Guard` list is historical baseline evidence only.

## Known Prototype Limits

These are intentional gaps rather than hidden rules:

- No full class-resource economy beyond the current `Armor` model
- No complete facing-based attack, backstab, or flanking rules yet
- No multi-player simultaneous UI yet beyond the structure implied by the rules
- No boss phase break or transformation yet
