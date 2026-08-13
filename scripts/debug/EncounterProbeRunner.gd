class_name EncounterProbeRunner
extends RefCounted

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const ProbeSerializer := preload("res://scripts/debug/EncounterProbeSerializer.gd")

const ARTIFACT_ROOT := "res://tmp/probe-artifacts"

static func run(scenario) -> Dictionary:
	var engine := EncounterEngineModel.new()
	engine.start(scenario.config)
	var trace: Dictionary = {
		"scenario_id": str(scenario.id),
		"scenario_version": scenario.version,
		"seed": scenario.seed,
		"action_tape": ProbeSerializer.value(scenario.action_tape),
		"initial_snapshot": ProbeSerializer.snapshot(engine),
		"steps": [],
	}
	var failures: Array[String] = []
	for step_index in scenario.action_tape.size():
		var step: Dictionary = scenario.action_tape[step_index]
		var history_start := engine.history.size()
		var action = _execute(engine, scenario, step)
		var events: Array = []
		for history_index in range(history_start, engine.history.size()):
			events.append(ProbeSerializer.action(engine.history[history_index]))
		if action != null and not action.succeeded:
			failures.append("Step %d (%s) failed: %s" % [step_index, step.get("operation", "unknown"), action.reason])
		trace["steps"].append({
			"index": step_index,
			"operation": str(step.get("operation", "")),
			"phase": str(engine.phase),
			"round": engine.round,
			"events": events,
			"snapshot": ProbeSerializer.snapshot(engine),
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
