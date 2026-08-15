extends SceneTree

const BossProgramBeatModel := preload("res://scripts/boss/BossProgramBeat.gd")
const BossProgramDataModel := preload("res://scripts/boss/BossProgramData.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")
const HazardEffectModel := preload("res://scripts/sdk/HazardEffect.gd")

const FORTIFY := preload("res://resources/cards/tank/fortify.tres")
const IRON_GUARD := preload("res://resources/cards/tank/iron_guard.tres")
const STEADY_STRIKE := preload("res://resources/cards/tank/steady_strike.tres")
const SWEEPING_BLOW := preload("res://resources/cards/tank/sweeping_blow.tres")

var failures: Array[String] = []

func _initialize() -> void:
	_test_contract_shape_and_boss_timeline()
	_test_guarded_front_projection()
	_test_charge_opportunity()
	_test_iron_guard_opportunity()
	_test_riposte_lifecycle_projection()
	_test_slow_fortify_opportunity()
	_test_whelp_pressure_authoritative_relevance()
	if failures.is_empty():
		print("TUTORIAL_PROMPT_PROJECTION_PROBE_OK prompts=7")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _test_contract_shape_and_boss_timeline() -> void:
	var engine: EncounterEngine = _engine(_program(&"instant", &"incoming"))
	var projection := engine.get_tutorial_prompt_projection()
	_assert(projection.get("one_at_a_time") == true, "The tutorial projection must retain the one-prompt-at-a-time policy.")
	_assert(projection.get("prompts", []).size() == 7, "The tutorial projection must expose exactly the seven authored prompt contracts.")
	var prompt := _prompt(projection, &"boss_timeline")
	_assert(prompt.get("relevant"), "Boss Timeline must be relevant before the first player action in Round 1.")
	_assert(prompt.get("priority") == 100 and prompt.get("anchor") == &"boss_timeline", "Boss Timeline must expose authored priority and anchor.")
	_assert(prompt.get("show_once", {}).get("scope") == &"raid_run", "Boss Timeline must be a Raid Run show-once prompt.")
	_assert(prompt.get("dismissal", {}).get("state") == &"dismissible", "Prompts must be non-blocking and dismissible.")
	_assert(not str(prompt.get("accessible_full_text", {}).get("text", "")).is_empty(), "Prompts must expose accessible full-text fallback.")
	_assert(projection.get("current_prompt_id") == &"boss_timeline", "Priority selection must choose Boss Timeline first when it is relevant.")
	engine.advance_phase()
	engine.advance_phase()
	prompt = _prompt(engine.get_tutorial_prompt_projection(), &"boss_timeline")
	_assert(not prompt.get("relevant") and prompt.get("completion", {}).get("state") == &"completed", "Boss Timeline must complete after the first player window begins.")

func _test_guarded_front_projection() -> void:
	var engine: EncounterEngine = _engine(_program(&"", &"incoming"), [STEADY_STRIKE], Vector2i(0, 1))
	var prompt := _prompt(engine.get_tutorial_prompt_projection(), &"guarded_front")
	_assert(prompt.get("relevant"), "Guarded Front must be relevant for an explicit visible Tank Hit.")
	_assert(prompt.get("authoritative_basis", {}).get("guarded_front_hex") == Vector2i(0, 0), "Guarded Front must be projected from authoritative Boss facing rather than reconstructed by the HUD.")
	_assert(not prompt.get("authoritative_basis", {}).get("hero_is_in_guarded_front"), "Guarded Front projection must distinguish an off-front Hero.")
	var no_tank: EncounterEngine = _engine([])
	_assert(not _prompt(no_tank.get_tutorial_prompt_projection(), &"guarded_front").get("relevant"), "Guarded Front must stay irrelevant without an authored Tank Hit.")

