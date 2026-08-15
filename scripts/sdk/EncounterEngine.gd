class_name EncounterEngine
extends RefCounted

# The Encounter Engine is one module (ADR 0014): its seam is start / apply /
# advance_phase / legality / legal_actions plus read projections. Action
# legality and state transitions are implementation below the seam; `legality`
# is the single statement of every pre-resolution rule, and `_resolve` routes
# through it before mutating, so an action is applied if and only if the same
# predicate calls it legal.

const CardResolverModel := preload("res://scripts/sdk/CardResolver.gd")
const BoardStateModel := preload("res://scripts/hex/BoardState.gd")
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const BossProgramBeatModel := preload("res://scripts/boss/BossProgramBeat.gd")
const StatusEffectModel := preload("res://scripts/sdk/StatusEffect.gd")
const RulesRandomModel := preload("res://scripts/sdk/RulesRandom.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")
const TutorialPromptProjectionModel := preload("res://scripts/tutorial/TutorialPromptProjection.gd")

const TANK_HIT: StringName = &"tank_hit"
const RIPOSTE_READY: StringName = &"riposte_ready"
const SHIELD_SLAM: StringName = &"shield_slam"

var board := BoardStateModel.new()
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

var _card_resolver := CardResolverModel.new()
var _timeline_resolver

func _init() -> void:
	var timeline_resolver_script = load("res://scripts/sdk/TimelineResolver.gd")
	_timeline_resolver = timeline_resolver_script.new()

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
	_check_resolution()

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
	var generated: Array = _resolve(action)
	history.append(action)
	for followup in generated:
		action.generated_actions.append(followup)
		apply(followup)
	_check_resolution()
	return action

# Advances one phase boundary and returns the complete ordered slice of
# actions it produced (ADR 0015); every mutation it causes rides an action.
func advance_phase() -> Array:
	if not active:
		return []
	var actions: Array = []
	match phase:
		&"loadout":
			actions.append(apply(EncounterActionModel.advance_phase(&"loadout", &"instant", round)))
		&"instant":
			for action in _timeline_resolver.actions_for_track(self, &"instant"):
				actions.append(apply(action))
			actions.append(apply(EncounterActionModel.advance_phase(&"instant", &"quick", round)))
			_refresh_telegraphs()
		&"quick":
			for expiry_action in _status_expiry_actions(&"quick"):
				actions.append(apply(expiry_action))
			actions.append_array(_cleanup_actions(&"quick"))
			actions.append(apply(EncounterActionModel.advance_phase(&"quick", &"incoming", round)))
		&"incoming":
			_refresh_telegraphs()
			for action in _timeline_resolver.actions_for_track(self, &"incoming"):
				actions.append(apply(action))
			actions.append(apply(EncounterActionModel.advance_phase(&"incoming", &"slow", round)))
		&"slow":
			actions.append_array(_cleanup_actions(&"slow"))
			var next_round := round + 1
			if next_round > round_limit:
				actions.append(apply(EncounterActionModel.end_of_clock(next_round, enrage_text)))
				return actions
			actions.append(apply(EncounterActionModel.round_start(next_round)))
			actions.append_array(_refill_actions())
			actions.append(apply(EncounterActionModel.advance_phase(&"slow", &"loadout", next_round)))
			_refresh_telegraphs()
	_check_resolution()
	return actions

func legality(action) -> Dictionary:
	if not active:
		return _illegal("The Encounter has already ended.")
	match action.kind:
		EncounterActionModel.Kind.LOAD_SLOT:
			return _load_slot_legality(action)
		EncounterActionModel.Kind.CHARGE_SLOT:
			return _charge_slot_legality(action)
		EncounterActionModel.Kind.FIRE_SLOT:
			return _fire_slot_legality(action)
		EncounterActionModel.Kind.MOVE_HERO:
			return _move_hero_legality(action)
		EncounterActionModel.Kind.DISCARD_FOR_STAMINA:
			return _discard_for_stamina_legality(action)
		EncounterActionModel.Kind.RESOLVE_BOSS:
			return _resolve_boss_legality(action)
		EncounterActionModel.Kind.EXPIRE_STATUS:
			return _expire_status_legality(action)
	# APPLY_HAZARD, SPAWN_MINION, and DAMAGE are generated actions whose only
	# failure modes are resolution-time outcomes (an occupied spawn hex, an
	# already-removed target); they carry no pre-resolution legality rule.
	return _legal()

