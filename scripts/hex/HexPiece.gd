class_name HexPiece
extends Control

const FacingDirections := preload("res://scripts/combat/Facing.gd")
const DuelystBossCrest := preload("res://assets/art/open-duelyst/boss_neutral_crest_hex@2x.png")

signal facing_changed(piece)
signal piece_drag_started(piece)
signal piece_drag_ended(piece)

@export var piece_id: StringName
@export var piece_owner: StringName = &"enemy"
@export var display_name: String = "Unit"
@export var health: int = 1
@export var max_health: int = 1
@export var armor: int = 0
@export var attack: int = 1
@export_enum("E", "NE", "NW", "W", "SW", "SE") var facing: int = FacingDirections.Direction.SOUTH_WEST:
	set(value):
		facing = FacingDirections.normalize_hex_edge_facing(value, "Hex piece facing")
		facing_changed.emit(self)
		queue_redraw()

var pointer_active: bool = false
var press_position: Vector2 = Vector2.ZERO
var drag_started: bool = false

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	custom_minimum_size = Vector2(54, 54)
	z_as_relative = false
	z_index = 4000

func setup(
	label: String,
	new_owner: StringName,
	hp: int,
	new_facing: int = FacingDirections.Direction.SOUTH_WEST,
	new_display_name: String = ""
) -> void:
	piece_id = label
	piece_owner = new_owner
	display_name = new_display_name if new_display_name != "" else label
	health = hp
	max_health = hp
	facing = new_facing
	queue_redraw()

func rotate_facing(steps: int) -> void:
	facing = facing + steps

func get_facing_name() -> String:
	return FacingDirections.name_for(facing)

func set_display_name(value: String) -> void:
	display_name = value
	queue_redraw()

func _get_drag_data(_at_position: Vector2) -> Variant:
	if piece_owner != &"player":
		return null
	var preview := _build_drag_preview()
	set_drag_preview(preview)
	return _build_drag_payload()

func _gui_input(event: InputEvent) -> void:
	if piece_owner != &"player":
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			pointer_active = true
			press_position = event.position
			drag_started = false
		else:
			pointer_active = false
			drag_started = false
	elif event is InputEventScreenTouch:
		if event.pressed:
			pointer_active = true
			press_position = event.position
			drag_started = false
		else:
			pointer_active = false
			drag_started = false
	elif event is InputEventMouseMotion and pointer_active:
		if not drag_started and press_position.distance_to(event.position) > 10.0:
			_begin_touch_drag()
	elif event is InputEventScreenDrag and pointer_active:
		if not drag_started and press_position.distance_to(event.position) > 10.0:
			_begin_touch_drag()

func _begin_touch_drag() -> void:
	if piece_owner != &"player":
		return
	drag_started = true
	piece_drag_started.emit(self)
	force_drag(_build_drag_payload(), _build_drag_preview())

func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END and drag_started:
		drag_started = false
		piece_drag_ended.emit(self)

func _build_drag_payload() -> Dictionary:
	return {
		"kind": "board_piece",
		"piece": self,
		"owner": piece_owner,
	}

func _build_drag_preview() -> Control:
	var preview := Button.new()
	preview.custom_minimum_size = custom_minimum_size
	preview.text = display_name.left(7)
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	preview.add_theme_color_override("font_color", Color.WHITE)
	preview.add_theme_font_size_override("font_size", 10)
	var style := StyleBoxFlat.new()
	style.bg_color = _get_fill_color()
	style.border_color = _get_ring_color()
	style.set_border_width_all(2)
	style.corner_radius_top_left = 24
	style.corner_radius_top_right = 24
	style.corner_radius_bottom_left = 24
	style.corner_radius_bottom_right = 24
	preview.add_theme_stylebox_override("normal", style)
	return preview

