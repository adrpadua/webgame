# Risk-Tiered Validation and Orchestrator Closure

Status: resolved

## Player Problem

Player-facing slices wait longer than necessary when the Orchestrator routinely becomes a third executor of normal validation after the implementation owner, Architecture, and Test Automation already supplied focused evidence. The extra execution can increase confidence, but it duplicates specialist work and reduces delivery throughput without a stated risk rule.

The coordination ledger shows this pattern in closed Encounter Record, card/action-board, and board-camera handoffs. The process needs to preserve trustworthy closure while reserving coordinator reruns for exceptions that materially need them.

## Desired Outcome

The Orchestrator is primarily the evidence reviewer, dependency and ownership authority, and exception handler. Material cross-boundary work still receives independent validation. Routine, stable validation is executed by the responsible owner and the required specialist validators, then reviewed by the Orchestrator rather than repeated by default.

When a player-facing claim needs hands-on evidence, an on-demand, read-only Playtester supplies an independent verdict. This role complements UI/UX self-checks and Test Automation's deterministic evidence; it does not replace either.

## Proposed Process Scope

### Validation Tiers

| Tier | Risk signal | Required evidence and validators | Orchestrator action |
| --- | --- | --- | --- |
| 1 — Bounded routine | One owned surface; no rules, record, shared-file, or player-contract boundary changes; existing stable validation covers the change. | Owner self-check and applicable Test Automation evidence. | Review packet and record closure. No routine rerun. |
| 2 — Material cross-boundary | A rules-to-projection, engine-to-record, shared-file, UI/accessibility, or multi-owner contract changes. | Owner self-check; Test Automation evidence; Architecture review when an engine, rules, state-projection, or Encounter Record boundary changes; applicable UI/UX review; Playtester only when its activation gate is met. | Review evidence, dependencies, ownership, and canonical sources. Rerun only under a recorded exception. |
| 3 — Exception or release-critical | Player-blocking behavior, save/data integrity, rules or Encounter Record correctness, accessibility, a promised demo or milestone claim, the first independently verified stable handoff for a newly introduced probe, failed/conflicting/incomplete/flaky/non-reproducible evidence, or a declared high-risk integration. | Tier 2 evidence plus the named independent validators and an explicit coordinator rerun. Playtester is required when a release-critical player-facing claim meets its gate. | Rerun the named validation, resolve conflicts, and record why Tier 3 applied before closure. |

### Coordinator Rerun Rule

The Orchestrator shall rerun validation for Tier 3 work. For Tier 2, the Orchestrator may rerun only when a validator requests it, evidence conflicts or is incomplete, a shared runner or integration path changed, or the ledger records another named exception. The user or an explicitly named milestone gate may require a coordinator rerun at any tier. The rerun reason, command, and result belong in the ledger.

The Orchestrator does not routinely rerun a stable Tier 1 or Tier 2 focused suite solely because specialist validation passed. It reviews the evidence package, routes exceptions, and confirms closure instead.

After a newly introduced probe completes one independently verified stable handoff, later uses are tiered by the normal risk criteria rather than staying Tier 3 by default.

### Playtester Gate and Return

Playtester is activated only for an eligible player-flow, input, mobile/responsive, accessibility, visual-hierarchy, or interaction-feel claim with a playable surface. UI/UX self-check and applicable Test Automation evidence are prerequisites.

The Orchestrator creates one separate local task for that exact gate. Playtester is read-only and temporary. Its return packet includes `PASS`, `PASS WITH CONCERNS`, or `FAIL`; the tested flow, environment, ordered observed evidence, canonical expectation, player impact, recommended route, and retest condition. The Orchestrator archives the task after verified closure.

### Failed, Conflicting, or Incomplete Evidence

- Failed deterministic evidence returns to the responsible owner and Test Automation.
- Rule, source-of-truth, or engine-boundary disagreement returns to Game Design and Architecture.
- UI, accessibility, hierarchy, or interaction concern returns to UI/UX and Test Automation; activate Playtester when its gate is met.
- A product-outcome or approved-non-goal change returns to Product Management and the user.
- A shared ownership, sequencing, or closure ambiguity returns to the Orchestrator.

No tier permits an unresolved failure to close. A conflicting package requires the Orchestrator to keep the handoff open, name the deciding canonical source or validator, and escalate or rerun as Tier 3.

### Closure and Ledger Record

Closure requires the assigned tier, required validator acknowledgments, focused evidence links, canonical-source updates, resolved dependencies, and any required Playtester verdict/retest. The Orchestrator records only:

- tier and reason;
- validators and required verdicts;
- links to canonical sources and evidence;
- rerun exception, command, and result when applicable; and
- closure, blocker, or escalation owner.

The ledger remains an index and handoff record. It does not copy probe contracts, UI behavior, game rules, or raw playtest observations.

## Explicit Non-Goals