func legal_actions(hero_id: StringName) -> Array:
	var actions: Array = []
	if not active:
		return actions
	var hero: Dictionary = get_hero(hero_id)
	if hero.is_empty():
		return actions
	var hand: Array = hero.get("hand", [])
	var slots: Array = hero.get("action_bar", [])
	for slot_index in slots.size():
		for card in hand:
			var load_action = EncounterActionModel.load_slot(hero_id, slot_index, card)
			if legality(load_action)["legal"]:
				actions.append(load_action)
			var charge_action = EncounterActionModel.charge_slot(hero_id, slot_index, card)
			if legality(charge_action)["legal"]:
				actions.append(charge_action)
		for target_id in _fire_target_candidates(slots[slot_index]):
			var fire_action = EncounterActionModel.fire_slot(hero_id, slot_index, target_id)
			if legality(fire_action)["legal"]:
				actions.append(fire_action)
	var entity: Dictionary = board.get_entity(hero_id)
	if not hand.is_empty() and not entity.is_empty():
		for destination in BoardQueryModel.neighbors(board.hexes, entity.get("coords")):
			var move_action = EncounterActionModel.move_hero(hero_id, destination, hand[0])
			if legality(move_action)["legal"]:
				actions.append(move_action)
	return actions

func get_hero(hero_id: StringName) -> Dictionary:
	return heroes.get(hero_id, {})

func _put_hero(hero_id: StringName, hero: Dictionary) -> void:
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

func _remove_status(entity_id: StringName, status_id: StringName) -> bool:
	var effects: Array = status_effects.get(entity_id, [])
	for index in effects.size():
		if effects[index].id == status_id:
			effects.remove_at(index)
			status_effects[entity_id] = effects
			return true
	return false

func _evaluate_damage_status(action, resolution_fact: Dictionary) -> void:
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

func _consume_statuses_for_slot(entity_id: StringName, card) -> Dictionary:
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

func _status_actions(trigger: StringName, entity_id: StringName, context: Dictionary = {}) -> Array:
	var actions: Array = []
	for effect in status_effects.get(entity_id, []):
		if effect.consume_on_card_id != &"":
			continue
		var outcome_data: Dictionary = effect.outcome_for(trigger, context)
		if outcome_data.get("bonus_boss_damage", 0) > 0 and boss_id != entity_id:
			actions.append(EncounterActionModel.damage(entity_id, boss_id, outcome_data["bonus_boss_damage"], effect.id))
	return actions

func _hazard_actions(entity_id: StringName, coords: Vector2i) -> Array:
	var actions: Array = []
	for hazard in board.get_hazards(coords):
		var outcome_data: Dictionary = hazard.outcome_for(StatusEffectModel.ON_ENTER_HEX)
		if outcome_data.get("damage", 0) > 0:
			actions.append(EncounterActionModel.damage(&"hazard", entity_id, outcome_data["damage"], hazard.id))
	return actions

func _apply_damage(target_id: StringName, amount: int) -> Dictionary:
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

func _next_minion_id() -> StringName:
	minion_sequence += 1
	return StringName("whelp_%d" % minion_sequence)

func get_telegraphs() -> Dictionary:
	_refresh_telegraphs()
	return telegraphs.duplicate()

func get_tutorial_prompt_projection(presentation_state: Dictionary = {}) -> Dictionary:
	return TutorialPromptProjectionModel.project(self, presentation_state)

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

func _check_resolution() -> void:
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

func _advance_phase_action(action) -> void:
	var from_phase: StringName = action.payload.get("from_phase", phase)
	_clear_window_flags(from_phase)
	phase = action.payload.get("to_phase", phase)
	round = int(action.payload.get("round", round))
	action.resolve_success()

func _end_of_clock(action) -> void:
	round = int(action.payload.get("round", round))
	active = false
	outcome = &"defeat"
	outcome_reason = str(action.payload.get("reason", enrage_text))
	action.resolve_success()

