class_name HandView
extends Control

const CardButtonScene := preload("res://scripts/ui/CardButton.gd")

signal card_selected(card)
signal card_inspection_started(card)
signal card_inspection_ended(card)
signal card_drag_started(card)
signal card_drag_ended(card)

var player: Node
var selected_card: Resource
var selected_button: Control

const CARD_SIZE := Vector2(112, 116)
const SELECTED_LIFT := 13.0
const FAN_STEP := 78.0

func bind(new_player: Node) -> void:
	player = new_player
	player.hand_changed.connect(refresh)
	refresh()

func refresh() -> void:
	for child in get_children():
		remove_child(child)
		child.queue_free()
	if player == null:
		return
	for card in player.hand:
		var button := CardButtonScene.new()
		button.bind(card)
		button.card_selected.connect(func(selected) -> void:
			var next_card: Resource = null if selected_button == button and selected_card == selected else selected
			selected_button = null if next_card == null else button
			selected_card = next_card
			_layout_cards(true)
			card_selected.emit(next_card)
		)
		button.inspection_started.connect(func(inspected) -> void: card_inspection_started.emit(inspected))
		button.inspection_ended.connect(func(inspected) -> void: card_inspection_ended.emit(inspected))
		button.card_drag_started.connect(func(dragged) -> void: card_drag_started.emit(dragged))
		button.card_drag_ended.connect(func(dragged) -> void: card_drag_ended.emit(dragged))
		add_child(button)
	call_deferred("_layout_cards")

func set_selected_card(card: Resource) -> void:
	selected_card = card
	if card == null:
		selected_button = null
	elif selected_button == null or selected_button.card != card:
		selected_button = _first_button_for_card(card)
	_layout_cards(true)

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout_cards()

func _layout_cards(animated: bool = false) -> void:
	var cards := get_children()
	if cards.is_empty():
		custom_minimum_size = Vector2(0, CARD_SIZE.y)
		return
	var span := CARD_SIZE.x + FAN_STEP * float(cards.size() - 1)
	custom_minimum_size = Vector2(span, CARD_SIZE.y + SELECTED_LIFT)
	var start_x := maxf((size.x - span) * 0.5, 0.0)
	var middle := float(cards.size() - 1) * 0.5
	for index in cards.size():
		var button: Control = cards[index]
		var distance := float(index) - middle
		var is_selected: bool = button == selected_button and selected_card != null
		var target_position := Vector2(
			start_x + float(index) * FAN_STEP,
			SELECTED_LIFT + absf(distance) * 2.0 - (SELECTED_LIFT if is_selected else 0.0)
		)
		button.z_index = 100 if is_selected else index
		button.set_selected(is_selected)
		button.modulate = Color.WHITE if selected_card == null or is_selected else Color(0.58, 0.60, 0.62, 0.76)
		button.pivot_offset = CARD_SIZE * 0.5
		var target_scale := Vector2(1.08, 1.08) if is_selected else Vector2.ONE
		var target_rotation := deg_to_rad(clampf(distance * 1.7, -4.0, 4.0))
		if animated and not _reduced_motion():
			var tween := create_tween().set_parallel(true)
			tween.tween_property(button, "position", target_position, 0.12).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			tween.tween_property(button, "scale", target_scale, 0.12).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			tween.tween_property(button, "rotation", target_rotation, 0.12).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		else:
			button.position = target_position
			button.scale = target_scale
			button.rotation = target_rotation

func _reduced_motion() -> bool:
	return bool(ProjectSettings.get_setting("accessibility/reduced_motion", false))

func _first_button_for_card(card: Resource) -> Control:
	for child: Control in get_children():
		if child.card == card:
			return child
	return null
