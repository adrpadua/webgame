extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const OUTPUT_DIR := "res://tmp/card-action-bar-visuals"

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	DisplayServer.window_set_size(Vector2i(390, 844))
	main._apply_viewport_size(Vector2(390, 844))
	await process_frame

	var quick_card: Resource = load("res://resources/cards/tank/guard_stance.tres")
	var charge_card: Resource = load("res://resources/cards/tank/taunting_challenge.tres")
	var charges: Array = []
	for index in quick_card.get_charge_cap():
		charges.append(charge_card)

	_set_slot(main, null, [], &"", &"loadout")
	await _capture("mobile-empty")
	main._on_card_selected(main.player.hand[0])
	await create_timer(0.16).timeout
	await _capture("mobile-selected")

	main.selected_card = null
	_set_slot(main, quick_card, [], &"", &"quick")
	await _capture("mobile-loaded")
	_set_slot(main, quick_card, [charge_card], &"", &"quick")
	await _capture("mobile-ready")
	_set_slot(main, quick_card, [charge_card], &"", &"slow")
	await _capture("mobile-charged-locked")
	_set_slot(main, quick_card, charges, &"", &"slow")
	await _capture("mobile-primed")
	_set_slot(main, quick_card, [charge_card], &"quick", &"quick")
	await _capture("mobile-activated")

	main.selected_card = main.player.hand[0]
	_set_slot(main, quick_card, [], &"", &"quick")
	await process_frame
	var slot: Node = main.action_bar_view.get_child(0)
	slot._set_drop_hover(true)
	await _capture("mobile-drag-hover")

	var desktop_viewport := SubViewport.new()
	desktop_viewport.size = Vector2i(1280, 720)
	desktop_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(desktop_viewport)
	var desktop_main := MAIN_SCENE.instantiate()
	desktop_viewport.add_child(desktop_main)
	await process_frame
	await process_frame
	desktop_main._apply_viewport_size(Vector2(1280, 720))
	desktop_main._on_card_selected(desktop_main.player.hand[0])
	await create_timer(0.16).timeout
	await _capture_viewport("desktop-selected", desktop_viewport)
	print("CARD_ACTION_BAR_VISUAL_PROBE_OK dir=%s" % ProjectSettings.globalize_path(OUTPUT_DIR))
	quit()

func _set_slot(main: Node, card: Resource, charges: Array, activated_window: StringName, window: StringName) -> void:
	main.player.current_window = window
	main.player.action_bar[0] = {"top_card": card, "charges": charges.duplicate(), "activated_window": activated_window}
	main.player.action_bar[1] = {"top_card": null, "charges": [], "activated_window": &""}
	main.player.action_bar_changed.emit()
	main._refresh_status()
	await process_frame

func _capture(name: String) -> void:
	await process_frame
	await process_frame
	var directory := ProjectSettings.globalize_path(OUTPUT_DIR)
	DirAccess.make_dir_recursive_absolute(directory)
	var image: Image = root.get_viewport().get_texture().get_image()
	if image == null or image.is_empty():
		push_error("Visual probe screenshot unavailable: %s" % name)
		quit(1)
		return
	var path := "%s/%s.png" % [directory, name]
	var error := image.save_png(path)
	if error != OK:
		push_error("Visual probe screenshot could not be saved: %s" % path)
		quit(1)

func _capture_viewport(name: String, viewport: Viewport) -> void:
	await process_frame
	await process_frame
	var directory := ProjectSettings.globalize_path(OUTPUT_DIR)
	DirAccess.make_dir_recursive_absolute(directory)
	var image: Image = viewport.get_texture().get_image()
	if image == null or image.is_empty():
		push_error("Visual probe viewport screenshot unavailable: %s" % name)
		quit(1)
		return
	var path := "%s/%s.png" % [directory, name]
	var error := image.save_png(path)
	if error != OK:
		push_error("Visual probe viewport screenshot could not be saved: %s" % path)
		quit(1)