# A Slot's activation flag lives exactly as long as its window; it clears when
# the ADVANCE_PHASE leaving that window resolves.
func _clear_window_flags(window: StringName) -> void:
	for hero_id in heroes:
		var hero: Dictionary = heroes[hero_id]
		for slot_index in hero["action_bar"].size():
			var slot: Dictionary = hero["action_bar"][slot_index]
			if slot["activated_window"] == window:
				slot["activated_window"] = &""
				hero["action_bar"][slot_index] = slot
		heroes[hero_id] = hero

# Emits the refill's SHUFFLE_DECK and DRAW_CARD actions; the mutations happen
# in their resolutions via the action funnel.
func _refill_actions() -> Array:
	var actions: Array = []
	for hero_id in heroes:
		while heroes[hero_id]["hand"].size() < int(heroes[hero_id]["refill_target"]):
			if heroes[hero_id]["deck"].is_empty():
				if heroes[hero_id]["discard"].is_empty():
					break
				actions.append(apply(EncounterActionModel.shuffle_deck(hero_id, &"discard_shuffle")))
			actions.append(apply(EncounterActionModel.draw_card(hero_id)))
	return actions

func _advance_program() -> void:
	if programs.is_empty():
		program_index = 0
		current_program = null
	elif loop_programs:
		program_index = (program_index + 1) % programs.size()
		current_program = programs[program_index]
	else:
		program_index += 1
		current_program = programs[program_index] if program_index < programs.size() else null

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

# Emits Full-Charge Cleanup actions for every Slot matching the rule; the
# mutation happens in `_full_charge_cleanup` via the action funnel.
func _cleanup_actions(window: StringName) -> Array:
	var actions: Array = []
	for hero_id in heroes:
		var hero: Dictionary = heroes[hero_id]
		for slot_index in hero["action_bar"].size():
			var slot: Dictionary = hero["action_bar"][slot_index]
			var top_card = slot["top_card"]
			if top_card != null and slot["activated_window"] == window and slot["charges"].size() == top_card.get_charge_cap():
				actions.append(apply(EncounterActionModel.full_charge_cleanup(hero_id, slot_index, window)))
	return actions

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

# --- Action resolution (implementation behind `apply` and `legality`) ---

func _resolve(action) -> Array:
	var verdict := legality(action)
	if verdict.has("target_range"):
		action.payload["target_range"] = verdict["target_range"]
	if not verdict["legal"]:
		action.resolve_failure(verdict["reason"])
		return []
	match action.kind:
		EncounterActionModel.Kind.LOAD_SLOT:
			_load_slot(action)
		EncounterActionModel.Kind.CHARGE_SLOT:
			_charge_slot(action)
		EncounterActionModel.Kind.FIRE_SLOT:
			return _fire_slot(action)
		EncounterActionModel.Kind.MOVE_HERO:
			return _move_hero(action)
		EncounterActionModel.Kind.RESOLVE_BOSS:
			return _resolve_boss(action)
		EncounterActionModel.Kind.APPLY_HAZARD:
			_apply_hazard(action)
		EncounterActionModel.Kind.SPAWN_MINION:
			_spawn_minion(action)
		EncounterActionModel.Kind.DAMAGE:
			return _damage(action)
		EncounterActionModel.Kind.DISCARD_FOR_STAMINA:
			_discard_for_stamina(action)
		EncounterActionModel.Kind.EXPIRE_STATUS:
			_expire_status(action)
		EncounterActionModel.Kind.FULL_CHARGE_CLEANUP:
			_full_charge_cleanup(action)
		EncounterActionModel.Kind.ROUND_START:
			_round_start(action)
		EncounterActionModel.Kind.DRAW_CARD:
			_draw_card(action)
		EncounterActionModel.Kind.SHUFFLE_DECK:
			_shuffle_deck(action)
		EncounterActionModel.Kind.ADVANCE_PHASE:
			_advance_phase_action(action)
		EncounterActionModel.Kind.END_OF_CLOCK:
			_end_of_clock(action)
	return []

