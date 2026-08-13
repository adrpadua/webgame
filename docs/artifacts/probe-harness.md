# Spikes and Probes Harness

The harness keeps the **Encounter** rules and player-facing presentation independently verifiable while the prototype evolves. It is a runner over existing Godot headless scripts, not a competing test framework.

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe rules,resolver
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Scenario full_charge_cleanup
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Godot 'C:\path\to\Godot_console.exe'
```

The default suite is intentionally named and stable. The runner gives each Probe a 15-second ceiling and fails on a non-zero Godot exit, engine error, or failed assertion:

| Probe | Contract |
| --- | --- |
| `content` | Every designer-authored Resource loads and satisfies the content contract, with actionable path-based failures. |
| `rules` | Scene-free **Encounter** rules, action records, Slots, Status Effects, Hazards, and Boss Timeline execution. |
| `parity` | Visible direct-manipulation flows project the same rules state and outcomes owned by `EncounterEngine`. |
| `resolver` | Spatial resolution of authored Boss Timeline beats from an `EncounterSnapshot`. |
| `encounter` | New-player direct-manipulation flow through several complete Rounds. |
| `layout` | Desktop responsive-layout bounds. |
| `mobile` | Portrait HUD hierarchy and mobile interaction contract. |
| `accessibility` | Touch target, focus, and command contrast contract. |
| `replay` | Seeded, replayable Full-Charge Cleanup scenario and JSON failure-artifact schema. |
| `records` | Encounter Record schema, content fingerprint, explicit damage facts, invalid-record diagnostics, aggregate grouping, and timestamped/latest report artifact emission. |
| `record_scene` | Playable-scene record lifecycle for completion, restart abandonment, manual abort, and application exit. |
| `riposte` | Authored Tank Hit context, Guarded Front and zero-loss grant, non-grant/non-refresh, first-following-Quick expiry, legal Shield Slam consumption/payoff, Status Effect projection, and normalized Encounter Record facts. |
| `riposte_live` | Production `embermaw_embers`, encounter geometry, and two Iron Guards prove the reachable Quick setup into Incoming Raking Claw and Riposte Ready grant without changing live content. |
| `riposte_ui` | Portrait HUD projection of active Riposte Ready, qualifying reason, Quick expiry, legal Shield Slam consumption, and `+2` payoff without adding a meter, combat log, or UI-owned rules. |

The report writer returns failure if either documented Markdown artifact cannot be written. The `records` Probe verifies both paths, while `report_encounter_records.ps1` uses the same writer. Test Automation re-review evidence is the focused run of `-Probe records,record_scene`, followed by `report_encounter_records.ps1` and inspection of `tmp/encounter-records/report-*.md` plus `latest-report.md`.

## Lifecycle

A **Spike** is a short-lived, decision-seeking experiment. Put it in `scripts/debug/` with a descriptive `_spike.gd` name, state its question and exit condition at the top, and do not add it to the default suite.

A **Probe** protects a decided, observable contract. Put it in `scripts/debug/` with a descriptive `_probe.gd` name; run it headlessly; give success output a stable `*_OK` marker; use explicit assertion messages in the project vocabulary; and add it to `run_probes.ps1` only when it is deterministic and worth retaining.

When a Spike answers its question, either delete it or promote the durable assertion into a Probe. Record an enduring rule in `docs/rules/` and an architectural choice in `docs/adr/`; keep evidence and playtest observations in `notes/` or `docs/artifacts/`.

Encounter scenarios use setup-only fixtures, then `EncounterAction` records with explicit expected rejections where needed. The runner can execute one named scenario with `-Scenario <id>`. Probe failures write normalized JSON evidence beneath Git-ignored `tmp/probe-artifacts/<scenario-id>/`; retain those artifacts until diagnosis is complete, then clean them with `Remove-Item -Recurse -Force ./tmp/probe-artifacts`.

## Scenario Fixture And Outcome Interface

The bounded caller is Test Automation authoring deterministic rules scenarios. `EncounterProbeScenario` exposes a small setup/action interface, while `EncounterProbeRunner` is the only Adapter that translates fixtures into pre-action board state and evaluates declared outcomes. Gameplay code and scene code do not consume this interface.

Setup follows these invariants:

- Call `register_minion(minion)` before `place_minion(minion_content_id, coords, requested_entity_id = &"")`.
- Registration and placement are setup-only and must happen before the first action is added.
- `place_minion` returns a stable entity ID. With no requested ID, IDs are deterministic and content-derived: `<minion-content-id>_fixture_<sequence>`.
- The runner applies fixtures after `EncounterEngine.start` and before the initial snapshot. Placement uses authored Minion health and identity, creates no `EncounterAction`, and leaves Encounter history empty.
- An invalid ID or unavailable hex produces a fixture-index/path diagnostic, writes the normal failure artifact, and prevents action execution.
- The normalized trace includes `setup_fixtures`; replay requires the same fixture description.

Action outcomes follow these invariants:

- `fire_slot(hero_id, slot_index, target_id)` preserves the explicit target ID in the action tape and Encounter history.
- `expect_rejection(reason_contains, rules_state_unchanged = true)` annotates the immediately preceding action. It is invalid after `advance_phase` or without a preceding action.
- Reason matching is case-sensitive substring matching against the engine-authored rejection reason.
- An expected rejection fails the Probe if the action succeeds, the reason does not match, or normalized rules state changes. The state comparison excludes only `history_cursor`, because the rejected `EncounterAction` remains in history and in the trace as evidence.

Implementation lives in `scripts/debug/EncounterProbeScenario.gd` and `scripts/debug/EncounterProbeRunner.gd`; normalized evidence remains owned by `scripts/debug/EncounterProbeSerializer.gd`. Executable rules coverage lives in `whelp_clear_probe.gd` and `slow_top_card_cleanup_probe.gd`.

The two bounded scenarios are registered in the shared scenario catalog:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Scenario whelp_clear,slow_top_card_cleanup
```

