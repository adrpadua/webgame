# Validation and Closure Governance Research

**Scope:** primary-source guidance for assigning validation and closure work in a multi-agent software team. **Reviewed:** 2026-08-13. This is research; it does not change the operating contract.

## Bottom line

The Orchestrator should own the closure decision and audit the evidence package, not normally duplicate the specialist's execution. Default closure is: implementer self-check, the smallest independent validation appropriate to risk, then Orchestrator evidence-completeness review and ledger decision. Rerunning is an exception for incomplete or conflicting evidence, a missing natural owner, a new or changed validation path, or release-critical sampling.

## Recommended ownership model

| Need | Default owner | Orchestrator responsibility |
| --- | --- | --- |
| Code/change is internally sound | Implementer | Require a self-check in the handoff. |
| Repeatable functional and regression evidence | Test Automation | Require the named probe/test result and its artifact path. |
| Contract, seam, ownership, or cross-module boundary evidence | Architecture | Require a targeted review when that boundary changed. |
| Actual player experience, visual hierarchy, controls, mobile/accessibility behavior | Playtester | Activate only for player-facing risk; require reproducible observations/screenshots. |
| Final completion | Orchestrator | Check acceptance coverage, independence, freshness, and recorded outcome; do not re-run normal probes. |

## Closure policy

1. **Implementer handoff:** scope, changed paths, self-check evidence, remaining risk, and requested independent gate.
2. **Independent validation:** assign exactly one or more natural evidence owners only when their distinct risk applies. Do not treat the same probe rerun by the Orchestrator as independence.
3. **Orchestrator audit:** ensure every acceptance criterion has current evidence, the validator was independent of implementation, canonical artifacts are linked, and the coordination ledger records the result.
4. **Exception loop:** contradictory/incomplete evidence moves the work to `verification-pending` or `blocked`; the Orchestrator assigns the smallest corrective task, then a relevant independent retest. Do not silently reopen or close on a self-assertion.

### When the Orchestrator personally reruns a check

Only rerun when evidence conflicts or is incomplete; no role naturally owns the validation; the validation is newly introduced or materially changed; or a release-critical sampling gate calls for it. Record why the exception was used, so exceptional checking does not become a hidden fourth validation layer.

## Durable state and measurement

Give every material handoff a unique ID, owner, status, canonical-artifact link, evidence link, and timestamps. Use explicit statuses such as `submitted`, `working`, `verification-pending`, `closed`, `blocked`, `rejected`, or `superseded`. A corrective change/retest is a distinct traceable handoff, not an ambiguous reopening.

For the next two deliveries, measure duplicate reruns, time from handoff to acknowledgement, verification failures after claimed completion, corrective-loop count, and closure reversals. Use results to tune gates before adding process or roles.

## Evidence

- [Magentic-One](https://arxiv.org/abs/2411.04468) assigns planning, progress tracking, specialist direction, and corrective action to an Orchestrator using task/progress ledgers. Its reported verification failures support explicit evidence gates; its role separation supports exception handling rather than default coordinator duplication.
- [MetaGPT](https://arxiv.org/abs/2308.00352) identifies cascading error risk in naive chaining and uses encoded SOPs and specialized roles to verify intermediate deliverables. This supports per-role gates instead of one universal validator.
- [Independent Verification and Validation of Multi-Agent Systems](https://arxiv.org/abs/1210.3640) distinguishes verification against requirements/preceding products from operational validation, and recommends tester independence from development. This supports Test Automation and Playtester as distinct evidence owners.
- The official [A2A task lifecycle](https://a2a-protocol.org/latest/topics/life-of-a-task/) specifies identifiable task states and terminal semantics; a refinement is a new task in the same context. This supports explicit corrective/retest handoffs and durable status.
- OpenAI's [manager and handoff guidance](https://openai.github.io/openai-agents-js/guides/agents/) places central policy in managers while allowing specialist delegation; its [guardrail guidance](https://openai.github.io/openai-agents-js/guides/guardrails/) says checks needed around operations belong at the tool/operation boundary. This supports central closure policy with owner-specific executable validation.
- [ChatDev](https://arxiv.org/abs/2307.07924) uses specialized chat chains through design, coding, and testing with mutual verification. This supports a bounded, role-owned corrective loop when evidence conflicts.
