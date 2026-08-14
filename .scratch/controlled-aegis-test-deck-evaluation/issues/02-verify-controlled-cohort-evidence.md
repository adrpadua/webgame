# Verify Controlled Cohort Evidence

Status: resolved
Owner: Test Automation

## Outcome

Independently verify the controlled cohort’s exact deck composition, one-fingerprint fixed-seed records, and canonical report linkage.

## Canonical Sources

- `docs/artifacts/deck-evaluation-measurement-plan.md`
- `docs/artifacts/encounter-records.md`
- `docs/artifacts/probe-harness.md`
- `.scratch/controlled-aegis-test-deck-evaluation/issues/01-provide-evaluation-only-deck-configuration.md`

## Required Handoff

Return focused commands/results for the controlled cohort, the exact label/seed/fingerprint evidence, and a scope check that the controlled resource remains a distinct evaluation-only historical/repro fixture. Proposal 04 has separately promoted the same list to the live/default starter deck, so do not require or claim that the default remains `10x/10x`. Hand the verified packet to Design.

## Non-Goals

No scoring, product recommendation, content tuning, broad sweep, or UI evaluation.

## Acceptance

QA can prove the exact 20-card list and evaluation-only fixture boundary, report artifacts link every fixed-seed run under one unchanged fingerprint, and the packet does not blur historical baseline, controlled-cohort, and promoted-default evidence.

## QA Verification Failure

This is a validation-contract failure, not a gameplay, content, or rules failure.

- `controlled_deck_eval` still asserts the superseded pre-proposal-04 condition that the live default remains `10x steady_strike / 10x iron_guard`.
- `records` no longer retains valid records while skipping the expected malformed/unsupported fixtures.
- `controlled_deck_eval_report` assumes the report root contains exactly three records and that every record uses the evaluation fixture; promoted-default records now coexist legitimately.

Architecture must scope controlled probe/report assertions to their generated cohort only. Preserve exact `8/6/2/2/2` fixture composition, one stable controlled fingerprint, `controlled-a/b/c` labels, legal Riposte Ready -> Shield Slam evidence, and distinct historical/repro identity from baseline and `starter-promotion-*` records. QA reruns the three-command packet after that handoff.

## Remediation Handoff

Architecture reports the focused correction is complete: controlled validation now scopes to generated controlled records, asserts the fixture and distinct `controlled-a/b/c` identity, and no longer asserts the superseded `10x/10x` default premise. Owner serial evidence passed `controlled_deck_eval`, report generation, `records,controlled_deck_eval_report`, and `content`. Test Automation is independently rerunning that packet before this issue can close.

## QA Re-Verification Update

The controlled-specific acceptance now passes: scenario, report filter, exact fixture, distinct `controlled-a/b/c` identity, and legal Riposte -> Shield Slam payoff are clean. The remaining FAIL is only generic `records`: `scripts/debug/encounter_record_probe.gd` still expects exactly three valid aggregate records although the shared root correctly contains six valid records and two expected malformed/unsupported diagnostics. Architecture owns that generic aggregate assertion correction; QA then reruns the full serial packet. Design review remains paused until the complete QA packet is green.
