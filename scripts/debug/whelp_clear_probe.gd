extends SceneTree

const ScenarioModel := preload("res://scripts/debug/EncounterProbeScenario.gd")
const ProbeRunner := preload("res://scripts/debug/EncounterProbeRunner.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const StatusEffectModel := preload("res://scripts/sdk/StatusEffect.gd")

var failures: Array[String] = []

func _initialize() -> void:
	var scenario: RefCounted = _scenario()
	var first := ProbeRunner.run(scenario)
	_assert(first["failures"].is_empty(), "The Whelp Clear scenario must satisfy all declared outcomes.")
	_assert(first["artifact_path"] == "", "A successful Whelp Clear Probe must not write a failure artifact.")
	_assert(first["trace"]["setup_fixtures"].size() == 2, "The trace must preserve both Whelp setup fixtures.")
	_assert(first["trace"]["initial_snapshot"]["history_cursor"] == 0, "Setup fixtures must not create Encounter history.")
	var initial_whelp := _entity(first["trace"]["initial_snapshot"], "whelp_fixture_1")
	_assert(initial_whelp.get("content_id", "") == "whelp", "The setup fixture must preserve the authored Minion content ID.")
	_assert(initial_whelp.get("health", 0) == 2, "The setup fixture must use the authored Minion health.")
	_assert(initial_whelp.get("coords", {}) == {"q": 1, "r": 0}, "The setup fixture must preserve its authored hex.")

	for rejection_index in [3, 5, 6, 7, 8, 12, 14]:
		var rejected_step: Dictionary = first["trace"]["steps"][rejection_index]
		_assert(rejected_step["expectation_met"], "Every declared Whelp Clear rejection must match its reason and preserve rules state.")
		_assert(not rejected_step["events"][0]["succeeded"], "Rejected Whelp Clear actions must remain visible in Encounter history.")

	var fire_step: Dictionary = first["trace"]["steps"][9]
	_assert(fire_step["events"][0]["payload"]["target_id"] == "whelp_fixture_1", "Typed fire must preserve the selected fixture entity ID.")
	_assert(fire_step["events"][0]["payload"]["target_range"] == 1, "Typed fire must preserve the measured target range.")
	_assert(fire_step["events"][0]["succeeded"], "Typed fire at the adjacent Whelp must succeed.")
	_assert(fire_step["events"].size() == 2, "Minion defeat must not emit a separate cleanup action.")
	_assert(fire_step["events"][1]["kind"] == "damage", "Typed fire must generate a damage Encounter action.")
	_assert(fire_step["events"][1]["payload"]["target_id"] == "whelp_fixture_1", "Generated damage must preserve the explicit target ID.")
	_assert(fire_step["events"][1]["payload"]["resolution_fact"]["health_loss"] == 2, "Generated damage must preserve the explicit health-loss fact.")
	_assert(fire_step["events"][1]["payload"]["resolution_fact"]["target_removed"], "Lethal Minion damage must record target_removed = true.")
	_assert(_entity(fire_step["snapshot"], "whelp_fixture_1").is_empty(), "The defeated Whelp must be absent before the damage action completes.")
	_assert(first["engine"].board.get_entity_id_at(Vector2i(1, 0)) == &"", "Defeating the Whelp must immediately free its hex.")
	_assert(_entity(fire_step["snapshot"], "boss").get("health", 0) == 36, "Whelp Clear must not damage the Boss.")

	var replay := ProbeRunner.replay(scenario, first["trace"])
	_assert(replay["failures"].is_empty(), "The Whelp Clear trace must replay without harness failures.")
	_assert(JSON.stringify(first["trace"]["steps"]) == JSON.stringify(replay["trace"]["steps"]), "Whelp Clear replay must produce equal normalized steps.")
	_assert(JSON.stringify(first["trace"]["final_snapshot"]) == JSON.stringify(replay["trace"]["final_snapshot"]), "Whelp Clear replay must produce an equal final rules snapshot.")
	_test_invalid_fixture_diagnostic()
	_test_unexpected_success_diagnostic()
	_test_minion_owned_status_cleanup()

	if failures.is_empty():
		print("WHELP_CLEAR_PROBE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _scenario():
	var sweeping_blow = load("res://resources/cards/tank/sweeping_blow.tres")
	var iron_guard = load("res://resources/cards/tank/iron_guard.tres")
	var whelp = load("res://resources/minions/whelp.tres")
	var scenario := ScenarioModel.new(&"whelp_clear", 1, 2401, _config())
	scenario.register_card(sweeping_blow).register_card(iron_guard).register_minion(whelp)
	scenario.give_hand(&"guardian", [&"sweeping_blow", &"iron_guard"])
	var whelp_id: StringName = scenario.place_minion(&"whelp", Vector2i(1, 0))
	var distant_whelp_id: StringName = scenario.place_minion(&"whelp", Vector2i(2, 0))
	_assert(whelp_id == &"whelp_fixture_1", "Generated fixture IDs must be deterministic and content-derived.")
	_assert(distant_whelp_id == &"whelp_fixture_2", "Fixture sequences must produce stable unique IDs.")
	scenario.load_slot(&"guardian", 0, &"sweeping_blow")
	scenario.advance_phase().advance_phase()
	scenario.fire_slot(&"guardian", 0, whelp_id).expect_rejection("at least one charged card")
	scenario.charge_slot(&"guardian", 0, &"iron_guard")
	scenario.fire_slot(&"guardian", 0).expect_rejection("Minion target")
	scenario.fire_slot(&"guardian", 0, &"boss").expect_rejection("Minion target")
	scenario.fire_slot(&"guardian", 0, &"guardian").expect_rejection("Minion target")
	scenario.fire_slot(&"guardian", 0, distant_whelp_id).expect_rejection("outside the Top Card's range")
	scenario.fire_slot(&"guardian", 0, whelp_id)
	scenario.advance_phase().advance_phase()
	scenario.fire_slot(&"guardian", 0, whelp_id).expect_rejection("cannot fire in this window")
	scenario.advance_phase()
	scenario.fire_slot(&"guardian", 0, whelp_id).expect_rejection("cannot fire in this window")
	return scenario

func _config() -> Dictionary:
	return {
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": 4},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "slot_count": 2, "refill_target": 4}],
		"primary_hero_id": &"guardian",
	}

func _test_invalid_fixture_diagnostic() -> void:
	var whelp = load("res://resources/minions/whelp.tres")
	var scenario := ScenarioModel.new(&"invalid_fixture_diagnostic", 1, 2402, _config())
	scenario.register_minion(whelp)
	scenario.place_minion(&"whelp", Vector2i(1, -1), &"blocked_whelp")
	var result := ProbeRunner.run(scenario)
	_assert(result["failures"].size() == 1, "An unavailable fixture hex must produce one harness failure.")
	if not result["failures"].is_empty():
		var diagnostic := str(result["failures"][0])
		_assert(diagnostic.contains("setup_fixtures[0]"), "Fixture failures must identify the fixture path and index.")
		_assert(diagnostic.contains("blocked_whelp"), "Fixture failures must identify the requested entity ID.")
	_assert(result["trace"]["steps"].is_empty(), "Action execution must not start after setup fixture failure.")
	_assert(result["artifact_path"] != "", "Fixture setup failure must write normalized diagnostic evidence.")
	_remove_artifact(result["artifact_path"], "invalid_fixture_diagnostic")

func _test_unexpected_success_diagnostic() -> void:
	var scenario = _scenario()
	var final_step: Dictionary = scenario.action_tape[9]
	final_step["expected_rejection"] = {"reason_contains": "intentional mismatch", "rules_state_unchanged": true}
	scenario.action_tape[9] = final_step
	var result := ProbeRunner.run(scenario)
	_assert(not result["failures"].is_empty(), "An action that succeeds against a rejection expectation must produce harness failures.")
	_assert(_has_failure(result["failures"], "expected rejection but succeeded"), "Unexpected-success diagnostics must identify the failed expectation.")
	_assert(_has_failure(result["failures"], "changed rules state"), "Unexpected-success diagnostics must identify changed rules state.")
	_assert(result["artifact_path"] != "", "An unexpected success must write normalized diagnostic evidence.")
	_remove_artifact(result["artifact_path"], "whelp_clear")

func _test_minion_owned_status_cleanup() -> void:
	var engine := EncounterEngineModel.new()
	engine.start(_config())
	_assert(engine.board.add_entity(&"status_whelp", &"minion", Vector2i(1, 0), 2, 0, &"enemy"), "The focused status cleanup test must place its Minion.")
	var minion_status := StatusEffectModel.new(&"minion_owned", 2, [StatusEffectModel.ON_DAMAGE_TAKEN])
	_assert(engine.add_status(&"status_whelp", minion_status), "The focused status cleanup test must attach Minion-owned state.")
	var damage_action = engine.apply(EncounterActionModel.damage(&"guardian", &"status_whelp", 2, "probe"))
	_assert(damage_action.succeeded, "Lethal Minion damage must remain a successful damage action.")
	_assert(damage_action.payload["resolution_fact"].get("target_removed", false), "Direct lethal Minion damage must record removal.")
	_assert(not engine.board.has_entity(&"status_whelp"), "Direct lethal Minion damage must remove the board entity.")
	_assert(not engine.status_effects.has(&"status_whelp"), "Minion defeat must discard state owned by that Minion.")
	_assert(engine.history.size() == 1, "Minion defeat must not append a separate cleanup action.")

func _entity(snapshot: Dictionary, entity_id: String) -> Dictionary:
	for entity in snapshot.get("entities", []):
		if entity.get("id", "") == entity_id:
			return entity
	return {}

func _remove_artifact(path: String, scenario_id: String) -> void:
	if path != "":
		DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	DirAccess.remove_absolute(ProjectSettings.globalize_path("res://tmp/probe-artifacts/%s" % scenario_id))

func _has_failure(result_failures: Array, fragment: String) -> bool:
	for failure in result_failures:
		if str(failure).contains(fragment):
			return true
	return false

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
