class_name ActionBarView
extends BoxContainer

signal slot_pressed(index: int)
signal card_dropped(slot_index: int, card: Resource)

const ActionBarSlotScene := preload("res://scripts/ui/ActionBarSlot.gd")

var player: Node
var selected_slot: int = -1
var compact: bool = false

func set_compact(value: bool) -> void:
	if compact == value:
		return
	compact = value
	vertical = not compact
	refresh()

func bind(new_player: Node) -> void:
	player = new_player
	player.action_bar_changed.connect(refresh)
	player.resources_changed.connect(refresh)
	refresh()

func set_selected_slot(index: int) -> void:
	selected_slot = index
	refresh()

func refresh() -> void:
	for child in get_children():
		child.queue_free()
	if player == null:
		return

	for i in range(player.action_bar.size()):
		var slot: Dictionary = player.action_bar[i].duplicate()
		var top_card: Resource = slot.get("top_card")
		slot["ready_action"] = top_card != null and not slot["charges"].is_empty() and top_card.get_window_speed() == player.current_window and top_card.can_pay(player)
		var button := ActionBarSlotScene.new()
		button.bind(i, slot, i == selected_slot, compact)
		button.slot_pressed.connect(func(index: int) -> void: slot_pressed.emit(index))
		button.card_dropped.connect(func(index: int, card: Resource) -> void: card_dropped.emit(index, card))
		add_child(button)
