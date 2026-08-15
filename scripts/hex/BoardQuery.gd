class_name BoardQuery
extends RefCounted

const FacingDirections := preload("res://scripts/combat/Facing.gd")

const PATTERN_TARGET := &"Target"
const PATTERN_RADIUS := &"Radius"
const PATTERN_RING := &"Ring"
const PATTERN_FRONT_CONE := &"FrontCone"
const PATTERN_BACK_CONE := &"BackCone"
const PATTERN_FRONT_LINE := &"FrontLine"
const PATTERN_BACK_LINE := &"BackLine"
const PATTERN_SIDES := &"Sides"
const PATTERN_CROSS := &"Cross"

const BINDING_PIECE := &"piece"
const BINDING_HEX := &"hex"
const BINDING_DIRECTION := &"direction"

const TARGET_SELECTOR_TANK := &"tank"

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

static func resolve_target_pattern(board_hexes: Dictionary, catalog_id: StringName, origin: Vector2i, options: Dictionary = {}) -> Dictionary:
	var pattern_id := StringName(catalog_id)
	match pattern_id:
		PATTERN_TARGET:
			return _pattern_result(pattern_id, BINDING_PIECE, origin, -1, _target_impacts(board_hexes, origin))
		PATTERN_RADIUS:
			var radius := int(options.get("radius", 0))
			assert(radius >= 0, "Radius Target Pattern requires radius >= 0.")
			return _pattern_result(pattern_id, BINDING_HEX, origin, -1, _radius_impacts(board_hexes, origin, radius))
		PATTERN_RING:
			var distances: Array = options.get("distances", [])
			assert(not distances.is_empty(), "Ring Target Pattern requires a non-empty distances set.")
			return _pattern_result(pattern_id, BINDING_HEX, origin, -1, _ring_impacts(board_hexes, origin, distances))
		PATTERN_FRONT_CONE:
			var facing := _pattern_facing(pattern_id, options)
			var maximum_range := _pattern_range(pattern_id, options)
			return _pattern_result(pattern_id, BINDING_DIRECTION, origin, facing, _front_cone_impacts(board_hexes, origin, facing, maximum_range))
		PATTERN_BACK_CONE:
			var facing := _pattern_facing(pattern_id, options)
			var maximum_range := _pattern_range(pattern_id, options)
			return _pattern_result(pattern_id, BINDING_DIRECTION, origin, facing, _front_cone_impacts(board_hexes, origin, facing + 3, maximum_range))
		PATTERN_FRONT_LINE:
			var facing := _pattern_facing(pattern_id, options)
			var maximum_range := _pattern_range(pattern_id, options)
			return _pattern_result(pattern_id, BINDING_DIRECTION, origin, facing, _line_impacts(board_hexes, origin, facing, maximum_range))
		PATTERN_BACK_LINE:
			var facing := _pattern_facing(pattern_id, options)
			var maximum_range := _pattern_range(pattern_id, options)
			return _pattern_result(pattern_id, BINDING_DIRECTION, origin, facing, _line_impacts(board_hexes, origin, facing + 3, maximum_range))
		PATTERN_SIDES:
			var facing := _pattern_facing(pattern_id, options)
			var maximum_range := _pattern_range(pattern_id, options)
			return _pattern_result(pattern_id, BINDING_DIRECTION, origin, facing, _sides_impacts(board_hexes, origin, facing, maximum_range))
		PATTERN_CROSS:
			var facing := _pattern_facing(pattern_id, options)
			var maximum_range := _pattern_range(pattern_id, options)
			return _pattern_result(pattern_id, BINDING_DIRECTION, origin, facing, _cross_impacts(board_hexes, origin, facing, maximum_range))
		_:
			assert(false, "Unknown Target Pattern catalog ID: %s" % str(catalog_id))
			return _pattern_result(pattern_id, &"", origin, -1, [])

