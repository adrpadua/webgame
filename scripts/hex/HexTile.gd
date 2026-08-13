class_name HexTile
extends Button

signal selected(tile)
signal data_dropped(tile, data)

const HEX_RADIUS := 34.0
const TILE_DEPTH := 12.0
const CELL_CENTER := Vector2(38, 34)
const SIZE := Vector2(76, 80)
const DEFAULT_OUTLINE := Color(0.26, 0.26, 0.27)
const BASE_FILL := Color(0.16, 0.29, 0.14, 0.72)
const DuelystHoverTile := preload("res://assets/art/open-duelyst/tile_hover@2x.png")
const DuelystTargetTile := preload("res://assets/art/open-duelyst/tile_target.png")

var axial: Vector2i
var pieces: Array[Node] = []
var show_coordinates: bool = true
var outline_color: Color = DEFAULT_OUTLINE
var drop_hovered: bool = false
var telegraph_id: StringName = &""
var terrain_id: StringName = &""

func _ready() -> void:
	flat = true

func setup(q: int, r: int) -> void:
	axial = Vector2i(q, r)
	custom_minimum_size = SIZE
	tooltip_text = "Hex %d,%d" % [q, r]
	update_coordinate_text()
	queue_redraw()

func set_show_coordinates(value: bool) -> void:
	show_coordinates = value
	update_coordinate_text()

func add_piece(piece: Node) -> void:
	pieces.append(piece)
	add_child(piece)
	if pieces.size() == 1:
		piece.position = CELL_CENTER - Vector2(27, 27)
	else:
		piece.position = Vector2(7 + (pieces.size() - 2) * 18, 34)

func remove_piece(piece: Node) -> void:
	pieces.erase(piece)
	if piece != null and piece.get_parent() == self:
		remove_child(piece)

func set_outline_color(value: Color) -> void:
	outline_color = value
	queue_redraw()

func set_telegraph(value: StringName) -> void:
	telegraph_id = value
	queue_redraw()

func set_terrain(value: StringName) -> void:
	terrain_id = value
	queue_redraw()

func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY:
		_set_drop_hover(false)
		return false
	if data.get("kind") != "board_piece" and data.get("kind") != "hand_card":
		_set_drop_hover(false)
		return false
	_set_drop_hover(true)
	return true

func _drop_data(_at_position: Vector2, data: Variant) -> void:
	_set_drop_hover(false)
	data_dropped.emit(self, data)

func update_coordinate_text() -> void:
	text = "%d,%d" % [axial.x, axial.y] if show_coordinates else ""
	add_theme_color_override("font_color", Color(0.90, 0.89, 0.86))
	add_theme_font_size_override("font_size", 18)

func _pressed() -> void:
	selected.emit(self)

func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END:
		_set_drop_hover(false)
	if what == NOTIFICATION_FOCUS_ENTER or what == NOTIFICATION_FOCUS_EXIT:
		queue_redraw()

func _draw() -> void:
	var outline := outline_color if not drop_hovered else Color(0.55, 0.84, 0.62)
	var outer_hex := _top_hex_points(0.0)
	var inner_hex := _top_hex_points(2.5)
	var terrain_tint := BASE_FILL.lightened(0.055) if (axial.x + axial.y) % 2 == 0 else BASE_FILL.darkened(0.035)
	_draw_tile_sides(outer_hex)
	draw_colored_polygon(outer_hex, Color(0.08, 0.12, 0.07, 0.96))
	draw_colored_polygon(inner_hex, terrain_tint)
	_draw_ground_texture()
	if terrain_id == &"scorched":
		draw_colored_polygon(_top_hex_points(7.0), Color(0.74, 0.20, 0.07, 0.48))
		draw_line(Vector2(18, size.y - 20), Vector2(size.x - 18, 20), Color(1.0, 0.57, 0.20, 0.78), 2.0)
	if telegraph_id == &"breath":
		draw_colored_polygon(_top_hex_points(7.0), Color(0.96, 0.31, 0.16, 0.34))
		draw_texture_rect(DuelystTargetTile, Rect2(Vector2(15, 10), Vector2(46, 46)), false, Color(1.0, 0.35, 0.16, 0.75))
	elif telegraph_id == &"brood":
		draw_colored_polygon(_top_hex_points(7.0), Color(0.78, 0.66, 0.30, 0.32))
		draw_texture_rect(DuelystTargetTile, Rect2(Vector2(17, 12), Vector2(42, 42)), false, Color(0.94, 0.78, 0.72))
	var grid_color := Color(0.32, 0.67, 0.66, 0.46) if outline == DEFAULT_OUTLINE else outline
	draw_polyline(PackedVector2Array([outer_hex[0], outer_hex[1], outer_hex[2], outer_hex[3], outer_hex[4], outer_hex[5], outer_hex[0]]), grid_color, 1.25, true)
	if drop_hovered:
		draw_texture_rect(DuelystHoverTile, Rect2(Vector2(4, 1), Vector2(68, 66)), false, Color(0.56, 0.96, 0.70, 0.84))
	if has_focus():
		var focus_hex := _top_hex_points(5.0)
		draw_polyline(PackedVector2Array([focus_hex[0], focus_hex[1], focus_hex[2], focus_hex[3], focus_hex[4], focus_hex[5], focus_hex[0]]), Color(1.0, 0.92, 0.50), 2.0, true)

func _top_hex_points(inset: float = 0.0) -> PackedVector2Array:
	var radius := HEX_RADIUS - inset
	var center := CELL_CENTER
	var points := PackedVector2Array()
	for index in 6:
		points.append(center + Vector2(cos(index * PI / 3.0), sin(index * PI / 3.0)) * radius)
	return points

func _draw_tile_sides(top_hex: PackedVector2Array) -> void:
	var depth := Vector2(0, TILE_DEPTH)
	draw_colored_polygon(PackedVector2Array([top_hex[0], top_hex[1], top_hex[1] + depth, top_hex[0] + depth]), Color(0.16, 0.09, 0.045, 0.96))
	draw_colored_polygon(PackedVector2Array([top_hex[1], top_hex[2], top_hex[2] + depth, top_hex[1] + depth]), Color(0.23, 0.13, 0.065, 0.98))
	draw_polyline(PackedVector2Array([top_hex[0] + depth, top_hex[1] + depth, top_hex[2] + depth]), Color(0.055, 0.035, 0.02, 0.90), 1.5, true)

func _draw_ground_texture() -> void:
	var seed: int = absi(axial.x * 37 + axial.y * 73)
	var dust_color := Color(0.70, 0.86, 0.44, 0.28)
	var rock_color := Color(0.08, 0.11, 0.045, 0.48)
	for index in 5:
		var x := 18.0 + float((seed + index * 17) % 39)
		var y := 24.0 + float((seed * 3 + index * 11) % 38)
		var length := 4.0 + float((seed + index) % 5)
		draw_line(Vector2(x, y), Vector2(x + length, y - 1.5), dust_color, 1.0, true)
		if index % 2 == 0:
			draw_circle(Vector2(x + 4.0, y + 5.0), 1.4, rock_color)

func _set_drop_hover(value: bool) -> void:
	if drop_hovered == value:
		return
	drop_hovered = value
	queue_redraw()
