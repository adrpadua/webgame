extends SceneTree

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const EncounterRecordModel := preload("res://scripts/records/EncounterRecord.gd")
const Reporter := preload("res://scripts/records/EncounterRecordReport.gd")

var failures: Array[String] = []

func _initialize() -> void:
	var root := ProjectSettings.globalize_path("res://tmp/encounter-records")
	_clear(root)
	var encounter: Resource = load("res://resources/encounters/embermaw_prototype.tres")
	var engine := EncounterEngineModel.new()
	engine.start(encounter)
	var recorder := EncounterRecordModel.new()
	recorder.begin(engine, encounter)
	var rejected = engine.apply(EncounterActionModel.fire_slot(engine.primary_hero_id, 0))
	_assert(not rejected.succeeded, "Record probe needs one rejected submitted action.")
	var victory = engine.apply(EncounterActionModel.damage(&"probe", engine.boss_id, 999, "probe victory"))
	_assert(victory.succeeded, "Record probe needs a resolved damage action.")
	recorder.sync(engine)
	var record := recorder.seal(engine)
	_assert(record["schema_version"] == 2, "Encounter Record schema version must be explicit.")
	_assert(record["metadata"] == {"run_label": "", "evaluation_purpose": "", "scenario_id": ""}, "Encounter Record metadata defaults must preserve older callers.")
	_assert(record["outcome"] == "victory", "Sealed Encounter Record must retain the terminal outcome.")
	_assert(record["content"]["fingerprint"].length() == 64, "Content fingerprint must be a stable SHA-256 value.")
	_assert(not record["phase_observations"].is_empty(), "Encounter Records must capture phase observations.")
	_assert(record["phase_observations"][0].has("hand_card_ids") and record["phase_observations"][0].has("slots") and record["phase_observations"][0].has("legal_useful_actions"), "Phase observations must expose hand, Slot, and legal-useful-action proxy fields.")
	_assert(not record["content"]["resources"].is_empty(), "Content identity must include reachable authored Resources.")
	_assert(record["rejected_actions"].size() == 1, "Rejected submitted actions must be preserved with their reason.")
	var damage_action: Dictionary = record["submitted_actions"].filter(func(action): return action["kind"] == "damage")[0]
	var fact: Dictionary = damage_action["payload"].get("resolution_fact", {})
	_assert(fact == {"requested": 999, "prevented": 0, "health_loss": 48, "target_available": true}, "Damage Resolution Facts must state requested damage, prevention, and health loss.")
	_assert(FileAccess.file_exists(record["paths"]["json"]) and FileAccess.file_exists(record["paths"]["markdown"]), "A sealed Encounter Record must atomically create JSON and Markdown artifacts.")
	var sealed_again := recorder.seal(engine)
	_assert(sealed_again["record_id"] == record["record_id"], "Encounter Record sealing must be idempotent.")
	var selector_engine := EncounterEngineModel.new()
	selector_engine.start(encounter)
	var selector_recorder := EncounterRecordModel.new()
	selector_recorder.begin(selector_engine, encounter)
	var selector_damage = selector_engine.apply(EncounterActionModel.damage(selector_engine.boss_id, selector_engine.primary_hero_id, 4, "selector probe", {
		"target_selector": &"tank",
		"damage_classification": &"tank_hit",
		"boss_beat_id": &"raking_claw",
	}))
	_assert(selector_damage.succeeded, "Record probe needs one targeted Tank Hit damage action.")
	selector_recorder.sync(selector_engine)
	var selector_record := selector_recorder.seal(selector_engine, &"abandoned", "Selector fact probe.")
	var selector_action: Dictionary = selector_record["submitted_actions"].filter(func(action): return action["kind"] == "damage")[0]
	var selector_fact: Dictionary = selector_action["payload"].get("resolution_fact", {})
	_assert(selector_fact.get("target_selector") == "tank" and selector_fact.get("damage_classification") == "tank_hit", "Encounter Records must preserve applicable Target Selector and Tank Hit facts.")
	var clock_engine := EncounterEngineModel.new()
	clock_engine.start(encounter)
	clock_engine.round_limit = 1
	var clock_recorder := EncounterRecordModel.new()
	clock_recorder.begin(clock_engine, encounter)
	for _step in 5:
		clock_engine.advance_phase()
		clock_recorder.sync(clock_engine)
	var clock_record := clock_recorder.seal(clock_engine)
	_assert(clock_record["end_kind"] == "end_of_clock", "Encounter Clock resolution must be distinguishable from an ordinary defeat.")
	var phase_kinds: Array = clock_record.get("phase_actions", []).map(func(action): return action["kind"])
	_assert(phase_kinds.count("advance_phase") == 4 and phase_kinds.count("end_of_clock") == 1, "Phase-machine actions must be recorded in the phase_actions bucket (got %s)." % str(phase_kinds))
	for action in clock_record["submitted_actions"]:
		_assert(not action["kind"] in ["advance_phase", "round_start", "full_charge_cleanup", "draw_card", "shuffle_deck", "end_of_clock"], "Phase-machine actions must not pollute the submitted-actions bucket.")
	var clock_boundaries: Array = clock_record["phase_boundaries"]
	_assert(clock_boundaries.size() == 6, "Boundaries must derive from the stream: initial Loadout, four transitions, and the clock expiry (got %d)." % clock_boundaries.size())
	_assert(clock_boundaries.back()["phase"] == "slow" and int(clock_boundaries.back()["round"]) == 2, "The terminal boundary must carry the END_OF_CLOCK round and phase.")
	_assert(int(clock_boundaries.back()["history_cursor"]) == int(clock_record["phase_actions"].back()["history_index"]) + 1, "Each boundary cursor must point just past its transition action on the stream.")

	var mixed: Dictionary = record.duplicate(true)
	mixed["record_id"] = "mixed-fingerprint"
	mixed["content"]["fingerprint"] = "other-fingerprint"
	_write("%s/mixed.json" % root, JSON.stringify(mixed))
	_write("%s/unsupported.json" % root, JSON.stringify({"schema_version": 99}))
	_write("%s/malformed.json" % root, "not JSON")
	var aggregate := Reporter.aggregate_directory(root)
	_assert(_has_record(aggregate["records"], record["record_id"]), "Aggregate reader must keep the primary valid record while skipping invalid records.")
	_assert(_has_record(aggregate["records"], selector_record["record_id"]), "Aggregate reader must keep the selector-fact valid record while skipping invalid records.")
	_assert(_has_record(aggregate["records"], clock_record["record_id"]), "Aggregate reader must keep the clock valid record while skipping invalid records.")
	_assert(_has_record(aggregate["records"], "mixed-fingerprint"), "Aggregate reader must keep additional valid records with other fingerprints.")
	_assert(aggregate["records"].size() >= 3, "Aggregate reader must not drop valid records when the shared root contains multiple cohorts.")
	_assert(aggregate["diagnostics"].size() == 2, "Aggregate reader must emit diagnostics for malformed and unsupported records.")
	var report := Reporter.markdown(aggregate["records"], aggregate["diagnostics"])
	_assert(report.contains("multiple content fingerprints") and report.contains("unsupported schema version"), "Aggregate report must separate fingerprints and retain diagnostics.")
	var written: Dictionary = Reporter.write_reports(root, aggregate["records"], aggregate["diagnostics"])
	_assert(not written.has("error"), "Aggregate report writer must report file-system failures.")
	_assert(FileAccess.file_exists(written.get("report", "")) and FileAccess.file_exists(written.get("latest", "")), "Aggregate report writer must create timestamped and latest Markdown artifacts.")
	if failures.is_empty():
		print("ENCOUNTER_RECORD_PROBE_OK")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _write(path: String, contents: String) -> void:
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(contents)
	file.close()

func _has_record(records: Array, record_id: String) -> bool:
	for candidate in records:
		if candidate.get("record_id", "") == record_id:
			return true
	return false

func _clear(root: String) -> void:
	DirAccess.make_dir_recursive_absolute(root)
	var directory := DirAccess.open(root)
	for file_name in directory.get_files():
		DirAccess.remove_absolute("%s/%s" % [root, file_name])

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
