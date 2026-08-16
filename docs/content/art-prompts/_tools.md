# Tool Selection

Status: active decision record. Which generator each asset class goes to, and why. Read this before starting a new asset class; the templates assume these choices.

## The Matrix

| Asset class | Tool | Deciding factor |
| --- | --- | --- |
| Hover tile, target tile, boss crest | Vector generator (Recraft or equivalent) | True alpha and crisp edges at 46–68 px |
| Card and ability art | Conversational image model with reference attachment | Character persistence across a set |
| Hero, boss, and minion concepts | Conversational image model | Anchor calibration lives here |
| Arena backdrop | Conversational image model | No special constraint; any capable model works |

## Why Tiles Go To A Vector Generator

The tile and crest assets are not illustrations. They are monochrome hexagonal ring geometry that must hold a clean edge at 46–68 px with genuine transparency, then survive being multiplied by a runtime tint. That is an iconography problem, not a rendering problem.

A vector generator fits it exactly: native SVG output means the hex ring scales to the target size without resampling artifacts, and transparency is structural rather than keyed out afterward. Recraft V4 Vector is the current pick — it emits real vector paths and is trained on iconography conventions for lines, fills, and negative space.

Export at the exact draw size listed in [board-and-tiles.md](board-and-tiles.md), not at a convenient power of two. These assets are drawn at fixed rectangles and get no filtering help.

## Why Not Midjourney

Considered and rejected in August 2026. Recorded here so the question does not get re-opened without new information.

**It cannot produce transparency.** Midjourney generates RGB pixels with no alpha channel. Prompting for a transparent background yields either a solid fill or a literally drawn checkerboard pattern. The workarounds — erasing in its editor, or generating on flat white and keying out — both introduce edge fringing, which is disqualifying at 46 px where the fringe is a visible fraction of the asset.

**It is weak at persistent characters.** It offers no fine-tuning or persistent character modeling, which makes holding one Hero across eleven card illustrations its worst case rather than its best.

Those two gaps are precisely this project's two hardest requirements. What remains is the arena backdrop, where its rendering is genuinely strong — but a single asset does not justify maintaining a second prompt dialect, since Midjourney also needs materially different phrasing from the prose preamble: short weighted clauses, `--no` for negatives, and `--ar` for framing.

If you want the backdrop from Midjourney anyway, compress the preamble to a short style tag, move the never-include list into `--no`, and add `--style raw` with a low `--stylize` to suppress its default painterly bias. Do not add it for anything else.

## Pending Evaluation: Leonardo

Status: candidate, partially tested, not adopted. Raised August 2026 after five rolls were spent getting one card right. Text-only Phoenix has since been tested and failed — see Result below. The features that made it a candidate remain untested.

Leonardo is worth evaluating here because three of its features map onto the three failure modes this run actually produced — recorded in [elian-voss-card-prompts.md](elian-voss-card-prompts.md) — rather than onto generic quality claims.

**ControlNet-style pose guidance answers the pose drift.** The recurring failure was the reference image supplying identity *and* pose together, dragging every result back toward the calm concept sheet. Pose guidance specifies the pose structurally instead of describing it in prose, which removes the conflict rather than arguing with it.

**Inpainting answers the whack-a-mole.** The most expensive pattern in this run was that fixing one fault by re-rolling lost others that were already right. Editing a region in place — repairing a broken arm without touching a pose, crop, and background that already work — eliminates that class of loss structurally. This is the strongest single argument for the tool.

**Character Reference with adjustable strength answers identity-versus-pose.** Low/Mid/High strength is the knob for taking the design without importing the composition.

Beyond those: custom LoRA training on 10–20 images in 15–30 minutes on paid plans, a multi-model library including anime presets relevant to the flat cel direction, and a transparent-background export.

### What Adoption Would Change

If it wins, it replaces both the conversational model for cards and the Scenario recommendation below — style LoRA on one axis, character reference on the other, which is the two-axis lock this library approximates in prose.

It does **not** change the tile and crest decision. That was made on vector precision at 46 pixels, and a diffusion model emitting transparent backgrounds is not the same thing as real paths. Revisit only if the vector route fails on its own terms.

### Judging Criteria

Bake off on `guard_stance`, which needs re-rolling for its setting anyway. Zero cards are final right now, so this is the cheapest moment a tool switch will ever be — there is no half-finished set to strand. Judge three things:

1. Does the pose obey the `POSE:` line rather than the reference's stance?
2. Does the Redwater lock corridor render as subordinate value shapes rather than a competing scene?
3. Does it hold flat cel shading without over-rendering into Leonardo's house look?

