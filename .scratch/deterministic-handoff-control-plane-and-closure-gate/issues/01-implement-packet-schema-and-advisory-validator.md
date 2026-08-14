# Implement Packet Schema and Advisory Validator

Status: completed-pending-qa-supersession-review
Owner: Architecture

## Outcome

Implement versioned repository-backed assignment/acknowledgment/completion packets and an advisory deterministic validator at the delivery spec's chosen root/command. Emit concise human output and machine-readable JSON with correct exits; do not mutate statuses or messages.

## Canonical sources

- `docs/agents/issue-tracker.md`
- `docs/agents/recovery-kit.md`
- `docs/agents/engineering-enablement.md`
- `docs/artifacts/project-coordination.md`
- approved proposals 02, 06, and 12

## Required validation

Cover valid flow and missing-field, invalid-state, duplicate-ID, missing-evidence, wrong-writer, revision-context, blocked-dependency, and terminal-retention failures.

## Non-goals

No automatic coordination action, backfill, pre-commit hook, timeout, or policy replacement.

## Required return

Return packet schema/paths, validator command/evidence, canonical doc updates, and QA handoff.

## Completion

Architecture implemented schema v1 in `docs/artifacts/handoff-packets.md`, added the advisory validator at `scripts/debug/validate_handoff_packets.ps1`, created the canonical packet root, and added five non-authoritative fixture handoffs under `scripts/debug/fixtures/handoff-packets/`.

Validation:

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\scripts\debug\fixtures\handoff-packets\valid` -> `HANDOFF_PACKET_VALIDATION_OK root=...\valid handoffs=1 errors=0`
- invalid fixture harness -> expected validator exit `1`, surfaced `missing-field`, `invalid-state`, `duplicate-ID`, `missing-evidence`, `wrong-writer`, `revision-context`, `blocked-dependency`, and `terminal-retention`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\docs\artifacts\handoff-packets` -> `HANDOFF_PACKET_VALIDATION_OK root=...\docs\artifacts\handoff-packets handoffs=0 errors=0`

Non-goals preserved: no automatic messaging, reassignment, status mutation, timeout, precommit hook, backfill, policy replacement, or proposal-06 archive movement.

## Supersession Amendment

First advisory pilot `pilot-01-mobile-safe-bounds-ui` exposed a malformed-packet correction gap. Architecture chose the immutable supersession path: keep the original root packet files as historical evidence, add `superseded_by.json`, and validate the corrected active packet set under `revisions/0002/`.

Validation:

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\docs\artifacts\handoff-packets` -> `HANDOFF_PACKET_VALIDATION_OK root=...\docs\artifacts\handoff-packets handoffs=1 errors=0`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\scripts\debug\fixtures\handoff-packets\valid` -> `HANDOFF_PACKET_VALIDATION_OK root=...\valid handoffs=1 errors=0`
- invalid fixture harness retained expected validator exit `1` and required error-code coverage.

Original malformed `assignment.json`, `acknowledgment.json`, and `completion.json` remain at `docs/artifacts/handoff-packets/pilot-01-mobile-safe-bounds-ui/`; no product, UI, rule, ledger-history, or archive behavior changed.
