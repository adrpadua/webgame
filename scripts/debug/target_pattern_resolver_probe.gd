extends SceneTree

const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

var failures: Array[String] = []
var covered_patterns: Dictionary = {}
var facing_checks := 0

func _initialize() -> void:
	var central_board := BoardQueryModel.hexes_in_radius(5)
	var edge_board := BoardQueryModel.hexes_in_radius(2)
	var center := Vector2i(0, 0)
	var edge := Vector2i(2, 0)

	_test_non_directional_patterns(central_board, center)
	_test_non_directional_patterns(edge_board, edge)
	_test_directional_patterns(central_board, center, "central")
	_test_directional_patterns(edge_board, edge, "edge")

	if failures.is_empty():
		print("TARGET_PATTERN_RESOLVER_PROBE_OK patterns=%d facings=%d" % [covered_patterns.size(), FacingDirections.VALID_DIRECTIONS.size()])
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _test_non_directional_patterns(board_hexes: Dictionary, origin: Vector2i) -> void:
	_assert_result(
		BoardQueryModel.resolve_target_pattern(board_hexes, &"Target", origin),
		&"Target",
		"piece",
		origin,
		"",
		_clip(board_hexes, [origin]),
	)
	_assert_result(
		BoardQueryModel.resolve_target_pattern(board_hexes, &"Radius", origin, {"radius": 1}),
		&"Radius",
		"hex",
		origin,
		"",
		_radius_expected(board_hexes, origin, 1),
	)
	_assert_result(
		BoardQueryModel.resolve_target_pattern(board_hexes, &"Ring", origin, {"distances": [1, 2]}),
		&"Ring",
		"hex",
		origin,
		"",
		_ring_expected(board_hexes, origin, [1, 2]),
	)

func _test_directional_patterns(board_hexes: Dictionary, origin: Vector2i, label: String) -> void:
	for facing in FacingDirections.VALID_DIRECTIONS:
		var facing_name := FacingDirections.name_for(facing)
		_assert_directional(board_hexes, origin, &"FrontCone", facing, _cone_expected(board_hexes, origin, facing, 3), "%s FrontCone %s" % [label, facing_name])
		_assert_directional(board_hexes, origin, &"BackCone", facing, _cone_expected(board_hexes, origin, facing + 3, 3), "%s BackCone %s" % [label, facing_name])
		_assert_directional(board_hexes, origin, &"FrontLine", facing, _line_expected(board_hexes, origin, facing, 3), "%s FrontLine %s" % [label, facing_name])
		_assert_directional(board_hexes, origin, &"BackLine", facing, _line_expected(board_hexes, origin, facing + 3, 3), "%s BackLine %s" % [label, facing_name])
		_assert_directional(board_hexes, origin, &"Sides", facing, _ray_group_expected(board_hexes, origin, facing, 3, [-1, 1]), "%s Sides %s" % [label, facing_name])
		_assert_directional(board_hexes, origin, &"Cross", facing, _ray_group_expected(board_hexes, origin, facing, 3, [-1, 1, -2, 2]), "%s Cross %s" % [label, facing_name])
		facing_checks += 1

func _assert_directional(board_hexes: Dictionary, origin: Vector2i, catalog_id: StringName, facing: int, expected: Array[Vector2i], label: String) -> void:
	var result: Dictionary = BoardQueryModel.resolve_target_pattern(board_hexes, catalog_id, origin, {
		"facing": facing,
		"range": 3,
	})
	_assert_result(result, catalog_id, "direction", origin, FacingDirections.name_for(facing), expected, label)
	var repeated: Dictionary = BoardQueryModel.resolve_target_pattern(board_hexes, catalog_id, origin, {
		"facing": facing,
		"range": 3,
	})
	_assert(repeated["impacts"] == result["impacts"], "%s must resolve in stable order on repeated calls." % label)

func _assert_result(result: Dictionary, catalog_id: StringName, binding: String, origin: Vector2i, facing_name: String, expected_impacts: Array[Vector2i], label: String = "") -> void:
	var subject := str(catalog_id) if label.is_empty() else label
	covered_patterns[str(catalog_id)] = true
	_assert(result.get("catalog_id", "") == str(catalog_id), "%s must expose its catalog ID." % subject)
	_assert(result.get("selection_binding", "") == binding, "%s must expose selection binding %s." % [subject, binding])
	_assert(result.get("origin", Vector2i.ZERO) == origin, "%s must expose the resolved origin." % subject)
	_assert(result.get("anchor", Vector2i.ZERO) == origin, "%s must expose the selected anchor." % subject)
	_assert(result.get("facing", "") == facing_name, "%s must expose the resolved Facing only when applicable." % subject)
	_assert(result.get("impacts", []) == expected_impacts, "%s impacts expected %s but got %s." % [subject, str(expected_impacts), str(result.get("impacts", []))])

func _clip(board_hexes: Dictionary, coords_list: Array[Vector2i]) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for coords in coords_list:
		if board_hexes.has(coords):
			result.append(coords)
	return result

func _radius_expected(board_hexes: Dictionary, origin: Vector2i, radius: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for coords in board_hexes:
		if BoardQueryModel.hex_distance(origin, coords) <= radius:
			result.append(coords)
	return _sort_by_distance_then_axial(result, origin)

func _ring_expected(board_hexes: Dictionary, origin: Vector2i, distances: Array) -> Array[Vector2i]:
	var allowed: Dictionary = {}
	for distance in distances:
		allowed[int(distance)] = true
	var result: Array[Vector2i] = []
	for coords in board_hexes:
		if allowed.has(BoardQueryModel.hex_distance(origin, coords)):
			result.append(coords)
	return _sort_by_distance_then_axial(result, origin)

func _cone_expected(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int) -> Array[Vector2i]:
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

func _line_expected(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	var direction := FacingDirections.axial_delta_for(facing)
	for distance in range(1, maximum_range + 1):
		var coords := origin + direction * distance
		if not board_hexes.has(coords):
			break
		result.append(coords)
	return result

func _ray_group_expected(board_hexes: Dictionary, origin: Vector2i, facing: int, maximum_range: int, direction_offsets: Array[int]) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for distance in range(1, maximum_range + 1):
		for offset in direction_offsets:
			var coords: Vector2i = origin + FacingDirections.axial_delta_for(facing + offset) * distance
			if board_hexes.has(coords) and not result.has(coords):
				result.append(coords)
	return result

func _sort_by_distance_then_axial(coords_list: Array[Vector2i], origin: Vector2i) -> Array[Vector2i]:
	coords_list.sort_custom(func(first: Vector2i, second: Vector2i) -> bool:
		var first_distance := BoardQueryModel.hex_distance(origin, first)
		var second_distance := BoardQueryModel.hex_distance(origin, second)
		if first_distance != second_distance:
			return first_distance < second_distance
		if first.x != second.x:
			return first.x < second.x
		return first.y < second.y
	)
	return coords_list

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
