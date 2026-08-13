# Provide Evaluation-Only Deck Configuration

Status: implemented-pending-qa
Owner: Architecture

## Outcome

Implement the smallest reversible configuration that runs the documented controlled deck without changing gameplay rules. Proposal 04 has separately promoted the same list to live/default; this resource remains an evaluation-only historical/repro fixture and must not be represented as the sole or current default deck.

## Canonical Sources

- `docs/content/heroes/aegis-guardian-design.md`
- `docs/rules/character-design-bible.md`
- `docs/artifacts/encounter-records.md`
- `docs/artifacts/probe-harness.md`
- Approved product proposal 03

## Required Handoff

Name the exact non-default resource/configuration path, prove the exact `8/6/2/2/2` composition, and register only the focused controlled-cohort path needed for canonical reports. Test Automation independently verifies. Record any temporary shared-file ownership in the coordination ledger.

## Non-Goals

No additional default encounter/starter-deck edit under proposal 03, balance/card-value/encounter tuning, forced order, hand guarantee, broad analytics, HUD change, or general deck system.

## Acceptance

The controlled configuration is clearly evaluation-only, uses exactly 20 cards with the approved identities/counts, preserves the live starter deck unchanged, and produces deterministic inputs consumable by the existing Encounter Record/report flow.

## Architecture Handoff

Implemented evaluation-only configuration path: `resources/decks/evaluation/aegis_controlled_test_deck.tres`.

The resource wraps the live `embermaw_prototype` Encounter for content identity and uses the approved 20-card candidate only in the controlled evaluation cohort: `8x steady_strike`, `6x iron_guard`, `2x sweeping_blow`, `2x fortify`, and `2x shield_slam`. It is not referenced by the live Encounter, content catalog, default starter deck, or player HUD.

Temporary Architecture ownership pending QA verification:

- `scripts/content/EvaluationDeckData.gd`
- `resources/decks/evaluation/aegis_controlled_test_deck.tres`
- `scripts/content/ContentValidator.gd`
- `scripts/debug/DeckEvalBaselineGenerator.gd`
- `scripts/debug/controlled_deck_eval_probe.gd`
- `scripts/debug/controlled_deck_eval_report_probe.gd`
- `scripts/debug/run_probes.ps1`
- `docs/artifacts/probe-harness.md`
- `docs/artifacts/deck-evaluation-measurement-plan.md`
- this issue file

Focused evidence:

- `run_probes.ps1 -Probe content` -> `CONTENT_VALIDATION_OK resources=34 negative_contract=ok`, `PROBE_SUITE_OK count=1`
- `run_probes.ps1 -Scenario controlled_deck_eval` -> `CONTROLLED_DECK_EVAL_PROBE_OK labels=controlled-a,controlled-b,controlled-c`, `PROBE_SUITE_OK count=1`
- `report_encounter_records.ps1` -> `ENCOUNTER_RECORD_REPORT_OK records=3 diagnostics=0`
- `run_probes.ps1 -Probe records,controlled_deck_eval_report` -> `ENCOUNTER_RECORD_PROBE_OK`, `CONTROLLED_DECK_EVAL_REPORT_PROBE_OK cohorts=3 labels=controlled-a,controlled-b,controlled-c`, `PROBE_SUITE_OK count=2`

Playtester retest dependency: the controlled cohort can reach a legal Riposte Ready -> Shield Slam flow without forced hand/order setup. The deterministic evaluation policy keeps Shield Slam as a payoff card when naturally drawn and fires it only through the normal `fire_slot` action while Riposte Ready is active. Current executable evidence is `controlled-a`: Shield Slam consumes `riposte_ready` in Quick and generates Boss damage `requested=5`, `base_amount=3`, `status_bonus=2`, `payoff_card_id=shield_slam`. `controlled-b` and `controlled-c` remain separate fixed-seed outcomes and are not required to demonstrate the payoff.

Non-goals preserved: no live/default starter-deck edit, no balance/card/encounter/seed/starting-hand/teaching-pacing change, no hand guarantee or forced order, no analytics/HUD/general deck system, and no rewrite of the closed live-baseline result.
