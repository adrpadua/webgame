extends SceneTree

const BaselineGenerator := preload("res://scripts/debug/DeckEvalBaselineGenerator.gd")
const Reporter := preload("res://scripts/records/EncounterRecordReport.gd")
const EncounterRecordModel := preload("res://scripts/records/EncounterRecord.gd")

const CONTROLLED_DECK := preload("res://resources/decks/evaluation/aegis_controlled_test_deck.tres")

var failures: Array[String] = []

func _initialize() -> void:
	BaselineGenerator.clear_record_root()
	BaselineGenerator.generate({
		"deck_config": CONTROLLED_DECK,
		"run_label_prefix": "controlled",
		"scenario_id": "controlled_deck_eval",
		"evaluation_purpose": "controlled_aegis_test_deck",
	})
	var root := ProjectSettings.globalize_path(EncounterRecordModel.RECORD_ROOT)
	var aggregate := Reporter.aggregate_directory(root)
	var records: Array = aggregate["records"]
	var diagnostics: Array[String] = aggregate["diagnostics"]
	var cohorts := Reporter.summarize_cohorts(records)
	_assert(records.size() == 3, "Controlled deck report expects exactly three records.")
	_assert(diagnostics.is_empty(), "Controlled deck report expects no record diagnostics.")
	_assert(cohorts.size() == 3, "Controlled deck report must retain one row per fixed seed label.")
	var labels: Dictionary = {}
	var fingerprints: Dictionary = {}
	var seeds: Dictionary = {}
	for record in records:
		_assert(record.get("content", {}).get("root", {}).get("path", "") == CONTROLLED_DECK.resource_path, "Controlled report records must use the evaluation-only deck as content root.")
	for cohort in cohorts:
		labels[cohort.get("run_label", "")] = true
		fingerprints[cohort.get("fingerprint", "")] = true
		seeds[str(cohort.get("seed", ""))] = true
		_assert(cohort.get("evaluation_purpose", "") == "controlled_aegis_test_deck", "Controlled cohort purpose must be explicit.")
		_assert(int(cohort.get("record_count", 0)) == 1, "Each controlled fixed-seed cohort row must contain one record.")
		_assert(not cohort.get("outcomes", {}).is_empty(), "Each controlled cohort row must expose outcome totals.")
		_assert(not cohort.get("round_rows", []).is_empty(), "Each controlled cohort row must expose per-Round evidence.")
	_assert(labels.has("controlled-a") and labels.has("controlled-b") and labels.has("controlled-c"), "Report cohorts must include all controlled labels.")
	_assert(seeds.has("1337") and seeds.has("7331") and seeds.has("20260813"), "Report cohorts must include the three fixed seeds.")
	_assert(fingerprints.size() == 1, "Controlled report cohorts must share one content fingerprint.")
	_assert(_has_riposte_shield_slam_payoff(records), "Controlled report input must include a legal Riposte Ready Shield Slam payoff for Playtester retest gating.")
	var written: Dictionary = Reporter.write_reports(root, records, diagnostics)
	_assert(not written.has("error"), "Controlled report writer must produce canonical Markdown artifacts.")
	_assert(FileAccess.file_exists(written.get("latest", "")), "latest-report.md must exist for the controlled report.")
	var latest := FileAccess.get_file_as_string(written.get("latest", ""))
	_assert(latest.contains("controlled-a") and latest.contains("controlled-b") and latest.contains("controlled-c"), "Controlled report must render all fixed-seed labels.")
	_assert(latest.contains("controlled_aegis_test_deck") and latest.contains("Raw viability totals"), "Controlled report must render purpose and viability totals.")
	if failures.is_empty():
		print("CONTROLLED_DECK_EVAL_REPORT_PROBE_OK cohorts=3 labels=controlled-a,controlled-b,controlled-c")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)

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
