class_name AutoRefresh
extends Node

@export var enabled: bool = true
@export var poll_interval: float = 1.0
@export var watched_roots: Array[String] = [
	"res://scenes",
	"res://scripts",
	"res://resources",
	"res://project.godot",
]

var _timer: Timer
var _known_timestamps: Dictionary = {}
var _is_reloading: bool = false

func _ready() -> void:
	if not enabled:
		return

	_snapshot_files()
	_timer = Timer.new()
	_timer.wait_time = poll_interval
	_timer.one_shot = false
	_timer.autostart = true
	_timer.timeout.connect(_poll_for_changes)
	add_child(_timer)

func _poll_for_changes() -> void:
	if _is_reloading:
		return

	var changed := _scan_for_changes()
	if changed:
		_is_reloading = true
		print("AutoRefresh: detected change in %s, reloading scene." % changed)
		get_tree().reload_current_scene()

func _snapshot_files() -> void:
	_known_timestamps.clear()
	for root in watched_roots:
		if root.ends_with(".godot") or root.ends_with(".tscn") or root.ends_with(".gd") or root.ends_with(".tres"):
			_record_file(root)
			continue
		_walk_root(root)

func _scan_for_changes() -> String:
	var current: Dictionary = {}
	for root in watched_roots:
		if root.ends_with(".godot") or root.ends_with(".tscn") or root.ends_with(".gd") or root.ends_with(".tres"):
			_collect_file(root, current)
			continue
		_collect_root(root, current)

	for path in current.keys():
		if not _known_timestamps.has(path):
			_known_timestamps = current
			return path
		if _known_timestamps[path] != current[path]:
			_known_timestamps = current
			return path

	for path in _known_timestamps.keys():
		if not current.has(path):
			_known_timestamps = current
			return path

	_known_timestamps = current
	return ""

func _walk_root(root: String) -> void:
	var dir := DirAccess.open(root)
	if dir == null:
		return

	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if entry.begins_with("."):
			entry = dir.get_next()
			continue
		var path := root.path_join(entry)
		if dir.current_is_dir():
			_walk_root(path)
		elif _should_watch(path):
			_record_file(path)
		entry = dir.get_next()
	dir.list_dir_end()

func _collect_root(root: String, current: Dictionary) -> void:
	var dir := DirAccess.open(root)
	if dir == null:
		return

	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if entry.begins_with("."):
			entry = dir.get_next()
			continue
		var path := root.path_join(entry)
		if dir.current_is_dir():
			_collect_root(path, current)
		elif _should_watch(path):
			_collect_file(path, current)
		entry = dir.get_next()
	dir.list_dir_end()

func _record_file(path: String) -> void:
	if _should_watch(path):
		_known_timestamps[path] = FileAccess.get_modified_time(path)

func _collect_file(path: String, current: Dictionary) -> void:
	if _should_watch(path):
		current[path] = FileAccess.get_modified_time(path)

func _should_watch(path: String) -> bool:
	return path.ends_with(".gd") or path.ends_with(".tscn") or path.ends_with(".tres") or path.ends_with(".godot")
