class_name HexGrid
extends Control

const HexTileScene := preload("res://scripts/hex/HexTile.gd")
const HexPieceScene := preload("res://scripts/hex/HexPiece.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")
const BoardStateModel := preload("res://scripts/hex/BoardState.gd")
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const DuelystBackdrop := preload("res://assets/art/open-duelyst/magaari_ember_highlands_background.jpg")

signal tile_selected(tile)
signal piece_selected(piece)
signal piece_dragged_to_tile(piece, tile)

@export var radius: int = 2
@export var show_coordinates: bool = false

var tiles: Dictionary = {}
var board_min := Vector2.ZERO
var board_max := Vector2.ZERO
var player_piece: Node
var boss_piece: Node
var combatants_bound: bool = false
var board_state := BoardStateModel.new()

func _ready() -> void:
	resized.connect(_layout_tiles)
	build_grid()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.025, 0.05, 0.06, 0.90), true)
	draw_texture_rect(DuelystBackdrop, Rect2(Vector2.ZERO, size), false, Color(0.78, 0.94, 1.0, 0.72))
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.02, 0.045, 0.05, 0.20), true)
	draw_circle(size * 0.5, min(size.x, size.y) * 0.31, Color(0.48, 0.22, 0.08, 0.12))

func build_grid() -> void:
	for child in get_children():
		child.queue_free()
	tiles.clear()
	board_state.clear()

	for q in range(-radius, radius + 1):
		var r1: int = max(-radius, -q - radius)
		var r2: int = min(radius, -q + radius)
		for r in range(r1, r2 + 1):
			var tile := HexTileScene.new()
			tile.setup(q, r)
			tile.z_index = 1500 + int((axial_to_pixel(q, r).y + HexTileScene.CELL_CENTER.y) * 10.0)
			tile.set_show_coordinates(show_coordinates)
			tile.selected.connect(_on_tile_selected)
			tile.data_dropped.connect(_on_tile_data_dropped)
			add_child(tile)
			tiles[Vector2i(q, r)] = tile

	player_piece = spawn_piece(Vector2i(0, 0), "P", &"player", 3, FacingDirections.Direction.NORTH_EAST, "Player")
	boss_piece = spawn_piece(Vector2i(1, -1), "B", &"boss", 12, FacingDirections.Direction.SOUTH_WEST, "Ember")
	_measure_board()
	_refresh_tile_outlines()
	_layout_tiles()

func axial_to_pixel(q: int, r: int) -> Vector2:
	var hex_radius := HexTileScene.HEX_RADIUS
	var center := Vector2(
		hex_radius * 1.5 * q,
		hex_radius * sqrt(3.0) * (r + q * 0.5)
	)
	return center - HexTileScene.CELL_CENTER

func _measure_board() -> void:
	board_min = Vector2.INF
	board_max = -Vector2.INF
	for coords: Vector2i in tiles.keys():
		var pos := axial_to_pixel(coords.x, coords.y)
		board_min = board_min.min(pos)
		board_max = board_max.max(pos + HexTileScene.SIZE)

func _layout_tiles() -> void:
	if tiles.is_empty() or size == Vector2.ZERO:
		return

	var board_size := board_max - board_min
	var available := size - Vector2(12, 12)
	var scale_factor: float = min(available.x / board_size.x, available.y / board_size.y)
	scale_factor = clamp(scale_factor, 0.45, 1.65)
	var drawn_size := board_size * scale_factor
	var offset := (size - drawn_size) * 0.5

	for coords: Vector2i in tiles.keys():
		var tile: Control = tiles[coords]
		tile.scale = Vector2.ONE * scale_factor
		tile.position = offset + (axial_to_pixel(coords.x, coords.y) - board_min) * scale_factor
	queue_redraw()

func set_show_coordinates(value: bool) -> void:
	show_coordinates = value
	for tile in tiles.values():
		tile.set_show_coordinates(value)

func spawn_piece(
	coords: Vector2i,
	label: String,
	owner: StringName,
	hp: int,
	facing: int = FacingDirections.Direction.SOUTH_WEST,
	display_name: String = ""
) -> Node:
	var tile: Node = tiles.get(coords)
	if tile == null:
		return null
	var piece := HexPieceScene.new()
	piece.setup(label, owner, hp, facing, display_name)
	piece.died.connect(_on_piece_died)
	tile.add_piece(piece)
	_refresh_tile_outline(tile)
	return piece

