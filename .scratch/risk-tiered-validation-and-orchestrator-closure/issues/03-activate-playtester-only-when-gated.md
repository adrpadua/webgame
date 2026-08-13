# Activate Playtester Only When Gated

Status: in-progress
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

## Comments

2026-08-13 - Recommissioned Playtester verdict: **FAIL due to an observation-environment blocker, not a confirmed gameplay or UI regression.** The promoted `8/6/2/2/2` live deck and legal `Riposte Ready -> Shield Slam` record path were verified, and the game process launched responsively; however, PrintWindow, desktop capture, brightened recapture, and Windows UI Automation could not expose a readable Godot client surface. The tester therefore could not honestly observe the portrait status pane or `+2` payoff. UI/UX and Test Automation own the smallest reproducible visual-observation/capture route; rerun this bounded task only after that path is verified. Preserve `embermaw-vertical-slice.md` and `accessibility.md` as canonical UI sources.

2026-08-13 - Proposal 04 has since promoted the exact `8/6/2/2/2` Shield Wall list to the live/default Encounter deck. Design canonical reconciliation, Architecture migration, Test Automation independent verification, and coordinator serial recheck passed. UI/UX owner self-check and Test Automation gate review confirm the visible Riposte Ready -> legal Shield Slam `+2` player flow is now eligible and deterministically covered; no new probe is required. The existing `gpt-5.4` / `medium` temporary Playtester task was recommissioned read-only against `D:\dev\webgame` with the complete sender packet. Await its verdict, then route any finding and archive the task after verified closure.

2026-08-13 — UI/UX and Test Automation gate preflight both found the closed Riposte Ready status presentation eligible: it is a playable portrait/mobile comprehension, hierarchy, accessibility, and interaction-feel claim with UI/UX owner evidence and completed deterministic coverage. The bounded claim, 390x844 touch-style environment, expected sources, and UI/UX + Test Automation retest route are recorded in `docs/agents/playtesting.md`-governed handoff messages; no engine-only or probe-only work qualifies. The coordinator requested one temporary read-only Playtester task for this exact flow. No standing role, implementation ownership, or policy activation is created.

2026-08-13 — User-required task configuration is `gpt-5.4` with `medium` reasoning. A preliminary task created without that configuration was immediately stopped and archived before evidence collection; the single replacement task is being created with the required configuration. This is an operating detail only and does not alter product intent, the gate, or the no-standing-role boundary.

2026-08-13 — Temporary Playtester returned **FAIL** for the full end-to-end Riposte Ready portrait-flow claim. The default playable encounter still uses the unchanged two-card baseline and contains no Shield Slam, so a player cannot legally spend Riposte Ready or observe the `+2` payoff in the same live flow. This is not a UI or Combat Postures implementation defect: the controlled UI probe supports the pane, while the default playable cohort lacks the required card. Route the retest to the approved evaluation-only controlled Aegis cohort after its Architecture configuration and QA verification; UI/UX and Test Automation own any presentation/evidence finding then. Keep this task temporary and archive it after the retest/closure route is recorded.
