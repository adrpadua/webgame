extends SceneTree

const Reporter := preload("res://scripts/records/EncounterRecordReport.gd")

func _init() -> void:
	var root := ProjectSettings.globalize_path("res://tmp/encounter-records")
	var result := Reporter.aggregate_directory(root)
	var records: Array = result["records"]
	var diagnostics: Array[String] = result["diagnostics"]
	for diagnostic in diagnostics:
		printerr("ENCOUNTER_RECORD_DIAGNOSTIC %s" % diagnostic)
	if records.is_empty():
		printerr("ENCOUNTER_RECORD_REPORT_FAILED no valid records")
		quit(1)
		return
	var written: Dictionary = Reporter.write_reports(root, records, diagnostics)
	if written.has("error"):
		printerr("ENCOUNTER_RECORD_REPORT_FAILED %s" % written["error"])
		quit(1)
		return
	print("ENCOUNTER_RECORD_REPORT_OK records=%d diagnostics=%d" % [records.size(), diagnostics.size()])
	quit(0)
