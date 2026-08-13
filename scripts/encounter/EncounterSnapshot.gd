class_name EncounterSnapshot
extends RefCounted

# A UI-free description of the board inputs needed to resolve one Boss Timeline beat.
var board_hexes: Dictionary = {}
var empty_hexes: Dictionary = {}
var boss_coords: Vector2i = Vector2i.ZERO
var boss_facing: int = 0
var player_coords: Vector2i = Vector2i(999, 999)
var incoming_spawn_hexes: Array[Vector2i] = []
var brood_spawn_candidates: Array[Vector2i] = []
var previous_impacted_hexes: Array[Vector2i] = []
