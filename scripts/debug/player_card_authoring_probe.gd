extends SceneTree

const CARD_DIRECTORY := "res://resources/cards/tank"

func _initialize() -> void:
	for path in DirAccess.get_files_at(CARD_DIRECTORY):
		if not path.ends_with(".tres"):
			continue
		var card = load("%s/%s" % [CARD_DIRECTORY, path])
		_assert(card.rules_text.to_lower().find("embermaw") == -1, "%s must not name Embermaw." % card.title)
		_assert(card.rules_text.to_lower().find("whelp") == -1, "%s must not name a specific enemy family." % card.title)

	var strike = load("res://resources/cards/tank/steady_strike.tres")
	var guard = load("res://resources/cards/tank/iron_guard.tres")
	_assert(strike.rules_text == "Deal 2 damage to the boss. Gain +1 damage for each charged card.", "Steady Strike must use the canonical generic charge wording.")
	_assert(guard.rules_text == "Gain 3 Armor. Gain +1 Armor for each charged Guard card.", "Iron Guard must state its Keyword Charge Modifier wording.")
	print("PLAYER_CARD_AUTHORING_PROBE_OK")
	quit()

func _assert(condition: bool, message: String) -> void:
	assert(condition, message)
