extends SceneTree

const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const HazardEffectModel := preload("res://scripts/sdk/HazardEffect.gd")
const StatusEffectModel := preload("res://scripts/sdk/StatusEffect.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

var failures: Array[String] = []

func _initialize() -> void:
	_test_board_queries()
	_test_action_bar_and_statuses()
	_test_hazards_and_movement()
	_test_timeline_actions()
	_test_round_start_status()
	if failures.is_empty():
		print("SDK_ENCOUNTER_HARNESS_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _test_board_queries() -> void:
	var hexes := BoardQueryModel.hexes_in_radius(2)
	var origin := Vector2i(0, 0)
	_assert(BoardQueryModel.hex_distance(origin, Vector2i(2, -1)) == 2, "Hex distance should use axial coordinates")
	_assert(BoardQueryModel.front_arc(hexes, origin, FacingDirections.Direction.EAST).size() == 3, "Front arc should contain three legal adjacent hexes")
	_assert(BoardQueryModel.rear_arc(hexes, origin, FacingDirections.Direction.EAST).has(Vector2i(-1, 0)), "Rear arc should invert facing")
	_assert(BoardQueryModel.line(hexes, origin, FacingDirections.Direction.EAST, 2) == [Vector2i(1, 0), Vector2i(2, 0)], "Line query should follow a hex edge")
	_assert(BoardQueryModel.hexes_within_radius(hexes, origin, 1).size() == 7, "Radius query should include the center and six neighbors")

func _test_action_bar_and_statuses() -> void:
	var strike = load("res://resources/cards/tank/steady_strike.tres")
	var guard = load("res://resources/cards/tank/iron_guard.tres")
	var engine = _engine([strike, guard, strike, guard])
	_advance_to_quick(engine)
	var load_action = engine.apply(EncounterActionModel.load_slot(&"guardian", 0, strike))
	var charge_action = engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, guard))
	_assert(load_action.succeeded and charge_action.succeeded, "LoadSlotAction and ChargeSlotAction should prepare a persistent Slot")
	var focus := StatusEffectModel.new(&"focus", 2, [StatusEffectModel.ON_SLOT_FIRED])
	focus.bonus_boss_damage_on_slot_fired = 1
	engine.add_status(&"guardian", focus)
	var fire_action = engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	_assert(fire_action.succeeded, "FireSlotAction should resolve a charged matching-window Slot")
	_assert(not engine.apply(EncounterActionModel.fire_slot(&"guardian", 0)).succeeded, "A Slot should not fire twice in the same matching window")
	_assert(engine.board.get_entity(&"boss")["health"] == 32, "CardResolver and on_slot_fired should apply charge and status damage")
	_assert(engine.get_hero(&"guardian")["action_bar"][0]["top_card"] == strike, "Top Card should persist after FireSlotAction")
	_assert(engine.get_hero(&"guardian")["action_bar"][0]["charges"].size() == 1, "Firing should preserve the Charge Stack until the matching window ends")
	engine.advance_phase()
	_assert(engine.get_hero(&"guardian")["action_bar"][0]["charges"].size() == 1, "A non-full fired Slot should persist into a later window")
	var shield := StatusEffectModel.new(&"shielded", 2, [StatusEffectModel.ON_DAMAGE_TAKEN])
	shield.damage_reduction = 1
	engine.add_status(&"guardian", shield)
	var health_before: int = engine.get_hero(&"guardian")["health"]
	var damage_action = engine.apply(EncounterActionModel.damage(&"boss", &"guardian", 3, "test"))
	_assert(engine.get_hero(&"guardian")["health"] == health_before - 2, "on_damage_taken should reduce incoming damage")
	_assert(damage_action.payload["resolution_fact"] == {"requested": 3, "prevented": 1, "health_loss": 2, "target_available": true}, "Damage actions must expose an explicit Resolution Fact.")

