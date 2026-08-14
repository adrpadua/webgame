extends SceneTree

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const ENCOUNTER := preload("res://resources/encounters/embermaw_prototype.tres")
const EMBER_PATTERN := preload("res://resources/boss/programs/embermaw_embers.tres")
const IRON_GUARD := preload("res://resources/cards/tank/iron_guard.tres")

var failures: Array[String] = []

func _initialize() -> void:
	_assert(EMBER_PATTERN.id == &"embermaw_embers", "The live-path Probe must use the production Ember Pattern Resource.")
	var authored_claw = _incoming_raking_claw()
	_assert(authored_claw != null, "Ember Pattern must author Raking Claw in its Incoming Row.")
	if authored_claw != null:
		_assert(authored_claw.damage_classification == &"tank_hit" and authored_claw.damage == 4, "The production Incoming Raking Claw must remain an authored 4-damage Tank Hit.")
		_assert(authored_claw.target_selector == &"tank", "The production Incoming Raking Claw must target the Tank.")
		_assert(authored_claw.rules_text == "Target: Tank. Deal 4 damage. Movement does not evade this hit.", "The production Incoming Raking Claw must use the approved targeted-hit rules text.")
		_assert(authored_claw.counter_tags == [&"Mitigate"], "The production Incoming Raking Claw must expose Mitigate as its only counter tag.")

	var engine := EncounterEngineModel.new()
	engine.start(_config())
	_assert(engine.apply(EncounterActionModel.load_slot(ENCOUNTER.primary_hero_id, 0, IRON_GUARD)).succeeded, "Loadout must install the first production Iron Guard.")
	engine.advance_phase()
	engine.advance_phase()
	_assert(engine.phase == &"quick", "Ember Pattern must enter Quick after its production Instant Row.")
	_assert(engine.apply(EncounterActionModel.charge_slot(ENCOUNTER.primary_hero_id, 0, IRON_GUARD)).succeeded, "Quick must Charge Iron Guard with the second production Iron Guard.")
	_assert(engine.apply(EncounterActionModel.fire_slot(ENCOUNTER.primary_hero_id, 0)).succeeded, "The charged Iron Guard must fire legally in Quick.")
	_assert(engine.get_hero(ENCOUNTER.primary_hero_id)["armor"] == 4, "Iron Guard plus one Guard Charge must grant 4 Armor.")
	_assert(not engine.has_status(ENCOUNTER.primary_hero_id, &"riposte_ready"), "Riposte Ready must not grant before Incoming Raking Claw.")
	engine.advance_phase()
	var incoming_actions: Array = engine.advance_phase()
	var damage = _raking_claw_damage(incoming_actions)
	_assert(engine.phase == &"slow", "The production Incoming Row must complete into Slow.")
	_assert(damage != null, "The production Incoming Raking Claw must resolve a Damage action.")
	if damage != null:
		var fact: Dictionary = damage.payload.get("resolution_fact", {})
		_assert(fact.get("damage_classification") == &"tank_hit", "The live Damage fact must retain Tank Hit classification.")
		_assert(fact.get("target_selector") == &"tank", "The live Damage fact must retain the authored Tank selector.")
		_assert(fact.get("boss_beat_id") == &"raking_claw" and fact.get("boss_track") == &"incoming", "The live Damage fact must retain authored Beat and Incoming track.")
		_assert(fact.get("requested") == 4 and fact.get("prevented") == 4 and fact.get("health_loss") == 0, "The production Iron Guard line must fully mitigate Incoming Raking Claw.")
		_assert(fact.get("guarded_front", false), "The production Guardian must remain in Guarded Front.")
		_assert(fact.get("status_evaluation", {}) == {"status_id": &"riposte_ready", "result": &"granted", "reason": &"qualifying_tank_hit"}, "The live Damage fact must record the exact Riposte Ready grant.")
	_assert(engine.has_status(ENCOUNTER.primary_hero_id, &"riposte_ready"), "The real Ember Pattern path must grant Riposte Ready after Incoming Raking Claw.")

	if failures.is_empty():
		print("RIPOSTE_PRODUCTION_PATH_PROBE_OK")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _config() -> Dictionary:
	return {
		"board_radius": ENCOUNTER.board_radius,
		"round_limit": ENCOUNTER.round_limit,
		"enrage_text": ENCOUNTER.enrage_text,
		"random_seed": ENCOUNTER.random_seed,
		"boss": {
			"id": ENCOUNTER.boss_id,
			"title": ENCOUNTER.boss_title,
			"coords": ENCOUNTER.boss_start,
			"health": ENCOUNTER.boss_health,
			"facing": FacingDirections.Direction.SOUTH_WEST,
		},
		"heroes": [{
			"id": ENCOUNTER.primary_hero_id,
			"title": ENCOUNTER.primary_hero_title,
			"coords": ENCOUNTER.player_start,
			"health": ENCOUNTER.player_health,
			"slot_count": ENCOUNTER.slot_count,
			"refill_target": ENCOUNTER.hand_refill_target,
			"hand": [IRON_GUARD, IRON_GUARD],
		}],
		"primary_hero_id": ENCOUNTER.primary_hero_id,
		"programs": [EMBER_PATTERN],
		"loop_programs": false,
		"brood_spawn_candidates": ENCOUNTER.brood_spawn_candidates,
	}

func _incoming_raking_claw():
	for beat in EMBER_PATTERN.incoming_beats:
		if beat.id == &"raking_claw":
			return beat
	return null

func _raking_claw_damage(actions: Array):
	for action in actions:
		for generated in action.generated_actions:
			if generated.kind == EncounterActionModel.Kind.DAMAGE and generated.payload.get("resolution_fact", {}).get("boss_beat_id") == &"raking_claw":
				return generated
	return null

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
