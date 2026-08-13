# Focused Encounter Rules Probes

Status: needs-triage

## Player Problem

The current Spike and Probe harness is good at protecting broad, already-decided contracts such as replay, Encounter Records, parity, and player-visible presentation. What it does not yet make cheap is the repeated addition of tiny deterministic rules checks for one mechanic, one rejection case, or one lifecycle boundary at a time.

As the Encounter rules surface grows, that gap creates a team problem: broad Probes become overloaded, regressions are harder to localize, and narrow rules evidence is relatively expensive to author. That slows delivery and makes it harder for PM, Design, Architecture, and Test Automation to tell whether a slice is blocked on rules correctness, presentation, or evaluation.

## Desired Outcome

Introduce a durable focused rules-Probe layer between short-lived Spikes and broad acceptance Probes.

The player/team-facing promise is process-oriented: the repo should gain a lightweight way to prove exact Encounter rules behavior at the existing scene-free authority seam without inventing a second rules path or bloating broad acceptance Probes.

If approved, the first slice should make at least one bounded mechanic family cheap to prove with exact setup, one authored action or small authored step sequence, direct rules assertions, and stable artifacts. Broad acceptance Probes would remain the authoritative layer for replay, Encounter Record, parity, production-resource reachability, and player-visible presentation.

## Scope

- Define focused rules Probes as a durable middle layer between Spikes and broad acceptance Probes.
- Support deterministic exact-state rules checks at the scene-free Encounter seam for one mechanic family, rejection case, or lifecycle boundary at a time.
- Preserve the existing Probe philosophy: exact setup, authored action, direct assertions, stable evidence, and no duplicate gameplay authority.
- Document when a team member should choose a Spike, a focused rules Probe, or a broad acceptance Probe.
- Establish one proof-of-value rollout for a bounded mechanic family, with defeat/attrition pass-to-loss behavior currently the leading candidate.

## Explicit Non-Goals

- Replacing the current Spike and Probe harness with a new framework.
- Moving probe helpers into production Encounter ownership.
- Making deep private-method unit tests the default testing strategy.
- Importing Duelyst's stack, PvP model, backend structure, or test framework organization.
- Smuggling gameplay, balance, deck, encounter, or UI feature changes into harness work.
- Turning broad acceptance Probes into redundant copies of focused rules Probes, or vice versa.
- Changing Encounter Record schema or replay contracts unless the approved slice proves a missing authoritative rules fact must be added.

## Acceptance Evidence

Before this intake can close as delivered, evidence must show that:

1. The project has a documented three-layer testing model: Spike, focused rules Probe, and broad acceptance Probe, with clear selection guidance.
2. A named focused rules-Probe category exists in the harness vocabulary and can be run in bounded groups without invoking unrelated UI or report coverage.
3. At least one proof-of-value focused rules Probe protects a bounded Encounter mechanic family with deterministic setup, direct assertions, stable success markers, and normalized failure artifacts.
4. Focused rejection behavior is supported as a first-class contract, including no-rules-state-change evidence for illegal actions where applicable.
5. The focused rules-Probe layer reuses the same Encounter authority as playable rules execution and does not create a second gameplay implementation path.
6. Broad acceptance Probes remain the canonical integration layer for replay, Encounter Record, parity, production-resource reachability, and player-visible presentation.

## Affected Areas

| Area | Product/process impact |
| --- | --- |
| Design | Gains cheaper exact rules evidence for authored trigger, expiry, payoff, and rejection behavior before presentation polish. |
| Architecture | Must preserve the scene-free Encounter seam as the highest useful rules authority and avoid leaking test-only helpers into production ownership. |
| UI/UX | Benefits indirectly because narrow rules regressions can be caught before they appear as misleading player-facing failures. |
| Test Automation | Gains the primary authoring and verification workflow for focused deterministic rules coverage and probe cataloging. |
| Engineering Enablement | Owns the reusable harness contract, evidence shape, and cross-role workflow guidance. |

## Canonical Documents To Consult Or Update

- [ADR 0009: use a headless rules SDK](../../../docs/adr/0009-use-a-headless-rules-sdk.md): confirms the Encounter seam as rules authority.
- [ADR 0010: keep probe support outside the encounter engine](../../../docs/adr/0010-keep-probe-support-outside-the-encounter-engine.md): preserves the no-test-helpers-in-production boundary.
- [ADR 0012: use seeded randomness for replayable encounters](../../../docs/adr/0012-use-seeded-randomness-for-replayable-encounters.md): deterministic execution baseline.
- [Probe harness](../../../docs/artifacts/probe-harness.md): existing probe philosophy, runner contract, and evidence expectations.
- [Encounter Records](../../../docs/artifacts/encounter-records.md): authoritative record/report contract if focused rules evidence needs to cite existing normalized facts.
- [Engineering enablement operating contract](../../../docs/agents/engineering-enablement.md): ownership, bounded user, validation, and closure rules for reusable harness work.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): active ownership, handoff shape, and temporary shared-file routing.

## Open Product/Process Decisions

- Should the first approved rollout be the smallest possible proof-of-value (`one` focused defeat/attrition or end-of-clock contract), or should approval already include a broader initial tranche such as one defeat/attrition contract, one invalid-action matrix, and one lifecycle-focused mechanic?
- Must the first approved slice stay entirely within today's replay and Encounter Record contracts, or may it deepen those contracts if delivery proves one missing authoritative rules fact is necessary?
- Should the durable selection guidance live only in `probe-harness.md`, or should it also be reflected in a second process document such as the Engineering Enablement contract?

## Risks And Dependencies

- This can drift into speculative framework-building if the first slice is too broad.
- A poorly bounded implementation could leak test-only affordances into production rules ownership, violating the repo's current architecture decisions.
- If the focused rules-Probe layer is not clearly distinguished from broad acceptance Probes, the team could end up duplicating evidence or weakening the meaning of existing integration checks.
- The process value depends on stable cataloging, deterministic setup, and crisp success markers; without those, this becomes "more probes" rather than a clearer validation layer.
- The current Test Automation draft at [`.scratch/focused-encounter-rules-probes/spec.md`](../../../.scratch/focused-encounter-rules-probes/spec.md) is strong source material, but it is still a delivery/process draft rather than the approved PM intake record.

## Approval Record

On 2026-08-13, the user asked PM to review the Test Automation draft at `.scratch/focused-encounter-rules-probes/spec.md` and, if it fit PM scope, put it into the backlog/intake flow. PM agrees that it fits as a process-oriented validation capability and records it here as a `needs-triage` proposal pending user approval of the exact first-slice boundary.
