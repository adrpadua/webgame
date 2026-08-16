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

## Setting And Story

These eleven cards are one character across eleven moments of a story, the way a trading-card set illustrates its own narrative. Each block carries a `SETTING:` line naming a real place from the world canon and the moment within it. The settings are not decoration — they are how the deck tells Elian's history while you play it.

Two eras carry the deck, both canon:

**The Eastern Breach, 698 FB** — the fall of Redwater Locks, recorded in [world-history.md](../world/world-history.md) and [myths-and-stories.md](../world/myths-and-stories.md). Elian disobeyed the retreat order and held a broken lock corridor long enough for the last evacuation count to cross the river. Survivors named them The Last Gate. The defensive cards live here: the Guard ladder is that corridor holding and failing, `intercept` is the crossing, `rallying_cry` is the far bank afterward.

**The Current Clock, 702–719 FB** — the present-day Embermaw hunt in the Furnace Marches, per [gazetteer.md](../world/gazetteer.md). The offensive cards live here, on black stone veined with ember coral and on Embermaw's scorched trial ground.

`anchor_presence` sits between them, in ruined Redwater during the salvage era — Elian standing in their own lost city, holding ground that no longer needs holding.

The practical consequence is that **settings must not be improvised.** If a card needs a place not listed in its block, take it from the gazetteer rather than inventing one, or the deck stops being one story.

A setting also has to survive a 112-pixel thumbnail, which is the whole reason the composition rules insist on figure-ground separation rather than banning environments. Detail belongs in the far planes; the figure keeps the strongest contrast in the frame.

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

EVERY CARD HAS A SETTING, and each is a different moment in one story. I will name the place and the moment with each ability. Draw it — but keep it subordinate to the figure.

FIGURE-GROUND DISCIPLINE, which is what makes a setting work here. These are read at two sizes: a 112-pixel thumbnail in the hand, and a larger inspect view. The setting must reward the large view without destroying the small one. Hold the environment in simplified value shapes with soft internal detail. Put the strongest value contrast in the whole image at the boundary of the figure, so Elian separates instantly. Keep the area immediately around the head and the weapon clear of competing detail. Build depth through atmosphere and overlapping planes, never through fine texture or busy ornament. If a viewer could not tell where the character ends and the background begins at thumbnail size, the background is wrong.

DRAW ARMS AND HANDS CLEARLY. Every arm must read as one unbroken line from shoulder through elbow to hand, and the viewer must be able to tell where it connects to the body. Do not let armor plates, panels, or cloth cross an arm in a way that hides the joint or breaks the limb into disconnected pieces. Hands gripping the gateblade baton must be fully drawn and correctly attached. This is the most common way these images fail.

KEEP THE SILHOUETTE READABLE. Translucent runeglass panels must not cover the head or the mass of the torso. Place them so the body still reads as a clear shape. These are viewed as small phone thumbnails, where a large transparent rectangle across the figure becomes an unreadable blob.

THE HERO IS THE SUBJECT. Deployed panels, projected geometry, and effects support the figure; they never become the picture. No effect element should occupy more than about a third of the frame, and Elian must stay centered rather than pushed toward an edge. When an ability calls for more of something, add it around the figure, never in front of it.

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
SETTING: A flooded lock corridor in Redwater Locks during the Eastern Breach. Terraced floodwalls, canal water rising fast between them, red storm-surge light, a signal gate half-closed behind Elian.
POSE: Caught at the instant of bracing — panels still mid-swing, not yet fully seated, Elian's weight dropping into the stance. Three-quarter view, tight crop.
PANEL COUNT: Exactly two runeglass panels. This is the bottom rung of a three-step ladder, so keep it sparse.
BOARD RELATIONSHIP: Self.
BEAT: Setup.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

### 2. Iron Guard → `iron_guard.png`

