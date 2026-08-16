# Handoff: Elian Voss Card Art Run

Status: in progress, nothing final. Written 2026-08-16 at the end of a remote session, for whoever picks this up next.

This file is transient run state. The durable system lives in [docs/content/art-prompts/](../../docs/content/art-prompts/README.md) and should be treated as the source of truth; if the two disagree, that directory wins and this file is stale.

## Where Things Stand

**Zero of eleven cards are final.** Five generations were run on `guard_stance` and one on `iron_guard`. None are keepable:

- The best `guard_stance` result satisfied pose, crop, arms, and rendering, but predates the setting direction and has an empty background. It needs re-rolling against its `SETTING:` line. Its pose and crop are the reference to preserve — attach it and change only the background.

  That image is on disk at `assets/art/cards/elian-voss/guard-stance.png` (1023×1537). It is **untracked** — it is not in any commit, so it exists only in this working copy and will not survive a clean clone. Its background is flat grey diagonal bands, which is what needs replacing; everything else in it is the target.
- The `iron_guard` attempt produced eight or more panels and buried the figure. The block now specifies exactly four. It also cannot be judged until `guard_stance` exists, since its whole prompt is written to match that image.

**Board art has not been started.** Prompts are ready in [board-art-prompts.md](../../docs/content/art-prompts/board-art-prompts.md).

## Immediate Next Action

**The Leonardo evaluation is closed.** It was closed against Leonardo on 2026-08-16, against its own API documentation rather than another bake-off. The reasoning is recorded in [`_tools.md`](../../docs/content/art-prompts/_tools.md); in short, the closing test could not be run, because Pose to Image is an SDXL-family feature with no Phoenix equivalent, and Character Reference is excluded from multi-ControlNet combinations on SDXL — so pose and identity cannot be applied to the same generation on any Leonardo model. Inpainting was then judged separately on the background-fix case alone and also rejected, mainly because Phoenix is explicitly unsupported for inpainting and it was the only Leonardo model that passed the rendering criterion.

No tool decision changed. **Run the eleven cards on the conversational model.**

Start with `guard_stance`: attach the existing keeper, change only the background to satisfy its `SETTING:` line, and preserve the pose and crop that already work. `iron_guard` is judged against that image, so it comes second.

## What Was Learned The Hard Way

Four failure modes are documented in full in [elian-voss-card-prompts.md](../../docs/content/art-prompts/elian-voss-card-prompts.md). In short:

- **The reference supplies identity and pose together.** The anchor concept is a calm standing sheet, and every turn drags back toward it. Restate the pose requirement every time, even after it has been satisfied.
- **Correcting one axis at a time oscillates.** A reply naming two faults gets those fixed and loses unmentioned ones. Cap corrective replies at two, then re-roll from one consolidated message restating every constraint.
- **Comparatives with no ceiling break a series.** "More panels" produced a wall of glass and left the top of the ladder nowhere to go. State quantities, never directions.
- **Diffusion negative prompts do not bind.** `standing pose` and `architectural detail` were both in the negative field and both appeared anyway. Keep hard constraints in the positive instruction.

## Environment Notes For A Local Session

- ~~`leonardo.ai` was blocked by the remote session's egress proxy, so the feature list in `_tools.md` rested on secondary coverage.~~ Closed 2026-08-16: the feature list was confirmed against Leonardo's official API documentation, which is a better source than the vendor article this note asked for.
- The remote container had no Godot binary. Two commits touching GDScript — `03c50bf` (arena backdrop constant) and `e0591cb` (placeholder card art seam) — are on `main` verified statically only, by grep rather than execution. Both are mechanical and value-preserving, but a local launch is the real check and has not happened.

## When Art Lands

Wiring steps are in [README.md](../../docs/content/art-prompts/README.md). The short version: card art is data-driven, so set `artwork` on each `.tres` in `resources/cards/tank/` and no code changes. Board art is hardcoded and needs a script edit per asset.

Once every card sets `artwork`, delete `BY_CARD_ID` and `for_card_id()` from `scripts/cards/PlaceholderCardArt.gd` — but **not** `EMPTY_SLOT`, which draws the no-card state and outlives real card art. That file documents the split.
