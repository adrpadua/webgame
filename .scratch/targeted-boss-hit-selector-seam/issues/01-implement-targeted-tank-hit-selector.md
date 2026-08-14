# Implement Targeted Tank Hit Selector

Status: resolved
Owner: Architecture

## Outcome

Add the smallest authored Target Selector representation needed for Raking Claw, migrate the three Embermaw resources to `Target: Tank. Deal 4 damage. Movement does not evade this hit.`, retain `tank_hit`, remove `Move`, retain `Mitigate`, and resolve damage against Tank without a front-arc occupancy gate.

## Canonical sources

- `CONTEXT.md`
- `docs/content/encounters/embermaw-prototype.md`
- `docs/rules/headless-rules-sdk.md`
- `docs/artifacts/probe-harness.md`

## Non-goals

No generalized selector framework beyond this bounded seam; no Cinder Breath change, tuning, UI, deck/encounter pacing, player-facing target selection, or record gameplay/outcome reinterpretation.

## Required evidence

Focused tests must show Raking Claw hits Tank when off the former arc, Cinder Breath remains avoidable through its geometry, Raking Claw preserves Tank Hit/Riposte facts, resources validate, and records expose normalized selector/target facts only as applicable.

## Required return

Return the mandatory packet with temporary ownership, public contract, paths, exact commands/results, and QA handoff.

## Implementation return

State: completed.

Outcome: Raking Claw now uses the bounded authored selector seam `BossProgramBeat.target_selector = "tank"` while retaining `damage_classification = "tank_hit"`. The three runnable Embermaw Raking Claws use the approved rules text `Target: Tank. Deal 4 damage. Movement does not evade this hit.`, expose only `Mitigate`, and no longer use former front-arc occupancy as hit legality. `TimelineResolver` carries `target_selector` into generated Damage facts so Encounter Records can distinguish selector-owned Tank attrition from avoidable board-pattern damage.

Non-goals preserved: no general targeting framework, tuning, UI, card/deck/pacing behavior, player-facing selector, Target Pattern behavior, Cinder Breath behavior, or record outcome reinterpretation.

Changed paths:

- `scripts/boss/BossProgramBeat.gd`
- `scripts/encounter/EncounterResolver.gd`
- `scripts/sdk/TimelineResolver.gd`
- `scripts/content/ContentValidator.gd`
- `scripts/debug/encounter_resolver_probe.gd`
- `scripts/debug/riposte_ready_probe.gd`
- `scripts/debug/riposte_production_path_probe.gd`
- `scripts/debug/encounter_record_probe.gd`
- `resources/boss/programs/embermaw_hunt.tres`
- `resources/boss/programs/embermaw_embers.tres`
- `resources/boss/programs/embermaw_brood.tres`
- `docs/artifacts/probe-harness.md`
- `docs/rules/headless-rules-sdk.md`
- `.scratch/targeted-boss-hit-selector-seam/issues/01-implement-targeted-tank-hit-selector.md`

Validation:

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\run_probes.ps1 -Probe content,resolver,riposte,riposte_live,records` -> `CONTENT_VALIDATION_OK resources=34 negative_contract=ok`; `ENCOUNTER_RESOLVER_PROBE_OK`; `RIPOSTE_READY_PROBE_OK`; `RIPOSTE_PRODUCTION_PATH_PROBE_OK`; `ENCOUNTER_RECORD_PROBE_OK`; `PROBE_SUITE_OK count=5`.
- Broader `content,resolver,riposte,riposte_live,parity,records,record_scene` was not usable as closure evidence because `parity` and `record_scene` currently fail on an unrelated `scripts/Main.gd` parse error: duplicate `_on_mobile_undo_pressed`.

Next owner: Test Automation should independently verify the focused headless packet and confirm the unrelated `Main.gd` parse blocker is routed to the current UI owner before scene-bound parity/record-scene evidence is used again.
