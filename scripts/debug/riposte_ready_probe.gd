extends SceneTree

const BossProgramBeatModel := preload("res://scripts/boss/BossProgramBeat.gd")
const BossProgramDataModel := preload("res://scripts/boss/BossProgramData.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const Serializer := preload("res://scripts/debug/EncounterProbeSerializer.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const SHIELD_SLAM := preload("res://resources/cards/tank/shield_slam.tres")
const IRON_GUARD := preload("res://resources/cards/tank/iron_guard.tres")
const STEADY_STRIKE := preload("res://resources/cards/tank/steady_strike.tres")

var failures: Array[String] = []

func _initialize() -> void:
	_test_grant_and_non_refresh()
	_test_non_grants()
	_test_instant_expiry()
	_test_incoming_expiry()
	_test_shield_slam_consumption()
	_test_off_payoff_consumption()
	_test_replay_equality()
	if failures.is_empty():
		print("RIPOSTE_READY_PROBE_OK")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _test_grant_and_non_refresh() -> void:
	var engine = _engine(_tank_program(&"instant"), 8)
	engine.advance_phase()
	var actions: Array = engine.advance_phase()
	var damage = _damage_action(actions)
	_assert(damage != null and damage.succeeded, "A qualifying Tank Hit must resolve damage.")
	_assert(engine.has_status(&"guardian", &"riposte_ready"), "A fully mitigated Tank Hit in Guarded Front must grant Riposte Ready.")
	var fact: Dictionary = damage.payload.get("resolution_fact", {})
	_assert(fact.get("damage_classification") == &"tank_hit", "Tank Hit identity must survive into the Damage Resolution Fact.")
	_assert(fact.get("target_selector") == &"tank", "Tank Hit facts must preserve the authored Tank selector.")
	_assert(fact.get("boss_beat_id") == &"probe_tank_hit", "Instant Tank Hit facts must preserve the authored Beat ID.")
	_assert(fact.get("boss_track") == &"instant", "Instant Tank Hit facts must preserve their authored track.")
	_assert(fact.get("guarded_front", false), "The Damage Resolution Fact must record the Guarded Front predicate.")
	_assert(fact.get("status_evaluation", {}) == {"status_id": &"riposte_ready", "result": &"granted", "reason": &"qualifying_tank_hit"}, "The qualifying Tank Hit must record the full grant evaluation.")
	_assert_lifecycle_event(fact.get("status_event", {}), &"granted", &"qualifying_tank_hit", "grant")
	var effect = engine.get_status(&"guardian", &"riposte_ready")
	var trigger_round: int = effect.trigger_round
	var trigger_phase: StringName = effect.trigger_phase
	var repeated = engine.apply(EncounterActionModel.damage(&"embermaw", &"guardian", 4, "Repeated Tank Hit", {
		"damage_classification": &"tank_hit",
		"boss_beat_id": &"repeated_tank_hit",
		"boss_track": &"instant",
	}))
	_assert(engine.status_effects[&"guardian"].size() == 1, "A repeated qualifying hit must not stack Riposte Ready.")
	_assert(effect.trigger_round == trigger_round and effect.trigger_phase == trigger_phase, "A repeated qualifying hit must not refresh Riposte Ready.")
	_assert(repeated.payload["resolution_fact"].get("status_evaluation", {}).get("reason") == &"already_active", "A non-refresh must be explicit in the Damage Resolution Fact.")
	var serialized: Dictionary = Serializer.action(damage)
	_assert(serialized["payload"]["resolution_fact"]["status_event"]["event"] == "granted", "Encounter Record normalization must preserve status lifecycle facts.")
	var status_projection: Dictionary = Serializer.snapshot(engine)["status_effects"][0]["effects"][0]
	_assert(status_projection["id"] == "riposte_ready" and status_projection["trigger_reason"] == "qualifying_tank_hit", "The authoritative status projection must expose identity and trigger reason.")
	_assert(status_projection["expires_at_window_end"] == "quick" and status_projection["consume_on_card_id"] == "shield_slam", "The status projection must expose expiry and consumption boundaries.")

func _test_non_grants() -> void:
	var exposed = _engine(_tank_program(&"instant"), 0)
	exposed.advance_phase()
	var exposed_damage = _damage_action(exposed.advance_phase())
	_assert(not exposed.has_status(&"guardian", &"riposte_ready"), "A Tank Hit that causes Health loss must not grant Riposte Ready.")
	_assert(exposed_damage.payload["resolution_fact"]["status_evaluation"]["reason"] == &"health_lost", "Health-loss non-grant reason must be explicit.")

	var off_front = _engine(_tank_program(&"instant"), 8, Vector2i(0, 1))
	off_front.advance_phase()
	var off_front_damage = _damage_action(off_front.advance_phase())
	_assert(not off_front.has_status(&"guardian", &"riposte_ready"), "A mitigated Tank Hit outside Guarded Front must not grant Riposte Ready.")
	_assert(off_front_damage.payload["resolution_fact"]["status_evaluation"]["reason"] == &"not_guarded_front", "Position non-grant reason must be explicit.")

	var incidental = _engine([], 8)
	var incidental_damage = incidental.apply(EncounterActionModel.damage(&"embermaw", &"guardian", 4, "Incidental Boss damage"))
	_assert(not incidental.has_status(&"guardian", &"riposte_ready"), "Unclassified Boss damage must not grant Riposte Ready.")
	_assert(not incidental_damage.payload["resolution_fact"].has("status_evaluation"), "Incidental damage must not masquerade as a Tank Hit evaluation.")

func _test_instant_expiry() -> void:
	var engine = _engine(_tank_program(&"instant"), 8)
	engine.advance_phase()
	engine.advance_phase()
	_assert(engine.phase == &"quick" and engine.has_status(&"guardian", &"riposte_ready"), "An Instant Tank Hit must remain available during the following Quick Window.")
	var actions: Array = engine.advance_phase()
	var expiry = _status_expiry_action(actions)
	_assert(not engine.has_status(&"guardian", &"riposte_ready"), "Riposte Ready must expire when the first following Quick Window ends.")
	_assert(_status_expiry_count(actions) == 1, "Quick expiry must produce exactly one Expire Status action.")
	_assert(expiry != null, "Quick expiry must expose its engine-owned action.")
	if expiry != null:
		_assert_lifecycle_event(expiry.payload.get("resolution_fact", {}).get("status_event", {}), &"expired", &"expiry_window_ended", "expiry")
		_assert(Serializer.action(expiry)["payload"]["resolution_fact"]["status_event"]["reason"] == "expiry_window_ended", "Encounter Record normalization must preserve the expiry reason.")

func _test_incoming_expiry() -> void:
	var engine = _engine(_tank_program(&"incoming"), 8)
	engine.advance_phase()
	engine.advance_phase()
	engine.advance_phase()
	var incoming_actions: Array = engine.advance_phase()
	var incoming_damage = _damage_action(incoming_actions)
	_assert(engine.phase == &"slow" and engine.has_status(&"guardian", &"riposte_ready"), "An Incoming Tank Hit must grant Riposte Ready during Slow.")
	_assert(incoming_damage.payload["resolution_fact"].get("boss_track") == &"incoming", "Incoming Tank Hit facts must preserve their authored track.")
	_assert(incoming_damage.payload["resolution_fact"].get("target_selector") == &"tank", "Incoming Tank Hit facts must preserve the authored Tank selector.")
	engine.advance_phase()
	engine.advance_phase()
	engine.advance_phase()
	_assert(engine.phase == &"quick" and engine.has_status(&"guardian", &"riposte_ready"), "An Incoming grant must survive through the next Round's Quick Window.")
	engine.advance_phase()
	_assert(not engine.has_status(&"guardian", &"riposte_ready"), "An Incoming grant must expire only after that following Quick Window.")

func _test_shield_slam_consumption() -> void:
	var engine = _engine(_tank_program(&"instant"), 8, Vector2i(0, 0), [SHIELD_SLAM, IRON_GUARD, STEADY_STRIKE])
	_assert(engine.apply(EncounterActionModel.load_slot(&"guardian", 0, SHIELD_SLAM)).succeeded, "Shield Slam must load during Loadout.")
	engine.advance_phase()
	engine.advance_phase()
	var rejected = engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	_assert(not rejected.succeeded and engine.has_status(&"guardian", &"riposte_ready"), "A rejected Shield Slam must not consume Riposte Ready.")
	_assert(engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, IRON_GUARD)).succeeded, "Shield Slam must accept its setup Charge.")
	var boss_health_before: int = engine.board.get_entity(&"embermaw")["health"]
	var fired = engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	_assert(fired.succeeded, "A charged Shield Slam must fire legally in Quick.")
	_assert(not engine.has_status(&"guardian", &"riposte_ready"), "A legal Shield Slam must consume Riposte Ready.")
	_assert(boss_health_before - int(engine.board.get_entity(&"embermaw")["health"]) == 5, "Riposte Ready must add exactly 2 to Shield Slam's normal 3 Boss damage.")
	var consumption_event: Dictionary = fired.payload.get("resolution_fact", {}).get("status_event", {})
	_assert_lifecycle_event(consumption_event, &"consumed", &"matching_card_fired", "consumption")
	_assert(consumption_event.get("card_id") == &"shield_slam", "The consumption fact must name the matching Card.")
	_assert(consumption_event.get("bonus_boss_damage") == 2, "The consumption fact must record the +2 Boss-damage payoff.")
	_assert(Serializer.action(fired)["payload"]["resolution_fact"]["status_event"]["event"] == "consumed", "Encounter Record normalization must preserve consumption facts.")
	var payoff_damage = fired.generated_actions[0]
	var payoff_fact: Dictionary = payoff_damage.payload.get("resolution_fact", {})
	_assert(payoff_fact.get("requested") == 5 and payoff_fact.get("base_amount") == 3 and payoff_fact.get("status_bonus") == 2, "The Boss damage fact must separate Shield Slam base damage from the Riposte payoff.")
	_assert(payoff_fact.get("status_id") == &"riposte_ready" and payoff_fact.get("payoff_card_id") == &"shield_slam", "The payoff fact must identify its Status Effect and Card.")

	var nonmatching = _engine(_tank_program(&"instant"), 8, Vector2i(0, 0), [STEADY_STRIKE, IRON_GUARD])
	nonmatching.apply(EncounterActionModel.load_slot(&"guardian", 0, STEADY_STRIKE))
	nonmatching.advance_phase()
	nonmatching.advance_phase()
	nonmatching.apply(EncounterActionModel.charge_slot(&"guardian", 0, IRON_GUARD))
	nonmatching.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	_assert(nonmatching.has_status(&"guardian", &"riposte_ready"), "A legal non-Shield-Slam fire must not consume Riposte Ready.")

