class_name HandView
extends HBoxContainer

const CardButtonScene := preload("res://scripts/ui/CardButton.gd")

signal card_selected(card)
signal card_inspection_started(card)
signal card_inspection_ended(card)

var player: Node

func bind(new_player: Node) -> void:
	player = new_player
	player.hand_changed.connect(refresh)
	refresh()

func refresh() -> void:
	for child in get_children():
		child.queue_free()
	if player == null:
		return
	for card in player.hand:
		var button := CardButtonScene.new()
		button.bind(card)
		button.size_flags_stretch_ratio = 1.0
		button.card_selected.connect(func(selected) -> void: card_selected.emit(selected))
		button.inspection_started.connect(func(inspected) -> void: card_inspection_started.emit(inspected))
		button.inspection_ended.connect(func(inspected) -> void: card_inspection_ended.emit(inspected))
		add_child(button)
