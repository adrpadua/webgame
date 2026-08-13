extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const SCREENSHOT_PATH := "res://tmp/board-navigation-zoomed.png"

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(3)
	main._apply_viewport_size(Vector2(390, 844))
	await _wait_frames(2)

	var grid: Control = main.get_node("%HexGrid")
	var initial_center: Vector2 = grid.get_tile_center(grid.tiles[Vector2i.ZERO])
	assert(is_equal_approx(grid.view_zoom, 1.0), "Board must begin fully fitted.")
	var left_point: Vector2 = grid.tiles[Vector2i(-2, 1)].get_global_rect().get_center()
	var right_point: Vector2 = grid.tiles[Vector2i(2, -1)].get_global_rect().get_center()
	_send_touch(grid, 0, left_point, true)
	_send_touch(grid, 1, right_point, true)
	_send_drag(grid, 0, left_point + Vector2(-25.0, 12.0), Vector2(-25.0, 12.0))
	_send_drag(grid, 1, right_point + Vector2(35.0, 12.0), Vector2(35.0, 12.0))
	assert(grid.view_zoom > 1.0, "Two-finger touch input must increase board zoom.")
	assert(grid.view_pan.length() > 0.0, "Two-finger touch input must pan around its moving center.")
	_send_touch(grid, 0, left_point + Vector2(-25.0, 12.0), false)
	_send_touch(grid, 1, right_point + Vector2(35.0, 12.0), false)
	await process_frame

	var one_finger_start: Vector2 = grid.tiles[Vector2i(-2, 2)].get_global_rect().get_center()
	var pan_before: Vector2 = grid.view_pan
	_send_touch(grid, 2, one_finger_start, true)
	_send_drag(grid, 2, one_finger_start + Vector2(34.0, -18.0), Vector2(34.0, -18.0))
	_send_touch(grid, 2, one_finger_start + Vector2(34.0, -18.0), false)
	assert(grid.view_pan != pan_before, "A one-finger drag beginning on open board space must pan.")
	await process_frame
	var selected_count := [0]
	grid.tile_selected.connect(func(_tile) -> void: selected_count[0] += 1)
	grid._on_tile_selected(grid.tiles[Vector2i(-2, 2)])
	assert(selected_count[0] == 1, "The first intentional tile tap after pan must not be swallowed.")

	var clamped_pan: Vector2 = grid.view_pan
	grid.pan_by(Vector2(10000.0, -10000.0))
	assert(grid.view_pan != clamped_pan and absf(grid.view_pan.x) < 10000.0, "Board pan must clamp to navigable bounds.")
	await _save_screenshot()

	var piece_center: Vector2 = grid.player_piece.get_global_rect().get_center()
	assert(grid._position_hits_piece(piece_center), "Touches beginning on a unit must remain unit interactions.")
	_send_touch(grid, 3, piece_center, true)
	assert(not grid.active_touches.has(3) and grid.piece_blocked_touches.has(3), "A unit-start touch must not enter board navigation.")
	_send_drag(grid, 3, piece_center + Vector2(30.0, 0.0), Vector2(30.0, 0.0))
	assert(not grid.active_touches.has(3), "A unit drag must remain excluded from board navigation.")
	_send_touch(grid, 3, piece_center + Vector2(30.0, 0.0), false)
	grid.mouse_pan_active = true
	var outside_release := InputEventMouseButton.new()
	outside_release.button_index = MOUSE_BUTTON_MIDDLE
	outside_release.pressed = false
	outside_release.position = Vector2(-20.0, -20.0)
	grid._input(outside_release)
	assert(not grid.mouse_pan_active, "Mouse pan must end even when released outside the board.")

	var first_engine_id: int = grid.synced_engine_instance_id
	main._on_restart_pressed()
	await _wait_frames(2)
	assert(grid.synced_engine_instance_id != first_engine_id, "Encounter restart must bind a new engine instance.")
	assert(is_equal_approx(grid.view_zoom, 1.0) and grid.view_pan.is_zero_approx(), "A restarted Encounter must reopen in the fitted view.")
	grid.reset_view()
	assert(is_equal_approx(grid.view_zoom, 1.0) and grid.view_pan.is_zero_approx(), "Reset must restore the fitted board view.")
	print("BOARD_NAVIGATION_PROBE_OK zoom=%.1f pan_clamped=true piece_drag_preserved=true" % grid.view_zoom)
	quit()

func _wait_frames(count: int) -> void:
	for _index in count:
		await process_frame

func _send_touch(grid: Control, index: int, position: Vector2, pressed: bool) -> void:
	var event := InputEventScreenTouch.new()
	event.index = index
	event.position = position
	event.pressed = pressed
	grid._handle_screen_touch(event)

func _send_drag(grid: Control, index: int, position: Vector2, relative: Vector2) -> void:
	var event := InputEventScreenDrag.new()
	event.index = index
	event.position = position
	event.relative = relative
	grid._handle_screen_drag(event)

func _save_screenshot() -> void:
	if DisplayServer.get_name() == "headless":
		return
	await process_frame
	var path := ProjectSettings.globalize_path(SCREENSHOT_PATH)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	var error := root.get_viewport().get_texture().get_image().save_png(path)
	assert(error == OK, "Board navigation screenshot could not be saved: %s." % error)
