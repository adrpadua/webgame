# Align Role And Recovery Contracts

Status: resolved
Owner: Coordinator

## Outcome

Update the recovery kit and affected role prompts so the validation-tier authority, Orchestrator responsibilities, Test Automation ownership, and Playtester activation/return rules match the approved proposal without changing product-intent authority.

## Canonical Sources

- `docs/agents/recovery-kit.md`
- `docs/agents/playtesting.md`
- `docs/agents/prompts/orchestrator.md`
- `docs/agents/prompts/test-automation.md`
- `docs/agents/prompts/playtester.md`
- Approved proposal 02

## Required Handoff

Record any shared-scope routing changes in `docs/artifacts/project-coordination.md`. Role-owner review is required for each changed prompt. PM review is required if any wording would alter PM-to-EM outcome authority.

## Non-Goals

No gameplay, probe, analytics, or CI changes. No standing Playtester task. No change to user approval, PM intake authority, or specialist accountability.

## Acceptance

The recovery kit and prompts name Test Automation as deterministic-validation owner, Playtester as on-demand/read-only/temporary, Tier 3 reruns as required, Tier 2 routine coordinator reruns as exceptional and recorded, and direct collaboration as non-owning communication only.

## Verification

- PM re-review passed: PM/user authority and approved non-goals remain intact; tier wording is explicitly pending activation.
- Test Automation re-review passed: deterministic-validation ownership, the pending-activation boundary, and the Playtester constraints remain intact.
- Coordinator verified the changed canonical documents with scoped `git diff --check`; it passed with existing LF/CRLF notices only.
- No live tier-policy switch was applied. The current evidence-based closure behavior remains authoritative until the delivery slice closes.