func _test_charge_opportunity() -> void:
	var engine: EncounterEngine = _engine([], [STEADY_STRIKE, IRON_GUARD])
	_assert(engine.apply(EncounterActionModel.load_slot(&"guardian", 0, STEADY_STRIKE)).succeeded, "Charge projection setup must load a Top Card through the public engine seam.")
	_to_quick(engine)
	var prompt := _prompt(engine.get_tutorial_prompt_projection(), &"charge_a_slot")
	_assert(prompt.get("relevant"), "Charge a Slot must require a legal player-window charge opportunity.")
	_assert(prompt.get("authoritative_basis", {}).get("slot_indexes") == [0], "Charge projection must name the legally chargeable Slot.")
	var invalid: EncounterEngine = _engine([], [STEADY_STRIKE])
	invalid.apply(EncounterActionModel.load_slot(&"guardian", 0, STEADY_STRIKE))
	_to_quick(invalid)
	_assert(not _prompt(invalid.get_tutorial_prompt_projection(), &"charge_a_slot").get("relevant"), "Charge a Slot must stay irrelevant when no hand card can legally charge a Slot.")

func _test_iron_guard_opportunity() -> void:
	var engine: EncounterEngine = _engine(_program(&"", &"incoming"), [IRON_GUARD, STEADY_STRIKE])
	var prompt := _prompt(engine.get_tutorial_prompt_projection(), &"iron_guard_armor")
	_assert(prompt.get("relevant"), "Iron Guard must be relevant only when the upcoming Tank Hit can still be answered in time.")
	_assert(prompt.get("authoritative_basis", {}).get("actions") == [&"load_slot", &"charge_slot", &"fire_slot"], "Iron Guard must project the legal preparation sequence instead of relying on card text or timing UI inference.")
	var instant_tank: EncounterEngine = _engine(_program(&"instant", &""), [IRON_GUARD, STEADY_STRIKE])
	_assert(not _prompt(instant_tank.get_tutorial_prompt_projection(), &"iron_guard_armor").get("relevant"), "Iron Guard must stay irrelevant when the next Tank Hit resolves before the Quick Window.")

func _test_riposte_lifecycle_projection() -> void:
	var engine: EncounterEngine = _engine(_program(&"", &"incoming"), [], Vector2i(0, 0), 4)
	engine.advance_phase()
	engine.advance_phase()
	engine.advance_phase()
	engine.advance_phase()
	var prompt := _prompt(engine.get_tutorial_prompt_projection(), &"riposte_ready")
	_assert(prompt.get("relevant"), "Riposte Ready must become relevant from a newly granted authoritative status event.")
	_assert(prompt.get("authoritative_basis", {}).get("status_event", {}).get("reason") == &"qualifying_tank_hit", "Riposte projection must preserve the qualifying grant reason.")
	_assert(prompt.get("authoritative_basis", {}).get("expires_at_window_end") == &"quick", "Riposte projection must preserve the authoritative expiry boundary.")
	var dismissed := _prompt(engine.get_tutorial_prompt_projection({&"riposte_ready": {"dismissed": true}}), &"riposte_ready")
	_assert(dismissed.get("show_once", {}).get("state") == &"already_shown" and dismissed.get("dismissal", {}).get("state") == &"dismissed", "Presentation dismissal must suppress a contextual repeat without changing rules state.")
	engine.advance_phase()
	engine.advance_phase()
	engine.advance_phase()
	engine.advance_phase()
	prompt = _prompt(engine.get_tutorial_prompt_projection(), &"riposte_ready")
	_assert(not prompt.get("relevant") and prompt.get("completion", {}).get("state") == &"expired", "Riposte projection must report the authoritative expiry after the following Quick Window.")

func _test_slow_fortify_opportunity() -> void:
	var engine: EncounterEngine = _engine([], [FORTIFY])
	_to_slow(engine)
	var prompt := _prompt(engine.get_tutorial_prompt_projection(), &"slow_fortify")
	_assert(prompt.get("relevant"), "Slow/Fortify must be relevant in Slow when Fortify can legally be loaded.")
	_assert(prompt.get("authoritative_basis", {}).get("actions").has(&"load_slot"), "Slow/Fortify must project the actual legal Fortify action.")
	var invalid: EncounterEngine = _engine([], [STEADY_STRIKE])
	_to_slow(invalid)
	_assert(not _prompt(invalid.get_tutorial_prompt_projection(), &"slow_fortify").get("relevant"), "Slow/Fortify must stay irrelevant when Fortify has no legal opportunity.")

