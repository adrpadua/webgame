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
	_assert(record["schema_version"] == 1, "Encounter Record schema version must be explicit.")
	_assert(record["outcome"] == "victory", "Sealed Encounter Record must retain the terminal outcome.")
	_assert(record["content"]["fingerprint"].length() == 64, "Content fingerprint must be a stable SHA-256 value.")
	_assert(not record["content"]["resources"].is_empty(), "Content identity must include reachable authored Resources.")
	_assert(record["rejected_actions"].size() == 1, "Rejected submitted actions must be preserved with their reason.")
	var damage_action: Dictionary = record["submitted_actions"].filter(func(action): return action["kind"] == "damage")[0]
	var fact: Dictionary = damage_action["payload"].get("resolution_fact", {})
	_assert(fact == {"requested": 999, "prevented": 0, "health_loss": 36, "target_available": true}, "Damage Resolution Facts must state requested damage, prevention, and health loss.")
	_assert(FileAccess.file_exists(record["paths"]["json"]) and FileAccess.file_exists(record["paths"]["markdown"]), "A sealed Encounter Record must atomically create JSON and Markdown artifacts.")
	var sealed_again := recorder.seal(engine)
	_assert(sealed_again["record_id"] == record["record_id"], "Encounter Record sealing must be idempotent.")
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

	var mixed: Dictionary = record.duplicate(true)
	mixed["record_id"] = "mixed-fingerprint"
	mixed["content"]["fingerprint"] = "other-fingerprint"
	_write("%s/mixed.json" % root, JSON.stringify(mixed))
	_write("%s/unsupported.json" % root, JSON.stringify({"schema_version": 99}))
	_write("%s/malformed.json" % root, "not JSON")
	var aggregate := Reporter.aggregate_directory(root)
	_assert(aggregate["records"].size() == 3, "Aggregate reader must keep valid records while skipping invalid records.")
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

func _clear(root: String) -> void:
	DirAccess.make_dir_recursive_absolute(root)
	var directory := DirAccess.open(root)
	for file_name in directory.get_files():
		DirAccess.remove_absolute("%s/%s" % [root, file_name])

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
