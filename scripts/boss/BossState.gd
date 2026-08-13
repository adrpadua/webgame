class_name BossState
extends Node

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

signal state_changed
signal action_resolved(log_line: String)
signal facing_changed

@export var boss_name: String = "Embermaw"
@export var max_health: int = 36

var health: int = 0
var facing: int = FacingDirections.Direction.SOUTH_WEST
var current_program
var last_pattern: Array[Vector2i] = []
var last_impacted_hexes: Array[Vector2i] = []
var incoming_spawn_hexes: Array[Vector2i] = []
var resolved_beats: Array[String] = []
var last_action_text: String = "The raid boss is waiting."

var _engine
var _history_cursor: int = 0

func bind_engine(engine) -> void:
	_engine = engine
	_history_cursor = 0
	sync_from_engine()

func sync_from_engine() -> void:
	if _engine == null:
		return
	var entity: Dictionary = _engine.board.get_entity(_engine.boss_id)
	if not entity.is_empty():
		boss_name = str(entity.get("title", boss_name))
		health = int(entity.get("health", 0))
		max_health = int(entity.get("max_health", max_health))
		facing = int(entity.get("facing", facing))
	current_program = _engine.current_program
	last_pattern = _engine.last_pattern.duplicate()
	last_impacted_hexes = _engine.previous_impacted_hexes.duplicate()
	while _history_cursor < _engine.history.size():
		var action = _engine.history[_history_cursor]
		_history_cursor += 1
		if action.kind == EncounterActionModel.Kind.RESOLVE_BOSS and action.succeeded:
			var beat = action.payload.get("beat")
			last_action_text = beat.title if beat != null else "Boss beat resolved."
			resolved_beats.append(last_action_text)
			action_resolved.emit(last_action_text)
	facing_changed.emit()
	state_changed.emit()

func get_instant_title() -> String:
	return current_program.title if current_program != null else "None"

func get_incoming_title() -> String:
	return current_program.title if current_program != null else "None"

func get_track_lines(track: StringName) -> Array[String]:
	var lines: Array[String] = []
	if current_program != null:
		for line in current_program.get_track_lines(track):
			lines.append(str(line))
	return lines

func get_track_text(track: StringName) -> String:
	var title := "INSTANT" if track == &"instant" else "INCOMING"
	return "%s\n%s" % [title, "\n".join(get_track_lines(track))]

func get_facing_name() -> String:
	return FacingDirections.name_for(facing)
