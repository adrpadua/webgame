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

This distinction is load-bearing, and every card that needs it carries the warning on its
own face.

**Canon — specified, shipped, and enforced.** The material table and its ramps. The plate
geometry: an 8° rake with the offset derived as `height × tan(8°)`, a notched top-left
corner, a 3px accent running the full cut, and one padding rule
(`--wb-inset + --wb-gutter`) that a browser check enforces on every visible plate. The six
faces and five accents. The Slot state vocabulary. The twelve-unit Action Bar ladder. The
three notification zones. The motion rule that state fires once and only ambient motion
loops.

**Not canon — transcribed, awaiting ratification.** Typography and spacing. The interface
direction lists typography under *"What This Does Not Decide"*, and spacing simply inherits
Tailwind's default scale. The Typography and Spacing cards here record what the components
*actually use* — nine type steps mixing arbitrary pixel values with Tailwind's named scale,
and an unnarrowed spacing scale — with role names this pass adds so they can be discussed.
Treat them as a proposal. Narrowing type to about seven steps and adding a lint rule that
refuses a new arbitrary `text-[Npx]` is the obvious next move.

**Out of scope.** The board itself. It renders in Phaser under different constraints and
carries an inherited tint language — a green hover tile, an orange target tile — that
collides with ember's meaning of *this hurts you*. Reconciling it needs a pass against the
Phaser scene and has not been done.

## Layout

    colors_and_type.css     the system: tokens, plate classes, component classes
    preview/*.html          26 cards — Colors, Typography, Spacing, Plates, Components, Motion
    _ds_manifest.json       the card index and token table
    design-system/*.md      the written canon

Component cards are not drawings of components. They instantiate the same renderers the
design canvas uses, which port the real markup and values out of `web/src/ui/` — so a Slot
on the "Action Bar Slot" card is built from the same code path as a Slot in the game.

## Regenerating

    python3 design/design-system/build_ds.py OathcraftDesignSystem_18ee2c

Tokens live in `design/oathcraft_tokens.py`; component renderers and plate CSS are imported
from `design/current-game-ui/build.py`, which is the canvas builder. Nothing is authored
twice, so a value that moves in `index.css` moves here once and both surfaces follow.

Do not hand-edit the generated files. Re-run the builder and push with the DesignSync flow.

## Two defects the component cards reproduce

Both were found by measuring the shipped build, and both are drawn as they ship rather than
quietly corrected — a design system that silently fixes the app stops describing it.

- **The Signature button truncates its own card title.** `Riposte` renders 45.7px wide at
  10px/900/uppercase inside a 74px plate whose `wb-plate-sm` padding leaves a 44px content
  box. It ships as `RIPOS…`.
- **A three-Charge Top Card overflows its Slot row by 9px.** Iron Guard's row measures 106px
  of content in a 97px box; the want glyph lands inside the plate's own cut. Sweeping Blow,
  at two Charges and no want mark, fits at exactly 97/97 — which is why it went unnoticed.
