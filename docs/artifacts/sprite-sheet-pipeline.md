# Sprite Sheet Pipeline

Status: live contract. How a board piece gets from a prompt to a pixel on a hex, and what stops each stage from lying to the next.

This is the spine. The reasoning behind each stage lives with the stage — [board-sprite-sheets.md](../content/art-prompts/board-sprite-sheets.md) owns prompt authoring and the art traps, [oathcraft-board-direction.md](../content/oathcraft-board-direction.md) owns where a piece sits in the board's warm ranking. This document owns the route and the invariants, and links rather than restates.

## The Route

| Stage | Produces | Owned by |
| --- | --- | --- |
| Prompt | A 12-cell contact sheet | [board-sprite-sheets.md](../content/art-prompts/board-sprite-sheets.md), composed by `tools/compose_sprite_prompts.py` |
| Build | The engine sheet, 6 facings x 4 frames | `tools/build_sprite_sheet.py` |
| Grade | The same sheet, ranked correctly against the board | `tools/tone_sprite.py`, only when needed |
| Declare | One entry a scene can index | [`web/src/board/sheets.ts`](../../web/src/board/sheets.ts) |
| Draw | Pieces on hexes | `web/src/board/BoardScene.ts` |
| Check | A failure that is loud rather than silent | `web/scripts/smoke.mjs`, the Sprite Inspector |

## 1. Prompt

A sheet is asked for as **3 rows x 4 columns**: facings `NE`, `E`, `SE`, each row one looping idle cycle. Not six rows — the west side is mirrored during the build, which halves the cells a generator has to hold consistent and makes a west row that faces east structurally impossible.

Composed prompts are generated, never hand-written:

```bash
python3 tools/compose_sprite_prompts.py
```

## 2. Build

```bash
python3 tools/build_sprite_sheet.py assets/art/characters/<slug>/idle-contact-sheet.png \
  web/src/assets/<slug>-idle.png --rows NE,E,SE --mirror W=E,NW=NE,SW=SE
```

The builder keys the background out by flood fill from the border, drops the left label gutter, finds the column bands, trims each pose, re-centres it horizontally, stands it on the bottom edge, and repacks the rows into the engine's facing order. Mirrored facings take their poses from another row flipped, and round their odd padding the other way so a west facing is an exact mirror of its east partner rather than a pixel out.

Sheets predating the three-row change hold all six rows; rebuild those with `--rows NW,NE,E,SE,SW,W` and the same `--mirror`, which reads the east rows and discards the west ones.

**Never hand-crop a sheet.** Every number the scene slices by assumes the builder produced the file.

## 3. Grade

Only when a piece lands in the wrong place in the board's warm ranking. A sprite is drawn art and no runtime token governs it, so the correction has to be in the pixels.

```bash
python3 tools/tone_sprite.py <built>.png web/src/assets/<slug>-idle.png --warm-median 0.085
```

Two properties of this step are load-bearing and both were learned the hard way:

- **It runs after the build.** Grading the contact sheet first moves the background the builder keys against, and the row detector finds seven pose rows in a six-row sheet.
- **It scales uniformly rather than applying a ceiling.** A ceiling compresses the brightest pixels hardest, which on a Whelp is the too-bright core that is its whole board read.

The contact sheet stays ungraded, so a plain rebuild reintroduces whatever the grade fixed. That is caught rather than assumed — see Checks.

## 4. Declare

[`sheets.ts`](../../web/src/board/sheets.ts) is the single source of truth for what a sheet is:

```ts
export const FACING_ROWS = ['E', 'NE', 'NW', 'W', 'SW', 'SE']
export const IDLE_FRAMES = 4
export const IDLE_MS = 190
export function spriteFrame(facing, step) { /* facing * IDLE_FRAMES + wrapped step */ }
```

A sheet is one entry carrying `frameWidth`, `frameHeight`, `targetHeight`, and `footOffset`. Two of those deserve saying:

- **`targetHeight`, not a shared scale.** Each sheet is cropped to its own content, so a shared scale would size a piece by however much empty space its contact sheet happened to leave around it.
- **`footOffset`.** How far below the hex centre the base sits, so a piece stands on its tile instead of floating at its midpoint.

Because rows are facings and columns are the cycle, a frame is arithmetic rather than a lookup — which is the entire reason the build step reorders the artist's rows into the engine's.

## 5. Draw

`BoardScene` loads every sheet in `preload` and draws pieces through `placeSprite`, which returns false when a piece has no art so the caller falls back to the drawn token. Sprites are **retained objects in an otherwise immediate-mode renderer**: created on first sight, keyed by entity id, and reaped when their piece leaves the board.

### Where a piece sits

| Layer | Depth |
| --- | --- |
| Arena backdrop | `-1` |
| Tiles, tints, shadows | `0` |
| Pieces | `1 + footY / 10000` |
| Flames | `1.5` |
| Labels and floaters | `2` |

