extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const SUPPORTED_VIEWPORTS: Array[Vector2] = [Vector2(390, 844), Vector2(488, 1056)]

func _initialize() -> void:
	for viewport_size in SUPPORTED_VIEWPORTS:
		await _assert_first_loadout_view(viewport_size)
	print("FIRST_LOADOUT_UI_PROBE_OK viewports=%d" % SUPPORTED_VIEWPORTS.size())
	quit()

func _assert_first_loadout_view(viewport_size: Vector2) -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(viewport_size)
	await process_frame
	await process_frame

	var mobile_prompt: Label = main.get_node("Root/MobileStatus/MobilePromptLane/MobileEndPhasePrompt")
	var mobile_continue_button: Button = main.get_node("Root/MobileStatus/MobileControlsRow/MobileContinueButton")
	var mobile_help_button: Button = main.get_node("Root/MobileStatus/MobileControlsRow/MobileHelpButton")
	var mobile_help_pane: Panel = main.get_node("Root/MobileStatus/MobileHelpPane")
	var mobile_help_label: Label = main.get_node("Root/MobileStatus/MobileHelpPane/MobileHelpLabel")
	var action_bar: Control = main.get_node("%ActionBarView")
	var first_slot: Button = action_bar.get_child(0)
	var hand_view: Control = main.get_node("%HandView")
	var first_card: Control = hand_view.get_child(0)
	var safe_rect := Rect2(Vector2.ZERO, viewport_size)
	var telegraph_tiles: Array = []

	assert(mobile_prompt.text == "Put a card in a Slot, then tap Play.", "First Loadout prompt must explain the opening action in player language.")
	assert(mobile_continue_button.visible and mobile_continue_button.text == "Play", "Play must remain the primary first-Loadout control.")
	assert(mobile_help_button.visible and mobile_help_button.text == "?", "Help must remain available as the tertiary control.")
	assert(String(first_slot.tooltip_text).contains("Drop a hand card here"), "Empty action-bar Slots must expose a card-destination affordance.")
	assert(safe_rect.encloses(action_bar.get_global_rect()), "The compact action bar must remain fully visible in first Loadout view.")
	assert(first_card.get_global_rect().position.y < viewport_size.y, "At least one hand card must be visible in first Loadout view.")
	assert(first_card.get_global_rect().end.y <= viewport_size.y, "The first visible hand card must fit inside the portrait viewport.")

	mobile_help_button.pressed.emit()
	await process_frame
	assert(mobile_help_pane.visible, "Help should open from the tertiary control.")
	assert(mobile_help_label.text.contains("Put a hand card into a Slot.") and mobile_help_label.text.contains("Then tap Play."), "Help copy must restate the first Loadout action.")
	assert(mobile_help_label.text.contains("lifted card"), "Help copy must explain the selected-card state without relying on color.")
	assert(mobile_help_label.text.contains("LOAD means the lifted card can go there."), "Help copy must explain legal Slot cues in plain language.")

	first_card._pressed()
	await process_frame
	assert(bool(first_card.selected), "Tapping a hand card must visually select that specific card instance.")

	for tile in main.get_node("%HexGrid").tiles.values():
		if tile.telegraph_id != &"":
			telegraph_tiles.append(tile)
	assert(not telegraph_tiles.is_empty(), "The first encounter view must contain at least one enemy danger tile.")
	assert(String(telegraph_tiles[0].tooltip_text).contains("Danger:"), "Enemy danger tiles must expose explicit danger copy, not color alone.")

	root.remove_child(main)
	main.queue_free()
	await process_frame
