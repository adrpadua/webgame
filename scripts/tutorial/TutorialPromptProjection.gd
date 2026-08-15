class_name TutorialPromptProjection
extends RefCounted

# Read-only teaching projection. It owns no rules and does not retain prompt
# progress: callers supply presentation-only dismissal/completion state.
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const BOSS_TIMELINE: StringName = &"boss_timeline"
const GUARDED_FRONT: StringName = &"guarded_front"
const CHARGE_A_SLOT: StringName = &"charge_a_slot"
const IRON_GUARD_ARMOR: StringName = &"iron_guard_armor"
const RIPOSTE_READY: StringName = &"riposte_ready"
const SLOW_FORTIFY: StringName = &"slow_fortify"
const WHELP_PRESSURE: StringName = &"whelp_pressure"

const PROMPT_IDS := [
	BOSS_TIMELINE,
	GUARDED_FRONT,
	CHARGE_A_SLOT,
	IRON_GUARD_ARMOR,
	RIPOSTE_READY,
	SLOW_FORTIFY,
	WHELP_PRESSURE,
]

static func project(engine, presentation_state: Dictionary = {}) -> Dictionary:
	var prompts: Array[Dictionary] = [
		_boss_timeline(engine, presentation_state),
		_guarded_front(engine, presentation_state),
		_charge_a_slot(engine, presentation_state),
		_iron_guard_armor(engine, presentation_state),
		_riposte_ready(engine, presentation_state),
		_slow_fortify(engine, presentation_state),
		_whelp_pressure(engine, presentation_state),
	]
	var current_prompt_id: StringName = &""
	for prompt in prompts:
		if not prompt["relevant"] or prompt["show_once"]["state"] != &"available":
			continue
		current_prompt_id = prompt["id"]
		break
	return {
		"one_at_a_time": true,
		"current_prompt_id": current_prompt_id,
		"prompts": prompts,
	}

static func _boss_timeline(engine, presentation_state: Dictionary) -> Dictionary:
	var before_first_player_action: bool = engine.history.all(func(action) -> bool: return action.source_id != engine.primary_hero_id)
	var relevant: bool = engine.active and engine.round == 1 and before_first_player_action and engine.phase in [&"loadout", &"instant"] and engine.current_program != null
	return _prompt(
		BOSS_TIMELINE, 100, &"boss_timeline", &"raid_run", relevant,
		&"completed" if engine.phase not in [&"loadout", &"instant"] or not before_first_player_action else &"pending",
		{
			"round": engine.round,
			"phase": engine.phase,
			"instant_beat_ids": _beat_ids(engine.current_program.instant_beats) if engine.current_program != null else [],
			"incoming_beat_ids": _beat_ids(engine.current_program.incoming_beats) if engine.current_program != null else [],
		},
		"Boss Timeline",
		"The Boss acts in two visible moments: one is happening now, and one gives time to prepare.",
		presentation_state
	)

static func _guarded_front(engine, presentation_state: Dictionary) -> Dictionary:
	var next_tank_hit: Dictionary = _next_tank_hit(engine)
	var boss: Dictionary = engine.board.get_entity(engine.boss_id)
	var hero: Dictionary = engine.board.get_entity(engine.primary_hero_id)
	var guarded_front_hex: Vector2i = Vector2i.ZERO
	var has_guarded_front: bool = not boss.is_empty() and not hero.is_empty()
	if has_guarded_front:
		guarded_front_hex = boss.get("coords", Vector2i.ZERO) + _facing_delta(int(boss.get("facing", 0)))
	var relevant: bool = engine.active and next_tank_hit.get("beat", null) != null and has_guarded_front and engine.board.is_on_board(guarded_front_hex)
	return _prompt(
		GUARDED_FRONT, 90, &"board_guarded_front", &"encounter", relevant,
		&"completed" if has_guarded_front and hero.get("coords") == guarded_front_hex else &"pending",
		{
			"upcoming_tank_hit": next_tank_hit,
			"guarded_front_hex": guarded_front_hex,
			"hero_is_in_guarded_front": BoardQueryModel.is_guarded_front(engine.board, engine.boss_id, engine.primary_hero_id) if has_guarded_front else false,
		},
		"Guarded Front",
		"The Tank has a dangerous place to hold: directly in front of the Boss.",
		presentation_state
	)

