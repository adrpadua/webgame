extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const SCREENSHOT_PATH := "res://tmp/mobile-ui-playtest.png"
const ACTION_PROMPT_SCREENSHOT_PATH := "res://tmp/mobile-action-prompt.png"
const CONTINUE_PROMPT_SCREENSHOT_PATH := "res://tmp/mobile-continue-prompt.png"

var failures: Array[String] = []

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(2)
	main._apply_viewport_size(Vector2(390, 844))
	await _wait_frames(3)

	var player = main.get_node("PlayerState")
	var boss = main.get_node("BossState")
	var turn_manager = main.get_node("TurnManager")
	var hex_grid = main.get_node("%HexGrid")
	var action_bar: Control = main.get_node("%ActionBarView")
	var mobile_status: Control = main.get_node("%MobileStatus")
	var mobile_prompt: Control = main.get_node("%MobileEndPhasePrompt")
	var mobile_tempo_label: Label = main.get_node("%MobileTempoLabel")
	var mobile_tempo_bar: Label = main.get_node("%MobileTempoBar")
	var mobile_tempo_spend_label: Label = main.get_node("%MobileTempoSpendLabel")
	var mobile_turn_tracker: Label = main.get_node("%MobileTurnTracker")
	var mobile_continue_button: Button = main.get_node("MobileContinueButton")
	var board_title: Control = main.get_node("Root/MainArea/LeftPanel/BoardTitle")

	_assert(mobile_status.visible, "Mobile status should be visible in portrait.")
	_assert(mobile_tempo_bar.visible and mobile_tempo_bar.text.contains("Tempo"), "Tempo should be prominent above the mobile action bar.")
	_assert(mobile_turn_tracker.visible, "The mobile turn tracker should be visible below the hand.")
	_assert(mobile_turn_tracker.text.contains("R1/8") and mobile_turn_tracker.text.contains("Quick"), "The tracker should label phase and round, not only show pips.")
	_assert(not mobile_continue_button.visible, "The continue button should stay hidden while normal plays remain.")
	_assert(not board_title.visible, "The redundant action-bar title should be hidden on mobile.")
	_assert(action_bar.size.x <= 354.0, "The compact action bar should fit inside the mobile content width.")
	_assert(action_bar.size.y <= 70.0, "The compact action bar should stay shallow.")
	_assert(main.get_node_or_null("Root/MobileCommands") == null, "Mobile commands should be gone.")
	await _wait_until(func() -> bool: return turn_manager.phase == turn_manager.Phase.QUICK, "opening Quick Window")
	_assert(mobile_prompt.visible and mobile_prompt.text.contains("Drag a card"), "Mobile should prompt setup choices when the player can load the action bar.")

	var quick_card = load("res://resources/cards/tank/guard_stance.tres")
	var quick_charge = load("res://resources/cards/tank/taunting_challenge.tres")
	var slow_card = load("res://resources/cards/tank/fortify.tres")
	var slow_charge = load("res://resources/cards/tank/unyielding_step.tres")
	player.hand = [quick_card, quick_charge, slow_card, slow_charge]
	player.energy = 10
	player.tempo = player.tempo_per_window
	player.hand_changed.emit()
	player.action_bar_changed.emit()
	player.resources_changed.emit()
	await _wait_frames(2)
	_assert(mobile_prompt.visible and mobile_prompt.text.contains("Drag a card"), "A full-tempo hand should prompt the player to load a slot or move.")

	main._on_card_dropped_to_slot(0, quick_card)
	_assert(player.get_slot(0)["top_card"] == quick_card, "Dropping a card onto a slot should equip it.")
	await _wait_frames(2)
	_assert(mobile_prompt.visible and mobile_prompt.text.contains("Drag a card"), "Loading a current-window action should prompt a charge.")
	_assert(not _has_ready_slot_affordance(action_bar), "An uncharged loaded slot should not show an activation affordance.")
	main._on_card_dropped_to_slot(0, quick_charge)
	_assert(player.get_slot(0)["charges"].size() == 1, "Dropping a second card onto an equipped slot should charge it.")
	await _wait_frames(2)
	_assert(mobile_prompt.visible and mobile_prompt.text.contains("Tap the loaded slot"), "Charging a loaded action should still prompt activation.")
	await _save_screenshot(ACTION_PROMPT_SCREENSHOT_PATH)
	_assert(_slot_text_is_compact(action_bar), "Compact slots should use visual pips instead of desktop value text.")

	var armor_before_quick: int = player.armor
	main._on_slot_pressed(0)
	_assert(player.armor > armor_before_quick or boss.health < boss.max_health, "Tapping a ready slot should activate it.")
	player.energy = 0
	await _wait_frames(2)
	_assert(mobile_prompt.visible, "The end-phase prompt should appear when no quick actions remain.")
	_assert(mobile_continue_button.visible, "The continue button should appear next to the tracker when no quick plays remain.")
	await _save_screenshot(CONTINUE_PROMPT_SCREENSHOT_PATH)
	mobile_continue_button.pressed.emit()
	await _wait_until(func() -> bool: return turn_manager.phase == turn_manager.Phase.SLOW, "Boss Incoming then Slow Window")
	_assert(not mobile_continue_button.visible, "The continue button should hide again after advancing to a playable window.")
	_assert(player.health <= player.max_health, "Boss incoming should resolve before the slow window.")
	player.energy = 10
	_assert(mobile_prompt.visible and mobile_prompt.text.contains("Drag a card"), "A new playable window should prompt the next setup action.")

	main._on_card_dropped_to_slot(1, slow_card)
	_assert(player.get_slot(1)["top_card"] == slow_card, "Slow cards should equip through the same drop gesture.")
	await _wait_frames(2)
	_assert(mobile_prompt.visible and mobile_prompt.text.contains("Drag a card"), "Loading a slow-window action should prompt a charge in slow.")
	main._on_card_dropped_to_slot(1, slow_charge)
	_assert(player.get_slot(1)["charges"].size() == 1, "Slow slots should accept charge drops.")
	var armor_before_slow: int = player.armor
	main._on_slot_pressed(1)
	_assert(player.armor > armor_before_slow, "Tapping a ready slow slot should activate it.")
	player.energy = 0
	await _wait_frames(2)
	_assert(mobile_prompt.visible, "The end-phase prompt should appear when no slow actions remain.")
	_assert(mobile_continue_button.visible, "The continue button should appear when no slow plays remain.")
	_release_mobile_round(main)
	await _wait_until(func() -> bool: return turn_manager.turn_number == 2 and turn_manager.phase == turn_manager.Phase.QUICK, "next round Quick Window")
	player.tempo = player.tempo_per_window
	player.resources_changed.emit()
	await _wait_frames(2)

	var start_coords: Vector2i = hex_grid.get_piece_coords(hex_grid.player_piece)
	var destination = hex_grid.tiles[Vector2i(0, -1)]
	hex_grid.tiles[start_coords]._pressed()
	await _wait_frames(2)
	_assert(main.player_move_primed, "Tapping the player should prime tap-to-move.")
	_assert(destination.outline_color != destination.DEFAULT_OUTLINE, "Legal move destinations should be highlighted.")
	await _save_screenshot()
	var tempo_before_move: int = player.tempo
	destination._pressed()
	await _wait_frames(2)
	_assert(hex_grid.get_piece_coords(hex_grid.player_piece) != start_coords, "Tapping a highlighted destination should move the player.")
	_assert(player.tempo == tempo_before_move - 1, "Tap-to-move should spend one tempo.")
	_assert(mobile_tempo_label.text.contains("◇"), "Tempo HUD should update after spending tempo.")
	_assert(mobile_tempo_spend_label.visible and mobile_tempo_spend_label.text == "-1", "Moving should show a visible tempo spend indicator.")
	_assert(mobile_tempo_bar.text.contains("-1"), "The visible tempo bar should show the spend indicator.")
	await _save_screenshot()

	main._on_restart_pressed()
	await _wait_frames(2)
	await _wait_until(func() -> bool: return turn_manager.phase == turn_manager.Phase.QUICK, "restart Quick Window")
	player.hand = [slow_card]
	player.tempo = 1
	player.energy = 10
	player.hand_changed.emit()
	player.resources_changed.emit()
	main._on_card_dropped_to_slot(0, slow_card)
	await _wait_frames(2)
	_assert(mobile_prompt.visible and mobile_prompt.text.contains("Loaded for Slow"), "Loading a later-window card should prompt the player to finish the current window.")
	_assert(mobile_continue_button.visible, "The continue button should appear when only a later-window loaded card remains.")

	if failures.is_empty():
		print("MOBILE_PLAYTEST_OK screenshot=%s" % ProjectSettings.globalize_path(SCREENSHOT_PATH))
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _release_mobile_round(main: Node) -> void:
	var event := InputEventMouseButton.new()
	event.button_index = MOUSE_BUTTON_LEFT
	event.pressed = false
	main._on_mobile_round_input(event)