func _test_off_payoff_consumption() -> void:
	var engine = _engine(_tank_program(&"instant"), 8, Vector2i(0, 0), [STEADY_STRIKE, IRON_GUARD, SHIELD_SLAM])
	_assert(engine.apply(EncounterActionModel.load_slot(&"guardian", 0, STEADY_STRIKE)).succeeded, "Steady Strike must load during Loadout.")
	engine.advance_phase()
	engine.advance_phase()
	_assert(engine.has_status(&"guardian", &"riposte_ready"), "The qualifying Tank Hit must grant Riposte Ready before the off-payoff fire.")
	_assert(engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, IRON_GUARD)).succeeded, "Steady Strike must accept its Charge.")
	var boss_health_before: int = engine.board.get_entity(&"embermaw")["health"]
	var fired = engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	_assert(fired.succeeded, "A charged Steady Strike must fire legally in Quick.")
	_assert(not engine.has_status(&"guardian", &"riposte_ready"), "A non-payoff Boss-damage card must consume Riposte Ready.")
	_assert(boss_health_before - int(engine.board.get_entity(&"embermaw")["health"]) == 4, "An off-payoff consumption must add exactly 1 Boss damage (2 base + 1 charge + 1 Riposte).")
	var event: Dictionary = fired.payload.get("resolution_fact", {}).get("status_event", {})
	_assert(event.get("event", &"") == &"consumed" and event.get("reason", &"") == &"boss_damage_card_fired", "An off-payoff consumption must record its distinct lifecycle reason.")
	_assert(event.get("card_id", &"") == &"steady_strike" and int(event.get("bonus_boss_damage", 0)) == 1, "The off-payoff consumption event must name the consuming card and the +1 bonus.")

	var guard_engine = _engine(_tank_program(&"instant"), 8, Vector2i(0, 0), [IRON_GUARD, STEADY_STRIKE, SHIELD_SLAM])
	_assert(guard_engine.apply(EncounterActionModel.load_slot(&"guardian", 0, IRON_GUARD)).succeeded, "Iron Guard must load during Loadout.")
	guard_engine.advance_phase()
	guard_engine.advance_phase()
	_assert(guard_engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, STEADY_STRIKE)).succeeded, "Iron Guard must accept its Charge.")
	_assert(guard_engine.apply(EncounterActionModel.fire_slot(&"guardian", 0)).succeeded, "A charged Iron Guard must fire legally in Quick.")
	_assert(guard_engine.has_status(&"guardian", &"riposte_ready"), "A card with no Boss damage must not consume Riposte Ready.")

