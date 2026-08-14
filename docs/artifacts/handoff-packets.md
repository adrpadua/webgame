# Handoff Packets

Status: approved v1 packet contract for Proposal 12. Rollout remains advisory until five valid pilot handoffs close and the coordinator records mandatory-gate activation.

Handoff packets are immutable repository evidence for assignment, acknowledgment, and completion. Task messages notify people; packet files are the durable authority that recovery, QA, and the coordinator can validate later.

Phase 0 authoritative format decision: packet v1 uses immutable JSON files plus immutable superseding revisions. A previously discussed Markdown-plus-YAML-front-matter shape is not the live Phase 0 contract. It is deferred as a possible future-format migration only after Proposal 12 closes and only through a separate approved change.

## Canonical Layout

Authoritative packets live at:

```text
docs/artifacts/handoff-packets/<handoff-id>/assignment.json
docs/artifacts/handoff-packets/<handoff-id>/acknowledgment.json
docs/artifacts/handoff-packets/<handoff-id>/completion.json
```

The coordination ledger indexes packet verdicts and links. It does not replace the packet files or duplicate their contents. Proposal-06 archive work must not move, rewrite, or compact this packet root.

This JSON contract is considered semantically equivalent to the approved append-only return intent for Phase 0 because:

- each packet file is immutable evidence;
- terminal return state is captured in `completion.json` rather than rewritten status prose;
- malformed packets are corrected through immutable superseding revisions rather than in-place edits; and
- the validator can deterministically enforce structure, writer, dependency, and retention rules.

## Superseding A Malformed Packet

Packet files are immutable evidence. Do not edit or delete a malformed packet after it has been handed off. Correct it by adding:

```text
docs/artifacts/handoff-packets/<handoff-id>/superseded_by.json
docs/artifacts/handoff-packets/<handoff-id>/revisions/<revision-id>/assignment.json
docs/artifacts/handoff-packets/<handoff-id>/revisions/<revision-id>/acknowledgment.json
docs/artifacts/handoff-packets/<handoff-id>/revisions/<revision-id>/completion.json
```

`superseded_by.json` is a small pointer that preserves the original root files as historical evidence and names the active corrected revision. It requires:

- `schema_version`: `1`
- `packet_type`: `supersession`
- `handoff_id`: stable ID matching the packet directory
- `revision`: integer revision of the supersession pointer
- `state`: `superseded`
- `writer_role`
- `created_at`
- `supersedes`: usually `.`
- `active_revision`: relative child path such as `revisions/0002`
- `reason`

When `superseded_by.json` exists, the validator follows `active_revision` and validates that packet set as the handoff authority. The malformed root files remain retained for audit and are not rewritten. The active revision must still satisfy schema v1 without relaxed fields or alternate states.

This supersession model is the approved append-only correction path for Phase 0. Do not replace it with in-place edits or alternate sidecar formats during the current rollout.

## Schema V1

All packets include:

- `schema_version`: `1`
- `packet_type`: `assignment`, `acknowledgment`, or `completion`
- `handoff_id`: stable ID matching the packet directory
- `revision`: integer revision of that immutable packet file
- `state`: packet lifecycle state
- `writer_role`: role that authored the packet
- `created_at`: ISO-8601 timestamp

`assignment.json` additionally requires:

- `owner`
- `canonical_issue`
- `objective`
- `non_goals`
- `expected_writers`: object with `assignment`, `acknowledgment`, and `completion`
- `dependencies`: array of `{ "id": "...", "state": "satisfied|blocked|pending" }`
- `required_evidence`
- `next_owner`

`acknowledgment.json` additionally requires:

- `assignment_revision`
- `owner`
- `scope_confirmed`
- `planned_paths`
- `first_validation`
- `next_owner`

`completion.json` additionally requires:

- `assignment_revision`
- `acknowledgment_revision`
- `outcome`
- `changed_paths`
- `validation`: non-empty array
- `evidence`: non-empty array
- `next_owner`
- `requested_action`

Valid packet states are:

- assignment: `assigned`
- acknowledgment: `acknowledged`
- completion: `completed`, `blocked`, or `needs-decision`

Revision fields bind later packets to the exact assignment or acknowledgment being answered. A completion packet is terminal evidence, so `assignment.json` and `acknowledgment.json` must remain present after completion.

## Advisory Validator

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\docs\artifacts\handoff-packets
```

The validator is read-only during advisory rollout. It emits concise human output plus one `HANDOFF_PACKET_VALIDATION_JSON` line, exits `0` when every packet is valid, and exits `1` when it finds any error. It never sends messages, reassigns owners, mutates issue status, edits the ledger, moves archives, backfills history, or blocks commits.

The mandatory dependency/closure gate activates only after:

1. five valid advisory pilot handoffs are recorded;
2. Test Automation has independent PASS evidence for validator behavior and the counted rollout state; and
3. recovery and issue-tracker authority docs still match this approved v1 contract.

Error codes are stable for QA and recovery:

- `missing-field`
- `invalid-state`
- `duplicate-ID`
- `missing-evidence`
- `wrong-writer`
- `revision-context`
- `blocked-dependency`
- `terminal-retention`

Fixture packets under `scripts/debug/fixtures/handoff-packets/` are non-authoritative validator test data.
