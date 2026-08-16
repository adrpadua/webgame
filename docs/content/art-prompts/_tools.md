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

## Closed Evaluation: Leonardo

Status: evaluated August 2026, **not adopted**. Cards stay on the conversational model. Recorded in full so the question does not get re-opened without new information.

The evaluation closed on capability facts read from Leonardo's own API documentation, not on a further bake-off. Both features that made it a candidate turned out to be unavailable in the configuration this project needs — see the two Result sections below for exactly which constraint blocks which feature, since those are the conditions that would have to change for a re-open.

### Why It Was A Candidate

Leonardo was raised after five rolls were spent getting one card right, because three of its features map onto the three failure modes this run actually produced — recorded in [elian-voss-card-prompts.md](elian-voss-card-prompts.md) — rather than onto generic quality claims.

**ControlNet-style pose guidance answers the pose drift.** The recurring failure was the reference image supplying identity *and* pose together, dragging every result back toward the calm concept sheet. Pose guidance specifies the pose structurally instead of describing it in prose, which removes the conflict rather than arguing with it.

**Inpainting answers the whack-a-mole.** The most expensive pattern in this run was that fixing one fault by re-rolling lost others that were already right. Editing a region in place — repairing a broken arm without touching a pose, crop, and background that already work — eliminates that class of loss structurally. This was the strongest single argument for the tool.

**Character Reference with adjustable strength answers identity-versus-pose.** Low/Mid/High strength is the knob for taking the design without importing the composition.

Beyond those: custom LoRA training on 10–20 images in 15–30 minutes on paid plans, a multi-model library including anime presets relevant to the flat cel direction, and a transparent-background export.

The reasoning above still holds as reasoning. It is the availability that failed, not the fit.

### Judging Criteria

The bake-off ran on `guard_stance`, judged on three things:

1. Does the pose obey the `POSE:` line rather than the reference's stance?
2. Does the Redwater lock corridor render as subordinate value shapes rather than a competing scene?
3. Does it hold flat cel shading without over-rendering into Leonardo's house look?

### Result: Text-Only Phoenix Failed

Tested August 2026 on `guard_stance`, using Phoenix 1.0 with a Character Reference loaded and the full prompt converted to Phoenix form — positive prompt, separate negative prompt, no conversational turn.

Scored against the three criteria: **pose failed**, **setting failed**, **rendering passed**.

The pose came back fully standing — weight even, arms down, more static than any Gemini attempt including the first. The setting rendered as heavy detailed masonry with individual stone blocks on both walls, competing directly with the figure rather than sitting behind it. Flat cel shading and clean linework did hold, so the house-aesthetic worry was unfounded; Phoenix can draw in this style.

Identity also drifted despite the Character Reference: the keyhole emblem and ember-red tassel were gone, the large geometric oathsteel plates were replaced with generic armor, the gateblade baton became two thin rods, and the runeglass panels became projected light cones instead of rectangular gates.

**The transferable lesson concerns negative prompts.** `standing pose` and `architectural detail` were both stated explicitly in the negative field, and both appeared prominently in the result. A diffusion negative prompt is weak steering away from a concept, not a prohibition. Do not move a hard constraint from a positive instruction into a negative list and assume it still binds — on this workflow the two constraints that matter most are exactly the two that will not survive the move.

Confounds not controlled: the run used Fast mode and a 736×1120 frame rather than 3:4. Neither accounts for a fully standing pose, but both would have to be off before any further test.

### Result: Pose Guidance Does Not Exist For Phoenix

The planned closing test was Phoenix with Fast off, a 3:4 frame, Character Reference at High for identity, and a pose input image driving the stance. **That test cannot be run.** It asks for two image-guidance types at once that no single Leonardo model offers together.

Leonardo's image guidance is per-model, and each type is addressed by a numeric `preprocessorId` that only exists for the model families that support it:

| Guidance type | SDXL | Phoenix | Flux Dev | Flux Schnell |
| --- | --- | --- | --- | --- |
| Pose to Image | 21 | — | — | — |
| Character Reference | 133 | 397 | — | — |
| Style Reference | 67 | 166 | 299 | 298 |
| Content Reference | 100 | 364 | 233 | 232 |

Pose to Image is an SD 1.5 / SDv2 / SDXL feature. It has no Phoenix equivalent, and the web app's guidance list agrees with the API reference on this. So the two halves of the test are mutually exclusive:

- **Phoenix** gives Character Reference but no pose control at all — which is exactly the configuration already tested above, and it failed on pose.
- **SDXL** gives pose control, and nominally Character Reference too, but the documentation excludes Character Reference from multi-ControlNet combinations on SDXL. Pose plus identity is the one pair that cannot be built.

Pose guidance was the feature meant to answer the failure that has cost the most rolls. It is not reachable, so that half of the case is closed as infeasible rather than untested.

### Result: Inpainting Excludes Phoenix

