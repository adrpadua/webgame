# Board Sprite Sheets

Status: active prompt template. Produces the six-facing idle sheets the Encounter Workbench draws pieces from, in the style of the shipped Elian sheet.

Compose as: [`_style-preamble.md`](_style-preamble.md) block, then the block below.

**This template overrides exactly one paragraph of the preamble — RENDERING STYLE — and nothing else.** The preamble asks for clean hand-drawn concept art, which is right for a card or a concept sheet and wrong for a 40-pixel-tall piece on a hex. Materials, palette, shape language, and the never-include list all still bind, which is what keeps a board piece and its own card recognisably the same character. The override is stated inside the prompt text as well as here, because a model handed two rendering instructions will otherwise blend them into a half-pixelated painting.

Output goes to `assets/art/characters/<entity-slug>/`, and the engine-ready sheet is built from it — never hand-cropped — by:

```bash
python3 tools/build_sprite_sheet.py assets/art/characters/<slug>/idle-contact-sheet.png web/src/assets/<slug>-idle.png \
  --rows NE,E,SE --mirror W=E,NW=NE,SW=SE
```

## What The Pipeline Already Handles

Do not spend prompt words on these. The builder keys the background out by flood fill from the border, trims each pose, and re-centres it on a shared baseline, so:

- **The background may stay opaque.** Flat near-black is fine and is what the reference sheet used.
- **Cell-to-cell drift is corrected.** Every pose is re-centred horizontally and stood on the bottom edge of its frame.
- **A left gutter of facing labels is fine.** The builder drops it.
- **Poses may touch.** A wide piece bridges the gutter between cells — Embermaw's coral reaches into its neighbours — so when the columns cannot be found by looking for empty space, the builder cuts at the thinnest part of the bridge and erases the fragments that crossed it.

That last point is a deliberate exception to the preamble's ban on text. It is worth it: labels are the only way to check a row got the facing it was asked for, and they never reach the game.

The corollary of re-centring is the one thing the prompt *must* ask for: **the idle cycle cannot animate by moving the figure.** A bob, a step, or a drift is normalised away frame by frame. Motion has to come from inside the silhouette — heat pulsing through veins, a cloak settling, a jaw working, glow breathing.

## Draw Three Facings, Not Six

The board indexes six facings and the sheet supplies **three**: `NE`, `E`, and `SE`. The builder mirrors them into `NW`, `W`, and `SW`.

This started as a repair. The first sheet delivered for Elian drew the row labelled `W` facing the same direction as `E` — a piece that turns west without turning — and the fix was to mirror `E` and accept his shield changing arms in that one facing. Generating only the east side makes that repair the plan.

**The evidence is that the generator was already mirroring, just unreliably.** Measured on the three shipped sheets, comparing each drawn west row against its east partner flipped: silhouettes agreed at 0.65 to 0.94 IoU with pixel differences of 25–51 out of 255. Those pairs were never two designed poses. They were one pose and a noisy copy of it, and the project was paying for twenty-four consistent cells to receive about twelve.

What that buys:

- **Half the cells** for the CONSISTENCY paragraph to hold together, which is the single biggest lever on drift — the standing risk this whole library exists to fight.
- **The facing trap becomes impossible.** A west row cannot come back pointing east if no west row is drawn.
- **Exact left-right pairs** in place of that 6–35% silhouette disagreement.

What it costs: genuine handedness flips. Elian's shield and his runeglass panel change arms when he turns west, which was already true for `W` and is now true for `NW` and `SW` as well. Embermaw and the Whelp have no handedness in their canon and lose nothing. Check a new piece against this before assuming it is free.

**The lighting objection, and why it does not hold.** [oathcraft-board-direction.md](../oathcraft-board-direction.md) fixes one key light at the upper left for every piece, and mirroring flips it — which would be disqualifying if the sheets honoured that rule. They do not. Measuring the left-versus-right brightness of each row shows the key attached to the pose rather than to the scene: Elian's rows alternate ±6% to ±10% by facing, Embermaw's ±20%, the Whelp's ±40%. Every sheet already flips its light. Mirroring cannot make that worse; it makes it symmetric and predictable instead of arbitrary.

**Re-open this if the lighting is ever made scene-fixed.** A sheet genuinely lit from the upper left in all facings would lose that when mirrored, and this decision would owe a fresh answer.

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
A grid of 4 columns and 3 rows on a flat, uniform near-black background. No vignette, no gradient, no ground shadow, no scenery, no border. One narrow column of small facing labels down the left edge and no other text anywhere in the image.

Each row is one facing. Top to bottom the rows are NE, E, SE.

