# Current Playable Loop Assessment

Date: 2026-08-13  
Scope: `Embermaw: Ashen Trial`, the one-Hero tank vertical slice.

## Verdict

The core loop is playable and has a real tactical question: preserve cards to build a persistent Action Bar, spend a card to move out of a visible pattern, or fire a charged ability now. The authoritative `EncounterEngine` makes the resulting state reproducible and content-authored. The first content pass should therefore deepen this loop rather than add a second economy.

The loop is not yet a convincing raid encounter. The live deck cannot answer its own `Kill Adds` callout, the Slow Window has no live Top Card, Whelps do not act, and Embermaw's three programs repeat without a phase change. Those are the priority problems because they make the board promise larger than the current player decisions.

## What A New Player Does

1. Begin in Loadout with four hand cards and two empty Slots.
2. Drag a card into a Slot as its Top Card, then advance through Boss Instant.
3. Read the board telegraph in Quick. Charge a Slot, tap it to fire, or discard a hand card onto an adjacent hex to move.
4. Read and resolve Incoming, then use the Slow Window to prepare or activate a Slow Top Card.
5. At Round end, keep unspent cards and refill the Hand to four. Win before Round 9 or lose to health depletion or enrage.

The direct-manipulation controls are coherent: hand-to-Slot prepares or charges, hand-to-hex moves, and tap-to-fire is a sensible mobile vocabulary. The visible hex overlays, facing arrows, health bars, and compact bottom Hand explain more than a text combat log would.

## Evidence Reviewed

- A clean 390x844 new-player walkthrough probe reaches Loadout, Quick, Slow, and Round 4 through the same scene handlers used by play.
- The current nine-probe suite passes: content validation, SDK rules, scene parity, spatial resolver, new-player spike, layout, mobile HUD, accessibility, and full-charge cleanup.
- The actual project was opened and the portrait playtest capture reviewed. The live refresh labels the resource strip as Hand and Discard; the older saved capture still says Tempo, so future visual approval must use a freshly captured build.

## Strengths To Preserve

- The `Instant -> Quick -> Incoming -> Slow` cadence creates understandable anticipation without a lengthy enemy turn.
- `Steady Strike` and `Iron Guard` prove two useful Charge Modifier shapes: all charged cards and Keyword-matched charged cards.
- Cinder Breath is an honest spatial problem: the cone is telegraphed, moving costs a visible card, and Scorched hexes constrain the next route.
- The seeded SDK, content validator, and scene-parity probe make data iteration safe enough for design ownership.

## Friction And Design Risks

1. **Unanswerable callout.** Brood Call asks the player to `Kill Adds`, but the live twenty-card deck contains only boss damage and Armor. Whelps can block routes but cannot be killed by the player.
2. **Missing Slow decision.** Both live card identities are Quick. A player can charge during Slow, but cannot demonstrate a Slow activation or learn why the two windows differ.
3. **Hazard wording exceeds live behavior.** Scorched blocks voluntary movement, so its entry damage is unreachable with the current voluntary-only movement rules. It is presently a route blocker, not a damage hazard.
4. **Program names over-promise variety.** Hunt, Ember, and Brood reorder the same small beat family. Without phase transition, Whelp intent, or a new positional question, the loop becomes legible before it becomes interesting.
5. **Solo-only targeting hides raid proof.** The engine starts one primary Hero and resolves Boss damage against that Hero. Threat, role selectors, Downed, revive, and simultaneous commitment remain design contracts rather than playable evidence.

## Approval Gate For The First Content Batch

Do not approve a broader tank deck or the approved Phase II package until a focused playtest demonstrates all of the following in a single eight-Round attempt:

- a player recognizes and clears at least one Whelp;
- a player uses a Slow Top Card during the Slow Window;
- a player spends a card to leave an incoming cone rather than treating movement as a hidden tax;
- a player can state why a Slot was fired, held Primed, or replaced;
- the run can win and can lose through comprehensible decisions, not only enrage attrition.

See [first-content-pass.md](D:/dev/webgame/docs/content/first-content-pass.md) for the ranked proposals and [design-backlog.md](D:/dev/webgame/docs/content/design-backlog.md) for implementation dependencies.
