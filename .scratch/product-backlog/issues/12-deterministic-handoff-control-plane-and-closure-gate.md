# Deterministic Handoff Control Plane and Closure Gate

Status: resolved

## Player Problem

Players and collaborators lose momentum when delivery work appears to finish, block, or wait on verification without a durable, checkable return path to the Orchestrator. Today, task messages can notify someone, but they are not a repo-backed control plane: they can be missed, are hard to recover from repository state alone, and do not give the Orchestrator a deterministic gate for dependency advancement or milestone closure.

That creates product risk even when implementation is correct: work can stall silently, dependent tasks can advance on incomplete evidence, and recovery from repo access alone is weaker than it should be.

## Desired Outcome

Establish a portable, repository-backed handoff control plane in which durable packet artifacts are authoritative and task messages are notifications only.

The Orchestrator should be able to assign work, receive acknowledgments, receive blocked/completed returns, and validate closure readiness from repository state alone. A deterministic validator must prevent dependency advancement and milestone closure when coordination evidence is incomplete or invalid.

## Problem Statement

The current sender/receiver contract is documented, but not yet enforced through one durable, versioned handoff artifact model. Workers can edit the repo or go idle without a reliably auditable return artifact. The Orchestrator therefore lacks one deterministic place to answer all of these questions:

- what exactly was assigned;
- whether the receiver explicitly acknowledged ownership;
- whether the work blocked or completed;
- what revision and dirty-worktree context the owner worked against;
- whether an independent verifier received a separate handoff;
- whether required evidence exists in the expected state; and
- whether a dependent task is actually safe to advance or close.

This proposal addresses that process gap without coupling coordination to Codex APIs or to gameplay implementation.

## Solution

Create one primary process seam:

- a versioned handoff-packet contract stored in the repository; and
- one validator/summary command that checks packet integrity, dependency readiness, and closure-gate compliance.

Task messages remain useful for fast notification, but the durable handoff packets become the authority for assignment, acknowledgment, blocked/completed return, and closure review.

The resulting promise is:

1. the Orchestrator can recover active ownership and return state from the repo alone;
2. workers can only advance a handoff through explicit documented states;
3. implementation and independent verification remain separate handoffs;
4. invalid or incomplete coordination evidence fails deterministically before dependency advancement or milestone closure; and
5. the system stays lightweight, repo-portable, and compatible with the approved archive and validation-closure processes.

## User Stories

1. As the Orchestrator, I can create one durable assignment packet for a bounded handoff so the receiver has an authoritative scope, evidence target, dependency context, and handoff ID.
2. As a recovered worker with repo access only, I can locate my assigned handoff packet, read its state and canonical sources, and understand what I own without relying on old chat history.
3. As a worker, I must publish an explicit acknowledgment packet before ownership transfers so assignment cannot be inferred from silence or repository edits alone.
4. As a worker, I can return a blocked result with concrete dependency or decision evidence so the Orchestrator can reroute safely without guessing my status.
5. As a worker, I can return a completed result with exact validation evidence and canonical-document updates so the Orchestrator can review closure from durable artifacts.
6. As the Orchestrator, I can distinguish an implementation handoff from an independent-verification handoff so completion of one does not silently satisfy the other.
7. As an independent verifier, I receive my own handoff ID, revision context, and evidence target so verification is auditable as separate work rather than folded into implementation.
8. As the Orchestrator, I can see base revision, verified revision, and dirty-worktree summary in every relevant packet so I can judge whether evidence was produced against the intended repository state.
9. As the Orchestrator, I can run one validator/summary command and receive both a concise human report and machine-readable JSON so I can gate advancement and closure consistently.
10. As the Orchestrator, I am blocked from advancing a dependent task when the handoff chain is structurally invalid, missing required evidence, written by the wrong role, or stuck behind an unresolved dependency.
11. As Test Automation, I can independently verify the validator’s external behavior so the closure gate itself has deterministic evidence before it becomes mandatory.
12. As PM and the user, we preserve approved product/process authority because the control plane records delivery state only; it does not redefine product intent, approvals, or canonical gameplay/UI/rules documents.
13. As a recovery operator, I can reconstruct active assignment state, acknowledgment state, blocker state, and completion state from repository artifacts alone after losing access to a machine.
14. As an auditor, I can detect duplicate handoff IDs, invalid state transitions, missing terminal retention, and other coordination integrity failures without rerunning gameplay probes.
15. As the Orchestrator, I can use advisory mode for the first five eligible new handoffs so the team can learn the workflow before the validator becomes a mandatory closure gate.
16. As the user, I can direct an emergency override explicitly, have that exception recorded in the packet fields, and still preserve a durable audit trail rather than bypassing the control plane invisibly.

