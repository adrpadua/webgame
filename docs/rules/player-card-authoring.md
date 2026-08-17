# Player Card Authoring Rules

This is the authoring contract for player cards in the prototype. It keeps cards reusable across encounters, readable in the portrait HUD, and mechanically honest about the Action Bar.

## Card Contract

Every player card has these authored fields:

| Field | Rule |
| --- | --- |
| `id` | Stable, lowercase identifier. It never changes because a display name changes. |
| `title` | Short action name, ideally one to three words. It describes what the hero does, not the current encounter. |
| `rules_text` | Complete, encounter-neutral mechanical text. It is the canonical card rules text. |
| `speed` | `quick` for basics, setup, movement-adjacent effects, and low-commitment responses; `slow` for larger commitments and signature effects. |
| `max_charge` | The Top Card's Charge Value: the maximum number of tucked cards it can hold. The engine default is `2`; the foundation cards `Steady Strike` and `Iron Guard` use `3`. |
| `target_type` and `range_tiles` | Define what must be selected and where it is legal to use the card. Never imply a target in text that the data model does not enforce. |
| Effect fields | State the base effect in the corresponding data field: Boss damage, Armor, healing, Presence, or targeted Minion damage. |
| `tags` | Registered Keyword IDs from `data/keywords/` (ADR 0020). |
| `charge_modifiers` | Explicit Charge Modifier Resources; never imply a bonus that is absent from data. |

## Rules Text

### Use Generic Targets

Player cards are independent of a specific encounter. Use these canonical target names:

| Use | Avoid |
| --- | --- |
| `the boss` | a named boss such as `Embermaw` |
| `an Enemy` | a named Minion family such as `Whelp` when either the Boss or a Minion is a legal target |
| `a Minion` | `an Enemy` when only a non-Boss Enemy is a legal target |
| `an ally` | a named party member or role unless the card is intentionally role-locked |
| `your hex`, `an adjacent hex`, `a hex within Range N` | named arena coordinates or encounter landmarks |

`Enemy` is the umbrella rules term: the Boss and all Minions are Enemies, but a Boss is never a Minion. Boss programs own named Minions, named arena elements, and encounter-specific exceptions. A player card may name a broad mechanic such as `Scorched` only when that mechanic is part of the shared rules vocabulary rather than one encounter's private label.

The current prototype has no generic Enemy target selector. `boss_damage` resolves against the Boss directly, while `PIECE` targeting selects a Minion on the board. Do not author `an Enemy` as a selectable target until the runtime can legally select either kind; author `the boss` or `a Minion` instead.

### State the Base Effect First

The first sentence is the uncharged effect. Use a verb, an amount, and a target or recipient.

- `Deal 2 damage to the boss.`
- `Gain 3 Armor.`
- `Move up to 2 hexes.`
- `Heal an ally for 2.`

Do not write flavor-only rules text, hidden preconditions, or unresolved pronouns such as `it`, `them`, or `there` when a player needs to make a target choice.

### Write Charge Modifiers Explicitly

Every tucked card adds one Charge. It grants no universal numerical bonus: the Top Card's printed rules must state whether charge count, a Keyword, or both modify its effect.

Use a clear second sentence such as:

> Gain +1 [effect] for each charged card.

or:

> Gain +1 [effect] for each charged `Guard` card.

Examples:

- `Deal 2 damage to the boss. Gain +1 damage for each charged card.`
- `Gain 3 Armor. Gain +1 Armor for each charged Guard card.`

A Keyword named in a charge sentence must exist in `data/keywords/`; do not author a modifier against an unregistered Keyword.

`Charged card` means a card tucked under the same Top Card's Charge Stack. A charged card does not resolve as its own effect. A card may have multiple Keywords; it counts once for each explicit matching check on the Top Card.

Do not use vague phrases such as `scales with charge`, `becomes stronger`, or `fully charged` without a printed threshold and outcome. `Primed` is a Slot state, not a free card bonus.

### One Card, One Primary Job

A starter card should have one primary role:

- basic boss damage
- tank mitigation
- movement or positioning
- ally protection
- enemy control
- resource setup

An incidental rider is acceptable only when it reinforces that job. The default deck keeps this deliberately strict: each of its five identities owns one job (`Steady Strike` damage, `Iron Guard` mitigation, `Sweeping Blow` Minion clearing, `Fortify` Slow preparation, `Shield Slam` the defensive payoff).

## Action Bar Semantics

- A hand card dragged to an empty Slot becomes that Slot's Top Card.
- Different copies of the same Card may be Top Cards in different Slots; each Slot resolves and cleans up independently.
- A hand card dragged to an occupied Slot becomes a charged card, if the Slot has remaining Charge Value.
- The Top Card determines timing, targeting, and Charge Value.
- The Top Card persists after activation.
- A Slot needs at least one charged card before it can activate.
- A Slot activates once in its matching player window. It cannot receive more charged cards after it activates in that window.
- Activating a Slot leaves its Charge Stack in place. If the stack equals the Charge Value, discard the Top Card and every charged card at the end of that matching window.
- A full unactivated Slot is `Primed` and persists for later use or an explicit special interaction.
- The beginning-of-Round Loadout Step replaces a Slot for free: discard its old Top Card and Charge Stack, then load a new Top Card from hand at `0 Charge`.
- An empty Slot may receive a Top Card for free during either player window.
- Preparing, charging, and activating are free. To move one hex, discard a hand card for `1 Stamina`; that card's text and Keywords do not resolve.

These semantics must appear in the rules reference and inspection experience, not be repeated in every card's `rules_text`.

## Portrait Presentation

Compact Cards in the Hand show only:

- title
- `Quick` or `Slow`
- Charge Value

Hold a Compact Card to reveal Card Inspection, which shows shared placeholder or final art and the full `rules_text`. Do not shorten, paraphrase, or substitute different mechanics in the inspection view.

Timing must be visible as text as well as color. Full card art must not encode a rule needed for legal play.

## Default Deck Baseline

The live/default deck is the approved five-identity Elian Voss Shield Wall list, specified in [elian-voss-starter.md](../content/decks/elian-voss-starter.md):

| Card | Copies | Base effect | Modifier |
| --- | ---: | --- | --- |
| `Steady Strike` | 8 | Deal 2 damage to the boss. | +1 damage per charged card. |
| `Iron Guard` | 6 | Gain 3 Armor. | +1 Armor per charged `Guard` card. |
| `Sweeping Blow` | 2 | Deal 2 damage to a selected adjacent Minion. | — |
| `Fortify` | 2 | Slow. Gain 6 Armor at the start of the next Round. | — |
| `Shield Slam` | 2 | Deal 3 damage to the boss. | A legal activation consumes Riposte Ready for +2 damage. |

The deck tests the choice between firing a reusable Top Card immediately and saving cards to build its Charge Stack, plus the Shield Wall role decisions layered on that loop. The historical `10x Steady Strike` / `10x Iron Guard` dummy deck is baseline evidence for the old mechanics shell only. Adding a sixth card identity requires the deck-evaluation evidence in [deck-evaluation-rubric.md](../content/deck-evaluation-rubric.md).

## Authoring Checklist

- [ ] The card text contains no Boss name, Minion family, arena coordinate, or encounter-only instruction.
- [ ] The first sentence explains the uncharged effect.
- [ ] The charge sentence states its exact per-card benefit.
- [ ] The text agrees with the card's target, range, speed, Charge Value, and effect data.
- [ ] The primary job is obvious from the title and first sentence.
- [ ] The Compact Card can be scanned from title, timing, and Charge Value alone.
- [ ] Card Inspection contains the same canonical rules text.