static func _charge_a_slot(engine, presentation_state: Dictionary) -> Dictionary:
	var opportunity: Dictionary = _charge_opportunity(engine)
	return _prompt(
		CHARGE_A_SLOT, 80, &"action_bar", &"encounter", bool(opportunity["legal"]),
		&"pending" if opportunity["legal"] else &"expired",
		opportunity,
		"Charge a Slot",
		"A prepared ability needs a card beneath it before it can fire.",
		presentation_state
	)

static func _iron_guard_armor(engine, presentation_state: Dictionary) -> Dictionary:
	var opportunity: Dictionary = _iron_guard_opportunity(engine)
	return _prompt(
		IRON_GUARD_ARMOR, 70, &"action_bar", &"encounter", bool(opportunity["can_answer_in_time"]),
		&"pending" if opportunity["can_answer_in_time"] else &"expired",
		opportunity,
		"Iron Guard and Armor",
		"Armor is the answer to a hit you choose to take; it blocks damage before Health.",
		presentation_state
	)

static func _riposte_ready(engine, presentation_state: Dictionary) -> Dictionary:
	var effect = engine.get_status(engine.primary_hero_id, RIPOSTE_READY)
	var grant: Dictionary = _latest_status_event(engine, RIPOSTE_READY, &"granted")
	var newly_granted: bool = effect != null and not grant.is_empty()
	var legal_payoff: Dictionary = _legal_shield_slam_payoff(engine)
	return _prompt(
		RIPOSTE_READY, 60, &"status_effect", &"encounter", newly_granted,
		&"pending" if newly_granted else _riposte_completion_state(engine),
		{
			"newly_granted": newly_granted,
			"status_event": grant,
			"expires_at_window_end": effect.expires_at_window_end if effect != null else &"",
			"legal_shield_slam_payoff": legal_payoff,
		},
		"Riposte Ready",
		"A perfectly held hit opens a brief Shield Slam window.",
		presentation_state
	)

static func _slow_fortify(engine, presentation_state: Dictionary) -> Dictionary:
	var opportunity: Dictionary = _fortify_opportunity(engine)
	return _prompt(
		SLOW_FORTIFY, 50, &"action_bar", &"encounter", bool(opportunity["legal"]),
		&"pending" if opportunity["legal"] else &"expired",
		opportunity,
		"Slow and Fortify",
		"Slow is where a Tank commits to protection for the next problem, not where it undoes a hit already taken.",
		presentation_state
	)

static func _whelp_pressure(engine, presentation_state: Dictionary) -> Dictionary:
	var whelps: Array[Dictionary] = _whelps(engine)
	var sweeping_targets: Array[StringName] = _legal_sweeping_blow_targets(engine, whelps)
	var route_blocks: Array[Dictionary] = _route_blocking_whelps(engine, whelps)
	var relevant: bool = not sweeping_targets.is_empty() or not route_blocks.is_empty()
	return _prompt(
		WHELP_PRESSURE, 40, &"board", &"encounter", relevant,
		&"pending" if relevant else &"expired",
		{
			"whelp_ids": whelps.map(func(whelp: Dictionary) -> StringName: return whelp.get("id", &"")),
			"legal_sweeping_blow_target_ids": sweeping_targets,
			"route_blocking_relevance": route_blocks,
		},
		"Whelp pressure",
		"Whelps change the board. Clear one when it takes away the Party's safe route.",
		presentation_state
	)

