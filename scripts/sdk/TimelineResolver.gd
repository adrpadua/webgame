class_name TimelineResolver
extends RefCounted

# Authored Boss Beat resolution (ADR 0016): the spatial rules for each Beat
# kind and their conversion into generated actions live together here, reading
# engine state directly. Internal collaborator below the engine seam.

const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const HazardEffectModel := preload("res://scripts/sdk/HazardEffect.gd")

func actions_for_track(engine, track: StringName) -> Array:
	if engine.current_program == null:
		return []
	var beats: Array = engine.current_program.instant_beats if track == &"instant" else engine.current_program.incoming_beats
	var actions: Array = []
	for beat in beats:
		actions.append(EncounterActionModel.resolve_boss(engine.boss_id, beat, track))
	return actions

func resolve_boss_beat(engine, boss_id: StringName, beat, track: StringName = &"") -> Array:
	var boss: Dictionary = engine.board.get_entity(boss_id)
	var boss_coords: Vector2i = boss.get("coords", Vector2i(999, 999))
	var boss_facing: int = int(boss.get("facing", 0))
	var player_coords: Vector2i = engine.board.get_entity(engine.primary_hero_id).get("coords", Vector2i(999, 999))
	var pattern_hexes: Array[Vector2i] = []
	var impacted_hexes: Array[Vector2i] = []
	var player_damage: int = 0
	var scorched_hexes: Array[Vector2i] = []
	var scorched_duration_rounds: int = 0
	var spawn_hexes: Array[Vector2i] = []
	match beat.kind:
		BossProgramBeat.Kind.TURN_TOWARD_PLAYER:
			engine.board.set_entity_facing(boss_id, BoardQueryModel.facing_toward(boss_coords, player_coords, boss_facing))
		BossProgramBeat.Kind.RAKING_CLAW:
			pattern_hexes = BoardQueryModel.front_arc(engine.board.hexes, boss_coords, boss_facing)
			player_damage = beat.damage
			impacted_hexes.append(player_coords)
		BossProgramBeat.Kind.SCORCH_LAST_PATTERN:
			scorched_hexes = engine.previous_impacted_hexes.duplicate()
			scorched_duration_rounds = beat.duration_rounds
		BossProgramBeat.Kind.CINDER_BREATH:
			pattern_hexes = BoardQueryModel.forward_cone(engine.board.hexes, boss_coords, boss_facing)
			if pattern_hexes.has(player_coords):
				player_damage = beat.damage
				impacted_hexes.append(player_coords)
			scorched_hexes = pattern_hexes.duplicate()
			scorched_duration_rounds = beat.duration_rounds
		BossProgramBeat.Kind.BROOD_CALL:
			spawn_hexes = engine.telegraphed_spawn_hexes.duplicate()
			if spawn_hexes.is_empty():
				spawn_hexes = BoardQueryModel.first_empty_hexes(engine.brood_spawn_candidates, engine.board.empty_hexes(), beat.count)
	engine.last_pattern = pattern_hexes.duplicate()
	if not impacted_hexes.is_empty() or beat.kind == BossProgramBeat.Kind.RAKING_CLAW:
		engine.previous_impacted_hexes = impacted_hexes.duplicate()
	var actions: Array = []
	if player_damage > 0:
		var damage_context := {
			"boss_beat_id": beat.id,
			"boss_track": track,
		}
		if beat.target_selector != &"":
			damage_context["target_selector"] = beat.target_selector
		if beat.damage_classification != &"":
			damage_context["damage_classification"] = beat.damage_classification
		actions.append(EncounterActionModel.damage(boss_id, engine.primary_hero_id, player_damage, beat.title, damage_context))
	for coords in scorched_hexes:
		var hazard = beat.hazard.create_effect() if beat.hazard != null else HazardEffectModel.new(&"scorched", scorched_duration_rounds, 1, true)
		actions.append(EncounterActionModel.apply_hazard(boss_id, coords, hazard))
	for coords in spawn_hexes:
		actions.append(EncounterActionModel.spawn_minion(boss_id, engine._next_minion_id(), coords, beat.minion))
	return actions
