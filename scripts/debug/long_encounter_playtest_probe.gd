extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

var failures: Array[String] = []
var move_count := 0
var attack_count := 0
var activated_cards: Array[String] = []
var phase_advances := 0

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(3)

	var player = main.get_node("PlayerState")
	var boss = main.get_node("BossState")
	var turn_manager = main.get_node("TurnManager")
	var hex_grid = main.get_node("%HexGrid")

	_seed_long_playtest_hand(player)
	await _wait_until(func() -> bool: return turn_manager.phase == turn_manager.Phase.QUICK, "opening Quick Window")

	_do_move(main, hex_grid, Vector2i(0, -1))
	_activate_attack(main, player, boss, 0, "res://resources/cards/tank/steady_strike.tres", [])
	_end_current_window(main)

	await _wait_until(func() -> bool: return turn_manager.phase == turn_manager.Phase.SLOW, "first Slow Window")
	_activate_attack(main, player, boss, 1, "res://resources/cards/tank/unyielding_step.tres", [])
	_end_current_window(main)

	await _wait_until(func() -> bool: return turn_manager.turn_number == 2 and turn_manager.phase == turn_manager.Phase.QUICK, "Round 2 Quick Window")
	_do_move(main, hex_grid, Vector2i(-1, 0))
	_activate_attack(main, player, boss, 0, "res://resources/cards/tank/shield_slam.tres", [])
	_end_current_window(main)

	await _wait_until(func() -> bool: return turn_manager.phase == turn_manager.Phase.SLOW, "second Slow Window")
	_end_current_window(main)

	await _wait_until(func() -> bool: return turn_manager.turn_number == 3 and turn_manager.phase == turn_manager.Phase.QUICK, "Round 3 Quick Window")
	_do_move(main, hex_grid, Vector2i(-1, 1))

	while main.encounter.active and turn_manager.turn_number <= main.encounter.round_limit + 1:
		_end_current_window(main)
		await _wait_frames(2)

	_assert(move_count >= 3, "Long playtest must move at least three times; got %d." % move_count)
	_assert(attack_count >= 3, "Long playtest must attack at least three times; got %d." % attack_count)
	_assert(not main.encounter.active, "Long playtest must reach an encounter ending.")
	_assert(main.encounter.outcome == &"defeat", "Long playtest should end by boss kill or turn timer; got %s." % main.encounter.outcome)
	_assert(main.encounter.reason.contains("Enrage") or main.encounter.reason.contains(player.hero_name), "Defeat reason should be boss damage or turn timer; got %s." % main.encounter.reason)

	if failures.is_empty():
		print("LONG_ENCOUNTER_PLAYTEST_OK outcome=%s reason=\"%s\" turns=%d moves=%d attacks=%d activated=%s player_hp=%d boss_hp=%d phase_advances=%d" % [
			main.encounter.outcome,
			main.encounter.reason,
			turn_manager.turn_number,
			move_count,
			attack_count,
			",".join(activated_cards),
			player.health,
			boss.health,
			phase_advances,
		])
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _seed_long_playtest_hand(player) -> void:
	var deck_paths := [
		"res://resources/cards/tank/steady_strike.tres",
		"res://resources/cards/tank/unyielding_step.tres",
		"res://resources/cards/tank/shield_slam.tres",
		"res://resources/cards/tank/taunting_challenge.tres",
		"res://resources/cards/tank/fortify.tres",
		"res://resources/cards/tank/guard_stance.tres",
	]
	player.hand.clear()
	for path in deck_paths:
		player.hand.append(load(path))
	player.energy = 12
	player.tempo = player.tempo_per_window
	player.hand_changed.emit()
	player.resources_changed.emit()
	player.action_bar_changed.emit()

func _do_move(main, hex_grid, destination: Vector2i) -> void:
	var tile = hex_grid.tiles.get(destination)
	_assert(tile != null, "Move destination %s must exist." % destination)
	var before: Vector2i = hex_grid.get_piece_coords(hex_grid.player_piece)
	var moved: bool = main._move_player_to_tile(tile, true)
	_assert(moved, "Move from %s to %s should succeed." % [before, destination])
	if moved:
		move_count += 1
	_assert(hex_grid.get_piece_coords(hex_grid.player_piece) == destination, "Player should be at %s after move." % destination)

func _activate_attack(main, player, boss, slot_index: int, card_path: String, charge_paths: Array[String]) -> void:
	var card = load(card_path)
	if not player.hand.has(card):
		player.hand.append(card)
	var previous_tempo: int = player.tempo
	player.tempo = max(player.tempo, 1 + charge_paths.size())
	var prepared: bool = player.prepare_slot(slot_index, card)
	_assert(prepared, "Should prepare %s in slot %d." % [card.title, slot_index + 1])
	for charge_path in charge_paths:
		var charge = load(charge_path)
		if not player.hand.has(charge):
			player.hand.append(charge)
		_assert(player.charge_slot(slot_index, charge), "Should charge %s with %s." % [card.title, charge.title])
	player.tempo = previous_tempo
	main.selected_slot_index = slot_index
	var boss_health_before: int = boss.health
	main._on_slot_pressed(slot_index)
	await_or_ignore()
	if boss.health < boss_health_before:
		attack_count += 1
		activated_cards.append(card.title)
	_assert(boss.health < boss_health_before, "%s should damage the boss." % card.title)
	main._check_encounter_end()

func _end_current_window(main) -> void:
	if not main.encounter.active:
		return
	var turn_manager = main.get_node("TurnManager")
	var before_phase: int = turn_manager.phase
	main._on_advance_phase_pressed()
	phase_advances += 1
	if main.encounter.active and turn_manager.phase == before_phase:
		failures.append("Phase did not advance from %s." % before_phase)

func await_or_ignore() -> void:
	pass

func _wait_until(predicate: Callable, label: String) -> void:
	for _index in 40:
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
