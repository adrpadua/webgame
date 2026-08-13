extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")

var failures: Array[String] = []

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(4)
	var player = main.get_node("PlayerState")
	var grid = main.get_node("%HexGrid")
	var turn = main.get_node("TurnManager")

	_assert_parity(main, "initial Loadout")
	var first_top: Resource = player.hand[0]
	main._on_card_dropped_to_slot(0, first_top)
	main._on_slot_pressed(0)
	_assert(not main.engine.history[-1].succeeded, "An illegal visible Slot activation should be rejected by EncounterEngine.")
	_assert(main.get_node("EncounterState").get_log_text().contains("Rejected:"), "The visible Encounter log should render rejected engine action history.")
	var replacement: Resource = player.hand[0]
	main._on_card_dropped_to_slot(0, replacement)
	_assert(player.get_slot(0)["top_card"] == replacement, "Loadout replacement should update the visible Top Card.")
	_assert(main.engine.get_hero(main.engine.primary_hero_id)["discard"].has(first_top), "Loadout replacement should discard the old Top Card in the engine.")
	var second_top: Resource = player.hand[0]
	main._on_card_dropped_to_slot(1, second_top)
	_assert(player.get_slot(1)["top_card"] == second_top, "An empty Slot should accept a Top Card during Loadout.")
	_assert_parity(main, "Loadout actions")

	main._on_mobile_continue_pressed()
	await _wait_for_phase(turn, turn.Phase.QUICK, "round 1 Quick")
	var first_charge: Resource = player.hand[0]
	main._on_card_dropped_to_slot(0, first_charge)
	main._on_slot_pressed(0)
	_assert(player.get_slot(0)["charges"].size() == 1, "Activation should preserve a non-full Charge Stack.")
	_assert_parity(main, "round 1 activation")
	main._on_advance_phase_pressed()
	await _wait_for_phase(turn, turn.Phase.SLOW, "round 1 Slow")
	_assert(_history_has(main.engine, EncounterActionModel.Kind.RESOLVE_BOSS), "Boss rows should resolve as EncounterActions in the live scene.")
	_assert(_history_has(main.engine, EncounterActionModel.Kind.APPLY_HAZARD), "Boss rows should apply authored Hazards in the live scene.")
	_assert(_history_has(main.engine, EncounterActionModel.Kind.SPAWN_MINION), "Boss rows should spawn authored Whelps in the live scene.")
	_assert_parity(main, "round 1 boss rows")
	main._on_advance_phase_pressed()
	await _wait_for_phase(turn, turn.Phase.LOADOUT, "round 2 Loadout")

	main._on_mobile_continue_pressed()
	await _wait_for_phase(turn, turn.Phase.QUICK, "round 2 Quick")
	for _index in 2:
		main._on_card_dropped_to_slot(0, player.hand[0])
	_assert(player.get_slot(0)["charges"].size() == replacement.get_charge_cap(), "Round 2 should be able to fill the persistent Charge Stack.")
	var first_destination := _first_legal_destination(main)
	main._on_hand_card_dropped_to_tile(player.hand[0], grid.tiles[first_destination])
	var second_destination := _first_legal_destination(main)
	main._on_hand_card_dropped_to_tile(player.hand[0], grid.tiles[second_destination])
	_assert(main.engine.board.get_entity(main.engine.primary_hero_id)["coords"] == second_destination, "Two card-fueled moves should sprint across two adjacent hexes.")
	_assert_parity(main, "card-fueled sprint")
	main._on_advance_phase_pressed()
	await _wait_for_phase(turn, turn.Phase.SLOW, "round 2 Slow")
	_assert(player.get_slot(0)["top_card"] == replacement, "A full unactivated Slot should remain Primed after Quick cleanup.")
	_assert(player.get_slot(0)["charges"].size() == replacement.get_charge_cap(), "Primed should preserve the full Charge Stack.")
	main._on_advance_phase_pressed()
	await _wait_for_phase(turn, turn.Phase.LOADOUT, "round 3 Loadout")
	main._on_mobile_continue_pressed()
	await _wait_for_phase(turn, turn.Phase.QUICK, "round 3 Quick")
	main._on_slot_pressed(0)
	main._on_advance_phase_pressed()
	await _wait_for_phase(turn, turn.Phase.SLOW, "round 3 Slow")
	_assert(player.get_slot(0)["top_card"] == null, "A full activated Slot should clean up at the end of its matching window.")
	_assert_parity(main, "full-charge cleanup")

	main._start_encounter()
	main.engine.apply(EncounterActionModel.damage(&"probe", main.engine.boss_id, 999, "parity victory"))
	main._sync_from_engine()
	_assert(not main.get_node("EncounterState").active and main.get_node("EncounterState").outcome == &"victory", "Victory should project from EncounterEngine into the visible Encounter state.")
	_assert_parity(main, "victory")

	main._start_encounter()
	main.engine.apply(EncounterActionModel.damage(main.engine.boss_id, main.engine.primary_hero_id, 999, "parity defeat"))
	main._sync_from_engine()
	_assert(not main.get_node("EncounterState").active and main.get_node("EncounterState").outcome == &"defeat", "Defeat should project from EncounterEngine into the visible Encounter state.")
	_assert_parity(main, "defeat")

	main._start_encounter()
	main.engine.round_limit = 1
	for _step in 5:
		main.engine.advance_phase()
	main._sync_from_engine()
	_assert(not main.get_node("EncounterState").active and main.engine.outcome_reason.contains("Enrage"), "Encounter Clock expiry should project the authored enrage defeat.")
	_assert_parity(main, "enrage")

	if failures.is_empty():
		print("LIVE_SDK_PARITY_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _assert_parity(main: Node, label: String) -> void:
	var player = main.get_node("PlayerState")
	var boss = main.get_node("BossState")
	var turn = main.get_node("TurnManager")
	var encounter = main.get_node("EncounterState")
	var grid = main.get_node("%HexGrid")
	var hero: Dictionary = main.engine.get_hero(main.engine.primary_hero_id)
	var boss_entity: Dictionary = main.engine.board.get_entity(main.engine.boss_id)
	_assert(player.health == hero["health"], "%s: visible Hero health diverged from SDK." % label)
	_assert(player.armor == hero["armor"], "%s: visible Armor diverged from SDK." % label)
	_assert(player.hand.size() == hero["hand"].size(), "%s: visible Hand diverged from SDK." % label)
	_assert(player.discard.size() == hero["discard"].size(), "%s: visible discard diverged from SDK." % label)
	_assert(player.action_bar == hero["action_bar"], "%s: visible Action Bar diverged from SDK." % label)
	_assert(boss.health == boss_entity.get("health", 0), "%s: visible Boss health diverged from SDK." % label)
	_assert(turn.turn_number == main.engine.round, "%s: visible Round diverged from SDK." % label)
	_assert(encounter.active == main.engine.active and encounter.outcome == main.engine.outcome, "%s: visible outcome diverged from SDK." % label)
	if main.engine.board.has_entity(main.engine.primary_hero_id):
		_assert(grid.get_piece_coords(grid.player_piece) == main.engine.board.get_entity(main.engine.primary_hero_id)["coords"], "%s: rendered Hero position diverged from SDK." % label)
	var rendered_minions := 0
	for tile in grid.tiles.values():
		for piece in tile.pieces:
			if piece.piece_owner == &"enemy":
				rendered_minions += 1
	var engine_minions := 0
	for entity in main.engine.board.entities.values():
		if entity.get("kind") == &"minion":
			engine_minions += 1
	_assert(rendered_minions == engine_minions, "%s: rendered Minions diverged from SDK." % label)
	for coords in grid.tiles:
		var hazards: Array = main.engine.board.get_hazards(coords)
		var expected_terrain: StringName = hazards[0].id if not hazards.is_empty() else &""
		_assert(grid.tiles[coords].terrain_id == expected_terrain, "%s: rendered Hazard terrain diverged from SDK at %s." % [label, coords])

func _first_legal_destination(main: Node) -> Vector2i:
	var origin: Vector2i = main.engine.board.get_entity(main.engine.primary_hero_id)["coords"]
	for coords in main.get_node("%HexGrid").get_neighbors(origin):
		if main.get_node("%HexGrid").can_move_piece_to(main.get_node("%HexGrid").player_piece, coords):
			return coords
	return Vector2i(999, 999)

func _history_has(engine, kind) -> bool:
	for action in engine.history:
		if action.kind == kind:
			return true
	return false

func _wait_frames(count: int) -> void:
	for _index in count:
		await process_frame

func _wait_for_phase(turn: Node, expected_phase: int, label: String) -> void:
	for _index in 40:
		if turn.phase == expected_phase:
			return
		await process_frame
	_assert(false, "Timed out waiting for %s; phase was %s." % [label, turn.get_phase_name()])

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
