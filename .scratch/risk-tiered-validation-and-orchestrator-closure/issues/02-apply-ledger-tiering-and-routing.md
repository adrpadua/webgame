# Apply Ledger Tiering And Routing

Status: ready-for-agent
Owner: Coordinator
Blocked by: 01

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
