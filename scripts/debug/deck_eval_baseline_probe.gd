extends SceneTree

const BaselineGenerator := preload("res://scripts/debug/DeckEvalBaselineGenerator.gd")

var failures: Array[String] = []

func _initialize() -> void:
	BaselineGenerator.clear_record_root()
	var records := BaselineGenerator.generate()
	_assert(records.size() == 3, "The baseline must emit exactly three fixed-seed records.")
	var labels: Dictionary = {}
	var fingerprints: Dictionary = {}
	for record in records:
		var metadata: Dictionary = record.get("metadata", {})
		labels[metadata.get("run_label", "")] = true
		fingerprints[record.get("content", {}).get("fingerprint", "")] = true
		_assert(metadata.get("evaluation_purpose", "") == "combat_postures_issue_05", "Baseline records must carry the issue-05 evaluation purpose.")
		_assert(metadata.get("scenario_id", "") == "deck_eval_baseline", "Baseline records must carry the scenario ID.")
		_assert(not record.get("phase_observations", []).is_empty(), "Baseline records must include phase observations.")
		_assert(_has_selected_action(record), "Each baseline record must include selected action evidence.")
		_assert(_has_legal_proxy(record), "Each baseline record must include legal useful action proxy evidence.")
	_assert(labels.has("baseline-a") and labels.has("baseline-b") and labels.has("baseline-c"), "Baseline labels must be baseline-a, baseline-b, and baseline-c.")
	_assert(fingerprints.size() == 1, "The three baseline records must share one unchanged content fingerprint.")
	if failures.is_empty():
		print("DECK_EVAL_BASELINE_PROBE_OK labels=baseline-a,baseline-b,baseline-c")
		quit(0)
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _has_selected_action(record: Dictionary) -> bool:
	for observation in record.get("phase_observations", []):
		if not observation.get("selected_rules_actions", []).is_empty():
			return true
	return false

func _has_legal_proxy(record: Dictionary) -> bool:
	for observation in record.get("phase_observations", []):
		if not observation.get("legal_useful_actions", []).is_empty():
			return true
	return false

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
