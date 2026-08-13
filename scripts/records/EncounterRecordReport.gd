class_name EncounterRecordReport
extends RefCounted

const SUPPORTED_SCHEMA_VERSION := 1

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
	if not diagnostics.is_empty():
		lines.append("")
		lines.append("## Diagnostics")
		lines.append("")
		for diagnostic in diagnostics: lines.append("- %s" % diagnostic)
	return "\n".join(lines) + "\n"

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
