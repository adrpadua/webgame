class_name HexGrid
extends Control

const HexTileScene := preload("res://scripts/hex/HexTile.gd")
const HexPieceScene := preload("res://scripts/hex/HexPiece.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const DuelystBackdrop := preload("res://assets/art/open-duelyst/magaari_ember_highlands_background.jpg")
const MovementPathPreviewScene := preload("res://scripts/hex/MovementPathPreview.gd")

signal tile_selected(tile)
signal piece_selected(piece)
signal piece_dragged_to_tile(piece, tile)
signal hand_card_dropped_to_tile(card: Resource, tile)

@export var radius: int = 2
@export var show_coordinates: bool = false

const MIN_VIEW_ZOOM := 1.0
const MAX_VIEW_ZOOM := 2.5
const PAN_THRESHOLD := 10.0
const WHEEL_ZOOM_STEP := 1.12

var tiles: Dictionary = {}
var board_min := Vector2.ZERO
var board_max := Vector2.ZERO
var player_piece: Node
var boss_piece: Node
var combatants_bound: bool = false
var movement_path_preview: Control
var movement_preview_enabled: bool = false
var rules_board
var view_zoom: float = MIN_VIEW_ZOOM
var view_pan := Vector2.ZERO
var fit_scale: float = 1.0
var active_touches: Dictionary = {}
var touch_start_positions: Dictionary = {}
var piece_blocked_touches: Dictionary = {}
var touch_pan_started: bool = false
var last_pinch_distance: float = 0.0
var last_pinch_center := Vector2.ZERO
var mouse_pan_active: bool = false
var suppress_next_tile_selection: bool = false
var synced_engine_instance_id: int = 0

func _ready() -> void:
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_PASS
	resized.connect(_layout_tiles)
	build_grid()

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		_handle_screen_touch(event)
	elif event is InputEventScreenDrag:
		_handle_screen_drag(event)
	elif event is InputEventMagnifyGesture and _event_is_over_board(event.position):
		zoom_at(event.position - global_position, view_zoom * event.factor)
		get_viewport().set_input_as_handled()
	elif event is InputEventPanGesture and _event_is_over_board(event.position):
		pan_by(-event.delta * 20.0)
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and (
		_event_is_over_board(event.position)
		or mouse_pan_active and event.button_index in [MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_RIGHT]
	):
		_handle_mouse_button(event)
	elif event is InputEventMouseMotion and mouse_pan_active:
		pan_by(event.relative)
		suppress_next_tile_selection = true
		get_viewport().set_input_as_handled()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.025, 0.05, 0.06, 0.90), true)
	draw_texture_rect(DuelystBackdrop, Rect2(Vector2.ZERO, size), false, Color(0.78, 0.94, 1.0, 0.72))
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.02, 0.045, 0.05, 0.20), true)
	draw_circle(size * 0.5, min(size.x, size.y) * 0.31, Color(0.48, 0.22, 0.08, 0.12))

func build_grid() -> void:
	for child in get_children():
		child.queue_free()
	tiles.clear()
	_create_movement_path_preview()

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

	player_piece = null
	boss_piece = null
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
	fit_scale = min(available.x / board_size.x, available.y / board_size.y)
	fit_scale = clamp(fit_scale, 0.45, 1.65)
	_clamp_view_pan()
	var scale_factor: float = fit_scale * view_zoom
	var drawn_size := board_size * scale_factor
	var offset := (size - drawn_size) * 0.5

	for coords: Vector2i in tiles.keys():
		var tile: Control = tiles[coords]
		tile.scale = Vector2.ONE * scale_factor
		tile.position = offset + view_pan + (axial_to_pixel(coords.x, coords.y) - board_min) * scale_factor
	if movement_path_preview != null:
		movement_path_preview.size = size
		movement_path_preview.queue_redraw()
	queue_redraw()

func zoom_at(local_focus: Vector2, requested_zoom: float) -> void:
	var old_zoom := view_zoom
	var next_zoom := clampf(requested_zoom, MIN_VIEW_ZOOM, MAX_VIEW_ZOOM)
	if is_equal_approx(old_zoom, next_zoom):
		return
	var center_offset := local_focus - size * 0.5
	view_pan = center_offset - (center_offset - view_pan) * (next_zoom / old_zoom)
	view_zoom = next_zoom
	_clamp_view_pan()
	_layout_tiles()