static func resolve_target_bound_pattern(board_hexes: Dictionary, source_piece: Dictionary, candidate_pieces: Array, target_selector: StringName, catalog_id: StringName, options: Dictionary = {}) -> Dictionary:
	var origin: Vector2i = source_piece.get("coords", Vector2i.ZERO)
	var selected_piece: Dictionary = _select_target_piece(candidate_pieces, target_selector)
	if selected_piece.is_empty():
		return _target_bound_result(false, "target_not_found", source_piece, selected_piece, target_selector, StringName(catalog_id), -1, {}, [], [])
	var selected_coords: Vector2i = selected_piece.get("coords", Vector2i.ZERO)
	if selected_coords == origin and not bool(options.get("allow_same_hex_fallback", false)):
		return _target_bound_result(false, "same_hex_no_direction", source_piece, selected_piece, target_selector, StringName(catalog_id), -1, {}, [], [])
	var facing := facing_toward(origin, selected_coords, FacingDirections.Direction.EAST)
	var pattern_options := options.duplicate(true)
	pattern_options["facing"] = facing
	var pattern_result: Dictionary = resolve_target_pattern(board_hexes, catalog_id, origin, pattern_options)
	var impacts: Array[Vector2i] = pattern_result.get("impacts", [])
	if bool(options.get("include_selected_piece", false)):
		if board_hexes.has(selected_coords) and not impacts.has(selected_coords):
			impacts.append(selected_coords)
			impacts = _sort_by_distance_then_axial(impacts, origin)
			pattern_result["impacts"] = impacts
	else:
		impacts = impacts.filter(func(coords: Vector2i) -> bool: return coords != selected_coords)
		pattern_result["impacts"] = impacts
	if not bool(options.get("continue_beyond_selected_piece", false)):
		impacts = _clip_after_selected(impacts, origin, selected_coords, facing)
		pattern_result["impacts"] = impacts
	var affected_piece_ids := _affected_piece_ids(candidate_pieces, impacts)
	return _target_bound_result(true, "", source_piece, selected_piece, target_selector, StringName(catalog_id), facing, pattern_result, impacts, affected_piece_ids)

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

# One front-cone geometry (ADR 0017): the live rule shares the Target Pattern
# catalog's symmetric wedge implementation.
static func forward_cone(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int = 2) -> Array[Vector2i]:
	return _front_cone_impacts(board_hexes, origin, facing, maximum_range)

static func facing_toward(origin: Vector2i, target: Vector2i, current_facing: int) -> int:
	var best_direction: int = current_facing
	var best_distance: int = 999
	for direction in FacingDirections.VALID_DIRECTIONS:
		var distance := hex_distance(origin + FacingDirections.axial_delta_for(direction), target)
		if distance < best_distance:
			best_distance = distance
			best_direction = direction
	return best_direction

static func is_guarded_front(board, boss_id: StringName, hero_id: StringName) -> bool:
	var boss: Dictionary = board.get_entity(boss_id)
	var hero: Dictionary = board.get_entity(hero_id)
	if boss.is_empty() or hero.is_empty():
		return false
	var guarded_hex: Vector2i = boss.get("coords") + FacingDirections.axial_delta_for(int(boss.get("facing", 0)))
	return hero.get("coords") == guarded_hex

static func is_legal_route_blocker(board, entity_id: StringName, blocker_id: StringName, destination: Vector2i, maximum_distance: int = 1, voluntary: bool = true) -> bool:
	if entity_id == blocker_id:
		return false
	var blocker: Dictionary = board.get_entity(blocker_id)
	if blocker.is_empty() or blocker.get("coords") != destination or board.get_entity_id_at(destination) != blocker_id:
		return false
	var entity: Dictionary = board.get_entity(entity_id)
	if entity.is_empty() or not board.is_on_board(destination) or hex_distance(entity.get("coords"), destination) > maximum_distance:
		return false
	if voluntary:
		for hazard in board.get_hazards(destination):
			if hazard.blocks_voluntary_movement:
				return false
	return true

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

static func _pattern_facing(catalog_id: StringName, options: Dictionary) -> int:
	return FacingDirections.assert_hex_edge_facing(int(options.get("facing", FacingDirections.Direction.EAST)), "%s Target Pattern facing" % str(catalog_id))

static func _pattern_range(catalog_id: StringName, options: Dictionary) -> int:
	var maximum_range := int(options.get("range", 1))
	assert(maximum_range >= 1, "%s Target Pattern requires range >= 1." % str(catalog_id))
	return maximum_range

static func _pattern_result(catalog_id: StringName, selection_binding: StringName, origin: Vector2i, facing: int, impacts: Array[Vector2i]) -> Dictionary:
	var result := {
		"catalog_id": str(catalog_id),
		"selection_binding": str(selection_binding),
		"origin": origin,
		"anchor": origin,
		"impacts": impacts,
	}
	if facing >= 0:
		result["facing"] = FacingDirections.name_for(facing)
	else:
		result["facing"] = ""
	return result

static func _target_impacts(board_hexes: Dictionary, origin: Vector2i) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	if board_hexes.has(origin):
		result.append(origin)
	return result

static func _select_target_piece(candidate_pieces: Array, target_selector: StringName) -> Dictionary:
	match target_selector:
		TARGET_SELECTOR_TANK:
			for piece in candidate_pieces:
				if StringName(piece.get("role", &"")) == TARGET_SELECTOR_TANK:
					return piece
		_:
			assert(false, "Unsupported Target Selector for Target-Bound Pattern: %s" % str(target_selector))
	return {}