func _slot_text_is_compact(action_bar: Control) -> bool:
	for child in action_bar.get_children():
		if child.text.contains("Slot") or child.text.contains("Charge") or child.text.contains("Drop"):
			return false
	return true

func _has_ready_slot_affordance(action_bar: Control) -> bool:
	for child in action_bar.get_children():
		if child.get("ready_action") == true:
			return child.text == "" and child.tooltip_text.contains("Ready")
	return false

func _save_screenshot(screenshot_path: String = SCREENSHOT_PATH) -> void:
	var path := ProjectSettings.globalize_path(screenshot_path)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	await _wait_frames(2)
	if DisplayServer.get_name() == "headless":
		print("MOBILE_SCREENSHOT_UNAVAILABLE renderer=headless")
		return
	var image: Image = root.get_viewport().get_texture().get_image()
	if image == null:
		print("MOBILE_SCREENSHOT_UNAVAILABLE renderer=%s" % DisplayServer.get_name())
		return
	var error := image.save_png(path)
	if error != OK:
		failures.append("Mobile screenshot could not be saved: %s." % error)

func _wait_until(predicate: Callable, label: String) -> void:
	for _index in 20:
		if predicate.call():
			return
		await process_frame
	failures.append("Timed out waiting for %s." % label)

func _wait_frames(count: int) -> void:
	for _index in count:
		await process_frame

func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	failures.append(message)
