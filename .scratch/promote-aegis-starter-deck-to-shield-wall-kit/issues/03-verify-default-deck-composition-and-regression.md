# Verify Default-Deck Composition and Focused Regression

Status: resolved
Owner: Test Automation

## Outcome

Independently prove the live/default deck is exactly `8/6/2/2/2`, its identity is distinct from any evaluation-only fixture, and focused deterministic regressions show no unrelated rules drift.

## Canonical Sources

- Approved product proposal 04
- `docs/artifacts/probe-harness.md`
- `docs/artifacts/project-coordination.md`
- Architecture handoff from issue 02

## Acceptance

Return commands/results for exact default resource composition plus the focused existing regression set. State clearly whether any retained evaluation resource is non-default and whether it is still needed for reproducibility.

## Non-Goals

No balance conclusion, broad seed sweep, human playtest, UI change, or mutation of production content.

## Independent Verification

Test Automation PASS: `content,starter_deck_promotion` produced `CONTENT_VALIDATION_OK resources=34 negative_contract=ok`, `STARTER_DECK_PROMOTION_PROBE_OK labels=starter-promotion-a,starter-promotion-b,starter-promotion-c`, and `PROBE_SUITE_OK count=2`. `riposte,parity,records,record_scene` produced all four expected markers with count `4`; optional `riposte_live` passed with count `1`.

QA independently confirmed that the Encounter-owned default is exactly `8x steady_strike`, `6x iron_guard`, `2x sweeping_blow`, `2x fortify`, and `2x shield_slam`; the controlled fixture remains explicitly evaluation-only/historical-repro; post-promotion metadata cannot reuse historical `baseline-*` or `controlled-*` meaning; and the bounded regression showed no UI, rules, boss-program, pacing, seed, or hand-order drift. `docs/artifacts/probe-harness.md` is consistent. No blocker.
