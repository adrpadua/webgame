# Define Safe Ledger Archive Contract

Status: completed-pending-independent-review
Owner: Orchestrator

## Outcome

Define the smallest archive file naming, append-only content boundary, live-link format, trigger check, and safe manual movement procedure. Do not archive or compact the ledger in this issue.

## Required Review

Architecture reviews durability/recovery implications; Test Automation reviews reproducible link/threshold checks; Design and UI/UX review historical lookup needs; PM confirms intake/authority boundaries remain unchanged.

## Canonical Sources

- Approved proposal 06
- `docs/artifacts/project-coordination.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/engineering-enablement.md`
- `docs/agents/recovery-kit.md`

## Acceptance

The contract identifies exactly what remains live, what qualifies for archive, how links remain durable, and how a coordinator proves no active row is moved. It names focused validation and the independent reviewers.

## Non-Goals

No content movement, auto-archival, rules/UI/probe contract duplication, or change to approval authority.

## Coordinator completion

The initial contract is in `docs/artifacts/coordination-history/README.md`. It defines the trigger, append-only filename and link shape, live/archive boundary, reverse-dependency sweep, recorded pre-move evidence, and independent reviewer roles. No archive content has moved. Architecture, Test Automation, Design, UI/UX, and PM review remain required before this issue can resolve and release manual archive issue 02.
