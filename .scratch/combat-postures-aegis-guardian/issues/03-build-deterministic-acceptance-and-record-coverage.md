# Build Deterministic Acceptance And Record Coverage

Status: resolved
Owner: QA Automation
Blocked by: 01, 02

## Outcome

Provide focused deterministic replay/probe evidence for every approved Riposte Ready rule and its Encounter Record facts, while preserving existing probes and catalog semantics.

## Canonical Sources

- `docs/artifacts/probe-harness.md`
- `docs/artifacts/encounter-records.md`
- Confirmed rule contract from issue 01
- Architecture seam from issue 02

## Coverage Matrix

- qualifying grant and visible reason;
- each non-grant condition;
- non-stack and non-refresh;
- Instant Row and Incoming Row timing;
- expiry at the first following Quick Window end;
- legal Shield Slam consumption and normal damage plus `2`;
- illegal/non-Shield-Slam actions do not consume;
- normalized trigger, expiry, consumption, and damage Resolution Facts;
- replay equality and existing rules, records, parity, UI, and accessibility regressions.
- production-resource reachability using actual `embermaw_embers.tres`: begin at Ember Pattern Loadout with two Iron Guards available, remain in Guarded Front, charge Iron Guard during Quick to reach 4 Armor, resolve the authored Incoming Raking Claw, and assert Riposte Ready grant plus authored Beat/track facts.

## Non-Goals

No test-authored rules, broad harness rewrite, analytics scoring, or UI implementation.

## Acceptance

Exact commands and markers are reproducible by Architecture and the coordinator; failures retain actionable rule/step diagnostics.

## Ownership And Current State

Architecture implements the remaining production-resource scenario because it extends the engine-facing probe/scenario seam. QA Automation independently verifies the scenario and owns the final issue-03 verdict. No live resource, deck, seed, starting hand, Armor rule, or product outcome may change for this scenario.

The synthetic rule/fact/replay coverage and existing regressions have independently passed. Final closure is pending only the production-resource Ember Pattern scenario and QA recheck.

## Comments

- 2026-08-13T14:32:56-07:00: QA independently passed synthetic fact/replay coverage and the focused production-resource scenario. The latter loads the actual Embermaw prototype Encounter, Ember Pattern, and Iron Guard resources; proves the authored Incoming 4-damage Tank Hit path with deterministic probe-only hand setup; and changes no live resource, rule, deck, seed, or starting hand. Issue 03 is resolved and issue 04 is unblocked.
