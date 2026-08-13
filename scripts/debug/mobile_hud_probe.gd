extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const HELP_HIDDEN_SCREENSHOT_PATH := "res://tmp/mobile-help-hidden.png"
const HELP_OPEN_SCREENSHOT_PATH := "res://tmp/mobile-help-open.png"

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(Vector2(390, 844))
	await process_frame
	await process_frame

	var root_control: Control = main.get_node("Root")
	var main_area: BoxContainer = main.get_node("Root/MainArea")
	var hex_grid: Control = main.get_node("%HexGrid")
	var action_bar: Control = main.get_node("%ActionBarView")
	var mobile_status: Control = main.get_node("%MobileStatus")
	var mobile_prompt: Control = main.get_node("%MobileEndPhasePrompt")
	var mobile_turn_tracker: Control = main.get_node("%MobileTurnTracker")
	var mobile_hand_bar: Control = main.get_node("%MobileTempoBar")
	var mobile_controls_row: Control = main.get_node("Root/MobileStatus/MobileControlsRow")
	var mobile_continue_button: Button = main.get_node("Root/MobileStatus/MobileControlsRow/MobileContinueButton")
	var mobile_help_button: Button = main.get_node("Root/MobileStatus/MobileControlsRow/MobileHelpButton")
	var mobile_help_pane: Control = main.get_node("Root/MobileStatus/MobileHelpPane")
	var mobile_help_label: Label = main.get_node("Root/MobileStatus/MobileHelpPane/MobileHelpLabel")
	var hand_scroll: ScrollContainer = main.get_node("Root/HandScroll")
	var top_bar: Control = main.get_node("Root/TopBar")
	var right_panel: Control = main.get_node("Root/MainArea/RightPanelScroll")

	print("MOBILE root=%s main_area=%s board=%s action_bar=%s" % [root_control.size, main_area.size, hex_grid.size, action_bar.size])
	assert(main.size == Vector2(390, 844), "Mobile canvas must match the portrait viewport.")
	assert(root_control.position.y >= 0.0 and root_control.position.y + root_control.size.y <= 844.0, "Mobile root must fit inside the portrait viewport.")
	assert(main_area.vertical, "Mobile HUD must stack the board and action bar vertically.")
	assert(mobile_status.visible, "Mobile status must be visible.")
	assert(mobile_turn_tracker.visible, "Mobile turn tracker must be visible below the hand.")
	assert(not mobile_hand_bar.visible, "Mobile Hand/Discard status must not duplicate above the action bar.")
	assert(mobile_turn_tracker.text.contains("▣") and mobile_turn_tracker.text.contains("⌫"), "Mobile turn tracker must include icon-led hand and discard counts.")
	assert(mobile_prompt.visible and not mobile_prompt.text.contains("Guide:"), "The normal mobile prompt should be short, not the full guide.")
	assert(mobile_help_button.visible, "Mobile help should expose a button for the full guide.")
	assert(not mobile_help_pane.visible, "The full guide pane should start hidden.")
	assert(mobile_continue_button.visible, "Continue should be available during Loadout.")
	assert(mobile_controls_row.get_global_rect().encloses(mobile_continue_button.get_global_rect()), "Continue must remain inside the dedicated controls row.")
	assert(mobile_controls_row.get_global_rect().encloses(mobile_help_button.get_global_rect()), "Help must remain inside the dedicated controls row.")
	print("MOBILE_CONTROLS row=%s continue=%s help=%s" % [mobile_controls_row.get_global_rect(), mobile_continue_button.get_global_rect(), mobile_help_button.get_global_rect()])
	assert(not mobile_continue_button.get_global_rect().intersects(mobile_help_button.get_global_rect()), "Continue and Help must not overlap.")
	assert(Rect2(Vector2.ZERO, main.size).encloses(mobile_continue_button.get_global_rect()), "Continue must remain inside the physical viewport.")
	assert(Rect2(Vector2.ZERO, main.size).encloses(mobile_help_button.get_global_rect()), "Help must remain inside the physical viewport.")
	assert(is_equal_approx(mobile_continue_button.get_global_rect().get_center().x, main.size.x * 0.5), "Continue must be centered in the physical viewport.")
	assert(is_equal_approx(mobile_help_button.get_global_rect().end.x, main.size.x - 12.0), "Help must align to the physical viewport's right edge.")
	assert(mobile_prompt.get_global_rect().end.y <= mobile_controls_row.get_global_rect().position.y, "Controls must sit below the prompt header.")
	await _save_screenshot(HELP_HIDDEN_SCREENSHOT_PATH)
	mobile_help_button.pressed.emit()
	await process_frame
	assert(mobile_help_pane.visible and mobile_help_label.text.contains("Guide:"), "The help button should toggle the full guide pane.")
	assert(mobile_help_label.size.x > 0.0 and mobile_help_label.size.y > 0.0, "The open help pane must lay out visible guide text.")
	assert(Rect2(Vector2.ZERO, main.size).encloses(mobile_help_label.get_global_rect()), "Guide text must remain inside the physical viewport.")
	assert(mobile_help_pane.get_global_rect().end.y <= mobile_controls_row.get_global_rect().position.y, "Controls must sit below the open help pane.")
	assert(not mobile_help_pane.get_global_rect().intersects(mobile_continue_button.get_global_rect()), "The open help pane must not overlap Continue.")
	await _save_screenshot(HELP_OPEN_SCREENSHOT_PATH)
	assert(main.get_node_or_null("Root/MobileCommands") == null, "Mobile commands must be replaced by direct interactions.")
	assert(not top_bar.visible and not right_panel.visible, "Desktop-only panels must not consume mobile space.")
	assert(hex_grid.get_index() < action_bar.get_parent().get_index() or hex_grid.position.y <= action_bar.global_position.y, "Board must appear before the action bar in mobile reading order.")
	assert(main_area.global_position.y < hand_scroll.global_position.y, "The board must appear above the hand in portrait layout.")
	assert(hand_scroll.global_position.y < mobile_turn_tracker.global_position.y, "Turn tracker must sit below the hand.")
	assert(hand_scroll.global_position.y + hand_scroll.size.y <= root_control.global_position.y + root_control.size.y, "The hand must remain in the reachable bottom zone.")
	assert(main.get_node_or_null("Root/CombatLogScroll") == null, "Combat log must not be part of the player HUD.")
	print("MOBILE_HUD_PROBE_OK")
	quit()

func _save_screenshot(screenshot_path: String) -> void:
	if DisplayServer.get_name() == "headless":
		print("MOBILE_HUD_SCREENSHOT_UNAVAILABLE renderer=headless")
		return
	var path := ProjectSettings.globalize_path(screenshot_path)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	await process_frame
	var image: Image = root.get_viewport().get_texture().get_image()
	if image != null:
		var error := image.save_png(path)
		assert(error == OK, "Mobile HUD screenshot could not be saved: %s." % error)
