# Activate Playtester Only When Gated

Status: ready-for-agent
Owner: Coordinator
Blocked by: 01, 02

## Outcome

Prove the on-demand Playtester workflow on an eligible player-facing slice: create one bounded read-only task only after the gate is met, receive the complete verdict packet, route any follow-up correctly, and archive the task after verified closure. Also prove that non-eligible work does not create Playtester.

## Canonical Sources

- `docs/agents/playtesting.md`
- `docs/agents/recovery-kit.md`
- `docs/artifacts/project-coordination.md`
- Applicable canonical UI, accessibility, or design source for the chosen slice

## Required Handoff

UI/UX and Test Automation must confirm the gate prerequisites for the chosen slice. The Orchestrator records the activation reason, responsible owner, retest condition, and final archive state in the ledger. PM and the user are only involved if the tested claim would change approved outcome or non-goals.

## Non-Goals

No standing Playtester role. No probe authorship by Playtester. No using Playtester for engine-only, ADR-only, refactor-only, or deterministic-probe-only work.

## Acceptance

An eligible slice shows a complete Playtester verdict packet and clean archive flow, while at least one non-eligible handoff remains closed without Playtester activation.
