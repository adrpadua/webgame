class_name EncounterState
extends Node

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")

signal state_changed
signal log_changed
signal encounter_ended(outcome: StringName, reason: String)

@export var round_limit: int = 8

var active: bool = false
var outcome: StringName = &"ongoing"
var reason: String = ""
var log_lines: Array[String] = []
var _engine
var _last_active: bool = false
var _history_cursor: int = 0

func bind_engine(engine) -> void:
	_engine = engine
	log_lines.clear()
	_history_cursor = 0
	_last_active = engine.active
	append_log("Encounter begins. Defeat the Boss before round %d ends." % engine.round_limit)
	sync_from_engine()

func sync_from_engine() -> void:
	if _engine == null:
		return
	var was_active := active
	active = _engine.active
	outcome = _engine.outcome
	reason = _engine.outcome_reason
	round_limit = _engine.round_limit
	while _history_cursor < _engine.history.size():
		var action = _engine.history[_history_cursor]
		_history_cursor += 1
		var line := _describe_action(action)
		if not line.is_empty():
			append_log(line)
	state_changed.emit()
	if was_active and not active:
		append_log(reason)
		encounter_ended.emit(outcome, reason)
	_last_active = active

func append_log(line: String) -> void:
	if line.strip_edges().is_empty():
		return
	log_lines.push_front(line)
	if log_lines.size() > 12:
		log_lines.resize(12)
	log_changed.emit()

func get_log_text() -> String:
	return "\n".join(log_lines)

func check_resolution(_player = null, _boss = null, _turn_number: int = 0, _enrage_text: String = "") -> bool:
	sync_from_engine()
	return not active

func _describe_action(action) -> String:
	if not action.succeeded:
		return "Rejected: %s" % action.reason
	match action.kind:
		EncounterActionModel.Kind.LOAD_SLOT:
			return "%s loads %s into Slot %d." % [action.source_id, action.payload["card"].title, int(action.payload["slot_index"]) + 1]
		EncounterActionModel.Kind.CHARGE_SLOT:
			return "%s tucks %s under Slot %d." % [action.source_id, action.payload["card"].title, int(action.payload["slot_index"]) + 1]
		EncounterActionModel.Kind.FIRE_SLOT:
			return "%s fires Slot %d." % [action.source_id, int(action.payload["slot_index"]) + 1]
		EncounterActionModel.Kind.MOVE_HERO:
			return "%s discards %s for Stamina and moves to %s." % [action.source_id, action.payload["card"].title, action.payload["destination"]]
		EncounterActionModel.Kind.RESOLVE_BOSS:
			var beat = action.payload.get("beat")
			return "Boss resolves %s." % (beat.title if beat != null else "an authored Beat")
		EncounterActionModel.Kind.APPLY_HAZARD:
			var hazard = action.payload.get("hazard")
			return "%s appears at %s." % [hazard.id if hazard != null else &"hazard", action.payload["coords"]]
		EncounterActionModel.Kind.SPAWN_MINION:
			return "A Minion spawns at %s." % action.payload["coords"]
		EncounterActionModel.Kind.DAMAGE:
			return "%s takes %d damage." % [action.payload["target_id"], int(action.payload.get("dealt", 0))]
	return ""
