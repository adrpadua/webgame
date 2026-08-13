extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame

	var player = main.get_node("PlayerState")
	var boss = main.get_node("BossState")
	var strike = load("res://resources/cards/tank/steady_strike.tres")
	var guard = load("res://resources/cards/tank/iron_guard.tres")

	_assert(_count(player.deck, &"steady_strike") + _count(player.hand, &"steady_strike") == 10, "Dummy deck must contain ten Steady Strikes.")
	_assert(_count(player.deck, &"iron_guard") + _count(player.hand, &"iron_guard") == 10, "Dummy deck must contain ten Iron Guards.")
	_assert(strike.boss_damage == 2 and strike.get_charge_cap() == 3, "Steady Strike must be a three-charge basic attack.")
	_assert(guard.armor_delta == 3 and guard.get_charge_cap() == 3, "Iron Guard must be a three-charge tank response.")

	player.hand = [strike, guard, guard, strike]
	player.energy = 10
	player.tempo = 2
	player.current_window = &"quick"
	player.hand_changed.emit()
	player.action_bar_changed.emit()

	_assert(player.prepare_slot(0, strike), "Steady Strike should prepare into an empty slot.")
	_assert(player.charge_slot(0, guard), "A second card should charge Steady Strike.")
	var boss_health_before: int = boss.health
	_assert(player.activate_slot(0, {"boss": boss}), "Charged Steady Strike should activate in Quick.")
	_assert(boss.health == boss_health_before - 3, "One charge must add exactly one damage to Steady Strike.")
	_assert(player.get_slot(0)["charges"].is_empty(), "Activating Steady Strike must consume its charge stack.")

	player.tempo = 2
	player.armor = 0
	_assert(player.prepare_slot(1, guard), "Iron Guard should prepare into the second slot.")
	_assert(player.charge_slot(1, strike), "A second card should charge Iron Guard.")
	_assert(player.activate_slot(1, {"boss": boss}), "Charged Iron Guard should activate in Quick.")
	_assert(player.armor == 4, "One charge must add exactly one Armor to Iron Guard.")
	_assert(player.get_slot(1)["charges"].is_empty(), "Activating Iron Guard must consume its charge stack.")

	print("DUMMY_TANK_DECK_PROBE_OK")
	quit()

func _count(cards: Array, id: StringName) -> int:
	var count := 0
	for card in cards:
		if card != null and card.id == id:
			count += 1
	return count

func _assert(condition: bool, message: String) -> void:
	assert(condition, message)