func spawn_enemy_wave(count: int) -> int:
	var spawn_points: Array[Vector2i] = [
		Vector2i(2, -2),
		Vector2i(2, -1),
		Vector2i(1, -2),
		Vector2i(-2, 2),
		Vector2i(-1, 2),
	]
	var spawned := 0
	for coords in spawn_points:
		if spawned >= count:
			break
		var tile = tiles.get(coords)
		if tile == null:
			continue
		var occupied := false
		for piece in tile.pieces:
			if piece.piece_owner == &"enemy":
				occupied = true
				break
		if occupied:
			continue
		spawn_piece(coords, "W", &"enemy", 2, FacingDirections.Direction.NORTH_WEST, "Whelp")
		spawned += 1
	return spawned

func spawn_whelps_at(coords_list: Array[Vector2i]) -> int:
	var spawned := 0
	for coords in coords_list:
		var tile = tiles.get(coords)
		if tile == null or not tile.pieces.is_empty():
			continue
		spawn_piece(coords, "W", &"enemy", 2, FacingDirections.Direction.NORTH_WEST, "Whelp")
		spawned += 1
	return spawned

func get_brood_spawn_hexes(count: int) -> Array[Vector2i]:
	var candidates := get_brood_spawn_candidates()
	var result: Array[Vector2i] = []
	for coords in candidates:
		var tile = tiles.get(coords)
		if tile != null and tile.pieces.is_empty():
			result.append(coords)
			if result.size() >= count:
				break
	return result

func get_brood_spawn_candidates() -> Array[Vector2i]:
	return [Vector2i(-2, 1), Vector2i(-1, 2), Vector2i(0, 2), Vector2i(2, -2), Vector2i(2, -1)]

func get_front_arc(origin: Vector2i, facing: int) -> Array[Vector2i]:
	return BoardQueryModel.front_arc(tiles, origin, facing)

func get_forward_cone(origin: Vector2i, facing: int, maximum_range: int = 2) -> Array[Vector2i]:
	return BoardQueryModel.forward_cone(tiles, origin, facing, maximum_range)

func telegraph_hexes(coords_list: Array[Vector2i], telegraph_id: StringName) -> void:
	for coords in coords_list:
		var tile: HexTile = tiles.get(coords)
		if tile != null:
			tile.set_telegraph(telegraph_id)

func clear_telegraphs() -> void:
	for tile: HexTile in tiles.values():
		tile.set_telegraph(&"")

func set_scorched(coords_list: Array[Vector2i], duration_rounds: int = 1) -> void:
	for coords in coords_list:
		if not tiles.has(coords):
			continue
		board_state.set_state(coords, &"scorched", duration_rounds)
		var tile: HexTile = tiles[coords]
		tile.set_terrain(&"scorched")

func advance_board_state() -> Array[Vector2i]:
	var expired := board_state.advance_round()
	for coords in expired:
		var tile: HexTile = tiles.get(coords)
		if tile != null:
			tile.set_terrain(&"")
	return expired

func is_scorched(coords: Vector2i) -> bool:
	return board_state.has_state(coords, &"scorched")

func get_player_in(coords_list: Array[Vector2i]):
	return player_piece if player_piece != null and coords_list.has(get_piece_coords(player_piece)) else null

func damage_enemy_front(amount: int) -> int:
	var hits := 0
	for coords in [Vector2i(1, -1), Vector2i(-1, 1), Vector2i(2, -2), Vector2i(-2, 2)]:
		var tile = tiles.get(coords)
		if tile == null:
			continue
		for piece in tile.pieces:
			if piece.piece_owner == &"enemy":
				piece.take_damage(amount)
				hits += 1
				break
	return hits

func get_piece_tile(piece: Node) -> Node:
	if piece == null:
		return null
	for tile in tiles.values():
		if tile.pieces.has(piece):
			return tile
	return null

func get_piece_coords(piece: Node) -> Vector2i:
	var tile := get_piece_tile(piece)
	if tile == null:
		return Vector2i(999, 999)
	return tile.axial

func hex_distance(from_coords: Vector2i, to_coords: Vector2i) -> int:
	return BoardQueryModel.hex_distance(from_coords, to_coords)

