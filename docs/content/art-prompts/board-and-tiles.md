# Board, Tiles, And Backdrop

Status: active prompt template. Produces the tactical surface art that replaces the borrowed OpenDuelyst placeholders.

Output goes to `assets/art/board/`.

This file splits across two tools, per [`_tools.md`](_tools.md):

- **Tiles and crest** go to a vector generator. They are iconography, not illustration, and the blocks below are written for that. Do **not** prepend the style preamble to them — it describes painterly material rendering that a monochrome hex ring cannot express, and it dilutes the geometric instruction that matters.
- **The backdrop** is an illustration. Compose it normally: [`_style-preamble.md`](_style-preamble.md) block, then the backdrop block.

It also splits across two consumers, and they want opposite things:

- The **hover tile, target tile, and crest** replace borrowed placeholders in the frozen Godot build. Everything they ask for follows from that build multiplying them by a runtime modulate.
- The **hex tile floor and the arena backdrop** are for the live board in the Encounter Workbench, which draws its tiles in code today and has no backdrop at all. Their sizes, values, and constraints come from `web/src/board/` and from [oathcraft-board-direction.md](../oathcraft-board-direction.md), not from the Godot table below.

## Read This Before Generating

This is the one category where a beautiful image is still the wrong asset. The board art is drawn through `draw_texture_rect` with a **modulate color applied at runtime**, so the engine multiplies your image by a tint every frame. Art that already carries the tint comes out doubled — a green hover ring on a green modulate lands acid, not readable.

Every tile prompt below therefore demands **neutral near-white art on a fully transparent background**. That is a hard technical requirement, not a style preference.

Current call sites and the exact treatment each asset receives:

> **The integration column below describes the frozen Godot build (ADR 0019).** The `.gd` paths and their modulate colours are kept as a record of how the borrowed placeholders were tinted; they are not where the live board gets its colour. The Encounter Workbench draws the board in `web/src/board/BoardScene.ts` from the tokens in `web/src/board/palette.ts`, and what each value is allowed to mean is decided by [oathcraft-board-direction.md](../oathcraft-board-direction.md) — which, among other things, retires the green hover tint below, because green names no material. The sizes and the prompt guidance are still live.

| Asset | Drawn by | Drawn at | Runtime modulate |
| --- | --- | --- | --- |
| Hover tile | `scripts/hex/HexTile.gd:128` | 68×66 px | `Color(0.56, 0.96, 0.70, 0.84)` — green |
| Target tile | `scripts/hex/HexTile.gd:119` | 46×46 px | `Color(1.0, 0.35, 0.16, 0.75)` — orange |
| Target tile (second pass) | `scripts/hex/HexTile.gd:122` | 42×42 px | `Color(0.94, 0.78, 0.72)` — warm pale |
| Boss crest | `scripts/hex/HexPiece.gd:140` | 46×46 px | `Color(1.0, 1.0, 1.0, 0.92)` — near-neutral |
| Backdrop, board | `scripts/hex/HexGrid.gd:75` | fills board | `Color(0.78, 0.94, 1.0, 0.72)` — cool, 72% |
| Backdrop, window | `scripts/Main.gd:198` | fills window | `Color(0.78, 0.90, 1.0, 0.14)` — cool, 14% |

Both backdrop sites read `ArenaArt.BACKDROP` from `scripts/art/ArenaArt.gd`, so replacing the backdrop is one edit there rather than one per drawing site.

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

## Hex Tile Floor

Vector generator, no preamble, same reasoning as the markers above. This one is for the live board.

The Workbench draws each hex as a flat fill with a stroke and a darker skirt, straight from `web/src/board/BoardScene.ts`. A generated tile replaces that fill with a drawn slab. Everything it may contain follows from four numbers in that file and one rule in the interface direction.

| Property | Value | Set by |
| --- | --- | --- |
| Shape | Regular pointy-top hexagon — vertex top and bottom, flats left and right | `hexCorners` in [layout.ts](../../../web/src/board/layout.ts) |
| Face size on the board | **59 × 68 px** | `hexCorners(x, y, HEX_SIZE - 2)`, `HEX_SIZE = 36` |
| Export | **236 × 272**, 4× | Oversampling for high-DPI, as the markers do |
| Floor tint | The steel ramp — `steel-900` today | `tileFill` in [palette.ts](../../../web/src/board/palette.ts) |
| Scorched tint | The coral ramp — `coral-900` today | `scorchedFill`, same file |
| Per-hex value jitter | ±6%, deterministic from the coordinates | `TILE_JITTER` |
| Skirt | 6 px drop, face value × 0.45 | `TILE_DEPTH`, `TILE_SKIRT_SHADE` |

