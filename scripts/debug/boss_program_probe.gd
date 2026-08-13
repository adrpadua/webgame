extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame

	var boss = main.get_node("BossState")
	var player = main.get_node("PlayerState")
	var grid = main.get_node("%HexGrid")
	var turn_manager = main.get_node("TurnManager")

	_assert(boss.current_program != null, "Encounter must begin with a Boss Program Card.")
	_assert(boss.get_track_lines(&"instant").size() == 3, "Instant track must expose three ordered beats.")
	_assert(boss.get_track_lines(&"incoming").size() == 3, "Incoming track must expose three ordered beats.")
	_assert(_count_telegraphs(grid, &"breath") > 0, "Cinder Breath must be telegraphed on the board before Quick.")
	_assert(_count_telegraphs(grid, &"brood") == 2, "Brood Call must telegraph two solo-safe spawn hexes.")

	boss.resolve_instant(player, grid)
	_assert(boss.resolved_beats.size() == 3, "Instant beats must resolve automatically as one phase action.")
	_assert(boss.resolved_beats[0].begins_with("Instant 1"), "Instant beat ordering must be deterministic.")
	_assert(grid.is_scorched(Vector2i(0, 0)), "Raking Claw's state beat must leave Scorched terrain.")

	turn_manager.advance_phase(player)
	var health_before_breath: int = player.health
	_assert(grid.move_piece_to(grid.player_piece, Vector2i(0, -1)), "Player must have a legal move out of the Cinder Breath cone.")
	player.facing = grid.player_piece.facing
	boss.resolve_incoming(player, grid)
	_assert(player.health == health_before_breath, "Moving out of Cinder Breath must avoid its damage.")
	_assert(_enemy_count(grid) == 2, "Brood Call must create Whelps on its telegraphed hexes.")
	_assert(_count_scorched(grid) > 0, "Cinder Breath must leave Scorched terrain after resolution.")

	boss.advance_round_timeline(grid)
	_assert(_count_scorched(grid) == 0, "Scorched terrain must expire after its authored duration.")
	_assert(_count_telegraphs(grid, &"brood") > 0, "The next program must telegraph its Incoming board problem during the next Quick setup.")
	print("BOSS_PROGRAM_PROBE_OK")
	quit()

func _count_telegraphs(grid, telegraph_id: StringName) -> int:
	var count := 0
	for tile in grid.tiles.values():
		if tile.telegraph_id == telegraph_id:
			count += 1
	return count

func _count_scorched(grid) -> int:
	var count := 0
	for coords in grid.tiles.keys():
		if grid.is_scorched(coords):
			count += 1
	return count

func _enemy_count(grid) -> int:
	var count := 0
	for tile in grid.tiles.values():
		for piece in tile.pieces:
			if piece.piece_owner == &"enemy":
				count += 1
	return count

func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	push_error(message)
	quit(1)