### Result: Text-Only Phoenix Failed

Tested August 2026 on `guard_stance`, using Phoenix 1.0 with a Character Reference loaded and the full prompt converted to Phoenix form — positive prompt, separate negative prompt, no conversational turn.

Scored against the three criteria: **pose failed**, **setting failed**, **rendering passed**.

The pose came back fully standing — weight even, arms down, more static than any Gemini attempt including the first. The setting rendered as heavy detailed masonry with individual stone blocks on both walls, competing directly with the figure rather than sitting behind it. Flat cel shading and clean linework did hold, so the house-aesthetic worry was unfounded; Phoenix can draw in this style.

Identity also drifted despite the Character Reference: the keyhole emblem and ember-red tassel were gone, the large geometric oathsteel plates were replaced with generic armor, the gateblade baton became two thin rods, and the runeglass panels became projected light cones instead of rectangular gates.

**The transferable lesson concerns negative prompts.** `standing pose` and `architectural detail` were both stated explicitly in the negative field, and both appeared prominently in the result. A diffusion negative prompt is weak steering away from a concept, not a prohibition. Do not move a hard constraint from a positive instruction into a negative list and assume it still binds — on this workflow the two constraints that matter most are exactly the two that will not survive the move.

Confounds not controlled: the run used Fast mode and a 736×1120 frame rather than 3:4. Neither accounts for a fully standing pose, but both should be off before any further test.

### What This Does And Does Not Settle

Settled: text-only Phoenix is worse than the conversational model for this work, and should not be adopted.

Not settled: whether *Leonardo* beats the conversational model. This run used neither of the two features that made it a candidate — ControlNet-style pose guidance and inpainting. Prose-driven pose fidelity is the thing diffusion is worst at, which is precisely why pose guidance exists, so the test exercised the weakest available configuration.

To close the evaluation, run Phoenix once more with Fast off, a 3:4 frame, Character Reference at High for identity, and **a pose input image** driving the stance — a rough sketch or any photograph with the right body position. If pose guidance produces the braced crouch reliably, Leonardo wins on the failure that has cost the most rolls. If it does not, close the evaluation and keep the conversational model.

Until that test runs, no tool decision changes.

### What Is Unverified

The vendor's own game-asset-suite article could not be read from this environment — `leonardo.ai` is blocked by the egress proxy — so the feature list above comes from secondary coverage and should be confirmed against the source before committing.

Treat the published figures as marketing: "90% consistency on first tries", "85% of surveyed game devs prefer Leonardo", and "4x better pose fidelity" all circulate without methodology. The features are the reason to evaluate; the numbers are not evidence.

Two unknowns the bake-off exists to settle: whether the house aesthetic fights flat cel shading the way Midjourney's does, and whether losing a conversational thread hurts. On the second, consolidation already beat iterative correction in this run, so a non-conversational tool may suit the workflow rather than hinder it.

## The Scaling Path: A Trained Style Model

Prompt-based direction has a ceiling. Every generation re-describes the style in prose and hopes the model complies, which is why this library spends a whole file on a preamble and why drift is a standing risk.

The structural fix is training a private style model on your own art, so the direction is carried by weights instead of by adjectives. Platforms built for this — Scenario is the notable one, and Leonardo above offers the same on 10–20 images — train a style LoRA from a small consistent set and are aimed at exactly this problem: a studio needing one look across hundreds of assets.

If the Leonardo evaluation succeeds, it absorbs this path and Scenario is not needed; the two are alternatives, not sequential steps.

**You cannot do this yet.** There is one anchor concept in the repo, and training wants 10–15+ at 1024 px or larger, consistent in aesthetic across varied subjects.

**You will be able to soon.** The eleven Elian card illustrations, plus the Hero and boss concepts, are the training set. Generate them with the prompt library as it stands, keep the ones that hit the direction, and once roughly fifteen accumulate, training becomes the better tool for everything after.

That is the intended lifecycle of this library: prompts carry the direction until there is enough art to carry it themselves. Revisit this decision when the card set is complete.

## Bake-Off Before Committing

The ranking among conversational models for card work — FLUX Kontext and FLUX.2 for reference-heavy consistency, GPT Image for edit-based iteration, Gemini's Nano Banana for taking a reference image directly — comes from vendor roundups rather than independent benchmarks, and the gaps are small.

Before generating all eleven cards, run two or three through the candidates with the anchor attached and compare directly. Pick on your own evidence, then note the winner here so the rest of the set stays on one model.
