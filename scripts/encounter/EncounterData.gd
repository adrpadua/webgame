class_name EncounterData
extends Resource

@export var id: StringName = &"embermaw_prototype"
@export var title: String = "Embermaw: Ashen Trial"
@export_multiline var rules_text: String = ""
@export var primary_hero_id: StringName = &"guardian"
@export var primary_hero_title: String = "Aegis Guardian"
@export var boss_id: StringName = &"embermaw"
@export var boss_title: String = "Embermaw"
@export var round_limit: int = 8
@export var enrage_text: String = "Embermaw overwhelms the party."
@export_range(1, 8, 1) var board_radius: int = 2
@export var player_start: Vector2i = Vector2i(0, 0)
@export var boss_start: Vector2i = Vector2i(1, -1)
@export_range(1, 999, 1) var player_health: int = 34
@export_range(1, 999, 1) var boss_health: int = 36
@export_range(1, 8, 1) var slot_count: int = 2
@export_range(1, 12, 1) var hand_refill_target: int = 4
@export var player_deck: Array[Resource] = []
@export var boss_programs: Array[Resource] = []
@export var loop_boss_programs: bool = true
@export var random_seed: int = 1337
@export var brood_spawn_candidates: Array[Vector2i] = []