func _load_slot_legality(action) -> Dictionary:
	var hero: Dictionary = get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	var card = action.payload.get("card")
	if hero.is_empty() or card == null or not hero["hand"].has(card):
		return _illegal("The chosen hand card is unavailable.")
	if slot_index < 0 or slot_index >= hero["action_bar"].size() or phase != &"loadout" and phase != &"quick" and phase != &"slow":
		return _illegal("Loading a Slot requires a legal Slot during Loadout, Quick, or Slow.")
	if hero["action_bar"][slot_index]["top_card"] != null and phase != &"loadout":
		return _illegal("Replacing a Slot is only allowed during Loadout.")
	return _legal()

func _charge_slot_legality(action) -> Dictionary:
	var hero: Dictionary = get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	var card = action.payload.get("card")
	if hero.is_empty() or card == null or not hero["hand"].has(card):
		return _illegal("The chosen hand card is unavailable.")
	if slot_index < 0 or slot_index >= hero["action_bar"].size() or phase != &"quick" and phase != &"slow":
		return _illegal("Charging requires a legal Slot during Quick or Slow.")
	var slot: Dictionary = hero["action_bar"][slot_index]
	if slot["top_card"] == null or slot["activated_window"] == phase or slot["charges"].size() >= slot["top_card"].get_charge_cap():
		return _illegal("That Slot cannot accept another charge.")
	return _legal()

func _fire_slot_legality(action) -> Dictionary:
	var hero: Dictionary = get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	if hero.is_empty() or slot_index < 0 or slot_index >= hero["action_bar"].size():
		return _illegal("Select a legal Slot.")
	var slot: Dictionary = hero["action_bar"][slot_index]
	var card = slot["top_card"]
	if card == null or slot["charges"].is_empty():
		return _illegal("A loaded Slot needs at least one charged card.")
	if slot["activated_window"] == phase:
		return _illegal("A Slot may fire only once in its matching window.")
	if card.get_window_speed() != phase:
		return _illegal("The Top Card cannot fire in this window.")
	if card.damage > 0:
		var target_id: StringName = action.payload.get("target_id", &"")
		var target: Dictionary = board.get_entity(target_id)
		var source: Dictionary = board.get_entity(action.source_id)
		if target.is_empty() or target.get("kind") != &"minion":
			return _illegal("The Top Card needs a Minion target.")
		var target_range := BoardQueryModel.hex_distance(source.get("coords"), target.get("coords"))
		if target_range > card.range_tiles:
			var verdict := _illegal("The chosen Minion is outside the Top Card's range.")
			verdict["target_range"] = target_range
			return verdict
		var legal_verdict := _legal()
		legal_verdict["target_range"] = target_range
		return legal_verdict
	return _legal()

func _move_hero_legality(action) -> Dictionary:
	var hero: Dictionary = get_hero(action.source_id)
	var destination: Vector2i = action.payload.get("destination", Vector2i(999, 999))
	var card = action.payload.get("card")
	if hero.is_empty() or phase != &"quick" or card == null or not hero["hand"].has(card):
		return _illegal("Hero movement requires the Quick Window and a hand card for Stamina.")
	if not BoardQueryModel.is_legal_move(board, action.source_id, destination):
		return _illegal("That hex is not a legal move destination.")
	return _legal()

func _discard_for_stamina_legality(action) -> Dictionary:
	var hero: Dictionary = get_hero(action.source_id)
	var card = action.payload.get("card")
	if hero.is_empty() or card == null or not hero["hand"].has(card):
		return _illegal("The chosen hand card is unavailable.")
	return _legal()

func _resolve_boss_legality(action) -> Dictionary:
	if action.payload.get("beat") == null:
		return _illegal("Boss resolution needs an authored beat.")
	return _legal()

func _expire_status_legality(action) -> Dictionary:
	var target_id: StringName = action.payload.get("target_id", &"")
	var status_id: StringName = action.payload.get("status_id", &"")
	var window: StringName = action.payload.get("window", &"")
	var effect = get_status(target_id, status_id)
	if effect == null or effect.expires_at_window_end != window or phase != window:
		return _illegal("The Status Effect is not eligible to expire at this boundary.")
	return _legal()

func _fire_target_candidates(slot: Dictionary) -> Array:
	var card = slot.get("top_card")
	if card == null:
		return []
	if card.damage <= 0:
		return [&""]
	var targets: Array = []
	for entity_id in board.entities:
		if board.entities[entity_id].get("kind") == &"minion":
			targets.append(entity_id)
	return targets