func pan_by(delta: Vector2) -> void:
	view_pan += delta
	_clamp_view_pan()
	_layout_tiles()

func reset_view() -> void:
	view_zoom = MIN_VIEW_ZOOM
	view_pan = Vector2.ZERO
	_layout_tiles()

func get_tile_center(tile: Control) -> Vector2:
	return tile.position + tile.size * tile.scale * 0.5

func _clamp_view_pan() -> void:
	if board_min == Vector2.INF or size == Vector2.ZERO:
		view_pan = Vector2.ZERO
		return
	var drawn_size := (board_max - board_min) * fit_scale * view_zoom
	var limit := Vector2(
		maxf((drawn_size.x - size.x) * 0.5 + 6.0, 0.0),
		maxf((drawn_size.y - size.y) * 0.5 + 6.0, 0.0)
	)
	view_pan = view_pan.clamp(-limit, limit)

func _handle_screen_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		if not _event_is_over_board(event.position):
			return
		if _position_hits_piece(event.position):
			piece_blocked_touches[event.index] = true
			return
		active_touches[event.index] = event.position
		touch_start_positions[event.index] = event.position
		if active_touches.size() == 2:
			last_pinch_distance = _touch_distance()
			last_pinch_center = _touch_center()
	else:
		piece_blocked_touches.erase(event.index)
		if not active_touches.has(event.index):
			return
		active_touches.erase(event.index)
		touch_start_positions.erase(event.index)
		if active_touches.size() < 2:
			last_pinch_distance = 0.0
		if active_touches.is_empty():
			touch_pan_started = false
			call_deferred("_clear_selection_suppression")

func _handle_screen_drag(event: InputEventScreenDrag) -> void:
	if not active_touches.has(event.index):
		return
	active_touches[event.index] = event.position
	if active_touches.size() >= 2:
		var pinch_center := _touch_center()
		var pinch_distance := _touch_distance()
		if last_pinch_distance > 0.0:
			zoom_at(pinch_center - global_position, view_zoom * pinch_distance / last_pinch_distance)
			pan_by(pinch_center - last_pinch_center)
		last_pinch_distance = pinch_distance
		last_pinch_center = pinch_center
		touch_pan_started = true
		suppress_next_tile_selection = true
		get_viewport().set_input_as_handled()
		return
	var start: Vector2 = touch_start_positions.get(event.index, event.position)
	if touch_pan_started or start.distance_to(event.position) >= PAN_THRESHOLD:
		touch_pan_started = true
		pan_by(event.relative)
		suppress_next_tile_selection = true
		get_viewport().set_input_as_handled()

func _handle_mouse_button(event: InputEventMouseButton) -> void:
	if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
		zoom_at(event.position - global_position, view_zoom * WHEEL_ZOOM_STEP)
		get_viewport().set_input_as_handled()
	elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
		zoom_at(event.position - global_position, view_zoom / WHEEL_ZOOM_STEP)
		get_viewport().set_input_as_handled()
	elif event.button_index in [MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_RIGHT]:
		mouse_pan_active = event.pressed
		if not event.pressed:
			suppress_next_tile_selection = true
			call_deferred("_clear_selection_suppression")
		get_viewport().set_input_as_handled()

func _event_is_over_board(viewport_position: Vector2) -> bool:
	return get_global_rect().has_point(viewport_position)

func _position_hits_piece(viewport_position: Vector2) -> bool:
	for tile in tiles.values():
		for piece in tile.pieces:
			if piece.get_global_rect().has_point(viewport_position):
				return true
	return false

func _clear_selection_suppression() -> void:
	suppress_next_tile_selection = false

func _touch_center() -> Vector2:
	var points: Array = active_touches.values()
	return (points[0] + points[1]) * 0.5

func _touch_distance() -> float:
	var points: Array = active_touches.values()
	return points[0].distance_to(points[1])

func set_show_coordinates(value: bool) -> void:
	show_coordinates = value
	for tile in tiles.values():
		tile.set_show_coordinates(value)

func set_movement_preview_enabled(value: bool) -> void:
	movement_preview_enabled = value
	if not value and movement_path_preview != null:
		movement_path_preview.clear()