**One asset serves both the floor and scorched ground.** They are the same slab of oathsteel; one of them has burned. The board direction requires that, since a second drawn asset for scorched ground would separate them by more than the ramp step the direction allots.

### Why This Prompt Asks For So Little

The tile's detail budget is close to zero, and that is a decision rather than an oversight.

The interface direction permits [exactly four textures](../oathcraft-interface-direction.md), and states that no surface carries two. The board tile has already spent its one on **surface jitter** — the per-hex value shift the scene applies to break up a repeated fill. So the slab may not also carry an inlay seam, a glyph grid, heat veins, grain, or noise. The same document bans gradients on small elements, and 59 px is small.

What is left is edges: the cast chamfer, the hard step between the lit and shadowed sides, and the crispness of the cut. That is the whole brief, and a generation that arrives with a beautiful etched surface is a rejection, not a compromise.

Keep the cut regular and symmetrical for the same reason. One asset is repeated across the whole grid, so a distinctive chip or nick repeats nineteen times and reads as a pattern rather than as wear. Variation on this board comes from the jitter, which is deterministic and already tuned.

### How The Tint Maps

Same principle as the markers, different arithmetic. The scene multiplies, so **pure white in the art becomes the tint colour exactly** and every darker value becomes a shade of it.

That means the art cannot be near-white the way a hollow ring is — a slab with no headroom has nowhere to put a lit edge. Keep the body of the slab near **50% grey**, and wire it to the **700 step** of whichever ramp it is drawn in. The body then lands on the 900 step the board fills with today: `steel-700` `#37465f` at half value is `#1c2330`, against the `steel-900` `#1b2434` currently drawn. Scorched follows the same step, `coral-700` to `coral-900`.

### The Prompt

```text
Create a flat vector game asset: a single hexagonal floor tile for a tactical game board, seen from a fixed three-quarter angle above.

TILE MATERIAL: oathsteel — dark cast metal with hard geometric edges, laid as one slab of an arena floor.

FORM:
One regular pointy-top hexagon: a vertex at the top, a vertex at the bottom, flat sides to the left and right. It fills the canvas exactly — the top and bottom vertices touch the canvas edge, the left and right flats touch the sides. No margin and nothing outside the hexagon; everything outside it is fully transparent.

This is one discrete slab, not a piece of a repeating pattern. Nothing crosses its boundary. On the board these are laid with a visible gap between them, so the cut edge is the asset.

Keep the cut regular and symmetrical. This single tile is repeated across the entire grid, so any distinctive chip, crack, or nick will repeat two dozen times and read as a pattern rather than as wear.

LIGHT:
One key light from the upper left, hard-stepped, never a gradient. The three upper-left edges carry a narrow lighter band; the three lower-right edges carry a narrow darker one. Two or three flat value steps in total, with a hard boundary between them. The body of the slab between the edges is a single flat value.

VALUE ONLY, NO COLOR:
Pure greyscale on a transparent background. No hue anywhere. The game multiplies this asset by a color token at runtime, so pure white becomes that color exactly and every darker value becomes a shade of it. Keep the body of the slab near 50 percent grey so the lit and shadowed edges both have room, and reserve pure white for the single brightest band on the lit edge.

NO SURFACE DETAIL:
The interior of the slab is one flat value. No texture, grain, noise, speckle, scratches, hatching, stippling, or pattern. No seams, panel lines, grids, rivets, bolts, glyphs, or glow. All of the tile's character lives in its edges — the chamfer, the value step, and the crispness of the cut.

NO SHADOW:
No drop shadow, no cast shadow, no outer glow, no ambient occlusion outside the shape. The board draws the tile's depth itself and a baked one doubles it.

Design for legibility at 59 by 68 pixels. Anything that does not survive that size is detail that costs and returns nothing.

No text, letters, or numerals.
```

