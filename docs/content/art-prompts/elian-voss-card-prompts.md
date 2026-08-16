# Elian Voss Card Prompts — Ready To Send

Status: generated working file. Eleven pre-composed prompts for the authored Elian Voss deck, built from [`_style-preamble.md`](_style-preamble.md) and [card-ability-art.md](card-ability-art.md) with every slot filled.

Nothing here is new direction. If the preamble or the card template changes, regenerate this file from them rather than editing it in place.

## How To Run This

These are written for a conversational image model, so the style contract is established **once** and the eleven cards follow as separate turns in the same session. That is the point — the model holds the style and the character between turns, which is exactly what keeps a set together.

1. Open one session. Attach [`elian-voss-clean-concept.png`](../../../assets/art/concepts/elian-voss/elian-voss-clean-concept.png).
2. Send **Setup** below, verbatim. Wait for acknowledgement.
3. Send each card block, one per turn.
4. Save each result to `assets/art/cards/elian-voss/<card-slug>.png`.

Do not split this across sessions if you can avoid it. If you must, re-send Setup and re-attach the concept sheet, and expect the second batch to need a closer look.

**Generate the Guard ladder consecutively** — `guard_stance`, then `iron_guard`, then `fortify`, back to back. They must read as one escalating series, and that only survives if they are made together.

## Setup

Send this first, with the concept sheet attached.

```text
You are producing card illustrations for a mobile raid-tactics game set in the Warded Reaches, a super-high-fantasy world where civilizations survive raid-scale disasters through "oathcraft" — magical infrastructure that binds intent, geometry, and material into repeatable battlefield protocols.

The attached image is Captain Elian Voss, a Shield Wall tank Hero who uses they/them pronouns. Every illustration in this session depicts this same character. Match their armor, materials, palette, proportions, and equipment exactly as attached.

RENDERING STYLE, which is not negotiable:
Clean hand-drawn 2D game concept art. Visible, confident linework. Flat cel shading with controlled value blocks and simple highlights. Minimal gradients. Anime-inspired but restrained and adult. This must look drawn by a person, never like a 3D render, never photoreal, never with cinematic bloom or glossy render passes.

SHAPE LANGUAGE:
Large, readable armor masses. Group detail into a few strong shapes. No fields of tiny trim, no dozens of overlapping micro-plates, no complex fantasy filigree. The silhouette must stay readable at phone thumbnail size.

MATERIAL LANGUAGE, which every surface must be built from:
- Oathsteel: dark metal with luminous inlay seams and hard geometric edges.
- Runeglass: translucent hard-light crystal panes with faint internal glyph grids.
- Signal cloth: saturated cloth panels carrying faction marks or warning trims.
- Living gold: muted brass-gold formed into hinges, locks, and filigree mechanisms.

Elian's specific material set: a white and deep-navy oathsteel frame, living-gold locks and hinges, weathered blue signal cloth, cyan runeglass barrier panes, and one small ember-red cord. Their defensive tool is a compact forearm-and-back Gate Rig that deploys large translucent rectangular runeglass panels — never a conventional handheld shield. They carry a short gateblade baton like a ceremonial key.

Every glow must have a physical source in one of those materials. Magic leaves evidence — scorch marks, cracked runeglass, lingering glyphs, tether lines. Nothing shines for decoration alone.

STANDING COMPOSITION RULES for every image in this session:
One dominant visual idea, filling the frame. A bold Elian silhouette in a clear, readable action pose. Clean background geometry — suggest the arena with simple shapes and value, never a detailed scene. The material or implement creating the effect must be visibly the source of that effect. Vertical portrait framing, roughly 3:4, composed so the figure and the effect stay legible reduced to a small card thumbnail.

NEVER INCLUDE:
Card frames, borders, text, letters, numbers, cost pips, icons, or any interface furniture — produce only the illustration. No logos, watermarks, or signatures. No generic Dungeons-and-Dragons tavern fantasy, medieval chainmail, or leather-and-mud low fantasy. No firearms or modern technology. No unmotivated glow. No photoreal or 3D-rendered surfaces.

Acknowledge that you have the character and the style, then wait. I will send one ability at a time.
```

## The Guard Ladder

Generate these three consecutively, in this order.

### 1. Guard Stance → `guard_stance.png`

```text
ABILITY: Guard Stance.
WHAT HAPPENS: Elian brings the Gate Rig up into a braced front — two runeglass panels swinging up and seating into position across their body, cyan seams flaring as each panel locks home. The first rung of the defensive ladder: composed, economical, one clean motion.
BOARD RELATIONSHIP: Self.
BEAT: Setup.
```

### 2. Iron Guard → `iron_guard.png`

```text
ABILITY: Iron Guard.
WHAT HAPPENS: The same brace as Guard Stance, escalated. Additional runeglass panels stack and lock in layers, overlapping into a deeper wall, living-gold lockwork visibly engaging between them. The pose reads as the same discipline held harder and longer.
BOARD RELATIONSHIP: Self.
BEAT: Setup.
```

### 3. Fortify → `fortify.png`

