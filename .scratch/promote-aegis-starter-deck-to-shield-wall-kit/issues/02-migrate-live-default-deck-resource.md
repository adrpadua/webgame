# Migrate the Live Default Deck Resource

Status: resolved
Owner: Architecture

## Outcome

Apply the exact approved five-identity list to the live/default encounter resource using the smallest content-only migration.

## Required Handoff

Identify the exact changed resource path, any retained evaluation-only resource and its historical/repro purpose, focused content/probe validation, and temporary shared-file ownership for any shared catalog or validation contract.

## Canonical Sources

- Approved product proposal 04
- `resources/encounters/embermaw_prototype.tres`
- Design handoff from issue 01
- `docs/artifacts/probe-harness.md`
- `docs/artifacts/project-coordination.md`

## Non-Goals

No change to card values, rules, boss program, seed, hand order, teaching pacing, HUD, or general deck system.

## Architecture Handoff

Changed live/default resource path:

- `resources/encounters/embermaw_prototype.tres`

The Encounter-owned `player_deck` now uses the approved twenty-card Shield Wall list: `8x steady_strike`, `6x iron_guard`, `2x sweeping_blow`, `2x fortify`, and `2x shield_slam`. No boss programs, encounter seed, starting hand, card values, rules, HUD, or pacing fields were changed.

Retained historical/repro fixture:

- `resources/decks/evaluation/aegis_controlled_test_deck.tres`

The evaluation fixture remains separate from the live Encounter resource and continues to represent proposal-03 controlled cohort history. Post-promotion evidence uses distinct labels `starter-promotion-a`, `starter-promotion-b`, and `starter-promotion-c` with `scenario_id: "starter_deck_promotion"` and `evaluation_purpose: "aegis_default_deck_promotion"`; it does not reuse historical `baseline-a/b/c` or `controlled-a/b/c` meaning.

Focused evidence:

- `run_probes.ps1 -Probe content,starter_deck_promotion` -> `CONTENT_VALIDATION_OK resources=34 negative_contract=ok`, `STARTER_DECK_PROMOTION_PROBE_OK labels=starter-promotion-a,starter-promotion-b,starter-promotion-c`, `PROBE_SUITE_OK count=2`
- `run_probes.ps1 -Probe riposte,parity,records,record_scene` -> `RIPOSTE_READY_PROBE_OK`, `LIVE_SDK_PARITY_OK`, `ENCOUNTER_RECORD_PROBE_OK`, `ENCOUNTER_RECORD_SCENE_PROBE_OK`, `PROBE_SUITE_OK count=4`
- Optional authored-path confirmation: `run_probes.ps1 -Probe riposte_live` -> `RIPOSTE_PRODUCTION_PATH_PROBE_OK`, `PROBE_SUITE_OK count=1`

Independent Test Automation verification passed: the exact default composition, fixture separation, distinct post-promotion metadata, and focused record/rule regressions all passed. Temporary Architecture ownership is released.
