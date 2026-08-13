class_name StatusEffect
extends RefCounted

const ON_ROUND_START: StringName = &"on_round_start"
const ON_ENTER_HEX: StringName = &"on_enter_hex"
const ON_DAMAGE_TAKEN: StringName = &"on_damage_taken"
const ON_SLOT_FIRED: StringName = &"on_slot_fired"

var id: StringName = &""
var remaining_rounds: int = 1
var triggers: Array[StringName] = []
var armor_on_round_start: int = 0
var damage_on_enter_hex: int = 0
var damage_reduction: int = 0
var bonus_boss_damage_on_slot_fired: int = 0

func _init(effect_id: StringName = &"", duration_rounds: int = 1, effect_triggers: Array[StringName] = []) -> void:
	id = effect_id
	remaining_rounds = max(duration_rounds, 1)
	triggers = effect_triggers.duplicate()

func responds_to(trigger: StringName) -> bool:
	return triggers.has(trigger)

func outcome_for(trigger: StringName) -> Dictionary:
	if not responds_to(trigger):
		return {}
	match trigger:
		ON_ROUND_START:
			return {"armor": armor_on_round_start}
		ON_ENTER_HEX:
			return {"damage": damage_on_enter_hex}
		ON_DAMAGE_TAKEN:
			return {"damage_reduction": damage_reduction}
		ON_SLOT_FIRED:
			return {"bonus_boss_damage": bonus_boss_damage_on_slot_fired}
	return {}

func advance_round() -> bool:
	remaining_rounds -= 1
	return remaining_rounds <= 0
