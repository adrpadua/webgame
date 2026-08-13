extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	var hand = main.get_node("%HandView")
	var card = hand.get_child(0)
	var overlay = main.get_node("%CardInspectOverlay")

	card._begin_press(Vector2(10, 10))
	await create_timer(0.45).timeout
	_assert(overlay.visible, "Holding a card must show the inspection overlay.")
	_assert(overlay.title_label.text == card.card.title, "Inspection overlay must show the held card's title.")
	card._end_press()
	_assert(not overlay.visible, "Releasing a held card must dismiss the inspection overlay.")
	card._begin_press(Vector2(10, 10))
	await create_timer(0.45).timeout
	_assert(overlay.visible, "Holding a card again must show the inspection overlay.")
	var outside_preview := InputEventMouseButton.new()
	outside_preview.button_index = MOUSE_BUTTON_LEFT
	outside_preview.pressed = true
	outside_preview.position = Vector2(4, 4)
	outside_preview.global_position = outside_preview.position
	overlay._gui_input(outside_preview)
	_assert(not overlay.visible, "Tapping outside the card preview must dismiss the inspection overlay.")
	card._begin_press(Vector2(10, 10))
	await create_timer(0.45).timeout
	_assert(overlay.visible, "Holding a card a third time must show the inspection overlay.")
	var outside_release := InputEventMouseButton.new()
	outside_release.button_index = MOUSE_BUTTON_LEFT
	outside_release.pressed = false
	card._input(outside_release)
	_assert(not overlay.visible, "Releasing a held card anywhere must dismiss the inspection overlay.")
	print("CARD_INSPECTION_PROBE_OK")
	quit()

func _assert(condition: bool, message: String) -> void:
	assert(condition, message)
