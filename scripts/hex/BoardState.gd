class_name BoardState
extends RefCounted

# BoardState is the scene-free source of truth for hexes, entities, terrain, and hazards.
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")

var radius: int = 0
var hexes: Dictionary = {}
var entities: Dictionary = {}
var states: Dictionary = {}
var hazards: Dictionary = {}

func setup(new_radius: int) -> void:
	radius = max(new_radius, 0)
	hexes = BoardQueryModel.hexes_in_radius(radius)
	entities.clear()
	states.clear()
	hazards.clear()

func clear() -> void:
	radius = 0
	hexes.clear()
	entities.clear()
	states.clear()
	hazards.clear()

func is_on_board(coords: Vector2i) -> bool:
	return hexes.has(coords)

func add_entity(entity_id: StringName, kind: StringName, coords: Vector2i, health: int, facing: int, team: StringName) -> bool:
	if entity_id == &"" or not is_on_board(coords) or is_occupied(coords):
		return false
	entities[entity_id] = {
		"id": entity_id,
		"kind": kind,
		"coords": coords,
		"health": max(health, 0),
		"max_health": max(health, 0),
		"facing": facing,
		"team": team,
	}
	return true

func remove_entity(entity_id: StringName) -> void:
	entities.erase(entity_id)

func has_entity(entity_id: StringName) -> bool:
	return entities.has(entity_id)

func get_entity(entity_id: StringName) -> Dictionary:
	return entities.get(entity_id, {})

func get_entity_id_at(coords: Vector2i) -> StringName:
	for entity_id in entities:
		if entities[entity_id].get("coords") == coords:
			return entity_id
	return &""

func is_occupied(coords: Vector2i, ignored_entity_id: StringName = &"") -> bool:
	var entity_id := get_entity_id_at(coords)
	return entity_id != &"" and entity_id != ignored_entity_id

func occupied_hexes() -> Dictionary:
	var result: Dictionary = {}
	for entity in entities.values():
		result[entity.get("coords")] = true
	return result

func empty_hexes() -> Dictionary:
	var result: Dictionary = {}
	for coords in hexes:
		if not is_occupied(coords):
			result[coords] = true
	return result

func move_entity(entity_id: StringName, destination: Vector2i) -> bool:
	if not entities.has(entity_id) or not is_on_board(destination) or is_occupied(destination, entity_id):
		return false
	entities[entity_id]["coords"] = destination
	return true

func set_entity_facing(entity_id: StringName, facing: int) -> void:
	if entities.has(entity_id):
		entities[entity_id]["facing"] = facing

func damage_entity(entity_id: StringName, amount: int) -> int:
	if not entities.has(entity_id):
		return 0
	var entity: Dictionary = entities[entity_id]
	var dealt: int = min(max(amount, 0), int(entity.get("health", 0)))
	entity["health"] = int(entity.get("health", 0)) - dealt
	return dealt

func set_state(coords: Vector2i, state_id: StringName, duration_rounds: int) -> void:
	states[coords] = {"id": state_id, "rounds": max(duration_rounds, 1)}

func has_state(coords: Vector2i, state_id: StringName = &"") -> bool:
	if not states.has(coords):
		return false
	return state_id == &"" or states[coords].get("id") == state_id

func get_state(coords: Vector2i) -> Dictionary:
	return states.get(coords, {})

func add_hazard(coords: Vector2i, hazard) -> bool:
	if not is_on_board(coords) or hazard == null:
		return false
	if not hazards.has(coords):
		hazards[coords] = []
	hazards[coords].append(hazard)
	return true

func get_hazards(coords: Vector2i) -> Array:
	return hazards.get(coords, [])

func has_hazard(coords: Vector2i, hazard_id: StringName = &"") -> bool:
	for hazard in get_hazards(coords):
		if hazard_id == &"" or hazard.id == hazard_id:
			return true
	return false

func hazard_hexes(hazard_id: StringName = &"") -> Dictionary:
	var result: Dictionary = {}
	for coords in hazards:
		if has_hazard(coords, hazard_id):
			result[coords] = true
	return result

func advance_round() -> Array[Vector2i]:
	var expired: Array[Vector2i] = []
	for coords in states.keys():
		var state: Dictionary = states[coords]
		state["rounds"] = int(state.get("rounds", 1)) - 1
		if state["rounds"] <= 0:
			expired.append(coords)
	for coords in expired:
		states.erase(coords)
	for coords in hazards.keys():
		var remaining: Array = []
		for hazard in hazards[coords]:
			if not hazard.advance_round():
				remaining.append(hazard)
		if remaining.is_empty():
			hazards.erase(coords)
		else:
			hazards[coords] = remaining
	return expired
