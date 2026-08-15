class_name EncounterRecordReport
extends RefCounted

const SUPPORTED_SCHEMA_VERSION := 2

static func aggregate_directory(root: String) -> Dictionary:
	var records: Array = []
	var diagnostics: Array[String] = []
	var directory := DirAccess.open(root)
	if directory == null:
		return {"records": records, "diagnostics": ["%s: directory is unavailable" % root]}
	for file_name in directory.get_files():
		if not file_name.ends_with(".json"):
			continue
		var path := "%s/%s" % [root, file_name]
		var parser := JSON.new()
		if parser.parse(FileAccess.get_file_as_string(path)) != OK:
			diagnostics.append("%s: malformed JSON record" % path)
			continue
		var parsed: Variant = parser.data
		if not parsed is Dictionary:
			diagnostics.append("%s: record root must be an object" % path)
			continue
		var validation := validate(parsed)
		if not validation.is_empty():
			diagnostics.append("%s: %s" % [path, validation])
			continue
		records.append(parsed)
	return {"records": records, "diagnostics": diagnostics}

static func validate(record: Dictionary) -> String:
	if int(record.get("schema_version", -1)) != SUPPORTED_SCHEMA_VERSION:
		return "unsupported schema version %s" % record.get("schema_version", "missing")
	for field in ["record_id", "content", "outcome", "final_rules_snapshot"]:
		if not record.has(field): return "missing required field `%s`" % field
	if not record["content"] is Dictionary or str(record["content"].get("fingerprint", "")).is_empty():
		return "missing content fingerprint"
	return ""

static func markdown(records: Array, diagnostics: Array[String]) -> String:
	var groups: Dictionary = {}
	for record in records:
		var fingerprint := str(record["content"]["fingerprint"])
		if not groups.has(fingerprint): groups[fingerprint] = []
		groups[fingerprint].append(record)
	var lines: Array[String] = ["# Encounter Record Aggregate", "", "- Valid records: %d" % records.size()]
	if groups.size() > 1: lines.append("- Warning: multiple content fingerprints are present; results are split below.")
	for fingerprint in groups.keys():
		var group: Array = groups[fingerprint]
		var outcomes: Dictionary = {}
		for record in group: outcomes[record["outcome"]] = int(outcomes.get(record["outcome"], 0)) + 1
		lines.append("")
		lines.append("## `%s`" % fingerprint)
		lines.append("")
		lines.append("- Records: %d" % group.size())
		lines.append("- Outcomes: %s" % JSON.stringify(outcomes))
	var cohorts := summarize_cohorts(records)
	if not cohorts.is_empty():
		lines.append("")
		lines.append("## Deck Evaluation Cohorts")
		for cohort in cohorts:
			lines.append("")
			lines.append("### %s" % cohort["title"])
			lines.append("")
			lines.append("- Fingerprint: `%s`" % cohort["fingerprint"])
			lines.append("- Seed: `%s`" % cohort["seed"])
			lines.append("- Purpose: `%s`" % cohort["evaluation_purpose"])
			lines.append("- Records: %d" % int(cohort["record_count"]))
			lines.append("- Outcomes: %s" % JSON.stringify(cohort["outcomes"]))
			lines.append("- End kinds: %s" % JSON.stringify(cohort["end_kinds"]))
			lines.append("- Raw viability totals: victories %d, defeats %d, abandoned %d, end-of-clock %d" % [
				int(cohort["viability"].get("victory", 0)),
				int(cohort["viability"].get("defeat", 0)),
				int(cohort["viability"].get("abandoned", 0)),
				int(cohort["viability"].get("end_of_clock", 0)),
			])
			lines.append("- Boss damage dealt: %d" % int(cohort["boss_damage_dealt"]))
			lines.append("- Damage prevented: %d" % int(cohort["damage_prevented"]))
			lines.append("")
			lines.append("| Run | Round | Phase | Hand | Slots | Legal useful proxy | Selected actions |")
			lines.append("| --- | ---: | --- | --- | --- | --- | --- |")
			for row in cohort["round_rows"]:
				lines.append("| %s | %d | %s | %s | %s | %s | %s |" % [
					row["run_label"],
					int(row["round"]),
					row["phase"],
					row["hand"],
					row["slots"],
					row["legal_useful_actions"],
					row["selected_rules_actions"],
				])
	if not diagnostics.is_empty():
		lines.append("")
		lines.append("## Diagnostics")
		lines.append("")
		for diagnostic in diagnostics: lines.append("- %s" % diagnostic)
	return "\n".join(lines) + "\n"

