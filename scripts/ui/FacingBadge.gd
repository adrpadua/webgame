class_name FacingBadge
extends Control

const FacingDirections := preload("res://scripts/combat/Facing.gd")
const DIRECTIONS := ["E", "NE", "NW", "W", "SW", "SE"]

var accent: Color = Color(0.85, 0.85, 0.85):
	set(value):
		accent = value
		queue_redraw()

var facing_index: int = 0:
	set(value):
		facing_index = wrapi(value, 0, 6)
		queue_redraw()

var label_text: String = "E":
	set(value):
		label_text = value
		queue_redraw()

func _ready() -> void:
	custom_minimum_size = Vector2(38, 38)

func configure(new_facing: int, new_accent: Color) -> void:
	facing_index = new_facing
	accent = new_accent
	label_text = DIRECTIONS[facing_index]

func _draw() -> void:
	var center := size * 0.5
	var radius: float = min(size.x, size.y) * 0.32
	draw_circle(center, radius, Color(0.13, 0.14, 0.16))
	draw_arc(center, radius, 0.0, TAU, 48, accent, 3.0)

	var notch_tip: Vector2 = center + FacingDirections.vector_for(facing_index) * (radius + 12.0)
	var notch_left: Vector2 = center + FacingDirections.vector_for(facing_index - 1) * (radius - 2.0)
	var notch_right: Vector2 = center + FacingDirections.vector_for(facing_index + 1) * (radius - 2.0)
	draw_colored_polygon(PackedVector2Array([notch_tip, notch_left, notch_right]), accent)

	var font := ThemeDB.fallback_font
	if font == null:
		return
	var font_size := 11
	var text_size := font.get_string_size(label_text, HORIZONTAL_ALIGNMENT_CENTER, -1.0, font_size)
	var text_pos := center - Vector2(text_size.x * 0.5, -text_size.y * 0.25)
	draw_string(font, text_pos, label_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, font_size, accent)