static func _prompt(id: StringName, priority: int, anchor: StringName, show_once_scope: StringName, relevant: bool, derived_completion: StringName, basis: Dictionary, title: String, full_text: String, presentation_state: Dictionary) -> Dictionary:
	var progress: Dictionary = presentation_state.get(id, {})
	var dismissed := bool(progress.get("dismissed", false))
	var completed := bool(progress.get("completed", false))
	return {
		"id": id,
		"priority": priority,
		"surface": &"contextual_card",
		"anchor": anchor,
		"relevant": relevant,
		"authoritative_basis": basis,
		"show_once": {"scope": show_once_scope, "state": &"already_shown" if dismissed or completed else &"available"},
		"dismissal": {"state": &"dismissed" if dismissed else &"dismissible", "allowed": true},
		"completion": {"state": &"completed" if completed else derived_completion},
		"accessible_full_text": {"title": title, "text": full_text},
	}

static func _next_tank_hit(engine) -> Dictionary:
	if engine.current_program == null:
		return {}
	var tracks: Array[StringName] = []
	match engine.phase:
		&"loadout", &"instant":
			tracks = [&"instant", &"incoming"]
		&"quick", &"incoming":
			tracks = [&"incoming"]
		_:
			return {}
	for track in tracks:
		var beats: Array = engine.current_program.instant_beats if track == &"instant" else engine.current_program.incoming_beats
		for beat in beats:
			if beat.damage_classification == &"tank_hit":
				return {"beat_id": beat.id, "track": track, "beat": beat}
	return {}

static func _charge_opportunity(engine) -> Dictionary:
	var result: Dictionary = {"legal": false, "phase": engine.phase, "slot_indexes": [], "hand_card_ids": []}
	if not engine.active or engine.phase not in [&"quick", &"slow"]:
		return result
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	for card in hero.get("hand", []):
		result["hand_card_ids"].append(card.id)
	for index in hero.get("action_bar", []).size():
		var slot: Dictionary = hero["action_bar"][index]
		var top_card = slot.get("top_card", null)
		if top_card != null and slot.get("activated_window", &"") != engine.phase and slot.get("charges", []).size() < top_card.get_charge_cap() and not hero.get("hand", []).is_empty():
			result["slot_indexes"].append(index)
	result["legal"] = not result["slot_indexes"].is_empty()
	return result

static func _iron_guard_opportunity(engine) -> Dictionary:
	var next_tank_hit: Dictionary = _next_tank_hit(engine)
	var result: Dictionary = {"upcoming_tank_hit": next_tank_hit, "can_answer_in_time": false, "actions": []}
	if next_tank_hit.is_empty() or next_tank_hit.get("track", &"") != &"incoming" or engine.phase not in [&"loadout", &"quick"]:
		return result
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	var hand: Array = hero.get("hand", [])
	var has_iron_guard_in_hand: bool = _has_card(hand, &"iron_guard")
	for index in hero.get("action_bar", []).size():
		var slot: Dictionary = hero["action_bar"][index]
		var top_card = slot.get("top_card", null)
		if top_card != null and top_card.id == &"iron_guard":
			if not slot.get("charges", []).is_empty():
				result["can_answer_in_time"] = true
				result["actions"] = [&"fire_slot"]
				return result
			if not hand.is_empty():
				result["can_answer_in_time"] = true
				result["actions"] = [&"charge_slot", &"fire_slot"]
				return result
	if has_iron_guard_in_hand and hand.size() >= 2 and _has_loadable_slot(hero, engine.phase):
		result["can_answer_in_time"] = true
		result["actions"] = [&"load_slot", &"charge_slot", &"fire_slot"]
	return result

static func _fortify_opportunity(engine) -> Dictionary:
	var result: Dictionary = {"legal": false, "phase": engine.phase, "actions": []}
	if not engine.active or engine.phase != &"slow":
		return result
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	var hand: Array = hero.get("hand", [])
	if _has_card(hand, &"fortify") and _has_loadable_slot(hero, engine.phase):
		result["actions"].append(&"load_slot")
	for slot in hero.get("action_bar", []):
		var top_card = slot.get("top_card", null)
		if top_card == null or top_card.id != &"fortify" or slot.get("activated_window", &"") == engine.phase:
			continue
		if slot.get("charges", []).size() < top_card.get_charge_cap() and not hand.is_empty():
			result["actions"].append(&"charge_slot")
		if not slot.get("charges", []).is_empty():
			result["actions"].append(&"fire_slot")
	result["legal"] = not result["actions"].is_empty()
	return result

