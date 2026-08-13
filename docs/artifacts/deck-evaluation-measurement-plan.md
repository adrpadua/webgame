# Deck Evaluation Measurement Plan

Status: accepted first-pass QA plan for the Design deck-evaluation rubric.

## Purpose

Provide a repeatable measurement path for early **Starting Deck** evaluation without turning the prototype into an analytics system. The plan supports [deck-evaluation-rubric.md](../content/deck-evaluation-rubric.md) and keeps `EncounterEngine` as the source of truth.

## Measurement Inputs

| Input | Owner | Use |
| --- | --- | --- |
| Seeded Encounter Records | QA Automation | Automatic viability and partial play-feel metrics. |
| Focused replay scenarios | QA Automation with Architecture support | Repeatable runs for baseline, Whelp Clear, and Slow Top Card contracts. |
| Human rubric notes | Design | Class fantasy, perceived meaningful choices, fatigue, and confusing moments. |
| Content fingerprint | Architecture / Encounter Records | Prevents reports from mixing different deck or encounter versions. |

## Seed Set

Use a small fixed seed set until the prototype has broader content:

- `baseline-a`: live `resources/encounters/embermaw_prototype.tres`, live Aegis Guardian starter deck, seed `1337`.
- `baseline-b`: same Encounter and deck, seed `7331`.
- `baseline-c`: same Encounter and deck, seed `20260813`.

Until dedicated deck-evaluation scenarios exist, those labels mean "run the live Embermaw prototype content with the named seed and record/report the run under that label." If a tool cannot yet emit a scenario label, QA should record the label in the human note and treat scenario labeling as the first reporting gap.

When Whelp Clear and Slow Top Card support lands, add:

- `whelp-clear-a`: one adjacent Whelp answer test using the accepted contract.
- `slow-anchor-a`: one Fortify / Slow Top Card test using the accepted contract.

Do not expand beyond these until the first scorecard has been reviewed.

## Automatic Metrics

| Metric | Capture path | Current support | Gap |
| --- | --- | --- | --- |
| Win/survival rate by seeded scenario | Encounter Record outcome, end kind, seed, content fingerprint | Partial | Add named scenario/run labels to reports. |
| Rounds survived | Encounter Record phase boundaries and final state | Supported | None. |
| Rounds to stabilize | Per-Round health/Armor snapshots | Partial | Add per-Round summary facts to Encounter Records or report derivation. |
| Boss damage dealt | Damage Resolution Facts where target is Boss | Supported | Ensure report aggregates by target kind. |
| Boss damage prevented/mitigated | Damage Resolution Facts `prevented` and Armor state | Partial | Attribute prevention source when Armor/status mitigation grows. |
| Minions cleared | Board entity before/after and generated damage actions | Blocked for Whelp contract | Requires setup-only Minion placement and typed target firing. |
| Hazard answers | Movement actions plus telegraphed Hazard/pattern state | Partial | Add board-pressure facts or a focused Hazard-answer scenario. |
| Dead-draw rate | Hand contents, legal actions by window, cards unused at refill/discard | Missing | Add lightweight hand/window facts to Encounter Records or a deck-eval report pass. |
| Slot Tension / meaningful-choice frequency | Legal action alternatives per window and chosen Slot action | Missing | Add report-side proxy from available Slot states; avoid engine changes unless no public state can answer it. |
| Charge efficiency | Charge actions, later activation/cleanup, discarded Charge Stack | Partial | Add report aggregation for charged cards that contributed, persisted Primed, or were discarded unused. |

## Human-Scored Metrics

Human rubric capture remains outside the game UI.

| Metric | Method |
| --- | --- |
| Class-fantasy clarity | Player/observer rates whether the deck felt like Aegis Guardian / Shield Wall and cites one observed moment. |
| Repetition fatigue | Same player repeats the seed set at least three times and rates fatigue after the final run. |
| Meaningful-choice quality | Observer marks whether automatic Slot Tension counts reflected real decisions or only obvious play. |
| Hazard-answer intent | Observer notes whether movement or mitigation was a deliberate answer to a visible pressure. |

Store one Markdown note per deck review under [deck-eval-notes](deck-eval-notes/) using the template in that directory. The filename convention is `YYYY-MM-DD-<deck-slug>-<seed-set>.md`, for example `2026-08-13-aegis-guardian-baseline.md`. The note must include the deck/resource under review, content fingerprint if available, seed labels, the `1` to `5` answers from the Design rubric, and the four required free-text notes.

## Focused Coverage

Preserve the existing probe suite. Add only focused coverage when a metric becomes a durable contract:

1. `deck_eval_baseline`: generates fixed-seed Encounter Records for the current two-card deck and asserts report rows exist for viability basics.
2. `deck_eval_scorecard_report`: verifies report grouping by content fingerprint, seed/scenario label, and deck-evaluation section once reporting support lands.
3. Extend the future `whelp_clear` and `slow_top_card_cleanup` scenarios to emit enough Encounter Record evidence for minions-cleared and charge-efficiency checks.

Do not make these probes default until the scenario data and report fields are deterministic.

## Minimal Engineering / Reporting Gaps

1. Add a scenario/run label to Encounter Records or the aggregate report command.
2. Add report aggregation for boss damage dealt, damage prevented, Rounds survived, outcome by seed, and content fingerprint.
3. Add per-Round hand/Slot summaries sufficient for dead-draw, charge-efficiency, and Slot Tension proxies.
4. Add board-pressure facts for Minion clears and Hazard answers only when those rules are supported by `EncounterEngine`.
5. Keep human play-feel rubric storage as Markdown notes; no HUD changes and no analytics backend.

## Acceptance For The Backlog Item

The first implementation pass is complete when QA can run one command or short documented sequence that:

- creates fixed-seed Encounter Records for the current deck;
- produces an aggregate report with viability basics;
- links the report to a completed human rubric note under [deck-eval-notes](deck-eval-notes/);
- leaves existing probes green.