Draw only these three. The game turns the piece to its left by flipping these, so drawing the leftward facings is wasted work and any leftward row in the image will be discarded.

THE FACINGS ARE DIRECTIONS, NOT POSES. The camera never moves; the piece turns. On a hex grid seen from a fixed three-quarter angle above:
- NE: facing away from the camera and to the right. We see its back.
- E: facing the right edge of the image. Seen in profile from its left side.
- SE: facing toward the camera and to the right. We see its front.

All three face rightward and differ in how far the piece has turned toward or away from the viewer: NE shows its back, E its flank, SE its front. All three rows must be visibly different directions. Two rows facing the same way is a failed sheet.

Each row's 4 columns are one looping idle animation, read left to right, where the fourth frame returns cleanly to the first. The animation must not move the figure: its feet, base, or centre of mass stay in exactly the same place in all four frames. Animate what is inside the silhouette instead — {{IDLE_MOTION}}.

CONSISTENCY:
Every one of the 12 cells is the same character at the same scale, lit the same way, with the same colours and the same details. This is one piece rendered 12 times, not 12 illustrations of a piece.

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

## Phase Variants

A second sheet for a piece that already has one, drawn for a boss phase change. The template above still applies in full; this appends one block to it.

**The thesis comes from content, not from the art brief.** Embermaw's Phase II is already written:

- `data/encounters/embermaw_prototype.json` — *"Molting Roar: Embermaw sheds its brittle scales and turns."*
- `data/boss_programs/embermaw_molting.json` — *"Shed scales, then feed."*

So the variant is not an angrier Embermaw. It is the same furnace **with its containment gone**, and the prompt should say only that.

### Three Traps, All Specific To A Second Sheet

**It must not become a giant Whelp.** Today the two pieces separate at board size by the blackened oathsteel plating: Embermaw wears it, a Whelp is bare coral around a bright core. Strip the plating and the prompt has described a Whelp at four times the size. Two things have to replace that separation. The evidence of the plating stays — snapped anchor stubs and empty mounts where it used to sit, which is also the preamble's rule that magic leaves evidence — and the furnace throat becomes *more* legible rather than less, because a Whelp has a core and only Embermaw has a directional throat.

**It must not out-saturate its own telegraphs.** The instinct for a second phase is more glow. [oathcraft-board-direction.md](../oathcraft-board-direction.md) ranks warm by imminence — a telegraphed beat outranks the Boss, which outranks a Minion, which outranks scorched ground — so a brighter Boss climbs above the Cinder Breath cone that is about to land and inverts the ordering the entire warm side rests on. A phase variant differs in **silhouette and value structure**, never in brightness or saturation. The throat may be more exposed without being brighter.

**No detached particles.** Not a style note — a pipeline constraint. `build_sprite_sheet.py` trims each cell to its content and re-centres it, so an ember drifting off the body moves that frame's bounding box and the piece jitters against the ones that have none. Ash, sparks, and smoke have to stay inside the outline or not exist.

### The Addendum Block

Paste after the main block, in the same message.

```text
PHASE VARIANT. This is a second sheet of a piece that already exists, not a new piece. Attach the accepted sheet for its first form and match it exactly on rendering, scale, palette, lighting, grid layout, and label gutter. A viewer must recognise this as the same creature at a glance; only the stated change may differ.

WHAT CHANGED: {{PHASE_CHANGE}}.

WHAT MUST NOT CHANGE: its overall size and proportions, its colour range, and how brightly it glows. This form is not brighter and not more saturated than the first. The game reserves its most saturated warm colours for attack warnings, and a piece that outshines its own warning breaks the reading order the player depends on. Carry the difference in the silhouette and in the arrangement of light and dark, never by turning the glow up.

The three facings must point the same directions as the first sheet, row for row, so the piece does not appear to spin when the game swaps one sheet for the other.

Nothing may leave the body's outline. No drifting embers, falling ash, smoke, sparks, or floating debris in any cell, even where they would suit the subject. The build step trims each frame to its contents, so a particle outside the silhouette moves that frame's edges and makes the piece jitter.
```

### Embermaw, Phase II