func _test_whelp_pressure_authoritative_relevance() -> void:
	var route_blocked: EncounterEngine = _engine([])
	_to_quick(route_blocked)
	_add_whelp(route_blocked, &"route_whelp", Vector2i(0, 1))
	var prompt := _prompt(route_blocked.get_tutorial_prompt_projection(), &"whelp_pressure")
	_assert(prompt.get("relevant"), "Whelp pressure must become relevant for an authoritative route blocker.")
	var route_basis: Array = prompt.get("authoritative_basis", {}).get("route_blocking_relevance", [])
	_assert(route_basis.size() == 1 and route_basis[0].get("reason") == &"adjacent_legal_move_occupied", "Whelp pressure must expose route-blocking relevance as an explicit authoritative fact.")

	var irrelevant: EncounterEngine = _engine([])
	_to_quick(irrelevant)
	_add_whelp(irrelevant, &"distant_whelp", Vector2i(2, -2))
	_assert(not _prompt(irrelevant.get_tutorial_prompt_projection(), &"whelp_pressure").get("relevant"), "A distant Whelp without a legal target or blocked legal route must remain irrelevant.")
	var hazardous = _engine([])
	_to_quick(hazardous)
	_add_whelp(hazardous, &"hazard_whelp", Vector2i(0, 1))
	hazardous.board.add_hazard(Vector2i(0, 1), HazardEffectModel.new(&"scorched", 1, 0, true))
	_assert(not _prompt(hazardous.get_tutorial_prompt_projection(), &"whelp_pressure").get("relevant"), "A Whelp on an already blocked voluntary destination must not masquerade as route pressure.")

	var sweeping: EncounterEngine = _engine([], [SWEEPING_BLOW, IRON_GUARD])
	sweeping.apply(EncounterActionModel.load_slot(&"guardian", 0, SWEEPING_BLOW))
	_to_quick(sweeping)
	_add_whelp(sweeping, &"target_whelp", Vector2i(0, 1))
	sweeping.apply(EncounterActionModel.charge_slot(&"guardian", 0, IRON_GUARD))
	prompt = _prompt(sweeping.get_tutorial_prompt_projection(), &"whelp_pressure")
	_assert(prompt.get("authoritative_basis", {}).get("legal_sweeping_blow_target_ids") == [&"target_whelp"], "Whelp pressure must project legal Sweeping Blow targets from engine facts.")

func _engine(programs: Array, hand: Array = [], hero_coords: Vector2i = Vector2i(0, 0), armor: int = 0) -> EncounterEngine:
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

func _program(instant_track: StringName, incoming_track: StringName) -> Array:
	var program := BossProgramDataModel.new()
	program.id = &"tutorial_prompt_program"
	if instant_track == &"instant":
		program.instant_beats = [_tank_hit(&"instant_tank_hit")]
	if incoming_track == &"incoming":
		program.incoming_beats = [_tank_hit(&"incoming_tank_hit")]
	return [program]

func _tank_hit(id: StringName):
	var beat := BossProgramBeatModel.new()
	beat.id = id
	beat.title = "Tutorial Tank Hit"
	beat.kind = BossProgramBeatModel.Kind.RAKING_CLAW
	beat.target_selector = BossProgramBeatModel.TARGET_SELECTOR_TANK
	beat.damage_classification = &"tank_hit"
	beat.damage = 4
	return beat

func _add_whelp(engine, whelp_id: StringName, coords: Vector2i) -> void:
	_assert(engine.board.add_entity(whelp_id, &"minion", coords, 2, FacingDirections.Direction.NORTH_WEST, &"enemy"), "Whelp setup must place a Minion on an available board hex.")
	engine.board.get_entity(whelp_id)["content_id"] = &"whelp"

func _to_quick(engine) -> void:
	engine.advance_phase()
	engine.advance_phase()

func _to_slow(engine) -> void:
	for _step in 4:
		engine.advance_phase()

func _prompt(projection: Dictionary, id: StringName) -> Dictionary:
	for prompt in projection.get("prompts", []):
		if prompt.get("id", &"") == id:
			return prompt
	return {}

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
