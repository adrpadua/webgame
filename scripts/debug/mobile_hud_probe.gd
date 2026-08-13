extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(Vector2(390, 844))
	await process_frame

	var root_control: Control = main.get_node("Root")
	var main_area: BoxContainer = main.get_node("Root/MainArea")
	var hex_grid: Control = main.get_node("%HexGrid")
	var action_bar: Control = main.get_node("%ActionBarView")
	var mobile_status: Control = main.get_node("%MobileStatus")
	var mobile_prompt: Control = main.get_node("%MobileEndPhasePrompt")
	var mobile_turn_tracker: Control = main.get_node("%MobileTurnTracker")
	var mobile_hand_bar: Control = main.get_node("%MobileTempoBar")
	var hand_scroll: ScrollContainer = main.get_node("Root/HandScroll")
	var top_bar: Control = main.get_node("Root/TopBar")
	var right_panel: Control = main.get_node("Root/MainArea/RightPanelScroll")

	print("MOBILE root=%s main_area=%s board=%s action_bar=%s" % [root_control.size, main_area.size, hex_grid.size, action_bar.size])
	assert(main.size == Vector2(390, 844), "Mobile canvas must match the portrait viewport.")
	assert(root_control.position.y >= 0.0 and root_control.position.y + root_control.size.y <= 844.0, "Mobile root must fit inside the portrait viewport.")
	assert(main_area.vertical, "Mobile HUD must stack the board and action bar vertically.")
	assert(mobile_status.visible, "Mobile status must be visible.")
	assert(mobile_turn_tracker.visible, "Mobile turn tracker must be visible below the hand.")
	assert(mobile_hand_bar.visible, "Mobile Hand status must be visible above the action bar.")
	assert(mobile_prompt.visible and mobile_prompt.text.contains("prepare") and mobile_prompt.text.contains("Continue"), "The Loadout guide should teach preparation and continuing.")
	assert(main.get_node_or_null("Root/MobileCommands") == null, "Mobile commands must be replaced by direct interactions.")
	assert(not top_bar.visible and not right_panel.visible, "Desktop-only panels must not consume mobile space.")
	assert(hex_grid.get_index() < action_bar.get_parent().get_index() or hex_grid.position.y <= action_bar.global_position.y, "Board must appear before the action bar in mobile reading order.")
	assert(main_area.global_position.y < hand_scroll.global_position.y, "The board must appear above the hand in portrait layout.")
	assert(mobile_hand_bar.global_position.y < action_bar.global_position.y, "Hand status must sit above the action bar.")
	assert(hand_scroll.global_position.y < mobile_turn_tracker.global_position.y, "Turn tracker must sit below the hand.")
	assert(hand_scroll.global_position.y + hand_scroll.size.y <= root_control.global_position.y + root_control.size.y, "The hand must remain in the reachable bottom zone.")
	assert(main.get_node_or_null("Root/CombatLogScroll") == null, "Combat log must not be part of the player HUD.")
	print("MOBILE_HUD_PROBE_OK")
	quit()