func _legal() -> Dictionary:
	return {"legal": true, "reason": ""}

func _illegal(reason: String) -> Dictionary:
	return {"legal": false, "reason": reason}

func _load_slot(action) -> void:
	var hero: Dictionary = get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	var card = action.payload.get("card")
	var slot: Dictionary = hero["action_bar"][slot_index]
	hero["hand"].erase(card)
	if slot["top_card"] != null:
		hero["discard"].append(slot["top_card"])
		for charged_card in slot["charges"]:
			hero["discard"].append(charged_card)
	slot["top_card"] = card
	slot["charges"] = []
	slot["activated_window"] = &""
	hero["action_bar"][slot_index] = slot
	_put_hero(action.source_id, hero)
	action.resolve_success()

func _charge_slot(action) -> void:
	var hero: Dictionary = get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	var card = action.payload.get("card")
	var slot: Dictionary = hero["action_bar"][slot_index]
	hero["hand"].erase(card)
	slot["charges"].append(card)
	hero["action_bar"][slot_index] = slot
	_put_hero(action.source_id, hero)
	action.resolve_success()

func _fire_slot(action) -> Array:
	var hero: Dictionary = get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	var slot: Dictionary = hero["action_bar"][slot_index]
	var card = slot["top_card"]
	var effects := _card_resolver.resolve_fire(card, slot["charges"])
	var base_boss_damage: int = int(effects["boss_damage"])
	hero["armor"] += effects["armor"]
	hero["health"] = min(hero["max_health"], hero["health"] + effects["healing"])
	hero["presence"] += effects["presence"]
	slot["activated_window"] = phase
	hero["action_bar"][slot_index] = slot
	_put_hero(action.source_id, hero)
	var consumed: Dictionary = _consume_statuses_for_slot(action.source_id, card)
	var status_bonus: int = int(consumed.get("bonus_boss_damage", 0))
	effects["boss_damage"] += status_bonus
	if not consumed.get("events", []).is_empty():
		action.payload["resolution_fact"] = {"status_event": consumed["events"][0]}
	action.resolve_success()
	var followups: Array = []
	if effects["boss_damage"] > 0:
		var fact_context: Dictionary = {}
		if status_bonus > 0:
			fact_context = {
				"base_amount": base_boss_damage,
				"status_bonus": status_bonus,
				"status_id": consumed["events"][0]["status_id"],
				"payoff_card_id": card.id,
			}
		followups.append(EncounterActionModel.damage(action.source_id, boss_id, effects["boss_damage"], card.title, fact_context))
	if effects["target_damage"] > 0:
		var effect_target_id: StringName = action.payload.get("target_id", &"")
		followups.append(EncounterActionModel.damage(action.source_id, effect_target_id, effects["target_damage"], card.title))
	followups.append_array(_status_actions(StatusEffectModel.ON_SLOT_FIRED, action.source_id, {"card": card}))
	return followups

func _move_hero(action) -> Array:
	var hero: Dictionary = get_hero(action.source_id)
	var destination: Vector2i = action.payload.get("destination", Vector2i(999, 999))
	var card = action.payload.get("card")
	var from_coords: Vector2i = board.get_entity(action.source_id).get("coords")
	hero["hand"].erase(card)
	hero["discard"].append(card)
	_put_hero(action.source_id, hero)
	board.move_entity(action.source_id, destination)
	board.set_entity_facing(action.source_id, FacingDirections.direction_for_axial_delta(destination - from_coords))
	action.resolve_success()
	return _hazard_actions(action.source_id, destination)

func _resolve_boss(action) -> Array:
	var beat = action.payload.get("beat")
	var followups: Array = _timeline_resolver.resolve_boss_beat(self, action.source_id, beat, action.payload.get("track", &""))
	action.resolve_success()
	return followups

func _apply_hazard(action) -> void:
	var coords: Vector2i = action.payload.get("coords", Vector2i(999, 999))
	var hazard = action.payload.get("hazard")
	if not board.add_hazard(coords, hazard.copy() if hazard != null else null):
		action.resolve_failure("The hazard could not be applied to that hex.")
		return
	action.resolve_success()