Inpainting is real, API-accessible, and does accept externally generated images — upload an init image and a mask, then send a generation with `canvasRequest: true` and `canvasRequestType: "INPAINT"`. On paper it fits the one concrete repair this run needs: the best `guard_stance` result has a correct pose and crop but an empty background, and masking the background to paint in the `SETTING:` line would preserve what already works.

It was assessed separately on that narrow case and **rejected**, for one disqualifying reason and two supporting ones.

**Phoenix cannot inpaint.** The documentation names it explicitly: all models except Leonardo Lightning XL, Leonardo Anime XL, and Phoenix can be used with Canvas Inpainting. Phoenix is the only Leonardo model that has been tested against this library's style and the only one that passed the rendering criterion — flat cel shading and clean linework held, which was the genuine finding of the failed run. Inpainting therefore has to run on an untested model, and the patch would be judged at a seam against a figure rendered by a different tool entirely. Style matching is harder inside a mask than in a fresh generation, and this puts the least-verified model on the hardest version of the job.

**The capability is not exclusive.** Edit-based iteration on an attached image is already available on the conversational side — it is why GPT Image is listed as a candidate under Bake-Off Before Committing — and the plan of record for this asset is to attach the keeper and change only the background. Leonardo would be a second route to something already reachable.

**The setup is not free.** A separate account and API key, pay-as-you-go billing, and a mask pipeline with real constraints: masks must be white-on-black, init and mask dimensions must match exactly and be divisible by 8, the ceiling is 1536×1536, and `init_strength` is inverted from the UI value. That is a reasonable cost to carry for a workflow, and an unreasonable one for a single background fix on a single card.

### Decision

Card and ability art stays on the conversational image model. The matrix at the top of this file is unchanged.

Re-open only on a specific capability change, not on a new marketing cycle. Either of these would do it:

- a pose ControlNet becomes available for a Phoenix-class model, so pose and Character Reference can be applied to the same generation; or
- inpainting becomes available for Phoenix, so region repair can run on the one model already shown to hold this style.

Nothing here touches the tile and crest decision. That was made on vector precision at 46 pixels, and a diffusion model emitting transparent backgrounds is not the same thing as real paths. Revisit only if the vector route fails on its own terms.

### What Was Verified, And What Was Not

The feature list above was previously flagged as resting on secondary coverage, because `leonardo.ai` was blocked by a remote session's egress proxy. It has since been confirmed against Leonardo's official API documentation — the guidance-type table, the model support lists, and the inpainting constraints all come from there, which is a better source than the vendor article that note asked for. That item is closed.

Still treat the published figures as marketing: "90% consistency on first tries", "85% of surveyed game devs prefer Leonardo", and "4x better pose fidelity" all circulate without methodology. They played no part in this decision.

Not tested, and deliberately so: whether an SDXL-family model can hold this library's flat cel direction. It would have to, for either the pose route or the inpainting route to be worth revisiting, and both are blocked ahead of that question.

For the record, the commercial terms are not the obstacle. API access is pay-as-you-go with $5 of non-expiring credit at signup and up to 10 concurrent generations, keyed separately from any web-app subscription. The tool was rejected on capability, not on price.

Two unknowns the bake-off exists to settle: whether the house aesthetic fights flat cel shading the way Midjourney's does, and whether losing a conversational thread hurts. On the second, consolidation already beat iterative correction in this run, so a non-conversational tool may suit the workflow rather than hinder it.

## The Scaling Path: A Trained Style Model

Prompt-based direction has a ceiling. Every generation re-describes the style in prose and hopes the model complies, which is why this library spends a whole file on a preamble and why drift is a standing risk.

The structural fix is training a private style model on your own art, so the direction is carried by weights instead of by adjectives. Platforms built for this — Scenario is the notable one — train a style LoRA from a small consistent set and are aimed at exactly this problem: a studio needing one look across hundreds of assets.

Scenario is the standing recommendation for this path. Leonardo offers LoRA training too and would have absorbed it, but the evaluation above closed against Leonardo, so the two are no longer alternatives.

**You cannot do this yet.** There is one anchor concept in the repo, and training wants 10–15+ at 1024 px or larger, consistent in aesthetic across varied subjects.

**You will be able to soon.** The eleven Elian card illustrations, plus the Hero and boss concepts, are the training set. Generate them with the prompt library as it stands, keep the ones that hit the direction, and once roughly fifteen accumulate, training becomes the better tool for everything after.

That is the intended lifecycle of this library: prompts carry the direction until there is enough art to carry it themselves. Revisit this decision when the card set is complete.

## Bake-Off Before Committing

The ranking among conversational models for card work — FLUX Kontext and FLUX.2 for reference-heavy consistency, GPT Image for edit-based iteration, Gemini's Nano Banana for taking a reference image directly — comes from vendor roundups rather than independent benchmarks, and the gaps are small.

Before generating all eleven cards, run two or three through the candidates with the anchor attached and compare directly. Pick on your own evidence, then note the winner here so the rest of the set stays on one model.
