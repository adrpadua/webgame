# Board Art Prompts — Ready To Send

Status: generated working file. Three pre-composed prompts for the hover tile, target tile, and boss crest, built from [board-and-tiles.md](board-and-tiles.md) with every slot filled.

These go to a **vector generator**, per [`_tools.md`](_tools.md). They take **no style preamble** — the preamble describes painterly material rendering that a monochrome hex ring cannot express, and prepending it only dilutes the geometric instruction that decides whether these work.

The arena backdrop is not here. It is an illustration, composes normally with the preamble, and lives in [board-and-tiles.md](board-and-tiles.md).

## Export Targets

Author as vector, then export raster at the size below. These are 4× the draw rect, matching what the current placeholders already do — the engine downsamples with filtering, so oversampling is what keeps edges clean on high-DPI screens.

| Asset | Drawn at | Export | File |
| --- | --- | --- | --- |
| Hover tile | 68×66 | **272×264** | `assets/art/board/tile_hover.png` |
| Target tile | 46×46 and 42×42 | **184×184** | `assets/art/board/tile_target.png` |
| Boss crest | 46×46 | **184×184** | `assets/art/board/boss_crest.png` |

Two things the current placeholders get wrong, which the replacements should not repeat:

**The crest must be square.** The existing `boss_neutral_crest_hex@2x.png` is 430×489 — portrait — drawn into a 46×46 square rect, so it is non-uniformly squashed by about 12% right now. Author the replacement square and it will sit correctly.

**The target tile is drawn twice from one source**, at 46×46 and again at 42×42 with a different tint. One asset serves both; do not produce two.

## 1. Hover Tile

```text
Create a flat vector UI icon: a hexagonal tile overlay marker for a tactical game board.

MARKER PURPOSE: indicating the hex the player's cursor or finger is currently over. Calm, continuous, and non-urgent — an ambient "you are here" boundary, not a call to act.

FORM:
A hexagonal ring — a hollow hex border with an open center, so the board and any piece standing on the tile remain visible through it. Flat icon design. Crisp geometric paths, even stroke weight, sharp vertices. Regular hexagon, centered, with a small even margin so no vertex touches the canvas edge. Keep the stroke light and uniform; this is the quieter of two related markers.

COLOR:
Pure white shape on a transparent background. No color, no gradient, no shadow, no glow effect. The shape must be defined by its silhouette alone, because the game multiplies this asset by its own color tint at runtime and any baked color or shading will compound with that tint.

STYLE:
Read as projected hard-light guidance geometry — a boundary painted onto the ground by a projector — not as a decorative frame or a soft glowing blob. One clean unbroken ring. No vertex ornament.

Design for legibility at 68 by 66 pixels. Nothing thinner than roughly one pixel at that scale.
```

## 2. Target Tile

```text
Create a flat vector UI icon: a hexagonal tile overlay marker for a tactical game board.

MARKER PURPOSE: indicating a hex that is a legal target for the ability currently being aimed. Assertive and attention-drawing — this is where the player is about to commit.

FORM:
A hexagonal ring — a hollow hex border with an open center, so the board and any piece standing on the tile remain visible through it. Flat icon design. Crisp geometric paths, sharp vertices. Regular hexagon, centered, with a small even margin so no vertex touches the canvas edge.

This is the louder sibling of a matching hover marker. Carry the extra weight through a heavier stroke and emphasis at the six vertices — short thickened corner brackets reading as a lock-on. Do not add fill, texture, or inner ornament.

COLOR:
Pure white shape on a transparent background. No color, no gradient, no shadow, no glow effect. The shape must be defined by its silhouette alone, because the game multiplies this asset by its own color tint at runtime and any baked color or shading will compound with that tint.

STYLE:
Read as projected hard-light targeting geometry — a lock painted onto the ground by a projector — not as a decorative frame or a soft glowing blob.

Design for legibility at 46 by 46 pixels. Nothing thinner than roughly one pixel at that scale.
```

**Generate these two together and compare them directly.** They are shown under different runtime tints — green for hover, orange for target — so a player never sees them side by side in the same color. The difference has to survive in stroke weight and vertex shape alone. If the only thing separating them is hue, they are wrong; view both in flat white before accepting either.

## 3. Boss Crest

```text
Create a flat vector emblem: a heraldic crest marking the hex occupied by a raid boss on a tactical game board.

FORM:
Radially balanced, heavy, and authoritative, on a square canvas. Read as an oath-seal or containment sigil — the mark a protocol stamps on a catastrophic entity to bind it. Build it from interlocking lock and hinge forms and hard angular geometry, suggesting machinery that holds something shut. Solid mass, not an outline: this must read as a stamped seal, distinct from the hollow hexagonal ring markers used elsewhere on the same board.

COLOR:
Pure white shape on a transparent background. No color, no gradient, no shadow, no glow. The game multiplies this by its own tint at runtime, so any baked color will compound.

CONSTRAINTS:
Readable at 46 by 46 pixels. This is the hardest constraint here — use very few elements, keep negative space generous and deliberate, and let the outer silhouette do most of the identifying work. Compose it square, not tall.

No text, letters, numerals, or marks resembling any real alphabet.
```

## Accepting Each Result

- Open the PNG and confirm the background is genuinely transparent, not white.
- Confirm no hue, no baked shadow, no glow.
- Confirm the export came from the SVG at the target size rather than a downsampled raster.
- Downsample to the draw size and confirm the shape still reads.
- Hover and target: view both under their runtime tints and confirm they stay distinguishable.
- Crest: confirm it reads as solid mass against the two hollow rings, so a player can tell a boss marker from a targeting marker instantly.

Verify in the game, not the file browser. The runtime tint is applied after everything above.

## Wiring The Results In

Board art is hardcoded, so each asset needs a script edit. Current constants and call sites:

| Asset | Constant | Declared | Drawn |
| --- | --- | --- | --- |
| Hover tile | `DuelystHoverTile` | `scripts/hex/HexTile.gd:13` | `:128` |
| Target tile | `DuelystTargetTile` | `scripts/hex/HexTile.gd:14` | `:119`, `:122` |
| Boss crest | `DuelystBossCrest` | `scripts/hex/HexPiece.gd:5` | `:140` |

For each: drop the PNG into `assets/art/board/`, let Godot import it, then repoint the `preload` path and rename the constant off the `Duelyst` prefix — the name is a placeholder artifact and should not outlive the placeholder.

**Once two or more of these are replaced, move the paths into `scripts/art/ArenaArt.gd`** alongside `BACKDROP`, the way the backdrop was collapsed in `03c50bf`. They are each referenced from a single script today, which is why they were left alone — but that file already exists as the home for board art paths, and a second script reaching for a shared texture is the point at which collapsing pays.

Once all three land, `assets/art/open-duelyst/` has nothing live in it and the whole directory can be deleted, along with its entry in [assets/README.md](../../../assets/README.md). Check `tile_board@2x.png` is still unreferenced first — it is vendored but unused, so it should go with the rest rather than linger.
