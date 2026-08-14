extends SceneTree

const EncounterResolverModel := preload("res://scripts/encounter/EncounterResolver.gd")
const EncounterSnapshotModel := preload("res://scripts/encounter/EncounterSnapshot.gd")
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")
const BossStateModel := preload("res://scripts/boss/BossState.gd")
const HexGridModel := preload("res://scripts/hex/HexGrid.gd")

var failures: Array[String] = []

func _initialize() -> void:
	var resolver := EncounterResolverModel.new()
	var claw = load("res://resources/boss/programs/embermaw_hunt.tres").instant_beats[1]
	var scar = load("res://resources/boss/programs/embermaw_hunt.tres").instant_beats[2]
	var breath = load("res://resources/boss/programs/embermaw_hunt.tres").incoming_beats[0]
	var brood = load("res://resources/boss/programs/embermaw_hunt.tres").incoming_beats[1]
	var turn = load("res://resources/boss/programs/embermaw_hunt.tres").instant_beats[0]

	var snapshot = _snapshot(Vector2i(0, 0))
	var claw_resolution = resolver.resolve_beat(claw, snapshot)
	_assert(claw.target_selector == &"tank", "Raking Claw must author the Tank selector.")
	_assert(claw.counter_tags == [&"Mitigate"], "Raking Claw must no longer advertise movement evasion.")
	_assert(claw_resolution.player_damage == 4, "Raking Claw should hit the Tank in the former front arc.")
	_assert(claw_resolution.impacted_hexes == [Vector2i(0, 0)], "Raking Claw should record the targeted Tank hex.")
	var off_arc_claw_resolution = resolver.resolve_beat(claw, _snapshot(Vector2i(0, -1)))
	_assert(off_arc_claw_resolution.player_damage == 4, "Raking Claw must damage the Tank even when off the former front arc.")
	_assert(off_arc_claw_resolution.impacted_hexes == [Vector2i(0, -1)], "Raking Claw must record the targeted Tank hex when movement leaves the former arc.")

	var scar_snapshot = _snapshot(Vector2i(0, -1))
	scar_snapshot.previous_impacted_hexes = claw_resolution.impacted_hexes
	var scar_resolution = resolver.resolve_beat(scar, scar_snapshot)
	_assert(scar_resolution.scorched_hexes == [Vector2i(0, 0)], "Ash Trail should preserve the previous impacted hex")

	var breath_resolution = resolver.resolve_beat(breath, snapshot)
	_assert(breath_resolution.player_damage == 5, "Cinder Breath should hit a player in its forward cone")
	_assert(breath_resolution.scorched_hexes.size() == breath_resolution.pattern_hexes.size(), "Cinder Breath should scorch its full resolved pattern")
	var safe_resolution = resolver.resolve_beat(breath, _snapshot(Vector2i(0, -1)))
	_assert(safe_resolution.player_damage == 0, "Leaving Cinder Breath should avoid its damage")

	var turn_resolution = resolver.resolve_beat(turn, snapshot)
	_assert(turn_resolution.next_facing == FacingDirections.Direction.SOUTH_WEST, "Turn to the Tank should use the nearest legal hex edge")
	var brood_resolution = resolver.resolve_beat(brood, snapshot)
	_assert(brood_resolution.spawn_hexes.size() == 2, "Brood Call should select two legal empty spawn hexes")

	if failures.is_empty():
		print("ENCOUNTER_RESOLVER_PROBE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _snapshot(player_coords: Vector2i):
	var snapshot := EncounterSnapshotModel.new()
	snapshot.board_hexes = BoardQueryModel.hexes_in_radius(2)
	snapshot.empty_hexes = snapshot.board_hexes.duplicate()
	snapshot.empty_hexes.erase(Vector2i(1, -1))
	snapshot.empty_hexes.erase(player_coords)
	snapshot.boss_coords = Vector2i(1, -1)
	snapshot.boss_facing = FacingDirections.Direction.SOUTH_WEST
	snapshot.player_coords = player_coords
	snapshot.brood_spawn_candidates = [Vector2i(-2, 1), Vector2i(-1, 2), Vector2i(0, 2), Vector2i(2, -2), Vector2i(2, -1)]
	return snapshot

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
