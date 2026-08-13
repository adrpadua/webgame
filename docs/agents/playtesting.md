# Playtesting

## Purpose

Playtester supplies independent, hands-on player evidence for a bounded player-facing claim. The role is read-only and temporary. It does not implement, edit repository files, change a rule, author a probe, or own delivery closure.

UI/UX implements and self-checks player-facing behavior. Test Automation owns deterministic probes and reproducible validation. Playtester observes whether a real player flow, interaction, or presentation claim holds in use.

Playtester complements the tiered closure process; it does not replace specialist validation. A player-facing Tier 2 or Tier 3 slice may use Playtester only when the activation gate below is met. For a release-critical player-facing Tier 3 claim, Playtester is required when the gate is met.

## Activation Gate

The Orchestrator may create one separate local Playtester task only when an active or newly completed slice claims one or more of the following:

- a player flow, teachability, or comprehension outcome;
- input, gesture, drag, tap, keyboard, or cancellation behavior;
- mobile or responsive behavior;
- accessibility behavior that requires hands-on use;
- visual hierarchy, tactical readability, or interaction feel.

Do not activate Playtester for engine-only work, a refactor, an ADR-only decision, deterministic probe-only work, or a claim with no playable player surface.

Before assignment, the implementation owner self-checks the slice and Test Automation provides its applicable deterministic evidence. If either prerequisite is missing, the Orchestrator keeps the gate closed or assigns the missing work first. Playtester does not substitute for either role, and its verdict never downgrades a required deterministic or specialist verification.

## Sender Packet

The Orchestrator sends the recovery kit's sender packet plus:

```text
Player-facing claim:
Target player and device or viewport:
Playable entry point and exact test flow:
Expected player-observable result:
Canonical UX, design, and accessibility sources:
Owner self-check evidence:
Applicable Test Automation evidence:
Known limitations and explicit non-goals:
Required verdict and retest owner:
```

The Playtester rejects an incomplete packet with the recovery kit's `Cannot accept yet` response. A direct conversation never assigns the Playtester task or transfers ownership.

## Evidence And Return Packet

Playtester returns a task message. It does not write a repository report. The return packet states:

```text
Verdict: PASS | PASS WITH CONCERNS | FAIL
Claim and test flow:
Environment: device, viewport, input method, build or commit identity
Observed evidence: ordered player actions and observed result
Canonical expectation: source and requirement checked
Concerns or failures: player impact, reproducibility, and severity
Recommended route: owner and canonical source, if follow-up is needed
Retest required: yes or no; exact condition
```

Evidence must be specific enough that UI/UX, Test Automation, or the responsible owner can reproduce the observed player path. Screenshots, captures, or short recordings may support the finding when available, but they do not replace the written flow and observed result.

## Verdicts

| Verdict | Meaning |
| --- | --- |
| PASS | The tested player-facing claim works through the required flow. No material concern remains. |
| PASS WITH CONCERNS | The claim works, but a bounded concern is recorded. The packet states whether it requires a retest before closure. |
| FAIL | The claim does not work, is not understandable, is inaccessible for the stated path, or exposes a material player-impacting defect. |

Playtester gives no verdict when the activation gate or sender packet is incomplete. It rejects the assignment instead.

## Escalation

| Finding | Route |
| --- | --- |
| Interaction, mobile, accessibility, hierarchy, or feel concern | UI/UX and Test Automation; cite the canonical UI or accessibility source |
| Rule meaning, counterplay, content comprehension, or player promise conflict | Game Design and Architecture; cite the canonical rule or content source |
| Shared ownership, sequencing, task boundary, or closure uncertainty | Orchestrator |
| Product-outcome or approved non-goal change | Product Management and the user |
| Missing deterministic coverage or non-reproducible behavior | Test Automation and the responsible owner |

The Orchestrator records only durable shared state, ownership, dependency, or closure changes in the coordination ledger. The canonical owner updates a rule, UI, accessibility, or validation document when the finding changes that contract.

## Retest And Closure

After a FAIL, the responsible owner fixes or explicitly rejects the finding through the established process. After a PASS WITH CONCERNS, the Orchestrator decides whether the stated retest condition blocks the slice. Test Automation reruns applicable deterministic coverage after a relevant change. The Orchestrator reopens Playtester only when the original player-facing claim needs independent confirmation.

The Playtester handoff closes only when the return packet is acknowledged, required follow-up and retest evidence are complete, the canonical documentation agrees, and the Orchestrator records the verified result. The Orchestrator then archives the separate local Playtester task.