| Slot | Value |
| --- | --- |
| `PIECE_NAME` | `Embermaw` |
| `ONE_LINE_HOOK` | `a living furnace that treats an arena as a kiln to be heated evenly, now shed of the plating that was holding it in` |
| `MATERIALS` | `bare ember coral with the heat veins exposed across the whole body, snapped anchor stubs and empty mounts along its back and flanks where blackened oathsteel plating used to sit, and an unshuttered furnace throat` |
| `BOARD_READ` | `the furnace throat, now unshuttered and the single clearest thing on the piece — its position still tells a player which way the heat is about to go, and it has to carry that read without the plating that used to frame it` |
| `IDLE_MOTION` | `heat moving through veins that nothing covers any more, the throat working open and closed as it draws breath, and the broken plate mounts flexing with it` |
| `SCALE` | `identical to the first sheet — low and wide, filling most of its cell, about one and a half times the height of a human figure and considerably broader. This form is not larger than the first` |
| `PHASE_CHANGE` | `the blackened oathsteel plating has been shed. On the first sheet it hung off the body like failing containment; here it is gone, leaving snapped anchor stubs and empty mounts, the coral beneath fully exposed, and the furnace throat unshuttered. It reads as a furnace that has lost its casing — not as a different creature, and not merely as an angrier one` |

Composed and ready to send in [embermaw-sprite-prompts.md](embermaw-sprite-prompts.md). Save the accepted sheet as `assets/art/characters/embermaw/idle-contact-sheet-phase-two.png` and build it to `web/src/assets/embermaw-phase-two-idle.png`.

## Acceptance Check

Build the sheet first, then run the checks in the **Sprite Inspector** — the debug rail's "Inspect sheets" button, on any build with the rail (`npm run dev`, or `?debug=1`). It lays every frame out in the engine's facing order with the direction each row is supposed to face, so the checks below are a read rather than an investigation. Its `checker` ground is the one that shows keying damage; its `board size` zoom is the one that answers whether the piece reads at all.

Test the facings before anything else. A beautiful sheet with two rows pointing the same way is a sheet that has to be regenerated or mirrored.

- Do the three drawn rows face genuinely different directions — `NE` showing the back, `E` the flank, `SE` the front? Two alike is a failed sheet.
- Do `W`, `NW`, and `SW` appear in the Inspector as exact mirrors? They are built, not drawn, so this checks the builder rather than the art.
- Across the four frames of a row, do the feet or base stay put? A figure that travels loses its motion to the builder's re-centring.
- Is it the same creature at the same scale in all 12 cells?
- Held at the height of a coin, is the `BOARD_READ` feature still the thing you see first?
- Is the Whelp instantly distinguishable from Embermaw by silhouette and size alone, while obviously made of the same material?
- Any text outside the left label gutter? Reject.
- Is the background flat near-black with no baked drop shadow? The board casts its own, and a baked one keys into the sprite and doubles.

For a phase variant, after all of the above:

- Open both sheets in the Sprite Inspector and step through them row for row. Does each row face the same direction in both? A mismatch spins the piece at the phase break.
- Is the variant the same size and the same brightness as the first form? A phase that arrives brighter outranks the telegraph it is about to fire.
- Is anything outside the body's outline in any cell? One drifting ember is a frame that trims differently from its neighbours.
- Held at board size, is it still obviously the same creature — and still obviously not a Whelp?

## Wiring A Finished Sheet

[`web/src/board/sheets.ts`](../../../web/src/board/sheets.ts) holds a `SHEETS` table keyed by piece kind — Elian, Embermaw, and the Whelp are the worked examples. A new sheet is one entry carrying its frame size, the height it renders at, and how far below the hex centre its base sits. Two things then cover it for free: the smoke reads that table and checks every sheet's PNG header against it, and the Sprite Inspector enumerates the same table, so a new entry arrives with its own button and needs no view written for it.

Pieces are scaled by height rather than sharing a scale, because each sheet is cropped to its own content and a shared scale would size a piece by however much empty space its contact sheet happened to leave. They are also depth-sorted by where they stand: a wide piece like Embermaw overlaps the hexes in front of it, and the piece nearer the camera has to occlude the one behind.

### A Phase Variant Needs Two More Edits

A second sheet for the same piece is not just a second table entry, because two assumptions in the scene are about to stop holding.

**`sheetFor` resolves by kind alone.** It reads `SHEETS[entity.kind]`, and a Boss in either phase has the kind `boss`. The phase has to reach that lookup — the scene already has the snapshot, so the smallest shape is a second entry and a resolver that sends `boss` to it once `bossPhase` is 2 or more.

**Sprites are created on first sight and kept.** `placeSprite` builds a sprite the first time it sees an entity id and reuses it after, so a Boss that changes phase mid-Encounter keeps the texture it was born with and the phase break shows nothing. The swap has to be applied to the sprite that already exists.

It has to survive time travel in both directions, too. Stepping back across the Phase Trigger has to restore the first form, which is the same reason the Phase Reveal fires only on `bossPhase` increasing rather than on it changing.