static func _whelps(engine) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for entity in engine.board.entities.values():
		if entity.get("kind", &"") == &"minion" and entity.get("content_id", &"") == &"whelp":
			result.append(entity)
	result.sort_custom(func(first: Dictionary, second: Dictionary) -> bool: return String(first.get("id", &"")) < String(second.get("id", &"")))
	return result

static func _legal_sweeping_blow_targets(engine, whelps: Array[Dictionary]) -> Array[StringName]:
	var result: Array[StringName] = []
	if not engine.active or engine.phase != &"quick":
		return result
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	var source: Dictionary = engine.board.get_entity(engine.primary_hero_id)
	for slot in hero.get("action_bar", []):
		var card = slot.get("top_card", null)
		if card == null or card.id != &"sweeping_blow" or slot.get("charges", []).is_empty() or slot.get("activated_window", &"") == engine.phase:
			continue
		for whelp in whelps:
			if BoardQueryModel.hex_distance(source.get("coords", Vector2i.ZERO), whelp.get("coords", Vector2i.ZERO)) <= card.range_tiles:
				result.append(whelp.get("id", &""))
		break
	return result

static func _route_blocking_whelps(engine, whelps: Array[Dictionary]) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	if not engine.active or engine.phase != &"quick":
		return result
	for whelp in whelps:
		var whelp_id: StringName = whelp.get("id", &"")
		var coords: Vector2i = whelp.get("coords", Vector2i.ZERO)
		if BoardQueryModel.is_legal_route_blocker(engine.board, engine.primary_hero_id, whelp_id, coords):
			result.append({"whelp_id": whelp_id, "blocked_destination": coords, "reason": &"adjacent_legal_move_occupied"})
	return result

static func _legal_shield_slam_payoff(engine) -> Dictionary:
	var result: Dictionary = {"legal": false, "slot_indexes": []}
	if engine.phase != &"quick":
		return result
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	for index in hero.get("action_bar", []).size():
		var slot: Dictionary = hero["action_bar"][index]
		var card = slot.get("top_card", null)
		if card != null and card.id == &"shield_slam" and not slot.get("charges", []).is_empty() and slot.get("activated_window", &"") != engine.phase:
			result["slot_indexes"].append(index)
	result["legal"] = not result["slot_indexes"].is_empty()
	return result

static func _latest_status_event(engine, status_id: StringName, expected_event: StringName) -> Dictionary:
	for action_index in range(engine.history.size() - 1, -1, -1):
		var event: Dictionary = _status_event_from_action(engine.history[action_index])
		if event.get("status_id", &"") == status_id and event.get("event", &"") == expected_event:
			return event
	return {}

static func _status_event_from_action(action) -> Dictionary:
	var direct: Dictionary = action.payload.get("resolution_fact", {}).get("status_event", {})
	if not direct.is_empty():
		return direct
	for generated in action.generated_actions:
		var nested: Dictionary = _status_event_from_action(generated)
		if not nested.is_empty():
			return nested
	return {}

static func _riposte_completion_state(engine) -> StringName:
	if not _latest_status_event(engine, RIPOSTE_READY, &"consumed").is_empty():
		return &"completed"
	if not _latest_status_event(engine, RIPOSTE_READY, &"expired").is_empty():
		return &"expired"
	return &"inactive"

static func _beat_ids(beats: Array) -> Array[StringName]:
	var result: Array[StringName] = []
	for beat in beats:
		result.append(beat.id)
	return result

static func _has_card(cards: Array, card_id: StringName) -> bool:
	for card in cards:
		if card != null and card.id == card_id:
			return true
	return false

static func _has_loadable_slot(hero: Dictionary, phase: StringName) -> bool:
	for slot in hero.get("action_bar", []):
		if slot.get("top_card", null) == null or phase == &"loadout":
			return true
	return false

static func _facing_delta(facing: int) -> Vector2i:
	return FacingDirections.axial_delta_for(facing)
