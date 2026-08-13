extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

func _initialize() -> void:
	print("SETTINGS viewport=%sx%s override=%sx%s window=%s" % [
		ProjectSettings.get_setting("display/window/size/viewport_width"),
		ProjectSettings.get_setting("display/window/size/viewport_height"),
		ProjectSettings.get_setting("display/window/size/window_width_override"),
		ProjectSettings.get_setting("display/window/size/window_height_override"),
		DisplayServer.window_get_size(),
	])
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(Vector2(1280, 720))
	await process_frame
	for path in [".", "Root", "Root/TopBar", "Root/HandScroll", "Root/MainArea", "Root/MainArea/HexGrid"]:
		var node: Control = main.get_node(path) if path != "." else main
		print("LAYOUT %s pos=%s size=%s min=%s" % [path, node.position, node.size, node.custom_minimum_size])
	var root_control: Control = main.get_node("Root")
	assert(main.size == Vector2(1280, 720), "Main must match the game viewport.")
	assert(root_control.position.y >= 0.0 and root_control.position.y + root_control.size.y <= 720.0, "Root must fit inside the game viewport.")
	quit()
