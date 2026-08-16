# Handoff: Elian Voss Card Art Run

Status: in progress, nothing final. Written 2026-08-16 at the end of a remote session, for whoever picks this up next.

This file is transient run state. The durable system lives in [docs/content/art-prompts/](../../docs/content/art-prompts/README.md) and should be treated as the source of truth; if the two disagree, that directory wins and this file is stale.

## Where Things Stand

**Zero of eleven cards are final.** Five generations were run on `guard_stance` and one on `iron_guard`. None are keepable:

- The best `guard_stance` result satisfied pose, crop, arms, and rendering, but predates the setting direction and has an empty background. It needs re-rolling against its `SETTING:` line. Its pose and crop are the reference to preserve — attach it and change only the background.

  That image is committed at `assets/art/cards/elian-voss/guard-stance.png` (1023×1537), alongside the anchor concept in `assets/art/concepts/elian-voss/`. Its background is flat grey diagonal bands, which is what needs replacing; everything else in it is the target.
- The `iron_guard` attempt produced eight or more panels and buried the figure. The block now specifies exactly four. It also cannot be judged until `guard_stance` exists, since its whole prompt is written to match that image.

**Board art has not been started.** Prompts are ready in [board-art-prompts.md](../../docs/content/art-prompts/board-art-prompts.md).

## Immediate Next Action

**The Leonardo evaluation closed and then reopened.** It closed on 2026-08-16 against Leonardo's own API documentation: Pose to Image is an SDXL-family feature with no Phoenix equivalent, and Character Reference is excluded from multi-ControlNet combinations on SDXL, so pose and identity cannot be applied to the same generation on any Leonardo model. Inpainting was rejected separately because Phoenix is explicitly unsupported for it.

It **reopened on requirements grounds**, not because any of that changed. The priority for the set became consistency across the eleven rather than adherence to exact design rules, and pose fidelity is what that trade stops paying for. Full reasoning, risks, and new judging criteria are in [`_tools.md`](../../docs/content/art-prompts/_tools.md).

**No tool decision has changed yet.** Until the reopened evaluation settles, the matrix still sends cards to the conversational model.

If the next session runs Leonardo, the two things to fix before anything else: **turn Fast off and use a 3:4 frame** — both were flagged as confounds at closure and were still uncontrolled in the run that triggered the reopen — and **state Elian's skin tone explicitly in the positive prompt**. The anchor and the committed keeper both show dark brown skin; the latest Phoenix output came back pale, and no written prompt in the library states a tone, so the reference is carrying it alone and losing it.

If the next session runs the conversational model instead, start with `guard_stance`: attach the existing keeper, change only the background to satisfy its `SETTING:` line, and preserve the pose and crop that already work. `iron_guard` is judged against that image, so it comes second.

## What Was Learned The Hard Way

Four failure modes are documented in full in [elian-voss-card-prompts.md](../../docs/content/art-prompts/elian-voss-card-prompts.md). In short:

- **The reference supplies identity and pose together.** The anchor concept is a calm standing sheet, and every turn drags back toward it. Restate the pose requirement every time, even after it has been satisfied.
- **Correcting one axis at a time oscillates.** A reply naming two faults gets those fixed and loses unmentioned ones. Cap corrective replies at two, then re-roll from one consolidated message restating every constraint.
- **Comparatives with no ceiling break a series.** "More panels" produced a wall of glass and left the top of the ladder nowhere to go. State quantities, never directions.
- **Diffusion negative prompts do not bind.** `standing pose` and `architectural detail` were both in the negative field and both appeared anyway. Keep hard constraints in the positive instruction.

## Environment Notes For A Local Session

- ~~`leonardo.ai` was blocked by the remote session's egress proxy, so the feature list in `_tools.md` rested on secondary coverage.~~ Closed 2026-08-16: the feature list was confirmed against Leonardo's official API documentation, which is a better source than the vendor article this note asked for.
- Two commits touching GDScript — `03c50bf` (arena backdrop constant) and `e0591cb` (placeholder card art seam) — are on `main` verified statically only, by grep rather than execution, because the remote container had no Godot binary. **This is deferred, not pending.** Godot work is paused until the web version feels like a real game, which extends the freeze ADR 0019 already put on the Godot codebase. Do not schedule a local launch to close this out; re-check it whenever the freeze lifts. Both commits are mechanical and value-preserving, so the exposure is small.

## When Art Lands: Bank It, Do Not Wire It

**Decided 2026-08-16: finished art gets committed and left unwired.** Commit each approved generation under `assets/art/cards/elian-voss/`, named for its card in hyphenated form, matching `guard-stance.png` for `guard_stance`, and stop there.

Every wiring path this project has is Godot — card art is data-driven through `artwork` on the `.tres` files, board art is hardcoded per script — and Godot is paused until the web version feels like a real game. The web surface cannot consume the art either: card content in `data/cards/*.json` carries no art field and nothing under `web/src/` reads card imagery. **Adding one is explicitly out of scope**; the schema is not to be touched for this.

So the art has no renderer right now, and that is accepted rather than a problem to solve. It still earns its keep two ways: it is the training set for the style model described in [`_tools.md`](../../docs/content/art-prompts/_tools.md), which wants roughly fifteen consistent assets and does not care which client draws them; and it is ready the moment either freeze lifts.

The wiring steps stay documented in [README.md](../../docs/content/art-prompts/README.md) for whenever that happens. The short version, unchanged: set `artwork` on each `.tres` in `resources/cards/tank/` with no code changes, and once every card sets it, delete `BY_CARD_ID` and `for_card_id()` from `scripts/cards/PlaceholderCardArt.gd` — but **not** `EMPTY_SLOT`, which draws the no-card state and outlives real card art. Do none of that now.
