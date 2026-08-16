class_name CardInspectOverlay
extends Control

signal dismiss_requested

const PlaceholderArt := preload("res://scripts/cards/PlaceholderCardArt.gd")

var card: Resource
var art: TextureRect
var title_label: Label
var meta_label: Label
var rules_label: Label
var card_frame: PanelContainer

func _ready() -> void:
	get_parent().move_child.call_deferred(self, -1)
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	visible = false
	_build()

func _gui_input(event: InputEvent) -> void:
	if not visible:
		return
	var pressed_outside := false
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		pressed_outside = not card_frame.get_global_rect().has_point(event.global_position)
	elif event is InputEventScreenTouch and event.pressed:
		pressed_outside = not card_frame.get_global_rect().has_point(event.position)
	if pressed_outside:
		dismiss_requested.emit()
		accept_event()

func show_card(new_card: Resource) -> void:
	if new_card == null:
		return
	card = new_card
	title_label.text = card.title
	meta_label.text = "%s  |  Charge Value %d" % [card.get_window_speed().capitalize(), card.get_charge_cap()]
	rules_label.text = card.rules_text
	art.texture = card.get_artwork() if card.has_method("get_artwork") and card.get_artwork() != null else PlaceholderArt.EMPTY_SLOT
	visible = true

func hide_card() -> void:
	visible = false
	card = null

func _build() -> void:
	var veil := ColorRect.new()
	veil.color = Color(0.0, 0.0, 0.0, 0.62)
	veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(veil)

	card_frame = PanelContainer.new()
	card_frame.set_anchors_preset(Control.PRESET_CENTER)
	card_frame.position = Vector2(-144, -254)
	card_frame.size = Vector2(288, 508)
	card_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card_frame.add_theme_stylebox_override("panel", _frame_style())
	add_child(card_frame)

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 8)
	card_frame.add_child(content)

	title_label = Label.new()
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title_label.add_theme_font_size_override("font_size", 24)
	title_label.add_theme_color_override("font_color", Color(0.18, 0.14, 0.10))
	content.add_child(title_label)

	art = TextureRect.new()
	art.texture = PlaceholderArt.EMPTY_SLOT
	art.custom_minimum_size = Vector2(0, 272)
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(art)

	meta_label = Label.new()
	meta_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	meta_label.add_theme_font_size_override("font_size", 14)
	meta_label.add_theme_color_override("font_color", Color(0.30, 0.24, 0.17))
	content.add_child(meta_label)

	rules_label = Label.new()
	rules_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	rules_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rules_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	rules_label.add_theme_font_size_override("font_size", 17)
	rules_label.add_theme_color_override("font_color", Color(0.16, 0.13, 0.09))
	content.add_child(rules_label)

func _frame_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.96, 0.92, 0.76)
	style.border_color = Color(0.84, 0.58, 0.26)
	style.set_border_width_all(4)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 12
	style.content_margin_top = 12
	style.content_margin_right = 12
	style.content_margin_bottom = 12
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.5)
	style.shadow_size = 12
	return style
