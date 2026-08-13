# Prototype Rules

This document describes the current playable rules of the prototype as they exist in the repo today.

Use [CONTEXT.md](D:/dev/webgame/CONTEXT.md) for canonical terms and the ADRs for why the model exists.

Use [player-card-authoring.md](D:/dev/webgame/docs/rules/player-card-authoring.md) when creating or editing player cards.

## Encounter Structure

Each round follows this order:

1. `Boss Instant`
2. `Quick Window`
3. `Boss Incoming`
4. `Slow Window`

When the `Slow Window` ends, the next round begins and the boss timeline rolls forward.

`Embermaw: Ashen Trial` has an `Encounter Clock` of `8` rounds. At the start of round `9`, the encounter ends in enrage defeat unless Embermaw has already been defeated.

## Boss Timeline

The boss has a visible two-row timeline:

- `Instant Row`: the action already resolving this round
- `Incoming Row`: the action telegraphed for later this round and then promoted into the next round's instant

The current prototype boss is `Embermaw`, using a short scripted loop of authored boss actions.

## Player Role

The playable role is a tank hero named `Aegis Guardian`.

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
- A charged Slot activates once in its matching player window, then cannot receive more charges until its next matching window
- Activation does not consume the Charge Stack. The Top Card's printed rules determine how charge count and Keywords modify its effect
- A full, unactivated Slot is `Primed` and persists for a later activation or an explicit special interaction
- If a full Slot activates, discard its Top Card and Charge Stack at the end of that matching player window
- During the beginning-of-Round Loadout Step, freely replace any Slot: discard its old Top Card and Charge Stack, then load a hand card at `0 Charge`
- An empty Slot may receive a Top Card for free during either player window
- Preparing, charging, and activating cost no resource. Each one-hex move discards one hand card for `1 Stamina`; repeat that gesture to sprint

## Touch Controls

The portrait HUD is driven primarily by direct manipulation rather than a command row:

- Drag a hand card onto an empty action-bar slot to prepare it.
- Drag another hand card onto an occupied slot to charge it.
- Hold a card in hand to inspect its full-art, full-text card view; release to dismiss it. The current low-fidelity art is the supplied Paladin placeholder, shared by the prototype cards until per-card art is authored.
- Tap a prepared action-bar slot during its matching window to activate its top card.
- Drag a hand card to an adjacent legal hex during the Quick Window to discard it for `1 Stamina` and move the hero.
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

Movement can currently be performed in two ways:

- drag the player token onto a valid adjacent empty hex
- select a valid hex and press the move button

Moving also sets the player's facing to the traversed hex edge. Facing is always one of `E`, `NE`, `NW`, `W`, `SW`, or `SE`; no in-between directions are legal.

## Targeting

`Enemy` is the broad hostile-combatant term. The Boss and Minions are both Enemies, and are mutually exclusive: the Boss is never a Minion.

Cards currently resolve against one of these target styles:

- no target
- selected hex
- direct damage to the Boss through a card's `boss_damage` effect
- selected Minion piece on a hex through the current `PIECE` target type
- board slot target type exists in the data model, but the current main interaction loop is centered on the action bar rather than board-slot play

The prototype does not yet provide a selectable generic Enemy target. A future `Enemy` selector must allow both the Boss and Minions, then validate their shared range and targeting rules consistently.

Attempting an action with an invalid target or in the wrong window is rejected with visible feedback.

## Damage and Survival

Current prototype damage rules:

- `Armor` blocks incoming damage before health is lost
- Remaining damage reduces health
- `Tank Hits` and `Raid Hits` are separate authored values on boss actions
- In the one-player vertical slice, both hit types resolve against Aegis Guardian; their labels remain visible so the model can later target a 2-4 player party
- Reducing Embermaw to `0` health is victory
- Reducing Aegis Guardian to `0` health or reaching the enrage timer is defeat

## Encounter Resolution

The encounter is active until one terminal outcome occurs:

- `Victory`: Embermaw reaches `0` health
- `Defeat`: Aegis Guardian reaches `0` health
- `Enrage Defeat`: the round counter advances past the encounter clock

The result is shown in the top bar and board feedback. Encounter history remains available to debug tooling, while gameplay controls lock after resolution and `Restart Encounter` creates a fresh shuffled deck, board, boss timeline, and encounter clock.

## Current Tank Starter Deck

The tank deck currently includes these card identities:

- `Steady Strike` (10 copies): deal `2` boss damage, plus `1` per charged card.
- `Iron Guard` (10 copies): gain `3` Armor, plus `1` per charged card.

The deck list is deliberately prototype-grade and meant to validate whether charging a persistent basic attack or tank response creates useful slot tension.

## Known Prototype Limits

These are intentional gaps rather than hidden rules:

- No full class-resource economy beyond the current `Armor` model
- No complete facing-based attack, backstab, or flanking rules yet
- No multi-player simultaneous UI yet beyond the structure implied by the rules
- No boss phase break or transformation yet
