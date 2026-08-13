extends SceneTree

const BaselineGenerator := preload("res://scripts/debug/DeckEvalBaselineGenerator.gd")

const ENCOUNTER := preload("res://resources/encounters/embermaw_prototype.tres")
const CONTROLLED_DECK := preload("res://resources/decks/evaluation/aegis_controlled_test_deck.tres")

var failures: Array[String] = []

func _initialize() -> void:
	BaselineGenerator.clear_record_root()
	_assert(CONTROLLED_DECK.resource_path == "res://resources/decks/evaluation/aegis_controlled_test_deck.tres", "Controlled deck must use the non-default evaluation resource path.")
	_assert(_composition(CONTROLLED_DECK.player_deck) == {
		"steady_strike": 8,
		"iron_guard": 6,
		"sweeping_blow": 2,
		"fortify": 2,
		"shield_slam": 2,
	}, "Controlled deck must match the approved 8/6/2/2/2 composition.")
	_assert(_composition(ENCOUNTER.player_deck) == {"steady_strike": 10, "iron_guard": 10}, "Live default starter deck must remain unchanged.")
	var records := BaselineGenerator.generate({
		"deck_config": CONTROLLED_DECK,
		"run_label_prefix": "controlled",
		"scenario_id": "controlled_deck_eval",
		"evaluation_purpose": "controlled_aegis_test_deck",
	})
	_assert(records.size() == 3, "The controlled cohort must emit exactly three fixed-seed records.")
	var labels: Dictionary = {}
	var fingerprints: Dictionary = {}
	for record in records:
		var metadata: Dictionary = record.get("metadata", {})
		labels[metadata.get("run_label", "")] = true
		fingerprints[record.get("content", {}).get("fingerprint", "")] = true
		_assert(metadata.get("evaluation_purpose", "") == "controlled_aegis_test_deck", "Controlled records must carry the controlled evaluation purpose.")
		_assert(metadata.get("scenario_id", "") == "controlled_deck_eval", "Controlled records must carry the controlled scenario ID.")
		_assert(record.get("content", {}).get("root", {}).get("path", "") == CONTROLLED_DECK.resource_path, "Controlled records must fingerprint the evaluation-only deck config.")
		_assert(not record.get("phase_observations", []).is_empty(), "Controlled records must include phase observations.")
	_assert(labels.has("controlled-a") and labels.has("controlled-b") and labels.has("controlled-c"), "Controlled labels must be controlled-a, controlled-b, and controlled-c.")
	_assert(fingerprints.size() == 1, "The three controlled records must share one unchanged content fingerprint.")
	_assert(_has_riposte_shield_slam_payoff(records), "At least one controlled fixed-seed run must reach legal Riposte Ready consumption through Shield Slam without forced hand/order setup.")
	if failures.is_empty():
		print("CONTROLLED_DECK_EVAL_PROBE_OK labels=controlled-a,controlled-b,controlled-c")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _composition(cards: Array) -> Dictionary:
	var result: Dictionary = {}
	for card in cards:
		result[str(card.id)] = int(result.get(str(card.id), 0)) + 1
	return result

func _has_riposte_shield_slam_payoff(records: Array) -> bool:
	for record in records:
		for action in record.get("submitted_actions", []):
			var fact: Dictionary = action.get("payload", {}).get("resolution_fact", {})
			var event: Dictionary = fact.get("status_event", {})
			if event.get("status_id", "") != "riposte_ready" or event.get("event", "") != "consumed" or event.get("card_id", "") != "shield_slam":
				continue
			for generated in action.get("generated_actions", []):
				var payoff: Dictionary = generated.get("payload", {}).get("resolution_fact", {})
				if payoff.get("status_id", "") == "riposte_ready" and payoff.get("payoff_card_id", "") == "shield_slam" and int(payoff.get("requested", 0)) == 5 and int(payoff.get("base_amount", 0)) == 3 and int(payoff.get("status_bonus", 0)) == 2:
					return true
	return false

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