```text
ABILITY: Iron Guard.
WHAT HAPPENS: The same brace as Guard Stance, escalated. Additional runeglass panels stack and lock in layers, overlapping into a deeper wall, living-gold lockwork visibly engaging between them. The pose reads as the same discipline held harder and longer.
SETTING: Deeper into the same Redwater lock corridor, minutes later. Fire moving through the lockhouses beyond, smoke rolling against wet stone, the corridor narrowing ahead.
POSE: Mid-lock, additional panels sliding into place over the first, shoulder driving forward into the brace. Same viewing angle as Guard Stance so the escalation reads.
PANEL COUNT: Exactly four runeglass panels — double Guard Stance, half of Fortify. A viewer must be able to count them at a glance; that countability is the escalation. Do not fill the frame with glass.
BOARD RELATIONSHIP: Self.
BEAT: Setup.

HOLD: Everything from the Guard Stance image — same camera angle, same crouched committed stance, same tight crop, same setting treatment with the environment held in simplified value shapes behind a clearly separated figure, both arms fully drawn from shoulder to hand, same flat cel rendering. Elian remains the subject and stays centered; the panels support the figure and must not crowd it toward an edge or cover the torso. The only change is two additional panels.
```

### 3. Fortify → `fortify.png`

```text
ABILITY: Fortify.
WHAT HAPPENS: The Gate Rig at full deployment — every panel seated, every living-gold lock thrown and visible, the whole assembly closed into a fortress front around Elian. The top of the ladder: nothing left in reserve, the rig committed entirely to holding.
SETTING: The gate heart at the end of the corridor — living-gold lockwork the height of a building. Fire on the far side of it, the last of the evacuation count crossing somewhere behind.
POSE: The final lock throwing home, Elian braced behind a closed wall of panels, viewed from slightly low so the assembly looms. Same angle family as the other two Guard cards.
PANEL COUNT: Exactly six runeglass panels — the top rung. Closed into one continuous front rather than scattered, so it reads as more complete than Iron Guard rather than merely more numerous.
BOARD RELATIONSHIP: Self.
BEAT: Recovery.

HOLD: Everything from the Guard Stance and Iron Guard images — same camera angle family, same tight crop, same setting treatment with the environment held in simplified value shapes behind a clearly separated figure, both arms fully drawn from shoulder to hand, same flat cel rendering. Elian remains the subject and stays centered; the panels support the figure and must not crowd it toward an edge or cover the torso. The only change is two more panels and the rig closing into one front with every lock thrown.
```

## Offense

### 4. Steady Strike → `steady_strike.png`

```text
ABILITY: Steady Strike.
WHAT HAPPENS: A controlled gateblade baton strike — precise and measured rather than heavy. Elian's weight stays centered and their guard stays intact through the motion. This is a professional landing a clean hit, not a swing that commits.
SETTING: A cooling ridge in the Furnace Marches, present day. Black stone veined with ember coral, heat shimmer in the air, furnace vents smoking in the distance.
POSE: Mid-strike, baton extended at the moment of contact, guard still held on the opposite side. Weight centered, not lunging.
BOARD RELATIONSHIP: Single target.
BEAT: Conversion.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

### 5. Shield Slam → `shield_slam.png`

```text
ABILITY: Shield Slam.
WHAT HAPPENS: A deployed runeglass gate panel driven edge-first as a weapon — the defensive tool turned offensive, the panel's edge striking with the full mass of the rig behind it. Impact light cracks along the panel's internal glyph grid at the moment of contact.
SETTING: Embermaw's scorched trial ground. Cracked basalt underfoot, scorched terrain glowing along its seams, the boss's furnace heat pressing in from off-frame.
POSE: Mid-slam, panel edge driving forward with the whole body behind it, impact light cracking at the point of contact.
BOARD RELATIONSHIP: Single target.
BEAT: Payoff.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

### 6. Sweeping Blow → `sweeping_blow.png`

```text
ABILITY: Sweeping Blow.
WHAT HAPPENS: A wide horizontal sweep clearing a lane in front of Elian, the motion arc drawn as one clean confident line rather than a cluttered blur. The sweep displaces something small and burning at its outer edge.
SETTING: A coral-cut ravine in the Furnace Marches, Whelps breaking loose from the walls as splintered furnace sparks.
POSE: Mid-sweep, arms carried through the arc, torso rotated hard, the motion line crossing the frame diagonally.
BOARD RELATIONSHIP: Cone.
BEAT: Conversion.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

### 7. Unyielding Step → `unyielding_step.png`

```text
ABILITY: Unyielding Step.
WHAT HAPPENS: A braced step forward directly into incoming pressure, gate-panel edge leading, head and shoulders behind the guard. Ground cracks or scorches under the planted foot. Advancing and defending in the same motion — Elian gives no distance.
SETTING: The Embermaw arena floor, on ground already denied — terrain still burning where the boss laid heat across it.
POSE: Mid-step, front foot landing hard, body leaning into the incoming pressure, panel edge leading.
BOARD RELATIONSHIP: Single target.
BEAT: Conversion.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

