class_name MinionData
extends Resource

@export var id: StringName
@export var title: String = "Minion"
@export_multiline var rules_text: String = ""
@export_range(1, 999, 1) var max_health: int = 1
