# First Content Pass: Embermaw And Elian Voss

Status: proposed and ranked, with the first-pass Shield Wall default migration adopted by the user-approved product intake. This is not an authorization to encode unsupported behavior in card text. `EncounterEngine` remains authoritative.

## Status And Source Of Truth

**Superseded pointer, kept for provenance.** This section described the runnable loop as `resources/boss/programs/*.tres`. Authored content moved to `data/boss_programs/*.json` under [ADR 0020](../adr/0020-author-gameplay-content-as-schema-validated-json-in-data.md), with the web engine as rules authority under [ADR 0019](../adr/0019-rebuild-the-encounter-engine-in-typescript-as-the-rules-source-of-truth.md); the Godot resources are frozen. The description of **Ember Pattern** here — `Brood Call`, then `Raking Claw`, then `Keep a Safe Hex` — was also true when written and is not true now: D-036 made Ember Pattern the terrain program, and it carries neither a Brood Call nor a Raking Claw. Riposte Ready reachability therefore no longer runs through Ember Pattern; it runs through the Raking Claw in `Hunt Pattern` and `Brood Pattern`, which is where a fully mitigated Tank Hit is still available. See [embermaw-ashen-trial-design.md](encounters/embermaw-ashen-trial-design.md) for the current per-program demands.