func can_move_piece_to(piece: Node, destination: Vector2i, max_distance: int = 1) -> bool:
	var from_tile := get_piece_tile(piece)
	var to_tile = tiles.get(destination)
	if piece == null or from_tile == null or to_tile == null:
		return false
	if from_tile == to_tile:
		return false
	if hex_distance(from_tile.axial, destination) > max_distance:
		return false
	if piece == player_piece and is_scorched(destination):
		return false
	for occupant in to_tile.pieces:
		if occupant != piece:
			return false
	return true

func move_piece_to(piece: Node, destination: Vector2i) -> bool:
	if not can_move_piece_to(piece, destination):
		return false
	var from_tile := get_piece_tile(piece)
	var to_tile = tiles.get(destination)
	if from_tile == null or to_tile == null:
		return false
	from_tile.remove_piece(piece)
	piece.facing = FacingDirections.direction_for_axial_delta(destination - from_tile.axial)
	to_tile.add_piece(piece)
	_refresh_tile_outline(from_tile)
	_refresh_tile_outline(to_tile)
	return true

func sync_combatant_health(player, boss) -> void:
	if player_piece != null:
		player_piece.health = player.health
		player_piece.max_health = player.max_health
		player_piece.queue_redraw()
	if boss_piece != null:
		boss_piece.health = boss.health
		boss_piece.max_health = boss.max_health
		boss_piece.queue_redraw()

func get_neighbors(coords: Vector2i) -> Array[Vector2i]:
	return [
		coords + Vector2i(1, 0),
		coords + Vector2i(1, -1),
		coords + Vector2i(0, -1),
		coords + Vector2i(-1, 0),
		coords + Vector2i(-1, 1),
		coords + Vector2i(0, 1),
	]

func _on_tile_selected(tile) -> void:
	tile_selected.emit(tile)
	if not tile.pieces.is_empty():
		piece_selected.emit(tile.pieces[0])

func _on_tile_data_dropped(tile, data: Dictionary) -> void:
	if data.get("kind") != "board_piece":
		return
	var piece: Node = data.get("piece")
	if piece == null:
		return
	tile_selected.emit(tile)
	piece_selected.emit(piece)
	piece_dragged_to_tile.emit(piece, tile)

func _on_piece_died(piece) -> void:
	for tile in tiles.values():
		if tile.pieces.has(piece):
			tile.remove_piece(piece)
			_refresh_tile_outline(tile)
	if piece == player_piece:
		player_piece = null
	if piece == boss_piece:
		boss_piece = null

func bind_combatants(player, boss) -> void:
	if combatants_bound:
		return
	combatants_bound = true
	if player != null:
		if player_piece != null:
			player_piece.facing = player.facing
		player.facing_changed.connect(func() -> void:
			if player_piece != null:
				player_piece.facing = player.facing
		)
		player.health_changed.connect(func() -> void:
			if player_piece != null:
				player_piece.health = player.health
				player_piece.max_health = player.max_health
				player_piece.queue_redraw()
		)

	if boss != null:
		if boss_piece != null:
			boss_piece.facing = boss.facing
		boss.facing_changed.connect(func() -> void:
			if boss_piece != null:
				boss_piece.facing = boss.facing
		)
		boss.state_changed.connect(func() -> void:
			if boss_piece != null:
				boss_piece.health = boss.health
				boss_piece.max_health = boss.max_health
				boss_piece.queue_redraw()
		)

func _refresh_tile_outlines() -> void:
	for tile in tiles.values():
		_refresh_tile_outline(tile)

func refresh_tile_outline(tile: Node) -> void:
	_refresh_tile_outline(tile)

func _refresh_tile_outline(tile: Node) -> void:
	if tile.pieces.is_empty():
		tile.set_outline_color(HexTileScene.DEFAULT_OUTLINE)
		return
	tile.set_outline_color(_color_for_owner(tile.pieces[0].piece_owner))

func _color_for_owner(owner: StringName) -> Color:
	match owner:
		&"player":
			return Color(0.24, 0.72, 0.85)
		&"boss":
			return Color(0.92, 0.38, 0.31)
		&"enemy":
			return Color(0.82, 0.74, 0.58)
	return HexTileScene.DEFAULT_OUTLINE
