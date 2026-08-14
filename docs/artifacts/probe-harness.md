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
| `legality` | The `EncounterEngine.legality` / `legal_actions` seam: the player-action legality matrix, target-aware fire enumeration, and the invariant that `apply` succeeds if and only if `legality` agrees, with matching rejection reasons. |
| `engine_seam` | The Encounter Engine module surface: the documented seam and read projections are callable, the action-resolution callback surface is not, no resolver collaborator is exposed, no separate resolver module exists, and the load/charge/fire flow resolves through `apply` alone. |
| `action_stream` | ADR 0015's stream contract: Full-Charge Cleanup, Round rollover (with draws and reshuffles), every phase transition, and Encounter Clock expiry ride history as first-class actions; `advance_phase` returns its complete ordered slice; and `PlayerState` folds the stream into consumed-once Slot transition cues. |
| `parity` | Visible direct-manipulation flows project the same rules state and outcomes owned by `EncounterEngine`. |
| `resolver` | Spatial resolution of authored Boss Timeline beats from an `EncounterSnapshot`. |
| `target_patterns` | BoardQuery-owned reusable Target Pattern catalog results for all nine core patterns, six legal facings where applicable, stable ordering, and edge clipping. |
| `target_bound_patterns` | BoardQuery-owned Target-Bound Pattern resolution: Tank selector first, source-to-target Facing snap, selected-versus-affected Piece identity, inclusion, continuation, and clipping. |
| `encounter` | New-player direct-manipulation flow through several complete Rounds. |
| `layout` | Desktop responsive-layout bounds. |
| `mobile` | Portrait HUD hierarchy and mobile interaction contract. |
| `accessibility` | Touch target, focus, and command contrast contract. |
| `focused_end_of_clock` | Scene-free Encounter Clock end-of-clock defeat using the authored round limit and enrage text, with a stable trace artifact. |
| `replay` | Seeded, replayable Full-Charge Cleanup scenario and JSON failure-artifact schema. |
| `records` | Encounter Record schema, content fingerprint, explicit damage facts, invalid-record diagnostics, aggregate grouping, and timestamped/latest report artifact emission. |
| `record_scene` | Playable-scene record lifecycle for completion, restart abandonment, manual abort, and application exit. |
| `riposte` | Authored Tank Hit context, Guarded Front and zero-loss grant, non-grant/non-refresh, first-following-Quick expiry, legal Shield Slam consumption/payoff, Status Effect projection, and normalized Encounter Record facts. |
| `riposte_live` | Production `embermaw_embers`, encounter geometry, and two Iron Guards prove the reachable Quick setup into Incoming Raking Claw and Riposte Ready grant without changing live content. |
| `riposte_ui` | Portrait HUD projection of active Riposte Ready, qualifying reason, Quick expiry, legal Shield Slam consumption, and `+2` payoff without adding a meter, combat log, or UI-owned rules. |
| `deck_eval_report` | Fixed-seed deck-evaluation cohort report grouping, raw viability totals, and per-Round Hand/Slot/legal-useful-action/selected-action evidence. |
| `controlled_deck_eval_report` | Evaluation-only Elian controlled test-deck cohort report grouping, stable fingerprint, raw viability totals, and per-Round evidence. |
| `starter_deck_promotion` | Live/default Elian starter-deck composition, distinct historical evaluation fixture, and post-promotion record/report labels. |

The report writer returns failure if either documented Markdown artifact cannot be written. The `records` Probe verifies both paths, while `report_encounter_records.ps1` uses the same writer. Test Automation re-review evidence is the focused run of `-Probe records,record_scene`, followed by `report_encounter_records.ps1` and inspection of `tmp/encounter-records/report-*.md` plus `latest-report.md`.

## Lifecycle

A **Spike** is a short-lived, decision-seeking experiment. Put it in `scripts/debug/` with a descriptive `_spike.gd` name, state its question and exit condition at the top, and do not add it to the default suite.

A **Probe** protects a decided, observable contract. Put it in `scripts/debug/` with a descriptive `_probe.gd` name; run it headlessly; give success output a stable `*_OK` marker; use explicit assertion messages in the project vocabulary; and add it to `run_probes.ps1` only when it is deterministic and worth retaining.

