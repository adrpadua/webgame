class_name EncounterProbeSerializer
extends RefCounted

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")

static func action(action) -> Dictionary:
	return {
		"kind": _action_kind(action.kind),
		"source_id": str(action.source_id),
		"payload": value(action.payload),
		"succeeded": action.succeeded,
		"reason": action.reason,
		"generated_actions": action.generated_actions.map(func(generated): return action(generated)),
	}

static func snapshot(engine) -> Dictionary:
	var heroes: Array = []
	for hero_id in _sorted_keys(engine.heroes):
		var hero: Dictionary = engine.heroes[hero_id]
		var slots: Array = []
		for slot in hero["action_bar"]:
			slots.append({"top_card_id": _resource_id(slot["top_card"]), "charge_card_ids": _resource_ids(slot["charges"]), "activated_window": str(slot["activated_window"])})
		heroes.append({"id": str(hero_id), "health": hero["health"], "max_health": hero["max_health"], "armor": hero["armor"], "presence": hero["presence"], "deck_card_ids": _resource_ids(hero["deck"]), "hand_card_ids": _resource_ids(hero["hand"]), "discard_card_ids": _resource_ids(hero["discard"]), "action_bar": slots})
	var entities: Array = []
	for entity_id in _sorted_keys(engine.board.entities):
		entities.append(value(engine.board.entities[entity_id]))
	var hazards: Array = []
	for coords in _sorted_coords(engine.board.hazards.keys()):
		var effects: Array = []
		for effect in engine.board.hazards[coords]:
			effects.append({"id": str(effect.id), "remaining_rounds": effect.remaining_rounds, "damage_on_enter_hex": effect.damage_on_enter_hex, "blocks_voluntary_movement": effect.blocks_voluntary_movement})
		hazards.append({"coords": value(coords), "effects": effects})
	var statuses: Array = []
	for entity_id in _sorted_keys(engine.status_effects):
		var effects: Array = []
		for effect in engine.status_effects[entity_id]:
			effects.append({
				"id": str(effect.id),
				"title": effect.title,
				"remaining_rounds": effect.remaining_rounds,
				"triggers": value(effect.triggers),
				"trigger_reason": str(effect.trigger_reason),
				"expires_at_window_end": str(effect.expires_at_window_end),
				"consume_on_card_id": str(effect.consume_on_card_id),
				"source_id": str(effect.source_id),
				"source_beat_id": str(effect.source_beat_id),
				"trigger_round": effect.trigger_round,
				"trigger_phase": str(effect.trigger_phase),
			})
		statuses.append({"entity_id": str(entity_id), "effects": effects})
	return {
		"round": engine.round,
		"phase": str(engine.phase),
		"active": engine.active,
		"outcome": str(engine.outcome),
		"outcome_reason": engine.outcome_reason,
		"program_index": engine.program_index,
		"current_program_id": _resource_id(engine.current_program),
		"entities": entities,
		"heroes": heroes,
		"hazards": hazards,
		"status_effects": statuses,
		"history_cursor": engine.history.size(),
		"random_choices": value(engine.random_source.choices),
	}

static func value(source):
	if source == null:
		return null
	if source is Vector2i:
		return {"q": source.x, "r": source.y}
	if source is StringName:
		return str(source)
	if source is Resource:
		return {"resource_id": _resource_id(source)}
	if source is Array:
		var values: Array = []
		for item in source:
			values.append(value(item))
		return values
	if source is Dictionary:
		var result: Dictionary = {}
		for key in _sorted_keys(source):
			result[str(key)] = value(source[key])
		return result
	return source

static func _action_kind(kind: int) -> String:
	return ["load_slot", "charge_slot", "fire_slot", "move_hero", "resolve_boss", "apply_hazard", "spawn_minion", "damage", "discard_for_stamina", "expire_status"][kind]

static func _resource_id(resource) -> String:
	if resource == null:
		return ""
	return str(resource.get("id"))

static func _resource_ids(resources: Array) -> Array:
	var result: Array = []
	for resource in resources:
		result.append(_resource_id(resource))
	return result

static func _sorted_keys(dictionary: Dictionary) -> Array:
	var keys := dictionary.keys()
	keys.sort_custom(func(first, second): return str(first) < str(second))
	return keys

static func _sorted_coords(coords: Array) -> Array:
	coords.sort_custom(func(first: Vector2i, second: Vector2i): return first.x < second.x if first.x != second.x else first.y < second.y)
	return coords
