class_name MovementPathPreview
extends Control

var grid: Node
var source_piece: Node
var active: bool = false

func bind(new_grid: Node) -> void:
	grid = new_grid

func show_for(piece: Node) -> void:
	source_piece = piece
	active = piece != null
	queue_redraw()

func clear() -> void:
	source_piece = null
	active = false
	queue_redraw()

func _draw() -> void:
	if not active or grid == null or source_piece == null:
		return
	var origin_tile: Control = grid.get_piece_tile(source_piece)
	if origin_tile == null:
		return
	var start: Vector2 = grid.get_tile_center(origin_tile)
	for coords in grid.get_neighbors(origin_tile.axial):
		if not grid.can_move_piece_to(source_piece, coords):
			continue
		var destination_tile: Control = grid.tiles.get(coords)
		if destination_tile != null:
			_draw_arrow(start, grid.get_tile_center(destination_tile))

func _draw_arrow(start: Vector2, end: Vector2) -> void:
	var direction := (end - start).normalized()
	var perpendicular := Vector2(-direction.y, direction.x)
	var tip := end - direction * 18.0
	var base := start + direction * 26.0
	draw_line(base, tip, Color(1.0, 0.82, 0.28, 0.96), 4.0, true)
	draw_colored_polygon(PackedVector2Array([
		tip,
		tip - direction * 13.0 + perpendicular * 8.0,
		tip - direction * 13.0 - perpendicular * 8.0,
	]), Color(1.0, 0.90, 0.46, 0.98))