## Control And Support

### 8. Anchor Presence → `anchor_presence.png`

```text
ABILITY: Anchor Presence.
WHAT HAPPENS: Elian sets both boots hard into the ground and a low ring of runeglass light spreads outward from the stance, painting a claimed circle on the arena floor. Stillness rather than motion — the image of someone becoming a fixed point that the battle has to route around.
SETTING: An upper-district terrace of ruined Redwater Locks in the salvage era. Broken ward gates, still water, damaged runeglass flickering false corridors in the background.
POSE: The instant both boots slam down and the ring of light bursts outward. Stillness of intent, but caught at the moment of impact — never standing at rest.
BOARD RELATIONSHIP: Self.
BEAT: Setup.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

### 9. Taunting Challenge → `taunting_challenge.png`

```text
ABILITY: Taunting Challenge.
WHAT HAPPENS: The gateblade baton raised in a formal, ceremonial challenge — a deliberate protocol gesture, not a jeer. Every gate seam and runeglass panel flares bright at once to make Elian the loudest thing on the field. Calm face, absolute composure.
SETTING: The outer ring of the Embermaw arena. Ash falling steadily, furnace glow rising along one side of the frame.
POSE: Baton snapping up into the challenge, seams flaring in the same instant, body turned to face the threat.
BOARD RELATIONSHIP: Single target.
BEAT: Setup.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

### 10. Intercept → `intercept.png`

```text
ABILITY: Intercept.
WHAT HAPPENS: A straight safe-passage line projects from Elian toward an ally off-frame — a hard-light corridor painted across the ground — and an incoming hit is visibly pulled off that line and onto the shield gate. Elian is turned into the impact, taking it deliberately.
SETTING: The river crossing during the evacuation. Barges under blue awnings pulling away, a broken lock corridor behind, the ally being covered just off-frame.
POSE: Mid-lunge across the projected line, body turned into the incoming hit, panel angled to catch it.
BOARD RELATIONSHIP: Straight line.
BEAT: Emergency response.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

### 11. Rallying Cry → `rallying_cry.png`

```text
ABILITY: Rallying Cry.
WHAT HAPPENS: Signal cloth snaps outward as a warm restorative pulse crosses the runeglass panels and spreads past Elian into the space around them. The one warm-toned image in the set — ember-red and gold rather than cyan — reading as relief arriving.
SETTING: The far riverbank after the crossing is complete. Blue lantern barges, survivors ashore, dawn light coming through smoke. The one warm-toned image in the set.
POSE: Mid-shout, chest open, signal cloth snapping outward at the peak of the pulse.
BOARD RELATIONSHIP: Zone.
BEAT: Recovery.

