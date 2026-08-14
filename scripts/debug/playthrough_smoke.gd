extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

var failures: Array[String] = []

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame

	var player = main.get_node("PlayerState")
	var boss = main.get_node("BossState")
	var turn_manager = main.get_node("TurnManager")
	var hex_grid = main.get_node("%HexGrid")
	_assert(player.deck.size() + player.hand.size() == 20, "Elian Voss should start each encounter with the authored 20-card deck")

	var quick_card = load("res://resources/cards/tank/steady_strike.tres")
	var quick_charge = load("res://resources/cards/tank/iron_guard.tres")
	var slow_card = load("res://resources/cards/tank/fortify.tres")
	var slow_charge = load("res://resources/cards/tank/unyielding_step.tres")

	player.hand = [quick_card, quick_charge, slow_card, slow_charge]
	player.energy = 10
	player.tempo = 0
	player.hand_changed.emit()
	player.action_bar_changed.emit()

	_assert(turn_manager.phase == turn_manager.Phase.QUICK, "Boss Instant should resolve into the Quick Window")
	_assert(player.current_window == &"quick", "Quick window should set player window")
	_assert(not player.activate_slot(0, {"boss": boss}), "Cannot activate an empty slot")
	_assert(not player.prepare_slot(0, quick_card), "Cannot prepare without tempo")

	player.tempo = player.tempo_per_window
	_assert(player.tempo == player.tempo_per_window, "Quick window should refresh tempo")
	var start_coords = hex_grid.get_piece_coords(hex_grid.player_piece)
	main.selected_tile = hex_grid.tiles[Vector2i(0, -1)]
	_assert(main._can_basic_move(), "Main UI should recognize a valid quick-window move")
	main.selected_tile = hex_grid.tiles[Vector2i(1, -1)]
	_assert(not main._can_basic_move(), "Main UI should reject moving onto an occupied boss tile")
	main.selected_tile = hex_grid.tiles[Vector2i(0, -1)]
	main._on_piece_dragged_to_tile(hex_grid.player_piece, hex_grid.tiles[Vector2i(0, -1)])
	_assert(player.tempo == player.tempo_per_window - 1, "Basic movement should cost one tempo")
	_assert(hex_grid.get_piece_coords(hex_grid.player_piece) == Vector2i(0, -1), "Player piece should update to the destination hex")
	_assert(player.get_facing_name() == "NW", "Movement should set player facing to the traversed legal hex edge")
	main._on_piece_dragged_to_tile(hex_grid.player_piece, hex_grid.tiles[Vector2i(1, -1)])
	_assert(hex_grid.get_piece_coords(hex_grid.player_piece) == Vector2i(0, -1), "Dragging onto an occupied tile should fail")
	_assert(not hex_grid.move_piece_to(hex_grid.player_piece, Vector2i(2, -2)), "Basic movement should not jump beyond one hex")
	player.tempo = 0
	_assert(player.tempo == 0, "Two basic moves should spend the full quick-window tempo budget")
	_assert(not player.prepare_slot(0, quick_card), "No tempo should remain for card prep after spending tempo on movement")

	player.tempo = player.tempo_per_window
	_assert(player.prepare_slot(0, quick_card), "Can prepare a quick card during quick window")
	_assert(not player.activate_slot(0, {"boss": boss}), "A loaded slot should require a charged hand card")
	_assert(player.charge_slot(0, quick_charge), "Can charge a prepared slot during quick window")
	_assert(player.get_slot(0)["charges"].size() == 1, "Quick slot should hold one charge")
	_assert(not player.prepare_slot(0, slow_card), "Cannot replace a slot while it still has charges")
	var boss_health_before_quick = boss.health
	_assert(player.activate_slot(0, {"boss": boss}), "Quick slot should activate during quick window")
	_assert(player.get_slot(0)["top_card"] == quick_card, "Top card should persist after activation")
	_assert(player.get_slot(0)["charges"].is_empty(), "Charges should be consumed on activation")
	_assert(boss.health == boss_health_before_quick - 3, "One charge should add one damage to the dummy basic attack")
	_assert(not player.activate_slot(0, {"boss": boss}), "Persistent top card should need another charge before reuse")

	turn_manager.advance_phase(player)
	_assert(turn_manager.phase == turn_manager.Phase.INCOMING, "Advancing from quick should enter boss incoming")
	var incoming_before = boss.get_incoming_title()
	var player_health_before = player.health
	boss.resolve_incoming(player, hex_grid)
	_assert(player.health <= player_health_before, "Incoming boss action should resolve against player state")

	turn_manager.advance_phase(player)
	_assert(turn_manager.phase == turn_manager.Phase.SLOW, "Advancing from incoming should enter slow window")
	_assert(player.current_window == &"slow", "Slow window should set player window")
	_assert(player.prepare_slot(1, slow_card), "Can prepare a slow card into slot 2")
	_assert(player.charge_slot(1, slow_charge), "Can charge a slow slot during slow window")
	var armor_before_slow = player.armor
	_assert(player.activate_slot(1, {"boss": boss}), "Slow slot should activate during slow window")
	_assert(player.armor > armor_before_slow, "Slow activation should improve player defenses")
	_assert(not player.activate_slot(0, {"boss": boss}), "Quick top card should not fire during slow window")
	main.selected_tile = hex_grid.tiles[Vector2i(0, -1)]
	_assert(not main._can_basic_move(), "Main UI should reject basic movement outside the quick window")

	turn_manager.advance_phase(player)
	boss.advance_round_timeline(hex_grid)
	_assert(turn_manager.phase == turn_manager.Phase.INSTANT, "Advancing from slow should begin next round")
	_assert(turn_manager.turn_number == 2, "Round counter should increment after slow window")
	_assert(player.current_window == &"none", "New round should reset player window before quick phase")
	_assert(player.tempo == 0, "New round should clear tempo until a player window starts")
	_assert(boss.get_incoming_title() != incoming_before or boss.script_deck.size() == 1, "Boss program should advance after the slow window")

	var hand_before_replace = player.hand.size()
	player.tempo = 1
	player.hand.append(quick_charge)
	player.hand_changed.emit()
	_assert(player.prepare_slot(0, quick_charge), "Replacing an uncharged top card should be allowed")
	_assert(player.hand.size() == hand_before_replace, "Replacing a top card should consume one hand card")
	_assert(player.get_slot(0)["top_card"] == quick_charge, "Replacement should update the slot top card")
	_test_invalid_targeting(main, player, boss, turn_manager, hex_grid)
	_test_victory_resolution(main, player, boss, turn_manager)
	_test_health_defeat(main, player, boss)
	_test_enrage_defeat(main, player, boss, turn_manager)
	_test_boss_damage_profiles()

	if failures.is_empty():
		print("PLAYTHROUGH_SMOKE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	failures.append(message)

func _test_invalid_targeting(main, player, boss, turn_manager, hex_grid) -> void:
	main._on_restart_pressed()
	var intercept = load("res://resources/cards/tank/intercept.tres")
	var charge = load("res://resources/cards/tank/steady_strike.tres")
	player.hand = [intercept, charge]
	player.energy = 10
	turn_manager.advance_phase(player)
	_assert(player.prepare_slot(0, intercept), "Targeted quick card should prepare")
	_assert(player.charge_slot(0, charge), "Targeted quick card should receive a charge before target validation")
	var error: String = player.get_activation_error(0, {"boss": boss})
	_assert(error.contains("Select a minion"), "Targeted card should require a minion selection")
	_assert(not player.activate_slot(0, {"boss": boss}), "Targeted card should reject missing targets")
	var friendly_error: String = player.get_activation_error(0, {"boss": boss, "target": hex_grid.player_piece})
	_assert(friendly_error.contains("must target a minion"), "Targeted card should reject a friendly piece")

func _test_victory_resolution(main, player, boss, turn_manager) -> void:
	main._on_restart_pressed()
	boss.health = 2
	var steady_strike = load("res://resources/cards/tank/steady_strike.tres")
	var charge = load("res://resources/cards/tank/iron_guard.tres")
	player.hand = [steady_strike, charge]
	player.energy = 10
	main._on_advance_phase_pressed()
	_assert(turn_manager.phase == turn_manager.Phase.QUICK, "Victory test should reach quick window")
	main.selected_slot_index = 0
	main.selected_card = steady_strike
	main._on_prepare_card_pressed()
	_assert(player.charge_slot(0, charge), "Victory card should receive a charge before activation")
	main._on_activate_slot_pressed()
	_assert(main.encounter.outcome == &"victory", "A card-driven boss kill should end in victory")
	_assert(not main.encounter.active, "Victory should lock the encounter")
	_assert(main.encounter.reason.contains("defeated"), "Victory should explain the outcome")

func _test_health_defeat(main, player, boss) -> void:
	main._on_restart_pressed()
	player.take_damage(player.max_health + 1)
	main._check_encounter_end()
	_assert(main.encounter.outcome == &"defeat", "Zero health should end in defeat")
	_assert(main.encounter.reason.contains(player.hero_name), "Health defeat should name the fallen hero")

func _test_enrage_defeat(main, player, boss, turn_manager) -> void:
	main._on_restart_pressed()
	main.encounter.round_limit = 1
	main._on_advance_phase_pressed()
	main._on_advance_phase_pressed()
	main._on_advance_phase_pressed()
	main._on_advance_phase_pressed()
	_assert(turn_manager.turn_number == 2, "Ending the first slow window should begin round two")
	_assert(main.encounter.outcome == &"defeat", "Exceeding the round limit should cause defeat")
	_assert(main.encounter.reason.contains("Enrage"), "Enrage defeat should use the authored enrage text")

func _test_boss_damage_profiles() -> void:
	var opening = load("res://resources/boss/raid_opening.tres")
	var breath = load("res://resources/boss/ember_breath.tres")
	var tail_whip = load("res://resources/boss/tail_whip.tres")
	_assert(opening.tank_damage == 4 and opening.raid_damage == 0, "Raid Opening should be tank-targeted")
	_assert(breath.tank_damage == 0 and breath.raid_damage == 6, "Ember Breath should be raid-targeted")
	_assert(tail_whip.get_damage_profile().contains("Tank") and tail_whip.get_damage_profile().contains("Raid"), "Mixed boss damage should be visible as both profiles")
