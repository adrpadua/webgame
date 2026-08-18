# Agent Recovery Kit

## Purpose

Restore the project operating model when only the repository is available. This guide is evergreen: it tells a new agent where to find live state. It is not a project-status snapshot and it does not replace a canonical rule, design, UI, architecture, or validation document.

## Durable sources

Read these sources before recreating work. Treat repository files as authoritative; task IDs and chat history are convenience only.

| Need | Source |
| --- | --- |
| Game vocabulary and confirmed rules | [CONTEXT.md](../../CONTEXT.md) |
| Durable technical decisions | [ADRs](../adr/) |
| Reusable game rules and player-card authoring | [rules documentation](../rules/) |
| Current cross-role state, handoffs, shared ownership, and open questions | [project-coordination.md](../artifacts/project-coordination.md) |
| Durable assignment, acknowledgment, and completion packet evidence | [handoff-packets.md](../artifacts/handoff-packets.md) and `docs/artifacts/handoff-packets/<handoff-id>/` |
| Product proposals and approval state | [product backlog](../../.scratch/product-backlog/) and [issue workflow](issue-tracker.md) |
| Feature delivery state | `.scratch/<feature>/spec.md` and `issues/` for each active effort |
| Game content and supported authoring surface | [content documentation](../content/), [design-team handoff](../content/design-team-handoff.md), and relevant `data/` JSON files (`resources/` is the frozen Godot reference) |
| UI behavior and accessibility | [interface direction](../content/oathcraft-interface-direction.md) (the vertical-slice contract is Godot-era history) and [accessibility](../artifacts/accessibility.md) |
| Test and probe contract | [probe harness](../artifacts/probe-harness.md) |
| Independent hands-on player evidence | [playtesting.md](playtesting.md) |
| Asset, code, and document map | [repo artifacts](../artifacts/repo-artifacts.md) |

The coordination ledger is an index and evidence ledger. Follow its links instead of copying detailed rules into a status message or another ledger row.

When a handoff packet exists, treat the packet files as the durable evidence authority. Task messages and the coordination ledger route work and index verdicts; they do not replace packet contents.

## Recovery sequence

