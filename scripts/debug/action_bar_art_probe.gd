extends SceneTree

const ActionBarSlotScene := preload("res://scripts/ui/ActionBarSlot.gd")

func _init() -> void:
	var card = load("res://resources/cards/tank/guard_stance.tres")
	var charge = load("res://resources/cards/tank/taunting_challenge.tres")
	var slot := ActionBarSlotScene.new()
	get_root().add_child(slot)
	slot.bind(0, {"top_card": card, "charges": [charge]}, true, true)
	_assert(slot.text == "", "A loaded compact action slot should render as artwork, not text.")
	_assert(slot.custom_minimum_size.y >= 60.0, "A loaded compact action slot needs enough height for card art.")
	_assert(slot.tooltip_text.begins_with("Guard card"), "Loaded action slots should preserve card type context.")
	_assert(slot.loaded_card == card, "The loaded card should be retained for artwork rendering.")
	slot.queue_free()
	print("ACTION_BAR_ART_PROBE_OK")
	quit()

func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	push_error(message)
	quit(1)
