class_name EncounterProbeRunner
extends RefCounted

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const ProbeSerializer := preload("res://scripts/debug/EncounterProbeSerializer.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const ARTIFACT_ROOT := "res://tmp/probe-artifacts"

static func run(scenario) -> Dictionary:
	var engine := EncounterEngineModel.new()
	engine.start(scenario.config)
	var failures: Array[String] = []
	_apply_setup_fixtures(engine, scenario, failures)
	var trace: Dictionary = {
		"scenario_id": str(scenario.id),
		"scenario_version": scenario.version,
		"seed": scenario.seed,
		"setup_fixtures": ProbeSerializer.value(scenario.setup_fixtures),
		"action_tape": ProbeSerializer.value(scenario.action_tape),
		"initial_snapshot": ProbeSerializer.snapshot(engine),
		"steps": [],
	}
	if failures.is_empty():
		for step_index in scenario.action_tape.size():
			var step: Dictionary = scenario.action_tape[step_index]
			var before_snapshot := ProbeSerializer.snapshot(engine)
			var history_start := engine.history.size()
			var action = _execute(engine, scenario, step)
			var after_snapshot := ProbeSerializer.snapshot(engine)
			var events: Array = []
			for history_index in range(history_start, engine.history.size()):
				events.append(ProbeSerializer.action(engine.history[history_index]))
			var expectation: Dictionary = step.get("expected_rejection", {})
			var expectation_met := true
			if expectation.is_empty():
				if action != null and not action.succeeded:
					failures.append("Step %d (%s) failed: %s" % [step_index, step.get("operation", "unknown"), action.reason])
			else:
				expectation_met = _check_rejection_expectation(step_index, step, action, before_snapshot, after_snapshot, failures)
			trace["steps"].append({
				"index": step_index,
				"operation": str(step.get("operation", "")),
				"phase": str(engine.phase),
				"round": engine.round,
				"events": events,
				"expected_rejection": ProbeSerializer.value(expectation),
				"expectation_met": expectation_met,
				"snapshot": after_snapshot,
			})
	trace["final_snapshot"] = ProbeSerializer.snapshot(engine)
	trace["failures"] = failures
	var artifact_path := ""
	if not failures.is_empty():
		artifact_path = write_failure_artifact(trace)
	return {"engine": engine, "trace": trace, "failures": failures, "artifact_path": artifact_path}

static func replay(scenario, recorded_trace: Dictionary) -> Dictionary:
	assert(recorded_trace.get("scenario_id") == str(scenario.id), "Replay scenario must match the recorded scenario.")
	assert(int(recorded_trace.get("scenario_version", 0)) == scenario.version, "Replay scenario version must match the recorded trace.")
	assert(int(recorded_trace.get("seed", 0)) == scenario.seed, "Replay seed must match the scenario seed.")
	assert(recorded_trace.get("setup_fixtures", []) == ProbeSerializer.value(scenario.setup_fixtures), "Replay setup fixtures must match the recorded scenario.")
	var original_tape: Array = scenario.replace_action_tape(recorded_trace.get("action_tape", []).duplicate(true))
	var result := run(scenario)
	scenario.replace_action_tape(original_tape)
	return result

static func write_failure_artifact(trace: Dictionary) -> String:
	var directory := "%s/%s" % [ARTIFACT_ROOT, trace.get("scenario_id", "unknown")]
	var absolute_directory := ProjectSettings.globalize_path(directory)
	DirAccess.make_dir_recursive_absolute(absolute_directory)
	var timestamp := "%s-%d" % [Time.get_datetime_string_from_system().replace(":", "-").replace("T", "_"), Time.get_ticks_msec()]
	var path := "%s/%s.json" % [directory, timestamp]
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(ProbeSerializer.value(trace), "\t"))
	file.close()
	return path

static func _execute(engine, scenario, step: Dictionary):
	match step.get("operation", ""):
		"advance_phase":
			engine.advance_phase()
			return null
		"load_slot":
			return engine.apply(EncounterActionModel.load_slot(StringName(step["hero_id"]), int(step["slot_index"]), scenario.cards[StringName(step["card_id"])]))
		"charge_slot":
			return engine.apply(EncounterActionModel.charge_slot(StringName(step["hero_id"]), int(step["slot_index"]), scenario.cards[StringName(step["card_id"])]))
		"fire_slot":
			return engine.apply(EncounterActionModel.fire_slot(StringName(step["hero_id"]), int(step["slot_index"]), StringName(step.get("target_id", ""))))
	push_error("Unknown Probe operation: %s" % step.get("operation", ""))
	return null

static func _apply_setup_fixtures(engine, scenario, failures: Array[String]) -> void:
	for fixture_index in scenario.setup_fixtures.size():
		var fixture: Dictionary = scenario.setup_fixtures[fixture_index]
		var operation := str(fixture.get("operation", ""))
		if operation != "place_minion":
			failures.append("Setup fixture %d at setup_fixtures[%d] has unknown operation `%s`." % [fixture_index, fixture_index, operation])
			continue
		var minion_content_id := StringName(fixture.get("minion_content_id", ""))
		var minion = scenario.minions.get(minion_content_id)
		var entity_id := StringName(fixture.get("entity_id", ""))
		var coords: Vector2i = fixture.get("coords", Vector2i(999, 999))
		if minion == null:
			failures.append("Setup fixture %d at setup_fixtures[%d] references unregistered Minion `%s`." % [fixture_index, fixture_index, minion_content_id])
			continue
		if not engine.board.add_entity(entity_id, &"minion", coords, minion.max_health, FacingDirections.Direction.NORTH_WEST, &"enemy"):
			failures.append("Setup fixture %d at setup_fixtures[%d] could not place Minion `%s` as `%s` at (%d, %d); the entity ID or hex is unavailable." % [fixture_index, fixture_index, minion_content_id, entity_id, coords.x, coords.y])
			continue
		var entity: Dictionary = engine.board.get_entity(entity_id)
		entity["content_id"] = minion.id
		entity["title"] = minion.title

static func _check_rejection_expectation(step_index: int, step: Dictionary, action, before_snapshot: Dictionary, after_snapshot: Dictionary, failures: Array[String]) -> bool:
	var expectation: Dictionary = step["expected_rejection"]
	var operation := str(step.get("operation", "unknown"))
	var matched := true
	if action == null:
		failures.append("Step %d (%s) expected a rejected Encounter action but produced no action." % [step_index, operation])
		matched = false
	elif action.succeeded:
		failures.append("Step %d (%s) expected rejection but succeeded." % [step_index, operation])
		matched = false
	else:
		var reason_fragment := str(expectation.get("reason_contains", ""))
		if not action.reason.contains(reason_fragment):
			failures.append("Step %d (%s) rejected with `%s`; expected reason containing `%s`." % [step_index, operation, action.reason, reason_fragment])
			matched = false
	if bool(expectation.get("rules_state_unchanged", true)) and _rules_state(before_snapshot) != _rules_state(after_snapshot):
		failures.append("Step %d (%s) rejection changed rules state outside Encounter history." % [step_index, operation])
		matched = false
	return matched

static func _rules_state(snapshot: Dictionary) -> Dictionary:
	var comparable := snapshot.duplicate(true)
	comparable.erase("history_cursor")
	return comparable
