# Risk-Tiered Validation and Orchestrator Closure

Status: active

## Intake

Authorized product proposal: [`.scratch/product-backlog/issues/02-risk-tiered-validation-and-orchestrator-closure.md`](../product-backlog/issues/02-risk-tiered-validation-and-orchestrator-closure.md), approved by the user on 2026-08-13.

The confirmed process outcome and explicit non-goals in that proposal are fixed delivery constraints. Any material outcome change returns to Product Management and the user.

## Delivery Outcome

Adopt a bounded risk-tiered closure policy where the Orchestrator primarily reviews evidence, owns dependencies and temporary shared ownership, and handles exceptions instead of routinely becoming the third executor of stable validation. Preserve independent specialist validation for material cross-boundary work, activate Playtester only through its explicit gate, and keep the coordination ledger as an index rather than a duplicate validation contract.

## Sequence And Boundaries

1. Align the canonical coordination contract: update the recovery kit, issue-tracker authority boundary, and role prompts so Test Automation remains the deterministic-validation owner and Playtester remains on-demand, read-only, and temporary.
2. Add the minimum ledger and routing fields needed to record tier, reason, validators, evidence links, and any coordinator-rerun exception without copying rule, UI, or probe contracts into the ledger.
3. Prove the process on bounded examples: at least one Tier 2 closure that completes from independent evidence plus Orchestrator review, at least one Tier 3 closure that records the required coordinator rerun, and one eligible Playtester activation plus archive flow.
4. Review the six-handoff pilot before treating the process as settled. If the pilot shows a needed outcome or non-goal change, route it back to Product Management and the user rather than silently broadening the process.

## Shared Contracts

- Process authority: `.scratch/product-backlog/issues/02-risk-tiered-validation-and-orchestrator-closure.md`
- Cross-task ledger: `docs/artifacts/project-coordination.md`
- Role recovery and routing: `docs/agents/recovery-kit.md`
- Playtester gate and verdict packet: `docs/agents/playtesting.md`
- Role prompts: `docs/agents/prompts/test-automation.md`, `docs/agents/prompts/playtester.md`, and `docs/agents/prompts/orchestrator.md`
- Deterministic validation contract: `docs/artifacts/probe-harness.md`
- Engineering Enablement boundary: `docs/agents/engineering-enablement.md`
- Intake authority boundary: `docs/agents/issue-tracker.md`
- PM priority view: `.scratch/product-backlog/map.md`

## Closure Gate

Close only when the canonical role contracts, ledger behavior, Playtester gate, and pilot evidence all agree with the approved proposal; Tier 2 and Tier 3 examples are durably recorded; non-eligible work does not create a Playtester task; and any coordinator rerun is explicitly justified in the ledger.
