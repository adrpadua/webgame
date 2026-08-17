# Card And Ability Art

Status: active prompt template. Produces the illustration for a single player card or action-bar ability.

Compose as: [`_style-preamble.md`](_style-preamble.md) block, then the block below.

Output goes to `assets/art/cards/<hero-slug>/<card-slug>.png`.

## Attach First

Always attach the owning Hero's concept sheet from `assets/art/concepts/<hero-slug>/`. Card art generated without it will drift in armor color, rig shape, and proportion within a handful of images, and a deck whose cards disagree about what the Hero looks like is worse than a deck of plain frames.

## Prompt Block

```text
Create a single card illustration for one ability belonging to an established Hero. The attached concept sheet is that Hero — match their armor, materials, palette, and equipment exactly.

ABILITY: {{CARD_NAME}}.
WHAT IT DOES IN FICTION: {{FICTION}}.
BOARD RELATIONSHIP the image must communicate at a glance: {{BOARD_RELATIONSHIP}}.
BEAT — where this sits in a turn: {{BEAT}}.

COMPOSITION:
One dominant visual idea, filling the frame. A bold Hero silhouette in a clear, readable action pose. Clean background geometry — suggest the arena with simple shapes and value, never a detailed scene. The material or implement creating the effect must be visibly the source of that effect.

Vertical portrait framing, roughly 3:4, composed so the Hero and the effect stay legible when the image is reduced to a small card thumbnail on a phone.

Do not include card frames, borders, text, numbers, cost pips, icons, or any interface furniture. Produce only the illustration.
```

## Slots

| Slot | What to put in it |
| --- | --- |
| `CARD_NAME` | The in-world card name, matching the authored `card_name` |
| `FICTION` | What physically happens, expressed through the Hero's materials — never the rules text |
| `BOARD_RELATIONSHIP` | One of: single target, straight line, cone, ring, adjacency, zone, or self |
| `BEAT` | One of: setup, conversion, payoff, recovery, or emergency response |

`FICTION` is the slot that carries the work. `Gain 6 Armor` is a rule, not an image; `gate plates sliding and locking into place around the Hero's body, seams flaring cyan as they seat` is an image. Translate every time.

## Current Elian Voss Deck

The eleven authored cards in `resources/cards/tank/`, with the fiction and beat each illustration should express. These are the live values as authored — confirm against the `.tres` before generating, since rules text moves.

| Card | Rules text | Fiction to draw | Relationship | Beat |
| --- | --- | --- | --- | --- |
| `guard_stance` | Gain 4 Armor | Gate panels swinging up and seating into a braced front | Self | Setup |
| `iron_guard` | Gain 3 Armor, +1 per charged Guard card | The same brace, but with additional panels stacking and locking in layers | Self | Setup |
| `fortify` | Gain 6 Armor at the next Round start | The Gate Rig fully deployed, every panel seated, living-gold locks visibly thrown | Self | Recovery |
| `anchor_presence` | Gain 1 Presence | Boots setting hard into the ground, a low ring of runeglass light spreading from the stance | Self | Setup |
| `unyielding_step` | Gain 2 Armor and deal 2 damage to the boss | A braced step forward into pressure, shield edge leading | Single target | Conversion |
| `steady_strike` | Deal 2 damage, +1 per charged card | A controlled gateblade baton strike, precise rather than heavy | Single target | Conversion |
| `shield_slam` | Deal 3 damage to the boss; consume Riposte Ready for +2 | A deployed gate panel driven edge-first as a weapon | Single target | Payoff |
| `sweeping_blow` | Deal 2 damage to a Minion on the selected hex | A wide horizontal sweep clearing a lane, motion arc drawn as one clean line | Cone | Conversion |
| `intercept` | Gain 3 Armor and deal 1 damage to a Minion on the selected hex | A straight safe-passage line projected toward an ally, the hit pulled onto the shield gate | Straight line | Emergency response |
| `taunting_challenge` | Deal 1 damage to the boss and gain 2 Armor | Baton raised in a formal challenge, gate seams flaring to draw attention | Single target | Setup |
| `rallying_cry` | Heal 2 | Signal cloth snapping outward, a warm restorative pulse crossing the runeglass panels | Zone | Recovery |

Two visual jobs sit underneath that table and are worth holding deliberately. The Guard family (`guard_stance`, `iron_guard`, `fortify`) must read as one escalating series — same brace, more panels, more locks thrown — so a player can see the ladder without reading numbers. And Riposte Ready, the payoff state, should look like a lock releasing after a perfect block: the gate catches force, turns, and opens a narrow counter-strike.

## Acceptance Check

Every card illustration must answer, at thumbnail size:

- Which Hero owns this card?
- Which role job does it express?
- What material or implement creates the effect?
- What board relationship matters?
- Is this setup, conversion, payoff, recovery, or emergency response?

Reject if the image is a generic portrait with no action, if the spell effect floats with no source, if the scene is muddy or crowded with small figures, if contrast is lost in a particle cloud, or if any frame or text was drawn.
