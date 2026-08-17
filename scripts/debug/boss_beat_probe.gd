extends "res://scripts/debug/ProbeCase.gd"

# Probe contract (ADR 0016): authored Boss Timeline beats resolve through the
# engine seam — `apply` on a RESOLVE_BOSS action — with their spatial rules
# owned by the internal TimelineResolver. No separate resolver module, beat
# snapshot, or resolution DTO exists beside it. Behavioral contracts follow
# the authored `embermaw_hunt` program.

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")
const HUNT := preload("res://resources/boss/programs/embermaw_hunt.tres")

const BROOD_CANDIDATES: Array[Vector2i] = [Vector2i(-2, 1), Vector2i(-1, 2), Vector2i(0, 2), Vector2i(2, -2), Vector2i(2, -1)]

func probe_marker() -> String:
	return "BOSS_BEAT_PROBE_OK"

func run_probe() -> void:
	var turn = HUNT.instant_beats[0]
	var claw = HUNT.instant_beats[1]
	var scar = HUNT.instant_beats[2]
	var breath = HUNT.incoming_beats[0]
	var brood = HUNT.incoming_beats[1]

	_assert(claw.target_selector == &"tank", "Raking Claw must author the Tank selector.")
	_assert(claw.counter_tags == [&"Mitigate", &"Position"], "Raking Claw must advertise Mitigate and Position counterplay (D-017), never movement evasion.")

	var engine = _engine(Vector2i(0, 0))
	var claw_action = engine.apply(EncounterActionModel.resolve_boss(&"embermaw", claw, &"instant"))
	var claw_damage = _generated_damage(claw_action)
	_assert(claw_damage != null and int(claw_damage.payload.get("amount", 0)) == 4, "Raking Claw should hit the Tank in the former front arc.")
	_assert(engine.previous_impacted_hexes == ([Vector2i(0, 0)] as Array[Vector2i]), "Raking Claw should record the targeted Tank hex.")
	var claw_fact: Dictionary = claw_damage.payload.get("resolution_fact", {}) if claw_damage != null else {}
	_assert(claw_fact.get("target_selector", &"") == &"tank" and claw_fact.get("damage_classification", &"") == &"tank_hit", "Raking Claw's generated damage must carry the authored selector facts.")

	var off_arc_engine = _engine(Vector2i(0, -1))
	var off_arc_damage = _generated_damage(off_arc_engine.apply(EncounterActionModel.resolve_boss(&"embermaw", claw, &"instant")))
	_assert(off_arc_damage != null and int(off_arc_damage.payload.get("amount", 0)) == 7, "Raking Claw must damage the Tank off the Guarded Front for 4 base plus the +3 unguarded bonus (D-017).")
	_assert(off_arc_engine.previous_impacted_hexes == ([Vector2i(0, -1)] as Array[Vector2i]), "Raking Claw must record the targeted Tank hex when movement leaves the former arc.")

	engine.apply(EncounterActionModel.resolve_boss(&"embermaw", scar, &"instant"))
	_assert(engine.board.has_hazard(Vector2i(0, 0), &"scorched"), "Ash Trail should scorch the previous impacted hex.")

	var breath_engine = _engine(Vector2i(0, 0))
	var breath_damage = _generated_damage(breath_engine.apply(EncounterActionModel.resolve_boss(&"embermaw", breath, &"incoming")))
	_assert(breath_damage != null and int(breath_damage.payload.get("amount", 0)) == 5, "Cinder Breath should hit a player in its forward cone.")
	_assert(not breath_engine.last_pattern.is_empty() and breath_engine.board.hazard_hexes(&"scorched").size() == breath_engine.last_pattern.size(), "Cinder Breath should scorch its full resolved pattern.")

	var safe_engine = _engine(Vector2i(0, -1))
	var safe_damage = _generated_damage(safe_engine.apply(EncounterActionModel.resolve_boss(&"embermaw", breath, &"incoming")))
	_assert(safe_damage == null, "Leaving Cinder Breath should avoid its damage.")

	var turn_engine = _engine(Vector2i(0, 0), FacingDirections.Direction.EAST)
	turn_engine.apply(EncounterActionModel.resolve_boss(&"embermaw", turn, &"instant"))
	_assert(int(turn_engine.board.get_entity(&"embermaw").get("facing", -1)) == FacingDirections.Direction.SOUTH_WEST, "Turn to the Tank should use the nearest legal hex edge.")

	var brood_engine = _engine(Vector2i(0, 0))
	brood_engine.apply(EncounterActionModel.resolve_boss(&"embermaw", brood, &"incoming"))
	var whelps := 0
	for entity_id in brood_engine.board.entities:
		if brood_engine.board.entities[entity_id].get("kind") == &"minion":
			whelps += 1
	_assert(whelps == 2, "Brood Call should select two legal empty spawn hexes.")

	for chain_file in ["EncounterResolver.gd", "EncounterSnapshot.gd", "EncounterResolution.gd"]:
		_assert(not FileAccess.file_exists(ProjectSettings.globalize_path("res://scripts/encounter/%s" % chain_file)), "The Boss Beat chain module `%s` must not exist beside the TimelineResolver." % chain_file)


func _generated_damage(action):
	for generated in action.generated_actions:
		if generated.kind == EncounterActionModel.Kind.DAMAGE:
			return generated
	return null

func _engine(player_coords: Vector2i, boss_facing: int = FacingDirections.Direction.SOUTH_WEST):
	var engine := EncounterEngineModel.new()
	engine.start({
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"embermaw", "coords": Vector2i(1, -1), "health": 36, "facing": boss_facing},
		"heroes": [{"id": &"guardian", "coords": player_coords, "health": 34, "slot_count": 2}],
		"primary_hero_id": &"guardian",
		"brood_spawn_candidates": BROOD_CANDIDATES,
	})
	return engine

