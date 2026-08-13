# Multi-Agent Orchestration Research

**Scope:** review the repository's agent operating model against primary multi-agent software-agent literature and first-party protocol/framework documentation. **Reviewed:** 2026-08-13. This is research, not a replacement for the operating contract in [the recovery kit](../agents/recovery-kit.md).

## Bottom line

The model is well chosen for a small, concurrent game project: a coordinator owns delivery state while specialists communicate directly on bounded questions; durable documents, not chat, carry decisions; and independent validation gates closure. It is closer to a disciplined manager-and-ledger pattern than a free-form "swarm," which is appropriate while agents share a workspace.

The evidence is encouraging but narrow. The papers are system reports and framework designs, not proof that one topology is universally best. Keep the current structure, then add a small state machine, versioned change control, and protocol-health metrics before adding more roles or process.

## Alignment with the current model

| Current practice | Assessment | Evidence |
| --- | --- | --- |
| Orchestrator as the authority hub for decomposition, dependencies, corrective action, and closure | **Strong alignment.** Magentic-One assigns those functions to an Orchestrator and separates overall planning from per-step progress. Its ablation reports a 31% drop without the full ledgers; this supports the project's ledger discipline, not a claim that the exact ledger format is optimal. | [Magentic-One](https://arxiv.org/html/2411.04468) sections 4-5.3 |
| Specialist roles with explicit non-overlapping authority | **Strong alignment.** MetaGPT uses explicit specialized roles, constraints, and a PM -> Architect -> Project Manager -> Engineer -> QA software workflow. | [MetaGPT](https://arxiv.org/html/2308.00352) section 3.1 |
| Sender packet and receiver acknowledgement/rejection | **Strong alignment, with room to formalize.** Structured, role-specific communication and durable deliverables are preferable to unconstrained chat in MetaGPT. A2A makes submitted/working/completed/rejected/input-required explicit task states. | [MetaGPT](https://arxiv.org/html/2308.00352) section 3.2; [A2A specification](https://a2a-protocol.org/latest/specification/) sections 3-4 |
| Direct specialist collaboration plus a routing notice to the Orchestrator | **Good alignment.** A hub should coordinate, not serialize every question. MetaGPT's publish/subscribe model lets roles retrieve relevant shared information directly, but warns that indiscriminate sharing causes overload. The repository's "bounded direct discussion + durable routing when shared state changes" is a sensible human-scale equivalent. | [MetaGPT](https://arxiv.org/html/2308.00352) section 3.2 |
| PM discovery and user approval before delivery intake | **Sound governance boundary.** MetaGPT explicitly separates product/requirements analysis from architecture, distribution, engineering, and QA. The repository improves this by retaining the user as final product-approval authority. | [MetaGPT](https://arxiv.org/html/2308.00352) section 3.1 |
| Canonical repository documents over chat history | **Strong alignment.** MetaGPT communicates key outputs as structured documents/diagrams; A2A separates task artifacts from messages and warns that messages are not reliable delivery for critical information. | [MetaGPT](https://arxiv.org/html/2308.00352) section 3.2; [A2A specification](https://a2a-protocol.org/latest/specification/) sections 3.5, 4.1 |
| Evidence-based closure and independent QA | **Strong alignment.** MetaGPT adds executable feedback; Magentic-One's error analysis identifies insufficient verification as a common failure mode. | [MetaGPT](https://arxiv.org/html/2308.00352) section 3.3; [Magentic-One](https://arxiv.org/html/2411.04468) section 5.4 |

## Gaps and recommended changes

1. **Make handoff state machine-readable.** Keep the current prose packet, but add a compact, unique handoff ID and one of: `proposed`, `acknowledged`, `blocked`, `in-progress`, `verification-pending`, `closed`, `superseded`, or `cancelled`. Record `owner`, `depends-on`, `canonical-artifact`, `evidence`, and `last-verified`. This eliminates ambiguous "waiting/complete" language and mirrors the explicit lifecycle semantics in A2A.

2. **Version approved product intent.** A `ready-for-agent` proposal should have a version. A material delivery-discovered change creates a new PM decision (`v2` or a superseding issue), invalidates affected acknowledgements, and requires re-acknowledgement. The current return-to-PM rule is right; this makes the resulting invalidation auditable.

3. **Make durable routing atomic for material changes.** Before an agent says a material cross-role decision is complete, require its canonical-document update and ledger link in the same handoff. Chat may notify, but cannot be the sole record. This directly addresses the critical-message durability limitation noted by A2A.

4. **Measure the coordination protocol.** During the next two real PM-to-EM deliveries, record: time to acknowledgement, number of unacknowledged/redirected packets, reopened handoffs, shared-file conflicts, stale-ledger corrections, verification failures found after claimed completion, and duplicate-work incidents. Review the data before adding a dedicated enablement or management role. Magentic-One's reported persistent inefficient actions and insufficient verification failures make this more useful than adding process by intuition.

5. **Add bounded stop/replan rules.** For each assignment, state a time/turn or evidence budget and a concrete stop condition ("request routing after one blocked probe" rather than repeatedly retrying). The Orchestrator should replan or escalate instead of allowing open-ended retries. This targets Magentic-One's reported persistent-inefficient-action failure mode.

6. **Keep subscriptions narrow.** Maintain the recovery kit and coordination ledger as an index, not a broadcast transcript. Only the affected roles need a routing notice; use links to canonical sources. This preserves the direct-collaboration benefit while limiting context overload identified by MetaGPT.

7. **Add risk-tiered approvals and escalation service levels.** The existing PM/user gate covers product intent. Define a short table for high-risk actions as well: destructive repository operations, cross-cutting architecture changes, unresolved source conflicts, and external side effects need a named approver, evidence package, timeout, and explicit reject/resume behavior. Low-risk bounded work stays delegated. First-party human-in-the-loop guidance supports pausing, approving/rejecting, and resuming work rather than silently continuing after an ambiguous boundary.

## Recommended adoption order

1. Add the handoff ID/state fields to new ledger rows only; do not backfill closed work.
2. Run one small approved PM item end-to-end using the fields and a versioned outcome.
3. Review the protocol metrics and revise the packet only where real failures occurred.
4. Consider a new permanent agent only if the measured backlog shows repeatable work that cannot remain owned by an existing role.

## Primary sources

- Adam Fourney et al., [*Magentic-One: A Generalist Multi-Agent System for Solving Complex Tasks*](https://arxiv.org/html/2411.04468), 2024.
- Sirui Hong et al., [*MetaGPT: Meta Programming for a Multi-Agent Collaborative Framework*](https://arxiv.org/html/2308.00352), 2023.
- Chen Qian et al., [*ChatDev: Communicative Agents for Software Development*](https://arxiv.org/abs/2307.07924), ACL 2024.
- [Agent2Agent Protocol Specification](https://a2a-protocol.org/latest/specification/), first-party protocol specification.
- OpenAI Agents SDK, [*Multi-agent orchestration*](https://openai.github.io/openai-agents-python/multi_agent/), [*Handoffs*](https://openai.github.io/openai-agents-python/handoffs/), and [*Human in the loop*](https://openai.github.io/openai-agents-python/human_in_the_loop/), first-party framework documentation.
- Microsoft AutoGen, [*Group Chat* design pattern](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html), first-party framework documentation.
- NIST, [*AI Risk Management Framework: Govern, Map, Measure, Manage*](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/), first-party guidance.

