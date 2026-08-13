class_name CardResolver
extends RefCounted

const ChargeModifierModel := preload("res://scripts/content/ChargeModifierData.gd")

func resolve_fire(card, charge_stack: Array) -> Dictionary:
	var result := {
		"armor": card.armor_delta,
		"healing": card.healing,
		"boss_damage": card.boss_damage,
		"target_damage": card.damage,
		"presence": card.presence_delta,
	}
	for modifier in card.charge_modifiers:
		if modifier == null:
			continue
		var bonus: int = modifier.amount_per_match * modifier.matching_count(charge_stack)
		match modifier.effect:
			ChargeModifierModel.Effect.ARMOR:
				result["armor"] += bonus
			ChargeModifierModel.Effect.HEALING:
				result["healing"] += bonus
			ChargeModifierModel.Effect.BOSS_DAMAGE:
				result["boss_damage"] += bonus
			ChargeModifierModel.Effect.TARGET_DAMAGE:
				result["target_damage"] += bonus
	return result
