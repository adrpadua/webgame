# Embermaw And Whelp Sprite Prompts

Status: pre-composed and ready to send. The [board-sprite-sheets.md](board-sprite-sheets.md) template with every slot filled, so each block below is one complete message — nothing to assemble, nothing to look up.

**This file is generated. Do not edit it.** It is a copy of the style contract and the template, which is exactly what the library's one-file rule forbids; the copy is safe only because it is rebuilt from the sources rather than maintained. Edit [`_style-preamble.md`](_style-preamble.md) or [board-sprite-sheets.md](board-sprite-sheets.md), then run:

```bash
python3 tools/compose_sprite_prompts.py
```

## How To Send One

1. Start a **new chat** per creature. A fresh context is what stops the second sheet inheriting the first one's drift.
2. **Attach `assets/art/characters/elian-voss/idle-contact-sheet-gold.png`** and say: *"Match this sheet's rendering style, grid layout, and label gutter exactly. Do not copy the character."* The reference carries the look far better than the words do.

   **For a phase variant, attach that creature's own accepted first-form sheet instead** — `assets/art/characters/embermaw/idle-contact-sheet.png` for Embermaw Phase II. It carries the library's rendering and the creature at the same time, and staying identical to it is the whole job.
3. Paste the whole block for that creature as one message.
4. Check the result against the acceptance list in [board-sprite-sheets.md](board-sprite-sheets.md) — **facings first**. If two rows face the same way, say which rows and ask for a regeneration; a mirror is the fallback, not the plan.
5. Save the accepted image to `assets/art/characters/<slug>/idle-contact-sheet.png` and build it:

```bash
python3 tools/build_sprite_sheet.py assets/art/characters/<slug>/idle-contact-sheet.png web/src/assets/<slug>-idle.png
```


## Embermaw

```text
You are producing game art for a mobile raid-tactics game set in the Warded Reaches, a super-high-fantasy world where civilizations survive raid-scale disasters through "oathcraft" — magical infrastructure that binds intent, geometry, and material into repeatable battlefield protocols.

RENDERING STYLE, which is not negotiable:
Clean hand-drawn 2D game concept art. Visible, confident linework. Flat cel shading with controlled value blocks and simple highlights. Minimal gradients. Anime-inspired but restrained and adult, not chibi and not moe. This must look drawn by a person, never like a 3D render, never photoreal, never with cinematic bloom or glossy render passes.

SHAPE LANGUAGE:
Large, readable armor and object masses — big chest, shoulder, bracer, hip, and shin groups. Group detail into a few strong shapes. No fields of tiny trim, no dozens of overlapping micro-plates, no scale-like fragments, no complex fantasy filigree. The silhouette must stay readable when the image is shrunk to phone size.

MATERIAL LANGUAGE, which every surface must be built from:
- Oathsteel: dark metal with luminous inlay seams and hard geometric edges.
- Runeglass: translucent hard-light crystal panes with faint internal glyph grids.
- Signal cloth: saturated cloth panels carrying faction marks, route lines, or warning trims.
- Aether ceramic: smooth pale plates with colored channels embedded in them.
- Ember coral: organic red-orange mineral growth with visible heat veins.
- Void basalt: matte black stone that eats rim light and shows thin star-like fractures.
- Living gold: muted brass-gold formed into hinges, locks, and filigree mechanisms.

Every glow must have a physical source in one of those materials. Magic leaves evidence — scorch marks, cracked runeglass, lingering glyphs, tether lines. Nothing floats or shines for decoration alone.

CORE PALETTE:
Clean white and deep navy masses, restrained cyan luminous seams, muted living-gold lock accents, and sparing ember-red as the single warm accent. Keep the palette tight; color should read as role and material, not decoration.

NEVER INCLUDE:
Text, letters, numbers, logos, watermarks, signatures, or UI frames of any kind. Generic Dungeons-and-Dragons tavern fantasy. Medieval chainmail, leather-and-mud low fantasy, or practical historical arms. Firearms, radios, screens, or modern industrial technology. Unmotivated magical glow. Photoreal or 3D-rendered surfaces. Busy compositions with many small competing figures or gadgets.

IGNORE the RENDERING STYLE paragraph above. It describes hand-drawn concept art; this asset is pixel art, and the two must not be blended. Everything else above still applies — the materials, the palette, the shape language, and the never-include list.

RENDERING STYLE for this asset, which is not negotiable:
Pixel art in the style of a modern 2D action RPG, drawn at roughly 160 pixels tall per figure and presented softly rather than crisply — visible chunky pixel clusters with smooth anti-aliased edges between them, not hard nearest-neighbour stair-steps and not a clean vector look. Limited palette per material. Strong dark outline holding the silhouette. Simple cel shading with one clear light from the upper left. Luminous materials carry a soft bloom that spills a little past their edge.

Create a facing sheet for one game piece.

PIECE: Embermaw, a living furnace that treats an arena as a kiln to be heated evenly.

MATERIAL SIGNATURE: ember coral with visible heat veins, blackened fragmentary oathsteel plating hanging off it like shed containment, and a furnace throat glowing deep in its body.

READ AT BOARD SIZE — the single feature that must survive being shrunk to the height of a coin: the furnace throat — its position on the body is what tells a player which way the heat is about to go.

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

Each row's 4 columns are one looping idle animation, read left to right, where the fourth frame returns cleanly to the first. The animation must not move the figure: its feet, base, or centre of mass stay in exactly the same place in all four frames. Animate what is inside the silhouette instead — heat swelling and fading along the coral veins, the throat brightening and dimming as it draws breath, and loose plates settling.

CONSISTENCY:
Every one of the 24 cells is the same character at the same scale, lit the same way, with the same colours and the same details. This is one piece rendered 24 times, not 24 illustrations of a piece.

SCALE: draw the piece low and wide, filling most of its cell, and clearly the largest thing in the game — about one and a half times the height of a human figure and considerably broader.
```


