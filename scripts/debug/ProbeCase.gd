class_name EncounterProbeCase
extends SceneTree

# Shared base for Probe scripts (ADR 0018): one assertion semantics —
# accumulate failures and report them all — and one marker/exit contract that
# the manifest-driven runners enforce. Probes override `run_probe` and
# `probe_marker`; `standard_engine` provides the canonical scene-free
# Encounter fixture with per-probe overrides.

const EncounterEngineCaseModel := preload("res://scripts/sdk/EncounterEngine.gd")
const FacingCaseDirections := preload("res://scripts/combat/Facing.gd")

var failures: Array[String] = []

func _initialize() -> void:
	await run_probe()
	finish()

func run_probe() -> void:
	failures.append("Probe must override run_probe().")

func probe_marker() -> String:
	return "PROBE_OK"

func finish() -> void:
	if failures.is_empty():
		print(probe_marker())
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)

func wait_frames(count: int) -> void:
	for _index in count:
		await process_frame

func standard_engine(hand: Array = [], overrides: Dictionary = {}):
	var config := {
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": FacingCaseDirections.Direction.SOUTH_WEST},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "slot_count": 2, "hand": hand, "refill_target": maxi(hand.size(), 1)}],
		"primary_hero_id": &"guardian",
	}
	for key in overrides:
		config[key] = overrides[key]
	var engine := EncounterEngineCaseModel.new()
	engine.start(config)
	return engine