## Implementation Decisions

These decisions are already approved and are not open for PM re-tradeoff:

1. The control plane is repository-backed and portable; task messages are notifications only, while durable packet artifacts are authoritative.
2. The primary seam is a versioned handoff-packet contract plus one validator/summary command.
3. The solution must not depend on Codex APIs and must not require gameplay-code changes.
4. Durable handoff directories live under the coordination handoff area in the repository.
5. Phase 0 authoritative packets use immutable JSON files. A later Markdown-plus-YAML-front-matter preference is treated as a deferred future-format option rather than the live v1 rollout format.
6. The Orchestrator writes the assignment packet.
7. The receiving worker writes the acknowledgment and append-only return packets.
8. In Phase 0, append-only return behavior is modeled by immutable `assignment.json`, `acknowledgment.json`, and terminal `completion.json` files, plus immutable superseding revisions when correction is necessary.
9. Stable handoff IDs are composed from feature, issue, sender, receiver, and sequence.
10. The first contract version is `schema_version: 1`.
11. Packets must record base revision, verified revision where applicable, and a dirty-worktree summary.
12. State flow is deterministic: `assigned -> acknowledged -> blocked | completed`.
13. Remediation or retest creates a new handoff ID rather than mutating a prior terminal handoff into a new workstream.
14. Implementation and independent verification are always separate handoffs.
15. The validator checks structure, required fields, state transitions, evidence presence, allowed writer roles, dependency gates, duplicate IDs, revision context, and terminal-packet retention. It does not rerun gameplay probes.
16. The validator emits a concise human summary, JSON output, and a nonzero exit status for invalid packets or blocked transitions.
17. Workers must attest that they notified the Orchestrator and must provide the return-packet path.
18. The Orchestrator owns routing, escalation, dependency advancement, and state changes based on packet evidence.
19. Test Automation independently verifies the validator before the closure gate becomes mandatory.
20. Rollout is advisory for five new handoffs, then mandatory after independent Test Automation evidence.
21. The workflow applies to new handoffs immediately and to active work at its next state change; it does not backfill already closed history.
22. Terminal packets are retained and may be archived only through the approved coordination-history process.
23. Override is allowed only for explicit user-directed emergency work with recorded exception fields.
24. The implemented JSON-plus-supersession model is approved as the authoritative v1 packet shape for Phase 0 because it already satisfies the durable control-plane goals, is machine-validatable, and is backed by live QA evidence and active advisory pilots. A Markdown/YAML migration is out of scope for this rollout and may only return later as a separate format change after Phase 0 closes.

## Testing Decisions

Testing for this process change is based on external behavior, not internal implementation shape.

1. The validator must accept a valid implementation-to-independent-verifier flow where assignment, acknowledgment, completion, evidence links, revision context, and separate verifier routing are all present.
2. The validator must fail deterministically for a missing required field.
3. The validator must fail deterministically for an invalid state transition.
4. The validator must fail deterministically for a duplicate handoff ID.
5. The validator must fail deterministically when required evidence is missing.
6. The validator must fail deterministically when a packet is authored by the wrong writer role for that state.
7. The validator must fail deterministically when revision context is missing or inconsistent with the packet contract.
8. The validator must fail deterministically when a dependent handoff attempts to advance across an unresolved blocked dependency.
9. The validator must fail deterministically when terminal retention expectations are violated.
10. Every validation run must emit both concise human-readable output and JSON output with the correct exit status.
11. The first five advisory handoffs must be captured without allowing unsafe dependency advancement or milestone closure.
12. Independent Test Automation evidence is required before the validator changes from advisory to mandatory closure-gate behavior.
13. Recovery behavior must be proven by giving a fresh role only repository access plus its prompt and verifying it can locate, acknowledge, return, and validate a handoff from repo artifacts alone.

## Acceptance Evidence

Before delivery can close, evidence must show that:

1. A valid implementation-to-verifier handoff flow passes end to end with separate durable packets for assignment, acknowledgment, and completion.
2. Invalid examples fail for each required category: missing field, invalid state, duplicate ID, missing evidence, wrong writer, revision-context mismatch, blocked dependency, and terminal-retention violation.
3. The validator produces both human and JSON outputs and returns the correct exit status for pass/fail cases.
4. Five advisory-mode handoffs are recorded without unsafe dependency advancement or milestone closure.
5. Test Automation independently verifies the validator before mandatory closure-gate behavior is turned on.
6. Recovery docs and prompts enable a fresh role to locate, acknowledge, return, and validate a handoff using repository state alone.