**Superseded default-deck guidance.** This section recorded the `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, `2x Shield Slam` Shield Wall list as the live/default Elian deck, authored in `resources/encounters/embermaw_prototype.tres`. Both halves have moved: authored content lives in `data/encounters/` (ADR 0020), and D-040 swapped two Steady Strike for two Drive Back, making the current default `6/6/2/2/2/2`. See [elian-voss-design.md](heroes/elian-voss-design.md) for the live list. The prior evaluation-only restriction from proposal 03 is superseded only for default adoption by [product intake 04](../../.scratch/product-backlog/issues/04-promote-aegis-starter-deck-to-shield-wall-kit.md); the controlled-cohort evidence remains historical.

**Proposed guidance:** packages not explicitly marked adopted below remain future content tests or changes after their stated gates and evidence. They do not override the runnable resources.

**Superseded guidance:** the former "First-Three-Rounds Teaching Edit" table described a different Round 2 Incoming sequence (`Brood Call, warning`) and must not be read as current authoring. It is replaced by the current-reference and deferred teaching goals below.

## Ranked Pass

| Rank | Pass | Why Now | Delivery |
| --- | --- | --- | --- |
| 1 | Make `Kill Adds` answerable | The default Shield Wall deck includes Sweeping Blow; validate its authored answer in focused probes. | Adopted default-deck content; QA verification pending. |
| 2 | Put one honest Slow action in the live deck | The default Shield Wall deck includes Fortify. | Adopted default-deck content; QA verification pending. |
| 3 | Re-tune the three-program loop into a teaching sequence | The existing data already supports a readable first three Rounds. | Content-only. |
| 4 | Add an active Whelp intent | Adds need a deadline beyond occupying safe hexes. | Engine/UI extension. |
| 5 | Add a Phase II spatial package | This fulfills Ashen Trial's raid promise. | Engine/UI extension. |

## 1. Whelp Answer Package

**Player-facing intent:** A Whelp is a problem the tank can solve deliberately, not a permanent lane tax.

**Precise rule:** Add `2x Sweeping Blow` to the live twenty-card deck. It remains a Quick Top Card, needs one charged card to activate, selects an adjacent Minion, and deals its authored `2` damage. A Whelp has `2` health, so one successful Sweeping Blow removes it. The Boss retains `Kill Adds` as a counter tag only while this card is present in the encounter deck.

**Affected content:** `resources/encounters/embermaw_prototype.tres`; reuse `resources/cards/tank/sweeping_blow.tres` and `resources/minions/whelp.tres`. Update [elian-voss-starter.md](decks/elian-voss-starter.md) and [embermaw-prototype.md](encounters/embermaw-prototype.md) when implemented.

**Edge cases:** No Minion may exist when Sweeping Blow is loaded; the card must remain a legal prepared Top Card but cannot fire without a selected in-range Minion. A Whelp can block the only adjacent hex, so the target affordance must remain reachable without moving. A charged Sweeping Blow is not itself a Whelp answer until it is in the Quick Window.

**Required evidence:** Add a focused `whelp_clear` probe that spawns a Whelp, loads and charges Sweeping Blow through `EncounterEngine`, fires at range 1, and verifies the Minion is removed and scene parity remains intact. Run a new-player playtest asking when and why the player used the card.

## 2. Slow Window Anchor

**Player-facing intent:** The Slow Window should feel like a deliberate commitment after the incoming mechanic, not an empty advance button.

**Precise rule:** Add `2x Fortify` to the live deck. Fortify is a Slow Top Card: after it receives at least one charged card, it grants its authored `6 Armor` during Slow. Do not change its base values in this pass.

**Affected content:** `resources/encounters/embermaw_prototype.tres`; reuse `resources/cards/tank/fortify.tres`; update the starter-deck document.

**Edge cases:** Armor clears when the next Round begins, so a player cannot use Fortify to retroactively answer Incoming. The player can prepare Fortify in Loadout or Slow, but it fires only during Slow. A full activated Fortify follows Full-Charge Cleanup; a partial activation persists.

**Required evidence:** Add a focused `slow_window_card` probe that proves Fortify cannot fire in Quick, fires in Slow after charging, absorbs a subsequent Boss hit, and follows cleanup correctly. In a playtest, ask the player to name a situation where holding Fortify is better than firing it.

## 3. First-Three-Rounds Teaching Direction

**Player-facing intent:** Teach one spatial responsibility at a time before asking the player to combine them.

**Current authored first loop (reference only):**

| Round | Instant | Incoming | Question |
| --- | --- | --- | --- |
| 1 | Turn to Tank, Raking Claw, Ash Trail | Cinder Breath, warning | Can you read facing and leave the cone? |
| 2 | Stalk the Guardian, Cinder Breath, Ember Scar | Brood Call, Raking Claw, Keep a Safe Hex | Can you charge Guard in Quick, then absorb the incoming Tank Hit from Guarded Front? |
| 3 | Turn to Tank, Raking Claw, Ash Trail | Brood Call, Cinder Breath, warning | Can you manage both route pressure and the front arc? |

**Proposed rule:** retain these three Programs and supported Beat kinds while evaluating whether the first loop teaches one spatial responsibility at a time. Do not change Beat order, labels, or live authored content through this proposal. Do not label an action `Raid Hit` or claim a delayed Whelp attack until the engine supports that behavior.

**Affected content if approved after evaluation:** `resources/boss/programs/embermaw_hunt.tres`, `embermaw_embers.tres`, `embermaw_brood.tres`, plus the runnable encounter documentation. No live resource changes are authorized by this document.

**Edge cases:** Ash Trail only Scorches the prior impacted hero hex; it produces no terrain when Raking Claw misses. Brood Call may spawn fewer than two Whelps when authored candidates are occupied. Cinder Breath must never mark off-board hexes.

**Required evidence:** QA's production-resource Riposte scenario must use the actual Ember Pattern, with an Iron Guard Top Card, a Guard charge card, and Guarded Front; it must assert an Incoming `Raking Claw` with `tank_hit`, `4` Armor absorbed, `0` Health loss from that Tank Hit, and the Riposte Ready grant. Extend the existing boss-program and resolver probes to assert each Round's ordered Beat IDs, telegraph hexes, legal spawn fallback, and no out-of-board pattern. Run a four-Round qualitative test with no card changes first, then with the Whelp answer package.

## 4. Whelp Advance And Attack

**Player-facing intent:** Unkilled Whelps create a visible deadline and force target priority without surprising the party.

**Precise rule:** At a defined end-of-Round step, each living Whelp displays its intended adjacent move toward its nearest living Hero. It moves one legal hex; if already adjacent and unable to move closer, it deals `1` Raid Hit to its selected Hero. Its next intent is visible before the player commits the preceding player window.

**Affected content:** `resources/minions/whelp.tres`, Boss Program documentation, encounter briefing, a new Minion behavior Resource or authored fields, board intent UI, and `EncounterEngine`.

**Edge cases:** Equidistant targets, blocked routes, occupied destinations, a Downed or absent selected Hero, and two Whelps competing for one hex require a deterministic public rule. Do not use random resolution without a seeded, visible tie-breaker.

**Required evidence:** An engine probe must cover movement, attack, collision, and selector ties from a fixed seed; a UI probe must prove the intent icon and target/pattern are visible before resolution. A solo playtest must show that ignoring a Whelp is a conscious loss of board space, not an invisible punishment.

## 5. Phase II: Conflagration

**Player-facing intent:** The final four Rounds combine learned spatial rules into a readable raid finish rather than adding arbitrary damage.

**Precise rule:** At the documented phase trigger, Embermaw performs Molting Roar after the current Round, rotates one legal edge clockwise, retains Whelps and Scorched terrain, reveals the Phase II package, and deals no unavoidable transition damage. Phase II introduces Ashen Brand, Molten Tail, and Cinderstorm exactly as defined in [embermaw-ashen-trial-design.md](encounters/embermaw-ashen-trial-design.md).

**Affected content:** the Embermaw encounter, Boss Programs, Hazards, Minions, phase briefing, and the data schema/engine/UI listed in the backlog.

**Edge cases:** Multiple phase triggers in the same Round, a boss defeat during the trigger action, zero legal displacement hexes, a marked Hero being Downed, and one-player fallback targeting must be explicit before authoring.

**Required evidence:** A seeded eight-Round simulation covering early health threshold and forced-Round-5 transition, a pattern-overlay UI capture for every new Beat, and at least three blind playtests showing players can predict each Phase II failure before it resolves.

## Deck Composition History

The former authoring gate limited the five-identity list to testing preparation. The old `10x Steady Strike` / `10x Iron Guard` baseline and its cohort remain historical evidence for that mechanics shell. The user-approved [default-deck intake](../../.scratch/product-backlog/issues/04-promote-aegis-starter-deck-to-shield-wall-kit.md) adopted `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, and `2x Shield Slam` as the live/default Elian Shield Wall specification. That list held until D-040 swapped two Steady Strike for two Drive Back; it is historical evidence now, not the current default. This adoption does not claim balance completion or authorize encounter, seed, hand, or pacing changes.
