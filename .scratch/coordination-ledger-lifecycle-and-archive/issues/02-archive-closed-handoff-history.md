# Archive Closed Handoff History

Status: blocked
Owner: Orchestrator
Blocked by: 01

## Outcome

Perform the first manual append-only archival of eligible closed handoff detail, compact the live ledger to current operations, and retain durable links to the archive.

## Acceptance

All moved rows are terminal at movement time; active/blocked/awaiting-verification rows stay live; archive file naming/content follows issue 01; every compact live closure summary links to its preserved archive detail; line/byte threshold checks are recorded.

## Non-Goals

No deletion, automatic task, active-work archival, or second source for domain rules/contracts.