- Gameplay, engine, probe, analytics, or CI implementation.
- A generic analytics platform or validation dashboard.
- A standing or idle Playtester task.
- Weakening Test Automation, Architecture, UI/UX, Game Design, or owner accountability.
- Removing independent validation from material cross-boundary work.
- Changing user approval or PM-to-EM product-intent authority.

## Acceptance Evidence

Before this process change can be accepted as delivered, evidence must show that:

1. The role registry and recovery contract name Test Automation as the deterministic-validation owner and define Playtester as on-demand, read-only, and temporary.
2. A current or new ledger row records Tier 1, Tier 2, or Tier 3, the required validators, evidence links, and any coordinator rerun reason without copying the underlying validation contract.
3. A Tier 2 handoff closes from complete independent evidence and coordinator review without an unrecorded routine third execution.
4. A Tier 3 example shows a required coordinator rerun for a new, changed, release-critical, failed, conflicting, incomplete, flaky, or non-reproducible validation condition.
5. An eligible player-facing slice can activate a separate local Playtester task, receive a complete verdict packet, route follow-up correctly, and archive the task after verified closure.
6. A non-eligible engine-only, refactor-only, ADR-only, or probe-only item does not create a Playtester task.
7. Failed or conflicting evidence remains open until the named owner, canonical source, and required retest resolve it.
8. A six-handoff pilot report reviews coordinator reruns avoided, closure reversals, escaped regressions, and elapsed handoff-to-closure time before the process is treated as fully settled.

## Affected Areas

| Area | Process impact |
| --- | --- |
| Product Management | Preserves user approval and product-intent return paths; does not own delivery validation. |
| Orchestrator | Assigns tiers, reviews evidence, handles exceptions, records closure, and creates/archives on-demand Playtester tasks. |
| Architecture | Independently validates engine, rules, state-projection, and Encounter Record boundaries for material work. |
| Test Automation | Owns deterministic probes, reproducibility, failure evidence, and retest coverage. |
| UI/UX | Implements and self-checks player-facing work; receives player-experience findings and maintains canonical UI/accessibility contracts. |
| Game Design | Resolves player-promise, counterplay, content-comprehension, and canonical-rule conflicts. |
| Playtester | Supplies independent, read-only hands-on evidence only when the activation gate is met. |
| Engineering Enablement | May maintain a bounded shared contract only if repeated validation-routing work proves independently actionable. |

## Canonical Documents To Consult Or Update

- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): current handoff evidence, temporary ownership, and durable closure index.
- [Recovery kit](../../../docs/agents/recovery-kit.md): role activation, sender/receiver protocol, durable routing, and recovery behavior.
- [Playtesting contract](../../../docs/agents/playtesting.md): activation gate, evidence packet, verdicts, escalation, retest, and archive rule.
- [Test Automation prompt](../../../docs/agents/prompts/test-automation.md) and [Playtester prompt](../../../docs/agents/prompts/playtester.md): role behavior.
- [Probe harness](../../../docs/artifacts/probe-harness.md): canonical deterministic-validation contract.
- [Engineering Enablement](../../../docs/agents/engineering-enablement.md): bounded cross-role tooling and validation work.
- [Issue tracker](../../../docs/agents/issue-tracker.md): PM-to-EM authority boundary.

## Research And Evidence Basis

The dedicated `docs/artifacts/multi-agent-validation-closure-research.md` was not present when this proposal was drafted. This proposal instead synthesizes [Multi-Agent Orchestration Research](../../../docs/artifacts/multi-agent-orchestration-research.md), which cites Magentic-One, MetaGPT, Agent2Agent, OpenAI Agents SDK, AutoGen, and NIST primary or first-party sources.

The research supports explicit ownership, durable handoff state, independent validation, exception routing, and human approval boundaries. It does not verify that these exact three tiers or thresholds are optimal for this repository. Treat the tier table as a process hypothesis that requires a bounded pilot and evidence review.

## Confirmed Product Decisions

1. Tier 3 release-critical means player-blocking behavior, save/data integrity, rules or Encounter Record correctness, accessibility, or a promised demo/milestone claim.
2. A newly introduced probe is Tier 3 only for its first independently verified stable handoff; after that, tier it by the normal risk criteria.
3. Pilot the process for six handoffs and review coordinator reruns avoided, closure reversals, escaped regressions, and elapsed handoff-to-closure time.
4. The user or an explicitly named milestone gate may require a coordinator rerun at any tier, but the ledger must state the reason.

## Risks

- A permissive Tier 2 rule could hide a cross-boundary regression; Tier 3 exceptions and independent validators must remain easy to invoke.
- An overly broad Tier 3 definition could recreate the throughput bottleneck.
- A Playtester verdict can be mistaken for deterministic proof; its contract keeps it independent, hands-on evidence only.
- Tier labels without exact ledger evidence may become cosmetic rather than improving decisions.

## Approval Record

User approval received on 2026-08-13 for the risk-tier definitions, rerun exceptions, pilot shape, and former open decisions. This proposal is now `ready-for-agent` for Orchestrator delivery planning.
