# Board Sprite Sheets

Status: active prompt template. Produces the six-facing idle sheets the Encounter Workbench draws pieces from, in the style of the shipped Elian sheet.

Compose as: [`_style-preamble.md`](_style-preamble.md) block, then the block below.

**This template overrides exactly one paragraph of the preamble — RENDERING STYLE — and nothing else.** The preamble asks for clean hand-drawn concept art, which is right for a card or a concept sheet and wrong for a 40-pixel-tall piece on a hex. Materials, palette, shape language, and the never-include list all still bind, which is what keeps a board piece and its own card recognisably the same character. The override is stated inside the prompt text as well as here, because a model handed two rendering instructions will otherwise blend them into a half-pixelated painting.

Output goes to `assets/art/characters/<entity-slug>/`, and the engine-ready sheet is built from it — never hand-cropped — by:

```bash
python3 tools/build_sprite_sheet.py assets/art/characters/<slug>/idle-contact-sheet.png web/src/assets/<slug>-idle.png
```

## What The Pipeline Already Handles

Do not spend prompt words on these. The builder keys the background out by flood fill from the border, trims each pose, and re-centres it on a shared baseline, so:

- **The background may stay opaque.** Flat near-black is fine and is what the reference sheet used.
- **Cell-to-cell drift is corrected.** Every pose is re-centred horizontally and stood on the bottom edge of its frame.
- **A left gutter of facing labels is fine.** The builder drops it.
- **Poses may touch.** A wide piece bridges the gutter between cells — Embermaw's coral reaches into its neighbours — so when the columns cannot be found by looking for empty space, the builder cuts at the thinnest part of the bridge and erases the fragments that crossed it.

That last point is a deliberate exception to the preamble's ban on text. It is worth it: labels are the only way to check a row got the facing it was asked for, and they never reach the game.

The corollary of re-centring is the one thing the prompt *must* ask for: **the idle cycle cannot animate by moving the figure.** A bob, a step, or a drift is normalised away frame by frame. Motion has to come from inside the silhouette — heat pulsing through veins, a cloak settling, a jaw working, glow breathing.

## The Trap That Cost A Row

The first sheet delivered for Elian drew the row labelled `W` facing the same direction as `E`. It shipped a piece that turns west without turning, and the fix was to mirror `E` and accept his shield changing arms in that one facing.

A generator will happily produce six rows that are six *poses* rather than six *directions*. The prompt below states the compass twice — once as geometry, once as what the camera sees — and the acceptance check tests it first.

## Sprite Sheet Prompt Block

```text
IGNORE the RENDERING STYLE paragraph above. It describes hand-drawn concept art; this asset is pixel art, and the two must not be blended. Everything else above still applies — the materials, the palette, the shape language, and the never-include list.

RENDERING STYLE for this asset, which is not negotiable:
Pixel art in the style of a modern 2D action RPG, drawn at roughly 160 pixels tall per figure and presented softly rather than crisply — visible chunky pixel clusters with smooth anti-aliased edges between them, not hard nearest-neighbour stair-steps and not a clean vector look. Limited palette per material. Strong dark outline holding the silhouette. Simple cel shading with one clear light from the upper left. Luminous materials carry a soft bloom that spills a little past their edge.

Create a facing sheet for one game piece.

PIECE: {{PIECE_NAME}}, {{ONE_LINE_HOOK}}.

MATERIAL SIGNATURE: {{MATERIALS}}.

READ AT BOARD SIZE — the single feature that must survive being shrunk to the height of a coin: {{BOARD_READ}}.

LAYOUT:
A grid of 4 columns and 6 rows on a flat, uniform near-black background. No vignette, no gradient, no ground shadow, no scenery, no border. One narrow column of small facing labels down the left edge and no other text anywhere in the image.

Each row is one facing. Top to bottom the rows are NW, NE, E, SE, SW, W.

THE FACINGS ARE DIRECTIONS, NOT POSES. The camera never moves; the piece turns. On a hex grid seen from a fixed three-quarter angle above:
- E: the piece faces the right edge of the image. Seen in profile from its left side.
- W: the piece faces the left edge of the image. Seen in profile from its right side. This is a genuine mirror-direction of E and must never repeat E's direction.
- NE: facing away from the camera and to the right. We see its back.
- NW: facing away from the camera and to the left. We see its back.
- SE: facing toward the camera and to the right. We see its front.
- SW: facing toward the camera and to the left. We see its front.

All six rows must be visibly different directions. Two rows facing the same way is a failed sheet.

Each row's 4 columns are one looping idle animation, read left to right, where the fourth frame returns cleanly to the first. The animation must not move the figure: its feet, base, or centre of mass stay in exactly the same place in all four frames. Animate what is inside the silhouette instead — {{IDLE_MOTION}}.

CONSISTENCY:
Every one of the 24 cells is the same character at the same scale, lit the same way, with the same colours and the same details. This is one piece rendered 24 times, not 24 illustrations of a piece.

SCALE: draw the piece {{SCALE}}.
```

