extends SceneTree

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const ENCOUNTER := preload("res://resources/encounters/embermaw_prototype.tres")
const ARTIFACT_PATH := "res://tmp/probe-artifacts/focused_end_of_clock/end_of_clock_trace.json"

var failures: Array[String] = []

func _initialize() -> void:
	var engine := EncounterEngineModel.new()
	engine.start(_clock_only_config())
	var trace: Array[Dictionary] = []
	var expected_advances := ENCOUNTER.round_limit * 5
	while engine.active and trace.size() < expected_advances + 1:
		var before_phase := str(engine.phase)
		var before_round := engine.round
		var before_history := engine.history.size()
		var actions: Array = engine.advance_phase()
		trace.append({
			"step": trace.size() + 1,
			"phase_before": before_phase,
			"phase_after": str(engine.phase),
			"round_before": before_round,
			"round_after": engine.round,
			"actions_count": actions.size(),
			"history_before": before_history,
			"history_after": engine.history.size(),
			"active_after": engine.active,
			"outcome_after": str(engine.outcome),
			"outcome_reason_after": engine.outcome_reason,
		})
	var artifact := {
		"contract": "encounter_clock_end_of_clock",
		"resource_id": String(ENCOUNTER.id),
		"round_limit": ENCOUNTER.round_limit,
		"enrage_text": ENCOUNTER.enrage_text,
		"trace": trace,
		"final": {
			"active": engine.active,
			"round": engine.round,
			"phase": str(engine.phase),
			"outcome": str(engine.outcome),
			"outcome_reason": engine.outcome_reason,
			"history_size": engine.history.size(),
		},
	}
	_write_artifact(artifact)

	_assert(trace.size() == expected_advances, "Encounter Clock should end after exactly %d phase advances; got %d." % [expected_advances, trace.size()])
	_assert(not engine.active, "Encounter Clock expiry must deactivate the Encounter.")
	_assert(engine.outcome == &"defeat", "Encounter Clock expiry must end in defeat.")
	_assert(engine.outcome_reason == ENCOUNTER.enrage_text, "Encounter Clock expiry must use the authored enrage text.")
	_assert(engine.round == ENCOUNTER.round_limit + 1, "Encounter Clock expiry must advance the Round past the authored limit.")
	for action in engine.history:
		_assert(action.kind in [EncounterActionModel.Kind.ADVANCE_PHASE, EncounterActionModel.Kind.ROUND_START, EncounterActionModel.Kind.END_OF_CLOCK], "The focused clock-only rules Probe must need no authored boss actions or player actions; only phase-machine actions may appear on the stream.")
	var terminal: Dictionary = trace.back() if not trace.is_empty() else {}
	_assert(terminal.get("phase_before", "") == "slow", "Encounter Clock expiry must terminate from Slow.")
	_assert(terminal.get("actions_count", -1) == 1, "The terminal Slow advance must stream exactly its END_OF_CLOCK action.")
	_assert(terminal.get("history_after", -1) == terminal.get("history_before", -2) + 1, "Encounter Clock expiry must be recorded on the history stream.")
	_assert(engine.history.back().kind == EncounterActionModel.Kind.END_OF_CLOCK, "The final streamed action must be END_OF_CLOCK.")
	_assert(_phase_prefix(trace, 8) == [
		"loadout->instant",
		"instant->quick",
		"quick->incoming",
		"incoming->slow",
		"slow->loadout",
		"loadout->instant",
		"instant->quick",
		"quick->incoming",
	], "Encounter Clock trace must follow the stable phase loop before termination.")

	if failures.is_empty():
		print("FOCUSED_END_OF_CLOCK_PROBE_OK advances=%d artifact=%s" % [trace.size(), ARTIFACT_PATH])
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _clock_only_config() -> Dictionary:
	return {
		"board_radius": ENCOUNTER.board_radius,
		"round_limit": ENCOUNTER.round_limit,
		"enrage_text": ENCOUNTER.enrage_text,
		"random_seed": ENCOUNTER.random_seed,
		"boss": {
			"id": ENCOUNTER.boss_id,
			"title": ENCOUNTER.boss_title,
			"coords": ENCOUNTER.boss_start,
			"health": ENCOUNTER.boss_health,
			"facing": 4,
		},
		"heroes": [{
			"id": ENCOUNTER.primary_hero_id,
			"title": ENCOUNTER.primary_hero_title,
			"coords": ENCOUNTER.player_start,
			"health": ENCOUNTER.player_health,
			"facing": 1,
			"slot_count": ENCOUNTER.slot_count,
			"refill_target": ENCOUNTER.hand_refill_target,
			"deck": ENCOUNTER.player_deck,
			"shuffle_deck": false,
			"hand": [],
		}],
		"primary_hero_id": ENCOUNTER.primary_hero_id,
		"programs": [],
		"loop_programs": false,
		"brood_spawn_candidates": [],
	}

func _phase_prefix(trace: Array[Dictionary], count: int) -> Array[String]:
	var result: Array[String] = []
	for index in min(count, trace.size()):
		var step: Dictionary = trace[index]
		result.append("%s->%s" % [step.get("phase_before", ""), step.get("phase_after", "")])
	return result

func _write_artifact(payload: Dictionary) -> void:
	var path := ProjectSettings.globalize_path(ARTIFACT_PATH)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
