extends SceneTree

# Probe contract: `EncounterEngine.legality` is the single pre-resolution
# statement of player-action rules, `EncounterEngine.legal_actions` enumerates
# exactly the candidate actions that predicate accepts, and `apply` succeeds if
# and only if the same predicate calls the action legal.

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const STRIKE := preload("res://resources/cards/tank/steady_strike.tres")
const GUARD := preload("res://resources/cards/tank/iron_guard.tres")
const SWEEP := preload("res://resources/cards/tank/sweeping_blow.tres")
const FORTIFY := preload("res://resources/cards/tank/fortify.tres")

var failures: Array[String] = []

func _initialize() -> void:
	_test_loadout_legality()
	_test_charge_and_replace_legality()
	_test_fire_legality()
	_test_fire_target_legality()
	_test_move_legality()
	_test_ended_encounter_legality()
	_test_legality_apply_parity()
	_test_legal_actions_enumeration()
	if failures.is_empty():
		print("LEGALITY_PROBE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _test_loadout_legality() -> void:
	var engine = _engine([STRIKE, GUARD])
	_assert_legal(engine.legality(_load(engine, 0, STRIKE)), "Loading an empty Slot must be legal during Loadout.")
	_assert_illegal(engine.legality(_charge(engine, 0, GUARD)), "Charging", "Charging must be illegal during Loadout.")
	_assert_illegal(engine.legality(_fire(engine, 0)), "loaded Slot", "Firing an empty Slot must be illegal.")
	_assert_illegal(engine.legality(_load(engine, 5, STRIKE)), "legal Slot", "Loading an out-of-range Slot index must be illegal.")
	_assert_illegal(engine.legality(_load(engine, 0, FORTIFY)), "unavailable", "Loading a card outside the Hand must be illegal.")

func _test_charge_and_replace_legality() -> void:
	var engine = _engine([STRIKE, GUARD, GUARD, GUARD, GUARD])
	engine.apply(_load(engine, 0, STRIKE))
	_assert_legal(engine.legality(_load(engine, 0, GUARD)), "Replacing an occupied Slot must be legal during Loadout.")
	_advance_to_quick(engine)
	_assert_illegal(engine.legality(_load(engine, 0, GUARD)), "Loadout", "Replacing an occupied Slot must be illegal outside Loadout.")
	_assert_legal(engine.legality(_charge(engine, 0, GUARD)), "Charging under the Charge Value must be legal during Quick.")
	for _index in STRIKE.get_charge_cap():
		engine.apply(_charge(engine, 0, GUARD))
	_assert_illegal(engine.legality(_charge(engine, 0, GUARD)), "cannot accept", "Charging past the Charge Value must be illegal.")
	engine.apply(_fire(engine, 0))
	var reloaded = _engine([STRIKE, GUARD, GUARD])
	reloaded.apply(_load(reloaded, 0, STRIKE))
	_advance_to_quick(reloaded)
	reloaded.apply(_charge(reloaded, 0, GUARD))
	reloaded.apply(_fire(reloaded, 0))
	_assert_illegal(reloaded.legality(_charge(reloaded, 0, GUARD)), "cannot accept", "Charging an activated Slot in its window must be illegal.")

func _test_fire_legality() -> void:
	var engine = _engine([STRIKE, FORTIFY, GUARD, GUARD])
	engine.apply(_load(engine, 0, STRIKE))
	engine.apply(_load(engine, 1, FORTIFY))
	_advance_to_quick(engine)
	engine.apply(_charge(engine, 0, GUARD))
	engine.apply(_charge(engine, 1, GUARD))
	_assert_legal(engine.legality(_fire(engine, 0)), "A charged Quick Top Card must be legal to fire during Quick.")
	_assert_illegal(engine.legality(_fire(engine, 1)), "cannot fire", "A Slow Top Card must be illegal to fire during Quick.")
	engine.apply(_fire(engine, 0))
	_assert_illegal(engine.legality(_fire(engine, 0)), "once", "A Slot must not fire twice in its matching window.")

func _test_fire_target_legality() -> void:
	var engine = _engine([SWEEP, GUARD])
	engine.apply(_load(engine, 0, SWEEP))
	_advance_to_quick(engine)
	engine.apply(_charge(engine, 0, GUARD))
	_assert_illegal(engine.legality(_fire(engine, 0)), "Minion target", "A damage Top Card must be illegal to fire without a Minion target.")
	engine.apply(EncounterActionModel.spawn_minion(engine.boss_id, &"whelp_far", Vector2i(2, 0)))
	var far_verdict: Dictionary = engine.legality(_fire(engine, 0, &"whelp_far"))
	_assert_illegal(far_verdict, "outside", "A Minion beyond the Top Card's range must be an illegal target.")
	_assert(int(far_verdict.get("target_range", -1)) == 2, "An out-of-range verdict must carry the measured target range.")
	engine.apply(EncounterActionModel.spawn_minion(engine.boss_id, &"whelp_near", Vector2i(0, 1)))
	_assert_legal(engine.legality(_fire(engine, 0, &"whelp_near")), "A Minion within range must be a legal target.")
	_assert_illegal(engine.legality(_fire(engine, 0, engine.boss_id)), "Minion target", "The Boss must not satisfy a Minion-target requirement.")

func _test_move_legality() -> void:
	var engine = _engine([STRIKE, GUARD])
	_assert_illegal(engine.legality(_move(engine, Vector2i(0, 1), STRIKE)), "Quick Window", "Movement must be illegal during Loadout.")
	_advance_to_quick(engine)
	_assert_legal(engine.legality(_move(engine, Vector2i(0, 1), STRIKE)), "Movement to an adjacent empty hex with a hand card must be legal during Quick.")
	_assert_illegal(engine.legality(_move(engine, Vector2i(1, -1), STRIKE)), "not a legal move", "Movement onto the Boss hex must be illegal.")
	_assert_illegal(engine.legality(_move(engine, Vector2i(0, 2), STRIKE)), "not a legal move", "Movement beyond one hex must be illegal.")
	_assert_illegal(engine.legality(_move(engine, Vector2i(0, 1), FORTIFY)), "hand card", "Movement without an owned hand card must be illegal.")
	engine.advance_phase()
	_assert_illegal(engine.legality(_move(engine, Vector2i(0, 1), STRIKE)), "Quick Window", "Movement must be illegal during Incoming and Slow.")

func _test_ended_encounter_legality() -> void:
	var engine = _engine([STRIKE, GUARD])
	engine.apply(EncounterActionModel.damage(engine.boss_id, &"guardian", 99, "probe"))
	_assert(not engine.active, "Lethal damage should end the Encounter for the ended-legality case.")
	_assert_illegal(engine.legality(_load(engine, 0, STRIKE)), "already ended", "Every action must be illegal after the Encounter ends.")
	_assert(engine.legal_actions(&"guardian").is_empty(), "An ended Encounter must enumerate no legal actions.")

func _test_legality_apply_parity() -> void:
	# apply must succeed exactly when legality said the action was legal, with
	# the same reason on rejection, across representative player actions.
	var engine = _engine([STRIKE, SWEEP, GUARD, GUARD, GUARD])
	_advance_to_quick(engine)
	var script: Array = [
		_load(engine, 0, STRIKE),
		_load(engine, 1, SWEEP),
		_charge(engine, 0, GUARD),
		_charge(engine, 0, GUARD),
		_charge(engine, 5, GUARD),
		_fire(engine, 1),
		_fire(engine, 0),
		_fire(engine, 0),
		_move(engine, Vector2i(0, 1), GUARD),
		_move(engine, Vector2i(0, 1), FORTIFY),
	]
	var legal_count := 0
	for entry in script:
		var verdict: Dictionary = engine.legality(entry)
		var resolved = engine.apply(entry)
		_assert(bool(verdict["legal"]) == resolved.succeeded, "legality and apply must agree for kind %d (verdict=%s, applied=%s)." % [entry.kind, verdict, resolved.succeeded])
		if resolved.succeeded:
			legal_count += 1
		else:
			_assert(str(verdict["reason"]) == resolved.reason, "legality and apply must report the same rejection reason (got %s vs %s)." % [verdict["reason"], resolved.reason])
	_assert(legal_count == 6, "The parity script must exercise both legal and illegal branches (legal=%d)." % legal_count)

func _test_legal_actions_enumeration() -> void:
	var engine = _engine([STRIKE, GUARD])
	var loadout_actions: Array = engine.legal_actions(&"guardian")
	_assert(loadout_actions.size() == 4, "Loadout with two hand cards and two empty Slots must enumerate exactly four load actions.")
	for action in loadout_actions:
		_assert(action.kind == EncounterActionModel.Kind.LOAD_SLOT, "Loadout enumeration must contain only load actions.")
	engine.apply(_load(engine, 0, STRIKE))
	_advance_to_quick(engine)
	var quick_actions: Array = engine.legal_actions(&"guardian")
	_assert(_count_kind(quick_actions, EncounterActionModel.Kind.CHARGE_SLOT) > 0, "Quick enumeration must offer charges for the loaded Slot.")
	_assert(_count_kind(quick_actions, EncounterActionModel.Kind.FIRE_SLOT) == 0, "An uncharged Slot must not enumerate a fire action.")
	_assert(_count_kind(quick_actions, EncounterActionModel.Kind.MOVE_HERO) > 0, "Quick enumeration must offer adjacent moves while a hand card remains.")
	for action in quick_actions:
		_assert(engine.legality(action)["legal"], "Every enumerated action must itself be legal.")
	engine.apply(_charge(engine, 0, GUARD))
	_assert(_count_kind(engine.legal_actions(&"guardian"), EncounterActionModel.Kind.FIRE_SLOT) == 1, "A charged boss-damage Top Card must enumerate exactly one fire action.")
	# A charged Minion-damage Top Card enumerates fires only for reachable Minions.
	var sweep_engine = _engine([SWEEP, GUARD])
	sweep_engine.apply(_load(sweep_engine, 0, SWEEP))
	_advance_to_quick(sweep_engine)
	sweep_engine.apply(_charge(sweep_engine, 0, GUARD))
	_assert(_count_kind(sweep_engine.legal_actions(&"guardian"), EncounterActionModel.Kind.FIRE_SLOT) == 0, "A Minion-damage Top Card with no Minion in range must enumerate no fire action.")
	sweep_engine.apply(EncounterActionModel.spawn_minion(sweep_engine.boss_id, &"whelp_near", Vector2i(0, 1)))
	var fire_actions: Array = sweep_engine.legal_actions(&"guardian").filter(func(action) -> bool: return action.kind == EncounterActionModel.Kind.FIRE_SLOT)
	_assert(fire_actions.size() == 1, "One reachable Minion must enumerate exactly one fire action.")
	_assert(fire_actions[0].payload.get("target_id", &"") == &"whelp_near", "The enumerated fire action must name the reachable Minion target.")

func _engine(hand: Array):
	var engine := EncounterEngineModel.new()
	engine.start({
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": FacingDirections.Direction.SOUTH_WEST},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "slot_count": 2, "hand": hand, "refill_target": hand.size()}],
		"primary_hero_id": &"guardian",
	})
	return engine

func _advance_to_quick(engine) -> void:
	engine.advance_phase()
	engine.advance_phase()

func _load(engine, slot_index: int, card):
	return EncounterActionModel.load_slot(engine.primary_hero_id, slot_index, card)

func _charge(engine, slot_index: int, card):
	return EncounterActionModel.charge_slot(engine.primary_hero_id, slot_index, card)

func _fire(engine, slot_index: int, target_id: StringName = &""):
	return EncounterActionModel.fire_slot(engine.primary_hero_id, slot_index, target_id)

func _move(engine, destination: Vector2i, card):
	return EncounterActionModel.move_hero(engine.primary_hero_id, destination, card)

func _count_kind(actions: Array, kind: int) -> int:
	var count := 0
	for action in actions:
		if action.kind == kind:
			count += 1
	return count

func _assert_legal(verdict: Dictionary, message: String) -> void:
	_assert(bool(verdict.get("legal", false)) and str(verdict.get("reason", "?")).is_empty(), "%s (verdict=%s)" % [message, verdict])

func _assert_illegal(verdict: Dictionary, reason_contains: String, message: String) -> void:
	_assert(not bool(verdict.get("legal", true)) and str(verdict.get("reason", "")).contains(reason_contains), "%s (verdict=%s)" % [message, verdict])

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