## Embermaw, Phase II

```text
You are producing game art for a mobile raid-tactics game set in the Warded Reaches, a super-high-fantasy world where civilizations survive raid-scale disasters through "oathcraft" — magical infrastructure that binds intent, geometry, and material into repeatable battlefield protocols.

RENDERING STYLE, which is not negotiable:
Clean hand-drawn 2D game concept art. Visible, confident linework. Flat cel shading with controlled value blocks and simple highlights. Minimal gradients. Anime-inspired but restrained and adult, not chibi and not moe. This must look drawn by a person, never like a 3D render, never photoreal, never with cinematic bloom or glossy render passes.

SHAPE LANGUAGE:
Large, readable armor and object masses — big chest, shoulder, bracer, hip, and shin groups. Group detail into a few strong shapes. No fields of tiny trim, no dozens of overlapping micro-plates, no scale-like fragments, no complex fantasy filigree. The silhouette must stay readable when the image is shrunk to phone size.

MATERIAL LANGUAGE, which every surface must be built from:
- Oathsteel: dark metal with luminous inlay seams and hard geometric edges.
- Runeglass: translucent hard-light crystal panes with faint internal glyph grids.
- Signal cloth: saturated cloth panels carrying faction marks, route lines, or warning trims.
- Aether ceramic: smooth pale plates with colored channels embedded in them.
- Ember coral: organic red-orange mineral growth with visible heat veins.
- Void basalt: matte black stone that eats rim light and shows thin star-like fractures.
- Living gold: muted brass-gold formed into hinges, locks, and filigree mechanisms.

Every glow must have a physical source in one of those materials. Magic leaves evidence — scorch marks, cracked runeglass, lingering glyphs, tether lines. Nothing floats or shines for decoration alone.

CORE PALETTE:
Clean white and deep navy masses, restrained cyan luminous seams, muted living-gold lock accents, and sparing ember-red as the single warm accent. Keep the palette tight; color should read as role and material, not decoration.

NEVER INCLUDE:
Text, letters, numbers, logos, watermarks, signatures, or UI frames of any kind. Generic Dungeons-and-Dragons tavern fantasy. Medieval chainmail, leather-and-mud low fantasy, or practical historical arms. Firearms, radios, screens, or modern industrial technology. Unmotivated magical glow. Photoreal or 3D-rendered surfaces. Busy compositions with many small competing figures or gadgets.

IGNORE the RENDERING STYLE paragraph above. It describes hand-drawn concept art; this asset is pixel art, and the two must not be blended. Everything else above still applies — the materials, the palette, the shape language, and the never-include list.

RENDERING STYLE for this asset, which is not negotiable:
Pixel art in the style of a modern 2D action RPG, drawn at roughly 160 pixels tall per figure and presented softly rather than crisply — visible chunky pixel clusters with smooth anti-aliased edges between them, not hard nearest-neighbour stair-steps and not a clean vector look. Limited palette per material. Strong dark outline holding the silhouette. Simple cel shading with one clear light from the upper left. Luminous materials carry a soft bloom that spills a little past their edge.

Create a facing sheet for one game piece.

PIECE: Embermaw, a living furnace that treats an arena as a kiln to be heated evenly, now shed of the plating that was holding it in.

MATERIAL SIGNATURE: bare ember coral with the heat veins exposed across the whole body, snapped anchor stubs and empty mounts along its back and flanks where blackened oathsteel plating used to sit, and an unshuttered furnace throat.

READ AT BOARD SIZE — the single feature that must survive being shrunk to the height of a coin: the furnace throat, now unshuttered and the single clearest thing on the piece — its position still tells a player which way the heat is about to go, and it has to carry that read without the plating that used to frame it.

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

Each row's 4 columns are one looping idle animation, read left to right, where the fourth frame returns cleanly to the first. The animation must not move the figure: its feet, base, or centre of mass stay in exactly the same place in all four frames. Animate what is inside the silhouette instead — heat moving through veins that nothing covers any more, the throat working open and closed as it draws breath, and the broken plate mounts flexing with it.

CONSISTENCY:
Every one of the 24 cells is the same character at the same scale, lit the same way, with the same colours and the same details. This is one piece rendered 24 times, not 24 illustrations of a piece.

SCALE: draw the piece identical to the first sheet — low and wide, filling most of its cell, about one and a half times the height of a human figure and considerably broader. This form is not larger than the first.

PHASE VARIANT. This is a second sheet of a piece that already exists, not a new piece. Attach the accepted sheet for its first form and match it exactly on rendering, scale, palette, lighting, grid layout, and label gutter. A viewer must recognise this as the same creature at a glance; only the stated change may differ.

WHAT CHANGED: the blackened oathsteel plating has been shed. On the first sheet it hung off the body like failing containment; here it is gone, leaving snapped anchor stubs and empty mounts, the coral beneath fully exposed, and the furnace throat unshuttered. It reads as a furnace that has lost its casing — not as a different creature, and not merely as an angrier one.

WHAT MUST NOT CHANGE: its overall size and proportions, its colour range, and how brightly it glows. This form is not brighter and not more saturated than the first. The game reserves its most saturated warm colours for attack warnings, and a piece that outshines its own warning breaks the reading order the player depends on. Carry the difference in the silhouette and in the arrangement of light and dark, never by turning the glow up.

The six facings must point the same directions as the first sheet, row for row, so the piece does not appear to spin when the game swaps one sheet for the other.

Nothing may leave the body's outline. No drifting embers, falling ash, smoke, sparks, or floating debris in any cell, even where they would suit the subject. The build step trims each frame to its contents, so a particle outside the silhouette moves that frame's edges and makes the piece jitter.
```


