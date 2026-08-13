class_name EncounterRecord
extends RefCounted

const ContentIdentity := preload("res://scripts/records/EncounterContentIdentity.gd")
const Serializer := preload("res://scripts/debug/EncounterProbeSerializer.gd")

const SCHEMA_VERSION := 1
const RECORD_ROOT := "res://tmp/encounter-records"

var _record: Dictionary = {}
var _history_cursor: int = 0
var _last_round: int = -1
var _last_phase: StringName = &""
var _sealed: bool = false

func begin(engine, encounter_resource: Resource) -> void:
	_record = {
		"schema_version": SCHEMA_VERSION,
		"record_id": "%s-%d" % [Time.get_datetime_string_from_system().replace(":", "-").replace("T", "_"), Time.get_ticks_msec()],
		"started_at": Time.get_datetime_string_from_system(true),
		"seed": engine.random_source.seed,
		"content": ContentIdentity.describe(encounter_resource),
		"git": _git_metadata(),
		"phase_boundaries": [],
		"submitted_actions": [],
		"generated_actions": [],
		"rejected_actions": [],
	}
	_history_cursor = 0
	_last_round = -1
	_last_phase = &""
	_sealed = false
	sync(engine)
	_record["initial_rules_snapshot"] = Serializer.snapshot(engine)

func sync(engine) -> void:
	if _record.is_empty() or _sealed:
		return
	_append_boundary(engine)
	while _history_cursor < engine.history.size():
		var action = engine.history[_history_cursor]
		_history_cursor += 1
		var serialized := Serializer.action(action)
		serialized["round"] = engine.round
		serialized["phase"] = str(engine.phase)
		if _is_generated(engine, action):
			_record["generated_actions"].append(serialized)
		else:
			_record["submitted_actions"].append(serialized)
		if not action.succeeded:
			_record["rejected_actions"].append(serialized)

func seal(engine, forced_outcome: StringName = &"", forced_reason: String = "") -> Dictionary:
	if _sealed:
		return _record
	sync(engine)
	_record["ended_at"] = Time.get_datetime_string_from_system(true)
	_record["outcome"] = str(forced_outcome if forced_outcome != &"" else engine.outcome)
	_record["end_reason"] = forced_reason if not forced_reason.is_empty() else engine.outcome_reason
	_record["end_kind"] = "abandoned" if forced_outcome == &"abandoned" else "end_of_clock" if engine.round > engine.round_limit else str(engine.outcome)
	_record["final_rules_snapshot"] = Serializer.snapshot(engine)
	_record["summary"] = _summary(_record)
	_record["paths"] = _write(_record)
	_sealed = true
	return _record

func is_active() -> bool:
	return not _record.is_empty() and not _sealed

func _append_boundary(engine) -> void:
	if engine.round == _last_round and engine.phase == _last_phase:
		return
	_record["phase_boundaries"].append({"round": engine.round, "phase": str(engine.phase), "history_cursor": _history_cursor})
	_last_round = engine.round
	_last_phase = engine.phase

func _is_generated(engine, candidate) -> bool:
	for action in engine.history:
		for generated in action.generated_actions:
			if generated == candidate:
				return true
	return false

func _write(record: Dictionary) -> Dictionary:
	var root := ProjectSettings.globalize_path(RECORD_ROOT)
	DirAccess.make_dir_recursive_absolute(root)
	var base := "%s/%s" % [root, record["record_id"]]
	_write_atomic("%s.json" % base, JSON.stringify(record, "\t"))
	_write_atomic("%s.md" % base, markdown(record))
	return {"json": "%s.json" % base, "markdown": "%s.md" % base}

func _write_atomic(path: String, content: String) -> void:
	var temporary := "%s.tmp" % path
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	file.store_string(content)
	file.close()
	DirAccess.rename_absolute(temporary, path)

