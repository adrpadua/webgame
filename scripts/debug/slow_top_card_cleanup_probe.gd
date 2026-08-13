extends SceneTree

const ScenarioModel := preload("res://scripts/debug/EncounterProbeScenario.gd")
const ProbeRunner := preload("res://scripts/debug/EncounterProbeRunner.gd")

var failures: Array[String] = []

func _initialize() -> void:
	var scenario: RefCounted = _scenario()
	var first := ProbeRunner.run(scenario)
	_assert(first["failures"].is_empty(), "The Slow Top Card cleanup action tape must satisfy all declared outcomes.")
	_assert(first["artifact_path"] == "", "A successful Slow Top Card Probe must not write a failure artifact.")

	_assert(first["trace"]["steps"][1]["expectation_met"], "Fortify must reject firing during Loadout without changing rules state.")
	var quick_rejection: Dictionary = first["trace"]["steps"][5]
	_assert(quick_rejection["expectation_met"], "Fortify must reject firing during Quick without changing rules state.")
	var full_slot: Dictionary = first["trace"]["steps"][8]["snapshot"]["heroes"][0]["action_bar"][0]
	_assert(full_slot["top_card_id"] == "fortify", "Fortify must remain loaded when its second Charge is added during Slow.")
	_assert(full_slot["charge_card_ids"].size() == 2, "Fortify must hold exactly two Charges at full charge.")
	_assert(first["trace"]["steps"][9]["expectation_met"], "A third Fortify Charge must reject without changing rules state.")

	var fire_step: Dictionary = first["trace"]["steps"][10]
	var fired_hero: Dictionary = fire_step["snapshot"]["heroes"][0]
	var fired_slot: Dictionary = fired_hero["action_bar"][0]
	_assert(fire_step["events"][0]["succeeded"], "Fully charged Fortify must fire during Slow.")
	_assert(fired_hero["armor"] == 6, "Fortify must add exactly 6 Armor when fired.")
	_assert(fired_slot["top_card_id"] == "fortify", "A fired Slow Top Card must remain until the Slow cleanup boundary.")
	_assert(fired_slot["charge_card_ids"].size() == 2, "A fired Slow Top Card must retain both Charges until cleanup.")
	_assert(fired_slot["activated_window"] == "slow", "Fired Fortify must be marked activated for Slow.")
	_assert(first["trace"]["steps"][11]["expectation_met"], "Charging Fortify after it fires must reject without changing rules state.")

	var cleanup_step: Dictionary = first["trace"]["steps"][12]
	var cleanup_hero: Dictionary = cleanup_step["snapshot"]["heroes"][0]
	var cleanup_slot: Dictionary = cleanup_hero["action_bar"][0]
	_assert(cleanup_step["phase"] == "loadout", "Advancing out of Slow must enter the next Loadout.")
	_assert(cleanup_slot["top_card_id"] == "", "Slow cleanup must clear the fired full-charge Top Card.")
	_assert(cleanup_slot["charge_card_ids"].is_empty(), "Slow cleanup must clear the full Charge Stack.")
	_assert(cleanup_hero["discard_card_ids"].count("fortify") == 1, "Slow cleanup must discard Fortify exactly once.")
	_assert(cleanup_hero["discard_card_ids"].count("iron_guard") == 2, "Slow cleanup must discard both committed Charges.")

	var replay := ProbeRunner.replay(scenario, first["trace"])
	_assert(replay["failures"].is_empty(), "The Slow Top Card trace must replay without harness failures.")
	_assert(JSON.stringify(first["trace"]["steps"]) == JSON.stringify(replay["trace"]["steps"]), "Slow Top Card replay must produce equal normalized steps.")
	_assert(JSON.stringify(first["trace"]["final_snapshot"]) == JSON.stringify(replay["trace"]["final_snapshot"]), "Slow Top Card replay must produce an equal final rules snapshot.")
	_test_slow_zero_charge_rejection()

	if failures.is_empty():
		print("SLOW_TOP_CARD_CLEANUP_PROBE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _scenario():
	var fortify = load("res://resources/cards/tank/fortify.tres")
	var iron_guard = load("res://resources/cards/tank/iron_guard.tres")
	var scenario := ScenarioModel.new(&"slow_top_card_cleanup", 1, 2403, {
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": 4},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "slot_count": 2, "refill_target": 4}],
		"primary_hero_id": &"guardian",
	})
	scenario.register_card(fortify).register_card(iron_guard)
	scenario.give_hand(&"guardian", [&"fortify", &"iron_guard", &"iron_guard", &"iron_guard"])
	scenario.give_deck(&"guardian", [&"iron_guard", &"iron_guard", &"iron_guard", &"iron_guard"])
	scenario.load_slot(&"guardian", 0, &"fortify")
	scenario.fire_slot(&"guardian", 0).expect_rejection("at least one charged card")
	scenario.advance_phase().advance_phase()
	scenario.charge_slot(&"guardian", 0, &"iron_guard")
	scenario.fire_slot(&"guardian", 0).expect_rejection("cannot fire in this window")
	scenario.advance_phase().advance_phase()
	scenario.charge_slot(&"guardian", 0, &"iron_guard")
	scenario.charge_slot(&"guardian", 0, &"iron_guard").expect_rejection("cannot accept another charge")
	scenario.fire_slot(&"guardian", 0)
	scenario.charge_slot(&"guardian", 0, &"iron_guard").expect_rejection("cannot accept another charge")
	scenario.advance_phase()
	return scenario

func _test_slow_zero_charge_rejection() -> void:
	var fortify = load("res://resources/cards/tank/fortify.tres")
	var scenario := ScenarioModel.new(&"slow_zero_charge", 1, 2404, {
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": 4},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "slot_count": 2, "refill_target": 4}],
		"primary_hero_id": &"guardian",
	})
	scenario.register_card(fortify)
	scenario.give_hand(&"guardian", [&"fortify"])
	scenario.load_slot(&"guardian", 0, &"fortify")
	for _phase in 4:
		scenario.advance_phase()
	scenario.fire_slot(&"guardian", 0).expect_rejection("at least one charged card")
	var result := ProbeRunner.run(scenario)
	_assert(result["failures"].is_empty(), "Fortify with zero Charges must reject cleanly during Slow.")
	_assert(result["trace"]["steps"][5]["expectation_met"], "The Slow zero-Charge rejection must preserve rules state.")

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