### Wiring A Finished Tile

Nothing reads a tile texture today, so this is a code change rather than a file drop — but a small one, and unlike the Godot assets above it targets the live board.

`BoardScene.ts` builds each hex through `fillHex` with `tileFill` and `TILE_STROKE`. A drawn tile becomes an image loaded in `preload()` and placed per hex, tinted from `palette.ts` with the jitter applied as it is now. The code stroke goes away in the same edit: the art carries its own edge, and keeping both draws two.

`assets/art/open-duelyst/tile_board@2x.png` is vendored and referenced by nothing. It is superseded by this asset rather than wired, and should be deleted with the rest of that directory.

## Arena Backdrop

Composed normally: [`_style-preamble.md`](_style-preamble.md) block, then the block below. This is an illustration, and the only asset here that is finished art rather than a value mask.

The live consumer is the Workbench board, which is a transparent canvas over the play surface. That changes the brief in two ways from the Godot version recorded above.

**There is no runtime modulate on the web, so what you generate is what shows.** The two Godot sites multiplied the backdrop to 72% and 14%; nothing does that here. The value discipline the tint used to enforce has to be in the art.

**Warm saturation is the constraint that matters.** [oathcraft-board-direction.md](../oathcraft-board-direction.md) ranks warm by imminence, and the least imminent warm thing on the board is scorched ground at `coral-900`. A backdrop is less imminent than that, so any ember in it must sit below `coral-950` `#2c150a`.

The number to hold it against is not a token, because a telegraph is a tint rather than a fill. Cinder Breath paints `coral-300` at 28% over the floor and a Brood Call paints `coral-400` at 32%, so what actually reaches the screen is **`#564443`** and **`#5a3c36`** — far duller than the tokens suggest. That is the loudest warm pixel the game can draw, and it is the hard never-exceed for scenery. The first generated backdrop had lava cores at `#e67c54`: seven times a telegraph's luminance, on a surface that means nothing.

**A value ceiling was tried and is the wrong tool.** The obvious companion rule — keep the whole backdrop under the floor's `steel-900` `#1b2434` — reads well and measures badly. Two things break it. The board covers its own centre with **opaque** tiles, so most of what the ceiling catches is never visible; only the thin gaps between hexes and the surround outside the grid ever show. And the surround is where the illustration does its work, so crushing it flattens the ruins into grey mud while fixing nothing anyone can see. Verified both ways on the first pair: 60% of the centre measured over the ceiling, and with tiles drawn the floor still read correctly as the lit plane.

So the value rule is a soft one — keep the composition dark and let the tiles be the brightest large shape — and the warm rule is the hard one.

```text
Create an environment illustration to sit behind a tactical hex board, drawn in the hand-drawn cel-shaded style described above.

SUBJECT: {{ARENA}}.

FRAMING: square, 1 to 1. The hex board covers the middle of the image; treat the outer tenth as bleed that may be cropped and put nothing essential there.

CRITICAL COMPOSITION REQUIREMENTS:
This image sits behind live gameplay and must never compete with it.

Keep the entire illustration in a narrow, very dark value range — near the bottom of the value scale, close to a deep desaturated navy-black. No bright highlights, no light sky, no glowing light source, no high-contrast focal point. The brightest thing in this image must still be darker than the dark blue-grey tiles that will be drawn on top of it.

Colour is cool and desaturated throughout: deep navy, blue-black, cold slate. Any warm or ember-coloured element must be almost entirely burnt out — deep, dull, and dark, never a saturated orange and never emitting light. Warm saturation belongs to the pieces and warnings drawn above this image, and anything warm and bright here will be mistaken for one of them.

Detail is soft, large in scale, and evenly distributed, with nothing that pulls the eye to one spot. Leave the central region calmest of all, since the board sits over it and tile edges, piece silhouettes, and combat text must stay legible through it.

The arena reads as a built raid site — a place with protocols, gates, and evacuation routes — not as wilderness. Architectural masses in the far distance, ground plane simple and open, horizon low or absent.
```

Slot `ARENA` from the gazetteer. For the current encounter: `the Embermaw's ashen trial ground — a scorched basalt arena ringed by cooling ember-coral growth and the blackened remains of oathsteel containment rigs`.

