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
var bonus_boss_damage_off_payoff: int = 0
var title: String = "Status Effect"
var trigger_reason: StringName = &""
var expires_at_window_end: StringName = &""
var consume_on_card_id: StringName = &""
var source_id: StringName = &""
var source_beat_id: StringName = &""
var trigger_round: int = 0
var trigger_phase: StringName = &""

func _init(effect_id: StringName = &"", duration_rounds: int = 1, effect_triggers: Array[StringName] = []) -> void:
	id = effect_id
	remaining_rounds = max(duration_rounds, 1)
	triggers = effect_triggers.duplicate()

func responds_to(trigger: StringName) -> bool:
	return triggers.has(trigger)

func outcome_for(trigger: StringName, context: Dictionary = {}) -> Dictionary:
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
			var card = context.get("card")
			if consume_on_card_id != &"":
				if card == null or not bool(context.get("deals_boss_damage", false)):
					return {}
				if card.id == consume_on_card_id:
					return {"bonus_boss_damage": bonus_boss_damage_on_slot_fired}
				return {"bonus_boss_damage": bonus_boss_damage_off_payoff}
			return {"bonus_boss_damage": bonus_boss_damage_on_slot_fired}
	return {}

func advance_round() -> bool:
	if expires_at_window_end != &"":
		return false
	remaining_rounds -= 1
	return remaining_rounds <= 0
