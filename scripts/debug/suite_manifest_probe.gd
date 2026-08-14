extends SceneTree

# Probe contract (ADR 0018): `scripts/debug/probes.manifest` is the single
# registration source for the Probe suite. Every executable probe script is
# manifested exactly once with a lane and its success marker; both runner
# adapters read this file, so a probe cannot exist unregistered and a manifest
# entry cannot point at a missing script or an undeclared marker.

const MANIFEST_PATH := "res://scripts/debug/probes.manifest"
const DEBUG_ROOT := "res://scripts/debug"
const LANES: Array[String] = ["default", "scenario", "manual", "tool"]
# The shared probe base class is not a standalone probe.
const NON_PROBE_SCRIPTS: Array[String] = ["ProbeCase.gd"]

var failures: Array[String] = []

func _initialize() -> void:
	_assert(FileAccess.file_exists(ProjectSettings.globalize_path(MANIFEST_PATH)), "The probe manifest must exist at %s." % MANIFEST_PATH)
	var entries: Array[Dictionary] = []
	if FileAccess.file_exists(ProjectSettings.globalize_path(MANIFEST_PATH)):
		entries = _parse_manifest()
	var manifested_scripts: Dictionary = {}
	var names: Dictionary = {}
	for entry in entries:
		_assert(entry["lane"] in LANES, "Manifest lane `%s` for `%s` must be one of %s." % [entry["lane"], entry["name"], str(LANES)])
		_assert(not names.has(entry["name"]), "Manifest name `%s` must be unique." % entry["name"])
		names[entry["name"]] = true
		_assert(not manifested_scripts.has(entry["script"]), "Script `%s` must be manifested exactly once." % entry["script"])
		manifested_scripts[entry["script"]] = true
		_assert(FileAccess.file_exists(ProjectSettings.globalize_path(entry["script"])), "Manifested script `%s` must exist." % entry["script"])
		if entry["lane"] in ["default", "scenario"]:
			_assert(not entry["marker"].is_empty(), "Probe `%s` must declare a success marker." % entry["name"])
			if FileAccess.file_exists(ProjectSettings.globalize_path(entry["script"])):
				var source := FileAccess.get_file_as_string(ProjectSettings.globalize_path(entry["script"]))
				_assert(source.contains(entry["marker"]), "Probe `%s` must print its declared marker `%s`." % [entry["name"], entry["marker"]])
	for file_name in DirAccess.get_files_at(ProjectSettings.globalize_path(DEBUG_ROOT)):
		if not file_name.ends_with(".gd") or file_name in NON_PROBE_SCRIPTS:
			continue
		var script_path := "%s/%s" % [DEBUG_ROOT, file_name]
		if not _is_executable_probe(script_path):
			continue
		_assert(manifested_scripts.has(script_path), "Executable probe `%s` must be registered in the manifest." % file_name)
	_assert(names.has("suite_manifest"), "The manifest coverage probe must itself run in the default lane.")
	if failures.is_empty():
		print("SUITE_MANIFEST_PROBE_OK entries=%d" % entries.size())
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _parse_manifest() -> Array[Dictionary]:
	var entries: Array[Dictionary] = []
	for line in FileAccess.get_file_as_string(ProjectSettings.globalize_path(MANIFEST_PATH)).split("\n"):
		var trimmed := line.strip_edges()
		if trimmed.is_empty() or trimmed.begins_with("#"):
			continue
		var fields := trimmed.split("|")
		_assert(fields.size() == 4, "Manifest line `%s` must have lane|name|script|marker fields." % trimmed)
		if fields.size() != 4:
			continue
		entries.append({
			"lane": fields[0].strip_edges(),
			"name": fields[1].strip_edges(),
			"script": fields[2].strip_edges(),
			"marker": fields[3].strip_edges(),
		})
	return entries

func _is_executable_probe(script_path: String) -> bool:
	var source := FileAccess.get_file_as_string(ProjectSettings.globalize_path(script_path))
	return source.contains("extends SceneTree") or source.contains("extends EncounterProbeCase") or source.contains("extends \"res://scripts/debug/ProbeCase.gd\"")

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
