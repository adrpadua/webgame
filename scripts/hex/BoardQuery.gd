class_name BoardQuery
extends RefCounted

const FacingDirections := preload("res://scripts/combat/Facing.gd")

static func hexes_in_radius(radius: int) -> Dictionary:
	var hexes: Dictionary = {}
	for q in range(-radius, radius + 1):
		for r in range(max(-radius, -q - radius), min(radius, -q + radius) + 1):
			hexes[Vector2i(q, r)] = true
	return hexes

static func hex_distance(from_coords: Vector2i, to_coords: Vector2i) -> int:
	var dq := from_coords.x - to_coords.x
	var dr := from_coords.y - to_coords.y
	var ds := (-from_coords.x - from_coords.y) - (-to_coords.x - to_coords.y)
	return int((abs(dq) + abs(dr) + abs(ds)) / 2)

static func front_arc(board_hexes: Dictionary, origin: Vector2i, facing: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for direction in [facing - 1, facing, facing + 1]:
		var coords := origin + FacingDirections.axial_delta_for(direction)
		if board_hexes.has(coords):
			result.append(coords)
	return result

static func rear_arc(board_hexes: Dictionary, origin: Vector2i, facing: int) -> Array[Vector2i]:
	return front_arc(board_hexes, origin, facing + 3)

static func neighbors(board_hexes: Dictionary, origin: Vector2i) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for direction in FacingDirections.VALID_DIRECTIONS:
		var coords := origin + FacingDirections.axial_delta_for(direction)
		if board_hexes.has(coords):
			result.append(coords)
	return result

static func hexes_within_radius(board_hexes: Dictionary, origin: Vector2i, maximum_distance: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for coords in board_hexes:
		if hex_distance(origin, coords) <= maximum_distance:
			result.append(coords)
	return result

static func line(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	var direction := FacingDirections.axial_delta_for(facing)
	for distance in range(1, maximum_range + 1):
		var coords := origin + direction * distance
		if not board_hexes.has(coords):
			break
		result.append(coords)
	return result

static func forward_cone(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int = 2) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	var forward: Vector2i = FacingDirections.axial_delta_for(facing)
	var left: Vector2i = FacingDirections.axial_delta_for(facing - 1)
	var right: Vector2i = FacingDirections.axial_delta_for(facing + 1)
	for distance in range(1, maximum_range + 1):
		var center: Vector2i = origin + forward * distance
		for spread in range(-(distance - 1), distance):
			var side: Vector2i = left if spread < 0 else right
			var coords: Vector2i = center + side * abs(spread)
			if board_hexes.has(coords) and not result.has(coords):
				result.append(coords)
	return result

static func facing_toward(origin: Vector2i, target: Vector2i, current_facing: int) -> int:
	var best_direction: int = current_facing
	var best_distance: int = 999
	for direction in FacingDirections.VALID_DIRECTIONS:
		var distance := hex_distance(origin + FacingDirections.axial_delta_for(direction), target)
		if distance < best_distance:
			best_distance = distance
			best_direction = direction
	return best_direction

static func first_empty_hexes(candidates: Array[Vector2i], empty_hexes: Dictionary, count: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for coords in candidates:
		if empty_hexes.has(coords):
			result.append(coords)
			if result.size() >= count:
				break
	return result

static func occupied_hexes(board) -> Dictionary:
	return board.occupied_hexes()

static func hazard_hexes(board, hazard_id: StringName = &"") -> Dictionary:
	return board.hazard_hexes(hazard_id)

static func is_legal_move(board, entity_id: StringName, destination: Vector2i, maximum_distance: int = 1, voluntary: bool = true) -> bool:
	var entity: Dictionary = board.get_entity(entity_id)
	if entity.is_empty() or not board.is_on_board(destination) or board.is_occupied(destination, entity_id):
		return false
	if hex_distance(entity.get("coords"), destination) > maximum_distance:
		return false
	if voluntary:
		for hazard in board.get_hazards(destination):
			if hazard.blocks_voluntary_movement:
				return false
	return true

static func legal_moves(board, entity_id: StringName, maximum_distance: int = 1, voluntary: bool = true) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for coords in board.hexes:
		if is_legal_move(board, entity_id, coords, maximum_distance, voluntary):
			result.append(coords)
	return result