static func summarize_cohorts(records: Array) -> Array:
	var grouped: Dictionary = {}
	for record in records:
		var metadata: Dictionary = record.get("metadata", {})
		var run_label := str(metadata.get("run_label", ""))
		var evaluation_purpose := str(metadata.get("evaluation_purpose", ""))
		var scenario_id := str(metadata.get("scenario_id", ""))
		if run_label.is_empty() and evaluation_purpose.is_empty() and scenario_id.is_empty():
			continue
		var fingerprint := str(record.get("content", {}).get("fingerprint", ""))
		var seed := _seed_label(record.get("seed", ""))
		var key := "%s|%s|%s|%s" % [fingerprint, run_label, seed, evaluation_purpose]
		if not grouped.has(key):
			grouped[key] = {
				"fingerprint": fingerprint,
				"run_label": run_label,
				"seed": seed,
				"evaluation_purpose": evaluation_purpose,
				"scenario_id": scenario_id,
				"records": [],
			}
		grouped[key]["records"].append(record)
	var keys := grouped.keys()
	keys.sort()
	var cohorts: Array = []
	for key in keys:
		var group: Dictionary = grouped[key]
		var outcomes: Dictionary = {}
		var end_kinds: Dictionary = {}
		var boss_damage_dealt := 0
		var damage_prevented := 0
		var rows: Array = []
		for record in group["records"]:
			var outcome := str(record.get("outcome", ""))
			outcomes[outcome] = int(outcomes.get(outcome, 0)) + 1
			var end_kind := str(record.get("end_kind", ""))
			end_kinds[end_kind] = int(end_kinds.get(end_kind, 0)) + 1
			var damage_totals := _damage_totals(record)
			boss_damage_dealt += damage_totals["boss_damage_dealt"]
			damage_prevented += damage_totals["damage_prevented"]
			for observation in record.get("phase_observations", []):
				rows.append(_round_row(record, observation))
		cohorts.append({
			"title": "%s (%s)" % [group["run_label"], group["scenario_id"]],
			"fingerprint": group["fingerprint"],
			"run_label": group["run_label"],
			"seed": group["seed"],
			"evaluation_purpose": group["evaluation_purpose"],
			"scenario_id": group["scenario_id"],
			"record_count": group["records"].size(),
			"outcomes": outcomes,
			"end_kinds": end_kinds,
			"viability": {
				"victory": int(outcomes.get("victory", 0)),
				"defeat": int(outcomes.get("defeat", 0)),
				"abandoned": int(outcomes.get("abandoned", 0)),
				"end_of_clock": int(end_kinds.get("end_of_clock", 0)),
			},
			"boss_damage_dealt": boss_damage_dealt,
			"damage_prevented": damage_prevented,
			"round_rows": rows,
		})
	return cohorts

static func _round_row(record: Dictionary, observation: Dictionary) -> Dictionary:
	var metadata: Dictionary = record.get("metadata", {})
	return {
		"run_label": str(metadata.get("run_label", "")),
		"round": int(observation.get("round", 0)),
		"phase": str(observation.get("phase", "")),
		"hand": _ids(observation.get("hand_card_ids", [])),
		"slots": _slot_summary(observation.get("slots", [])),
		"legal_useful_actions": _action_summary(observation.get("legal_useful_actions", [])),
		"selected_rules_actions": _action_summary(observation.get("selected_rules_actions", [])),
	}

