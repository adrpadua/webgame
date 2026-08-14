class_name EncounterEngine
extends RefCounted

const ActionResolverModel := preload("res://scripts/sdk/ActionResolver.gd")
const BoardStateModel := preload("res://scripts/hex/BoardState.gd")
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const BossProgramBeatModel := preload("res://scripts/boss/BossProgramBeat.gd")
const StatusEffectModel := preload("res://scripts/sdk/StatusEffect.gd")
const RulesRandomModel := preload("res://scripts/sdk/RulesRandom.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const TANK_HIT: StringName = &"tank_hit"
const RIPOSTE_READY: StringName = &"riposte_ready"
const SHIELD_SLAM: StringName = &"shield_slam"

var board := BoardStateModel.new()
var action_resolver := ActionResolverModel.new()
var timeline_resolver
var heroes: Dictionary = {}
var status_effects: Dictionary = {}
var boss_id: StringName = &""
var primary_hero_id: StringName = &""
var programs: Array = []
var loop_programs: bool = true
var current_program
var program_index: int = 0
var brood_spawn_candidates: Array[Vector2i] = []
var telegraphed_spawn_hexes: Array[Vector2i] = []
var telegraphs: Dictionary = {}
var previous_impacted_hexes: Array[Vector2i] = []
var last_pattern: Array[Vector2i] = []
var phase: StringName = &"loadout"
var round: int = 1
var round_limit: int = 8
var active: bool = false
var outcome: StringName = &"ongoing"
var outcome_reason: String = ""
var history: Array = []
var minion_sequence: int = 0
var enrage_text: String = "The Encounter Clock expired."
var random_source := RulesRandomModel.new()

func _init() -> void:
	var timeline_resolver_script = load("res://scripts/sdk/TimelineResolver.gd")
	timeline_resolver = timeline_resolver_script.new()

func start(config_source) -> void:
	var config: Dictionary = config_source if typeof(config_source) == TYPE_DICTIONARY else _config_from_encounter(config_source)
	random_source = config.get("random_source", null)
	if random_source == null:
		random_source = RulesRandomModel.new(int(config.get("random_seed", 1)))
	board.setup(int(config.get("board_radius", 2)))
	heroes.clear()
	status_effects.clear()
	history.clear()
	minion_sequence = 0
	programs = config.get("programs", []).duplicate()
	loop_programs = bool(config.get("loop_programs", true))
	program_index = 0
	current_program = programs[0] if not programs.is_empty() else null
	round_limit = max(int(config.get("round_limit", 8)), 1)
	enrage_text = str(config.get("enrage_text", "The Encounter Clock expired."))
	brood_spawn_candidates.clear()
	for coords in config.get("brood_spawn_candidates", []):
		brood_spawn_candidates.append(coords)
	telegraphed_spawn_hexes.clear()
	telegraphs.clear()
	previous_impacted_hexes.clear()
	last_pattern.clear()
	phase = &"loadout"
	round = 1
	active = true
	outcome = &"ongoing"
	outcome_reason = ""
	var boss: Dictionary = config.get("boss", {})
	boss_id = boss.get("id", &"boss")
	board.add_entity(boss_id, &"boss", boss.get("coords", Vector2i.ZERO), int(boss.get("health", 36)), int(boss.get("facing", 4)), &"enemy")
	if board.has_entity(boss_id):
		board.get_entity(boss_id)["title"] = str(boss.get("title", "Boss"))
	for hero_config in config.get("heroes", []):
		_add_hero(hero_config)
	primary_hero_id = config.get("primary_hero_id", heroes.keys()[0] if not heroes.is_empty() else &"")
	_refresh_telegraphs()
	check_resolution()

func _config_from_encounter(encounter) -> Dictionary:
	if encounter == null:
		return {}
	return {
		"board_radius": encounter.board_radius,
		"round_limit": encounter.round_limit,
		"enrage_text": encounter.enrage_text,
		"random_seed": encounter.random_seed,
		"boss": {
			"id": encounter.boss_id,
			"title": encounter.boss_title,
			"coords": encounter.boss_start,
			"health": encounter.boss_health,
			"facing": FacingDirections.Direction.SOUTH_WEST,
		},
		"heroes": [{
			"id": encounter.primary_hero_id,
			"title": encounter.primary_hero_title,
			"coords": encounter.player_start,
			"health": encounter.player_health,
			"facing": FacingDirections.Direction.NORTH_EAST,
			"slot_count": encounter.slot_count,
			"refill_target": encounter.hand_refill_target,
			"deck": encounter.player_deck,
			"shuffle_deck": true,
		}],
		"primary_hero_id": encounter.primary_hero_id,
		"programs": encounter.boss_programs,
		"loop_programs": encounter.loop_boss_programs,
		"brood_spawn_candidates": encounter.brood_spawn_candidates,
	}

func apply(action):
	var generated: Array = action_resolver.resolve(self, action)
	history.append(action)
	for followup in generated:
		action.generated_actions.append(followup)
		apply(followup)
	check_resolution()
	return action

func advance_phase() -> Array:
	if not active:
		return []
	var actions: Array = []
	match phase:
		&"loadout":
			phase = &"instant"
		&"instant":
			actions = timeline_resolver.actions_for_track(self, &"instant")
			for action in actions:
				apply(action)
			phase = &"quick"
			_start_window(&"quick")
			_refresh_telegraphs()
		&"quick":
			var expiry_actions := _status_expiry_actions(&"quick")
			for expiry_action in expiry_actions:
				apply(expiry_action)
			actions.append_array(expiry_actions)
			_cleanup_slots(&"quick")
			phase = &"incoming"
		&"incoming":
			_refresh_telegraphs()
			actions = timeline_resolver.actions_for_track(self, &"incoming")
			for action in actions:
				apply(action)
			phase = &"slow"
			_start_window(&"slow")
		&"slow":
			_cleanup_slots(&"slow")
			round += 1
			if round > round_limit:
				active = false
				outcome = &"defeat"
				outcome_reason = enrage_text
				return actions
			_start_round()
			if programs.is_empty():
				program_index = 0
				current_program = null
			elif loop_programs:
				program_index = (program_index + 1) % programs.size()
				current_program = programs[program_index]
			else:
				program_index += 1
				current_program = programs[program_index] if program_index < programs.size() else null
			phase = &"loadout"
			_refresh_telegraphs()
	check_resolution()
	return actions

func legality(action) -> Dictionary:
	return action_resolver.legality(self, action)

func legal_actions(hero_id: StringName) -> Array:
	return action_resolver.legal_actions(self, hero_id)

func get_hero(hero_id: StringName) -> Dictionary:
	return heroes.get(hero_id, {})

func put_hero(hero_id: StringName, hero: Dictionary) -> void:
	heroes[hero_id] = hero
	if board.has_entity(hero_id):
		board.get_entity(hero_id)["health"] = hero["health"]

func add_status(entity_id: StringName, effect) -> bool:
	if not board.has_entity(entity_id) or effect == null:
		return false
	if not status_effects.has(entity_id):
		status_effects[entity_id] = []
	status_effects[entity_id].append(effect)
	return true

func has_status(entity_id: StringName, status_id: StringName) -> bool:
	return get_status(entity_id, status_id) != null

func get_status(entity_id: StringName, status_id: StringName):
	for effect in status_effects.get(entity_id, []):
		if effect.id == status_id:
			return effect
	return null

func remove_status(entity_id: StringName, status_id: StringName) -> bool:
	var effects: Array = status_effects.get(entity_id, [])
	for index in effects.size():
		if effects[index].id == status_id:
			effects.remove_at(index)
			status_effects[entity_id] = effects
			return true
	return false

func evaluate_damage_status(action, resolution_fact: Dictionary) -> void:
	if action.source_id != boss_id or action.payload.get("target_id", &"") != primary_hero_id:
		return
	if resolution_fact.get("damage_classification", &"") != TANK_HIT:
		return
	var guarded_front := BoardQueryModel.is_guarded_front(board, boss_id, primary_hero_id)
	resolution_fact["guarded_front"] = guarded_front
	var evaluation := {"status_id": RIPOSTE_READY, "result": &"not_granted", "reason": &""}
	if int(resolution_fact.get("health_loss", 0)) > 0:
		evaluation["reason"] = &"health_lost"
	elif not guarded_front:
		evaluation["reason"] = &"not_guarded_front"
	elif has_status(primary_hero_id, RIPOSTE_READY):
		evaluation["reason"] = &"already_active"
	else:
		var effect := StatusEffectModel.new(RIPOSTE_READY, 1, [StatusEffectModel.ON_SLOT_FIRED])
		effect.title = "Riposte Ready"
		effect.trigger_reason = &"qualifying_tank_hit"
		effect.expires_at_window_end = &"quick"
		effect.consume_on_card_id = SHIELD_SLAM
		effect.bonus_boss_damage_on_slot_fired = 2
		effect.source_id = action.source_id
		effect.source_beat_id = resolution_fact.get("boss_beat_id", &"")
		effect.trigger_round = round
		effect.trigger_phase = phase
		add_status(primary_hero_id, effect)
		evaluation["result"] = &"granted"
		evaluation["reason"] = effect.trigger_reason
		resolution_fact["status_event"] = _status_event(effect, &"granted", effect.trigger_reason)
	resolution_fact["status_evaluation"] = evaluation

func consume_statuses_for_slot(entity_id: StringName, card) -> Dictionary:
	var result := {"bonus_boss_damage": 0, "events": []}
	if card == null:
		return result
	var remaining: Array = []
	for effect in status_effects.get(entity_id, []):
		var consumes: bool = effect.consume_on_card_id != &"" and effect.consume_on_card_id == card.id and effect.responds_to(StatusEffectModel.ON_SLOT_FIRED)
		if not consumes:
			remaining.append(effect)
			continue
		var outcome_data: Dictionary = effect.outcome_for(StatusEffectModel.ON_SLOT_FIRED, {"card": card})
		var bonus := int(outcome_data.get("bonus_boss_damage", 0))
		result["bonus_boss_damage"] += bonus
		var event := _status_event(effect, &"consumed", &"matching_card_fired")
		event["card_id"] = card.id
		event["bonus_boss_damage"] = bonus
		result["events"].append(event)
	status_effects[entity_id] = remaining
	return result

func status_actions(trigger: StringName, entity_id: StringName, context: Dictionary = {}) -> Array:
	var actions: Array = []
	for effect in status_effects.get(entity_id, []):
		if effect.consume_on_card_id != &"":
			continue
		var outcome_data: Dictionary = effect.outcome_for(trigger, context)
		if outcome_data.get("bonus_boss_damage", 0) > 0 and boss_id != entity_id:
			actions.append(EncounterActionModel.damage(entity_id, boss_id, outcome_data["bonus_boss_damage"], effect.id))
	return actions

func hazard_actions(entity_id: StringName, coords: Vector2i) -> Array:
	var actions: Array = []
	for hazard in board.get_hazards(coords):
		var outcome_data: Dictionary = hazard.outcome_for(StatusEffectModel.ON_ENTER_HEX)
		if outcome_data.get("damage", 0) > 0:
			actions.append(EncounterActionModel.damage(&"hazard", entity_id, outcome_data["damage"], hazard.id))
	return actions

func apply_damage(target_id: StringName, amount: int) -> Dictionary:
	var requested: int = max(amount, 0)
	var adjusted: int = requested
	var prevented: int = 0
	for effect in status_effects.get(target_id, []):
		var reduction := int(effect.outcome_for(StatusEffectModel.ON_DAMAGE_TAKEN).get("damage_reduction", 0))
		var before_reduction := adjusted
		adjusted = max(adjusted - reduction, 0)
		prevented += before_reduction - adjusted
	if heroes.has(target_id):
		var hero: Dictionary = heroes[target_id]
		var armor_blocked: int = min(int(hero.get("armor", 0)), adjusted)
		hero["armor"] -= armor_blocked
		var remaining: int = adjusted - armor_blocked
		var dealt: int = min(remaining, int(hero["health"]))
		hero["health"] = max(int(hero["health"]) - dealt, 0)
		board.get_entity(target_id)["health"] = hero["health"]
		heroes[target_id] = hero
		return {"requested": requested, "prevented": prevented + armor_blocked, "health_loss": dealt, "target_available": true}
	var target: Dictionary = board.get_entity(target_id)
	var health_before := int(target.get("health", 0))
	var dealt := board.damage_entity(target_id, adjusted)
	if health_before <= 0:
		return {"requested": requested, "prevented": prevented, "health_loss": 0, "target_available": false}
	var resolution_fact := {"requested": requested, "prevented": prevented, "health_loss": dealt, "target_available": true}
	if target.get("kind") == &"minion" and dealt > 0 and dealt == health_before:
		board.remove_entity(target_id)
		status_effects.erase(target_id)
		resolution_fact["target_removed"] = true
	return resolution_fact

func next_minion_id() -> StringName:
	minion_sequence += 1
	return StringName("whelp_%d" % minion_sequence)

func get_telegraphs() -> Dictionary:
	_refresh_telegraphs()
	return telegraphs.duplicate()

func _refresh_telegraphs() -> void:
	telegraphs.clear()
	telegraphed_spawn_hexes.clear()
	if current_program == null or boss_id == &"" or not board.has_entity(boss_id):
		return
	var boss: Dictionary = board.get_entity(boss_id)
	for beat in current_program.incoming_beats:
		match beat.kind:
			BossProgramBeatModel.Kind.CINDER_BREATH:
				for coords in BoardQueryModel.forward_cone(board.hexes, boss["coords"], int(boss["facing"]), 2):
					telegraphs[coords] = &"breath"
			BossProgramBeatModel.Kind.BROOD_CALL:
				for coords in brood_spawn_candidates:
					if telegraphed_spawn_hexes.size() >= beat.count:
						break
					if board.is_on_board(coords) and not board.is_occupied(coords):
						telegraphed_spawn_hexes.append(coords)
						telegraphs[coords] = &"brood"

func check_resolution() -> void:
	if not active:
		return
	if boss_id == &"" or not board.has_entity(boss_id) or board.get_entity(boss_id).get("health", 0) <= 0:
		active = false
		outcome = &"victory"
		outcome_reason = "The Boss is defeated."
		return
	for hero in heroes.values():
		if hero.get("health", 0) <= 0:
			active = false
			outcome = &"defeat"
			outcome_reason = "A Hero has fallen."
			return

func _add_hero(config: Dictionary) -> void:
	var hero_id: StringName = config.get("id", &"")
	var health := int(config.get("health", 34))
	if hero_id == &"" or not board.add_entity(hero_id, &"hero", config.get("coords", Vector2i.ZERO), health, int(config.get("facing", 1)), &"party"):
		return
	board.get_entity(hero_id)["title"] = str(config.get("title", "Hero"))
	var action_bar: Array = []
	for index in range(int(config.get("slot_count", 2))):
		action_bar.append({"top_card": null, "charges": [], "activated_window": &""})
	heroes[hero_id] = {
		"id": hero_id,
		"health": health,
		"max_health": health,
		"armor": int(config.get("armor", 0)),
		"presence": int(config.get("presence", 1)),
		"deck": config.get("deck", []).duplicate(),
		"hand": config.get("hand", []).duplicate(),
		"discard": [],
		"refill_target": max(int(config.get("refill_target", 4)), 1),
		"action_bar": action_bar,
	}
	if bool(config.get("shuffle_deck", false)):
		_shuffle(heroes[hero_id]["deck"], &"initial_deck_shuffle")
	_draw_until_refill(hero_id)

func _start_window(window: StringName) -> void:
	for hero_id in heroes:
		var hero: Dictionary = heroes[hero_id]
		for slot_index in hero["action_bar"].size():
			var slot: Dictionary = hero["action_bar"][slot_index]
			if slot["activated_window"] == window:
				slot["activated_window"] = &""
			hero["action_bar"][slot_index] = slot
		heroes[hero_id] = hero

func _start_round() -> void:
	board.advance_round()
	for hero_id in heroes:
		var hero: Dictionary = heroes[hero_id]
		hero["armor"] = 0
		for effect in status_effects.get(hero_id, []):
			hero["armor"] += int(effect.outcome_for(StatusEffectModel.ON_ROUND_START).get("armor", 0))
		heroes[hero_id] = hero
		var remaining: Array = []
		for effect in status_effects.get(hero_id, []):
			if not effect.advance_round():
				remaining.append(effect)
		status_effects[hero_id] = remaining
		_draw_until_refill(hero_id)

func _draw_until_refill(hero_id: StringName) -> void:
	var hero: Dictionary = heroes.get(hero_id, {})
	if hero.is_empty():
		return
	while hero["hand"].size() < int(hero["refill_target"]):
		if hero["deck"].is_empty():
			if hero["discard"].is_empty():
				break
			hero["deck"] = hero["discard"].duplicate()
			hero["discard"].clear()
			_shuffle(hero["deck"], &"discard_shuffle")
		hero["hand"].append(hero["deck"].pop_back())
	heroes[hero_id] = hero

func _shuffle(values: Array, label: StringName) -> void:
	random_source.shuffle(values, label)

func _cleanup_slots(window: StringName) -> void:
	for hero_id in heroes:
		var hero: Dictionary = heroes[hero_id]
		for slot_index in hero["action_bar"].size():
			var slot: Dictionary = hero["action_bar"][slot_index]
			var top_card = slot["top_card"]
			if top_card != null and slot["activated_window"] == window and slot["charges"].size() == top_card.get_charge_cap():
				hero["discard"].append(top_card)
				for charged_card in slot["charges"]:
					hero["discard"].append(charged_card)
				slot = {"top_card": null, "charges": [], "activated_window": &""}
			elif slot["activated_window"] == window:
				slot["activated_window"] = &""
			hero["action_bar"][slot_index] = slot
		heroes[hero_id] = hero

func _status_expiry_actions(window: StringName) -> Array:
	var actions: Array = []
	for entity_id in status_effects:
		for effect in status_effects[entity_id]:
			if effect.expires_at_window_end != window:
				continue
			actions.append(EncounterActionModel.expire_status(entity_id, effect.id, window, _status_event(effect, &"expired", &"expiry_window_ended")))
	return actions

func _status_event(effect, event: StringName, reason: StringName) -> Dictionary:
	return {
		"status_id": effect.id,
		"event": event,
		"reason": reason,
		"expires_at_window_end": effect.expires_at_window_end,
		"source_id": effect.source_id,
		"source_beat_id": effect.source_beat_id,
		"trigger_round": effect.trigger_round,
		"trigger_phase": effect.trigger_phase,
	}
