# Design Decision Log

This log records current design-team decisions and recommendations. It does not replace ADRs; promote a decision to an ADR when it creates a long-lived architectural or product constraint.

| Date | ID | Status | Decision | Rationale | Evidence needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-13 | D-001 | Adopted | `EncounterEngine` is the sole rules authority for content behavior. | Content text cannot claim an effect the engine does not resolve. | Existing SDK, content, and parity probes stay green. |
| 2026-08-13 | D-002 | Adopted | The current Embermaw slice is an eight-Round solo tank teaching encounter, not a complete raid proof. | It correctly proves Action Bar, facing, telegraphs, hazards, and card-fueled movement; it does not prove party roles. | New-player walkthrough and nine-probe suite. |
| 2026-08-13 | D-003 | Proposed | No Boss counter tag may promise `Kill Adds` unless the active encounter deck contains an executable Minion answer. | A visible callout must name an available response. | `whelp_clear` probe and player test. |
| 2026-08-13 | D-004 | Proposed | Do not expand the default two-card deck until playtests confirm useful Slot Tension; use the five-identity list only as the first controlled test deck. | More identities can conceal a weak core loop. | Structured eight-Round playtests. |
| 2026-08-13 | D-005 | Proposed | Treat current Scorched as route blocking in player-facing copy until forced movement exists. | Its entry damage is not reachable through the current voluntary movement path. | Hazard behavior probe and future forced-movement probe. |
| 2026-08-13 | D-006 | Proposed | Build Whelp intent before Phase II. | Adds need a visible deadline before Phase II asks players to combine spatial problems. | Seeded Minion behavior and UI-intent probes. |
| 2026-08-13 | D-007 | Adopted | Aegis Guardian is a Shield Wall Tank. | MMO players should immediately recognize a defender who holds the dangerous space and protects the party. | Future deck playtests must show mitigation and positioning are its dominant decisions. |
| 2026-08-13 | D-008 | Adopted | Armor is a pure damage shield for Aegis Guardian. | Armor remains an easy-to-read defense layer. It does not become a spendable conversion resource. | Tank-card probes must verify that Armor absorbs damage before Health loss. |
| 2026-08-13 | D-009 | Deferred | Interception is Aegis Guardian's default ally-protection tool. | It creates a clear emergency-save moment and rewards placement without requiring allies to remain adjacent, but ally targeting and redirection are not yet under shared contract. | A future engine and UI extension must prove selected-ally damage redirection before the card is added to the live deck. |
| 2026-08-13 | D-010 | Deferred | An Interception redirects one next damage event and then expires. | A single reliable save protects a party member without canceling a full sequence of raid pressure, but the timing and expiry behavior still need executable multi-Hero coverage. | An interception probe must cover consumed and unused expiry paths. |
| 2026-08-13 | D-011 | Deferred | Aegis Guardian protects by holding the Guarded Front, building Armor, and using short-response Interception. | Guarded Front and Armor are already core to the fantasy, but the full three-part package remains deferred until Interception is implemented and validated. | A character playtest must show each action has a distinct use. |
| 2026-08-13 | D-012 | Adopted | Aegis Guardian is Captain Elian Voss, The Last Gate. | A grounded, disciplined defender gives the Shield Wall a distinct identity without borrowing the Paladin's holy spectacle or a battle captain's support language. | Future card text, art, and voice lines follow the Hold, Brace, Cover, Clear, Advance language. |
| 2026-08-13 | D-013 | Adopted | Whelp Clear and Slow Top Card acceptance remain isolated replay contracts until their probes pass. | The first deck expansion must prove a targetable Minion answer and standard full-charge cleanup without altering the live deck. | Seeded `whelp_clear` and `slow_top_card_cleanup` scenarios plus scene parity. |

## Next Decision

After the controlled deck playtest, decide whether the five-identity test deck creates sharper Slot Tension than the two-card baseline without obscuring first-time learning. This is a creative tradeoff requiring player evidence, not an engineering choice.
