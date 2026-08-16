# Board, Tiles, And Backdrop

Status: active prompt template. Produces the tactical surface art that replaces the borrowed OpenDuelyst placeholders.

Compose as: [`_style-preamble.md`](_style-preamble.md) block, then the relevant block below.

Output goes to `assets/art/board/`.

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

```text
Create a single hexagonal tile overlay marker for a tactical game board, drawn in the hand-drawn cel-shaded style described above.

MARKER PURPOSE: {{PURPOSE}}.

CRITICAL TECHNICAL REQUIREMENTS:
Render the marker in neutral white and light grey only. Use no color whatsoever — the game applies its own color tint at runtime, and any color baked into this image will compound with that tint and corrupt the result.
The background must be fully transparent. Not white, not near-white — transparent alpha.
The marker must be a hexagonal ring or border shape, hollow in the center, so the board tile and any piece standing on it remain visible through it.
Center the hexagon in a square canvas with a few pixels of margin so the shape is not clipped.

DESIGN:
The marker should read as projected oathcraft geometry — hard-light guidance painted onto the ground by a pattern projector — rather than a painted decal or a glowing blob. Crisp geometric edges. A thin implied glyph structure is welcome if it stays subordinate to the ring. Value contrast alone must carry the shape, since color is applied later.

The design must stay unambiguous at 68 by 66 pixels. Prefer one strong ring over layered ornament.
```

Slot `PURPOSE` with one of:

- **Hover** — `indicating the hex the player's cursor or finger is currently over; calm, continuous, and non-urgent`
- **Target** — `indicating a hex that is a legal target for the ability being aimed; more assertive and attention-drawing than a hover state, with clear corner or vertex emphasis`

Keep them the same family and different in weight. A player must distinguish them instantly under two different tints, which means the difference has to survive in value and shape, never in hue.

## Boss Crest

```text
Create a single heraldic crest emblem to mark the raid boss's occupied hex on a tactical board, drawn in the hand-drawn cel-shaded style described above.

The crest should read as an oath-seal or containment sigil — the mark a raid protocol stamps on a catastrophic entity — built from living-gold lockwork and hard geometric oathsteel forms. Radially balanced, heavy, and authoritative.

CRITICAL TECHNICAL REQUIREMENTS:
Neutral white and light grey only, with no baked color; the game tints this at runtime.
Fully transparent background.
The design must remain readable at 46 by 46 pixels, which means very few elements and strong internal value separation.

No text, letters, numerals, or runes resembling real alphabets.
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
- Confirm no hue is present in any tile or crest asset.
- Downsample to the target pixel size and confirm the shape still reads.
- For hover and target, view both under their runtime tints and confirm they remain distinguishable from each other.
- For the backdrop, confirm legibility of tile outlines and combat text with it in place.