When a Spike answers its question, either delete it or promote the durable assertion into a Probe. Record an enduring rule in `docs/rules/` and an architectural choice in `docs/adr/`; keep evidence and playtest observations in `notes/` or `docs/artifacts/`.

Encounter scenarios use setup-only fixtures, then `EncounterAction` records with explicit expected rejections where needed. The runner can execute one named scenario with `-Scenario <id>`. Probe failures write normalized JSON evidence beneath Git-ignored `tmp/probe-artifacts/<scenario-id>/`; retain those artifacts until diagnosis is complete, then clean them with `Remove-Item -Recurse -Force ./tmp/probe-artifacts`.

## Choosing The Thinnest Useful Probe Layer

Choose the smallest layer that proves the contract without inventing a second gameplay path:

1. Use a focused scene-free rules Probe when one authoritative `EncounterEngine` or `BoardQuery` contract can be asserted directly through public state, phase advancement, or action results. This is the first choice for defeat/end-of-clock behavior, invalid-action matrices, and narrow Slot/Status lifecycle checks.
2. Use a scenario, report, or serializer Probe when deterministic setup, normalized failure artifacts, or report output is the contract under test. Keep fixtures and evidence in `scripts/debug/` adapters rather than broadening production rules seams.
3. Use a broad acceptance or presentation Probe only when the contract genuinely crosses layers, such as scene adaptation, player-visible hierarchy, production-resource reachability, or replay/record integration.

If a focused rules Probe cannot prove the contract through existing public authority, demonstrate the missing fact explicitly before proposing a new engine, replay, or record seam.

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

## Focused Rules Probe Interface

The pilot proof-of-value focused rules Probe is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe focused_end_of_clock
```

Expected marker is `FOCUSED_END_OF_CLOCK_PROBE_OK advances=40 artifact=res://tmp/probe-artifacts/focused_end_of_clock/end_of_clock_trace.json`. The Probe starts a scene-free `EncounterEngine` with the live Encounter's authored round limit and enrage text, removes unrelated Boss programs, advances the public phase loop deterministically, and asserts that the Encounter Clock ends in defeat from the terminal Slow advance with no rules-history mutation or extra top-level actions. It writes a stable JSON trace artifact at `tmp/probe-artifacts/focused_end_of_clock/end_of_clock_trace.json`.

This focused layer does not add a production test helper, UI behavior, replay schema, Encounter Record schema, or a broader acceptance Probe. It exists to prove one external rules contract cheaply before a slice needs parity, records, or presentation evidence.

## Target Pattern Resolver Interface

`BoardQuery.resolve_target_pattern(board_hexes, catalog_id, origin, options = {})` is the scene-free authority for the reusable Target Pattern catalog. It resolves geometry before any combatant, allegiance, target, or range filter and returns a normalized result with `catalog_id`, `selection_binding`, `origin`, `anchor`, `facing`, and stable ordered on-board `impacts`. Non-directional patterns return an empty `facing`; directional patterns expose one of `E`, `NE`, `NW`, `W`, `SW`, or `SE`. Edge behavior clips off-board cells only, with no wrapping or placeholder targets.

The focused Probe is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe target_patterns
```

Expected marker is `TARGET_PATTERN_RESOLVER_PROBE_OK patterns=9 facings=6`. The Probe covers `Target`, `Radius`, `Ring`, `FrontCone`, `BackCone`, `FrontLine`, `BackLine`, `Sides`, and `Cross`; central and edge origins; every legal Facing for directional entries; selection binding; result identity; stable ordering; and legal-board clipping. It does not validate image references, target-selection UI, live card effects, combatant filtering, encounter behavior, or out-of-catalog patterns such as `Pinwheel`, `Stripes`, `SafeButt`, or `RaidWide`.

## Target-Bound Pattern Resolver Interface

`BoardQuery.resolve_target_bound_pattern(board_hexes, source_piece, candidate_pieces, target_selector, catalog_id, options = {})` composes the existing Target Selector and Target Pattern seams without changing live encounter content. It resolves the selected Piece first, derives a legal hex-edge Facing from source to selected Piece, resolves the authored directional Target Pattern from the source origin, then derives affected Piece IDs from the resulting on-board impacts. The result exposes `selected_piece_id` / `selected_coords` separately from `affected_piece_ids`, and returns `valid = false` with `invalid_reason = "same_hex_no_direction"` when source and selected Piece share a hex without an authored fallback.

The focused Probe is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe target_bound_patterns
```

