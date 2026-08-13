extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

var failures: Array[String] = []

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(3)
	main._apply_viewport_size(Vector2(390, 844))
	await _wait_frames(3)

	var player = main.get_node("PlayerState")
	var turn_manager = main.get_node("TurnManager")
	var grid = main.get_node("%HexGrid")
	_assert(turn_manager.phase == turn_manager.Phase.LOADOUT, "A new player starts in Loadout.")
	_assert(main.mobile_continue_button.visible, "Loadout must show a visible continue control on mobile.")
	_assert(player.hand.size() == 4, "A new player begins with four cards.")
	_assert(main._get_action_guide_text().contains("prepare") and main._get_action_guide_text().contains("inspect"), "Loadout guide should teach preparation, replacement, inspection, and continuing.")

	var quick_top := _first_card_for_window(player.hand, &"quick")
	_assert(quick_top != null and player.prepare_slot(0, quick_top), "The player can prepare a Quick Top Card during Loadout.")
	main._on_mobile_continue_pressed()
	await _wait_for_phase(turn_manager, turn_manager.Phase.QUICK, "first Quick")
	_assert(main._get_action_guide_text().contains("Charge") and main._get_action_guide_text().contains("preview routes"), "Quick guide should teach charging, activation, movement, route preview, and hex inspection.")

	grid._on_player_drag_started(grid.player_piece)
	_assert(grid.movement_path_preview.active, "Dragging the hero in Quick should show route arrows.")
	grid._on_player_drag_ended(grid.player_piece)
	_assert(not grid.movement_path_preview.active, "Route arrows should clear when the hero drag ends.")

	var charge_card: Resource = player.hand[0]
	_assert(player.charge_slot(0, charge_card), "The player can charge the prepared Quick ability for free.")
	var destination = grid.tiles[Vector2i(-1, 0)]
	var movement_card: Resource = player.hand[0]
	main._on_hand_card_dropped_to_tile(movement_card, destination)
	_assert(grid.get_piece_coords(grid.player_piece) == destination.axial, "Dragging a hand card onto an adjacent hex moves the hero.")

	main._on_advance_phase_pressed()
	await _wait_for_phase(turn_manager, turn_manager.Phase.SLOW, "first Slow")
	_assert(main._get_action_guide_text().contains("Slow Slot") and main._get_action_guide_text().contains("inspect"), "Slow guide should teach preparation, charging, activation, inspection, and continuing.")
	var slow_top := _first_card_for_window(player.hand, &"slow")
	if slow_top != null:
		_assert(player.prepare_slot(1, slow_top), "An empty Slot can be prepared during Slow.")
	main._on_advance_phase_pressed()
	await _wait_for_phase(turn_manager, turn_manager.Phase.LOADOUT, "second Loadout")
	_assert(turn_manager.phase == turn_manager.Phase.LOADOUT and turn_manager.turn_number == 2, "Slow should advance to next-round Loadout.")

	for expected_round in [2, 3]:
		main._on_mobile_continue_pressed()
		await _wait_for_phase(turn_manager, turn_manager.Phase.QUICK, "round %d Quick" % expected_round)
		main._on_advance_phase_pressed()
		await _wait_for_phase(turn_manager, turn_manager.Phase.SLOW, "round %d Slow" % expected_round)
		main._on_advance_phase_pressed()
		await _wait_for_phase(turn_manager, turn_manager.Phase.LOADOUT, "round %d Loadout" % (expected_round + 1))

	_assert(turn_manager.turn_number == 4 and turn_manager.phase == turn_manager.Phase.LOADOUT, "A newcomer can progress through several full rounds.")
	_assert(main.get_node("EncounterState").active, "The encounter should remain playable after the spike path.")
	if failures.is_empty():
		print("NEW_PLAYER_SPIKE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _first_card_for_window(cards: Array, window: StringName) -> Resource:
	for card: Resource in cards:
		if card.get_window_speed() == window:
			return card
	return null

func _wait_frames(count: int) -> void:
	for _index in count:
		await process_frame

func _wait_for_phase(turn_manager: Node, expected_phase: int, label: String) -> void:
	for _index in 30:
		if turn_manager.phase == expected_phase:
			return
		await process_frame
	_assert(false, "Timed out waiting for %s; phase was %s." % [label, turn_manager.get_phase_name()])

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