func set_hand_card_move_context(card: Resource) -> void:
	for coords: Vector2i in tiles:
		var tile: Node = tiles[coords]
		var legal := card != null and player_piece != null and can_move_piece_to(player_piece, coords)
		tile.set_hand_card_move_legal(legal, card if legal else null)

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
	if owner == &"player":
		piece.piece_drag_started.connect(_on_player_drag_started)
		piece.piece_drag_ended.connect(_on_player_drag_ended)
	tile.add_piece(piece)
	_refresh_tile_outline(tile)
	return piece

func sync_from_engine(engine) -> void:
	if engine == null:
		return
	var engine_instance_id: int = engine.get_instance_id()
	if synced_engine_instance_id != 0 and synced_engine_instance_id != engine_instance_id:
		reset_view()
	synced_engine_instance_id = engine_instance_id
	rules_board = engine.board
	if radius != engine.board.radius or tiles.is_empty():
		radius = engine.board.radius
		build_grid()
	_clear_rendered_pieces()
	for entity_id in engine.board.entities:
		var entity: Dictionary = engine.board.entities[entity_id]
		var kind: StringName = entity.get("kind", &"")
		var owner: StringName = &"enemy"
		var label := "W"
		var display_name := str(entity.get("title", "Whelp"))
		if kind == &"hero":
			owner = &"player"
			label = "P"
			display_name = "Player"
		elif kind == &"boss":
			owner = &"boss"
			label = "B"
			display_name = "Ember"
		var piece := spawn_piece(entity["coords"], label, owner, int(entity["max_health"]), int(entity["facing"]), display_name)
		if piece == null:
			continue
		piece.piece_id = entity_id
		piece.health = int(entity["health"])
		piece.max_health = int(entity["max_health"])
		piece.armor = int(entity.get("armor", 0))
		piece.queue_redraw()
		if entity_id == engine.primary_hero_id:
			player_piece = piece
		elif entity_id == engine.boss_id:
			boss_piece = piece
	for coords in tiles:
		var tile: HexTile = tiles[coords]
		tile.set_terrain(&"")
		tile.set_telegraph(&"")
		var hazards: Array = engine.board.get_hazards(coords)
		if not hazards.is_empty():
			tile.set_terrain(hazards[0].id)
	for coords in engine.get_telegraphs():
		var tile: HexTile = tiles.get(coords)
		if tile != null:
			tile.set_telegraph(engine.telegraphs[coords])
	_refresh_tile_outlines()

func _clear_rendered_pieces() -> void:
	for tile: HexTile in tiles.values():
		for piece in tile.pieces.duplicate():
			tile.remove_piece(piece)
			piece.queue_free()
	player_piece = null
	boss_piece = null

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

# A read-only view query: movement legality is answered by BoardQuery over the
# rules board — the view restates no rules and has no non-engine fallback.
func can_move_piece_to(piece: Node, destination: Vector2i, max_distance: int = 1) -> bool:
	if rules_board == null or piece == null or not rules_board.has_entity(piece.piece_id):
		return false
	return BoardQueryModel.is_legal_move(rules_board, piece.piece_id, destination, max_distance)

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
	if suppress_next_tile_selection:
		suppress_next_tile_selection = false
		return
	tile_selected.emit(tile)
	if not tile.pieces.is_empty():
		piece_selected.emit(tile.pieces[0])

func _on_tile_data_dropped(tile, data: Dictionary) -> void:
	match data.get("kind"):
		"board_piece":
			var piece: Node = data.get("piece")
			if piece == null:
				return
			tile_selected.emit(tile)
			piece_selected.emit(piece)
			piece_dragged_to_tile.emit(piece, tile)
		"hand_card":
			var card: Resource = data.get("card")
			if card != null:
				hand_card_dropped_to_tile.emit(card, tile)

func _create_movement_path_preview() -> void:
	movement_path_preview = MovementPathPreviewScene.new()
	movement_path_preview.bind(self)
	movement_path_preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	movement_path_preview.z_as_relative = false
	movement_path_preview.z_index = 3500
	add_child(movement_path_preview)

func _on_player_drag_started(piece: Node) -> void:
	if movement_preview_enabled and movement_path_preview != null:
		movement_path_preview.show_for(piece)

func _on_player_drag_ended(_piece: Node) -> void:
	if movement_path_preview != null:
		movement_path_preview.clear()

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
				player_piece.armor = player.armor
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
				boss_piece.armor = 0
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
