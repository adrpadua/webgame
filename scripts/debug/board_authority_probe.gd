extends "res://scripts/debug/ProbeCase.gd"

# Probe contract (ADR 0017): `engine.board` is the only board authority.
# HexGrid renders it and answers view queries by delegating to BoardQuery over
# the rules board — it owns no second BoardState, no terrain or combat rules,
# and no mutation surface. The orphaned BossActionData combat path is gone,
# and one front-cone geometry serves both the live rules and the Target
# Pattern catalog.

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const HazardEffectModel := preload("res://scripts/sdk/HazardEffect.gd")
const HexPieceModel := preload("res://scripts/hex/HexPiece.gd")
const BossActionDataModel := preload("res://scripts/boss/BossActionData.gd")
const MAIN_SCENE := preload("res://scenes/Main.tscn")

const GRID_MUTATOR_METHODS: Array[String] = [
	"set_scorched", "advance_board_state", "is_scorched",
	"spawn_enemy_wave", "spawn_whelps_at", "get_brood_spawn_hexes", "get_brood_spawn_candidates",
	"damage_enemy_front", "move_piece_to", "get_player_in",
	"get_front_arc", "get_forward_cone", "telegraph_hexes", "clear_telegraphs",
	"sync_combatant_health",
]

func probe_marker() -> String:
	return "BOARD_AUTHORITY_PROBE_OK"

func run_probe() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await wait_frames(3)
	var grid: Control = main.hex_grid
	var engine = main.engine

	for method in GRID_MUTATOR_METHODS:
		_assert(not grid.has_method(method), "HexGrid must not own `%s`; the rules board is the only board authority." % method)
	_assert(not ("board_state" in grid), "HexGrid must not hold a second BoardState.")
	var piece := HexPieceModel.new()
	_assert(not piece.has_method("take_damage"), "HexPiece must not mutate health; damage resolves through the engine.")
	piece.free()
	_assert(not BossActionDataModel.new().has_method("resolve"), "BossActionData must carry authored data only; its scene combat path is gone.")
	_assert(not FileAccess.file_exists(ProjectSettings.globalize_path("res://scripts/board/PlayerBoard.gd")), "The unreferenced PlayerBoard module must not exist.")

	# One front-cone geometry: the live rule and the Target Pattern catalog agree.
	var hexes: Dictionary = BoardQueryModel.hexes_in_radius(3)
	for facing in 6:
		var live: Array = BoardQueryModel.forward_cone(hexes, Vector2i.ZERO, facing, 2)
		var catalog: Dictionary = BoardQueryModel.resolve_target_pattern(hexes, BoardQueryModel.PATTERN_FRONT_CONE, Vector2i.ZERO, {"facing": facing, "range": 2})
		_assert(_same_hexes(live, catalog["impacts"]), "forward_cone and the FrontCone catalog pattern must share one geometry (facing %d)." % facing)

	# Behavior guards: the view renders the rules board and asks the engine.
	engine.apply(EncounterActionModel.apply_hazard(engine.boss_id, Vector2i(-1, 0), HazardEffectModel.new(&"scorched", 2, 1, true)))
	main._sync_from_engine()
	await wait_frames(1)
	_assert(grid.tiles[Vector2i(-1, 0)].terrain_id == &"scorched", "A rules-board Hazard must render as tile terrain.")

	engine.advance_phase()
	engine.advance_phase()
	main._sync_from_engine()
	var hand: Array = engine.get_hero(engine.primary_hero_id)["hand"]
	_assert(not hand.is_empty(), "The behavior guard needs a hand card for movement cues.")
	main._on_card_selected(hand[0])
	await wait_frames(1)
	var legal_destinations: Dictionary = {}
	for action in engine.legal_actions(engine.primary_hero_id):
		if action.kind == EncounterActionModel.Kind.MOVE_HERO:
			legal_destinations[action.payload.get("destination")] = true
	var cue_destinations: Dictionary = {}
	for coords: Vector2i in grid.tiles:
		if grid.tiles[coords].hand_card_move_legal:
			cue_destinations[coords] = true
	_assert(not legal_destinations.is_empty(), "The behavior guard expects at least one legal Quick move.")
	_assert(cue_destinations == legal_destinations, "Hand-card MOVE cues must exactly match the engine's legal move destinations (cues %s vs engine %s)." % [str(cue_destinations.keys()), str(legal_destinations.keys())])


func _same_hexes(first: Array, second: Array) -> bool:
	if first.size() != second.size():
		return false
	for coords in first:
		if not second.has(coords):
			return false
	return true


