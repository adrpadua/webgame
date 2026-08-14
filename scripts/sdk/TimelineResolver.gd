class_name TimelineResolver
extends RefCounted

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterResolverModel := preload("res://scripts/encounter/EncounterResolver.gd")
const EncounterSnapshotModel := preload("res://scripts/encounter/EncounterSnapshot.gd")
const HazardEffectModel := preload("res://scripts/sdk/HazardEffect.gd")

var encounter_resolver := EncounterResolverModel.new()

func actions_for_track(engine, track: StringName) -> Array:
	if engine.current_program == null:
		return []
	var beats: Array = engine.current_program.instant_beats if track == &"instant" else engine.current_program.incoming_beats
	var actions: Array = []
	for beat in beats:
		actions.append(EncounterActionModel.resolve_boss(engine.boss_id, beat, track))
	return actions

func resolve_boss_beat(engine, boss_id: StringName, beat, track: StringName = &"") -> Array:
	var resolution := encounter_resolver.resolve_beat(beat, _snapshot_for(engine))
	engine.last_pattern = resolution.pattern_hexes.duplicate()
	if not resolution.impacted_hexes.is_empty() or beat.kind == BossProgramBeat.Kind.RAKING_CLAW:
		engine.previous_impacted_hexes = resolution.impacted_hexes.duplicate()
	if resolution.next_facing >= 0:
		engine.board.set_entity_facing(boss_id, resolution.next_facing)
	var actions: Array = []
	if resolution.player_damage > 0:
		var damage_context := {
			"boss_beat_id": beat.id,
			"boss_track": track,
		}
		if beat.target_selector != &"":
			damage_context["target_selector"] = beat.target_selector
		if beat.damage_classification != &"":
			damage_context["damage_classification"] = beat.damage_classification
		actions.append(EncounterActionModel.damage(boss_id, engine.primary_hero_id, resolution.player_damage, beat.title, damage_context))
	for coords in resolution.scorched_hexes:
		var hazard = beat.hazard.create_effect() if beat.hazard != null else HazardEffectModel.new(&"scorched", resolution.scorched_duration_rounds, 1, true)
		actions.append(EncounterActionModel.apply_hazard(boss_id, coords, hazard))
	for coords in resolution.spawn_hexes:
		actions.append(EncounterActionModel.spawn_minion(boss_id, engine.next_minion_id(), coords, beat.minion))
	return actions

func _snapshot_for(engine):
	var snapshot := EncounterSnapshotModel.new()
	snapshot.board_hexes = engine.board.hexes.duplicate()
	snapshot.empty_hexes = engine.board.empty_hexes()
	snapshot.boss_coords = engine.board.get_entity(engine.boss_id).get("coords", Vector2i(999, 999))
	snapshot.boss_facing = engine.board.get_entity(engine.boss_id).get("facing", 0)
	snapshot.player_coords = engine.board.get_entity(engine.primary_hero_id).get("coords", Vector2i(999, 999))
	snapshot.incoming_spawn_hexes = engine.telegraphed_spawn_hexes.duplicate()
	snapshot.brood_spawn_candidates = engine.brood_spawn_candidates.duplicate()
	snapshot.previous_impacted_hexes = engine.previous_impacted_hexes.duplicate()
	return snapshot
