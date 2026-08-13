extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const SCREENSHOT_PATH := "res://tmp/mobile-tile-info.png"

var failures: Array[String] = []

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(2)
	main._apply_viewport_size(Vector2(390, 844))
	await _wait_frames(3)

	var hex_grid = main.get_node("%HexGrid")
	var pane: Control = main.get_node("%TileInfoPane")
	var name_label: Label = main.get_node("%TileInfoName")
	var subtitle_label: Label = main.get_node("%TileInfoSubtitle")
	var health_bar: ProgressBar = main.get_node("%TileInfoHealth")
	var stats_label: Label = main.get_node("%TileInfoStats")

	_assert(not pane.visible, "Tile info pane should start hidden.")

	hex_grid.tiles[Vector2i(0, 0)]._pressed()
	await _wait_frames(2)
	_assert(pane.visible, "Tapping a player tile should show the pane.")
	_assert(pane.global_position.y < 120.0, "Mobile tile HUD should appear at the top of the screen.")
	_assert(name_label.text == "Player", "Player tile should show player identity.")
	_assert(subtitle_label.text.contains("Player"), "Player tile should show owner context.")
	_assert(health_bar.visible and health_bar.max_value >= 1.0, "Occupied tile should show a health bar.")
	_assert(stats_label.text.contains("Terrain"), "Occupied tile should include terrain state.")
	var player_style: StyleBoxFlat = pane.get_theme_stylebox("panel")

	hex_grid.tiles[Vector2i(1, -1)]._pressed()
	await _wait_frames(2)
	_assert(name_label.text == "Ember", "Boss tile should show boss identity.")
	_assert(subtitle_label.text.contains("Boss"), "Boss tile should show owner context.")
	var boss_style: StyleBoxFlat = pane.get_theme_stylebox("panel")
	_assert(boss_style.border_color.r > boss_style.border_color.b, "Boss pane should use a warm enemy border.")
	_assert(boss_style.border_color != player_style.border_color, "Boss pane should be visually distinct from player pane.")
	await _save_screenshot()

	hex_grid.tiles[Vector2i(-1, 0)]._pressed()
	await _wait_frames(2)
	_assert(name_label.text.begins_with("Hex"), "Empty tile should show hex identity.")
	_assert(not health_bar.visible, "Empty tile should hide the health bar.")
	_assert(stats_label.text.contains("Range"), "Empty tile should show range context.")

	if failures.is_empty():
		print("TILE_INFO_PROBE_OK screenshot=%s" % ProjectSettings.globalize_path(SCREENSHOT_PATH))
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _save_screenshot() -> void:
	if DisplayServer.get_name() == "headless":
		print("TILE_INFO_SCREENSHOT_UNAVAILABLE renderer=headless")
		return
	var path := ProjectSettings.globalize_path(SCREENSHOT_PATH)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	await _wait_frames(2)
	var image: Image = root.get_viewport().get_texture().get_image()
	if image == null:
		print("TILE_INFO_SCREENSHOT_UNAVAILABLE renderer=%s" % DisplayServer.get_name())
		return
	var error := image.save_png(path)
	if error != OK:
		failures.append("Tile info screenshot could not be saved: %s." % error)

func _wait_frames(count: int) -> void:
	for _index in count:
		await process_frame

func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	failures.append(message)