func _draw() -> void:
	var center := size * 0.5
	var radius: float = min(size.x, size.y) * 0.33
	var fill := _get_fill_color()
	var ring := _get_ring_color()

	draw_circle(center + Vector2(0, 3), radius + 2.0, Color(0.0, 0.0, 0.0, 0.28))
	draw_circle(center, radius, fill)
	draw_circle(center + Vector2(-4, -5), radius * 0.62, Color(1.0, 1.0, 1.0, 0.05))
	draw_arc(center, radius, 0.0, TAU, 48, ring, 3.0)
	if piece_owner == &"boss":
		draw_texture_rect(DuelystBossCrest, Rect2(center - Vector2(23, 23), Vector2(46, 46)), false, Color(1.0, 1.0, 1.0, 0.92))
	if piece_owner != &"player":
		_draw_facing_marker(center, radius, ring)

	_draw_health_bar()

func _draw_facing_marker(center: Vector2, radius: float, ring: Color) -> void:
	var facing_vector := FacingDirections.vector_for(facing)
	var left_vector := FacingDirections.vector_for(facing - 1)
	var right_vector := FacingDirections.vector_for(facing + 1)
	var tip := center + facing_vector * (radius + 8.0)
	var left := center + left_vector * (radius - 2.0)
	var right := center + right_vector * (radius - 2.0)
	draw_colored_polygon(PackedVector2Array([tip, left, right]), ring)

func _draw_health_bar() -> void:
	var bar_width: float = maxf(34.0, size.x - 6.0)
	var bar_rect := Rect2(Vector2((size.x - bar_width) * 0.5, 1.5), Vector2(bar_width, 7.0))
	var fill_ratio: float = clampf(float(health) / max(1, max_health), 0.0, 1.0)
	var fill_rect := Rect2(bar_rect.position + Vector2(1.5, 1.5), Vector2((bar_rect.size.x - 3.0) * fill_ratio, bar_rect.size.y - 3.0))
	var fill_color := Color(0.24, 0.72, 0.85) if piece_owner == &"player" else Color(0.90, 0.34, 0.24)
	if piece_owner == &"enemy":
		fill_color = Color(0.78, 0.66, 0.35)

	draw_style_box(_make_bar_style(Color(0.025, 0.02, 0.02, 0.90), Color(0.84, 0.79, 0.65, 0.76)), bar_rect)
	if fill_rect.size.x > 0.0:
		draw_style_box(_make_bar_style(fill_color, fill_color.lightened(0.2)), fill_rect)
	if armor > 0:
		var armor_ratio := minf(float(armor) / maxf(float(max_health), 1.0), 0.45)
		var armor_width := minf((bar_rect.size.x - 2.0) * armor_ratio, (bar_rect.size.x - 2.0) * 0.45)
		var armor_rect := Rect2(Vector2(bar_rect.end.x - armor_width - 1.0, bar_rect.position.y + 1.0), Vector2(armor_width, bar_rect.size.y - 2.0))
		draw_style_box(_make_bar_style(Color(0.18, 0.30, 0.40, 0.96), Color(0.60, 0.82, 0.98, 0.98)), armor_rect)

	var font := ThemeDB.fallback_font
	if font == null:
		return
	var health_text := "%d/%d" % [health, max_health]
	var health_size := 7
	var health_width := font.get_string_size(health_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, health_size).x
	draw_string(font, Vector2(size.x * 0.5 - health_width * 0.5, 7.8), health_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, health_size, Color(1.0, 0.97, 0.90))
	if armor > 0:
		var armor_text := "AR %d" % armor
		var armor_size := 7
		var armor_width_text := font.get_string_size(armor_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, armor_size).x
		draw_string(font, Vector2(size.x * 0.5 - armor_width_text * 0.5, 16.0), armor_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, armor_size, Color(0.80, 0.93, 1.0))

func _make_bar_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(1)
	style.corner_radius_top_left = 2
	style.corner_radius_top_right = 2
	style.corner_radius_bottom_left = 2
	style.corner_radius_bottom_right = 2
	return style

func _get_fill_color() -> Color:
	match piece_owner:
		&"player":
			return Color(0.11, 0.28, 0.34)
		&"boss":
			return Color(0.33, 0.13, 0.11)
		_:
			return Color(0.23, 0.20, 0.15)

func _get_ring_color() -> Color:
	match piece_owner:
		&"player":
			return Color(0.24, 0.72, 0.85)
		&"boss":
			return Color(0.92, 0.38, 0.31)
		_:
			return Color(0.82, 0.74, 0.58)
