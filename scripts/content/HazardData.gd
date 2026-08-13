class_name HazardData
extends Resource

const HazardEffectModel := preload("res://scripts/sdk/HazardEffect.gd")

@export var id: StringName
@export var title: String = "Hazard"
@export_multiline var rules_text: String = ""
@export_range(1, 99, 1) var duration_rounds: int = 1
@export_range(0, 99, 1) var enter_damage: int = 0
@export var blocks_voluntary_movement: bool = false

func create_effect():
	return HazardEffectModel.new(id, duration_rounds, enter_damage, blocks_voluntary_movement)