Expected marker is `TARGET_BOUND_PATTERN_PROBE_OK facings=6`. The Probe covers selector-first Tank resolution, all six legal Facing snaps, selected Tank inclusion, beyond-Tank continuation, authored exclusion/no-continuation flags, off-board clipping, same-hex invalidation, and selected-versus-affected identity. It does not change Embermaw resources, Raking Claw, Cinder Breath, player-card targeting UI, arbitrary-angle aiming, persistent player-facing, or scene presentation.

## Combat Postures Interface

The `riposte` Probe exercises the production rules path directly. `BossProgramBeat.target_selector` carries authored Target Selector identity for targeted Boss hits, `BossProgramBeat.damage_classification` carries authored Tank Hit identity into `TimelineResolver`; `BoardQuery.is_guarded_front` owns the positional predicate; `EncounterEngine` owns post-damage grant evaluation, matching-Card consumption, and end-of-Quick expiry. `ActionResolver` attaches the resulting additive facts to the already-authoritative Damage, Fire Slot, and Expire Status actions. The probe serializer observes those actions and active Status Effects without implementing trigger rules.

Run the focused engine and record boundary:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe riposte,parity,records,record_scene
```

Expected markers are `RIPOSTE_READY_PROBE_OK`, `LIVE_SDK_PARITY_OK`, `ENCOUNTER_RECORD_PROBE_OK`, `ENCOUNTER_RECORD_SCENE_PROBE_OK`, and `PROBE_SUITE_OK count=4`. QA Automation independently verifies exact grant and non-grant decisions, non-stack/no-refresh, both Boss tracks, authored Tank selector facts, rejected/nonmatching Slot behavior, legal Shield Slam `+2`, exactly-one first-following-Quick expiry, projection fields, every documented schema-v1 lifecycle/payoff field, and equality of two independently normalized consume/expiry traces.

The separate production acceptance uses only setup fixtures around authored Resources:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe riposte_live
```

`RIPOSTE_PRODUCTION_PATH_PROBE_OK` proves the real `embermaw_embers` Resource and two real Iron Guards build `4` Armor in Quick, remain in Guarded Front, and grant Riposte Ready from the authored `Tank` selector, `4`-damage Incoming Raking Claw with `0` Health loss. These interfaces add no test-authored rule path, event bus, posture framework, HUD behavior, Interception, analytics, live-content/deck/seed/starting-hand edits, live-content reordering, or schema-v2 dependency.

The player-visible presentation probe is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe riposte_ui
```

Expected marker is `RIPOSTE_STATUS_UI_PROBE_OK`. The probe mounts the portrait scene, injects a deterministic engine state that already has the authoritative active Status Effect, and asserts the UI names Riposte Ready, the qualifying Tank Hit reason, the Quick expiry boundary, Shield Slam consumption, and the `+2` payoff. It then fires a legal Shield Slam and confirms the pane clears from the authoritative status projection while payoff feedback is derived from the consumed `status_event` and generated Boss-damage Resolution Fact. It does not mutate live content, reorder decks, change status logic, expose Encounter Records as a HUD log, or add a posture meter.

## Deck-Evaluation Cohort Interface

The fixed-seed baseline scenario is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Scenario deck_eval_baseline
```

Expected marker is `DECK_EVAL_BASELINE_PROBE_OK labels=baseline-a,baseline-b,baseline-c`. The scenario uses the live `embermaw_prototype` Encounter and live starter deck with probe-local seeds `1337`, `7331`, and `20260813`. It writes three Encounter Records with metadata `{ run_label, evaluation_purpose: "combat_postures_issue_05", scenario_id: "deck_eval_baseline" }` and does not edit live content, deck, seed, starting hand, or teaching pacing.

The report validation probe is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe records,deck_eval_report
```

Expected markers are `ENCOUNTER_RECORD_PROBE_OK`, `DECK_EVAL_REPORT_PROBE_OK cohorts=3 labels=baseline-a,baseline-b,baseline-c`, and `PROBE_SUITE_OK count=2`. `deck_eval_report` regenerates the three-record baseline packet, writes the canonical aggregate report, and asserts one unchanged fingerprint, labeled seed rows, separate outcomes/end kinds, raw viability totals, per-Round Hand/Slot/legal-useful-action/selected-action rows, and `latest-report.md`.

This interface is an Evidence Cohort handoff for QA and Design. It does not add a broad analytics platform, dashboard, telemetry backend, HUD scoring, human play-feel judgment, broad seed sweep, or gameplay/content change.

The controlled Elian test-deck scenario is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Scenario controlled_deck_eval
```