The origin is bottom-centre and the sprite is positioned at `y + footOffset`, so a piece stands on its tile rather than floating at its midpoint. Within the piece layer, depth is **where the piece stands**: further down the board is nearer the camera. Without that, a low wide Embermaw and the Hero in front of it take turns being on top according to which was created first.

Flames sit *above* pieces rather than below, which looks wrong until you notice that the ground a Hazard takes is usually ground somebody is standing on — Ash Trail burns the hex the claw struck, which is the hex the Tank is holding. Fire drawn behind that piece is fire nobody sees.

### What the scene sets each frame

- **Frame** — `spriteFrame(facing, idleStep(now))`. Rows are facings, columns are the cycle, so this is arithmetic rather than a lookup. Reduced motion pins it to the first frame: the cycle is Board Ambience, and ambience is what that setting turns off.
- **Scale** — `targetHeight / frameHeight`, multiplied by whatever motion is live. Each sheet is cropped to its own content, so a shared scale would size a piece by however much empty space its contact sheet happened to leave.
- **Position** — the resting point plus the effect's offset and the idle bob from `ambience.ts`, phased per piece. The cast shadow is drawn from the *resting* position and stays put, which is what reads as a lift rather than a slide.

### The two tints

A sprite is normally untinted — the sheet is the art. Two cases move it, and Phaser's tint **multiplies**, so white is the art as drawn.

**Board Feedback flash.** The tone of whatever landed, held for the effect's duration. The drawn token flashed by filling itself; a sheet takes the same tone as a tint, which reads on the armour without flattening it.

**The Boss going out.** `defeat.ts` runs buckle → vent → out, and the last stage walks the multiplier from white toward the scorched step, so the light goes out of the art itself instead of a dead colour being laid over it — every shape the sheet drew survives. The cooled body is a *state* rather than a beat: `checkResolution` ends the Encounter and leaves the body standing, so the scene reads the piece's health rather than the module's clock to keep it dark.

That second tint is the one place a runtime value moves a piece within the warm ordering, which this pipeline otherwise insists belongs to the PNG. It is safe because it only ever moves a piece **down**, and because the piece it moves has left the ordering: a defeated Boss is not a threat being ranked against the beats around it.

### Arrival and departure

A Minion does not fade in. `spawn.ts` breaks the hex and gives the piece up — the telegraph ring that has sat there for a Round closes inward onto the piece while splinters come up with it, then the piece swells past its own size and settles back. That inward ring is deliberately the opposite motion to the burn's ignition flare, which runs outward to take the whole tile: one is a hex being claimed, the other a hex delivering.

Departure is simpler. `reapSprites` destroys any sprite whose id is no longer on the board, so a removed piece takes its texture with it.

## Checks

**The Sprite Inspector** — debug rail, "Inspect sheets", on any build with the rail (`npm run dev`, or `?debug=1`). It lays every frame out in the engine's facing order with the direction each row should face, at board size, 1:1 or 2x, over a tile, a checker, or a pale ground. Facing errors and keying damage are a glance rather than an investigation, and it reaches facings no line of play can.

It enumerates the same `SHEETS` table the board draws from. That is deliberate: a debug view carrying its own copy of the frame size could show a sheet as correct while the game drew it wrong, which is the one failure that makes such a view worse than useless. Adding an entry gives it a button with no view code.

**The smoke suite** asserts, against the shipped bytes on every CI run:

- `every sprite sheet slices into 4 frames across 6 facings` — each PNG header against the table
- `the Sprite Inspector lays out 6 facings x 4 frames per sheet`
- `the Boss commands more warm presence than a Minion`
- `the Boss outranks a Minion per warm pixel too`
- `both telegraphs outrank the Boss sprite on screen`

The last three exist because sprites are the one thing on the board no token governs. The palette cannot correct them, so the pixels have to be right and something has to notice when they are not.

## Adding A Piece

1. Fill the slots in [board-sprite-sheets.md](../content/art-prompts/board-sprite-sheets.md), regenerate the composed prompts, and send one creature per fresh chat with the reference sheet attached.
2. Run the acceptance checks in that file — **facings first**.
3. Save to `assets/art/characters/<slug>/idle-contact-sheet.png` and build.
4. Open the Sprite Inspector and confirm all six rows, the loop, and the read at board size.
5. Add the entry to `sheets.ts`. The smoke and the Inspector pick it up with no further wiring.
6. If the piece sits wrong against the board's warm ranking, grade it and re-run the smoke.

## What This Shape Is Answering

Each rule above is a failure that actually happened:

- Elian's `W` row came back facing the same way as `E` — a piece that turned west without turning. Mirroring made it impossible.
- Embermaw's coral bridges the gutter between cells, so columns cannot always be found by looking for empty space. The builder cuts at the thinnest bridge and erases what crossed it.
- Mirrored facings were a pixel off true until odd padding learned to round toward the mirror.
- The Whelp shipped brighter than the Boss it ranks under, and no token could fix it.
- A frame size can drift from its file with nothing in the type system objecting, which is why the PNG header is checked rather than trusted.