static func markdown(record: Dictionary) -> String:
	var summary: Dictionary = record.get("summary", {})
	var lines: Array[String] = [
		"# Encounter Record %s" % record.get("record_id", "unknown"),
		"",
		"- Outcome: `%s`" % record.get("outcome", "ongoing"),
		"- End reason: %s" % record.get("end_reason", ""),
		"- End kind: `%s`" % record.get("end_kind", ""),
		"- Rounds reached: %d" % int(summary.get("rounds_reached", 0)),
		"- Content fingerprint: `%s`" % record.get("content", {}).get("fingerprint", ""),
		"- Encounter: `%s` (%s)" % [record.get("content", {}).get("root", {}).get("id", ""), record.get("content", {}).get("root", {}).get("path", "")],
		"",
		"## Actions",
		"",
		"- Submitted: %d" % int(summary.get("submitted_action_count", 0)),
		"- Generated: %d" % int(summary.get("generated_action_count", 0)),
		"- Rejected: %d" % int(summary.get("rejected_action_count", 0)),
		"- Movement: %d" % int(summary.get("movement_count", 0)),
		"- Slot use: %d" % int(summary.get("slot_use_count", 0)),
		"- Hazards applied: %d" % int(summary.get("hazard_count", 0)),
		"- Minions spawned: %d" % int(summary.get("minion_count", 0)),
		"",
		"## Card And Slot Use",
		"",
	]
	for event in summary.get("slot_events", []):
		lines.append("- %s" % event)
	if summary.get("slot_events", []).is_empty():
		lines.append("- No successful Slot actions.")
	lines.append("")
	lines.append("## Movement, Hazards, And Minions")
	lines.append("")
	for event in summary.get("board_events", []):
		lines.append("- %s" % event)
	if summary.get("board_events", []).is_empty():
		lines.append("- No successful movement, Hazard, or Minion actions.")
	lines.append("")
	lines.append("## Damage")
	lines.append("")
	for key in summary.get("damage", {}).keys():
		var damage: Dictionary = summary["damage"][key]
		lines.append("- %s: requested %d, prevented %d, health loss %d" % [key, damage["requested"], damage["prevented"], damage["health_loss"]])
	if summary.get("damage", {}).is_empty():
		lines.append("- No resolved damage.")
	if record.get("outcome", "") == "defeat" or record.get("outcome", "") == "abandoned":
		lines.append("")
		lines.append("## Decisive Timeline")
		lines.append("")
		lines.append("- Final Round/Phase: %d / %s" % [record.get("final_rules_snapshot", {}).get("round", 0), record.get("final_rules_snapshot", {}).get("phase", "")])
		for action in summary.get("last_actions", []):
			lines.append("- %s" % action)
		for rejection in summary.get("rejection_reasons", []):
			lines.append("- Rejected: %s" % rejection)
		lines.append("- Active Hazards: %d" % record.get("final_rules_snapshot", {}).get("hazards", []).size())
		lines.append("- Living Enemies: %d" % _living_enemy_count(record.get("final_rules_snapshot", {})))
		lines.append("- Final Health: %s" % _final_health(record.get("final_rules_snapshot", {})))
	return "\n".join(lines) + "\n"

func _summary(record: Dictionary) -> Dictionary:
	var actions: Array = []
	actions.append_array(record["submitted_actions"])
	actions.append_array(record["generated_actions"])
	var damage: Dictionary = {}
	var movement_count := 0
	var slot_use_count := 0
	var hazard_count := 0
	var minion_count := 0
	var slot_events: Array[String] = []
	var board_events: Array[String] = []
	for action in actions:
		var kind: String = str(action.get("kind", ""))
		var payload: Dictionary = action.get("payload", {})
		if kind == "move_hero" and action.get("succeeded", false):
			movement_count += 1
			board_events.append("%s moved to %s." % [action.get("source_id", ""), JSON.stringify(payload.get("destination", {}))])
		if kind in ["load_slot", "charge_slot", "fire_slot"] and action.get("succeeded", false):
			slot_use_count += 1
			var card_id := str(payload.get("card", {}).get("resource_id", ""))
			slot_events.append("%s used Slot %d%s." % [kind, int(payload.get("slot_index", -1)) + 1, " with `%s`" % card_id if not card_id.is_empty() else ""])
		if kind == "apply_hazard" and action.get("succeeded", false):
			hazard_count += 1
			board_events.append("Hazard applied at %s." % JSON.stringify(payload.get("coords", {})))
		if kind == "spawn_minion" and action.get("succeeded", false):
			minion_count += 1
			board_events.append("Minion `%s` spawned at %s." % [payload.get("minion_id", ""), JSON.stringify(payload.get("coords", {}))])
		if kind == "damage" and action.get("succeeded", false):
			var fact: Dictionary = action.get("payload", {}).get("resolution_fact", {})
			var key := "%s -> %s" % [action.get("source_id", ""), action.get("payload", {}).get("target_id", "")]
			if not damage.has(key): damage[key] = {"requested": 0, "prevented": 0, "health_loss": 0}
			for field in damage[key].keys(): damage[key][field] += int(fact.get(field, 0))
	var rejected: Array = record["rejected_actions"]
	var recent: Array = []
	for action in actions.slice(max(actions.size() - 6, 0)):
		recent.append("%s %s%s" % [action.get("kind", ""), action.get("source_id", ""), " rejected: %s" % action.get("reason", "") if not action.get("succeeded", false) else ""])
	return {
		"rounds_reached": record.get("final_rules_snapshot", {}).get("round", 0),
		"submitted_action_count": record["submitted_actions"].size(), "generated_action_count": record["generated_actions"].size(), "rejected_action_count": rejected.size(),
		"movement_count": movement_count, "slot_use_count": slot_use_count, "hazard_count": hazard_count, "minion_count": minion_count,
		"damage": damage, "slot_events": slot_events, "board_events": board_events, "last_actions": recent, "rejection_reasons": rejected.map(func(action): return action.get("reason", "")),
	}

static func _living_enemy_count(snapshot: Dictionary) -> int:
	var count := 0
	for entity in snapshot.get("entities", []):
		if entity.get("team", "") == "enemy" and int(entity.get("health", 0)) > 0: count += 1
	return count

static func _final_health(snapshot: Dictionary) -> String:
	var values: Array[String] = []
	for entity in snapshot.get("entities", []):
		values.append("%s=%d" % [entity.get("id", ""), int(entity.get("health", 0))])
	return ", ".join(values)

func _git_metadata() -> Dictionary:
	var output: Array = []
	var exit_code := OS.execute("git", ["rev-parse", "HEAD"], output, true)
	return {"commit": output[0].strip_edges() if exit_code == 0 and not output.is_empty() else "unknown"}