Expected markers are `WHELP_CLEAR_PROBE_OK` and `SLOW_TOP_CARD_CLEANUP_PROBE_OK`. Test Automation is the independent verifier.

This interface does not add production-engine fixture methods, generalized scenario authoring, HUD behavior, auto-targeting, live-deck changes, or Whelp AI. Lethal Minion removal is an authoritative damage rule, not probe behavior: `EncounterEngine.apply_damage` removes the defeated Minion and its owned status state, frees the hex, and records `target_removed = true` without a separate cleanup action.

## Combat Postures Interface

The `riposte` Probe exercises the production rules path directly. `BossProgramBeat.damage_classification` carries authored Tank Hit identity into `TimelineResolver`; `BoardQuery.is_guarded_front` owns the positional predicate; `EncounterEngine` owns post-damage grant evaluation, matching-Card consumption, and end-of-Quick expiry. `ActionResolver` attaches the resulting additive facts to the already-authoritative Damage, Fire Slot, and Expire Status actions. The probe serializer observes those actions and active Status Effects without implementing trigger rules.

Run the focused engine and record boundary:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe riposte,parity,records,record_scene
```

Expected markers are `RIPOSTE_READY_PROBE_OK`, `LIVE_SDK_PARITY_OK`, `ENCOUNTER_RECORD_PROBE_OK`, `ENCOUNTER_RECORD_SCENE_PROBE_OK`, and `PROBE_SUITE_OK count=4`. QA Automation independently verifies exact grant and non-grant decisions, non-stack/no-refresh, both Boss tracks, rejected/nonmatching Slot behavior, legal Shield Slam `+2`, exactly-one first-following-Quick expiry, projection fields, every documented schema-v1 lifecycle/payoff field, and equality of two independently normalized consume/expiry traces.

The separate production acceptance uses only setup fixtures around authored Resources:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe riposte_live
```

`RIPOSTE_PRODUCTION_PATH_PROBE_OK` proves the real `embermaw_embers` Resource and two real Iron Guards build `4` Armor in Quick, remain in Guarded Front, and grant Riposte Ready from the authored `4`-damage Incoming Raking Claw with `0` Health loss. These interfaces add no test-authored rule path, event bus, posture framework, HUD behavior, Interception, analytics, live-content/deck/seed/starting-hand edits, live-content reordering, or schema-v2 dependency.

The player-visible presentation probe is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe riposte_ui
```

Expected marker is `RIPOSTE_STATUS_UI_PROBE_OK`. The probe mounts the portrait scene, injects a deterministic engine state that already has the authoritative active Status Effect, and asserts the UI names Riposte Ready, the qualifying Tank Hit reason, the Quick expiry boundary, Shield Slam consumption, and the `+2` payoff. It then fires a legal Shield Slam and confirms the pane clears from the authoritative status projection while payoff feedback is derived from the consumed `status_event` and generated Boss-damage Resolution Fact. It does not mutate live content, reorder decks, change status logic, expose Encounter Records as a HUD log, or add a posture meter.

## Why this shape

The repository already has the key seam: ADR 0009 makes `EncounterEngine` the scene-free source of truth, while the scene probes cover the adaptation layer. The harness makes that separation routine: a mechanic first earns a rules-level Probe, and a player-visible contract then earns a focused scene/UI Probe. This is the useful part of Duelyst's SDK split without importing its server, PvP, replay, or collectible-card infrastructure.
