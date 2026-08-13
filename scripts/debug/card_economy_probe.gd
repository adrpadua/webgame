extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

var failures: Array[String] = []

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(3)

	var player = main.get_node("PlayerState")
	var turn_manager = main.get_node("TurnManager")
	var grid = main.get_node("%HexGrid")
	_assert(turn_manager.phase == turn_manager.Phase.LOADOUT, "An encounter should begin in the Loadout Step.")
	_assert(player.hand.size() == 4, "An encounter should begin with four cards.")

	var top_card: Resource = player.hand[0]
	_assert(player.prepare_slot(0, top_card), "Loadout should freely prepare a Top Card.")
	main._on_advance_phase_pressed()
	await _wait_frames(3)
	_assert(turn_manager.phase == turn_manager.Phase.QUICK, "Loadout should advance through Boss Instant to Quick Window.")

	var charge_card: Resource = player.hand[0]
	_assert(player.charge_slot(0, charge_card), "Quick Window should freely charge a loaded Slot.")
	var charges_before: int = player.get_slot(0)["charges"].size()
	assert(player.activate_slot(0, {"boss": main.get_node("BossState")}), "A charged matching Slot should activate.")
	_assert(player.get_slot(0)["charges"].size() == charges_before, "Activation should preserve the Charge Stack.")
	_assert(not player.charge_slot(0, player.hand[0]), "A Slot cannot receive more Charge after activating this window.")

	var destination = grid.tiles[Vector2i(-1, 0)]
	var movement_card: Resource = player.hand[0]
	var hand_before: int = player.hand.size()
	main._on_hand_card_dropped_to_tile(movement_card, destination)
	_assert(player.hand.size() == hand_before - 1, "Dragging a hand card to an adjacent hex should discard it for movement.")
	_assert(grid.get_piece_coords(grid.player_piece) == destination.axial, "Card-fueled movement should move the hero onto the destination hex.")

	if failures.is_empty():
		print("CARD_ECONOMY_PROBE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _wait_frames(count: int) -> void:
	for _index in count:
		await process_frame

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