## Whelp

```text
You are producing game art for a mobile raid-tactics game set in the Warded Reaches, a super-high-fantasy world where civilizations survive raid-scale disasters through "oathcraft" — magical infrastructure that binds intent, geometry, and material into repeatable battlefield protocols.

RENDERING STYLE, which is not negotiable:
Clean hand-drawn 2D game concept art. Visible, confident linework. Flat cel shading with controlled value blocks and simple highlights. Minimal gradients. Anime-inspired but restrained and adult, not chibi and not moe. This must look drawn by a person, never like a 3D render, never photoreal, never with cinematic bloom or glossy render passes.

SHAPE LANGUAGE:
Large, readable armor and object masses — big chest, shoulder, bracer, hip, and shin groups. Group detail into a few strong shapes. No fields of tiny trim, no dozens of overlapping micro-plates, no scale-like fragments, no complex fantasy filigree. The silhouette must stay readable when the image is shrunk to phone size.

MATERIAL LANGUAGE, which every surface must be built from:
- Oathsteel: dark metal with luminous inlay seams and hard geometric edges.
- Runeglass: translucent hard-light crystal panes with faint internal glyph grids.
- Signal cloth: saturated cloth panels carrying faction marks, route lines, or warning trims.
- Aether ceramic: smooth pale plates with colored channels embedded in them.
- Ember coral: organic red-orange mineral growth with visible heat veins.
- Void basalt: matte black stone that eats rim light and shows thin star-like fractures.
- Living gold: muted brass-gold formed into hinges, locks, and filigree mechanisms.

Every glow must have a physical source in one of those materials. Magic leaves evidence — scorch marks, cracked runeglass, lingering glyphs, tether lines. Nothing floats or shines for decoration alone.

CORE PALETTE:
Clean white and deep navy masses, restrained cyan luminous seams, muted living-gold lock accents, and sparing ember-red as the single warm accent. Keep the palette tight; color should read as role and material, not decoration.

NEVER INCLUDE:
Text, letters, numbers, logos, watermarks, signatures, or UI frames of any kind. Generic Dungeons-and-Dragons tavern fantasy. Medieval chainmail, leather-and-mud low fantasy, or practical historical arms. Firearms, radios, screens, or modern industrial technology. Unmotivated magical glow. Photoreal or 3D-rendered surfaces. Busy compositions with many small competing figures or gadgets.

IGNORE the RENDERING STYLE paragraph above. It describes hand-drawn concept art; this asset is pixel art, and the two must not be blended. Everything else above still applies — the materials, the palette, the shape language, and the never-include list.

RENDERING STYLE for this asset, which is not negotiable:
Pixel art in the style of a modern 2D action RPG, drawn at roughly 160 pixels tall per figure and presented softly rather than crisply — visible chunky pixel clusters with smooth anti-aliased edges between them, not hard nearest-neighbour stair-steps and not a clean vector look. Limited palette per material. Strong dark outline holding the silhouette. Simple cel shading with one clear light from the upper left. Luminous materials carry a soft bloom that spills a little past their edge.

Create a facing sheet for one game piece.

PIECE: Whelp, a splintered furnace spark that broke off the Embermaw and kept burning.

MATERIAL SIGNATURE: small shards of ember coral around a too-bright core, with a few flecks of blackened oathsteel caught in the growth.

READ AT BOARD SIZE — the single feature that must survive being shrunk to the height of a coin: the too-bright core showing through the shards, so it reads as a piece of the boss rather than a separate creature.

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

Each row's 4 columns are one looping idle animation, read left to right, where the fourth frame returns cleanly to the first. The animation must not move the figure: its feet, base, or centre of mass stay in exactly the same place in all four frames. Animate what is inside the silhouette instead — the core pulsing unevenly and the shards shifting around it, as if it is barely holding together.

CONSISTENCY:
Every one of the 24 cells is the same character at the same scale, lit the same way, with the same colours and the same details. This is one piece rendered 24 times, not 24 illustrations of a piece.

SCALE: draw the piece compact and low to the ground, about half the height of a human figure, occupying only the middle of its cell.
```