1. Start one Orchestrator with [the orchestrator prompt](prompts/orchestrator.md).
2. Preserve the repository before interpreting it: inspect `git status --short` and relevant diffs. Record uncertainty or active ownership in the ledger. Do not reset, clean, overwrite, or bulk-format existing work.
3. The Orchestrator reads the durable sources, identifies active and blocked work, and publishes a compact operating picture in its task conversation.
4. The Orchestrator creates only the work roles required by active ledger items or newly approved work. Do not create idle roles.
5. Give each required role its copy-ready prompt. The role sends the standard readiness report and waits. After reviewing that report, the Orchestrator sends a bounded assignment packet and requires the receiver response before ownership transfers.
6. Use the handoff protocol below for every ownership transfer, blocker, and completion. The Orchestrator records durable shared state in the coordination ledger.
7. When the [Playtesting activation gate](playtesting.md#activation-gate) is met, the Orchestrator may create one separate local Playtester task. Archive it after the verified closure rule in that contract.

## Approved validation-closure target (pending activation)

The approved process will use risk-tiered closure after its delivery slice closes. Until then, the current evidence-based closure behavior in the project-coordination ledger remains authoritative. Under the approved target, the Orchestrator remains the authority hub for assignment, ownership, dependencies, verification, and ledger state, but is not the routine third executor of stable validation.

| Tier | Baseline expectation |
| --- | --- |
| Tier 1 | One owned surface with stable existing validation. Owner self-check and applicable Test Automation evidence are sufficient unless a recorded exception applies. |
| Tier 2 | Material cross-boundary work still needs independent specialist evidence. The Orchestrator reviews the complete evidence package and records closure; it reruns only when a validator requests it, evidence conflicts or is incomplete, a shared runner or integration path changed, or another named exception is recorded. |
| Tier 3 | Release-critical, newly introduced probe first stable handoff, failed/conflicting/incomplete/flaky/non-reproducible, or otherwise declared high-risk work requires the named independent validators and an explicit Orchestrator rerun before closure. |

Test Automation is the deterministic-validation owner across all tiers. Playtester is on-demand, read-only, and temporary; it supplies hands-on player evidence only when the [Playtesting activation gate](playtesting.md#activation-gate) is met.

### Codex launch note

Create a fresh task on this repository for the Orchestrator and paste the full role prompt. Create follow-on tasks only after the Orchestrator has identified a ledger-backed need. Send the assignment packet as a task message. If a previous task exists but its durable state is unclear, recover from the repository rather than assuming its chat history is complete.

## Standard readiness report

Every recovered work role sends this report to the Orchestrator before acting:

```text
Role: <role>
Sources read: <canonical files and active feature records>
Current relevant ledger items: <rows or none>
Owned/shared surfaces: <paths or contracts; none if not assigned>
Risks or blockers: <facts, not guesses>
Next action: Awaiting an explicit assignment.
```

This task message is immediate communication. Add a ledger entry only when the report exposes a shared state change, an ownership change, a cross-role dependency, or a blocker that affects another role.

## Direct collaboration and durable routing

Use the Orchestrator as the authority hub, not as a message bottleneck. Roles may speak directly when a question needs the expertise of another role.

| Conversation | Purpose |
| --- | --- |
| User and Game Design | Gameplay rules, player experience, content, and tradeoffs |
| Product Management and Game Design | Player-problem discovery and product shaping |
| Game Design, Architecture, UI/UX, and Test Automation | Bounded rule, presentation, implementation-contract, and acceptance questions |
| Playtester and UI/UX, Game Design, or Test Automation | Read-only player evidence and bounded clarification |
| Orchestrator and every role | Assignment, sequencing, shared ownership, dependencies, verification, and closure |

Direct discussion may explore a domain detail or resolve a bounded question. It does not assign work or transfer ownership; those changes still require the assignment protocol and Orchestrator routing. When a direct outcome changes shared scope, ownership, or dependencies, the involved roles update the established canonical source and send the Orchestrator a concise routing notice. The Orchestrator records the durable shared state in the ledger. A proposed change to user-approved intent remains uncommitted until PM and the user decide it; after that decision, update the established canonical source and notify the Orchestrator.

## Assignment and handoff protocol

### Sender packet

Every assignment or handoff states:

```text
Outcome and scope:
Explicit non-goals:
Canonical sources to consult or update:
Affected paths or contracts:
Dependencies and required collaborators:
Acceptance evidence:
Open decisions, assumptions, or risks:
Required response and next handoff:
```

### Receiver response

The receiver must explicitly reply with one of these outcomes:

```text
Acknowledged
Owner: <role>
Plan: <bounded next action>
Dependencies: <items or none>
First evidence or decision needed: <item>
```

```text
Cannot accept yet
Reason: <missing decision, source, owner, or dependency>
Requested route: <role or user>
```

The sender remains accountable until an acknowledgment is received. The Orchestrator writes the durable ownership, dependency, evidence, or closure state to [the coordination ledger](../artifacts/project-coordination.md).

### Mandatory return packet

Every assigned owner must send a task-message return to the assigning Orchestrator at three points: acknowledgment, a blocker or discovery that changes dependency/scope, and completion. A repository edit, probe artifact, or idle task state is not a return. Use this packet:

```text
State: completed | blocked | needs-decision
Outcome / non-goal compliance: <what was delivered or why it cannot proceed>
Changed paths and canonical docs updated: <paths, or none>
Validation command(s) and exact result: <evidence, or why unavailable>
Dependencies / risks / decision needed: <items or none>
Required next owner and requested action: <role and bounded action>
```

The sender remains accountable until the acknowledgment return is received. The Orchestrator does not advance a dependent item or close a milestone until the completion return is received and recorded in the ledger.

### Durable packet evidence

For handoffs covered by the deterministic control-plane contract, preserve immutable packet files at `docs/artifacts/handoff-packets/<handoff-id>/assignment.json`, `acknowledgment.json`, and `completion.json`. When correction is necessary, preserve the original root files and use `superseded_by.json` plus `revisions/<revision-id>/...` as defined in [handoff-packets.md](../artifacts/handoff-packets.md). Packet files are evidence authority; the ledger indexes their verdict and current routing. Proposal-06 archive work must not move or rewrite packet files.

For a coordination-history lookup, read the live [project coordination ledger](../artifacts/project-coordination.md) first. Consult [coordination-history](../artifacts/coordination-history/README.md) only when the live closure summary links to an archived historical block. Manual archival never moves active work or packet roots; follow the archive eligibility and reverse-dependency sweep in that archive contract.

From a recovered repository, validate the active packet root before advancing a dependent or closing a milestone:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\docs\artifacts\handoff-packets
```

The Phase 0 validator is read-only and the mandatory dependency/closure gate is active. Before advancing a packet-dependent item or recording a milestone closure, the Coordinator must obtain an exit-`0` current-root result. An exit-`1` result blocks the step until the responsible owner supplies valid immutable packet evidence (using supersession where necessary). Its concise human result and JSON line never automate messaging, reassignment, or issue-status mutation.

## Escalation map

| Condition | Route |
| --- | --- |
| A proposed change affects player outcome, scope, or a user-approved non-goal | Product Management and the user |
| A rule, domain term, or canonical-source conflict appears | Game Design and Architecture; update the established canonical source after resolution |
| A shared path, cross-role dependency, priority, or task boundary is unclear | Orchestrator |
| Validation fails, evidence is missing, or a result is not reproducible | Test Automation and the responsible owner |
| Independent player evidence is needed for an eligible player-facing claim | Orchestrator applies the Playtesting activation gate |
| A PM proposal lacks recorded user approval | PM keeps it `needs-triage`; return the decision to the user |

Do not infer a product approval from nearby implementation work. Do not turn an unresolved choice into a commitment.

## Role designation

| Role | Owns | Direct collaborators | Does not own |
| --- | --- | --- | --- |
| Orchestrator | Delivery decomposition, sequencing, dependencies, task routing, shared-file ownership, verification, and ledger state | Every role, for assignment and durable routing | Product intent, detailed game rules, specialist implementation in place of an assigned owner |
| Product Management | Player problems, product discovery, user-approved outcomes, and `.scratch/product-backlog/` intake | User and Game Design, for discovery and product shaping | Delivery decomposition or changing a confirmed outcome during delivery |
| Architecture | Engine-facing seams, ADRs, rule implementation contracts, and Encounter Record contracts | Game Design, UI/UX, and Test Automation, for bounded contracts | Product priority or UI/design decisions without their owners |
| Test Automation | Deterministic validation ownership, probe contracts, repeatable evidence, validation quality, reproducibility, and failure reporting | Game Design, Architecture, and UI/UX, for acceptance and evidence questions | Quietly changing product intent to make a test pass |
| Game Design | Game rules, vocabulary, content intent, and player-facing counterplay | User, PM, Architecture, UI/UX, and Test Automation | Engine/UI implementation outside an agreed authoring boundary |
| UI/UX | Player-facing interaction, layout, accessibility, and presentation contracts | Game Design, Architecture, and Test Automation, for bounded presentation work | A second rules authority or unapproved gameplay semantics |
| Playtester | Independent hands-on evidence for an activated player-facing claim | UI/UX, Game Design, and Test Automation, for bounded clarification | Implementation, probe authoring, canonical-document edits, assignment, or closure ownership |

Engineering Enablement is a cross-functional responsibility, not a permanent role. Use its [operating contract](engineering-enablement.md) when a reusable seam, tool, probe, or reporting workflow spans roles.

## Change control

The Orchestrator owns this recovery-kit structure. The affected role owner reviews changes to its prompt. PM reviews every PM-to-EM authority change. Keep each rule in its existing canonical document and link to it here; do not duplicate game rules, architecture choices, UI behavior, or probe contracts.

## Recovery drill

Run this lightweight drill whenever the recovery-kit structure or a role prompt changes:

1. Give a new agent only repository access and one role prompt.
2. Verify it locates the durable sources, reports readiness in the required shape, and does not assume a task ID or chat history.
3. Give it one simulated assignment packet and verify its acknowledgment or justified rejection.
4. Verify it routes a product change, canonical conflict, shared-file conflict, and missing evidence to the correct recipient.
5. Confirm the exercise leaves no fabricated approval, rule, ledger status, or ownership claim.

The drill passes when every required behavior is observed for each role prompt.
