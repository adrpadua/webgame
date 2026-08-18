# Artifacts

Implementation and gameplay artifacts: what was built, what was measured, and what was decided along the way.

## Read This First

**Most of this directory is a Godot-era record.** The Godot client is frozen (ADR 0019) and the live playable surface is the Encounter Workbench in `web/`. Documents here that name `.gd` scripts, `.tscn` scenes, `run_probes.ps1`, or a Windows `D:\dev\webgame` path describe a build that no longer runs.

They are kept rather than deleted because they are honest point-in-time evidence — playtest observations, design grills, research summaries. Deleting them would destroy the reasoning behind decisions that are still in force. Updating them would falsify records of what was actually seen on a given day.

So the rule for this directory is: **a document that reads as a historical record keeps its content and gains a banner; a document that reads as a live contract gets corrected.**

## Current

- [encounter-records.md](encounter-records.md) — the Encounter Record contract, `schema_version: 2`
- [accessibility.md](accessibility.md) — the pointer-target and portrait contracts, enforced by the smoke suite in CI. Contains clauses marked *Godot-era* that are history rather than contract
- [repo-artifacts.md](repo-artifacts.md) — where things live in the repo
- [sprite-sheet-pipeline.md](sprite-sheet-pipeline.md) — prompt to pixel for a board piece: build, grade, declare, draw, and the checks that keep each stage honest
- [probe-harness.md](probe-harness.md), [handoff-packets.md](handoff-packets.md), [deck-evaluation-measurement-plan.md](deck-evaluation-measurement-plan.md) — process contracts, Godot-era in their commands

## Historical

Banner-marked point-in-time records. Read for reasoning, not for instructions.

- [embermaw-vertical-slice.md](embermaw-vertical-slice.md) — the earlier Energy/Tempo build
- [layout-and-card-design-grill.md](layout-and-card-design-grill.md), [card-and-action-bar-design-grill.md](card-and-action-bar-design-grill.md) — portrait HUD and card design grills
- [mobile-one-turn-playtest-notes.md](mobile-one-turn-playtest-notes.md), [mobile-actionbar-research-fix-playtest-notes.md](mobile-actionbar-research-fix-playtest-notes.md), [mobile-ux-research-actionbar-turn-guidance.md](mobile-ux-research-actionbar-turn-guidance.md) — mobile playtests and research
- [long-encounter-defeat-playtest-notes.md](long-encounter-defeat-playtest-notes.md), [card-art-placeholder-provenance.md](card-art-placeholder-provenance.md)
- [project-coordination.md](project-coordination.md) and [coordination-history](coordination-history) — the multi-agent coordination ledger, entirely Godot-era
- The `*-research.md` files — reference research, unaffected by which client is live

## Where UI Direction Lives Now

Not here. [docs/content/oathcraft-interface-direction.md](../content/oathcraft-interface-direction.md) is the locked interface direction — materials, palette, plate geometry, and component anatomy. The artifacts in this directory that discuss layout and card design predate it and do not override it.
