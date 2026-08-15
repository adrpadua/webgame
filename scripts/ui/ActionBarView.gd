class_name ActionBarView
extends BoxContainer

signal slot_pressed(index: int)
signal card_dropped(slot_index: int, card: Resource)

const ActionBarSlotScene := preload("res://scripts/ui/ActionBarSlot.gd")

var player: Node
var selected_slot: int = -1
var compact: bool = false
var context_card: Resource

func set_compact(value: bool) -> void:
	if compact == value:
		return
	compact = value
	vertical = not compact
	alignment = BoxContainer.ALIGNMENT_CENTER if compact else BoxContainer.ALIGNMENT_BEGIN
	add_theme_constant_override("separation", 6 if compact else 8)
	refresh()

func bind(new_player: Node) -> void:
	player = new_player
	player.action_bar_changed.connect(refresh)
	player.resources_changed.connect(refresh)
	refresh()

func set_selected_slot(index: int) -> void:
	selected_slot = index
	refresh()

func set_card_context(card: Resource) -> void:
	if context_card == card:
		return
	context_card = card
	refresh()

func refresh() -> void:
	for child in get_children():
		remove_child(child)
		child.queue_free()
	if player == null:
		return

	var transitions: Dictionary = player.take_slot_transitions()
	for i in range(player.action_bar.size()):
		var slot: Dictionary = player.action_bar[i].duplicate()
		slot["ready_action"] = player.has_legal_fire(i)
		slot["project_intent"] = player.project_intent(i, context_card) if context_card != null else &""
		var button := ActionBarSlotScene.new()
		button.bind(i, slot, i == selected_slot, compact, player.current_window, context_card, transitions.get(i, &""))
		button.slot_pressed.connect(func(index: int) -> void: slot_pressed.emit(index))
		button.card_dropped.connect(func(index: int, card: Resource) -> void: card_dropped.emit(index, card))
		add_child(button)
