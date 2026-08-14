extends SceneTree

const ActionBarSlotScene := preload("res://scripts/ui/ActionBarSlot.gd")

func _init() -> void:
	var card = load("res://resources/cards/tank/guard_stance.tres")
	var charge = load("res://resources/cards/tank/taunting_challenge.tres")
	var slot := ActionBarSlotScene.new()
	get_root().add_child(slot)
	slot.bind(0, {"top_card": card, "charges": [charge]}, true, true, &"quick")
	_assert(slot.text == "", "A loaded compact action slot should render as artwork, not text.")
	_assert(slot.custom_minimum_size.y >= 60.0, "A loaded compact action slot needs enough height for card art.")
	_assert(slot.custom_minimum_size.y <= 80.0, "The compact action bar should stay visibly smaller than hand cards.")
	_assert(slot.custom_minimum_size.x < 142.0, "A compact action slot should be narrower than a hand card.")
	_assert(slot._get_drop_intent_label() == "CHARGE", "Dropping on a loaded slot during an action window should advertise Charge.")
	_assert(slot.tooltip_text.begins_with("Guard card"), "Loaded action slots should preserve card type context.")
	_assert(slot.loaded_card == card, "The loaded card should be retained for artwork rendering.")
	var tooltip: Control = slot._make_custom_tooltip(slot.tooltip_text)
	get_root().add_child(tooltip)
	await process_frame
	_assert(tooltip.get_combined_minimum_size().x <= 300.0, "Action slot tooltip should stay within the portrait-width budget.")
	tooltip.queue_free()
	slot.bind(0, {"top_card": card, "charges": []}, true, true, &"loadout")
	_assert(slot._get_drop_intent_label() == "REPLACE", "Dropping on a loaded slot during Loadout should advertise Replace.")
	slot.bind(0, {"top_card": null, "charges": []}, true, true, &"quick")
	_assert(slot._get_drop_intent_label() == "LOAD", "Dropping on an empty slot should advertise Load.")
	slot.queue_free()
	print("ACTION_BAR_ART_PROBE_OK")
	quit()

func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	push_error(message)
	quit(1)