## Filled And Ready To Send

Both use the canon in [boss-and-minion.md](boss-and-minion.md); the hooks and materials are copied from there rather than reinvented, so the board piece and the concept art describe the same creature.

### Embermaw

| Slot | Value |
| --- | --- |
| `PIECE_NAME` | `Embermaw` |
| `ONE_LINE_HOOK` | `a living furnace that treats an arena as a kiln to be heated evenly` |
| `MATERIALS` | `ember coral with visible heat veins, blackened fragmentary oathsteel plating hanging off it like shed containment, and a furnace throat glowing deep in its body` |
| `BOARD_READ` | `the furnace throat — its position on the body is what tells a player which way the heat is about to go` |
| `IDLE_MOTION` | `heat swelling and fading along the coral veins, the throat brightening and dimming as it draws breath, and loose plates settling` |
| `SCALE` | `low and wide, filling most of its cell, and clearly the largest thing in the game — about one and a half times the height of a human figure and considerably broader` |

### Whelp

| Slot | Value |
| --- | --- |
| `PIECE_NAME` | `Whelp` |
| `ONE_LINE_HOOK` | `a splintered furnace spark that broke off the Embermaw and kept burning` |
| `MATERIALS` | `small shards of ember coral around a too-bright core, with a few flecks of blackened oathsteel caught in the growth` |
| `BOARD_READ` | `the too-bright core showing through the shards, so it reads as a piece of the boss rather than a separate creature` |
| `IDLE_MOTION` | `the core pulsing unevenly and the shards shifting around it, as if it is barely holding together` |
| `SCALE` | `compact and low to the ground, about half the height of a human figure, occupying only the middle of its cell` |

Explicitly not a baby dragon, and explicitly not a small Embermaw: it is debris from the furnace that achieved motion and is still dangerously hot. It shares the boss's material because [oathcraft-board-direction.md](../oathcraft-board-direction.md) requires it — a separate hue would make a Brood Call read as a different faction arriving rather than the boss shedding part of itself. They separate by saturation and size, never by hue.

## Acceptance Check

Build the sheet first, then run the checks in the **Sprite Inspector** — the debug rail's "Inspect sheets" button, on any build with the rail (`npm run dev`, or `?debug=1`). It lays every frame out in the engine's facing order with the direction each row is supposed to face, so the checks below are a read rather than an investigation. Its `checker` ground is the one that shows keying damage; its `board size` zoom is the one that answers whether the piece reads at all.

Test the facings before anything else. A beautiful sheet with two rows pointing the same way is a sheet that has to be regenerated or mirrored.

- Do `E` and `W` face **opposite** edges of the image? Do `NE`/`NW` show the back and `SE`/`SW` the front?
- Are all six rows visibly different directions?
- Across the four frames of a row, do the feet or base stay put? A figure that travels loses its motion to the builder's re-centring.
- Is it the same creature at the same scale in all 24 cells?
- Held at the height of a coin, is the `BOARD_READ` feature still the thing you see first?
- Is the Whelp instantly distinguishable from Embermaw by silhouette and size alone, while obviously made of the same material?
- Any text outside the left label gutter? Reject.
- Is the background flat near-black with no baked drop shadow? The board casts its own, and a baked one keys into the sprite and doubles.

## Wiring A Finished Sheet

`web/src/board/BoardScene.ts` holds a `SHEETS` table keyed by piece kind — Elian and Embermaw are the worked examples. A new sheet is one entry carrying its frame size, the height it renders at, and how far below the hex centre its base sits. The smoke reads that table and checks every sheet's PNG header against it, so a new entry is covered the moment it is added.

Pieces are scaled by height rather than sharing a scale, because each sheet is cropped to its own content and a shared scale would size a piece by however much empty space its contact sheet happened to leave. They are also depth-sorted by where they stand: a wide piece like Embermaw overlaps the hexes in front of it, and the piece nearer the camera has to occlude the one behind.
