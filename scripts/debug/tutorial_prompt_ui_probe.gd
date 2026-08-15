extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const VIEWPORTS: Array[Vector2] = [Vector2(390, 844), Vector2(488, 1056)]

func _initialize() -> void:
	for viewport_size in VIEWPORTS:
		await _assert_tutorial_presentation(viewport_size)
	print("TUTORIAL_PROMPT_UI_PROBE_OK viewports=%d" % VIEWPORTS.size())
	quit()

func _assert_tutorial_presentation(viewport_size: Vector2) -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(viewport_size)
	await process_frame
	await process_frame

	var prompt_pane: Panel = main.get_node("Root/MobileStatus/MobileTutorialPromptLane/MobileTutorialPromptPane")
	var prompt_label: Label = main.get_node("Root/MobileStatus/MobileTutorialPromptLane/MobileTutorialPromptPane/MobileTutorialPromptLabel")
	var dismiss_button: Button = main.get_node("Root/MobileStatus/MobileTutorialPromptLane/MobileTutorialPromptPane/MobileTutorialPromptDismissButton")
	var help_button: Button = main.get_node("Root/MobileStatus/MobileControlsRow/MobileHelpButton")
	var help_pane: Panel = main.get_node("Root/MobileStatus/MobileHelpPane")
	var help_label: Label = main.get_node("Root/MobileStatus/MobileHelpPane/MobileHelpLabel")
	var history_picker: OptionButton = main.get_node("Root/MobileStatus/MobileHelpPane/MobileTutorialHistoryPicker")
	var reopen_button: Button = main.get_node("Root/MobileStatus/MobileHelpPane/MobileTutorialReopenButton")
	var action_bar: Control = main.get_node("%ActionBarView")
	var hand_view: Control = main.get_node("%HandView")
	var safe_rect := Rect2(Vector2.ZERO, viewport_size)
	var history_before: int = main.engine.history.size()

	assert(prompt_pane.visible, "The projected first tutorial tip must render in portrait.")
	assert(prompt_label.text.begins_with("Boss Timeline\n"), "The portrait card must consume the engine-selected Boss Timeline prompt.")
	assert(prompt_label.tooltip_text.contains("The Boss acts in two visible moments"), "The prompt must expose its full accessible text.")
	assert(dismiss_button.visible and dismiss_button.tooltip_text.contains("Dismiss"), "The tutorial card must have a visible non-blocking dismiss control.")
	assert(safe_rect.encloses(prompt_pane.get_global_rect()), "The tutorial card must stay inside the portrait viewport.")
	assert(safe_rect.encloses(action_bar.get_global_rect()), "Tutorial presentation must preserve the action bar in portrait.")
	assert(hand_view.get_global_rect().position.y < viewport_size.y, "Tutorial presentation must preserve a reachable hand area.")
	assert(main.engine.history.size() == history_before, "Tutorial presentation must not apply a gameplay action.")

	dismiss_button.pressed.emit()
	await process_frame
	assert(main.engine.history.size() == history_before, "Dismissing a tutorial tip must not mutate rules history.")
	assert(main.tutorial_prompt_history.size() >= 1, "A dismissed prompt must remain in caller-owned tutorial history.")

	help_button.pressed.emit()
	await process_frame
	assert(help_pane.visible, "Help must open the text-first tutorial history.")
	assert(help_label.text.contains("Tutorial history"), "Help must identify the scan-friendly tutorial history.")
	assert(history_picker.visible and history_picker.item_count >= 1, "Shown tutorial guidance must be selectable for review.")
	assert(reopen_button.visible and reopen_button.tooltip_text.contains("Review"), "Help must offer a reopening action for the selected tutorial card.")
	assert(safe_rect.encloses(history_picker.get_global_rect()), "The tutorial-history selector must remain inside the portrait viewport.")
	assert(safe_rect.encloses(reopen_button.get_global_rect()) and reopen_button.get_global_rect().size.y >= 44.0, "The Review control must remain reachable inside the portrait viewport.")

	history_picker.select(0)
	reopen_button.pressed.emit()
	await process_frame
	assert(not help_pane.visible, "Reviewing a history item must return to its contextual-card surface.")
	assert(prompt_pane.visible and prompt_label.text.begins_with("Boss Timeline\n"), "The selected history item must reopen as the original contextual card.")
	assert(dismiss_button.text == "Close", "A reopened history card must close without reinterpreting it as gameplay progress.")
	assert(main.engine.history.size() == history_before, "Reopening tutorial history must not mutate rules history.")

	root.remove_child(main)
	main.queue_free()
	await process_frame