func _test_hazards_and_movement() -> void:
	var strike = load("res://resources/cards/tank/steady_strike.tres")
	var engine = _engine([strike])
	_advance_to_quick(engine)
	var destination := Vector2i(-1, 0)
	var burn := HazardEffectModel.new(&"burning", 1, 2, false)
	var apply_action = engine.apply(EncounterActionModel.apply_hazard(&"boss", destination, burn))
	var health_before: int = engine.get_hero(&"guardian")["health"]
	var move_action = engine.apply(EncounterActionModel.move_hero(&"guardian", destination, strike))
	_assert(apply_action.succeeded and move_action.succeeded, "ApplyHazardAction and MoveHeroAction should be executable records")
	_assert(engine.get_hero(&"guardian")["health"] == health_before - 2, "on_enter_hex should resolve the HazardEffect")
	var blocked := HazardEffectModel.new(&"blocked", 2, 0, true)
	engine.apply(EncounterActionModel.apply_hazard(&"boss", Vector2i(-2, 0), blocked))
	_assert(not BoardQueryModel.is_legal_move(engine.board, &"guardian", Vector2i(-2, 0)), "Hazard queries should reject blocked voluntary movement")
	engine.advance_phase()
	engine.advance_phase()
	engine.advance_phase()
	_assert(not engine.board.has_hazard(destination, &"burning"), "Hazards should expire after their authored duration")

func _test_timeline_actions() -> void:
	var hunt = load("res://resources/boss/programs/embermaw_hunt.tres")
	var engine = _engine([], [hunt])
	_advance_to_quick(engine)
	_assert(engine.phase == &"quick", "Instant Row should resolve before the Quick Window")
	_assert(engine.board.has_hazard(Vector2i(0, 0), &"scorched"), "TimelineResolver should turn Ash Trail into ApplyHazardAction records")
	engine.advance_phase()
	engine.advance_phase()
	_assert(engine.phase == &"slow", "Incoming Row should resolve before the Slow Window")
	_assert(engine.board.get_entity_id_at(Vector2i(-2, 1)).begins_with("whelp_"), "Brood Call should emit SpawnMinionAction records")
	_assert(_history_has(engine, EncounterActionModel.Kind.RESOLVE_BOSS), "Boss beats should remain first-class ResolveBossAction records")
	_assert(_history_has(engine, EncounterActionModel.Kind.SPAWN_MINION), "Boss follow-ups should remain first-class SpawnMinionAction records")

func _test_round_start_status() -> void:
	var engine = _engine([])
	var stance := StatusEffectModel.new(&"stance", 2, [StatusEffectModel.ON_ROUND_START])
	stance.armor_on_round_start = 2
	engine.add_status(&"guardian", stance)
	for _step in 5:
		engine.advance_phase()
	_assert(engine.round == 2 and engine.phase == &"loadout", "Slow Window should start the next Round at Loadout")
	_assert(engine.get_hero(&"guardian")["armor"] == 2, "on_round_start should apply status effects before the next Instant Row")
	for _step in 5:
		engine.advance_phase()
	_assert(engine.status_effects[&"guardian"].is_empty(), "Status Effects should expire after their authored duration")

func _engine(hand: Array, programs: Array = []):
	var engine := EncounterEngineModel.new()
	engine.start({
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": FacingDirections.Direction.SOUTH_WEST},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "energy": 3, "energy_per_round": 3, "stamina": 0, "slot_count": 2, "hand": hand}],
		"primary_hero_id": &"guardian",
		"programs": programs,
		"brood_spawn_candidates": [Vector2i(-2, 1), Vector2i(-1, 2), Vector2i(0, 2), Vector2i(2, -2), Vector2i(2, -1)],
	})
	return engine

func _advance_to_quick(engine) -> void:
	engine.advance_phase()
	engine.advance_phase()

func _history_has(engine, kind) -> bool:
	for action in engine.history:
		if action.kind == kind:
			return true
	return false

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
