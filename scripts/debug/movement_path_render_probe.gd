extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const SCREENSHOT_PATH := "res://tmp/movement-path-preview.png"

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(3)
	main._apply_viewport_size(Vector2(390, 844))
	main._on_mobile_continue_pressed()
	await _wait_frames(4)
	var grid = main.get_node("%HexGrid")
	grid.zoom_at(grid.size * 0.5, 1.45)
	grid.pan_by(Vector2(24.0, -18.0))
	assert(grid.view_zoom > 1.0 and not grid.view_pan.is_zero_approx(), "Movement overlay probe must render a transformed board.")
	grid._on_player_drag_started(grid.player_piece)
	await _wait_frames(2)
	if DisplayServer.get_name() != "headless":
		var path := ProjectSettings.globalize_path(SCREENSHOT_PATH)
		DirAccess.make_dir_recursive_absolute(path.get_base_dir())
		root.get_viewport().get_texture().get_image().save_png(path)
	print("MOVEMENT_PATH_RENDER_PROBE_OK zoom=%.2f pan=%s screenshot=%s" % [grid.view_zoom, grid.view_pan, ProjectSettings.globalize_path(SCREENSHOT_PATH)])
	quit()

func _wait_frames(count: int) -> void:
	for _index in count:
		await process_frame