func _spawn_minion(action) -> void:
	var minion_id: StringName = action.payload.get("minion_id", &"")
	var coords: Vector2i = action.payload.get("coords", Vector2i(999, 999))
	var minion = action.payload.get("minion")
	var health: int = minion.max_health if minion != null else 2
	if not board.add_entity(minion_id, &"minion", coords, health, FacingDirections.Direction.NORTH_WEST, &"enemy"):
		action.resolve_failure("The Minion spawn hex is unavailable.")
		return
	if minion != null:
		board.get_entity(minion_id)["content_id"] = minion.id
		board.get_entity(minion_id)["title"] = minion.title
	action.resolve_success()

func _damage(action) -> Array:
	var target_id: StringName = action.payload.get("target_id", &"")
	var amount: int = action.payload.get("amount", 0)
	var resolution_fact: Dictionary = _apply_damage(target_id, amount)
	for key in action.payload.get("fact_context", {}):
		if not resolution_fact.has(key):
			resolution_fact[key] = action.payload["fact_context"][key]
	action.payload.erase("fact_context")
	var dealt: int = int(resolution_fact.get("health_loss", 0))
	if not bool(resolution_fact.get("target_available", false)):
		action.resolve_failure("The damage target is unavailable.")
		return []
	action.payload["dealt"] = dealt
	_evaluate_damage_status(action, resolution_fact)
	action.payload["resolution_fact"] = resolution_fact
	action.resolve_success()
	return _status_actions(StatusEffectModel.ON_DAMAGE_TAKEN, target_id, {"amount": dealt, "source_id": action.source_id})

func _discard_for_stamina(action) -> void:
	var hero: Dictionary = get_hero(action.source_id)
	var card = action.payload.get("card")
	hero["hand"].erase(card)
	hero["discard"].append(card)
	_put_hero(action.source_id, hero)
	action.resolve_success()

func _expire_status(action) -> void:
	var target_id: StringName = action.payload.get("target_id", &"")
	var status_id: StringName = action.payload.get("status_id", &"")
	_remove_status(target_id, status_id)
	action.payload["resolution_fact"] = {"status_event": action.payload.get("status_event", {}).duplicate(true)}
	action.resolve_success()

func _round_start(action) -> void:
	round = int(action.payload.get("round", round + 1))
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
	_advance_program()
	action.resolve_success()

func _draw_card(action) -> void:
	var hero: Dictionary = get_hero(action.source_id)
	if hero.is_empty() or hero["deck"].is_empty():
		action.resolve_failure("The deck has no card to draw.")
		return
	var card = hero["deck"].pop_back()
	hero["hand"].append(card)
	action.payload["card"] = card
	_put_hero(action.source_id, hero)
	action.resolve_success()

func _shuffle_deck(action) -> void:
	var hero: Dictionary = get_hero(action.source_id)
	if hero.is_empty() or not hero["deck"].is_empty() or hero["discard"].is_empty():
		action.resolve_failure("Reshuffling requires an empty deck and a non-empty discard pile.")
		return
	hero["deck"] = hero["discard"].duplicate()
	hero["discard"].clear()
	_shuffle(hero["deck"], action.payload.get("label", &"discard_shuffle"))
	_put_hero(action.source_id, hero)
	action.resolve_success()

func _full_charge_cleanup(action) -> void:
	var hero: Dictionary = get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	if hero.is_empty() or slot_index < 0 or slot_index >= hero["action_bar"].size() or hero["action_bar"][slot_index]["top_card"] == null:
		action.resolve_failure("Full-Charge Cleanup requires an occupied Slot.")
		return
	var slot: Dictionary = hero["action_bar"][slot_index]
	action.payload["top_card"] = slot["top_card"]
	action.payload["charge_cards"] = slot["charges"].duplicate()
	hero["discard"].append(slot["top_card"])
	for charged_card in slot["charges"]:
		hero["discard"].append(charged_card)
	hero["action_bar"][slot_index] = {"top_card": null, "charges": [], "activated_window": &""}
	_put_hero(action.source_id, hero)
	action.resolve_success()