```text
ABILITY: Fortify.
WHAT HAPPENS: The Gate Rig at full deployment — every panel seated, every living-gold lock thrown and visible, the whole assembly closed into a fortress front around Elian. The top of the ladder: nothing left in reserve, the rig committed entirely to holding.
BOARD RELATIONSHIP: Self.
BEAT: Recovery.
```

## Offense

### 4. Steady Strike → `steady_strike.png`

```text
ABILITY: Steady Strike.
WHAT HAPPENS: A controlled gateblade baton strike — precise and measured rather than heavy. Elian's weight stays centered and their guard stays intact through the motion. This is a professional landing a clean hit, not a swing that commits.
BOARD RELATIONSHIP: Single target.
BEAT: Conversion.
```

### 5. Shield Slam → `shield_slam.png`

```text
ABILITY: Shield Slam.
WHAT HAPPENS: A deployed runeglass gate panel driven edge-first as a weapon — the defensive tool turned offensive, the panel's edge striking with the full mass of the rig behind it. Impact light cracks along the panel's internal glyph grid at the moment of contact.
BOARD RELATIONSHIP: Single target.
BEAT: Payoff.
```

### 6. Sweeping Blow → `sweeping_blow.png`

```text
ABILITY: Sweeping Blow.
WHAT HAPPENS: A wide horizontal sweep clearing a lane in front of Elian, the motion arc drawn as one clean confident line rather than a cluttered blur. The sweep displaces something small and burning at its outer edge.
BOARD RELATIONSHIP: Cone.
BEAT: Conversion.
```

### 7. Unyielding Step → `unyielding_step.png`

```text
ABILITY: Unyielding Step.
WHAT HAPPENS: A braced step forward directly into incoming pressure, gate-panel edge leading, head and shoulders behind the guard. Ground cracks or scorches under the planted foot. Advancing and defending in the same motion — Elian gives no distance.
BOARD RELATIONSHIP: Single target.
BEAT: Conversion.
```

## Control And Support

### 8. Anchor Presence → `anchor_presence.png`

```text
ABILITY: Anchor Presence.
WHAT HAPPENS: Elian sets both boots hard into the ground and a low ring of runeglass light spreads outward from the stance, painting a claimed circle on the arena floor. Stillness rather than motion — the image of someone becoming a fixed point that the battle has to route around.
BOARD RELATIONSHIP: Self.
BEAT: Setup.
```

### 9. Taunting Challenge → `taunting_challenge.png`

```text
ABILITY: Taunting Challenge.
WHAT HAPPENS: The gateblade baton raised in a formal, ceremonial challenge — a deliberate protocol gesture, not a jeer. Every gate seam and runeglass panel flares bright at once to make Elian the loudest thing on the field. Calm face, absolute composure.
BOARD RELATIONSHIP: Single target.
BEAT: Setup.
```

### 10. Intercept → `intercept.png`

```text
ABILITY: Intercept.
WHAT HAPPENS: A straight safe-passage line projects from Elian toward an ally off-frame — a hard-light corridor painted across the ground — and an incoming hit is visibly pulled off that line and onto the shield gate. Elian is turned into the impact, taking it deliberately.
BOARD RELATIONSHIP: Straight line.
BEAT: Emergency response.
```

### 11. Rallying Cry → `rallying_cry.png`

```text
ABILITY: Rallying Cry.
WHAT HAPPENS: Signal cloth snaps outward as a warm restorative pulse crosses the runeglass panels and spreads past Elian into the space around them. The one warm-toned image in the set — ember-red and gold rather than cyan — reading as relief arriving.
BOARD RELATIONSHIP: Zone.
BEAT: Recovery.
```

## Accepting Each Result

From [card-ability-art.md](card-ability-art.md) — every illustration must answer, at thumbnail size: which Hero owns it, which role job it expresses, what material creates the effect, what board relationship matters, and which beat it is.

Reject a result if the effect floats with no visible source, if the scene is muddy or crowded, if a card frame or any text was drawn, if the armor dissolved into micro-plates, or if the render drifted toward 3D.

Two set-level checks that no single image will fail on its own:

- Lay the Guard ladder side by side. Escalation must be visible without reading numbers.
- Lay all eleven side by side. Elian must be recognizably one person, and `rallying_cry` should be the only warm-toned image.

## Wiring The Results In

Per the pipeline in [README.md](README.md), card art is data-driven and needs no code change:

1. Save to `assets/art/cards/elian-voss/<card-slug>.png` and let Godot import it.
2. Set `artwork` on the matching resource in `resources/cards/tank/<card-slug>.tres`.
3. Repeat for all eleven. `get_artwork()` prefers `artwork` over the hardcoded fallback, so each card switches over as it is set.
4. Once all eleven are set, delete the `ART_BY_CARD_ID` table and the paladin `preload` lines from `scripts/CardData.gd`, and remove `assets/art/prototype/paladin/`. Leaving them in place is a decoy — dead art that still looks wired.

Keep every approved result. At roughly fifteen assets these become the training set for a style model, per [`_tools.md`](_tools.md).