func _test_replay_equality() -> void:
	var first: String = JSON.stringify(_normalized_riposte_trace())
	var second: String = JSON.stringify(_normalized_riposte_trace())
	_assert(first == second, "Two identical Riposte Ready runs must produce equal normalized consume and expiry traces.")

func _normalized_riposte_trace() -> Dictionary:
	var consume_engine = _engine(_tank_program(&"instant"), 8, Vector2i(0, 0), [SHIELD_SLAM, IRON_GUARD])
	consume_engine.apply(EncounterActionModel.load_slot(&"guardian", 0, SHIELD_SLAM))
	consume_engine.advance_phase()
	consume_engine.advance_phase()
	consume_engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, IRON_GUARD))
	consume_engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))

	var expiry_engine = _engine(_tank_program(&"instant"), 8)
	expiry_engine.advance_phase()
	expiry_engine.advance_phase()
	expiry_engine.advance_phase()
	return {
		"consume": _normalized_history(consume_engine),
		"expiry": _normalized_history(expiry_engine),
	}

func _normalized_history(engine) -> Dictionary:
	var actions: Array = []
	for action in engine.history:
		actions.append(Serializer.action(action))
	return {"actions": actions, "snapshot": Serializer.snapshot(engine)}

func _engine(programs: Array, armor: int, hero_coords: Vector2i = Vector2i(0, 0), hand: Array = []):
	var engine := EncounterEngineModel.new()
	engine.start({
		"board_radius": 2,
		"boss": {"id": &"embermaw", "coords": Vector2i(1, 0), "health": 36, "facing": FacingDirections.Direction.WEST},
		"heroes": [{"id": &"guardian", "coords": hero_coords, "health": 34, "armor": armor, "slot_count": 2, "refill_target": 4, "hand": hand}],
		"primary_hero_id": &"guardian",
		"programs": programs,
		"loop_programs": true,
	})
	return engine

