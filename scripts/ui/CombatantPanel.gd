class_name CombatantPanel
extends PanelContainer

const DIRECTIONS := ["E", "NE", "NW", "W", "SW", "SE"]
const FacingBadgeScene := preload("res://scripts/ui/FacingBadge.gd")

var _title_label: Label
var _name_label: Label
var _health_label: Label
var _armor_label: Label
var _stats_label: Label
var _facing_badge: Node
var _facing_labels: Array[Label] = []

func _ready() -> void:
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	custom_minimum_size = Vector2(220, 62)
	var frame := StyleBoxFlat.new()
	frame.bg_color = Color(0.16, 0.15, 0.15, 0.94)
	frame.border_color = Color(0.34, 0.30, 0.24)
	frame.set_border_width_all(2)
	frame.corner_radius_top_left = 10
	frame.corner_radius_top_right = 10
	frame.corner_radius_bottom_left = 10
	frame.corner_radius_bottom_right = 10
	frame.shadow_color = Color(0.0, 0.0, 0.0, 0.35)
	frame.shadow_size = 6
	frame.content_margin_left = 8
	frame.content_margin_top = 4
	frame.content_margin_right = 8
	frame.content_margin_bottom = 4
	add_theme_stylebox_override("panel", frame)

	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 1)
	add_child(body)

	_title_label = Label.new()
	_title_label.add_theme_font_size_override("font_size", 10)
	_title_label.add_theme_color_override("font_color", Color(0.76, 0.72, 0.63))
	_title_label.visible = false
	body.add_child(_title_label)

	_name_label = Label.new()
	_name_label.add_theme_font_size_override("font_size", 12)
	body.add_child(_name_label)

	var resources_row := HBoxContainer.new()
	resources_row.add_theme_constant_override("separation", 6)
	body.add_child(resources_row)

	_health_label = Label.new()
	_health_label.custom_minimum_size = Vector2(72, 22)
	_health_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_health_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_health_label.add_theme_font_size_override("font_size", 11)
	resources_row.add_child(_health_label)

	_armor_label = Label.new()
	_armor_label.custom_minimum_size = Vector2(54, 22)
	_armor_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_armor_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_armor_label.add_theme_font_size_override("font_size", 11)
	resources_row.add_child(_armor_label)

	var middle := HBoxContainer.new()
	middle.add_theme_constant_override("separation", 6)
	body.add_child(middle)

	_facing_badge = FacingBadgeScene.new()
	middle.add_child(_facing_badge)

	_stats_label = Label.new()
	_stats_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_stats_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_stats_label.add_theme_font_size_override("font_size", 11)
	_stats_label.add_theme_color_override("font_color", Color(0.88, 0.86, 0.82))
	middle.add_child(_stats_label)

	var strip := HBoxContainer.new()
	strip.add_theme_constant_override("separation", 4)
	strip.visible = false
	body.add_child(strip)

	for dir_name in DIRECTIONS:
		var dir_label := Label.new()
		dir_label.text = dir_name
		dir_label.custom_minimum_size = Vector2(22, 18)
		dir_label.add_theme_font_size_override("font_size", 12)
		dir_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		dir_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		strip.add_child(dir_label)
		_facing_labels.append(dir_label)

func update_display(panel_title: String, combatant_name: String, health: int, max_health: int, armor: int, stats_text: String, facing_index: int, accent: Color) -> void:
	_title_label.text = panel_title
	_name_label.text = combatant_name
	_health_label.text = "HP %d/%d" % [health, max_health]
	_health_label.add_theme_color_override("font_color", Color(0.98, 0.95, 0.92))
	_health_label.add_theme_stylebox_override("normal", _make_chip_style(Color(0.18, 0.08, 0.08, 0.92), Color(0.88, 0.43, 0.36, 0.95)))
	_armor_label.visible = armor > 0
	if armor > 0:
		_armor_label.text = "AR %d" % armor
		_armor_label.add_theme_color_override("font_color", Color(0.94, 0.97, 1.0))
		_armor_label.add_theme_stylebox_override("normal", _make_chip_style(Color(0.09, 0.14, 0.18, 0.92), Color(0.55, 0.76, 0.94, 0.95)))
	_stats_label.text = stats_text
	_facing_badge.configure(facing_index, accent)
	_name_label.add_theme_color_override("font_color", accent)

	for i in range(_facing_labels.size()):
		var dir_label := _facing_labels[i]
		if i == facing_index:
			dir_label.text = "[%s]" % DIRECTIONS[i]
			dir_label.add_theme_color_override("font_color", accent)
		else:
			dir_label.text = DIRECTIONS[i]
			dir_label.add_theme_color_override("font_color", Color(0.75, 0.78, 0.82))

func _make_chip_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(1)
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	style.content_margin_left = 6
	style.content_margin_top = 2
	style.content_margin_right = 6
	style.content_margin_bottom = 2
	return style
