# Deterministic Handoff Control Plane and Closure Gate

Status: active

## Approved outcome

Packet artifacts are the durable authority for handoff evidence; task messages notify recipients only. A deterministic validator blocks dependency advancement and milestone closure when packet evidence is missing or invalid, without automating agent messaging, reassignment, or issue mutations.

## Chosen durable layout

- Canonical packet root: `docs/artifacts/handoff-packets/<handoff-id>/`
- Required immutable packet files: `assignment.json`, `acknowledgment.json`, `completion.json`
- Validator command: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\docs\artifacts\handoff-packets`

The packet root is repository-relative, readable from recovery, and independent of the compact live ledger. It retains terminal packet evidence; the ledger only indexes the current handoff/validator verdict. Proposal-06 archive movement does not relocate or rewrite packet artifacts.

## Sequence

1. Architecture defines the versioned packet schema and implements an advisory validator with concise human and JSON output.
2. Test Automation independently verifies all required passing/failing cases.
3. Coordinator records five advisory handoffs without unsafe advancement/closure, then switches the validator to mandatory mode only after QA PASS and recovery-doc review.

## Non-goals

No gameplay/content/rules changes, Codex API dependency, automatic messaging/reassignment/status mutation, timeout rule, pre-commit/edit block, closed-history backfill, or replacement of risk-tier/independent-verification policy.

## Return protocol

Every owner uses the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet). The control plane augments that process; it does not replace role accountability.
