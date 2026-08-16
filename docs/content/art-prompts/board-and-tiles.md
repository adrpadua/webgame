# Board, Tiles, And Backdrop

Status: active prompt template. Produces the tactical surface art that replaces the borrowed OpenDuelyst placeholders.

Output goes to `assets/art/board/`.

This file splits across two tools, per [`_tools.md`](_tools.md):

- **Tiles and crest** go to a vector generator. They are iconography, not illustration, and the blocks below are written for that. Do **not** prepend the style preamble to them — it describes painterly material rendering that a monochrome hex ring cannot express, and it dilutes the geometric instruction that matters.
- **The backdrop** is an illustration. Compose it normally: [`_style-preamble.md`](_style-preamble.md) block, then the backdrop block.

## Read This Before Generating

This is the one category where a beautiful image is still the wrong asset. The board art is drawn through `draw_texture_rect` with a **modulate color applied at runtime**, so the engine multiplies your image by a tint every frame. Art that already carries the tint comes out doubled — a green hover ring on a green modulate lands acid, not readable.

Every tile prompt below therefore demands **neutral near-white art on a fully transparent background**. That is a hard technical requirement, not a style preference.

Current call sites and the exact treatment each asset receives:

| Asset | Drawn by | Drawn at | Runtime modulate |
| --- | --- | --- | --- |
| Hover tile | `scripts/hex/HexTile.gd:128` | 68×66 px | `Color(0.56, 0.96, 0.70, 0.84)` — green |
| Target tile | `scripts/hex/HexTile.gd:119` | 46×46 px | `Color(1.0, 0.35, 0.16, 0.75)` — orange |
| Target tile (second pass) | `scripts/hex/HexTile.gd:122` | 42×42 px | `Color(0.94, 0.78, 0.72)` — warm pale |
| Boss crest | `scripts/hex/HexPiece.gd:140` | 46×46 px | `Color(1.0, 1.0, 1.0, 0.92)` — near-neutral |
| Backdrop, board | `scripts/hex/HexGrid.gd:75` | fills board | `Color(0.78, 0.94, 1.0, 0.72)` — cool, 72% |
| Backdrop, window | `scripts/Main.gd:197` | fills window | `Color(0.78, 0.90, 1.0, 0.14)` — cool, 14% |

One hex cell is `Vector2(76, 80)`. Generate at 4× or more and downsample; these are tiny targets and detail that survives at 68 px is the only detail worth drawing.

## Hover And Target Tiles

Vector generator. Export SVG, then a transparent PNG at the exact draw size in the table above.

```text
Create a flat vector UI icon: a hexagonal tile overlay marker for a tactical game board.

MARKER PURPOSE: {{PURPOSE}}.

FORM:
A hexagonal ring — a hollow hex border with an open center, so the board and any piece standing on the tile remain visible through it. Flat icon design. Crisp geometric paths, even stroke weight, sharp vertices. Regular hexagon, centered, with a small even margin so no vertex touches the canvas edge.

COLOR:
Pure white shape on a transparent background. No color, no gradient, no shadow, no glow effect. The shape must be defined by its silhouette alone, because the game multiplies this asset by its own color tint at runtime and any baked color or shading will compound with that tint.

STYLE:
Read as projected hard-light guidance geometry — a boundary painted onto the ground by a projector — not as a decorative frame or a soft glowing blob. A subordinate accent at the vertices or a thin inner line is welcome if it holds a clean edge at small size. One strong ring beats layered ornament.

Design for legibility at 68 by 66 pixels. Nothing thinner than roughly one pixel at that scale.
```

Slot `PURPOSE` with one of:

- **Hover** — `indicating the hex the player's cursor or finger is currently over; calm, continuous, and non-urgent`
- **Target** — `indicating a hex that is a legal target for the ability being aimed; more assertive and attention-drawing than a hover state, with clear corner or vertex emphasis`

Keep them the same family and different in weight. A player must distinguish them instantly under two different tints, which means the difference has to survive in value and shape, never in hue.

## Boss Crest

Vector generator. Export SVG, then a transparent PNG at 46×46.

```text
Create a flat vector emblem: a heraldic crest marking the hex occupied by a raid boss on a tactical game board.

FORM:
Radially balanced, heavy, and authoritative. Read as an oath-seal or containment sigil — the mark a protocol stamps on a catastrophic entity to bind it. Build it from interlocking lock and hinge forms and hard angular geometry, suggesting machinery that holds something shut. Solid mass, not an outline.

COLOR:
Pure white shape on a transparent background. No color, no gradient, no shadow, no glow. The game multiplies this by its own tint at runtime, so any baked color will compound.

CONSTRAINTS:
Readable at 46 by 46 pixels. This is the hardest constraint here — use very few elements, keep negative space generous and deliberate, and let the outer silhouette do most of the identifying work.

No text, letters, numerals, or marks resembling any real alphabet.
```

## Arena Backdrop

```text
Create a wide environment illustration to sit behind a tactical hex board, drawn in the hand-drawn cel-shaded style described above.

SUBJECT: {{ARENA}}.

CRITICAL COMPOSITION REQUIREMENTS:
This image is drawn at low opacity behind gameplay and must never compete with it. Keep the whole illustration in a narrow mid-value range — no deep blacks, no bright highlights, no high-contrast focal point. Detail should be soft, large in scale, and evenly distributed, with nothing that pulls the eye to one spot.
Leave the central region calmest, since the hex board sits over it and tile outlines, character facings, and combat text must stay legible through it.
Landscape orientation, wide.

The arena should read as a built raid site — a place with protocols, gates, and evacuation routes — not as wilderness. Architectural masses in the far distance, ground plane simple and open.
```

Slot `ARENA` from the gazetteer. For the current encounter: `the Embermaw's ashen trial ground — a scorched basalt arena ringed by cooling ember-coral growth and the blackened remains of oathsteel containment rigs`.

Verify the result by dropping it in and looking at the board, not by looking at the image alone. It gets multiplied to 72% over the board and 14% over the window, and the failure mode is an illustration that looks excellent at full strength and turns to grey mud at 14%.

## Board Tile

`assets/art/open-duelyst/tile_board@2x.png` is vendored but referenced by no script — the board currently draws its own hex outlines in code, over the backdrop. Generating a board tile is therefore optional, and needs a wiring change in `scripts/hex/HexTile.gd` before it would appear. Decide whether you want a drawn tile before spending a generation on one.

## Acceptance Check

- Open the PNG and confirm the background is genuinely transparent, not white.
- Confirm no hue is present in any tile or crest asset, and no baked shadow or glow.
- Confirm the export came from the SVG at the target size rather than from a downsampled raster, so edges stay crisp.
- Downsample to the target pixel size and confirm the shape still reads.
- For hover and target, view both under their runtime tints and confirm they remain distinguishable from each other.
- For the backdrop, confirm legibility of tile outlines and combat text with it in place.