Expect the first roll to come back too hot. Models read "dark arena" as "dramatic arena with a glowing horizon", and negative wording will not hold it — the Leonardo run in [`_tools.md`](_tools.md) established that a constraint moved into a negative list stops binding.

### Knocking A Hot Backdrop Down

A re-roll is the library's default, but it is the wrong default here: the fault is one channel, and re-rolling gambles a composition that is already right. The correction is mechanical and reproducible instead.

```bash
python3 tools/tone_backdrop.py in.png out.png --warm-ceiling '#2c150a'
```

It applies a soft ceiling to warm pixels in linear light — identity to third order in the shadows, so the basalt keeps its modelling, and asymptotic at the ceiling, so nothing can cross it however hot it started. It reports what moved. On the shipped pair it took the saturated ember peak from 7.4× a telegraph's luminance to none at all, and left the calm version essentially untouched, which is the behaviour to want: a tool that confirms a good asset rather than changing it.

Keep the ungraded generation next to the result as `*-source.png`. It is the input the command reproduces from, and it is what a future re-grade starts from if the ceilings move.

### Verifying It

**In the game if you can, and over the tiles if you cannot.** Looking at the image alone answers nothing, because the failure is a relationship between two surfaces. The centre of the illustration is entirely hidden behind opaque hexes, so an image that is wrong there is not wrong at all, and an image that is right everywhere except the gaps is still wrong.

Drawing the board's own nineteen hexes over a candidate — same `HEX_SIZE`, same fill, same skirt — answers it in one look and needs no dev server.

### The Phase Pair

`assets/art/board/` holds two, and they are the same illustration with one channel changed — same camera, same composition, only the crack glow differs. That is deliberately not a second arena: a boss phase changes what Embermaw does, not where you are standing, and [oathcraft-board-direction.md](../oathcraft-board-direction.md) would want different art only if the place itself changed.

Both are graded to the same warm ceiling, and the **difference** between them is what carries the phase rather than the absolute brightness of either. A player watches the first for five rounds before the Phase Trigger can fire, so a small shift against a remembered state reads clearly. A phase that announces itself by getting louder than the telegraph it is about to fire has inverted the ordering the whole warm side rests on.

| File | Use |
| --- | --- |
| `arena-backdrop.png` | Phase I |
| `arena-backdrop-phase-two.png` | Phase II, once `bossPhase` reaches 2 |
| `*-source.png` | The ungraded generations, kept as the grade's input |

### Wiring A Finished Backdrop

No consumer today, and two plausible routes. As a CSS background on the board's container in `web/src/ui/App.tsx`, or as a Phaser image in `BoardScene.ts` at a depth below the tiles. The first is a one-line change and survives the canvas being transparent already; the second puts it in the same file as everything else it has to stay darker than. Neither is chosen — decide it when the art exists.

## Acceptance Check

- Open the PNG and confirm the background is genuinely transparent, not white.
- Confirm no hue is present in any tile or crest asset, and no baked shadow or glow.
- Confirm the export came from the SVG at the target size rather than from a downsampled raster, so edges stay crisp.
- Downsample to the target pixel size and confirm the shape still reads.
- For hover and target, view both under their runtime tints and confirm they remain distinguishable from each other.
- For the backdrop, confirm legibility of tile outlines and combat text with it in place.
- For the backdrop, measure rather than judge: no saturated warm pixel above `#5a3c36` in luminance, which is the loudest a telegraph ever composites to. Judging this by eye is how the first pair shipped at seven times that.
- For a phase pair, put both mock-ups side by side. Is the phase legible as a *change*, without either one being loud on its own?

For the hex tile floor:

- Is the interior of the slab genuinely one flat value? Any grain, seam, or panel line is a second texture and the tile has already spent its one on jitter.
- Is the hexagon pointy-top, and does it fill the canvas edge to edge with no margin?
- Is the body near 50% grey, with pure white present only on the lit edge? A near-white slab has no headroom and will flatten once tinted.
- Is the light from the upper left, in hard steps rather than a gradient?
- Lay the tile out nineteen times at 59 px and look for repetition. A feature you can pick out in the grid is a feature that has to go.
- Tint it to both ramps and confirm the same slab reads as oathsteel floor and as scorched ground.
