class_name HazardEffect
extends "res://scripts/sdk/StatusEffect.gd"

const StatusEffectModel := preload("res://scripts/sdk/StatusEffect.gd")

var blocks_voluntary_movement: bool = false

func _init(effect_id: StringName = &"", duration_rounds: int = 1, enter_damage: int = 0, blocks_movement: bool = false) -> void:
	super(effect_id, duration_rounds, [StatusEffectModel.ON_ENTER_HEX])
	damage_on_enter_hex = enter_damage
	blocks_voluntary_movement = blocks_movement

func copy():
	return get_script().new(id, remaining_rounds, damage_on_enter_hex, blocks_voluntary_movement)
