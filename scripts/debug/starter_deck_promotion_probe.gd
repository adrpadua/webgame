extends SceneTree

const BaselineGenerator := preload("res://scripts/debug/DeckEvalBaselineGenerator.gd")
const Reporter := preload("res://scripts/records/EncounterRecordReport.gd")
const EncounterRecordModel := preload("res://scripts/records/EncounterRecord.gd")

const ENCOUNTER := preload("res://resources/encounters/embermaw_prototype.tres")
const CONTROLLED_DECK := preload("res://resources/decks/evaluation/aegis_controlled_test_deck.tres")

var failures: Array[String] = []

func _initialize() -> void:
	BaselineGenerator.clear_record_root()
	_assert(ENCOUNTER.resource_path == "res://resources/encounters/embermaw_prototype.tres", "Starter promotion must inspect the live Encounter resource.")
	_assert(_composition(ENCOUNTER.player_deck) == _shield_wall_composition(), "Live Encounter starter deck must be exactly the approved Shield Wall 8/6/2/2/2 list.")
	_assert(CONTROLLED_DECK.resource_path == "res://resources/decks/evaluation/aegis_controlled_test_deck.tres", "Controlled deck must remain at the evaluation-only resource path.")
	_assert(CONTROLLED_DECK.encounter == ENCOUNTER, "Controlled deck must continue to wrap the live Encounter for historical repro runs.")
	_assert(_composition(CONTROLLED_DECK.player_deck) == _shield_wall_composition(), "Controlled fixture must retain the historical 8/6/2/2/2 repro list.")

	var records := BaselineGenerator.generate({
		"run_label_prefix": "starter-promotion",
		"scenario_id": "starter_deck_promotion",
		"evaluation_purpose": "aegis_default_deck_promotion",
	})
	_assert(records.size() == 3, "Starter promotion must emit exactly three fixed-seed records.")
	var labels: Dictionary = {}
	var fingerprints: Dictionary = {}
	for record in records:
		var metadata: Dictionary = record.get("metadata", {})
		labels[metadata.get("run_label", "")] = true
		fingerprints[record.get("content", {}).get("fingerprint", "")] = true
		_assert(metadata.get("evaluation_purpose", "") == "aegis_default_deck_promotion", "Starter promotion records must carry the promotion purpose.")
		_assert(metadata.get("scenario_id", "") == "starter_deck_promotion", "Starter promotion records must carry a distinct scenario ID.")
		_assert(record.get("content", {}).get("root", {}).get("path", "") == ENCOUNTER.resource_path, "Starter promotion records must fingerprint the live Encounter as content root.")
		_assert(not record.get("phase_observations", []).is_empty(), "Starter promotion records must include phase observations.")
	_assert(labels.has("starter-promotion-a") and labels.has("starter-promotion-b") and labels.has("starter-promotion-c"), "Starter promotion labels must be starter-promotion-a, starter-promotion-b, and starter-promotion-c.")
	_assert(not labels.has("baseline-a") and not labels.has("controlled-a"), "Starter promotion evidence must not reuse historical baseline or controlled labels.")
	_assert(fingerprints.size() == 1, "The three starter promotion records must share one live Encounter content fingerprint.")

	var root := ProjectSettings.globalize_path(EncounterRecordModel.RECORD_ROOT)
	var aggregate := Reporter.aggregate_directory(root)
	var diagnostics: Array[String] = aggregate["diagnostics"]
	var cohorts := Reporter.summarize_cohorts(aggregate["records"])
	_assert(diagnostics.is_empty(), "Starter promotion report input must have no diagnostics.")
	_assert(cohorts.size() == 3, "Starter promotion report must retain one row per fixed seed label.")
	var written: Dictionary = Reporter.write_reports(root, aggregate["records"], diagnostics)
	_assert(not written.has("error"), "Starter promotion report writer must produce canonical Markdown artifacts.")
	var latest := FileAccess.get_file_as_string(written.get("latest", ""))
	_assert(latest.contains("starter-promotion-a") and latest.contains("starter-promotion-b") and latest.contains("starter-promotion-c"), "Starter promotion report must render distinct post-promotion labels.")
	_assert(latest.contains("aegis_default_deck_promotion") and not latest.contains("baseline-a"), "Starter promotion report must not reuse historical baseline identity.")

	if failures.is_empty():
		print("STARTER_DECK_PROMOTION_PROBE_OK labels=starter-promotion-a,starter-promotion-b,starter-promotion-c")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _shield_wall_composition() -> Dictionary:
	return {
		"steady_strike": 8,
		"iron_guard": 6,
		"sweeping_blow": 2,
		"fortify": 2,
		"shield_slam": 2,
	}

func _composition(cards: Array) -> Dictionary:
	var result: Dictionary = {}
	for card in cards:
		result[str(card.id)] = int(result.get(str(card.id), 0)) + 1
	return result

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
