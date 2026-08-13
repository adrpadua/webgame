class_name EncounterResolution
extends RefCounted

# The resolver returns facts; the Godot-facing adapter decides how to render and apply them.
var log_suffix: String = ""
var next_facing: int = -1
var pattern_hexes: Array[Vector2i] = []
var impacted_hexes: Array[Vector2i] = []
var player_damage: int = 0
var scorched_hexes: Array[Vector2i] = []
var scorched_duration_rounds: int = 0
var spawn_hexes: Array[Vector2i] = []