static func _target_bound_result(is_valid: bool, invalid_reason: String, source_piece: Dictionary, selected_piece: Dictionary, target_selector: StringName, catalog_id: StringName, facing: int, pattern_result: Dictionary, impacts: Array[Vector2i], affected_piece_ids: Array[StringName]) -> Dictionary:
	return {
		"valid": is_valid,
		"invalid_reason": invalid_reason,
		"source_piece_id": str(source_piece.get("id", &"")),
		"source_coords": source_piece.get("coords", Vector2i.ZERO),
		"target_selector": str(target_selector),
		"selected_piece_id": str(selected_piece.get("id", &"")),
		"selected_coords": selected_piece.get("coords", Vector2i.ZERO) if not selected_piece.is_empty() else Vector2i.ZERO,
		"catalog_id": str(catalog_id),
		"facing": FacingDirections.name_for(facing) if facing >= 0 else "",
		"pattern_result": pattern_result,
		"impacts": impacts,
		"affected_piece_ids": affected_piece_ids.map(func(piece_id: StringName) -> String: return str(piece_id)),
	}

static func _clip_after_selected(impacts: Array[Vector2i], origin: Vector2i, selected_coords: Vector2i, facing: int) -> Array[Vector2i]:
	var selected_distance := hex_distance(origin, selected_coords)
	var result: Array[Vector2i] = []
	for coords in impacts:
		if hex_distance(origin, coords) <= selected_distance:
			result.append(coords)
	return result

static func _affected_piece_ids(candidate_pieces: Array, impacts: Array[Vector2i]) -> Array[StringName]:
	var result: Array[StringName] = []
	for piece in candidate_pieces:
		if impacts.has(piece.get("coords", Vector2i.ZERO)):
			result.append(StringName(piece.get("id", &"")))
	return result

static func _radius_impacts(board_hexes: Dictionary, origin: Vector2i, radius: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for coords in board_hexes:
		if hex_distance(origin, coords) <= radius:
			result.append(coords)
	return _sort_by_distance_then_axial(result, origin)

static func _ring_impacts(board_hexes: Dictionary, origin: Vector2i, distances: Array) -> Array[Vector2i]:
	var allowed_distances: Dictionary = {}
	for raw_distance in distances:
		var distance := int(raw_distance)
		assert(distance > 0, "Ring Target Pattern distances must be positive.")
		allowed_distances[distance] = true
	var result: Array[Vector2i] = []
	for coords in board_hexes:
		var distance := hex_distance(origin, coords)
		if allowed_distances.has(distance):
			result.append(coords)
	return _sort_by_distance_then_axial(result, origin)

static func _front_cone_impacts(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	var forward: Vector2i = FacingDirections.axial_delta_for(facing)
	var left: Vector2i = FacingDirections.axial_delta_for(facing + 2)
	var right: Vector2i = FacingDirections.axial_delta_for(facing - 1)
	for distance in range(1, maximum_range + 1):
		var center: Vector2i = origin + forward * distance
		for spread in range(-(distance - 1), distance):
			var coords := center
			if spread < 0:
				coords += left * abs(spread)
			elif spread > 0:
				coords += right * spread
			if board_hexes.has(coords) and not result.has(coords):
				result.append(coords)
	return result

static func _line_impacts(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int) -> Array[Vector2i]:
	return line(board_hexes, origin, facing, maximum_range)

static func _sides_impacts(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int) -> Array[Vector2i]:
	return _ray_group_impacts(board_hexes, origin, facing, maximum_range, [-1, 1])

static func _cross_impacts(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int) -> Array[Vector2i]:
	return _ray_group_impacts(board_hexes, origin, facing, maximum_range, [-1, 1, -2, 2])

static func _ray_group_impacts(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int, direction_offsets: Array[int]) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for distance in range(1, maximum_range + 1):
		for offset in direction_offsets:
			var direction: Vector2i = FacingDirections.axial_delta_for(facing + offset)
			var coords: Vector2i = origin + direction * distance
			if board_hexes.has(coords) and not result.has(coords):
				result.append(coords)
	return result

static func _sort_by_distance_then_axial(coords_list: Array[Vector2i], origin: Vector2i) -> Array[Vector2i]:
	coords_list.sort_custom(func(first: Vector2i, second: Vector2i) -> bool:
		var first_distance := hex_distance(origin, first)
		var second_distance := hex_distance(origin, second)
		if first_distance != second_distance:
			return first_distance < second_distance
		if first.x != second.x:
			return first.x < second.x
		return first.y < second.y
	)
	return coords_list
