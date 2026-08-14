# Deterministic Handoff Control Plane and Closure Gate

Status: active

## Approved outcome

Packet artifacts are the durable authority for handoff evidence; task messages notify recipients only. A deterministic validator blocks dependency advancement and milestone closure when packet evidence is missing or invalid, without automating agent messaging, reassignment, or issue mutations.

## Chosen durable layout

- Canonical packet root: `docs/artifacts/handoff-packets/<handoff-id>/`
- Required immutable packet files: `assignment.json`, `acknowledgment.json`, `completion.json`
- Optional immutable supersession pointer: `superseded_by.json`
- Optional immutable corrected packet set: `revisions/<revision-id>/assignment.json`, `acknowledgment.json`, `completion.json`
- Validator command: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\docs\artifacts\handoff-packets`

The packet root is repository-relative, readable from recovery, and independent of the compact live ledger. It retains terminal packet evidence; the ledger only indexes the current handoff/validator verdict. Proposal-06 archive movement does not relocate or rewrite packet artifacts.

Authoritative v1 format decision: Phase 0 uses immutable JSON packet files plus superseding revisions as the approved live contract. The later Markdown/YAML preference is deferred rather than migrated into this rollout, because the JSON model is already implemented, QA-verified, and in active advisory use.

## Sequence

1. Architecture defines the versioned packet schema and implements an advisory validator with concise human and JSON output.
2. Test Automation independently verifies all required passing/failing cases.
3. Coordinator records five advisory handoffs without unsafe advancement/closure, then switches the validator to mandatory mode only after QA PASS, recovery-doc review, and completion of all five valid pilots.

## Remaining closure criteria

Phase 0 is not complete until all of the following are true:

1. Five valid advisory handoffs exist under the approved v1 JSON packet contract.
2. Each counted pilot preserves separate implementation/verifier handoffs where applicable and shows no unsafe dependency advancement or milestone closure.
3. Test Automation has independent PASS evidence for the validator behavior and the advisory rollout state used to activate the gate.
4. Recovery and issue-tracker authority documents point to the same approved v1 packet contract and do not describe Markdown/YAML as the live Phase 0 format.
5. Only after items 1 through 4 are complete may the Orchestrator activate the mandatory dependency/closure gate.

## Non-goals

No gameplay/content/rules changes, Codex API dependency, automatic messaging/reassignment/status mutation, timeout rule, pre-commit/edit block, closed-history backfill, or replacement of risk-tier/independent-verification policy.

## Return protocol

Every owner uses the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet). The control plane augments that process; it does not replace role accountability.
