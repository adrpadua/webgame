# Define Safe Ledger Archive Contract

Status: resolved
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

The initial contract is in `docs/artifacts/coordination-history/README.md`. It defines the trigger, append-only filename and link shape, live/archive boundary, reverse-dependency sweep, recorded pre-move evidence, and independent reviewer roles.

All required independent reviews passed without an authority, recovery, historical-lookup, or safety objection:

- Test Automation: `docs/artifacts/handoff-packets/ledger-archive-contract-qa-review/`
- UI/UX: `docs/artifacts/handoff-packets/ledger-archive-contract-ui-review/revisions/0002/`
- Architecture: `docs/artifacts/handoff-packets/ledger-archive-contract-architecture-review/`
- Game Design: `docs/artifacts/handoff-packets/ledger-archive-contract-design-review/`
- Product Management: `docs/artifacts/handoff-packets/ledger-archive-contract-pm-review/`

The manual archive operation is released to issue 02. It remains a separate, packet-backed change with fresh movement-time evidence and later independent Test Automation verification.
