extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const CARD_BUTTON := preload("res://scripts/ui/CardButton.gd")
const ACTION_SLOT := preload("res://scripts/ui/ActionBarSlot.gd")

func _initialize() -> void:
	ProjectSettings.set_setting("accessibility/reduced_motion", true)
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(Vector2(390, 844))
	await process_frame

	var player: Node = main.player
	var hand: Control = main.hand_view
	_assert(hand.get_child_count() == player.hand.size(), "Hand should render every current card.")
	_assert(hand.get_child_count() >= 2, "Presentation probe requires at least two cards.")
	var first_card: Control = hand.get_child(0)
	var second_card: Control = hand.get_child(1)
	_assert(first_card is CARD_BUTTON, "Hand children should use Compact Card presentation.")
	_assert(first_card.custom_minimum_size == Vector2(112, 116), "Compact Card should use portrait anatomy.")
	_assert(first_card._get_timing_badge() in [first_card.QUICK_ICON, first_card.SLOW_ICON], "Compact Card needs an icon timing badge.")
	_assert(not first_card._get_type_icon().is_empty(), "Compact Card needs a type badge.")
	_assert(first_card.position.x + first_card.size.x > second_card.position.x, "Resting Hand should use controlled overlap.")

	main._on_card_selected(first_card.card)
	await process_frame
	_assert(first_card.selected, "Selected Compact Card should expose selected anatomy.")
	var selected_count := 0
	for hand_card: Control in hand.get_children():
		if hand_card.selected:
			selected_count += 1
	_assert(selected_count == 1, "Only the tapped Compact Card should lift when duplicate resources are in Hand.")
	_assert(first_card.position.y < second_card.position.y, "Selected Compact Card should lift above adjacent cards.")
	_assert(first_card.scale.x > 1.0, "Selected Compact Card should enlarge without hiding the Hand.")
	var title_font: Font = first_card.get_theme_default_font()
	var fitted_title_size: int = first_card._fit_font_size(title_font, first_card.card.title, first_card.size.x - 24.0, 11, 7)
	_assert(title_font.get_string_size(first_card.card.title, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted_title_size).x <= first_card.size.x - 24.0, "Selected title should fit without clipping.")
	_assert(main.action_bar_view.context_card == first_card.card, "Selecting a current Hand card should expose Slot destinations for that exact card.")
	first_card.drag_started = true
	main._on_hand_card_drag_started(first_card.card)
	var drag_payload: Dictionary = {"kind": "hand_card", "card": first_card.card}
	first_card._end_press()
	await process_frame
	_assert(main.action_bar_view.context_card == first_card.card, "Pointer release must not clear destinations before the drop completes.")
	var first_slot: Control = main.action_bar_view.get_child(0)
	_assert(first_slot._can_drop_data(Vector2.ZERO, drag_payload), "A legal Slot should still accept the dragged card after pointer release.")

	var quick_card: Resource = load("res://resources/cards/tank/guard_stance.tres")
	var charge_card: Resource = load("res://resources/cards/tank/taunting_challenge.tres")
	_assert(_slot_state(null, [], &"", &"quick", false) == &"empty", "Empty Slot state should be explicit.")
	_assert(_slot_state(quick_card, [], &"", &"quick", false) == &"loaded", "Occupied uncharged Slot should be Loaded.")
	_assert(_slot_state(quick_card, [charge_card], &"", &"quick", true) == &"ready", "Fireable Slot should be Ready.")
	var full_stack: Array = []
	for index in quick_card.get_charge_cap():
		full_stack.append(charge_card)
	_assert(_slot_state(quick_card, full_stack, &"", &"slow", false) == &"primed", "Full unactivated Slot should be Primed.")
	_assert(_slot_state(quick_card, [charge_card], &"quick", &"quick", false) == &"activated", "Used Slot should be Activated.")
	_assert(_slot_state(quick_card, [], &"", &"slow", false) == &"locked", "Wrong-window Slot should be Locked.")

	# Drop intent is engine-owned legality projected into slot_data by
	# ActionBarView; the widget must render each projected intent as its cue.
	var intent_labels := {&"load": "LOAD", &"replace": "REPLACE", &"charge": "CHARGE"}
	for intent: StringName in intent_labels:
		var slot := ACTION_SLOT.new()
		root.add_child(slot)
		var slot_card: Resource = null if intent == &"load" else quick_card
		slot.bind(0, {"top_card": slot_card, "charges": [], "activated_window": &"", "project_intent": intent}, false, true, &"quick", charge_card)
		_assert(slot._get_drop_intent_label() == intent_labels[intent], "%s destination cue should mirror the projected intent." % intent_labels[intent])
		slot.queue_free()
	var blocked_slot := ACTION_SLOT.new()
	root.add_child(blocked_slot)
	blocked_slot.bind(0, {"top_card": quick_card, "charges": full_stack, "activated_window": &"", "project_intent": &""}, false, true, &"quick", charge_card)
	_assert(not blocked_slot._can_accept_hand_card(), "A Slot without a projected intent must not accept a drop.")
	blocked_slot.queue_free()
	# The projection source is engine legality (full legality matrix is owned
	# by the scene-free legality probe); prove the live wiring end to end here.
	var engine = main.engine
	var live_hand: Array = engine.get_hero(engine.primary_hero_id)["hand"]
	_assert(main.player.project_intent(0, live_hand[0]) != &"", "The live empty Slot should project a legal intent from the engine.")

	main.player.current_window = &"quick"
	main._refresh_card_destination_context()
	var legal_moves := 0
	var illegal_cues := 0
	for coords: Vector2i in main.hex_grid.tiles:
		var tile: Node = main.hex_grid.tiles[coords]
		if tile.hand_card_move_legal:
			legal_moves += 1
			if not main.hex_grid.can_move_piece_to(main.hex_grid.player_piece, coords):
				illegal_cues += 1
	_assert(legal_moves > 0, "Quick selection should expose at least one MOVE destination.")
	_assert(illegal_cues == 0, "MOVE must appear only on already-legal destinations.")
	var legal_tile: Node = main.hex_grid.tiles.values().filter(func(tile: Node) -> bool: return tile.hand_card_move_legal)[0]
	_assert(not legal_tile._can_drop_data(Vector2.ZERO, {"kind": "hand_card", "card": quick_card}), "MOVE must reject a different card payload than the projected Hand card.")
	_assert(legal_tile._can_drop_data(Vector2.ZERO, {"kind": "hand_card", "card": first_card.card}), "MOVE should accept the currently projected dragged Hand card.")
	_assert(main._can_project_card_to_slot(0, first_card.card), "Tap fallback should recognize a legal empty Slot.")

	first_card._finish_drag()
	main._on_hand_card_drag_ended(first_card.card)
	await process_frame
	_assert(main.action_bar_view.context_card == null, "Drag end should clear Action Bar destinations.")
	for tile: Node in main.hex_grid.tiles.values():
		_assert(not tile.hand_card_move_legal, "Drag end should clear MOVE destinations.")

	var board: Control = main.hex_grid
	var interaction_height: float = hand.size.y + main.action_bar_view.size.y
	_assert(board.size.y > interaction_height, "Board should remain larger than the Bottom Interaction Zone.")
	print("CARD_ACTION_BOARD_PRESENTATION_PROBE_OK hand=%d moves=%d" % [hand.get_child_count(), legal_moves])
	quit()

func _slot_state(card: Resource, charges: Array, activated_window: StringName, window: StringName, ready: bool) -> StringName:
	var slot := ACTION_SLOT.new()
	root.add_child(slot)
	slot.bind(0, {"top_card": card, "charges": charges, "activated_window": activated_window, "ready_action": ready}, false, true, window)
	var state := slot.get_visual_state()
	slot.queue_free()
	return state

func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	push_error(message)
	quit(1)
