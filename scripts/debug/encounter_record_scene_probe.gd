extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")

var failures: Array[String] = []

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	main.engine.apply(EncounterActionModel.damage(&"probe", main.engine.boss_id, 999, "scene record victory"))
	main._sync_from_engine()
	var completed_record = main.encounter_record
	_assert(not completed_record.is_active(), "Playable scene must seal an Encounter Record when the Encounter ends.")
	_assert(completed_record.seal(main.engine)["outcome"] == "victory", "Playable scene record must retain victory.")
	main._start_encounter()
	var abandoned_record = main.encounter_record
	main._on_restart_pressed()
	_assert(not abandoned_record.is_active(), "Restart must seal the prior Encounter Record exactly once.")
	_assert(abandoned_record.seal(main.engine)["outcome"] == "abandoned", "Restarted Encounter must be recorded as abandoned.")
	_assert(abandoned_record.seal(main.engine)["end_reason"].contains("Restarted"), "Abandoned Encounter must have an explicit restart reason.")
	main.abort_encounter("Manual abort probe.")
	var manual_abort_record = main.encounter_record
	_assert(not manual_abort_record.is_active(), "Manual abort must seal the active Encounter Record.")
	_assert(manual_abort_record.seal(main.engine)["outcome"] == "abandoned" and manual_abort_record.seal(main.engine)["end_reason"] == "Manual abort probe.", "Manual abort must retain its explicit abandoned reason.")
	main._start_encounter()
	var exit_record = main.encounter_record
	var exit_engine = main.engine
	main.queue_free()
	await process_frame
	_assert(not exit_record.is_active(), "Application exit must seal the active Encounter Record.")
	_assert(exit_record.seal(exit_engine)["outcome"] == "abandoned" and exit_record.seal(exit_engine)["end_reason"].contains("Application closed"), "Application exit must retain an explicit abandoned reason.")
	if failures.is_empty():
		print("ENCOUNTER_RECORD_SCENE_PROBE_OK")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