func _tank_program(track: StringName) -> Array:
	var beat := BossProgramBeatModel.new()
	beat.id = &"probe_tank_hit"
	beat.title = "Probe Tank Hit"
	beat.kind = BossProgramBeatModel.Kind.RAKING_CLAW
	beat.target_selector = BossProgramBeatModel.TARGET_SELECTOR_TANK
	beat.damage = 4
	beat.damage_classification = &"tank_hit"
	var program := BossProgramDataModel.new()
	program.id = &"probe_program"
	if track == &"instant":
		program.instant_beats = [beat]
	else:
		program.incoming_beats = [beat]
	return [program]

func _damage_action(actions: Array):
	for action in actions:
		for generated in action.generated_actions:
			if generated.kind == EncounterActionModel.Kind.DAMAGE:
				return generated
	return null

func _status_expiry_action(actions: Array):
	for action in actions:
		if action.kind == EncounterActionModel.Kind.EXPIRE_STATUS:
			return action
	return null

func _status_expiry_count(actions: Array) -> int:
	var count := 0
	for action in actions:
		if action.kind == EncounterActionModel.Kind.EXPIRE_STATUS:
			count += 1
	return count

func _assert_lifecycle_event(event: Dictionary, expected_event: StringName, expected_reason: StringName, label: String) -> void:
	_assert(event.get("status_id") == &"riposte_ready", "%s lifecycle fact must identify Riposte Ready." % label.capitalize())
	_assert(event.get("event") == expected_event, "%s lifecycle fact must identify its event." % label.capitalize())
	_assert(event.get("reason") == expected_reason, "%s lifecycle fact must identify its reason." % label.capitalize())
	_assert(event.get("expires_at_window_end") == &"quick", "%s lifecycle fact must retain the Quick expiry anchor." % label.capitalize())
	_assert(event.get("source_id") == &"embermaw", "%s lifecycle fact must retain the source Boss." % label.capitalize())
	_assert(event.get("source_beat_id") == &"probe_tank_hit", "%s lifecycle fact must retain the source Beat." % label.capitalize())
	_assert(event.get("trigger_round") == 1, "%s lifecycle fact must retain the trigger Round." % label.capitalize())
	_assert(event.get("trigger_phase") == &"instant", "%s lifecycle fact must retain the trigger phase." % label.capitalize())

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
