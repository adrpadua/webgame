# Verify Controlled Cohort Evidence

Status: ready-for-agent
Owner: Test Automation
Blocked by: 01

## Outcome

Independently verify the controlled cohort’s exact deck composition, one-fingerprint fixed-seed records, and canonical report linkage.

## Canonical Sources

- `docs/artifacts/deck-evaluation-measurement-plan.md`
- `docs/artifacts/encounter-records.md`
- `docs/artifacts/probe-harness.md`
- `.scratch/controlled-aegis-test-deck-evaluation/issues/01-provide-evaluation-only-deck-configuration.md`

## Required Handoff

Return focused commands/results for the controlled cohort, the exact label/seed/fingerprint evidence, and a scope check that the live/default starter deck remains unchanged. Hand the verified packet to Design.

## Non-Goals

No scoring, product recommendation, content tuning, broad sweep, or UI evaluation.

## Acceptance

QA can prove the exact 20-card list and evaluation-only boundary, report artifacts link every fixed-seed run under one unchanged fingerprint, and no default-deck mutation or unsupported claim appears.
