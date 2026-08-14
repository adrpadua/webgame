extends SceneTree

const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

var failures: Array[String] = []

func _initialize() -> void:
	_test_through_tank_line()
	_test_inclusion_and_continuation_flags()
	_test_all_facing_snaps()
	_test_edge_clipping()
	_test_same_hex_invalid()
	_test_snapped_non_collinear_target()
	if failures.is_empty():
		print("TARGET_BOUND_PATTERN_PROBE_OK facings=6")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _test_through_tank_line() -> void:
	var result := BoardQueryModel.resolve_target_bound_pattern(
		BoardQueryModel.hexes_in_radius(5),
		_piece(&"boss", &"boss", Vector2i(0, 0)),
		[
			_piece(&"dps_before", &"damage", Vector2i(1, 0)),
			_piece(&"tank", &"tank", Vector2i(2, 0)),
			_piece(&"dps_behind", &"damage", Vector2i(3, 0)),
		],
		&"tank",
		&"FrontLine",
		{"range": 3, "include_selected_piece": true, "continue_beyond_selected_piece": true}
	)
	_assert(result["valid"], "A target-bound FrontLine should resolve when a Tank target exists.")
	_assert(result["selected_piece_id"] == "tank", "The selected Piece must be the Tank.")
	_assert(result["selected_coords"] == Vector2i(2, 0), "The selected Tank coordinates must be exposed separately.")
	_assert(result["facing"] == "E", "Source-to-Tank Facing should snap to E.")
	_assert(result["impacts"] == [Vector2i(1, 0), Vector2i(2, 0), Vector2i(3, 0)], "Through-Tank line should include before, Tank, and beyond cells in order.")
	_assert(result["affected_piece_ids"] == ["dps_before", "tank", "dps_behind"], "Affected Piece IDs must be derived from impacts while preserving selected identity separately.")

func _test_inclusion_and_continuation_flags() -> void:
	var board := BoardQueryModel.hexes_in_radius(5)
	var source := _piece(&"boss", &"boss", Vector2i(0, 0))
	var pieces := [
		_piece(&"tank", &"tank", Vector2i(2, 0)),
		_piece(&"dps_behind", &"damage", Vector2i(3, 0)),
	]
	var no_tank := BoardQueryModel.resolve_target_bound_pattern(board, source, pieces, &"tank", &"FrontLine", {
		"range": 3,
		"include_selected_piece": false,
		"continue_beyond_selected_piece": true,
	})
	_assert(no_tank["impacts"] == [Vector2i(1, 0), Vector2i(3, 0)], "Authored exclusion should remove the selected Tank hex without removing beyond cells.")
	_assert(no_tank["affected_piece_ids"] == ["dps_behind"], "Excluding the selected Tank should keep it out of affected Piece IDs.")
	var no_beyond := BoardQueryModel.resolve_target_bound_pattern(board, source, pieces, &"tank", &"FrontLine", {
		"range": 3,
		"include_selected_piece": true,
		"continue_beyond_selected_piece": false,
	})
	_assert(no_beyond["impacts"] == [Vector2i(1, 0), Vector2i(2, 0)], "Authored no-continuation should clip cells beyond the selected Tank.")
	_assert(no_beyond["affected_piece_ids"] == ["tank"], "No-continuation should affect the selected Tank but not the Piece behind it.")

func _test_all_facing_snaps() -> void:
	var board := BoardQueryModel.hexes_in_radius(5)
	for facing in FacingDirections.VALID_DIRECTIONS:
		var target_coords: Vector2i = FacingDirections.axial_delta_for(facing) * 2
		var result := BoardQueryModel.resolve_target_bound_pattern(
			board,
			_piece(&"boss", &"boss", Vector2i(0, 0)),
			[_piece(&"tank", &"tank", target_coords)],
			&"tank",
			&"FrontLine",
			{"range": 2, "include_selected_piece": true, "continue_beyond_selected_piece": true}
		)
		_assert(result["valid"], "Facing %s should resolve." % FacingDirections.name_for(facing))
		_assert(result["facing"] == FacingDirections.name_for(facing), "Target-bound snap should expose Facing %s." % FacingDirections.name_for(facing))
		_assert(result["impacts"].has(target_coords), "Facing %s should include the selected Tank hex when authored." % FacingDirections.name_for(facing))

func _test_edge_clipping() -> void:
	var result := BoardQueryModel.resolve_target_bound_pattern(
		BoardQueryModel.hexes_in_radius(2),
		_piece(&"boss", &"boss", Vector2i(1, -1)),
		[
			_piece(&"tank", &"tank", Vector2i(2, -1)),
			_piece(&"offboard_future", &"damage", Vector2i(3, -1)),
		],
		&"tank",
		&"FrontLine",
		{"range": 3, "include_selected_piece": true, "continue_beyond_selected_piece": true}
	)
	_assert(result["impacts"] == [Vector2i(2, -1)], "Target-bound patterns must clip off-board continuation cells.")
	_assert(result["affected_piece_ids"] == ["tank"], "Off-board Pieces must not become affected by clipped cells.")

func _test_same_hex_invalid() -> void:
	var result := BoardQueryModel.resolve_target_bound_pattern(
		BoardQueryModel.hexes_in_radius(2),
		_piece(&"boss", &"boss", Vector2i(0, 0)),
		[_piece(&"tank", &"tank", Vector2i(0, 0))],
		&"tank",
		&"FrontLine",
		{"range": 2, "include_selected_piece": true}
	)
	_assert(not result["valid"], "Same-hex target-bound resolution must be invalid without an authored fallback.")
	_assert(result["invalid_reason"] == "same_hex_no_direction", "Same-hex invalid reason must be stable.")

func _test_snapped_non_collinear_target() -> void:
	var result := BoardQueryModel.resolve_target_bound_pattern(
		BoardQueryModel.hexes_in_radius(5),
		_piece(&"boss", &"boss", Vector2i(0, 0)),
		[_piece(&"tank", &"tank", Vector2i(2, -1))],
		&"tank",
		&"FrontCone",
		{"range": 2, "include_selected_piece": true, "continue_beyond_selected_piece": true}
	)
	_assert(result["valid"], "A non-collinear selected Tank should still snap to a legal Facing.")
	_assert(FacingDirections.VALID_DIRECTIONS.map(func(facing: int) -> String: return FacingDirections.name_for(facing)).has(result["facing"]), "Snapped Facing must be one of the six legal Facings.")
	_assert(result["selected_piece_id"] == "tank" and result["affected_piece_ids"].has("tank"), "Authored inclusion should keep the selected Tank distinct and affected after snap.")

func _piece(id: StringName, role: StringName, coords: Vector2i) -> Dictionary:
	return {"id": id, "role": role, "coords": coords}

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