## Explicit Non-Goals

- Game-rule, encounter, card, deck, or production gameplay changes.
- Player-facing UI/content changes outside the coordination artifacts required by this process.
- Any dependency on Codex APIs or automatic task-message sending.
- Automatic reassignment, agent messaging, or issue-status mutation by the validator.
- A mandatory wall-clock failure rule; advisory `next_check_at` guidance and Orchestrator judgment remain sufficient.
- A pre-commit hook or edit-blocking workflow.
- Historical backfill of already closed handoffs.
- Replacement of the approved risk-tiered validation policy or independent-verification policy.

## Affected Areas

| Area | Process impact |
| --- | --- |
| Product Management | Preserves approved product/process authority while giving delivery a deterministic closure gate. |
| Orchestrator | Becomes the durable routing and closure authority for packet state, dependency advancement, and emergency override recording. |
| Architecture | Likely owns or reviews the repository seam for packet storage, revision context, and validator integration without changing gameplay code. |
| Test Automation | Independently verifies validator behavior and preserves deterministic evidence standards. |
| Game Design | Unchanged as rules authority, but benefits from stronger recovery and cleaner closure evidence. |
| UI/UX | Unchanged as presentation authority, but benefits from deterministic handoff/verification state and recovery. |
| Engineering Enablement | Natural bounded delivery surface because the work spans reusable coordination, validation, and reporting contracts. |

## Canonical Documents To Consult Or Update

- [Issue tracker](../../../docs/agents/issue-tracker.md)
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md)
- [Recovery kit](../../../docs/agents/recovery-kit.md)
- [Engineering Enablement operating contract](../../../docs/agents/engineering-enablement.md)
- [Risk-Tiered Validation and Orchestrator Closure](02-risk-tiered-validation-and-orchestrator-closure.md)
- [Coordination Ledger Lifecycle and Archive](06-coordination-ledger-lifecycle-and-archive.md)

## Dependencies And Risks

- This proposal depends on preserving the approved risk-tiered validation boundary rather than replacing it with a new closure policy.
- This proposal depends on preserving the approved coordination-history archive boundary rather than creating a second competing history system.
- If packet authoring is too heavy, workers may bypass it; delivery should keep the contract minimal while preserving determinism.
- If the validator becomes a hidden implementation authority, it could drift into workflow automation beyond the approved scope.
- If revision-context requirements are too weak, the closure gate may approve evidence produced against the wrong repo state.

## Open Product Or Process Decisions

None. The user-approved outcome, scope, non-goals, acceptance evidence, and rollout rules are settled.

Delivery-only choice for the Orchestrator: select the smallest durable directory layout and exact validator/summary command name that satisfy the approved packet contract, recovery model, and archive/retention rules.

## Further Notes

- This is a process/control-plane proposal, not a gameplay or UI proposal.
- The approved sender/receiver communication contract stays in force; this work makes that contract durable and validator-checkable.
- The validator is a gate on coordination integrity, not a new gameplay test runner.
- Historical chat can help operators, but repository artifacts must remain sufficient for recovery.
- Authoritative v1 packet shape for Phase 0:
  - root: `docs/artifacts/handoff-packets/<handoff-id>/`
  - immutable packet files: `assignment.json`, `acknowledgment.json`, `completion.json`
  - optional immutable correction pointer: `superseded_by.json`
  - optional immutable corrected packet set: `revisions/<revision-id>/assignment.json`, `acknowledgment.json`, `completion.json`
  - separate implementation and independent-verification work always use separate `handoff_id` packet roots
- This preserves the approved append-only intent semantically: terminal evidence is never rewritten in place, and malformed packets are corrected through superseding immutable revisions rather than mutation.

## Approval Record

User approval was explicit in the attached request on Friday, August 14, 2026. The user directed PM to create and publish this proposal as `ready-for-agent` without reopening product decisions, then hand the exact path to the Orchestrator for delivery planning.

Later on Friday, August 14, 2026, the user granted standing approval for PM to resolve every remaining process decision required to finish Phase 0. PM therefore confirms that the implemented JSON-plus-supersession packet model is the authoritative v1 rollout contract for Proposal 12, and that the earlier Markdown/YAML preference does not supersede the live Phase 0 format.
