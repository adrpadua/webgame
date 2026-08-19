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
| `target_type` | What must be selected. `none` needs no selection, `piece` selects an Enemy, `hex` selects an on-board hex (including empty ground) for a Burst, and `board_slot` selects an ally's Top Card. Never imply a target in text that the data model does not enforce. |
| `range_tiles` | How far the card reaches, in hexes from the firing Hero to whatever it lands on (D-067). One number for the whole card: it answers the selected piece, the selected hex, forced movement, *and* the Boss a `boss_damage` card never names. Author `1` for a melee swing. A card that touches anything past its own Hero must carry a reach, and a card that touches nobody must not — the build refuses both. `board_slot` is the exception: an ally's Top Card is not a place on the board, and support is adjacency-free (D-009). |
| Effect fields | State the base effect in the corresponding data field: Boss damage, Armor, healing, targeted Minion damage, Push/Pull distance, or a Burst radius. A positive `burst_radius` requires positive `damage` and `target_type: hex`. |
| `places_counter` | A Counter id from `data/counters/` (D-033, D-047). Where it lands follows `target_type`, which must be able to supply the Counter's host (D-048): `none` or `piece` for a `combatant` Counter, `hex` for a `hex` Counter, `board_slot` for a `slot` Counter. Place an existing Counter rather than authoring a near-duplicate — a second Sundered with different text is how a shared vocabulary stops being shared. |
| `damage_keywords` | What this card's damage is made of and who it is aimed at, as registered `damage_type` Keyword ids (D-049). A Counter Reader can narrow itself to one of these, so keywording a card's damage is what lets a Counter answer it. A card declaring these must actually deal damage. |
| `counter_amount` | How many Counters `places_counter` lands, default `1`. Placement stops at the Counter's `max`, and the fact records how many actually landed; a card that could never place what it declares fails the build. |
| `reads` | What the card does with Counters when it fires (D-047). Three verbs: `gate` (refuse the fire unless the count is `at_least` N), `scale` (add `per` to one `effect` for each Counter held), `spend` (remove `amount`, at `cost` timing before the card's effects are computed or `resolution` after). Name exactly one of `counter` or `counter_keyword`, and read `on` the firing Hero (`self`) or the chosen piece (`target`). A `spend` must name one `counter`. There is no `or` and no nesting: every gate must pass. |
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

The current prototype has no generic Enemy **piece** selector. `boss_damage` resolves against the Boss directly, while `piece` targeting selects a Minion on the board. A Burst instead selects a hex and then damages every Enemy in its footprint, including the Boss (ADR 0030); it does not make either Enemy type the selected target. Do not author `an Enemy` as a selectable piece until the runtime can legally select either kind; author `the boss`, `a Minion`, or a Burst centered on a hex instead.

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

A Keyword that marks which Role a card belongs to — rather than what the card does — sets `role_marker: true` in its own definition. It stays an ordinary Keyword to the rules and a Charge Modifier may still name it; the flag only tells the HUD to leave it off the glance surfaces, where a mark that every card in the deck carries separates none of them. `tank` is one; `guard` and `attack` are not.

`Charged card` means a card tucked under the same Top Card's Charge Stack. A charged card does not resolve as its own effect. A card may have multiple Keywords; it counts once for each explicit matching check on the Top Card.

Do not use vague phrases such as `scales with charge`, `becomes stronger`, or `fully charged` without a printed threshold and outcome. `Full` is a Slot state, not a free card bonus.

### One Card, One Primary Job

A starter card should have one primary role:

- basic boss damage
- tank mitigation
- movement or positioning
- ally protection
- enemy control
- resource setup

An incidental rider is acceptable only when it reinforces that job. The default deck keeps this deliberately strict: each of its five identities owns one job (`Steady Strike` damage, `Iron Guard` mitigation, `Sweeping Blow` Minion clearing, `Fortify` Slow preparation, `Drive Back` displacement), and the defensive payoff is not a deck job at all any more — it is printed on the Hero as the Signature (D-064).

## Action Bar Semantics

- A hand card dragged to an empty Slot becomes that Slot's Top Card.
- Different copies of the same Card may be Top Cards in different Slots; each Slot resolves and cleans up independently.
- A hand card dragged to an occupied Slot becomes a charged card, if the Slot has remaining Charge Value.
- The Top Card determines timing, targeting, and Charge Value.
- The Top Card persists after activation.
- A Slot needs at least one charged card before it can activate.
- The Signature Slot (D-064, ADR 0032) is the exception to the hand routes: its Top Card is printed on the Hero, it never takes a prepared or charged hand card, its Charges are earned by its standing clause and bank across Rounds, and firing spends the whole stack while the Top Card stays. It is never Full-Charge-Cleaned and never replaced at Loadout.
- A Slot activates once in its matching player window. It cannot receive more charged cards after it activates in that window.
- Activating a Slot leaves its Charge Stack in place. If the stack equals the Charge Value, discard the Top Card and every charged card at the end of that matching window.
- A full unactivated Slot is `Full` and persists for later use or an explicit special interaction.
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

The live/default deck is the five-identity Elian Voss Shield Wall list, specified in [elian-voss-starter.md](../content/decks/elian-voss-starter.md), fighting beside the Signature:

| Card | Copies | Base effect | Modifier |
| --- | ---: | --- | --- |
| `Steady Strike` | 6 | Deal 2 damage to the boss. | +1 damage per charged card. |
| `Iron Guard` | 8 | Gain 3 Armor. | +1 Armor per charged `Guard` card. |
| `Sweeping Blow` | 2 | Deal 2 damage to a selected adjacent Minion. | — |
| `Fortify` | 2 | Slow. Gain 6 Armor at the start of the next Round. | — |
| `Drive Back` | 2 | Push a selected piece 2 hexes directly away. | — |

| Signature (not in the deck) | Standing clause | Activation |
| --- | --- | --- |
| *Riposte* (`elian_riposte`, `fixed: true`) | Absorb a Tank Hit on the Guarded Front for zero Health loss: this Slot gains one Charge (max 2, banked across Rounds; a block while full earns nothing). | Quick. Spend all Charges: 3 Boss damage, +2 per Charge. Spent 2? The Boss is Sundered, after this damage resolves. |

The deck tests the choice between firing a reusable Top Card immediately and saving cards to build its Charge Stack, plus the Shield Wall role decisions layered on that loop — and, through the Signature, the choice between cashing an earned Charge for tempo and banking to the cap for the Sundering hit. The historical `10x Steady Strike` / `10x Iron Guard` dummy deck is baseline evidence for the old mechanics shell only. Adding a sixth card identity requires the deck-evaluation evidence in [deck-evaluation-rubric.md](../content/deck-evaluation-rubric.md).

## Authoring Checklist

- [ ] The card text contains no Boss name, Minion family, arena coordinate, or encounter-only instruction.
- [ ] The first sentence explains the uncharged effect.
- [ ] The charge sentence states its exact per-card benefit.
- [ ] The text agrees with the card's target, range, speed, Charge Value, and effect data.
- [ ] `range_tiles` matches the reach the rules text implies: a card that swings, strikes, or slams is `1`, and a card that reaches further says so in its text.
- [ ] The primary job is obvious from the title and first sentence.
- [ ] The Compact Card can be scanned from title, timing, and Charge Value alone.
- [ ] Card Inspection contains the same canonical rules text.
- [ ] Any `places_counter` id exists in `data/counters/`, `counter_amount` does not exceed that Counter's `max`, and `target_type` can supply that Counter's `host`.
- [ ] Every entry in `reads` names exactly one of `counter`/`counter_keyword`, carries the number its verb needs (`at_least`, `per`, or `amount`), and only reads `on: "target"` when the card chooses a target at all.
- [ ] A card applying a status to an Enemy has been through the deck-evaluation gate before joining the live deck: it changes the damage economy the solo-ceiling walls were measured against.
