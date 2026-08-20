# Oathcraft Design System

The interface language of **Raid Card Tactics** — a co-op fantasy raid-boss hex-tactics
game — as it actually ships, not as it was once sketched.

Everything in this project is generated from the running application. The canonical source
is `web/src/index.css` and the components under `web/src/ui/`; the specification behind them
is `docs/content/oathcraft-interface-direction.md`. This project is that system restated in
the shape Claude Design reads.

## The governing rule

> Colour reads as role and material, never as decoration. If a new colour is needed, the
> answer is almost always that the wrong material was chosen.

Eight materials, each with one job. Runeglass is projected information. Living gold is
lockwork — anything the player operates. Ember is damage taken; ember coral is the Boss's
own body, and damage dealt to it. Oathsteel is panels. Aether ceramic is read-outs. Signal
cloth is the per-Hero role channel. Void navy is the ground.

## What is canon, and what is not

This distinction is load-bearing. A card states which side of it the thing on that card
sits on, and a layer that is not yet decided says so rather than presenting itself as a
rule.

**Canon — specified, shipped, and enforced.** The material table and its ramps. The plate
geometry: an 8° rake with the offset derived as `height × tan(8°)`, a notched top-left
corner, a 3px accent running the full cut, and one padding rule
(`--wb-inset + --wb-gutter`) that a browser check enforces on every visible plate. The six
faces and five accents. The Slot state vocabulary. The twelve-unit Action Bar ladder. The
three notification zones. The motion rule that state fires once and only ambient motion
loops.

Typography and spacing joined that list on 2026-08-19 (D-067). Type is ratified at seven
steps, transcribed from what shipped and then narrowed — the two singletons both lived in
the How to Play guide — and an ESLint rule refuses a new arbitrary `text-[Npx]` outside
them. Spacing went the other way on purpose: Tailwind's default scale is adopted whole and
only the arbitrary escape hatch is refused, because spacing showed no defect behind it and
a rule without one is ceremony.

**Still open.** Status-effect iconography, and motion beyond the documented set. Both stay
open deliberately: there are no status-effect icons because no authored status effect needs
one yet, so deciding now would be inventing rather than describing.

**In, as of D-068.** The board. It renders in Phaser under different constraints, but
`web/src/board/palette.ts` reads the same token table as the chrome and reasons in material
terms in its own comments. An earlier version of this README said the board sat outside the
palette with a green hover tile colliding with ember; that was carried from a stale
paragraph in the interface direction, and the code had already resolved it.

## Layout

    colors_and_type.css     the system: tokens, plate classes, component classes
    preview/*.html          26 cards — Colors, Typography, Spacing, Plates, Components, Motion
    _ds_manifest.json       the card index and token table

No prose is carried here by copy. An earlier version shipped three canon docs as verbatim
copies and one was stale on arrival, asserting a palette collision the code had already
fixed — to anyone reading the design language cold, that is the worst possible reader. The
canon lives in `docs/content/oathcraft-interface-direction.md` and its siblings; the cards
carry the reasoning that matters at the point of use.

Component cards are not drawings of components. They instantiate the same renderers the
design canvas uses, which port the real markup and values out of `web/src/ui/` — so a Slot
on the "Action Bar Slot" card is built from the same code path as a Slot in the game.

## Regenerating

    python3 design/design-system/build_ds.py OathcraftDesignSystem_18ee2c

Tokens live in `design/oathcraft_tokens.py`; component renderers and plate CSS are imported
from `design/current-game-ui/build.py`, which is the canvas builder. Nothing is authored
twice, so a value that moves in `index.css` moves here once and both surfaces follow.

Do not hand-edit the generated files. Re-run the builder and push with the DesignSync flow.

## Two defects this project found, and the guards that now hold them

Both were found by measuring the shipped build while reproducing it here, which is the
strongest argument for keeping the reproduction faithful. Both are fixed.

- **The Signature button truncated its own card title.** `Riposte` renders 45.7px wide at
  10px/900/uppercase, and a 74px plate's derived padding left a 44px content box, so the one
  control whose job is naming the power shipped it as `RIPOS…`. The plate is 84px now, and
  the browser check asserts by name that the button prints its whole title.
- **A three-Charge Top Card overflowed its Slot row by 9px.** Iron Guard's row measured
  106px of content in a 97px box, putting a Keyword glyph inside the plate's own cut. The
  want marks moved to the row under the pins. Sweeping Blow, at two Charges and no want
  mark, fits at exactly 97/97 — which is why it went unnoticed, and why the guard now loads
  Iron Guard deliberately and asserts that the worst case is the state under measurement.

The padding rule's browser check could not have caught either: it measures padding, not
content. It now has a content-overrun walk beside it.
