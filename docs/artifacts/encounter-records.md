# Encounter Records

**Encounter Records** are the local evidence trail for design playtests. They are not an in-game combat log and do not change player-facing HUD behavior. The scene starts one when an Encounter starts, observes `EncounterEngine` through its public action history and state, and seals it once on victory, defeat, End-of-Clock Behavior, restart, manual abort, or application exit.

## Location And Schema

Generated output is Git-ignored at `tmp/encounter-records/`:

- `<record-id>.json`: versioned normalized source data, currently `schema_version: 1`.
- `<record-id>.md`: readable per-Encounter summary.
- `report-<timestamp>.md`: immutable aggregate run output.
- `latest-report.md`: replacement aggregate report for the current directory.

The JSON schema includes record ID, start/end time, seeded replay ID, content identity, Git commit metadata, phase/Round boundaries, submitted/generated/rejected rules actions, terminal outcome/end reason/end kind, explicit Damage Resolution Facts, and initial/final rules snapshots. `end_kind: "end_of_clock"` distinguishes Encounter Clock resolution from an ordinary defeat. Axial hexes use `{ "q": number, "r": number }`. Content identity contains the selected Encounter plus every reachable authored Resource's stable ID and resource path; its SHA-256 fingerprint is the aggregate grouping key.

## Reports

Run the local report command after at least one Encounter:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/report_encounter_records.ps1
```

The report separates results by content fingerprint and warns when more than one fingerprint is present. It preserves path-based diagnostics for malformed or unsupported records, skips those records, and returns non-zero only when no valid record is available.

On valid input, the command succeeds only after both `report-<timestamp>.md` and `latest-report.md` exist at the documented location. A failed write produces a non-zero exit and a path-specific diagnostic.

For a clean experiment cohort:

```powershell
Remove-Item -Recurse -Force ./tmp/encounter-records
```

## QA Contract

QA should validate schema version `1`, the `tmp/encounter-records/` artifact location, atomically paired JSON/Markdown artifacts, explicit damage facts (`requested`, `prevented`, `health_loss`), timestamped/latest aggregate artifacts, and exactly-once sealing for terminal and abandoned Encounters. `records` covers report-file emission; `record_scene` independently covers terminal completion, restart, manual abort, and application exit. Schema v1 damage facts may also contain `target_removed = true` when the resolved hit immediately removes a Minion. This additive optional fact does not change the record envelope or invalidate older v1 records; the existing action normalization preserves it without a schema-version increase. Minion replay fixtures remain independent of the record lifecycle.

## Riposte Ready Facts

Riposte Ready extends existing schema-v1 action payloads and snapshots; it does not change the record envelope. An authored Tank Hit Damage Resolution Fact contains the usual damage fields plus:

```text
damage_classification: "tank_hit"
boss_beat_id: <authored Beat ID>
boss_track: "instant" | "incoming"
guarded_front: true | false
status_evaluation: { status_id, result: "granted" | "not_granted", reason }
status_event: { status_id, event: "granted", reason, expires_at_window_end, source_id, source_beat_id, trigger_round, trigger_phase }  # granted hits only
```

Non-grant reasons are `health_lost`, `not_guarded_front`, or `already_active`; `already_active` proves the effect did not stack or refresh. Unclassified damage has no Riposte evaluation fields.

A legal Shield Slam that consumes Riposte Ready adds `resolution_fact.status_event` to the successful `fire_slot` action with `event: "consumed"`, `reason: "matching_card_fired"`, `card_id: "shield_slam"`, and `bonus_boss_damage: 2`, plus the shared lifecycle fields above. Its single generated Boss damage fact records `base_amount: 3`, `status_bonus: 2`, `status_id: "riposte_ready"`, and `payoff_card_id: "shield_slam"` alongside `requested: 5` and the ordinary damage result.

Leaving the first following Quick Window submits one engine-owned `expire_status` action when the effect remains active. Its Resolution Fact contains the shared lifecycle event with `event: "expired"` and `reason: "expiry_window_ended"`. The final/phase snapshots expose each active Status Effect's ID/title, triggers, trigger reason and Round/phase, source/Beat IDs, `expires_at_window_end`, and `consume_on_card_id` for UI and QA projection. Encounter Records remain off-HUD and passive observers of `EncounterEngine` history.
