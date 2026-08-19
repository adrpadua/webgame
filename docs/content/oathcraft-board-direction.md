# Oathcraft Board Direction

Status: locked board contract. This document decides how the hex board renders — tint application, lighting, motion, and the values that carry them.

**It does not own the material language, the palette, motion policy, or the texture bans.** Those live in [oathcraft-interface-direction.md](oathcraft-interface-direction.md) and bind this surface as well as the chrome. Ownership splits by concern rather than by surface, because a surface split would put the palette in two places — which is exactly how the board came to ship a green that names no material.

Implementation detail for a sprite pipeline — pixel scale, downsampling, palette quantization, hex-versus-pixel-grid geometry — is researched in [dead-cells-art-style-research.md](../artifacts/dead-cells-art-style-research.md) and cited from here rather than copied. That document states it is not an art-direction decision; this one is.

## Objects Take Materials, Tints Take Temperature

The board draws two different kinds of thing and they resolve differently.

An **object** is anything that *is* something — a piece, the ground, a structure. It takes its material from the material language. A **tint** painted over a hex is information about that hex rather than an object made of runeglass, so it takes its side from the warm/cool axis: **warm is their beat, cool is your move.**

That line sits where the fiction already puts it. A pattern projector is a real oathcraft device; the light it paints on the floor is a message about the floor.

| Role | Kind | Takes |
| --- | --- | --- |
| Hero token | Object | Signal cloth, per role |
| Boss token | Object | Ember coral |
| Minion token | Object | Ember coral, lower saturation, smaller |
| Scorched ground | Object | Ember coral |
| Tile floor | Object | Oathsteel |
| Telegraph | Tint | Warm |
| Legal destination | Tint | Cool |
| Target marker | Tint | Cool |
| Board Feedback flash | Event | Axis for the side, material for the value |

**A board colour that cannot name a material or a temperature is a defect, not a preference.**

Boss and Minion share a material deliberately. `world-style-bible.md` calls a Whelp *"splintered furnace sparks"* — a piece of the furnace. A separate hue asserts a separation the fiction denies, and makes a Brood Call spawn read as a different faction arriving rather than the Boss shedding part of itself. They separate by saturation and size.

**Green is not a material.** Healing renders as aether ceramic, which the world already assigns to medical technology and restorative glyphs.

## Saturation Ranks By Imminence

Within a temperature, the more imminent thing is the more saturated. The research's rule — colour is a targeting aid, and anything new or dangerous takes a hue and saturation nothing else is using — only works when the ordering is stated, because *newest* and *most dangerous* conflict constantly.

- **Warm**, most to least: the beat resolving now · a telegraphed beat landing next window · the Boss · a Minion · scorched ground.
- **Cool**, most to least: legal destinations while choosing · the Hero · the ground.

Imminence rather than novelty, or a spawned Minion outshouts the Cinder Breath cone about to land. Imminence rather than damage, or scorched ground never fades after it has been paid for.

### The Ranking Is Of What Reaches The Screen

The ordering above was written for a board of flat fills, where a token and a rendered pixel were the same thing. They are no longer, and the ranking is only meaningful in the second.

**A tint is not its token.** A telegraph is composited over the tile, and compositing costs it most of its chroma: `coral-400` carries C\*=63 as a token and arrived at C\*=15 on screen, `coral-300` at C\*=8. The board once passed a test asserting this ordering while showing the exact inverse of it, because the test ranked tokens. Rank composites — `palette.ts` carries the arithmetic and `palette.test.ts` the assertion.

**A sprite is governed by nothing.** Pieces are drawn art, so no token moves them. Their place in the ordering is a property of the PNG and has to be measured against the sheet, which the smoke suite does.

### Boss And Minion, Measured

They are one material, and the ordering above puts the Boss over the Minion. Shipped, it was the other way round: the Whelp's warm median measured `L=0.152` against Embermaw's `L=0.103`, and on a dark board two small intense pieces pulled the eye ahead of the thing that dominates the frame.

The Whelp's sheet is now graded to `L=0.085`, a uniform scale in linear light rather than a ceiling. That distinction is the whole design of the fix: a ceiling compresses the brightest pixels hardest, and on a Whelp those are the too-bright core that is its entire board read — the feature that says *a piece of the furnace broke off*, and the reason the two share a material at all. Scaling everything by one factor lowers the piece while leaving the core where it was relative to its shards; measured, that contrast went from 5.4x to 4.5x rather than collapsing.

