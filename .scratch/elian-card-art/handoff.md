# Handoff: Elian Voss Card Art Run

Status: in progress, nothing final. Written 2026-08-16 at the end of a remote session, for whoever picks this up next.

This file is transient run state. The durable system lives in [docs/content/art-prompts/](../../docs/content/art-prompts/README.md) and should be treated as the source of truth; if the two disagree, that directory wins and this file is stale.

## Where Things Stand

**Zero of eleven cards are final.** Five generations were run on `guard_stance` and one on `iron_guard`. None are keepable:

- The best `guard_stance` result satisfied pose, crop, arms, and rendering, but predates the setting direction and has an empty background. It needs re-rolling against its `SETTING:` line. Its pose and crop are the reference to preserve — attach it and change only the background.
- The `iron_guard` attempt produced eight or more panels and buried the figure. The block now specifies exactly four. It also cannot be judged until `guard_stance` exists, since its whole prompt is written to match that image.

**Board art has not been started.** Prompts are ready in [board-art-prompts.md](../../docs/content/art-prompts/board-art-prompts.md).

## Immediate Next Action

Close the Leonardo evaluation, then run the set. Both are specified in [`_tools.md`](../../docs/content/art-prompts/_tools.md).

Text-only Phoenix has already been tested and failed on pose and setting. The open question is whether Leonardo's **pose guidance** and **inpainting** beat the conversational model — those are the features that made it a candidate and neither has been exercised. The closing test: Phoenix with Fast off, 3:4, Character Reference at High, and a pose input image driving the stance. If pose guidance produces the braced crouch reliably, adopt it. If not, close the evaluation and run the eleven cards on the conversational model.

Do not start the set until this is decided. Zero cards being final is what makes the switch free right now, and that stops being true after the first keeper.

## What Was Learned The Hard Way

Four failure modes are documented in full in [elian-voss-card-prompts.md](../../docs/content/art-prompts/elian-voss-card-prompts.md). In short:

- **The reference supplies identity and pose together.** The anchor concept is a calm standing sheet, and every turn drags back toward it. Restate the pose requirement every time, even after it has been satisfied.
- **Correcting one axis at a time oscillates.** A reply naming two faults gets those fixed and loses unmentioned ones. Cap corrective replies at two, then re-roll from one consolidated message restating every constraint.
- **Comparatives with no ceiling break a series.** "More panels" produced a wall of glass and left the top of the ladder nowhere to go. State quantities, never directions.
- **Diffusion negative prompts do not bind.** `standing pose` and `architectural detail` were both in the negative field and both appeared anyway. Keep hard constraints in the positive instruction.

## Environment Notes For A Local Session

- `leonardo.ai`, `app.leonardo.ai`, and `cdn.leonardo.ai` were all blocked by the remote session's egress proxy. A local session should be able to reach them, so the vendor's game-asset article is worth reading to confirm the feature list in `_tools.md`, which currently rests on secondary coverage.
- The remote container had no Godot binary. Two commits touching GDScript — `03c50bf` (arena backdrop constant) and `e0591cb` (placeholder card art seam) — are on `main` verified statically only, by grep rather than execution. Both are mechanical and value-preserving, but a local launch is the real check and has not happened.

## When Art Lands

Wiring steps are in [README.md](../../docs/content/art-prompts/README.md). The short version: card art is data-driven, so set `artwork` on each `.tres` in `resources/cards/tank/` and no code changes. Board art is hardcoded and needs a script edit per asset.

Once every card sets `artwork`, delete `BY_CARD_ID` and `for_card_id()` from `scripts/cards/PlaceholderCardArt.gd` — but **not** `EMPTY_SLOT`, which draws the no-card state and outlives real card art. That file documents the split.
