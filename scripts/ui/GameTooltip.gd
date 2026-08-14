class_name GameTooltip
extends PanelContainer

const MAX_WIDTH := 300.0
const HORIZONTAL_PADDING := 14.0
const VERTICAL_PADDING := 10.0
const PANEL_ALLOWANCE := 12.0

var content_label: Label

func _init(value: String = "", max_width: float = MAX_WIDTH) -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	focus_mode = Control.FOCUS_NONE
	custom_minimum_size.x = max_width

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.03, 0.05, 0.06, 0.94)
	style.border_color = Color(0.44, 0.49, 0.54, 0.95)
	style.set_border_width_all(2)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.34)
	style.shadow_size = 4
	add_theme_stylebox_override("panel", style)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", HORIZONTAL_PADDING)
	margin.add_theme_constant_override("margin_top", VERTICAL_PADDING)
	margin.add_theme_constant_override("margin_right", HORIZONTAL_PADDING)
	margin.add_theme_constant_override("margin_bottom", VERTICAL_PADDING)
	add_child(margin)

	content_label = Label.new()
	content_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	content_label.custom_minimum_size = Vector2(maxf(max_width - HORIZONTAL_PADDING * 2.0 - PANEL_ALLOWANCE, 120.0), 0.0)
	content_label.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	content_label.add_theme_font_size_override("font_size", 13)
	content_label.add_theme_color_override("font_color", Color(0.96, 0.95, 0.91))
	content_label.text = value
	margin.add_child(content_label)