Expected marker is `CONTROLLED_DECK_EVAL_PROBE_OK labels=controlled-a,controlled-b,controlled-c`. The scenario uses `resources/decks/evaluation/aegis_controlled_test_deck.tres`, an evaluation-only historical/repro configuration that remains distinct from the live/default Encounter resource. It wraps the live Embermaw prototype Encounter plus the approved proposal-03 20-card candidate list: `8x steady_strike`, `6x iron_guard`, `2x sweeping_blow`, `2x fortify`, and `2x shield_slam`. Proposal 04 separately promoted the same card list to the live/default starter deck, so the controlled probe must not assert or imply the old `10x steady_strike` / `10x iron_guard` default. The scenario uses the same fixed seeds `1337`, `7331`, and `20260813` with labels `controlled-a`, `controlled-b`, and `controlled-c`; those labels must remain separate from historical `baseline-a/b/c` and post-promotion `starter-promotion-a/b/c`.

The controlled scenario also asserts the Playtester retest prerequisite: at least one fixed-seed controlled run reaches legal Riposte Ready consumption through Shield Slam without forced hand/order setup. The evaluation driver may choose among naturally available legal actions, but it still uses normal `load_slot`, `charge_slot`, `fire_slot`, and phase advancement. Current evidence is `controlled-a`, where Shield Slam consumes `riposte_ready` in Quick and generates Boss damage `requested=5`, `base_amount=3`, `status_bonus=2`, and `payoff_card_id=shield_slam`.

The controlled report validation probe is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe records,controlled_deck_eval_report
```

Expected markers are `ENCOUNTER_RECORD_PROBE_OK`, `CONTROLLED_DECK_EVAL_REPORT_PROBE_OK cohorts=3 labels=controlled-a,controlled-b,controlled-c`, and `PROBE_SUITE_OK count=2`. `controlled_deck_eval_report` regenerates the controlled three-record packet, filters the aggregate reader output to the controlled records it generated, writes the canonical aggregate report for that packet, and asserts one stable controlled-content fingerprint, fixed seed labels, the evaluation-only content root, raw viability totals, per-Round evidence rows, and the same legal Riposte Ready -> Shield Slam payoff evidence. The aggregate reader may still contain other valid records or malformed/unsupported diagnostics; the controlled report probe must not assume the root contains only three files or that every valid record uses the evaluation fixture. It does not promote the controlled deck, guarantee hands, force order, alter live seeds, or change gameplay rules.

The default starter-deck promotion probe is:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe content,starter_deck_promotion
```

Expected markers are `CONTENT_VALIDATION_OK`, `STARTER_DECK_PROMOTION_PROBE_OK labels=starter-promotion-a,starter-promotion-b,starter-promotion-c`, and `PROBE_SUITE_OK count=2`. `starter_deck_promotion` proves the Encounter-owned live/default `resources/encounters/embermaw_prototype.tres` deck is exactly `8x steady_strike`, `6x iron_guard`, `2x sweeping_blow`, `2x fortify`, and `2x shield_slam`; proves `resources/decks/evaluation/aegis_controlled_test_deck.tres` remains a distinct evaluation-only historical/repro fixture; and writes canonical reports using `scenario_id: "starter_deck_promotion"`, `evaluation_purpose: "aegis_default_deck_promotion"`, and labels `starter-promotion-a`, `starter-promotion-b`, and `starter-promotion-c`. It must not reuse historical `baseline-a/b/c` or `controlled-a/b/c` meaning and does not change rules, boss programs, live seed, hand guarantees, pacing, or UI behavior.

## Why this shape

The repository already has the key seam: ADR 0009 makes `EncounterEngine` the scene-free source of truth, while the scene probes cover the adaptation layer. The harness makes that separation routine: a mechanic first earns a rules-level Probe, and a player-visible contract then earns a focused scene/UI Probe. This is the useful part of Duelyst's SDK split without importing its server, PvP, replay, or collectible-card infrastructure.
