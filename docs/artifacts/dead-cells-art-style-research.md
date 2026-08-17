# Dead Cells Art Style Research: Board And Character Sprites

Date: 2026-08-17

Status: reference research. This document records how Dead Cells (Motion Twin / Evil Empire) produces its pixel-like look, and what of that approach could apply to **the Encounter Workbench's hex board and unit sprites** in `web/`. It is not an art-direction decision and it does not create canon. The committed art direction remains [hand-drawn-character-art-style.md](../content/hand-drawn-character-art-style.md) and [world-style-bible.md](../content/world-style-bible.md); see [Conflict With The Committed Direction](#conflict-with-the-committed-direction) before acting on anything here.

Scope is deliberately narrow: the **board surface and the character/unit sprites that stand on it**. The React + Tailwind UI chrome in `web/src/ui/**` is explicitly out of scope, and so is card art.

Implementation target is the **web build** (`web/`, package `encounter-workbench`: Phaser 3.90.0, React 19, Vite 7, Tailwind 4, TypeScript, Vitest, Playwright), chosen for iteration speed. The Godot project at the repo root also renders a hex board (`scripts/hex/`), but it is **out of scope for this research** and no Godot recommendations are made here.

## Research Access Limits

This session's egress proxy blocked direct page fetches for nearly every domain, and `curl` was blocked at the CONNECT layer for all hosts. `github.com` was reachable, which turned out to be enough — most of the primary sources for the implementation half live in public repositories. Consequences:

- **The reference video was NOT reachable.** `https://www.youtube.com/watch?v=iNDRre6q98g` returned `EGRESS_BLOCKED` for `www.youtube.com`. I did **not** watch it and I am not inventing its contents. What I could establish from search results is only its identity: it is titled *"Shaders Case Study — Dead Cells' Character Art Pipeline"*, published 9 September 2018 by **Dan Moran**, and its companion source code is the GitHub repo [Broxxar/PixelArtPipeline](https://github.com/Broxxar/PixelArtPipeline) ("An example project of how to render 3D characters as Toon-lit sprites — based on the character art pipeline of the popular game, Dead Cells"). That repo I *was* able to clone and read in full, so the video's technical substance is recoverable second-hand through its own published code. It is **community reconstruction by a third party, not a Motion Twin artifact**.
- Motion Twin's own write-ups (Game Developer / Gamasutra, the Dead Cells Tumblr, 80.lv, deepnight.net, heaps.io) were blocked at fetch. I could read them only through **search-engine summaries**. Quotations from them below are quotations of those summaries, not of the pages.
- **Phaser, MDN and Vite documentation were read from source**, by cloning `phaserjs/phaser` at tag `v3.90.0` (the exact version this repo pins), `mdn/content`, and `vitejs/vite`. Those claims are first-hand and cite file and line.

Every claim is tagged **[dev-stated]**, **[community]**, **[source-read]**, or **[inference]**.

## Sources Checked

Opened and read in full:

- [Broxxar/PixelArtPipeline (GitHub)](https://github.com/Broxxar/PixelArtPipeline) — `README.md`, `Assets/Shaders/ToonLitSprite.shader`, `Assets/Shaders/ViewSpaceNormal.shader`, `Assets/Scripts/AnimationCaptureHelper.cs`
- [phaserjs/phaser @ v3.90.0 (GitHub)](https://github.com/phaserjs/phaser/tree/v3.90.0) — `src/core/Config.js`, `src/scale/ScaleManager.js`, `src/scale/const/SCALE_MODE_CONST.js`, `src/scale/const/ZOOM_CONST.js`, `src/renderer/webgl/pipelines/LightPipeline.js`, `src/loader/filetypes/ImageFile.js`, `src/loader/filetypes/SpriteSheetFile.js`, `src/animations/Animation.js`
- [mdn/content — `image-rendering`](https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/properties/image-rendering/index.md) (published at [MDN: image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering))
- [mdn/content — `Window.devicePixelRatio`](https://github.com/mdn/content/blob/main/files/en-us/web/api/window/devicepixelratio/index.md) (published at [MDN: devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio))
- [vitejs/vite — Static Asset Handling guide](https://github.com/vitejs/vite/blob/main/docs/guide/assets.md) (published at [Vite: Static Asset Handling](https://vite.dev/guide/assets))

Reached only as search-result summaries (page fetch blocked — treat as second-hand):

- [Art Design Deep Dive: Using a 3D pipeline for 2D animation in Dead Cells — Thomas Vasseur, Game Developer (ex-Gamasutra)](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- [Art Design Deep Dive: Giving back colors to cryptic worlds in Dead Cells — Game Developer](https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-)
- [Dead Cells official Tumblr repost of the 3D-pipeline deep dive](https://deadcellsgame.tumblr.com/post/171052095628/art-design-deep-dive-using-a-3d-pipeline-for-2d)
- [Dead Cells: Using 3D Pipeline for 2D Animation (SudoNull translation of the deep dive)](https://sudonull.com/post/14066-Dead-Cells-Using-3D-Pipeline-for-2D-Animation)
- [Interview With the Developers of Dead Cells — 80.lv](https://80.lv/articles/interview-with-the-developers-of-dead-cells)
- [Case Study: Dead Cells' Character Art Pipeline — 80.lv](https://80.lv/articles/case-study-dead-cells-character-art-pipeline)
- [Dead Cells: A 3D Pipeline For 2D Animation — Game Anim](https://www.gameanim.com/2018/01/31/dead-cells-3d-pipeline-2d-animation/)
- [Shaders Case Study — Dead Cells' Character Art Pipeline (YouTube, the user-supplied reference)](https://www.youtube.com/watch?v=iNDRre6q98g) — **blocked, not watched**
- [GDC Vault — 'Dead Cells': What the F*n!? (Sébastien Bénard, GDC 2019)](https://www.gdcvault.com/play/1025788/-Dead-Cells-What-the) — design/game-feel talk, not an art-pipeline talk
- [Deepnight Games — Dead Cells project page (Sébastien Bénard)](https://deepnight.net/games/motion-twin/dead-cells/)
- [Heaps.io — About](https://heaps.io/about.html)
- [Exploring 3D Pixel Art in Blender 4.2 — Blender Studio](https://studio.blender.org/blog/3d-pixel-art-in-blender/)

Repo files read for grounding: `web/package.json`, `web/vite.config.ts`, `web/README.md`, `web/src/board/layout.ts`, `web/src/board/PhaserBoard.tsx`, `web/src/board/BoardScene.ts`, `web/src/board/effects.ts`, `web/src/engine/hex.ts`, `assets/README.md`, `docs/content/hand-drawn-character-art-style.md`, `docs/content/world-style-bible.md`, `docs/content/art-prompts/board-and-tiles.md`, `docs/content/art-prompts/_tools.md`.

## What The Style Actually Is

### The core technique

Dead Cells does not hand-place its pixels. Its characters are **3D models, animated on a rig, rendered offline at a very small pixel size with filtering and anti-aliasing switched off, and baked into 2D sprite sheets**. The game then draws ordinary sprites.

The reason was production capacity, not aesthetics. Thomas Vasseur was the sole artist on the game for roughly a year, covering art direction, characters, monsters, animation, VFX, and backgrounds, until Gwenael Massé joined **[dev-stated, via summary]**. The stated motivation is blunt: *"To make up for the lack of bandwidth and still deliver on quality, we had to find a pipeline that could give us great looking pixel art, without having to hand draw each and every retake"* **[dev-stated, quoting a search summary of the Game Developer deep dive]**.

The reported sequence **[dev-stated, via summary of the deep dive and its SudoNull translation]**:

1. Draw a **basic 2D pixel-art model sheet** first, by hand. The pixel design leads; the 3D serves it.
2. Build the character and its skeleton in **3DS Max** from that sheet, export as FBX.
3. Animate on the rig with keyframes.
4. Render each frame with a **homebrew tool that draws the mesh at very small size with no smoothing / no anti-aliasing**, which is what produces the pixel read.
5. Export **each frame as a PNG plus a matching normal map**, so the engine can relight the flat sprite with a simple toon shader.

Two consequences the devs call out explicitly **[dev-stated, via summary]**: animations can be revised by moving keyframes rather than redrawing a sequence, and **3D assets get reused across characters** — described as saving hundreds of hours.

### The resolution choice, and why it matters

The playable character is reported at roughly **50 pixels tall** **[dev-stated, via summary]**. The deep dive frames this as the counter-intuitive part: at 50 px a 3D pipeline looks like absurd overkill, and it only pays off because of animation volume and asset reuse.

That number is the most portable fact in this document. It says that **a character can carry full personality, silhouette, and readable armour at ~50 px of occupied height** — provided the silhouette and the palette do the work.

### Not "true" pixel art, and the tradeoff

There is a persistent community argument that Dead Cells is not pixel art, on the grounds that pixel art means pixels placed deliberately by hand **[community]**. The more precise and more useful version: the sprites are *real sprites* baked from 3D rather than a pixelation post-filter over a live 3D scene, which is meaningfully different from "3D with a pixel shader" — but the pixel placement is still an artefact of a downsample, not an authored decision **[community]**.

The practical tell of this tradeoff is **pixel-density drift**: shapes carry pixel clusters no pixel artist would place, edges alias inconsistently between frames, and detail density varies with how much of the mesh happened to land in a given cell. Hand-touching the output afterwards closes that gap; how much Motion Twin did is not something I could verify **[inference]**.

### Lighting and rim light

Dead Cells relights its flat sprites at runtime rather than baking all light into them. Backgrounds and decorations were painted in Photoshop and then **redrawn as normal maps**, feeding a dynamic lighting system that produces varied tints and relief **[dev-stated, via 80.lv summary]**. Characters get their normal map for free from the 3D render pass **[dev-stated, via summary]**.

The community reconstruction gives concrete mechanics **[community — read directly in `Broxxar/PixelArtPipeline`]**:

- `ViewSpaceNormal.shader` renders the mesh's **view-space normal**, encoded `normal * 0.5 + 0.5`, into a second capture pass. The normal map is generated by re-rendering the same frame with a replacement shader — not painted.
- `ToonLitSprite.shader` samples diffuse and normal, reconstructs the world normal from the sprite quad's tangent basis, then applies a **hard two-tone step**: `saturate(dot(N, lightDir)) > 0.3 ? lightColor : ambientSky`. One threshold, two values. That is the entire toon model — not a gradient ramp.
- `AnimationCaptureHelper.cs` bakes at `filterMode = Point`, `antiAliasing = 1` (off), into an ARGB32 atlas capped at 4096², default cell `100×100`, default `30` fps capture, laid out in a square-ish grid. The diffuse atlas and the normal atlas are produced in the same loop from the same camera, guaranteeing per-pixel registration.

The design lesson: **consistency of lighting across a whole cast comes from lighting them all with the same scene light at runtime**, not from an artist remembering where the sun was. Rim light in Dead Cells reads as a deliberate silhouette-separation device — a bright edge on the side away from the key, lifting a dark character off a dark background — but I found no first-party statement specifically about rim light **[inference]**.

### Palette, contrast, readability

The art direction rests on three stated pillars: **a saturated colour palette, Celtic architecture, and the theme of alchemy** **[dev-stated, via summary of "Giving back colors to cryptic worlds"]**.

The saturation is justified functionally, not decoratively: *"Saturated backgrounds and characters really shine when it comes to keeping the player awake and alert, drawing the attention of the eye to any new element appearing on the screen, which leads the player to have a better understanding of the action and consequently a faster reaction time"* **[dev-stated, quoting a search summary]**. Contrast is used as an authored beat — the opening scene is described as the character rising in warm light while a fallen giant lies in cold shadow **[dev-stated, via summary]**.

Two reusable rules fall out:

- **Colour is a targeting aid.** Anything new or dangerous on screen gets a hue and saturation nothing else on screen is using.
- **Warm/cold is the primary separation axis**, applied at the scene level rather than per asset.

### Animation approach

**[dev-stated, via summary]** Animations are keyframed: get the pose sequence convincing with **as few frames as possible**, then add interpolated in-betweens. Attack animations are explicitly **pose-to-pose**, with **VFX supplying the sense of movement, strength, and power** rather than the character animation carrying it alone.

That last point is the one most often missed when copying this look. The impact in Dead Cells is largely *not* in the character sprite — it is in the particle and effect layer sitting on top of a small number of strong poses. The 3D source helps because in-betweens are free, retakes are cheap, and a rig can be re-posed instead of redrawn.

## Which Parts Transfer To A Board And Character Sprites

The Workbench board is a portrait-first, turn-based hex surface. `BoardScene.ts` draws every tile and every entity with a single `Phaser.GameObjects.Graphics` layer — filled polygons for hexes, `fillCircle` for units (radius `22` boss / `16` hero / `12` minion), plus `Phaser.GameObjects.Text` labels. **There are no sprites in the board today at all.** That is a clean starting point, and it also means the entire recommendation is additive rather than a migration.

### Transfers well

- **The ~50 px character budget.** A turn-based board shows fewer units, larger, and for longer. If Dead Cells carries a hero at 50 px under a fast scrolling camera, a static piece on a hex is comfortable at a similar budget. **[inference]**
- **Silhouette-first design.** Board pieces are read at a glance against a textured tile, often overlapping neighbours. Silhouette is the whole game. This is also what the committed direction already demands — "a player can recognize the Hero and role at small size" ([hand-drawn-character-art-style.md](../content/hand-drawn-character-art-style.md)).
- **Saturation-as-signal and warm/cold separation.** A tactics board has strictly more state to communicate than a platformer — telegraphs, hazards, legal moves, guided moves, targeting, ownership. `BoardScene.ts` already encodes exactly that as a fixed colour table (`BREATH_OVERLAY`, `BROOD_OVERLAY`, `MOVE_OVERLAY`, `GUIDED_STROKE`, `TARGET_STROKE`, `SCORCHED_FILL`). Reserving saturation for actionable state and keeping the base board desaturated is the same rule Dead Cells uses for enemies, and the existing palette is already close to it.
- **Runtime-relit sprites via normal maps.** A board has one lighting environment, no scrolling, no per-level relight. One key plus one rim, applied to every unit, guarantees a cast looks like one set even when sprites are produced weeks apart. This is arguably a *better* fit for a board than for a platformer — though see the honest cost assessment below. **[inference]**
- **The downsample discipline.** [board-and-tiles.md](../content/art-prompts/board-and-tiles.md) already prescribes "generate at 4× or more and downsample" for tiles. The Dead Cells pipeline is the same instinct with a 3D source instead of a generator.
- **Pose-to-pose plus VFX for impact.** Turn-based combat resolves in discrete beats, and `effects.ts` already models them as a typed vocabulary — `strike`, `cast`, `hit`, `block`, `move`, `spawn`, `defeat`, `blast`, `scorch`, `turn` — each with a duration in the 280–560 ms range. Three strong poses plus a good hit effect will out-read a twelve-frame smooth swing at a fraction of the cost, and the effect layer to hang them on already exists.
- **Multi-facing, which is a stronger argument here than in Dead Cells.** The board carries per-entity `facing` over six hex edges (`facingName`, `facingAngleFor`, and the `turn` effect in `effects.ts`). Hand-authoring six directional sets per unit per animation is brutal; rendering the same rig from six camera yaws is a loop parameter. If any single technical argument justifies a 3D-source pipeline for *this* project, it is this one, and it is an argument Dead Cells itself never had to make. **[inference]**

### Does not transfer

- **Smears, anticipation frames, and motion blur.** These sell continuous high-speed motion under direct player input. A piece that steps one hex per turn does not need them and they will read as sloppy.
- **Parallax platformer backgrounds.** The Workbench board is `transparent: true` over a React-composed page; there is no scrolling depth layer and no counterpart to Dead Cells' layered background work.
- **Run cycles and locomotion economics.** The animation volume that made Motion Twin's tooling investment pay off is largely locomotion and combo strings. A board unit needs idle, move, attack, hurt, die — five short clips.
- **The 50 px choice's *reason*.** Dead Cells picked its density for a scrolling camera at 1080p on a TV. This targets a ~390 CSS-px-wide portrait viewport on a high-DPI phone or an iPad, held at arm's length. The number is a useful anchor; the reasoning behind it is not directly importable. **[inference]**
- **Whole-screen pixel treatment.** Dead Cells is pixel art everywhere. Here the mandate is board plus sprites only, with the React/Tailwind chrome excluded — which forces a boundary Dead Cells never needed. Fortunately the Workbench's architecture already draws that boundary: the Phaser canvas is a discrete DOM element mounted by `PhaserBoard.tsx`, so pixel-art treatment applies to exactly one element and nothing leaks into the HUD.

## A Concrete Production Pipeline

Three viable shapes. Not exclusive; the third is the realistic one.

### Option A — Full 3D-source pipeline (the Dead Cells shape)

1. **Author a pixel model sheet first.** Front, side, 3/4 at the final target resolution, by hand or derived from existing concept art (`assets/art/concepts/elian-voss/`). This is not optional in the original pipeline and should not be skipped: it is what keeps the 3D from drifting into render-polish territory.
2. **Model and rig in Blender** — the free equivalent of Motion Twin's 3DS Max, and the tool with the best-documented low-res render story ([Exploring 3D Pixel Art in Blender 4.2](https://studio.blender.org/blog/3d-pixel-art-in-blender/) covers disabling viewport AA and rendering at raw pixel size). *Tradeoff:* a rig is a real up-front cost that only pays back across many clips and many facings.
3. **Render passes: orthographic camera, AA off, filter size 0.** Two passes per frame — **diffuse/albedo with flat toon shading**, and **view-space normals** (a compositor Normal AOV, or the replacement-shader trick the `PixelArtPipeline` reconstruction uses). Render at *exactly* the target sprite size; do not render large and shrink, or you re-introduce the anti-aliasing you just removed. *Tradeoff:* no supersampling safety net — a mis-framed camera wastes the whole batch.
4. **Six yaws per clip**, driven by a script loop over camera rotation. This is where the pipeline earns its keep here.
5. **Palette quantize** every frame against one shared palette.
6. **Pack to sheets** — one diffuse atlas and one normal atlas per unit on an identical cell grid, so a single frame index addresses both. Phaser's spritesheet loader wants a uniform `frameWidth`/`frameHeight` grid, which matches this exactly.
7. **Hand-touch** the frames that matter most: idle frame 1, the attack contact pose, the death pose. Aseprite or any indexed-colour editor. This step converts "downsampled 3D" into something a pixel artist would sign.

### Option B — Hand-authored pixel art

Straightforward, and for five clips across two or three units it may simply be cheaper. *Tradeoff:* six facings kills it — every extra facing is a linear cost with no reuse, and cross-unit lighting consistency becomes a discipline problem rather than a solved one. Mitigate by dropping to **three facings plus horizontal mirroring**. The board's pointy-top hex layout has six edge directions that mirror cleanly about the vertical axis (E↔W, NE↔NW, SE↔SW), so three authored sets cover all six with a `setFlipX(true)`.

### Option C — Hybrid (recommended shape to evaluate first)

Author or generate at **4× the target resolution as flat cel-shaded 2D** — exactly what [_tools.md](../content/art-prompts/_tools.md) and [board-and-tiles.md](../content/art-prompts/board-and-tiles.md) already prescribe for tiles — then:

- downsample with **nearest or box, never bicubic**,
- **quantize to a locked palette**,
- **hand-touch the silhouette edge**,
- **bake the key and rim light into the sprite** rather than shipping normal maps (see the Phaser lighting assessment below, which recommends this),
- animate pose-to-pose with 3–5 frames per clip and let the existing `effects.ts` layer carry impact.

This gets most of the Dead Cells *read* — consistent lighting, chunky pixels, saturated readable silhouettes — with no rig, no render farm, no custom tooling, and no second texture per frame. It only loses the cheap-facings advantage.

### Getting consistent lighting across many sprites

Two mechanisms:

1. **Bake the same key light into every sprite.** One fixed light direction, written into the art prompt or the Blender scene, never varied per unit. A useful convention that matches the board's existing drop shadow (`graphics.fillCircle(x + 2, y + 3, radius)` in `BoardScene.ts`): **key from upper-left, rim from lower-right.**
2. **Relight at runtime from normal maps.** Phaser can do this; whether it is worth it here is assessed below. Its advantage is that a sprite added six months later matches automatically.

### Palette quantization tooling

- **Aseprite** — indexed mode with a locked palette; also the right place for hand-touching. Best fidelity, manual.
- **ImageMagick** `-remap palette.png -dither None` — scriptable, batch-friendly, exact. Good default pipeline step.
- **`pngquant` / libimagequant** — excellent quantizer, but it *chooses* the palette. Use it to derive an initial palette, not to enforce a locked one.
- **A Phaser post-FX palette-snap shader** — cheap and requires no asset changes, but it quantizes the composite including anti-aliased edges, and does not fix pixel-density drift. Useful as a diagnostic, not as the pipeline.

Lock the palette once, in one file under `assets/art/`, and treat drift from it as a bug.

## Hex Geometry Versus A Pixel Grid

This is the constraint that makes a hex board genuinely harder to pixel than a square-tile board, and it deserves a direct answer rather than a warning.

### The problem

`web/src/board/layout.ts` uses pointy-top hexes with `HEX_SIZE = 36` (circumradius) and

```
x = BOARD_CENTER_X + HEX_SIZE * (√3·q + (√3/2)·r)
y = BOARD_CENTER_Y + HEX_SIZE * 1.5·r
```

So the current metrics are: hex width `√3 · 36 ≈ 62.35`, hex height `2 · 36 = 72`, column step `≈ 62.35`, row step `54`, odd-row offset `≈ 31.18`.

**`√3` is irrational, so a mathematically exact hex grid can never land on integer pixel boundaries in both axes.** Every tile centre after the first is at a fractional coordinate, which means every tile sprite and every unit sprite gets drawn at a sub-pixel offset. On a pixel-art board that shows up as tiles whose shared edges are one pixel thick in some places and two in others, and as units that shimmer by a pixel when they move between hexes.

A second, separate issue: **hex edges are diagonals, and diagonals stair-step.** At small sizes the 30°/60° edges of a pointy-top hex quantize into visible steps. This is not a bug to be fixed, it is a thing to be *authored* — the stair-step pattern must be drawn deliberately and identically on every tile so the tiling reads as a lattice rather than as noise.

### The fix

**Stop deriving hex geometry from `√3` at runtime and start deriving it from an authored integer tile.** Concretely:

1. Pick an integer hex height `H` divisible by 4 (so the row step `0.75·H` is an integer) and an integer width `W` that is even (so the odd-row offset `W/2` is an integer).
2. Choose `W` as the nearest even integer to `H · √3/2 ≈ 0.866·H`. A 1–2% squash or stretch is invisible and is standard pixel-art hex practice.
3. Replace `axialToPixel` with integer arithmetic: `x = COL_STEP·q + (COL_STEP/2)·r`, `y = ROW_STEP·r`, where `COL_STEP = W` and `ROW_STEP = 0.75·H`. Every tile centre is then an exact integer in art space.
4. Invert it exactly in `pixelToAxial` — the existing `cubeRound` logic still applies, only the scaling constants change.
5. **Author the hex tile art once, at exactly `W×H`, with the stair-stepping drawn by hand**, and let every tile be a copy of that sprite rather than a `fillPolygon`. This is what makes the lattice look intentional.

Candidate integer hexes (pointy-top):

| `H` | `W` | Row step (`0.75·H`) | Col step (`W`) | Odd-row offset (`W/2`) | `W/H` vs ideal `0.866` |
| --- | --- | --- | --- | --- | --- |
| `32` | `28` | `24` | `28` | `14` | `0.875` (+1.0%) |
| `40` | `34` | `30` | `34` | `17` | `0.850` (−1.8%) |
| `48` | `42` | `36` | `42` | `21` | `0.875` (+1.0%) |

Note the current `BoardScene.fillHex()` insets by 2–7 px for the various overlay rings (`HEX_SIZE - 2`, `- 4`, `- 6`, `- 7`). On a 32–48 px art hex those insets become 1–2 art pixels. Overlay rings should become **authored 1 px and 2 px inset ring sprites**, tinted at runtime, rather than geometric insets — otherwise they will collapse or disappear entirely.

## Web Implementation Notes (Phaser 3.90 + Vite)

All Phaser claims below are **[source-read]** from the cloned `v3.90.0` tag, with file and line. The published API docs are at [docs.phaser.io](https://docs.phaser.io) (blocked in this session).

### 1. Renderer config for crisp pixels

`src/core/Config.js` defines the relevant flags:

| Flag | Default | Source | Behaviour |
| --- | --- | --- | --- |
| `render.antialias` | `true` | `Config.js:376` | *"When set to `false`, WebGL uses nearest-neighbor interpolation, giving a crisper appearance. `false` also disables antialiasing of the game canvas itself, if the browser supports it, when the game canvas is scaled."* |
| `render.antialiasGL` | `true` | `Config.js:381` | Sets `antialias` on WebGL context creation only. |
| `render.roundPixels` | `false` | `Config.js:396` | *"Draw texture-based Game Objects at only whole-integer positions. **Game Objects without textures, like Graphics, ignore this property.**"* |
| `render.pixelArt` | `zoom !== 1` | `Config.js:401` | Convenience flag. |
| `render.maxLights` | `10` | `Config.js:453` | Max lights in range of one camera. |
| `scale.zoom` | `1` | `Config.js:67` | Canvas zoom multiplier. |
| `scale.autoRound` | `false` | `Config.js:87` | Floors canvas and CSS sizes. |

`Config.js:403–407` shows `pixelArt: true` is exactly a shorthand that sets `antialias = false`, `antialiasGL = false`, `roundPixels = true`. Setting it is the single highest-value change.

**The critical caveat, straight from the `roundPixels` doc comment: Graphics objects ignore it.** `BoardScene` currently draws *everything* through one `Graphics` layer, so adding `pixelArt: true` today changes essentially nothing. It only starts mattering once tiles and units become textured `Sprite`/`Image` objects. Any plan that keeps `Graphics` for the board and expects pixel snapping is broken from the start.

Phaser 3 has **no `resolution` config property** — grepping `Config.js` for `resolution` returns nothing. The canvas backing store is sized in CSS pixels, and the browser compositor handles the device-pixel upscale. That is why the CSS-side handling in section 3 is mandatory rather than optional.

### 2. Scale mode and holding an integer scale factor

`src/scale/const/SCALE_MODE_CONST.js` defines `NONE: 0`, `WIDTH_CONTROLS_HEIGHT: 1`, `HEIGHT_CONTROLS_WIDTH: 2`, `FIT: 3`, `ENVELOP: 4`, `RESIZE: 5`, `EXPAND: 6`.

`PhaserBoard.tsx` currently uses `Phaser.Scale.FIT` with `width: BOARD_WIDTH (380)`, `height: BOARD_HEIGHT (400)`. Reading the FIT branch of `ScaleManager.updateScale()` (`ScaleManager.js:1100–1147`), FIT computes `styleWidth`/`styleHeight` from a floating-point ratio and writes them straight into `style.width`/`style.height`. **FIT produces a fractional CSS scale**, which is precisely what destroys square pixels: some art pixels get 2 device pixels and their neighbours get 3, and the pattern shifts as the container resizes.

`RESIZE` is worse for this purpose — it resizes the *game size* to match the parent, so the art resolution itself becomes variable.

The right mechanism is already in Phaser. `src/scale/const/ZOOM_CONST.js` defines `MAX_ZOOM: -1` — *"Calculate the zoom value based on the maximum multiplied game size that will fit into the parent."* Its implementation (`ScaleManager.js:1184`) is:

```js
getMaxZoom: function () {
    var zoomH = SnapFloor(this.parentSize.width,  this.gameSize.width,  0, true);
    var zoomV = SnapFloor(this.parentSize.height, this.gameSize.height, 0, true);
    return Math.max(Math.min(zoomH, zoomV), 1);
}
```

That is a floor to an **integer** multiple in both axes, clamped to at least 1. Paired with `Scale.NONE`, whose branch (`ScaleManager.js:1044–1060`) sets the canvas CSS size to exactly `gameSize × zoom`, this gives an exact integer scale with no fractional CSS anywhere.

Recommended config shape:

```ts
scale: {
  mode: Phaser.Scale.NONE,
  zoom: Phaser.Scale.Zoom.MAX_ZOOM,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  autoRound: true,
  width: ART_BOARD_WIDTH,   // art-space pixels, see the table below
  height: ART_BOARD_HEIGHT,
},
render: { pixelArt: true },
```

`Scale.NONE` does not recompute on parent resize, so the container's `ResizeObserver` must call `game.scale.setMaxZoom()` (`ScaleManager.js:912`, which sets `this.zoom = this.getMaxZoom()` and flags `_resetZoom`). `PhaserBoard.tsx` already has a `useEffect` owning the game lifecycle, which is the place for it.

**When the viewport does not divide evenly** — which is most of the time — there are three options, and the honest ranking is:

1. **Letterbox (recommended).** Integer zoom plus `CENTER_BOTH` leaves slack around the canvas. On this board that slack is invisible: the game config already sets `transparent: true`, so unused space simply shows the React page behind it. This is the cheapest correct answer and it costs nothing visually.
2. **Non-integer scale.** Correct layout, wrong pixels. Reject.
3. **Push the remainder into CSS.** Render at integer zoom, then let CSS stretch the canvas the last few percent. This reintroduces fractional scaling with extra steps. Reject.

The one real cost of option 1 is that the board's on-screen size becomes quantised: on a narrow phone it may only reach `×2` where `FIT` would have given `×2.4`. That is a **product tradeoff, not a rendering detail** — the board gets slightly smaller in exchange for crisp pixels — and it should go to PM rather than be decided silently in the renderer.

Also note `PhaserBoard.tsx` inverts the canvas scale for hit-testing:

```ts
const scale = bounds.width / BOARD_WIDTH
const coords = pixelToAxial((event.clientX - bounds.left) / scale, (event.clientY - bounds.top) / scale)
```

This already reads the measured canvas rather than the container, so it keeps working under integer zoom unchanged. That is a genuinely lucky bit of existing design.

### 3. devicePixelRatio and the CSS side

MDN defines `devicePixelRatio` as *"the ratio of the resolution in physical pixels to the resolution in CSS pixels for the current display device"*, notes it is a **double-precision floating-point value** (so fractional ratios are normal), that HiDPI displays give `2`, and that *"modern mobile devices often yield a `devicePixelRatio` value greater than 2"* **[source-read, `mdn/content` `Window/devicePixelRatio`]**.

Since Phaser 3 has no `resolution` setting, a canvas sized `340 × 320` CSS px on a DPR-2 phone is composited to `680 × 640` device pixels by the browser, using its default smoothing. Without a CSS instruction that upscale is bilinear, and every gain from `pixelArt: true` is thrown away in the last step.

MDN's `image-rendering` definitions **[source-read, `mdn/content` `Web/CSS/Reference/Properties/image-rendering`]**:

- `crisp-edges` — *"The image is scaled with an algorithm such as 'nearest neighbor' that preserves contrast and edges in the image. Generally intended for images such as pixel art or line drawings, no blurring or color smoothing occurs."*
- `pixelated` — *"The image is scaled with the 'nearest neighbor' or similar algorithm to the nearest integer multiple of the original image size, **then uses smooth interpolation to bring the image to the final desired size**."*

That distinction is the important limit and it is usually misreported. **`pixelated` is not purely nearest-neighbour at fractional scale** — it goes nearest to the nearest integer multiple and then smooths the remainder. At DPR exactly `2` or `3` there is no remainder and `pixelated` is exact. At a fractional DPR (`1.5`, `2.625`, and other common Android values) `pixelated` will apply a smoothing pass. `crisp-edges` promises no blurring at any scale, at the cost of historically weaker and less consistent browser support.

Practical recommendation: put both on the canvas, ordered so `crisp-edges` wins where supported and `pixelated` is the fallback, and set it on the canvas element that `PhaserBoard.tsx` mounts (Tailwind 4 can carry it as an arbitrary property, or it can live in `index.css` scoped to the board container):

```css
.board-canvas canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
```

Note MDN's scoping: the property *"applies to an element itself, to any images set in its other properties, and to its descendants"*, and it *"has no effect on non-scaled images."* Scoping it to the board container therefore leaves the whole React/Tailwind chrome untouched, which is exactly the boundary this research is required to respect.

### 4. Sub-pixel jitter and snapping entity positions

There is no scrolling camera here — the board is static and entities move between fixed hexes — so classic camera jitter does not apply. The jitter that *does* apply comes from two places:

1. **Fractional hex centres**, addressed by the integer-hex change above. Without it, no amount of `roundPixels` helps, because the positions are fractional before rounding and the rounding direction flips as values cross `.5`.
2. **Tweened motion between hexes.** `BoardScene` computes per-entity `Motion` offsets (`dx`, `dy`, `scale`) and applies them as floats — the `move` effect eases `dx`/`dy` over 280 ms, and `strike`/`spawn` apply `motion.scale` multipliers. Under `pixelArt: true`, `roundPixels` will snap textured sprites to integers automatically, which is correct and desirable: an 8-frame stepped slide reads as intentional pixel-art motion where a smooth sub-pixel slide reads as blur.

The one thing to actively change: **`motion.scale` must go.** Non-integer scaling of a pixel sprite resamples it, which is the same defect as fractional canvas zoom applied per-object. Replace the `×1.15` spawn pop and the `1 + 0.2·sin` strike pulse with either a discrete two-frame squash in the sprite sheet, or a brightness/tint flash — `motion.flash` and `motion.flashColor` already exist and are resolution-independent.

Text labels (`fontSize: '15px'`, `'10px'`, `'9px'` monospace in `BoardScene`) are a separate problem: at art resolution, 15 px becomes 15 *art* pixels, which is enormous, and at `×2` it is a blurry upscaled font. Damage numbers, facing names, and coordinate labels should move out of the Phaser scene into the React layer above the canvas, or use a bitmap font authored at the art resolution. Given the mandate excludes UI chrome, **moving them to React is the cleaner answer** and it shrinks the pixel-art surface to exactly the board and the units.

### 5. Sprite sheets, atlases and animations

Phaser's spritesheet loader takes a uniform grid:

```ts
this.load.spritesheet('hero', heroUrl, { frameWidth: 40, frameHeight: 44 })
```

and animations are declared once and played by key:

```ts
this.anims.create({
  key: 'hero-idle-e',
  frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 3 }),
  frameRate: 8,
  repeat: -1,
})
sprite.play('hero-idle-e')
```

`Animation.js:95` reads `frameRate` from the config, and `Animation.js:255–257` notes that when neither `duration` nor `frameRate` is given it falls back to a **default of 24 fps** — far too fast for pose-to-pose board animation. Always set `frameRate` explicitly; `6–10` fps suits the Dead Cells pose-to-pose approach and matches the 280–560 ms effect durations already in `EFFECT_DURATION`.

Suggested key convention, since the board is facing-aware: **`<unit>-<clip>-<facing>`**, e.g. `hero-attack-ne`. With three authored facings plus mirroring (Option B/C), resolve `w`/`sw`/`nw` to the mirrored `e`/`se`/`ne` clip plus `sprite.setFlipX(true)`. `facingName()` from `@/engine` already produces the facing token, so key construction is a one-line helper.

Atlas format choice: **a plain uniform-grid spritesheet is preferable to a packed JSON atlas here.** Packed atlases trim transparent margins per frame, which makes each frame's origin differ, which fights the fixed foot-anchor a board piece needs. A uniform grid wastes some texture space and keeps every frame's anchor identical. At these resolutions the wasted space is trivial.

### 6. Dynamic lighting and rim light — and whether it is worth it

Phaser does support this properly. `src/renderer/webgl/pipelines/LightPipeline.js` is *"an extension of the Multi Pipeline [using] a custom shader designed to handle forward diffused rendering of 2D lights in a Scene… works in tandem with Light Game Objects, and optionally texture normal maps"*, with uniforms including `uMainSampler`, `uNormSampler`, and `uAmbientLightColor`. `maxLights` defaults to `10` (`Config.js:453`).

Normal maps load with no extra tooling — `ImageFile.js:292–309` documents *"the automatic loading of associated normal maps… by providing an array as the `url` where the second element is the normal map"*, and `SpriteSheetFile.js:157–158` says the same for spritesheets. So:

```ts
this.load.spritesheet('hero', [heroUrl, heroNormalUrl], { frameWidth: 40, frameHeight: 44 })
// ...
this.lights.enable().setAmbientColor(0x404050)
this.lights.addLight(x, y, 400).setColor(0xfff0d0).setIntensity(1.2)  // key
sprite.setPipeline('Light2D')
```

**Recommendation: do not use it for this board. Bake the lighting into the sprites instead.** **[inference]** The reasoning:

- The board has **one fixed lighting environment and no camera movement**. Every benefit of runtime relighting — light sources moving through a level, a torch passing a wall, day/night — is absent. The lights would be static, which means the result is a value that could have been computed once, offline, at build time.
- It **doubles the asset count and the download**, on a build deployed to GitHub Pages and opened on an iPad over a phone connection (`web/README.md`).
- It adds a **hard correctness constraint forever**: the normal atlas must stay pixel-registered with the diffuse atlas through every future retouch. Any hand-touch of the diffuse that is not mirrored in the normal produces lighting that visibly peels off the silhouette. Given that hand-touching is explicitly part of the pipeline, this constraint bites immediately.
- `setPipeline('Light2D')` is per-Game-Object, so mixing lit units with unlit tiles is possible but means two rendering paths to reason about.

The one scenario that flips this: **if a lighting *effect* becomes a gameplay signal** — a boss telegraph that actually casts coloured light across the tiles it will hit, an ember hazard that glows on adjacent hexes. That is a real design idea and Light2D would be the right tool for it. It is worth revisiting if and when such a mechanic is proposed; it is not worth building speculatively.

For rim light specifically, baking is not a compromise: a rim is a fixed, authored edge highlight and is arguably *better* hand-placed at these resolutions than derived from a 40-px-tall normal map, where a one-pixel error in the normal moves the rim by a quarter of the character's width.

### 7. Asset pipeline through Vite

`web/vite.config.ts` sets `base: process.env.VITE_BASE ?? '/'` for the GitHub Pages deploy, an `@` → `src` alias, and allows `server.fs` access to the repo root (for `data/`).

Two placement options, from the [Vite static asset guide](https://github.com/vitejs/vite/blob/main/docs/guide/assets.md) **[source-read]**:

- **Imported assets (recommended for sprite sheets).** `import heroUrl from '@/assets/hero.png'` resolves to `/src/assets/hero.png` in dev and `/assets/hero.2d8efhg.png` in the build. The guide notes referenced assets *"are included as part of the build assets graph, will get hashed file names, and can be processed by plugins."* Content hashing is what you want for cache-busting a sprite sheet that will be re-exported repeatedly. Pass the imported URL straight into `this.load.spritesheet()` — never a hardcoded string, which would break under `VITE_BASE`.
- **`public/`** — *"Assets in this directory will be served at root path `/` during dev, and copied to the root of the dist directory as-is."* Use this only for assets that must keep an exact filename. For sprite sheets it forfeits hashing and forces manual `import.meta.env.BASE_URL` prefixing. Not recommended here.

One real hazard: *"Assets smaller in bytes than the `assetsInlineLimit` option will be inlined as base64 data URLs."* The default limit is 4 KiB. A small palette-quantized PNG — a single hex tile, an overlay ring, a two-frame icon — can easily fall under that and become a data URI. Phaser loads data URIs fine, but inlining bloats the JS bundle and defeats HTTP caching for assets that will change often. Mark sprite sheets `?no-inline` (documented in the same guide) or raise `build.assetsInlineLimit`.

Finally: **nearest-neighbour is not a property of the file and Vite cannot damage it.** Vite copies and hashes PNGs byte-for-byte; it does not resample. Crispness is entirely a function of the Phaser render flags (section 1) and the CSS on the canvas (section 3). The only build-side risk is an image-optimising plugin being added later — if one is ever introduced, it must be configured lossless, or it will quietly re-encode and dither the palette.

**TypeScript note:** the Vite guide warns that *"TypeScript, by default, does not recognize static asset imports as valid modules"* and the fix is including `vite/client` types. `web/tsconfig.json` should be checked for this before the first sprite import lands.

## Pixel-Scale Decisions

### Current measurements

| Surface | Metric | Value |
| --- | --- | --- |
| Board space (`layout.ts`) | `BOARD_WIDTH × BOARD_HEIGHT` | `380 × 400` |
| Hex | orientation | pointy-top |
| Hex | `HEX_SIZE` (circumradius) | `36` |
| Hex | width / height | `≈62.35 / 72` |
| Hex | column step / row step / row offset | `≈62.35 / 54 / ≈31.18` |
| Board | radius | `2` → 19 hexes, content extent `≈312 × 288` |
| Entity radii | boss / hero / minion | `22 / 16 / 12` |
| Canvas scaling | mode | `Phaser.Scale.FIT` (fractional) |

### Recommendation

**[inference — reasoning from the measurements above and the 50 px Dead Cells anchor, not a sourced claim]**

Author on a small integer hex grid and display at an integer zoom of `2` or `3`, using the integer-hex scheme from the geometry section. Board extents for radius 2 are `4 × colStep + W` wide and `4 × rowStep + H` tall:

| Art hex `W × H` | Col / row step | Board art size | at `×2` | at `×3` | Fits `380 × 400`? |
| --- | --- | --- | --- | --- | --- |
| `28 × 32` | `28 / 24` | `140 × 128` | `280 × 256` | `420 × 384` | `×2` yes, `×3` too wide |
| `34 × 40` | `34 / 30` | `170 × 160` | `340 × 320` | `510 × 480` | `×2` yes, `×3` no |
| `42 × 48` | `42 / 36` | `210 × 192` | `420 × 384` | — | `×2` too wide |

**Recommended: `34 × 40` art hexes at `×2`.** The board renders at `340 × 320`, sitting inside the existing `380 × 400` box with 40 px horizontal and 80 px vertical slack — the vertical slack is exactly what sprites overhanging their tiles need. Set the Phaser game size to the *art* size (`170 × 160`) and let `Zoom.MAX_ZOOM` pick `2` on a phone and `3` on a wider container such as an iPad, with no code change.

Character sprite budget on that grid:

| Unit | Sprite canvas (art px) | Occupied height | at `×2` (CSS px) |
| --- | --- | --- | --- |
| Minion | `34 × 36` | `≈26–30` | `68 × 72` |
| Hero | `40 × 44` | `≈34–38` | `80 × 88` |
| Boss | `56 × 60` | `≈48–52` | `112 × 120` |

The boss at ~50 art px of occupied height lands **exactly on the Dead Cells anchor**, a useful sanity check: the boss can carry as much personality as the Dead Cells protagonist. Heroes at ~36 px sit below it and need harder silhouette discipline — one identity device, big armour masses, no micro-detail — which is precisely what [hand-drawn-character-art-style.md](../content/hand-drawn-character-art-style.md) already mandates.

The relative sizing preserves the existing hierarchy: current radii `22 / 16 / 12` give a boss:hero:minion ratio of roughly `1.8 : 1.3 : 1`, and `60 / 44 / 36` gives `1.7 : 1.2 : 1`. Close enough that board readability is unchanged.

Let sprites **overhang their hex vertically**, feet anchored at or slightly below the hex centre with the head extending above the tile — the standard board-game convention. Set `sprite.setOrigin(0.5, 0.8)` or similar so the anchor is a foot-anchor, and keep the depth sort by `y` so overlapping units stack correctly.

Palette: **32–48 colours for the whole board layer**, split roughly as 12–16 for the environment ramp (warm and cold), 12–16 for characters and materials, and **6–8 reserved exclusively for state signalling** — telegraph, hazard, legal move, guided move, targeting, ownership. The colour constants already at the top of `BoardScene.ts` are the seed for that reserved set. Holding state colours out of the shared art palette is what keeps "saturation as targeting aid" enforceable rather than aspirational.

## Risks And Cost

**The pipeline is expensive at the front and cheap at the back.** Motion Twin's investment — rig, custom renderer, atlas tooling — paid off across a game with hundreds of animations and heavy asset reuse. The Workbench currently has **zero sprites of any kind** and needs perhaps five clips across two or three units. Option A's break-even is genuinely uncertain; the six-facing requirement is the main thing that moves it, and if facings drop to three-plus-mirror, Option A likely does not pay for itself.

**The tooling does not port.** Motion Twin's renderer was a bespoke in-house program, never released **[community]**. The `PixelArtPipeline` reconstruction is a **Unity** project — a reference for the *technique*, not a drop-in tool. Anyone adopting Option A is writing a Blender-side export script.

**Fractional scaling silently destroys the whole effect, and it is already shipping.** `Phaser.Scale.FIT` is in `PhaserBoard.tsx` today, and on a high-DPI phone the compositor adds a second fractional step on top. Pixel art at 2.37× looks worse than the current clean vector board at 2.37×. This is the highest-probability failure mode and it must be fixed *before* any art is produced, not after.

**`roundPixels` does nothing for `Graphics`.** Any incremental plan that pixel-arts the units but leaves tiles as `fillPolygon` will produce a board where sprites snap and tiles do not — worse than either extreme. Tiles and units have to convert together.

**Board text is inside the pixel layer.** The `9–15 px` monospace labels in `BoardScene` become unreadable or absurdly large at art resolution. Hoisting them into React is the right fix but it is a real refactor of `BoardScene`'s label lifecycle, and it touches the damage-number feedback the playtests already validated.

**Integer zoom quantises the board's on-screen size.** The board may render smaller on narrow phones than it does today. That is a visible product regression traded for crispness, and it needs a decision, not a merge.

**Two boards, one art direction.** The Godot board (`scripts/hex/`) uses **flat-top** hexes at `HEX_RADIUS = 34`, while the Workbench uses **pointy-top** at `HEX_SIZE = 36`. Any tile art produced for the web board does not transfer to Godot without re-authoring. Worth knowing before commissioning art, even though Godot is out of scope here.

**The cheaper approximation** — Option C — is: 4× authoring, nearest downsample, locked palette, hand-touched silhouettes, **baked** lighting instead of normal maps, pose-to-pose animation with the existing `effects.ts` layer carrying impact, integer hex geometry, and `Scale.NONE` + `MAX_ZOOM`. No rig, no custom tooling, no second texture per frame, and it preserves the option to upgrade individual units to the full 3D pipeline later. It costs only the cheap-facings advantage.

## Conflict With The Committed Direction

This must be stated plainly. [hand-drawn-character-art-style.md](../content/hand-drawn-character-art-style.md) is the **committed** target and it explicitly lists, under "Avoid": *"3D render polish, photoreal materials, noisy edge detail"*, and under Style Pillars prefers *"Hand-drawn linework — clean 2D concept-art lines with visible drawing decisions."*

A Dead Cells-derived pipeline is a 3D-render pipeline. On that axis it is in direct tension with the committed direction. On other axes it agrees strongly:

- **Flat/cel shading** — Dead Cells' toon model is a single hard threshold with two values, more cel-shaded than the committed direction requires.
- **Phone-readable silhouette** — the ~50 px budget *forces* it.
- **Large armour shapes, one identity device** — mandatory at 36–50 px whatever the tooling.
- **World-bible materials** — orthogonal to the pipeline. Oathsteel seams, runeglass, and living gold are exactly the high-contrast material cues that survive a downsample; void basalt "that eats rim light" is already written as a lighting instruction.

The honest read **[inference]**: the *look* Dead Cells achieves is largely compatible with this repo's committed direction; the *means* is not. If the pixel-art direction is attractive, the lowest-conflict route is Option C — hand-drawn cel-shaded source at 4×, downsampled and palette-locked — which satisfies both documents, and to treat a 3D rig as a later optimisation justified specifically by the six-facing requirement.

Resolving that tension is a product-direction call. This document does not make it.
