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

## The Scaling Path: A Trained Style Model

Prompt-based direction has a ceiling. Every generation re-describes the style in prose and hopes the model complies, which is why this library spends a whole file on a preamble and why drift is a standing risk.

The structural fix is training a private style model on your own art, so the direction is carried by weights instead of by adjectives. Platforms built for this — Scenario is the notable one — train a style LoRA on as few as 10–15 consistent images and are aimed at exactly this problem: a studio needing one look across hundreds of assets.

**You cannot do this yet.** There is one anchor concept in the repo, and training wants 10–15+ at 1024 px or larger, consistent in aesthetic across varied subjects.

**You will be able to soon.** The eleven Elian card illustrations, plus the Hero and boss concepts, are the training set. Generate them with the prompt library as it stands, keep the ones that hit the direction, and once roughly fifteen accumulate, training becomes the better tool for everything after.

That is the intended lifecycle of this library: prompts carry the direction until there is enough art to carry it themselves. Revisit this decision when the card set is complete.

## Bake-Off Before Committing

The ranking among conversational models for card work — FLUX Kontext and FLUX.2 for reference-heavy consistency, GPT Image for edit-based iteration, Gemini's Nano Banana for taking a reference image directly — comes from vendor roundups rather than independent benchmarks, and the gaps are small.

Before generating all eleven cards, run two or three through the candidates with the anchor attached and compare directly. Pick on your own evidence, then note the winner here so the rest of the set stays on one model.
