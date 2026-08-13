# Present Riposte Ready Status

Status: resolved
Owner: UI/UX
Blocked by: 01, 02

## Prerequisite

The active board-camera shared-file ownership and verification handoff must close before UI/UX claims overlapping presentation paths.

## Outcome

Project the authoritative Riposte Ready Status Effect, trigger reason, remaining expiry boundary, consumption, and Shield Slam payoff clearly in portrait play without adding a meter or a second rules authority.

## Canonical Sources

- `docs/artifacts/embermaw-vertical-slice.md`
- `docs/artifacts/accessibility.md`
- Confirmed rule contract from issue 01
- Architecture projection contract from issue 02

## Required Handoff

Record visual/interaction decisions, affected files, temporary edit ownership, accessibility behavior, and focused evidence. Architecture verifies state/action/record boundaries; QA verifies presentation, legibility, accessibility, and regressions.

## Non-Goals

No HUD-only trigger or expiry logic, default resource meter, broad HUD redesign, or speculative engine action.

## Acceptance

The player can identify why Riposte Ready appeared, when it expires, when Shield Slam will consume it, and that the `+2` payoff occurred. Presentation remains derived from authoritative state.

## Comments

- 2026-08-13: UI/UX claimed and implemented the visible Riposte Ready presentation after issues 01-03 and board-camera ownership closed. Temporary UI ownership covered `scripts/Main.gd`, `scripts/debug/riposte_status_ui_probe.gd`, `scripts/debug/run_probes.ps1`, `docs/artifacts/embermaw-vertical-slice.md`, `docs/artifacts/accessibility.md`, `docs/artifacts/probe-harness.md`, and this issue file. The player-facing surface is a compact portrait Status Effect pane plus existing feedback text after consumption; it is derived from active `EncounterEngine.status_effects` and authoritative action Resolution Facts. It adds no meter, combat log, rule inference, Encounter Record lifecycle change, live content/deck/seed edit, or issue-05 teaching setup change.
- 2026-08-13: Confirmed UI decisions were recorded in the canonical UI/accessibility/probe docs. Status: confirmed. Rationale: the player must see the trigger reason, Quick expiry, legal Shield Slam spender, and `+2` payoff without mistaking Riposte Ready for a resource. Owner: UI/UX. Affected areas: portrait mobile HUD, feedback label, focused probe catalog/docs. Follow-up: Architecture verifies projection/action/record boundaries; QA verifies legibility, accessibility, no-overlap, and regressions.
- 2026-08-13: UI/UX focused evidence passed: direct Godot `riposte_status_ui_probe.gd` emitted `RIPOSTE_STATUS_UI_PROBE_OK`; `run_probes.ps1 -Probe riposte_ui` emitted `RIPOSTE_STATUS_UI_PROBE_OK` and `PROBE_SUITE_OK count=1`; `run_probes.ps1 -Probe mobile,accessibility,riposte,riposte_live,parity,records,record_scene,riposte_ui` emitted `MOBILE_HUD_PROBE_OK`, `ACCESSIBILITY_PROBE_OK controls=29`, `RIPOSTE_READY_PROBE_OK`, `RIPOSTE_PRODUCTION_PATH_PROBE_OK`, `LIVE_SDK_PARITY_OK`, `ENCOUNTER_RECORD_PROBE_OK`, `ENCOUNTER_RECORD_SCENE_PROBE_OK`, `RIPOSTE_STATUS_UI_PROBE_OK`, and `PROBE_SUITE_OK count=8`. Scoped `git diff --check` exited `0` with line-ending warnings only.
