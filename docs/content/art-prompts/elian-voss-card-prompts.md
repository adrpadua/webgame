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

COMPOSITION RULES that apply to every image in this session:

THIS IS NOT A CHARACTER SHEET. Do not produce a neutral standing pose, a turnaround, or a reference sheet. Each image is a single frozen instant from the middle of an action — the character caught mid-motion, committed or off-balance, at the exact moment the ability fires. If the resulting pose could be described as "standing", it is wrong. The attached reference is for identity only: match the design from it, never the pose.

CROP CLOSE. The figure and its effect fill the frame edge to edge, with minimal headroom and no empty floor. Vertical portrait framing, roughly 3:4.

THE BACKGROUND CARRIES NO DETAIL. No architecture, no arches, no columns, no walls, no banners, no tiled or patterned floors, no environment. Abstract value and a few simple geometric shapes only — enough to suggest space, never enough to read as a place. If a viewer could describe the location, it is too busy. Blurring or defocusing a detailed background does not satisfy this: the structures must not be drawn at all, not drawn softly.

DRAW ARMS AND HANDS CLEARLY. Every arm must read as one unbroken line from shoulder through elbow to hand, and the viewer must be able to tell where it connects to the body. Do not let armor plates, panels, or cloth cross an arm in a way that hides the joint or breaks the limb into disconnected pieces. Hands gripping the gateblade baton must be fully drawn and correctly attached. This is the most common way these images fail.

KEEP THE SILHOUETTE READABLE. Translucent runeglass panels must not cover the head or the mass of the torso. Place them so the body still reads as a clear shape. These are viewed as small phone thumbnails, where a large transparent rectangle across the figure becomes an unreadable blob.

