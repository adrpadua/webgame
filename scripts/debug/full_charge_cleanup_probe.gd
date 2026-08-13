extends SceneTree

const ScenarioModel := preload("res://scripts/debug/EncounterProbeScenario.gd")
const ProbeRunner := preload("res://scripts/debug/EncounterProbeRunner.gd")

var failures: Array[String] = []

func _initialize() -> void:
	var scenario: RefCounted = _scenario()
	var first := ProbeRunner.run(scenario)
	_assert(first["failures"].is_empty(), "The Full-Charge Cleanup action tape must remain legal.")
	_assert(first["artifact_path"] == "", "A successful Probe must not write a failure artifact.")
	_assert(first["trace"]["initial_snapshot"]["random_choices"].size() > 0, "The seeded initial deck shuffle must record random choices.")
	var engine = first["engine"]
	var hero: Dictionary = engine.get_hero(&"guardian")
	var slot: Dictionary = hero["action_bar"][0]
	_assert(slot["top_card"] == null, "Full-Charge Cleanup must clear the Top Card at the end of Quick.")
	_assert(slot["charges"].is_empty(), "Full-Charge Cleanup must clear the Charge Stack at the end of Quick.")
	_assert(hero["discard"].size() == 4, "Full-Charge Cleanup must discard the Top Card and all three charged cards.")
	_assert(first["trace"]["steps"][6]["phase"] == "quick", "The fired fully charged Slot must remain in Quick until its matching-window boundary.")
	_assert(first["trace"]["steps"][6]["events"][0]["succeeded"], "The Full-Charge Cleanup scenario must fire the Slot legally.")
	_assert(first["trace"]["steps"][7]["phase"] == "incoming", "Advancing out of Quick must cross the cleanup boundary.")

	var replay := ProbeRunner.replay(scenario, first["trace"])
	_assert(replay["failures"].is_empty(), "The replayed action tape must remain legal.")
	_assert(JSON.stringify(first["trace"]["steps"]) == JSON.stringify(replay["trace"]["steps"]), "Replay must produce equal normalized events and phase trace.")
	_assert(JSON.stringify(first["trace"]["final_snapshot"]) == JSON.stringify(replay["trace"]["final_snapshot"]), "Replay must produce an equal normalized final rules snapshot.")
	_test_failure_artifact_schema()

	if failures.is_empty():
		print("FULL_CHARGE_CLEANUP_PROBE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	if first.get("artifact_path", "") == "":
		first["trace"]["failures"] = failures
		ProbeRunner.write_failure_artifact(first["trace"])
	quit(1)

func _scenario():
	var strike = load("res://resources/cards/tank/steady_strike.tres")
	var guard = load("res://resources/cards/tank/iron_guard.tres")
	var scenario := ScenarioModel.new(&"full_charge_cleanup", 1, 1337, {
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": 4},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "slot_count": 2, "refill_target": 4}],
		"primary_hero_id": &"guardian",
	})
	scenario.register_card(strike).register_card(guard)
	scenario.give_hand(&"guardian", [&"steady_strike", &"iron_guard", &"iron_guard", &"iron_guard"])
	scenario.give_deck(&"guardian", [&"iron_guard", &"iron_guard", &"iron_guard", &"iron_guard"], true)
	scenario.advance_phase().advance_phase()
	scenario.load_slot(&"guardian", 0, &"steady_strike")
	scenario.charge_slot(&"guardian", 0, &"iron_guard")
	scenario.charge_slot(&"guardian", 0, &"iron_guard")
	scenario.charge_slot(&"guardian", 0, &"iron_guard")
	scenario.fire_slot(&"guardian", 0)
	scenario.advance_phase()
	return scenario

func _test_failure_artifact_schema() -> void:
	var scenario_id := "artifact_schema_test_%d" % Time.get_ticks_msec()
	var path := ProbeRunner.write_failure_artifact({
		"scenario_id": scenario_id,
		"scenario_version": 1,
		"seed": 1,
		"action_tape": [],
		"initial_snapshot": {},
		"steps": [],
		"final_snapshot": {},
		"failures": ["intentional test failure"],
	})
	var file := FileAccess.open(path, FileAccess.READ)
	var json := JSON.new()
	_assert(file != null and json.parse(file.get_as_text()) == OK, "Failure artifacts must be valid JSON.")
	file.close()
	var artifact: Dictionary = json.data
	for key in ["scenario_id", "scenario_version", "seed", "action_tape", "initial_snapshot", "steps", "final_snapshot", "failures"]:
		_assert(artifact.has(key), "Failure artifacts must include %s." % key)
	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	DirAccess.remove_absolute(ProjectSettings.globalize_path("res://tmp/probe-artifacts/%s" % scenario_id))

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
