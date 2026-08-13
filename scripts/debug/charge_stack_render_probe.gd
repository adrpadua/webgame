extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const SCREENSHOT_PATH := "res://tmp/charge-stack-preview.png"

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await _wait_frames(3)
	main._apply_viewport_size(Vector2(390, 844))
	var player = main.get_node("PlayerState")
	var quick_top := _first_card_for_window(player.hand, &"quick")
	if quick_top != null:
		player.prepare_slot(0, quick_top)
	main._on_mobile_continue_pressed()
	await _wait_frames(4)
	if not player.hand.is_empty():
		player.charge_slot(0, player.hand[0])
	await _wait_frames(2)
	if DisplayServer.get_name() != "headless":
		var path := ProjectSettings.globalize_path(SCREENSHOT_PATH)
		DirAccess.make_dir_recursive_absolute(path.get_base_dir())
		root.get_viewport().get_texture().get_image().save_png(path)
	print("CHARGE_STACK_RENDER_PROBE_OK screenshot=%s" % ProjectSettings.globalize_path(SCREENSHOT_PATH))
	quit()

func _first_card_for_window(cards: Array, window: StringName) -> Resource:
	for card: Resource in cards:
		if card.get_window_speed() == window:
			return card
	return null

func _wait_frames(count: int) -> void:
	for _index in count:
		await process_frame
