extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

func _initialize() -> void:
	ProjectSettings.set_setting("accessibility/reduced_motion", true)
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame

	var first_card: Resource = main.player.hand[0]
	var initial_hand_size: int = main.player.hand.size()
	main._on_card_selected(first_card)
	main._on_slot_pressed(0)
	_assert(main.player.get_slot(0).get("top_card") == first_card, "Tap Card then empty Slot should load through the existing action path.")
	_assert(main.player.hand.size() == initial_hand_size - 1, "Tap loading should consume exactly one current Hand card.")

	main.engine.advance_phase()
	main.engine.advance_phase()
	main._sync_from_engine()
	var movement_card: Resource = main.player.hand[0]
	var movement_card_copies_before: int = main.player.hand.count(movement_card)
	var start_coords: Vector2i = main.hex_grid.get_piece_coords(main.hex_grid.player_piece)
	var destination: Node
	for coords: Vector2i in main.hex_grid.tiles:
		if main.hex_grid.can_move_piece_to(main.hex_grid.player_piece, coords):
			destination = main.hex_grid.tiles[coords]
			break
	_assert(destination != null, "Tap movement needs a legal adjacent destination.")
	main._on_card_selected(movement_card)
	main._on_tile_selected(destination)
	_assert(main.hex_grid.get_piece_coords(main.hex_grid.player_piece) != start_coords, "Tap Card then MOVE tile should move through the existing action path.")
	_assert(main.player.hand.count(movement_card) == movement_card_copies_before - 1, "Tap movement should discard exactly one selected Hand card copy.")
	print("CARD_TAP_FALLBACK_PROBE_OK")
	quit()

func _assert(condition: bool, message: String) -> void:
	assert(condition, message)