HOLD: Mid-action pose with the weight visibly committed — never a standing figure. Tight crop filling the frame. Setting present but subordinate, held in simplified value shapes with the strongest contrast at the figure's edge. Both arms fully drawn from shoulder to hand. Flat cel rendering. Character design exactly as established.
```

## Known Failure Mode: The Concept Sheet Reprise

The first run of this file returned a neutral standing pose against a detailed hall — arches, a banner, a patterned marble floor — with a runeglass panel covering most of the torso. Character identity was correct; everything about it as *card art* was wrong.

Three causes, all now addressed above:

- The composition section was headed `STANDING COMPOSITION RULES`, meaning persistent. "Standing" is also a pose, and it read as one. Renamed.
- The setup was long and character-descriptive while each ability block was four lines, so the setup dominated. Each block now carries an explicit `POSE:` line describing the instant to draw.
- The background rule was too soft to hold. It has since been replaced entirely — see Setting And Story below — but the pose fixes above still stand.

If a result still comes back static, do not accept it and do not try to fix it by editing. Reply in the same session:

```text
That is still a standing character-sheet pose. Redo it as a single frozen instant from the middle of the action — the body committed and mid-motion, cropped close so the figure fills the frame. Keep the setting and the character design as they are; only the pose changes.
```

The reference image is the likely culprit when this recurs: it is a calm full-body concept sheet, and attaching it pulls toward that composition. Identity and pose come from the same attachment, so the prompt has to work against it on purpose.

## Known Failure Mode: Broken Arms And Blurred Scenery

The second run fixed the pose but surfaced two more, both since addressed in the rules above.

**Arm geometry breaks where armor crosses a limb.** The result had a forearm vanish behind a shoulder plate and rejoin at the baton grip at an angle the shoulder could not produce. Expect this on every card — all eleven have arms doing something specific with the baton or the panels — which is why the composition rules now demand an unbroken shoulder-to-hand line. Anatomy faults usually clear on a re-roll rather than on more words, so re-roll first and only rewrite if two in a row break the same way.

**Blur is not absence.** Told to drop the background, the model kept the architecture and defocused it — walls, columns, and a tiled floor grid still legible behind a depth-of-field haze.

The specific rule this produced is now obsolete: cards carry real settings, so an empty background is no longer wanted. The underlying lesson is not obsolete and is the reason to record it. Faced with a negative instruction, the model attenuates rather than complies — it makes the offending thing quieter instead of absent. Expect the same move on "minimal gradients", "no bloom", or "subordinate to the figure", and check for softened-but-present rather than gone.

## Known Failure Mode: Correction Whack-A-Mole

The third run fixed both named faults and regressed on one that had already been solved. The background became fully compliant and the broken arm was repaired, but the action pose reverted to a neutral standing figure, the crop loosened back out, and the opposite arm vanished into the rig.

This is the important lesson of the run and it is about method, not wording. **A corrective reply naming two faults gets those two fixed at the expense of constraints it does not mention.** The model weights the most recent instruction heavily and lets unmentioned earlier requirements drift.

So: allow at most two corrective replies. After that, stop replying and re-roll from a single consolidated message that restates **every** constraint at once — pose, crop, arms, background, character, rendering — with the requirement that keeps slipping placed first and marked as the priority. Do not assume anything already achieved will persist just because it was achieved once.

Pose is the constraint that slips most on this Hero, because the attached reference is a calm standing concept sheet and every turn pulls back toward it. Restate the pose requirement in every consolidated re-roll, however many times it has already been satisfied.

### How It Resolved

The fourth run, from a single consolidated message, satisfied every constraint at once: mid-action with knees bent and weight dropped, panels mid-swing with motion arcs reading as their own source, both arms tracing shoulder to hand with the right hand visible, tight crop, character identity intact.

That result predates the setting direction and has an empty background, so it needs re-rolling against its `SETTING:` line before it can be kept. Its pose, crop, arm handling, and rendering are the reference to preserve — attach it when re-rolling and change only the background.

Consolidation is therefore the method, not a fallback. Three rounds of one-axis corrections oscillated; one full restatement converged.

The `HOLD:` line closing every block is the same lever used deliberately. Recency weighting is what caused the drift — the model favours the latest instruction — so the constraints that slip are placed **last** in each block rather than trusted to survive from the setup message. Send it every turn, including after a turn that came out perfectly. A block that just worked is the most tempting one to trim and the most expensive one to lose.

## Known Failure Mode: Unbounded Comparatives

Iron Guard's first attempt buried the Hero. Told "the only change is more panels, stacked deeper", the model maximised: eight or more panels filling over half the frame, Elian crowded to the left edge with the stack across the torso. At thumbnail size it read as a blue rectangle mass rather than a Hero bracing.

The structural damage was worse than the composition. Guard Stance had two panels; this had eight; Fortify then had nowhere left to escalate to. **A comparative with no ceiling breaks a series** — "more", "deeper", "brighter", "wider" all invite the maximum, and the top of a ladder cannot exceed a middle rung that already went as far as the medium allows.

Fixed by giving every rung an absolute rather than a comparative. The ladder is now two panels, four, then six, with the count stated in each block and the top rung distinguished by closing into one continuous front rather than by sheer quantity. A viewer can count the steps, which is what makes the escalation legible without numbers.

Generalise this to any card whose effect scales: state the quantity, never the direction. Where a quantity is genuinely open-ended, bound it with the composition rule instead — effects stay under about a third of the frame and never crowd the figure off center.

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