Total presence was never the problem and is not the fix. The Boss commands roughly ten times the Whelp's warm energy on the board, before and after. What was wrong was the per-pixel ordering the ranking actually states, and it is now held by the smoke suite in both forms — energy and median — because the Whelp is built from a contact sheet that stays ungraded, so a rebuild that forgets the grading step puts the inversion straight back.

## Lighting

The board is lit by **one fixed key from the upper left**, never varied per piece. Consistency across a cast comes from lighting everything with the same scene light rather than from remembering where the sun was.

A piece renders as **two flat fills against that light**: the shadow tone across the whole body, then the lit tone offset toward the key. One threshold, two values — a hard step, never a gradient ramp. This is the flat cel model the interface direction requires, and it is also precisely Dead Cells' toon model, which resolves to `dot(N, L) > 0.3 ? light : ambient`.

Three devices, each doing a different job:

- **Cast shadow** — a hard-edged offset shape on the ground, no blur. It states the light direction, which is information. The interface direction's shadow ban is on *blurred* shadows and does not reach this. Chrome plates still never cast.
- **Key-side highlight** — the bright arc on the lit side, saying where the light is.
- **Rim** — a bright edge on the **lower right**, away from the key. Its job is silhouette separation: lifting a dark piece off a dark tile. A faint full ring separates equally in every direction, which flattens the light it sits inside, so the rim is directional and the ring is not a substitute for it.

## Motion

Two kinds, and `CONTEXT.md` names both.

**Board Feedback** is transient and derived from Resolution Facts. The board can never show a blow the Encounter did not resolve.

**Board Ambience** carries no rules information and applies uniformly. It is bounded:

- value only — **no colour change**
- **two pixels** of travel at most
- **one Hz** at most
- **deterministic per piece**, phased from the piece id so no two share a beat and the board never reads as metronomic
- **yields to Board Feedback** for any piece an effect currently owns, or it layers into a strike as a wobble
- **off entirely under reduced motion**

**A piece rests the way it moves.** The ambience of a piece that stands is the idle cycle its sheet draws: heat swelling along its veins, a throat brightening, loose plates settling — all of it inside a silhouette whose feet, base, and centre of mass never leave the tile. The bob is a separate thing and belongs only to a piece that **flies**: it raises the body while the cast shadow stays on the ground, and the gap that opens between the two is not a lift, it is flight. Give it to a piece that walks and the piece comes unstuck from the floor. Nothing in the Embermaw encounter flies.

Locomotion is not a state, so this does not break the rule that ambience never distinguishes one piece from another: a piece flies for the whole Encounter or never, and a property that cannot change cannot be misread as a status signal.

The general rule the interface direction states: motion that carries state fires once; ambient motion may loop, but must never distinguish one element from another.

## Surface Jitter

The tile floor takes a deterministic per-hex value shift to break the vector-art read of one fill repeated across a grid. It is the fourth entry in the interface direction's texture list, and it is bounded there: **value only, ±6% ceiling, derived from the tile's coordinates, never on a piece.** Because it is deterministic the same tile always lands on the same shade, so the floor holds still between frames.

## State Stays In The Stat Panel

A tile stays clean until it is tapped, and the tapped piece's Stat Panel is the readout. Board-first layout argues for health on the token, and comparable games do it — but health bars on every token are chrome that never recedes, and at two or three pieces the tap costs little.

**Amended 2026-08-19 (D-058, ADR 0033):** the primary Hero's state moved to the persistent Hero Frame at the board's bottom edge — the Signature made a tap-summoned readout untenable for the Hero's own machine — while Enemy state keeps this rule unchanged: tiles stay clean, and a tapped Enemy's Stat Panel is its readout. **Revisit when the multi-Hero party model lands** (`design-backlog.md`, Engineering rank 6), when four friendly pieces have health that matters simultaneously.

## What This Does Not Decide

The sprite pipeline. Whether units become sprites at all, at what pixel scale, and by which of the research's three routes, is open — its recommended shape is hand-drawn cel at 4×, downsampled with nearest or box, palette-locked, with the key and rim baked in rather than shipped as normal maps. Nothing here commits to that; it commits only to the light being one light, and to the values it produces naming materials.

## Review Checklist

- Can every colour on screen name a material or a temperature?
- Is each element an object taking a material, or a tint taking a side?
- Within a temperature, does the more imminent thing carry the higher saturation?
- Is there exactly one light, from the upper left, with the rim opposite it?
- Is any continuous motion uniform across pieces and free of rules information?
- Does anything blur?
