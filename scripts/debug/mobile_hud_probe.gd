extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const HELP_HIDDEN_SCREENSHOT_PATH := "res://tmp/mobile-help-hidden.png"
const HELP_OPEN_SCREENSHOT_PATH := "res://tmp/mobile-help-open.png"
const MOBILE_SAFE_EDGE_PADDING := 12.0
const MOBILE_ACTION_CONTROL_PADDING := 8.0
const SUPPORTED_VIEWPORTS: Array[Vector2] = [Vector2(390, 844), Vector2(488, 1056)]

func _initialize() -> void:
	for viewport_size in SUPPORTED_VIEWPORTS:
		await _assert_mobile_viewport(viewport_size)
	print("MOBILE_HUD_PROBE_OK")
	quit()

func _assert_mobile_viewport(viewport_size: Vector2) -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(viewport_size)
	await process_frame
	await process_frame

	var root_control: Control = main.get_node("Root")
	var main_area: BoxContainer = main.get_node("Root/MainArea")
	var hex_grid: Control = main.get_node("%HexGrid")
	var action_bar: Control = main.get_node("%ActionBarView")
	var mobile_status: Control = main.get_node("%MobileStatus")
	var mobile_prompt: Control = main.get_node("Root/MobileStatus/MobilePromptLane/MobileEndPhasePrompt")
	var mobile_turn_tracker: Control = main.get_node("%MobileTurnTracker")
	var mobile_hand_bar: Control = main.get_node("%MobileTempoBar")
	var mobile_controls_row: Control = main.get_node("Root/MobileStatus/MobileControlsRow")
	var mobile_continue_button: Button = main.get_node("Root/MobileStatus/MobileControlsRow/MobileContinueButton")
	var mobile_help_button: Button = main.get_node("Root/MobileStatus/MobileControlsRow/MobileHelpButton")
	var mobile_help_pane: Control = main.get_node("Root/MobileStatus/MobileHelpPane")
	var mobile_help_label: Label = main.get_node("Root/MobileStatus/MobileHelpPane/MobileHelpLabel")
	var mobile_status_effect_pane: Control = main.get_node("Root/MobileStatus/MobileStatusEffectPane")
	var mobile_status_effect_label: Label = main.get_node("Root/MobileStatus/MobileStatusEffectPane/MobileStatusEffectLabel")
	var hand_scroll: ScrollContainer = main.get_node("Root/HandScroll")
	var top_bar: Control = main.get_node("Root/TopBar")
	var right_panel: Control = main.get_node("Root/MainArea/RightPanelScroll")
	var safe_rect := Rect2(Vector2(MOBILE_SAFE_EDGE_PADDING, 0.0), Vector2(viewport_size.x - MOBILE_SAFE_EDGE_PADDING * 2.0, viewport_size.y))

	print("MOBILE viewport=%s root=%s main_area=%s board=%s action_bar=%s" % [viewport_size, root_control.size, main_area.size, hex_grid.size, action_bar.size])
	assert(main.size == viewport_size, "Mobile canvas must match the portrait viewport.")
	assert(root_control.position.y >= 0.0 and root_control.position.y + root_control.size.y <= viewport_size.y, "Mobile root must fit inside the portrait viewport.")
	assert(main_area.vertical, "Mobile HUD must stack the board and action bar vertically.")
	assert(mobile_status.visible, "Mobile status must be visible.")
	assert(mobile_turn_tracker.visible, "Mobile turn tracker must be visible below the hand.")
	assert(not mobile_hand_bar.visible, "Mobile Hand/Discard status must not duplicate above the action bar.")
	assert(mobile_turn_tracker.text.contains("▣") and mobile_turn_tracker.text.contains("⌫"), "Mobile turn tracker must include icon-led hand and discard counts.")
	assert(mobile_prompt.visible and not mobile_prompt.text.contains("Guide:"), "The normal mobile prompt should be short, not the full guide.")
	print("MOBILE_PROMPT viewport=%s rect=%s text='%s'" % [viewport_size, mobile_prompt.get_global_rect(), mobile_prompt.text])
	_assert_rect_inside_safe_bounds(mobile_prompt.get_global_rect(), safe_rect, "Prompt")
	_assert_label_text_fits(mobile_prompt, "Prompt")
	assert(mobile_help_button.visible, "Mobile help should expose a button for the full guide.")
	assert(not mobile_help_pane.visible, "The full guide pane should start hidden.")
	assert(mobile_continue_button.visible, "Play should be available during Loadout.")
	assert(mobile_continue_button.text == "Play", "The advance control should be labeled Play on mobile.")
	assert(mobile_controls_row.get_global_rect().encloses(mobile_continue_button.get_global_rect()), "Play must remain inside the dedicated controls row.")
	assert(mobile_controls_row.get_global_rect().encloses(mobile_help_button.get_global_rect()), "Help must remain inside the dedicated controls row.")
	print("MOBILE_CONTROLS viewport=%s row=%s continue=%s help=%s" % [viewport_size, mobile_controls_row.get_global_rect(), mobile_continue_button.get_global_rect(), mobile_help_button.get_global_rect()])
	assert(not mobile_continue_button.get_global_rect().intersects(mobile_help_button.get_global_rect()), "Play and Help must not overlap.")
	_assert_rect_inside_safe_bounds(mobile_continue_button.get_global_rect(), safe_rect, "Play")
	_assert_rect_inside_safe_bounds(mobile_help_button.get_global_rect(), safe_rect, "Help")
	_assert_button_text_fits(mobile_continue_button, "Play")
	_assert_button_text_fits(mobile_help_button, "Help")
	assert(is_equal_approx(mobile_continue_button.get_global_rect().end.x, action_bar.get_global_rect().end.x - MOBILE_ACTION_CONTROL_PADDING), "Play must align to the right edge of the action bar.")
	assert(mobile_help_button.get_global_rect().end.x <= viewport_size.x - MOBILE_SAFE_EDGE_PADDING, "Help must honor the right safe padding.")
	assert(mobile_prompt.get_global_rect().end.y <= mobile_controls_row.get_global_rect().position.y, "Controls must sit below the prompt header.")
	assert(mobile_status_effect_pane == null or not mobile_status_effect_pane.visible or Rect2(Vector2.ZERO, viewport_size).encloses(mobile_status_effect_label.get_global_rect()), "Visible status-effect text must remain inside the physical viewport.")
	await _save_screenshot(HELP_HIDDEN_SCREENSHOT_PATH)
	mobile_help_button.pressed.emit()
	await process_frame
	assert(mobile_help_pane.visible and mobile_help_label.text.contains("Guide:"), "The help button should toggle the full guide pane.")
	assert(mobile_help_label.size.x > 0.0 and mobile_help_label.size.y > 0.0, "The open help pane must lay out visible guide text.")
	assert(Rect2(Vector2.ZERO, viewport_size).encloses(mobile_help_label.get_global_rect()), "Guide text must remain inside the physical viewport.")
	assert(mobile_help_pane.get_global_rect().end.y <= mobile_controls_row.get_global_rect().position.y, "Controls must sit below the open help pane.")
	assert(not mobile_help_pane.get_global_rect().intersects(mobile_continue_button.get_global_rect()), "The open help pane must not overlap Play.")
	await _save_screenshot(HELP_OPEN_SCREENSHOT_PATH)
	assert(main.get_node_or_null("Root/MobileCommands") == null, "Mobile commands must be replaced by direct interactions.")
	assert(not top_bar.visible and not right_panel.visible, "Desktop-only panels must not consume mobile space.")
	assert(hex_grid.get_index() < action_bar.get_parent().get_index() or hex_grid.position.y <= action_bar.global_position.y, "Board must appear before the action bar in mobile reading order.")
	assert(main_area.global_position.y < hand_scroll.global_position.y, "The board must appear above the hand in portrait layout.")
	assert(hand_scroll.global_position.y < mobile_turn_tracker.global_position.y, "Turn tracker must sit below the hand.")
	assert(hand_scroll.global_position.y + hand_scroll.size.y <= root_control.global_position.y + root_control.size.y, "The hand must remain in the reachable bottom zone.")
	assert(main.get_node_or_null("Root/CombatLogScroll") == null, "Combat log must not be part of the player HUD.")
	root.remove_child(main)
	main.queue_free()
	await process_frame

