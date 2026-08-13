# Apply Ledger Tiering And Routing

Status: resolved
Owner: Coordinator
Blocked by: none; issue 01 resolved after PM and Test Automation re-review.

## Outcome

Update the coordination ledger and the minimum supporting contracts so each active handoff can record tier, reason, validators, evidence links, temporary ownership, and any coordinator-rerun exception without duplicating the underlying validation contracts.

## Canonical Sources

- `docs/artifacts/project-coordination.md`
- `docs/artifacts/probe-harness.md`
- `docs/agents/engineering-enablement.md`
- `docs/agents/issue-tracker.md`
- Approved proposal 02

## Required Handoff

Architecture, Test Automation, UI/UX, and Game Design must verify that the new ledger shape does not redefine their canonical contracts. Example rows must include at least one Tier 2 closure without an unrecorded routine third execution and one Tier 3 closure with a recorded coordinator rerun.

## Non-Goals

No duplicate probe contracts in the ledger. No retroactive rewriting of unrelated historical rows beyond the minimum needed for consistency. No generic dashboard or analytics layer.

## Acceptance

The ledger stays an index and handoff record only, records tier and rerun data explicitly, and preserves the approved exception model for failed, conflicting, incomplete, flaky, or milestone-gated evidence.

## Comments

2026-08-13 — Coordinator opened the bounded review. Proposed future-only ledger fields are validation tier, tier reason, required validators/verdicts, evidence links or commands/results, and coordinator-rerun status with reason/command/result when applicable. Existing owner, prerequisite, dependent task, affected files/contracts, canonical source, last-verified timestamp, and the dedicated temporary-ownership table remain. Architecture, Test Automation, UI/UX, and Design are reviewing this shape before any ledger examples are added. Current closure behavior remains authoritative until the full delivery slice closes.

2026-08-13 — Independent contract reviews passed. Architecture required `Evidence links / commands / results` wording, explicit validator-plus-verdict states, and open evidence routes. Test Automation required future-only activation wording and concise evidence. UI/UX required `and/or` evidence wording and no detailed contract content. Design required `required-pending` versus `completed` rerun states and `current verdicts` for active rows. The ledger now records the reconciled, pending-activation field shape and three required example types. Coordinator rerun evidence for the Tier 3 new-probe example remains the next closure gate.

2026-08-13 — Closure evidence: Architecture, Test Automation, UI/UX, and Design each returned PASS on the reconciled ledger-only shape. The Tier 2 example records independent review without a routine coordinator rerun. The Tier 3 new-probe example records the coordinator rerun: `powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\debug\\run_probes.ps1 -Probe records,deck_eval_report` emitted `ENCOUNTER_RECORD_PROBE_OK`, `DECK_EVAL_REPORT_PROBE_OK cohorts=3 labels=baseline-a,baseline-b,baseline-c`, and `PROBE_SUITE_OK count=2`. The open-evidence example names the owner, canonical-source link, and Test Automation retest route. Current closure behavior remains authoritative until the full delivery slice closes.