static func _damage_totals(record: Dictionary) -> Dictionary:
	var boss_damage_dealt := 0
	var damage_prevented := 0
	var actions: Array = []
	actions.append_array(record.get("submitted_actions", []))
	actions.append_array(record.get("generated_actions", []))
	var boss_id := str(record.get("final_rules_snapshot", {}).get("current_program_id", ""))
	for entity in record.get("final_rules_snapshot", {}).get("entities", []):
		if entity.get("kind", "") == "boss":
			boss_id = str(entity.get("id", ""))
	for action in actions:
		if action.get("kind", "") != "damage" or not action.get("succeeded", false):
			continue
		var payload: Dictionary = action.get("payload", {})
		var fact: Dictionary = payload.get("resolution_fact", {})
		damage_prevented += int(fact.get("prevented", 0))
		if str(payload.get("target_id", "")) == boss_id:
			boss_damage_dealt += int(fact.get("health_loss", 0))
	return {"boss_damage_dealt": boss_damage_dealt, "damage_prevented": damage_prevented}

static func _slot_summary(slots: Array) -> String:
	var parts: Array[String] = []
	for slot in slots:
		var top := str(slot.get("top_card_id", ""))
		if top.is_empty():
			top = "empty"
		parts.append("S%d:%s[%s]/%s" % [
			int(slot.get("slot_index", 0)) + 1,
			top,
			_ids(slot.get("charge_card_ids", [])),
			str(slot.get("activated_window", "")),
		])
	return ", ".join(parts)

static func _action_summary(actions: Array) -> String:
	if actions.is_empty():
		return "none"
	var counts: Dictionary = {}
	for action in actions:
		var kind := str(action.get("kind", ""))
		counts[kind] = int(counts.get(kind, 0)) + 1
	var parts: Array[String] = []
	var keys := counts.keys()
	keys.sort()
	for key in keys:
		parts.append("%s:%d" % [key, int(counts[key])])
	return ", ".join(parts)

static func _ids(values: Array) -> String:
	var parts: Array[String] = []
	for value in values:
		if value is Dictionary:
			parts.append(str(value.get("resource_id", "")))
		else:
			parts.append(str(value))
	return ", ".join(parts) if not parts.is_empty() else "none"

static func _seed_label(value: Variant) -> String:
	if value is int or value is float:
		return str(int(value))
	return str(value)

static func write_reports(root: String, records: Array, diagnostics: Array[String]) -> Dictionary:
	DirAccess.make_dir_recursive_absolute(root)
	var markdown_text := markdown(records, diagnostics)
	var timestamp := "%s-%d" % [Time.get_datetime_string_from_system().replace(":", "-").replace("T", "_"), Time.get_ticks_msec()]
	var report_path := "%s/report-%s.md" % [root, timestamp]
	var latest_path := "%s/latest-report.md" % root
	var error := _write_atomic(report_path, markdown_text, false)
	if error != OK:
		return {"error": "Could not write %s (error %d)." % [report_path, error]}
	error = _write_atomic(latest_path, markdown_text, true)
	if error != OK:
		return {"error": "Could not write %s (error %d)." % [latest_path, error]}
	if not FileAccess.file_exists(report_path) or not FileAccess.file_exists(latest_path):
		return {"error": "Aggregate report writer did not create both Markdown artifacts."}
	return {"report": report_path, "latest": latest_path}

static func _write_atomic(path: String, contents: String, replace_existing: bool) -> Error:
	var temporary := "%s.tmp" % path
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(contents)
	file.close()
	if replace_existing and FileAccess.file_exists(path):
		var remove_error := DirAccess.remove_absolute(path)
		if remove_error != OK:
			return remove_error
	return DirAccess.rename_absolute(temporary, path)
