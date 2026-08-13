class_name BossState
extends Node

const FacingDirections := preload("res://scripts/combat/Facing.gd")
const EncounterResolverModel := preload("res://scripts/encounter/EncounterResolver.gd")
const EncounterSnapshotModel := preload("res://scripts/encounter/EncounterSnapshot.gd")

signal state_changed
signal action_resolved(log_line: String)
signal facing_changed

@export var boss_name: String = "Embermaw"
@export var max_health: int = 36
@export_enum("E", "NE", "NW", "W", "SW", "SE") var facing: int = FacingDirections.Direction.SOUTH_WEST:
	set(value):
		facing = FacingDirections.normalize_hex_edge_facing(value, "Boss facing")
		facing_changed.emit()
		state_changed.emit()

var health: int = 0:
	set(value):
		health = clamp(value, 0, max_health)
		state_changed.emit()

var script_deck: Array = []
var next_index: int = 0
var instant_action: Resource
var incoming_action: Resource
var current_program: BossProgramData
var last_pattern: Array[Vector2i] = []
var last_impacted_hexes: Array[Vector2i] = []
var incoming_spawn_hexes: Array[Vector2i] = []
var resolved_beats: Array[String] = []
var last_action_text: String = "The raid boss is waiting."
var resolver := EncounterResolverModel.new()

func _ready() -> void:
	health = max_health

func load_script(cards: Array) -> void:
	script_deck = cards.duplicate()
	next_index = 0
	instant_action = null
	incoming_action = null
	current_program = null
	last_pattern.clear()
	last_impacted_hexes.clear()
	incoming_spawn_hexes.clear()
	resolved_beats.clear()
	last_action_text = "The raid boss is waiting."
	state_changed.emit()

func reset_for_encounter() -> void:
	health = max_health
	next_index = 0
	instant_action = null
	incoming_action = null
	current_program = null
	last_pattern.clear()
	last_impacted_hexes.clear()
	incoming_spawn_hexes.clear()
	resolved_beats.clear()
	last_action_text = "The raid boss is waiting."
	state_changed.emit()

func start_timeline() -> void:
	current_program = _draw_next_action()
	state_changed.emit()

func resolve_instant(player, hex_grid) -> String:
	return _resolve_track(&"instant", player, hex_grid)

func resolve_incoming(player, hex_grid) -> String:
	return _resolve_track(&"incoming", player, hex_grid)

func advance_round_timeline(hex_grid = null) -> void:
	if hex_grid != null:
		hex_grid.advance_board_state()
	current_program = _draw_next_action()
	if hex_grid != null:
		telegraph_incoming(hex_grid)
	state_changed.emit()

func get_instant_title() -> String:
	return current_program.title if current_program != null else "None"

func get_incoming_title() -> String:
	return current_program.title if current_program != null else "None"

func get_track_lines(track: StringName) -> Array[String]:
	return current_program.get_track_lines(track) if current_program != null else []

func get_track_text(track: StringName) -> String:
	var title := "INSTANT" if track == &"instant" else "INCOMING"
	return "%s\n%s" % [title, "\n".join(get_track_lines(track))]

func telegraph_incoming(hex_grid) -> void:
	if current_program == null or hex_grid == null:
		return
	hex_grid.clear_telegraphs()
	incoming_spawn_hexes.clear()
	for beat in current_program.incoming_beats:
		match beat.kind:
			BossProgramBeat.Kind.CINDER_BREATH:
				hex_grid.telegraph_hexes(hex_grid.get_forward_cone(hex_grid.get_piece_coords(hex_grid.boss_piece), facing), &"breath")
			BossProgramBeat.Kind.BROOD_CALL:
				incoming_spawn_hexes = hex_grid.get_brood_spawn_hexes(2)
				hex_grid.telegraph_hexes(incoming_spawn_hexes, &"brood")
	state_changed.emit()

func _resolve_track(track: StringName, player, hex_grid) -> String:
	if current_program == null:
		last_action_text = "%s has no program left." % boss_name
		return last_action_text
	if track == &"incoming":
		hex_grid.clear_telegraphs()
	var beats: Array[BossProgramBeat] = current_program.instant_beats if track == &"instant" else current_program.incoming_beats
	var lines: Array[String] = []
	for index in beats.size():
		var line := _resolve_beat(track, index + 1, beats[index], player, hex_grid)
		lines.append(line)
		resolved_beats.append(line)
		last_action_text = line
		action_resolved.emit(line)
	state_changed.emit()
	return " | ".join(lines)

func _resolve_beat(track: StringName, index: int, beat: BossProgramBeat, player, hex_grid) -> String:
	var prefix := "%s %d: %s" % [track.capitalize(), index, beat.title]
	var resolution := resolver.resolve_beat(beat, _snapshot_for(hex_grid))
	if resolution.next_facing >= 0:
		facing = resolution.next_facing
	if not resolution.pattern_hexes.is_empty():
		last_pattern = resolution.pattern_hexes
	if not resolution.impacted_hexes.is_empty() or beat.kind == BossProgramBeat.Kind.RAKING_CLAW:
		last_impacted_hexes = resolution.impacted_hexes
	if resolution.player_damage > 0:
		player.take_damage(resolution.player_damage)
	if not resolution.scorched_hexes.is_empty():
		hex_grid.set_scorched(resolution.scorched_hexes, resolution.scorched_duration_rounds)
	if not resolution.spawn_hexes.is_empty():
		var spawned: int = hex_grid.spawn_whelps_at(resolution.spawn_hexes)
		return "%s summons %d Whelp(s)." % [prefix, spawned]
	return "%s %s" % [prefix, resolution.log_suffix]

func _snapshot_for(hex_grid):
	var snapshot := EncounterSnapshotModel.new()
	for coords in hex_grid.tiles:
		snapshot.board_hexes[coords] = true
		var tile = hex_grid.tiles[coords]
		if tile.pieces.is_empty():
			snapshot.empty_hexes[coords] = true
	snapshot.boss_coords = hex_grid.get_piece_coords(hex_grid.boss_piece)
	snapshot.boss_facing = facing
	snapshot.player_coords = hex_grid.get_piece_coords(hex_grid.player_piece)
	snapshot.incoming_spawn_hexes = incoming_spawn_hexes.duplicate()
	snapshot.brood_spawn_candidates = hex_grid.get_brood_spawn_candidates()
	snapshot.previous_impacted_hexes = last_impacted_hexes.duplicate()
	return snapshot

func take_damage(amount: int) -> void:
	health -= amount

func heal(amount: int) -> void:
	health += amount

func rotate_facing(steps: int) -> void:
	facing = facing + steps

func get_facing_name() -> String:
	return FacingDirections.name_for(facing)

func _draw_next_action() -> Resource:
	if script_deck.is_empty():
		return null
	var action: Resource = script_deck[next_index]
	next_index = (next_index + 1) % script_deck.size()
	return action
