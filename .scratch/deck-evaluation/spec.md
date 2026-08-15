# Deck Evaluation Instrumentation And Rubric

Status: completed
Owner: Design + QA Automation

## Goal

Create a lightweight, repeatable way to quantify whether a player **Starting Deck** is both effective and fun in the current Godot boss-raid prototype.

## Canonical Documents

- Design rubric: [docs/content/deck-evaluation-rubric.md](../../docs/content/deck-evaluation-rubric.md)
- QA measurement plan: [docs/artifacts/deck-evaluation-measurement-plan.md](../../docs/artifacts/deck-evaluation-measurement-plan.md)
- Human rubric notes: [docs/artifacts/deck-eval-notes](../../docs/artifacts/deck-eval-notes)
- Encounter Record contract: [docs/artifacts/encounter-records.md](../../docs/artifacts/encounter-records.md)
- Probe harness: [docs/artifacts/probe-harness.md](../../docs/artifacts/probe-harness.md)

## Boundaries

- `EncounterEngine` remains authoritative.
- Do not add HUD-only rules, score displays, or analytics backends.
- Preserve existing probes.
- Add only focused coverage needed for deck-evaluation reports.

## Definition Of Done

- The Design rubric and QA measurement plan are reviewed by their owning tasks.
- A first-pass "good deck" target for the Embermaw teaching slice is documented.
- Engine/reporting gaps are listed separately and kept minimal.
- Future implementation issues can be split from the gaps without rewriting the rubric.
- Human-score evidence uses the canonical note template under `docs/artifacts/deck-eval-notes/`.

## Review

- 2026-08-13: Design approved the rubric and first-pass good-deck target after provisional metric wording was clarified.
- 2026-08-13: QA approved the measurement plan after baseline seed labels and the human-note convention were made explicit.

## Closure

The planning objective is complete: the reviewed rubric, measurement plan, human-note convention, and minimal report-gap route are canonical. Subsequent baseline, controlled-evaluation, and promoted-default delivery evidence remains in its own feature tracking and must not be collapsed into this planning record.
