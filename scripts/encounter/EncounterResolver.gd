class_name EncounterResolver
extends RefCounted

const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const EncounterResolutionModel := preload("res://scripts/encounter/EncounterResolution.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

func resolve_beat(beat, snapshot) -> RefCounted:
	var resolution := EncounterResolutionModel.new()
	match beat.kind:
		BossProgramBeat.Kind.TURN_TOWARD_PLAYER:
			resolution.next_facing = BoardQueryModel.facing_toward(snapshot.boss_coords, snapshot.player_coords, snapshot.boss_facing)
			resolution.log_suffix = "turns %s." % FacingDirections.name_for(resolution.next_facing)
		BossProgramBeat.Kind.RAKING_CLAW:
			resolution.pattern_hexes = BoardQueryModel.front_arc(snapshot.board_hexes, snapshot.boss_coords, snapshot.boss_facing)
			if resolution.pattern_hexes.has(snapshot.player_coords):
				resolution.player_damage = beat.damage
				resolution.impacted_hexes.append(snapshot.player_coords)
			resolution.log_suffix = "sweeps the front arc%s." % (" for %d" % resolution.player_damage if resolution.player_damage > 0 else " and misses")
		BossProgramBeat.Kind.SCORCH_LAST_PATTERN:
			resolution.scorched_hexes = snapshot.previous_impacted_hexes.duplicate()
			resolution.scorched_duration_rounds = beat.duration_rounds
			resolution.log_suffix = "leaves %d Scorched hexes." % resolution.scorched_hexes.size()
		BossProgramBeat.Kind.CINDER_BREATH:
			resolution.pattern_hexes = BoardQueryModel.forward_cone(snapshot.board_hexes, snapshot.boss_coords, snapshot.boss_facing)
			if resolution.pattern_hexes.has(snapshot.player_coords):
				resolution.player_damage = beat.damage
				resolution.impacted_hexes.append(snapshot.player_coords)
			resolution.scorched_hexes = resolution.pattern_hexes.duplicate()
			resolution.scorched_duration_rounds = beat.duration_rounds
			resolution.log_suffix = "resolves across %d hexes%s." % [resolution.pattern_hexes.size(), " for %d" % resolution.player_damage if resolution.player_damage > 0 else " and misses"]
		BossProgramBeat.Kind.BROOD_CALL:
			resolution.spawn_hexes = snapshot.incoming_spawn_hexes.duplicate()
			if resolution.spawn_hexes.is_empty():
				resolution.spawn_hexes = BoardQueryModel.first_empty_hexes(snapshot.brood_spawn_candidates, snapshot.empty_hexes, beat.count)
			resolution.log_suffix = "summons %d Whelp(s)." % resolution.spawn_hexes.size()
		_:
			resolution.log_suffix = beat.rules_text
	return resolution