func _assert_rect_inside_safe_bounds(rect: Rect2, safe_rect: Rect2, label: String) -> void:
	assert(rect.position.x >= safe_rect.position.x, "%s must stay inside the left safe padding." % label)
	assert(rect.end.x <= safe_rect.end.x, "%s must stay inside the right safe padding." % label)
	assert(rect.position.y >= safe_rect.position.y, "%s must stay inside the top safe padding." % label)
	assert(rect.end.y <= safe_rect.end.y, "%s must stay inside the bottom safe padding." % label)

func _assert_button_text_fits(button: Button, label: String) -> void:
	var font: Font = button.get_theme_font("font")
	if font == null:
		font = button.get_theme_default_font()
	var font_size: int = button.get_theme_font_size("font_size")
	if font_size <= 0:
		font_size = button.get_theme_default_font_size()
	var text_size := font.get_string_size(button.text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size)
	var available_width: float = button.get_global_rect().size.x - 16.0
	var available_height: float = button.get_global_rect().size.y - 10.0
	assert(text_size.x <= available_width, "%s label must fit within its button without clipping." % label)
	assert(text_size.y <= available_height, "%s label must fit within its button height without clipping." % label)

func _assert_label_text_fits(label_node: Label, label: String) -> void:
	var font: Font = label_node.get_theme_font("font")
	if font == null:
		font = label_node.get_theme_default_font()
	var font_size: int = label_node.get_theme_font_size("font_size")
	if font_size <= 0:
		font_size = label_node.get_theme_default_font_size()
	var available_width: float = label_node.get_global_rect().size.x
	var rendered_lines: PackedStringArray = label_node.text.split("\n")
	for rendered_line in rendered_lines:
		var line_width: float = font.get_string_size(rendered_line, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
		assert(line_width <= available_width, "%s text must fit within its readable width without clipping." % label)

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
