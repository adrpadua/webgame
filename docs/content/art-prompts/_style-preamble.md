# Style Preamble

Status: locked style contract. This is the shared opening block for every prompt in this directory. Paste it first, then paste the asset-class template after it.

Change this file only when the art direction itself changes, and regenerate affected sets afterward. Editing style wording inside a single template instead of here is how a prompt set drifts apart.

Source of truth for the wording below: [world-style-bible.md](../world-style-bible.md) for materials and world logic, [hand-drawn-character-art-style.md](../hand-drawn-character-art-style.md) for rendering and shape language. This file paraphrases both into model-ready prose; if they disagree with it, they win and this file should be corrected.

## The Block

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
```

## Why It Is Shaped This Way

Each paragraph does a specific job, and dropping one has a predictable failure mode:

| Block | Job | What happens without it |
| --- | --- | --- |
| Rendering style | Holds the hand-drawn, cel-shaded look | Output drifts to 3D render polish, the exact problem this direction was created to correct |
| Shape language | Keeps silhouettes phone-readable | Detail creeps into micro-plates that dissolve at board size |
| Material language | Ties art to world canon | Generic fantasy armor with no world identity |
| Palette | Holds sets together across sessions | Each asset lands in a different color world |
| Never include | Blocks the recurring failures | Watermarks, invented UI, and tavern fantasy return immediately |
