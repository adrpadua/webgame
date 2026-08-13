# Implement Status Trigger And Record Seam

Status: resolved
Owner: Architecture
Blocked by: 01

## Outcome

Design and implement the smallest generic engine-facing seam needed for one Hero Status Effect, one authored Tank Hit classification, a Guarded Front board predicate, deterministic expiry/consumption, additive Shield Slam payoff, and normalized Encounter Record facts.

## Canonical Sources

- Confirmed rule contract from issue 01
- Applicable ADRs
- `docs/artifacts/encounter-records.md`
- `docs/artifacts/probe-harness.md`

## Required Contract

State intended callers, small public interface, invariants, affected paths, rationale, exact Resolution Facts/record lifecycle, validation command, verifier, and explicit non-goals before implementation. Prefer deepening existing EncounterEngine, authored Boss Beat, Status Effect, ActionResolver, board, and record seams. Add an ADR only for a durable surprising choice with real alternatives.

## Non-Goals

No universal event bus, general posture framework, analytics system, HUD behavior, Interception/multi-Hero work, or hidden resource.

## Acceptance

Deterministic engine coverage proves grant/non-grant/non-stack/no-refresh/expiry/consumption and unchanged existing rules/record behavior. QA independently verifies.

## Architecture Contract

- **Callers:** `TimelineResolver` annotates authored Boss damage; `ActionResolver` asks `EncounterEngine` to evaluate the resolved hit and a legal Slot fire; `EncounterEngine` expires matching effects when leaving Quick; UI reads status projection later; Encounter Records serialize actions and snapshots without owning rules.
- **Interface:** one authored `BossProgramBeat.damage_classification`; `BoardQuery.is_guarded_front`; bounded trigger, Quick-expiry, and matching-Card consumption fields on `StatusEffect`; optional additive damage fact context; one engine-owned status-expiry action; narrow status lookup/evaluation helpers on `EncounterEngine`.
- **Invariants:** only an authored Boss Tank Hit against the current Aegis primary Hero qualifies; Guarded Front and `health_loss == 0` are evaluated after mitigation; Riposte Ready never stacks or refreshes; an Instant- or Incoming-Row grant expires when leaving the first subsequent Quick Window; only a legal Shield Slam consumes it; rejected and nonmatching Slot actions do not; the payoff resolves as base Shield Slam damage plus `2` in one authoritative Boss damage action.
- **Resolution Facts:** Tank Hit damage records authored classification, Beat ID/track, Guarded Front result, and grant evaluation; grant, consume, and expire facts share `status_id`, `event`, and `reason`, with trigger/expiry/Card/payoff fields where applicable. These are additive schema-v1 action facts.
- **Affected paths:** `scripts/boss/BossProgramBeat.gd`, `scripts/sdk/TimelineResolver.gd`, `EncounterAction.gd`, `ActionResolver.gd`, `EncounterEngine.gd`, `StatusEffect.gd`, `scripts/hex/BoardQuery.gd`, authored Embermaw Boss Programs, the action/status serializer, one focused Probe and runner registration, `docs/artifacts/encounter-records.md`, and `docs/artifacts/probe-harness.md`.
- **Validation:** the focused Probe covers qualifying and nonqualifying grants, non-stack/no-refresh, Instant and Incoming timing, rejected/nonmatching fires, legal Shield Slam consumption and `+2`, expiry, and normalized serialization. Existing SDK, records, and parity probes remain regression gates. QA Automation independently verifies issue 03.
- **Non-goals:** no event bus, posture/Awakening framework, Interception, multi-Hero identity layer, HUD behavior, analytics/schema-v2 work, or live-deck promotion.

## Implemented Fact Shapes

- Tank Hit damage: ordinary damage fields plus `damage_classification`, `boss_beat_id`, `boss_track`, `guarded_front`, and `status_evaluation = { status_id, result, reason }`. A grant also has `status_event`.
- Shared lifecycle event: `{ status_id, event, reason, expires_at_window_end, source_id, source_beat_id, trigger_round, trigger_phase }`.
- Shield Slam consumption extends that event with `card_id` and `bonus_boss_damage`; its generated Boss damage adds `base_amount`, `status_bonus`, `status_id`, and `payoff_card_id`.
- Unconsumed expiry is one successful `expire_status` action with a lifecycle event, not a hidden cleanup or UI event.
- Active status snapshots expose ID/title, triggers, trigger reason/boundary, source/Beat, and trigger Round/phase. All values normalize through the existing schema-v1 serializer.

## Implementation Decisions

The payoff is folded into Shield Slam's single generated Boss damage action so damage totals and Resolution Facts describe one authored hit. Expiry is an explicit engine action because the end-of-Quick boundary otherwise has no recordable action. `StatusEffect` fields remain bounded trigger metadata used by this first slice; no subscription/event-dispatch layer was introduced. No ADR is warranted because these choices deepen ADR 0009's existing authoritative SDK/action-history boundary.

## Architecture Evidence

Verified 2026-08-13T14:26:17-07:00:

- `run_probes.ps1 -Probe riposte,parity,records,record_scene` emitted `RIPOSTE_READY_PROBE_OK`, `LIVE_SDK_PARITY_OK`, `ENCOUNTER_RECORD_PROBE_OK`, `ENCOUNTER_RECORD_SCENE_PROBE_OK`, and `PROBE_SUITE_OK count=4` with no script errors.
- `run_probes.ps1 -Probe rules,resolver -Scenario whelp_clear,slow_top_card_cleanup` emitted `SDK_ENCOUNTER_HARNESS_OK`, `ENCOUNTER_RESOLVER_PROBE_OK`, `WHELP_CLEAR_PROBE_OK`, `SLOW_TOP_CARD_CLEANUP_PROBE_OK`, and `PROBE_SUITE_OK count=4`.
- Godot's headless editor scan registered the changed global classes without compile errors.
- `git diff --check` exited `0`; only existing line-ending notices were printed.

QA Automation is the independent verifier. Architecture retains temporary ownership of the listed engine/resource/probe/record-contract paths until QA closes issue 03. The concurrently active Mobile Continue/Help layout is separately red and UI/UX-owned; it does not change this engine/record evidence.

## Comments

- 2026-08-13: QA independently verified the engine/record behavior and all documented normalized fact shapes after Architecture added Beat/track/evaluation, complete lifecycle, consume/payoff, exactly-one expiry/reason, and JSON-equal normalized trace assertions. Issue 02 is resolved. Issue 03 remains active for a separate production-resource Ember Pattern scenario.

### Conditional-Fail Remediation

The focused Probe now asserts the complete promised contract rather than marker-only success: Instant Beat ID/track and full status evaluation; all eight shared fields on grant, consume, and expiry; consumption Card/bonus; payoff requested/base/bonus/Status/Card; exactly one expiry action and its reason; and byte-equal JSON for two independently normalized runs containing both consume and expiry traces. Both documented serial suites and `git diff --check` passed again after this expansion. No production rule changed during remediation.

### Production Reachability Correction

Architecture's initial reachability concern was incorrect: the production `embermaw_embers` Resource already places Raking Claw in Incoming. The focused Probe now proves the unmodified production path with two Iron Guards: load one, Charge it with the second during Quick for `4` Armor, remain in Guarded Front, then fully mitigate the authored `4`-damage Incoming Tank Hit and gain Riposte Ready. No live content was reordered or otherwise changed for this acceptance path.
