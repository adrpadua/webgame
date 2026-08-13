extends SceneTree

const BaselineGenerator := preload("res://scripts/debug/DeckEvalBaselineGenerator.gd")
const Reporter := preload("res://scripts/records/EncounterRecordReport.gd")
const EncounterRecordModel := preload("res://scripts/records/EncounterRecord.gd")

var failures: Array[String] = []

func _initialize() -> void:
	BaselineGenerator.clear_record_root()
	BaselineGenerator.generate()
	var root := ProjectSettings.globalize_path(EncounterRecordModel.RECORD_ROOT)
	var aggregate := Reporter.aggregate_directory(root)
	var records: Array = aggregate["records"]
	var diagnostics: Array[String] = aggregate["diagnostics"]
	var cohorts := Reporter.summarize_cohorts(records)
	_assert(records.size() == 3, "Deck evaluation report probe expects exactly three baseline records.")
	_assert(diagnostics.is_empty(), "Deck evaluation report probe expects no record diagnostics.")
	_assert(cohorts.size() == 3, "Cohort summary must retain one row per fixed seed label.")
	var labels: Dictionary = {}
	var fingerprints: Dictionary = {}
	var seeds: Dictionary = {}
	for cohort in cohorts:
		labels[cohort.get("run_label", "")] = true
		fingerprints[cohort.get("fingerprint", "")] = true
		seeds[str(cohort.get("seed", ""))] = true
		_assert(cohort.get("evaluation_purpose", "") == "combat_postures_issue_05", "Cohort purpose must remain issue-05.")
		_assert(int(cohort.get("record_count", 0)) == 1, "Each fixed-seed cohort row must contain one record.")
		_assert(not cohort.get("outcomes", {}).is_empty(), "Each cohort row must expose outcome totals.")
		_assert(not cohort.get("end_kinds", {}).is_empty(), "Each cohort row must expose end-kind totals.")
		_assert(not cohort.get("round_rows", []).is_empty(), "Each cohort row must expose per-Round Hand/Slot evidence.")
	_assert(labels.has("baseline-a") and labels.has("baseline-b") and labels.has("baseline-c"), "Report cohorts must include all baseline labels.")
	_assert(seeds.has("1337") and seeds.has("7331") and seeds.has("20260813"), "Report cohorts must include the three fixed seeds.")
	_assert(fingerprints.size() == 1, "Report cohorts must share one content fingerprint.")
	var written: Dictionary = Reporter.write_reports(root, records, diagnostics)
	_assert(not written.has("error"), "Report writer must produce the canonical Markdown artifacts.")
	_assert(FileAccess.file_exists(written.get("latest", "")), "latest-report.md must exist.")
	var latest := FileAccess.get_file_as_string(written.get("latest", ""))
	_assert(latest.contains("Deck Evaluation Cohorts"), "Canonical report must render the deck-evaluation section.")
	_assert(latest.contains("baseline-a") and latest.contains("baseline-b") and latest.contains("baseline-c"), "Canonical report must render all fixed-seed labels.")
	_assert(latest.contains("Raw viability totals") and latest.contains("Legal useful proxy") and latest.contains("Selected actions"), "Canonical report must render viability and per-Round evidence columns.")
	if failures.is_empty():
		print("DECK_EVAL_REPORT_PROBE_OK cohorts=3 labels=baseline-a,baseline-b,baseline-c")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
