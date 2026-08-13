class_name PlayerBoard
extends VBoxContainer

signal board_slot_selected(index: int)

var player: Node

func bind(new_player: Node) -> void:
	player = new_player
	player.board_changed.connect(refresh)
	player.hand_changed.connect(refresh)
	refresh()

func refresh() -> void:
	for child in get_children():
		child.queue_free()
	if player == null:
		return
	for i in player.board_slots.size():
		var slot := Button.new()
		var card: Resource = player.board_slots[i]["card"]
		slot.text = "%s\n%s" % [player.board_slots[i]["label"], card.title if card != null else "empty"]
		slot.custom_minimum_size = Vector2(130, 64)
		slot.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		slot.add_theme_color_override("font_color", Color(0.93, 0.91, 0.86))
		slot.add_theme_stylebox_override("normal", _slot_style(card != null))
		slot.add_theme_stylebox_override("hover", _slot_style(card != null, true))
		slot.add_theme_stylebox_override("focus", _slot_style(card != null, false, true))
		slot.pressed.connect(func() -> void: board_slot_selected.emit(i))
		add_child(slot)

func _slot_style(filled: bool, hovered: bool = false, focused: bool = false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.18, 0.17, 0.16) if filled else Color(0.13, 0.13, 0.14)
	if hovered:
		style.bg_color = style.bg_color.lightened(0.06)
	style.border_color = Color(0.68, 0.56, 0.34) if filled else Color(0.32, 0.33, 0.36)
	if focused:
		style.border_color = Color(1.0, 0.92, 0.50)
	style.set_border_width_all(4 if focused else 2)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.28)
	style.shadow_size = 3
	return style