One dominant visual idea. The material or implement creating the effect must be visibly the source of that effect.

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
POSE: Caught at the instant of bracing — panels still mid-swing, not yet fully seated, Elian's weight dropping into the stance. Three-quarter view, tight crop.
BOARD RELATIONSHIP: Self.
BEAT: Setup.
```

### 2. Iron Guard → `iron_guard.png`

```text
ABILITY: Iron Guard.
WHAT HAPPENS: The same brace as Guard Stance, escalated. Additional runeglass panels stack and lock in layers, overlapping into a deeper wall, living-gold lockwork visibly engaging between them. The pose reads as the same discipline held harder and longer.
POSE: Mid-lock, additional panels sliding into place over the first, shoulder driving forward into the brace. Same viewing angle as Guard Stance so the escalation reads.
BOARD RELATIONSHIP: Self.
BEAT: Setup.
```

### 3. Fortify → `fortify.png`

```text
ABILITY: Fortify.
WHAT HAPPENS: The Gate Rig at full deployment — every panel seated, every living-gold lock thrown and visible, the whole assembly closed into a fortress front around Elian. The top of the ladder: nothing left in reserve, the rig committed entirely to holding.
POSE: The final lock throwing home, Elian braced behind a closed wall of panels, viewed from slightly low so the assembly looms. Same angle family as the other two Guard cards.
BOARD RELATIONSHIP: Self.
BEAT: Recovery.
```

## Offense

### 4. Steady Strike → `steady_strike.png`

```text
ABILITY: Steady Strike.
WHAT HAPPENS: A controlled gateblade baton strike — precise and measured rather than heavy. Elian's weight stays centered and their guard stays intact through the motion. This is a professional landing a clean hit, not a swing that commits.
POSE: Mid-strike, baton extended at the moment of contact, guard still held on the opposite side. Weight centered, not lunging.
BOARD RELATIONSHIP: Single target.
BEAT: Conversion.
```

### 5. Shield Slam → `shield_slam.png`

```text
ABILITY: Shield Slam.
WHAT HAPPENS: A deployed runeglass gate panel driven edge-first as a weapon — the defensive tool turned offensive, the panel's edge striking with the full mass of the rig behind it. Impact light cracks along the panel's internal glyph grid at the moment of contact.
POSE: Mid-slam, panel edge driving forward with the whole body behind it, impact light cracking at the point of contact.
BOARD RELATIONSHIP: Single target.
BEAT: Payoff.
```

### 6. Sweeping Blow → `sweeping_blow.png`

```text
ABILITY: Sweeping Blow.
WHAT HAPPENS: A wide horizontal sweep clearing a lane in front of Elian, the motion arc drawn as one clean confident line rather than a cluttered blur. The sweep displaces something small and burning at its outer edge.
POSE: Mid-sweep, arms carried through the arc, torso rotated hard, the motion line crossing the frame diagonally.
BOARD RELATIONSHIP: Cone.
BEAT: Conversion.
```

### 7. Unyielding Step → `unyielding_step.png`

```text
ABILITY: Unyielding Step.
WHAT HAPPENS: A braced step forward directly into incoming pressure, gate-panel edge leading, head and shoulders behind the guard. Ground cracks or scorches under the planted foot. Advancing and defending in the same motion — Elian gives no distance.
POSE: Mid-step, front foot landing hard, body leaning into the incoming pressure, panel edge leading.
BOARD RELATIONSHIP: Single target.
BEAT: Conversion.
```

## Control And Support

### 8. Anchor Presence → `anchor_presence.png`

```text
ABILITY: Anchor Presence.
WHAT HAPPENS: Elian sets both boots hard into the ground and a low ring of runeglass light spreads outward from the stance, painting a claimed circle on the arena floor. Stillness rather than motion — the image of someone becoming a fixed point that the battle has to route around.
POSE: The instant both boots slam down and the ring of light bursts outward. Stillness of intent, but caught at the moment of impact — never standing at rest.
BOARD RELATIONSHIP: Self.
BEAT: Setup.
```

### 9. Taunting Challenge → `taunting_challenge.png`

```text
ABILITY: Taunting Challenge.
WHAT HAPPENS: The gateblade baton raised in a formal, ceremonial challenge — a deliberate protocol gesture, not a jeer. Every gate seam and runeglass panel flares bright at once to make Elian the loudest thing on the field. Calm face, absolute composure.
POSE: Baton snapping up into the challenge, seams flaring in the same instant, body turned to face the threat.
BOARD RELATIONSHIP: Single target.
BEAT: Setup.
```

### 10. Intercept → `intercept.png`

```text
ABILITY: Intercept.
WHAT HAPPENS: A straight safe-passage line projects from Elian toward an ally off-frame — a hard-light corridor painted across the ground — and an incoming hit is visibly pulled off that line and onto the shield gate. Elian is turned into the impact, taking it deliberately.
POSE: Mid-lunge across the projected line, body turned into the incoming hit, panel angled to catch it.
BOARD RELATIONSHIP: Straight line.
BEAT: Emergency response.
```

### 11. Rallying Cry → `rallying_cry.png`

```text
ABILITY: Rallying Cry.
WHAT HAPPENS: Signal cloth snaps outward as a warm restorative pulse crosses the runeglass panels and spreads past Elian into the space around them. The one warm-toned image in the set — ember-red and gold rather than cyan — reading as relief arriving.
POSE: Mid-shout, chest open, signal cloth snapping outward at the peak of the pulse.
BOARD RELATIONSHIP: Zone.
BEAT: Recovery.
```

## Known Failure Mode: The Concept Sheet Reprise

The first run of this file returned a neutral standing pose against a detailed hall — arches, a banner, a patterned marble floor — with a runeglass panel covering most of the torso. Character identity was correct; everything about it as *card art* was wrong.

Three causes, all now addressed above:

- The composition section was headed `STANDING COMPOSITION RULES`, meaning persistent. "Standing" is also a pose, and it read as one. Renamed.
- The setup was long and character-descriptive while each ability block was four lines, so the setup dominated. Each block now carries an explicit `POSE:` line describing the instant to draw.
- "Never a detailed scene" was too soft to override the model's default instinct to set a scene. The background rule now enumerates what is banned.

If a result still comes back static, do not accept it and do not try to fix it by editing. Reply in the same session:

```text
That is still a standing character-sheet pose against a detailed environment. Redo it as a single frozen instant from the middle of the action — the body committed and mid-motion, cropped close so the figure fills the frame, against an abstract background with no architecture or floor pattern. Keep the character design identical.
```

The reference image is the likely culprit when this recurs: it is a calm full-body concept sheet, and attaching it pulls toward that composition. Identity and pose come from the same attachment, so the prompt has to work against it on purpose.

## Known Failure Mode: Broken Arms And Blurred Scenery

The second run fixed the pose but surfaced two more, both since addressed in the rules above.

**Arm geometry breaks where armor crosses a limb.** The result had a forearm vanish behind a shoulder plate and rejoin at the baton grip at an angle the shoulder could not produce. Expect this on every card — all eleven have arms doing something specific with the baton or the panels — which is why the composition rules now demand an unbroken shoulder-to-hand line. Anatomy faults usually clear on a re-roll rather than on more words, so re-roll first and only rewrite if two in a row break the same way.

**Blur is not absence.** Told to drop the background, the model kept the architecture and defocused it — walls, columns, and a tiled floor grid still fully legible behind a depth-of-field haze. The rule now says outright that the structures must not be drawn at all, not drawn softly. Watch for the same move on any negative instruction: compliance-by-attenuation rather than compliance.

## Known Failure Mode: Correction Whack-A-Mole

The third run fixed both named faults and regressed on one that had already been solved. The background became fully compliant and the broken arm was repaired, but the action pose reverted to a neutral standing figure, the crop loosened back out, and the opposite arm vanished into the rig.

This is the important lesson of the run and it is about method, not wording. **A corrective reply naming two faults gets those two fixed at the expense of constraints it does not mention.** The model weights the most recent instruction heavily and lets unmentioned earlier requirements drift.

So: allow at most two corrective replies. After that, stop replying and re-roll from a single consolidated message that restates **every** constraint at once — pose, crop, arms, background, character, rendering — with the requirement that keeps slipping placed first and marked as the priority. Do not assume anything already achieved will persist just because it was achieved once.

Pose is the constraint that slips most on this Hero, because the attached reference is a calm standing concept sheet and every turn pulls back toward it. Restate the pose requirement in every consolidated re-roll, however many times it has already been satisfied.

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
4. Once all eleven are set, open `scripts/cards/PlaceholderCardArt.gd` and delete `BY_CARD_ID` and `for_card_id()`, simplify `CardData.get_artwork()` to return `artwork` directly, and remove `assets/art/prototype/paladin/`. Leaving them in place is a decoy — dead art that still looks wired.

   **Do not delete `EMPTY_SLOT` or `paladin-placeholder.png` with them.** That constant is what the UI draws where there is no card at all — an unfilled action bar slot, or the inspect overlay before a card is shown — and that need outlives real card art. Only the image is a placeholder; re-point it at a purpose-made empty-slot asset when one exists.

Keep every approved result. At roughly fifteen assets these become the training set for a style model, per [`_tools.md`](_tools.md).
