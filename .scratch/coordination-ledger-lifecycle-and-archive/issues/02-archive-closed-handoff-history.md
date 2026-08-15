# Archive Closed Handoff History

Status: completed-pending-independent-verification
Owner: Orchestrator
Blocked by: none; awaiting issue 03 independent verification

## Outcome

Perform the first manual append-only archival of eligible closed handoff detail, compact the live ledger to current operations, and retain durable links to the archive.

## Acceptance

All moved rows are terminal at movement time; active/blocked/awaiting-verification rows stay live; archive file naming/content follows issue 01; every compact live closure summary links to its preserved archive detail; line/byte threshold checks are recorded.

## Non-Goals

No deletion, automatic task, active-work archival, or second source for domain rules/contracts.

## Coordinator completion

The first manual archive is [2026-08-15 closed handoffs 01](../../../docs/artifacts/coordination-history/2026-08-15-closed-handoffs-01.md). It preserves terminal and superseded historical coordination detail while the live ledger now has a compact archive index and current-work rows.

Movement-time evidence:

- Trigger: `224` physical lines and `92,648` bytes before compaction, exceeding both thresholds.
- Reverse dependency sweep: all non-terminal feature issues and current live rows were searched against the candidate subjects, delivery issue paths, packet IDs, and dependency names; no candidate remained a prerequisite/dependent or current work item.
- Current packet-root validation before movement: `HANDOFF_PACKET_VALIDATION_OK ... handoffs=24 errors=0`.
- Resulting live ledger: `192` physical lines and `73,801` bytes.

The Coordinator completion packet is `docs/artifacts/handoff-packets/ledger-archive-manual-migration-coordinator/`. Issue 03 must independently verify links, retained history, active-work retention, and the resulting routine-sweep surface before closure.
